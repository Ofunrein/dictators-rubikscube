/**
 * SimulatorPage.jsx — The main page that ties everything together
 *
 * This is the "brain" of the simulator. It doesn't render the cube itself
 * (that's InteractiveCube.jsx), and it doesn't draw the buttons (SimulatorControls.jsx).
 * Instead, it manages all the STATE and LOGIC:
 *
 *   - Keeps track of the cube's current sticker arrangement (cubeStateObj / displayState)
 *   - Manages the move queue: when you click a button or press a key, the move goes into
 *     a queue and gets animated one at a time so they don't overlap
 *   - Handles Scramble: generates 20 random moves, resets the cube, queues them up
 *   - Handles Solve: sends the state to Eric's WASM solver via the API, or falls back
 *     to reversing your move history if you used slice moves (M/E/S)
 *   - Handles Reset: clears everything back to a fresh solved cube
 *   - Handles Undo / Undo All: reverses moves from the solveStack
 *   - Connects the timer (useTimer hook) — auto-starts on first move, auto-stops on solve
 *   - Connects keyboard/mouse controls (useCubeControls hook)
 *   - Manages the 3D canvas lifecycle (error boundary, fallback mode, retry)
 *
 * IMPORTANT REFS (these survive re-renders, unlike state):
 *   moveQueueRef          — array of moves waiting to be animated
 *   activeMoveRef         — the move currently being animated (or null)
 *   solveStackRef         — running log of user moves (used by Solve and Undo)
 *   waitingForFirstMoveRef — flag set after Scramble, cleared on first user move (starts timer)
 *
 * LAYOUT:
 *   Header (timer button) | Left panel (SimulatorControls) | Center (3D Canvas) | Right panel (TutorialPanel)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ArrowLeft } from 'lucide-react';
import { CubeState } from '../../cube/CubeState';
import { applyMove } from '../../cube/moves';
import { solveCubeRemote } from '../../net/api';
import {
  invertMoveSequence,
  isSliceMove,
  SOLVE_TURN_DURATION_SECONDS,
  TURN_DURATION_SECONDS,
  mergeMoveIntoSolveStack,
  normalizeMoveSequence,
} from './simulatorAnimation';
import {
  FACE_ORDER,
  generateScramble,
} from './simulatorConstants';
import { useCubeControls } from './useCubeControls';
import { useTimer } from './useTimer';
import {
  InteractiveCube,
  ResponsiveSceneCamera,
  SimulatorCanvasBoundary,
} from './InteractiveCube';
import SimulatorControls from './SimulatorControls';
import TutorialPanel from './TutorialPanel';
import SimulatorFaceMap from './SimulatorFaceMap';
import CanvasFallbackPanel from './CanvasFallbackPanel';

const SimulatorPage = () => {
  const navigate = useNavigate();
  const [cubeStateObj] = useState(() => new CubeState());
  const [displayState, setDisplayState] = useState(() => cubeStateObj.getState());
  const [moveHistory, setMoveHistory] = useState([]);
  const [scrambleSeq, setScrambleSeq] = useState([]);
  const [activeMove, setActiveMove] = useState(null);
  const [activeMoveDurationSeconds, setActiveMoveDurationSeconds] = useState(TURN_DURATION_SECONDS);
  const [queuedMoveCount, setQueuedMoveCount] = useState(0);
  const [solveDepth, setSolveDepth] = useState(0);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [canvasErrorMessage, setCanvasErrorMessage] = useState('');
  const [canvasErrorDetails, setCanvasErrorDetails] = useState('');
  const [canvasRetryKey, setCanvasRetryKey] = useState(0);
  const [isSolvingRemote, setIsSolvingRemote] = useState(false);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
  }));

  const moveQueueRef = useRef([]);
  const activeMoveRef = useRef(null);
  const solveStackRef = useRef([]);
  const waitingForFirstMoveRef = useRef(false);
  const [layoutResetKey, setLayoutResetKey] = useState(0);

  const bumpLayout = useCallback(() => setLayoutResetKey((k) => k + 1), []);

  const isSolved = FACE_ORDER.every((face) =>
    displayState[face].every((sticker) => sticker === displayState[face][0]),
  );

  const {
    resetTimer,
    startFreshTimer,
    stopTimer,
    timerMs,
    timerRunning,
    toggleTimer,
  } = useTimer({ isSolved });

  const queueActive = activeMove !== null || queuedMoveCount > 0;
  const interactionLocked = queueActive || isSolvingRemote;
  const manualInputLocked = interactionLocked;
  const canAnimateMoves = !canvasFailed;
  const isMobileViewport = viewportSize.width < 768;
  const isTabletViewport = viewportSize.width >= 768 && viewportSize.width < 1280;
  const isShortViewport = viewportSize.height < 760;

  // Keep the camera config stable so OrbitControls is not fighting fresh object instances
  // every time the simulator re-renders during animation or sticker selection.
  const cameraProfile = useMemo(() => (
    isMobileViewport
      ? { position: [5.8, 4.8, 7.1], fov: 54, minDistance: 5.5, maxDistance: 13.5 }
      : isTabletViewport
        ? { position: [4.8, 4.0, 5.9], fov: 49, minDistance: 4.8, maxDistance: 12.5 }
        : { position: [4, 3.5, 5], fov: 45, minDistance: 4, maxDistance: 12 }
  ), [isMobileViewport, isTabletViewport]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const applyMovesInstantly = useCallback((moves) => {
    const normalized = normalizeMoveSequence(moves);
    if (normalized.length === 0) return;

    // This path is used when the canvas is unavailable, so keep the logical cube
    // state moving forward even if the 3D animation layer is temporarily offline.
    let nextState = cubeStateObj.getState();
    for (const move of normalized) {
      nextState = applyMove(nextState, move);
      mergeMoveIntoSolveStack(solveStackRef.current, move);
    }

    cubeStateObj.setState(nextState);
    setDisplayState({ ...nextState });
    setMoveHistory((previousHistory) => [...previousHistory, ...normalized].slice(-50));
    setSolveDepth(solveStackRef.current.length);
  }, [cubeStateObj]);

  const handleCanvasFailure = useCallback((error, info) => {
    console.error('Simulator 3D canvas failed; switching to fallback mode.', error);
    setCanvasErrorMessage(error?.message || String(error) || 'Unknown renderer error');
    setCanvasErrorDetails(
      [error?.name, error?.stack, info?.componentStack]
        .filter(Boolean)
        .join('\n\n'),
    );

    setCanvasFailed((previousFailureState) => {
      if (previousFailureState) return previousFailureState;

      const pendingMoves = [];
      if (activeMoveRef.current) pendingMoves.push(activeMoveRef.current);
      if (moveQueueRef.current.length > 0) {
        pendingMoves.push(...moveQueueRef.current.map((queuedMove) => queuedMove.move));
      }

      activeMoveRef.current = null;
      moveQueueRef.current = [];
      setActiveMove(null);
      setActiveMoveDurationSeconds(TURN_DURATION_SECONDS);
      setQueuedMoveCount(0);

      if (pendingMoves.length > 0) {
        applyMovesInstantly(pendingMoves);
      }

      return true;
    });
  }, [applyMovesInstantly]);

  const handleCanvasRetry = useCallback(() => {
    setCanvasFailed(false);
    setCanvasErrorMessage('');
    setCanvasErrorDetails('');
    setCanvasRetryKey((previousKey) => previousKey + 1);
  }, []);

  const startNextMove = useCallback(() => {
    if (activeMoveRef.current || moveQueueRef.current.length === 0) {
      setQueuedMoveCount(moveQueueRef.current.length);
      return;
    }

    const nextMove = moveQueueRef.current.shift();
    setQueuedMoveCount(moveQueueRef.current.length);
    activeMoveRef.current = nextMove.move;
    setActiveMove(nextMove.move);
    setActiveMoveDurationSeconds(nextMove.durationSeconds);
  }, []);

  const enqueueMoves = useCallback((moves, { durationSeconds = TURN_DURATION_SECONDS } = {}) => {
    const normalized = normalizeMoveSequence(moves);
    if (normalized.length === 0) return;

    if (!canAnimateMoves) {
      applyMovesInstantly(normalized);
      return;
    }

    moveQueueRef.current.push(
      ...normalized.map((move) => ({
        move,
        durationSeconds,
      })),
    );
    setQueuedMoveCount(moveQueueRef.current.length);
    startNextMove();
  }, [applyMovesInstantly, canAnimateMoves, startNextMove]);

  const handleMoveAnimationComplete = useCallback((move) => {
    if (activeMoveRef.current !== move) return;

    const newState = applyMove(cubeStateObj.getState(), move);
    cubeStateObj.setState(newState);
    setDisplayState({ ...newState });
    setMoveHistory((previousHistory) => [...previousHistory.slice(-49), move]);

    mergeMoveIntoSolveStack(solveStackRef.current, move);
    setSolveDepth(solveStackRef.current.length);

    activeMoveRef.current = null;
    setActiveMove(null);
    setActiveMoveDurationSeconds(TURN_DURATION_SECONDS);
    startNextMove();
  }, [cubeStateObj, startNextMove]);

  const dispatchManualMove = useCallback((move) => {
    if (!move || interactionLocked) return;

    // Timer only auto-starts after a scramble (waitingForFirstMoveRef is set in handleScramble).
    // Without a scramble, no auto-timer — prevents cheating by doing one move then solving.
    if (waitingForFirstMoveRef.current) {
      waitingForFirstMoveRef.current = false;
      startFreshTimer();
    }

    enqueueMoves([move]);
  }, [enqueueMoves, interactionLocked, startFreshTimer]);

  const {
    clearSelectedSticker,
    handleStickerSelect,
    selectedSticker,
  } = useCubeControls({
    dispatchManualMove,
    manualInputLocked,
  });

  useEffect(() => {
    if (!activeMove) return undefined;

    const timeout = setTimeout(() => {
      if (activeMoveRef.current === activeMove) {
        handleMoveAnimationComplete(activeMove);
      }
    }, activeMoveDurationSeconds * 4 * 1000);

    return () => clearTimeout(timeout);
  }, [activeMove, activeMoveDurationSeconds, handleMoveAnimationComplete]);

  const resetCubeToSolved = useCallback(() => {
    const solved = CubeState.createSolvedState();
    cubeStateObj.setState(solved);
    setDisplayState({ ...solved });
  }, [cubeStateObj]);

  const handleScramble = useCallback(() => {
    if (interactionLocked) return;

    const sequence = generateScramble(20);
    setScrambleSeq(sequence);
    clearSelectedSticker();

    resetCubeToSolved();
    bumpLayout();
    setMoveHistory([]);
    solveStackRef.current = [];
    setSolveDepth(0);
    resetTimer();
    waitingForFirstMoveRef.current = true;

    enqueueMoves(sequence);
  }, [bumpLayout, clearSelectedSticker, enqueueMoves, interactionLocked, resetCubeToSolved, resetTimer]);

  const handleSolve = useCallback(async () => {
    if (interactionLocked || solveDepth === 0) return;

    const solveStackSnapshot = [...solveStackRef.current];
    const inverseSolveMoves = invertMoveSequence(solveStackSnapshot);
    const needsLocalHistorySolve = solveStackSnapshot.some(isSliceMove);

    if (needsLocalHistorySolve) {
      // Slice turns still have edge cases on the backend solver, so keep the
      // simulator usable by reversing the exact local history for those states.
      enqueueMoves(inverseSolveMoves, { durationSeconds: SOLVE_TURN_DURATION_SECONDS });
      return;
    }

    setIsSolvingRemote(true);

    try {
      const payload = await solveCubeRemote(cubeStateObj.getState());
      moveQueueRef.current = [];
      activeMoveRef.current = null;
      setQueuedMoveCount(0);
      setActiveMove(null);
      setActiveMoveDurationSeconds(TURN_DURATION_SECONDS);

      if (Array.isArray(payload.moves) && payload.moves.length > 0) {
        enqueueMoves(payload.moves, { durationSeconds: SOLVE_TURN_DURATION_SECONDS });
        return;
      }

      if (!payload.state) {
        throw new Error('Backend did not return a solved state.');
      }

      // When the backend can solve but cannot provide a replayable move list,
      // snap to the solved state and rebuild the layout from that canonical state.
      cubeStateObj.setState(payload.state);
      setDisplayState({ ...payload.state });
      bumpLayout();
      setMoveHistory((previousHistory) => [...previousHistory.slice(-49), 'SOLVED']);
      solveStackRef.current = [];
      setSolveDepth(0);
      waitingForFirstMoveRef.current = false;

      stopTimer();
    } catch (error) {
      console.error('Remote solve failed.', error);
      if (inverseSolveMoves.length > 0) {
        enqueueMoves(inverseSolveMoves, { durationSeconds: SOLVE_TURN_DURATION_SECONDS });
        return;
      }

      window.alert(error instanceof Error ? error.message : 'Remote solve failed.');
    } finally {
      setIsSolvingRemote(false);
    }
  }, [cubeStateObj, enqueueMoves, interactionLocked, solveDepth, stopTimer]);

  const handleReset = useCallback(() => {
    if (interactionLocked) return;

    moveQueueRef.current = [];
    activeMoveRef.current = null;
    waitingForFirstMoveRef.current = false;
    setQueuedMoveCount(0);
    setActiveMove(null);
    setActiveMoveDurationSeconds(TURN_DURATION_SECONDS);

    solveStackRef.current = [];
    setSolveDepth(0);
    setMoveHistory([]);
    setScrambleSeq([]);
    clearSelectedSticker();

    resetCubeToSolved();
    bumpLayout();
    resetTimer();
  }, [bumpLayout, clearSelectedSticker, interactionLocked, resetCubeToSolved, resetTimer]);

  const handleApplyAlgorithm = useCallback((moves) => {
    enqueueMoves(moves);
  }, [enqueueMoves]);

  return (
    <div className="min-h-screen bg-dictator-void text-white flex flex-col overflow-x-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-dictator-chrome/10 bg-dictator-void/90 backdrop-blur-xl sticky top-0 z-50">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-white hover:text-white transition-colors hover:-translate-x-1 duration-200"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[#1A1A1A] border border-dictator-red/40 flex items-center justify-center font-mono text-dictator-red text-[10px] font-bold">
            TD
          </div>
          <span className="font-heading text-sm font-bold uppercase tracking-widest hidden sm:block">
            The Dictators — Simulator
          </span>
        </div>

        {/* Spacer to keep header balanced after timer was moved to left panel */}
        <div className="w-[100px]" />
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">
        <SimulatorControls
          activeMove={activeMove}
          interactionLocked={interactionLocked}
          manualInputLocked={manualInputLocked}
          moveHistory={moveHistory}
          onMoveSelect={dispatchManualMove}
          onReset={handleReset}
          onScramble={handleScramble}
          onSolve={handleSolve}
          scrambleSeq={scrambleSeq}
          solveDepth={solveDepth}
          timerMs={timerMs}
          timerRunning={timerRunning}
          onToggleTimer={toggleTimer}
        />

        <main className="relative flex min-h-[360px] min-w-0 flex-1 flex-col overflow-y-auto bg-dictator-void sm:min-h-[420px] lg:min-h-0">
          <div
            className={`relative flex-1 ${
              isMobileViewport
                ? 'min-h-[320px]'
                : isShortViewport
                  ? 'min-h-[300px] lg:min-h-[280px] xl:min-h-[320px]'
                  : 'min-h-[360px] lg:min-h-[320px] xl:min-h-[420px]'
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
                  <color attach="background" args={['#0D0D0D']} />
                  <ambientLight intensity={0.5} />
                  <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
                  <pointLight position={[-5, -5, -5]} color="#CC1A1A" intensity={0.4} distance={20} />
                  <pointLight position={[5, 5, -5]} color="#1E90FF" intensity={0.2} distance={20} />

                  <InteractiveCube
                    activeMove={activeMove}
                    turnDurationSeconds={activeMoveDurationSeconds}
                    cubeState={displayState}
                    layoutResetKey={layoutResetKey}
                    onMoveComplete={handleMoveAnimationComplete}
                    onStickerSelect={handleStickerSelect}
                    selectedSticker={selectedSticker}
                  />
                  <OrbitControls
                    enablePan={false}
                    minDistance={cameraProfile.minDistance}
                    maxDistance={cameraProfile.maxDistance}
                    autoRotate={false}
                    dampingFactor={0.08}
                    enableDamping
                    maxPolarAngle={Math.PI * 0.7}
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

            {queueActive && (
              <div className="absolute top-4 right-4 bg-black/50 border border-dictator-red/30 rounded-full px-3 py-1.5 flex items-center gap-2 backdrop-blur">
                <span className="w-2 h-2 rounded-full bg-dictator-red animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-dictator-red">
                  {activeMove ? `Turning ${activeMove}` : `${queuedMoveCount} Queued`}
                </span>
              </div>
            )}

            {isSolvingRemote && (
              <div className="absolute top-4 left-4 bg-black/50 border border-dictator-red/30 rounded-full px-3 py-1.5 flex items-center gap-2 backdrop-blur">
                <span className="w-2 h-2 rounded-full bg-dictator-red animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-dictator-red">
                  Solving via Eric C++ WASM
                </span>
              </div>
            )}

            <div className="absolute bottom-3 left-1/2 w-[calc(100%-2rem)] -translate-x-1/2 text-center font-mono text-[10px] text-white/60 uppercase tracking-widest pointer-events-none sm:bottom-4">
              {canAnimateMoves ? 'Drag to rotate · Scroll to zoom' : 'Fallback mode · Use controls to apply moves'}
            </div>
          </div>

          <SimulatorFaceMap displayState={displayState} />
        </main>

        <TutorialPanel
          onApplyAlgorithm={handleApplyAlgorithm}
          queueActive={queueActive}
        />
      </div>
    </div>
  );
};

export default SimulatorPage;
