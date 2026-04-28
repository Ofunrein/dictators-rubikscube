/**
 * SimulatorPage.jsx — The main page that ties everything together
 *
 * This is the orchestrator of the simulator. It wires together all the hooks
 * and components but doesn't contain the heavy logic itself:
 *
 *   - useSimulatorQueue   → move queue, animation lifecycle, move history
 *   - useSimulatorActions  → scramble, solve, reset, size change, timer integration
 *   - useTimer             → stopwatch for timed solves
 *   - useCubeControls      → keyboard shortcuts + mouse-click-then-arrow controls
 *
 * What stays here:
 *   - Cube state ownership (cubeStateObjRef + displayState)
 *   - Canvas error handling and fallback mode
 *   - Viewport responsiveness (mobile/tablet/desktop detection)
 *   - All the JSX layout
 *
 * LAYOUT:
 *   Header | Left panel (SimulatorControls) | Center (3D Canvas) | Right panel (TutorialPanel)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ArrowLeft, ChevronRight, Sun, Moon, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { saveSolveResult } from '../../lib/stats';
import AuthModal from '../../components/AuthModal';
import * as THREE from 'three';
import { CubeState } from '../../cube/CubeState';
import {
  FACE_ORDER,
  getKeyMap,
  getMoveGroups,
  getDefaultScrambleLength,
} from './simulatorConstants';
import { useCubeControls } from './useCubeControls';
import { useTimer } from './useTimer';
import { useSimulatorQueue } from './useSimulatorQueue';
import { useSimulatorActions } from './useSimulatorActions';
import {
  InteractiveCube,
  ResponsiveSceneCamera,
  SimulatorCanvasBoundary,
} from './InteractiveCube';
import SimulatorControls from './SimulatorControls';
import TutorialPanel from './TutorialPanel';
import SimulatorFaceMap from './SimulatorFaceMap';
import CanvasFallbackPanel from './CanvasFallbackPanel';
import { useTheme } from '../../context/ThemeContext';
import { getThemeClasses } from './simulatorTheme';

const SimulatorPage = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { currentUser, refreshUserStats } = useAuth();
  const [authModal, setAuthModal] = useState(null);
  const t = getThemeClasses(isDark);

  // Core cube state — owned here, passed to hooks via refs
  const [cubeSize, setCubeSize] = useState(3);
  const cubeStateObjRef = useRef(new CubeState(3));
  const [displayState, setDisplayState] = useState(() => cubeStateObjRef.current.getState());
  const solveStackRef = useRef([]);

  // Canvas error handling — fallback mode when WebGL crashes
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [canvasErrorMessage, setCanvasErrorMessage] = useState('');
  const [canvasErrorDetails, setCanvasErrorDetails] = useState('');
  const [canvasRetryKey, setCanvasRetryKey] = useState(0);
  const [tutorialDrawerOpen, setTutorialDrawerOpen] = useState(false);
  const [faceMapOpen, setFaceMapOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 420;
  });

  // Viewport responsiveness
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
  }));

  // Layout reset key — bumped when the cube needs to rebuild its 3D layout
  const [layoutResetKey, setLayoutResetKey] = useState(0);
  const bumpLayout = useCallback(() => setLayoutResetKey((k) => k + 1), []);

  // Derived values from cube size
  const moveGroups = useMemo(() => getMoveGroups(cubeSize), [cubeSize]);
  const keyMap = useMemo(() => getKeyMap(cubeSize), [cubeSize]);
  const scrambleLength = useMemo(() => getDefaultScrambleLength(cubeSize), [cubeSize]);

  const canAnimateMoves = !canvasFailed;

  // Check if the cube is currently solved (every face is one color)
  const isSolved = FACE_ORDER.every((face) =>
    displayState[face].every((sticker) => sticker === displayState[face][0]),
  );

  // --- Hook: Timer ---
  const timer = useTimer({ isSolved });

  // --- Hook: Move queue ---
  const queue = useSimulatorQueue({
    cubeStateObjRef,
    canAnimateMoves,
    solveStackRef,
    setDisplayState,
  });

  // Ref-based callback so we can pass clearSelectedSticker to the actions hook
  // before the controls hook is initialized (avoids circular init order).
  const clearSelectedStickerRef = useRef(() => {});

  // --- Hook: Actions ---
  // Gets queueActive instead of interactionLocked — it computes interactionLocked
  // internally from queueActive + its own loading states.
  const actions = useSimulatorActions({
    cubeSize,
    setCubeSize,
    cubeStateObjRef,
    solveStackRef,
    setDisplayState,
    enqueueMoves: queue.enqueueMoves,
    clearPendingAnimation: queue.clearPendingAnimation,
    setMoveHistory: queue.setMoveHistory,
    setSolveDepth: queue.setSolveDepth,
    clearSelectedStickerRef,
    timer,
    queueActive: queue.queueActive,
    bumpLayout,
    scrambleLength,
    moveHistory: queue.moveHistory,
  });

  // --- Hook: Keyboard + mouse controls ---
  const controls = useCubeControls({
    cubeSize,
    dispatchManualMove: actions.dispatchManualMove,
    manualInputLocked: actions.interactionLocked,
  });

  // Now that controls is initialized, wire up the ref so actions can clear sticker selection
  clearSelectedStickerRef.current = controls.clearSelectedSticker;

  // Viewport breakpoints
  const isMobileViewport = viewportSize.width < 768;
  const isTabletViewport = viewportSize.width >= 768 && viewportSize.width < 1280;
  const isShortViewport = viewportSize.height < 760;
  const useCompactFaceMap = viewportSize.width < 420;
  const useTutorialDrawer = viewportSize.width < 1024;
  const tutorialLabel = `${cubeSize}x${cubeSize} Guide`;

  // Keep the camera config stable so OrbitControls is not fighting fresh object instances
  const cameraProfile = useMemo(() => (
    isMobileViewport
      ? { position: [5.8, 4.8, 7.1], fov: 54, minDistance: 5.5, maxDistance: 22 }
      : isTabletViewport
        ? { position: [4.8, 4.0, 5.9], fov: 49, minDistance: 4.8, maxDistance: 20 }
        : { position: [4, 3.5, 5], fov: 45, minDistance: 4, maxDistance: 20 }
  ), [isMobileViewport, isTabletViewport]);

  // Track window resize for responsive breakpoints
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!useTutorialDrawer) {
      setTutorialDrawerOpen(false);
    }
  }, [useTutorialDrawer]);

  useEffect(() => {
    if (!useCompactFaceMap) {
      setFaceMapOpen(true);
    }
  }, [useCompactFaceMap]);

  // Track whether the current solve has already been saved to prevent
  // duplicate saves when the effect re-fires due to dependency changes.
  const solveSavedRef = useRef(false);

  // When the cube becomes solved and nothing is animating, clear the solve stack
  // and save the solve time if the user is logged in and was doing a timed solve.
  useEffect(() => {
    if (!isSolved || queue.queueActive) return;

    // Save the solve result only once per solve
    if (!solveSavedRef.current && currentUser && timer.timerRunning && timer.timerMs > 0) {
      solveSavedRef.current = true;
      const sizeLabel = cubeSize === 2 ? '2x2' : '3x3';
      saveSolveResult(currentUser.id, sizeLabel, timer.timerMs).then(() => {
        refreshUserStats();
      });
    }

    solveStackRef.current = [];
    queue.setSolveDepth(0);
  }, [isSolved, queue.queueActive, queue, currentUser, timer.timerRunning, timer.timerMs, cubeSize]);

  // Reset the solve-saved flag when the cube becomes unsolved (new solve starts)
  useEffect(() => {
    if (!isSolved) {
      solveSavedRef.current = false;
    }
  }, [isSolved]);

  // Canvas error handling: when WebGL crashes, drain any pending moves instantly
  const handleCanvasFailure = useCallback((error, info) => {
    console.error('Simulator 3D canvas failed; switching to fallback mode.', error);
    setCanvasErrorMessage(error?.message || String(error) || 'Unknown renderer error');
    setCanvasErrorDetails(
      [error?.name, error?.stack, info?.componentStack].filter(Boolean).join('\n\n'),
    );

    setCanvasFailed((prev) => {
      if (prev) return prev;

      // Drain any pending moves so the logical state catches up
      const pendingMoves = [];
      if (queue.activeMoveRef.current) pendingMoves.push(queue.activeMoveRef.current);
      if (queue.moveQueueRef.current.length > 0) {
        pendingMoves.push(...queue.moveQueueRef.current.map((m) => m.move));
      }

      queue.clearPendingAnimation();

      if (pendingMoves.length > 0) {
        queue.applyMovesInstantly(pendingMoves);
      }

      return true;
    });
  }, [queue]);

  const handleCanvasRetry = useCallback(() => {
    setCanvasFailed(false);
    setCanvasErrorMessage('');
    setCanvasErrorDetails('');
    setCanvasRetryKey((prev) => prev + 1);
  }, []);

  const handleApplyAlgorithm = useCallback((moves) => {
    queue.enqueueMoves(moves);
  }, [queue]);

  return (
    <div
      className={`min-h-screen h-screen flex flex-col overflow-hidden transition-colors duration-300 ${
        isDark
          ? 'dark bg-dictator-void text-white'
          : 'bg-dictator-cream text-dictator-ink'
      }`}
      style={{
        '--sim-panel': isDark ? '#0A0A0A' : '#F0EDE8',
        '--sim-card': isDark ? '#111111' : '#F5F1EC',
        '--sim-border': isDark ? 'rgba(176,176,176,0.1)' : '#A89F94',
        '--sim-text': isDark ? '#FFFFFF' : '#2C2A26',
        '--sim-text-muted': isDark ? 'rgba(255,255,255,0.6)' : 'rgba(44,42,38,0.5)',
        '--sim-kbd': isDark ? '#1A1A1A' : '#F5F1EC',
        '--sim-btn-border': isDark ? 'rgba(176,176,176,0.12)' : 'rgba(44,42,38,0.15)',
        '--sim-face-border': isDark ? 'rgba(176,176,176,0.08)' : 'rgba(168,159,148,0.45)',
      }}
    >
      <header className={`flex items-center justify-between px-6 py-4 border-b ${t.headerBorder} ${t.headerBg} sticky top-0 z-50`}>
        <button
          onClick={() => navigate('/')}
          className={`flex items-center gap-2 font-mono text-xs uppercase tracking-widest ${t.headerText} transition-colors hover:-translate-x-1 duration-200`}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'} border border-dictator-red/40 flex items-center justify-center font-mono text-dictator-red text-[10px] font-bold`}>
            TD
          </div>
          <span className={`font-heading text-sm font-bold uppercase tracking-widest hidden sm:block ${t.headerText}`}>
            The Dictators — Simulator
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${t.border} ${t.headerText} hover:border-dictator-red/40`}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={12} /> : <Moon size={12} />}
            {isDark ? 'Light' : 'Dark'}
          </button>

          {currentUser ? (
            <button
              onClick={() => navigate('/profile')}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${t.border} ${t.headerText} hover:border-dictator-red/40`}
              title="Profile"
            >
              <div className="w-4 h-4 rounded-full bg-dictator-red/30 border border-dictator-red/50 flex items-center justify-center text-dictator-red font-bold" style={{ fontSize: '8px' }}>
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline">{currentUser.username}</span>
            </button>
          ) : (
            <button
              onClick={() => setAuthModal('login')}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${t.border} ${t.headerText} hover:border-dictator-red/40`}
              title="Log in"
            >
              <UserCircle size={12} />
              <span className="hidden sm:inline">Log In</span>
            </button>
          )}
        </div>
      </header>

      {authModal && (
        <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} />
      )}

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
          <SimulatorControls
            activeMove={queue.activeMove}
            cubeSize={cubeSize}
            interactionLocked={actions.interactionLocked}
            isDark={isDark}
            isTimedSolveSession={actions.isTimedSolveSession}
            keyMap={keyMap}
            manualInputLocked={actions.interactionLocked}
            moveHistory={queue.moveHistory}
            moveGroups={moveGroups}
            onMoveSelect={actions.dispatchManualMove}
            onReset={actions.handleReset}
            onScramble={actions.handleScramble}
            onSolve={actions.handleSolve}
            onSizeChange={actions.handleSizeChange}
            onTimerAction={actions.handleTimerAction}
            onTimerReset={actions.cancelTimedSolve}
            scrambleSeq={actions.scrambleSeq}
            scrambleMoveCount={actions.scrambleMoveCount}
            solveDepth={queue.solveDepth}
            timerMs={timer.timerMs}
            timerPrimed={actions.timerPrimed}
            timerRunning={timer.timerRunning}
          />

          <main className={`relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${t.pageBg}`}>
            <div className={`border-b ${t.border} px-4 py-3 sm:px-6 lg:hidden`}>
              <button
                type="button"
                onClick={() => setTutorialDrawerOpen((open) => !open)}
                aria-expanded={tutorialDrawerOpen}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border ${t.border} ${t.cardBg} px-4 py-3 text-left transition-colors hover:border-dictator-red/40 hover:text-dictator-red`}
              >
                <div>
                  <p className={`font-mono text-[10px] uppercase tracking-widest ${t.textSecondary}`}>Guide</p>
                  <p className={`font-heading text-sm font-bold ${t.textPrimary}`}>{tutorialLabel}</p>
                </div>
                <ChevronRight
                  size={16}
                  className={`shrink-0 ${t.textSecondary} transition-transform ${tutorialDrawerOpen ? 'rotate-90' : ''}`}
                />
              </button>
            </div>

            <div
              className={`relative flex-1 ${
                isMobileViewport
                  ? 'min-h-[260px] sm:min-h-[300px]'
                  : isShortViewport
                    ? 'min-h-[300px] lg:min-h-[320px]'
                    : 'min-h-[300px] lg:min-h-[360px]'
              }`}
            >
            {canAnimateMoves ? (
              <SimulatorCanvasBoundary
                onError={handleCanvasFailure}
                fallback={
                  <CanvasFallbackPanel
                    canvasErrorDetails={canvasErrorDetails}
                    canvasErrorMessage={canvasErrorMessage}
                    onRetry={handleCanvasRetry}
                  />
                }
              >
                <Canvas
                  key={canvasRetryKey}
                  camera={{ position: cameraProfile.position, fov: cameraProfile.fov }}
                  shadows
                  className="w-full h-full"
                >
                  <ResponsiveSceneCamera
                    position={cameraProfile.position}
                    fov={cameraProfile.fov}
                  />
                  <color attach="background" args={[t.canvasBg]} />
                  <ambientLight intensity={isDark ? 0.5 : 0.8} />
                  <directionalLight position={[5, 8, 5]} intensity={isDark ? 1 : 0.7} castShadow />
                  <pointLight position={[-5, -5, -5]} color="#CC1A1A" intensity={0.4} distance={20} />
                  <pointLight position={[5, 5, -5]} color="#1E90FF" intensity={0.2} distance={20} />

                  <InteractiveCube
                    key={`${cubeSize}-${layoutResetKey}`}
                    activeMove={queue.activeMove}
                    activeMoveId={queue.activeMoveId}
                    turnDurationSeconds={queue.activeMoveDurationSeconds}
                    cubeState={displayState}
              onMoveComplete={queue.handleMoveAnimationComplete}
              onStickerPointerDown={controls.handleStickerPointerDown}
              selectedSticker={controls.selectedSticker}
                  />
                  <OrbitControls
                    enablePan={false}
                    enableRotate
                    minDistance={cameraProfile.minDistance}
                    maxDistance={cameraProfile.maxDistance}
                    autoRotate={false}
                    dampingFactor={0.08}
                    enableDamping
                    maxPolarAngle={Math.PI * 0.95}
                    mouseButtons={{
                      LEFT: THREE.MOUSE.PAN,
                      MIDDLE: THREE.MOUSE.DOLLY,
                      RIGHT: THREE.MOUSE.ROTATE,
                    }}
                  />
                </Canvas>
              </SimulatorCanvasBoundary>
              ) : (
                <CanvasFallbackPanel
                  canvasErrorDetails={canvasErrorDetails}
                  canvasErrorMessage={canvasErrorMessage}
                  onRetry={handleCanvasRetry}
                />
              )}

              {queue.queueActive && (
                <div className={`absolute top-4 right-4 ${t.overlay} border border-dictator-red/30 rounded-full px-3 py-1.5 flex items-center gap-2 backdrop-blur`}>
                  <span className="w-2 h-2 rounded-full bg-dictator-red animate-pulse" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-dictator-red">
                    {queue.activeMove ? `Turning ${queue.activeMove}` : `${queue.queuedMoveCount} Queued`}
                  </span>
                </div>
              )}

              {actions.isSolvingRemote && (
                <div className={`absolute top-4 left-4 ${t.overlay} border border-dictator-red/30 rounded-full px-3 py-1.5 flex items-center gap-2 backdrop-blur`}>
                  <span className="w-2 h-2 rounded-full bg-dictator-red animate-pulse" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-dictator-red">
                    {actions.solveStatusLabel}
                  </span>
                </div>
              )}

              {actions.actionError && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-start gap-2 rounded-xl border border-dictator-red/40 bg-dictator-void/90 backdrop-blur px-4 py-3 shadow-xl max-w-xs w-[calc(100%-2rem)]">
                  <span className="mt-0.5 w-2 h-2 rounded-full bg-dictator-red shrink-0" />
                  <p className="font-mono text-[11px] text-white/90 leading-relaxed flex-1">{actions.actionError}</p>
                  <button
                    onClick={actions.clearActionError}
                    className="font-mono text-[10px] text-dictator-chrome hover:text-white transition-colors shrink-0 ml-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className={`pointer-events-none absolute bottom-3 left-1/2 w-[calc(100%-2rem)] -translate-x-1/2 text-center font-mono text-[11px] uppercase tracking-widest ${t.textSecondary} sm:bottom-4`}>
                {canAnimateMoves
                  ? 'Left-drag stickers to turn · right-drag empty space to orbit · scroll to zoom'
                  : 'Fallback mode · Use controls to apply moves'}
              </div>
            </div>

            {useCompactFaceMap ? (
              <div className={`border-t ${t.border}`}>
                <button
                  type="button"
                  onClick={() => setFaceMapOpen((open) => !open)}
                  aria-expanded={faceMapOpen}
                  className={`flex w-full items-center justify-between gap-3 ${t.panelBg} px-4 py-3 text-left transition-colors hover:text-dictator-red`}
                >
                  <div>
                    <p className={`font-mono text-[10px] uppercase tracking-widest ${t.textSecondary}`}>State</p>
                    <p className={`font-heading text-sm font-bold ${t.textPrimary}`}>Face Map</p>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`shrink-0 ${t.textSecondary} transition-transform ${faceMapOpen ? 'rotate-90' : ''}`}
                  />
                </button>
                {faceMapOpen && (
                  <SimulatorFaceMap displayState={displayState} isDark={isDark} compact />
                )}
              </div>
            ) : (
              <SimulatorFaceMap displayState={displayState} isDark={isDark} />
            )}
          </main>
        </div>

        <TutorialPanel
          cubeSize={cubeSize}
          isDark={isDark}
          onApplyAlgorithm={handleApplyAlgorithm}
          queueActive={queue.queueActive || actions.isTimedSolveSession || actions.timerPrimed || timer.timerRunning}
          isDrawer={useTutorialDrawer}
          drawerOpen={tutorialDrawerOpen}
          onClose={() => setTutorialDrawerOpen(false)}
        />
      </div>
    </div>
  );
};

export default SimulatorPage;
