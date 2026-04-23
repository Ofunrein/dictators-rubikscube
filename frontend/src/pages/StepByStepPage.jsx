// frontend/src/pages/StepByStepPage.jsx
/**
 * StepByStepPage.jsx — /step-by-step route — Guided simulator
 *
 * Interactive solving guide: guide panel (text + GIFs + algorithm buttons)
 * on the left, live 3D Rubik's Cube on the right. Users can click algorithm
 * buttons to apply moves, or manually turn the cube via drag/keyboard.
 *
 * Reuses all simulator engine components from pages/simulator/:
 *   useSimulatorQueue, useCubeControls, InteractiveCube, etc.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { useTheme } from '../context/ThemeContext';
import { CubeState } from '../cube/CubeState';
import { FACE_ORDER, getKeyMap } from './simulator/simulatorConstants';
import { useSimulatorQueue } from './simulator/useSimulatorQueue';
import { useCubeControls } from './simulator/useCubeControls';
import { getThemeClasses } from './simulator/simulatorTheme';
import {
  InteractiveCube,
  ResponsiveSceneCamera,
  SimulatorCanvasBoundary,
} from './simulator/InteractiveCube';

import GuidePanel from './step-by-step/GuidePanel';
import { STEPS } from './step-by-step/stepsData';

const CUBE_SIZE = 3;

export default function StepByStepPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const t = getThemeClasses(isDark);

  // Step navigation
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = STEPS[currentIndex];
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < STEPS.length - 1;

  const goNext = useCallback(() => {
    if (canNext) setCurrentIndex((i) => i + 1);
  }, [canNext]);

  const goPrev = useCallback(() => {
    if (canPrev) setCurrentIndex((i) => i - 1);
  }, [canPrev]);

  // Preload next GIF
  useEffect(() => {
    if (currentIndex < STEPS.length - 1) {
      const next = STEPS[currentIndex + 1];
      if (next.gif) {
        const img = new Image();
        img.src = next.gif;
      }
    }
  }, [currentIndex]);

  // Core cube state — same pattern as SimulatorPage
  const cubeStateObjRef = useRef(new CubeState(CUBE_SIZE));
  const [displayState, setDisplayState] = useState(() => cubeStateObjRef.current.getState());
  const solveStackRef = useRef([]);
  const [layoutResetKey, setLayoutResetKey] = useState(0);

  const keyMap = useMemo(() => getKeyMap(CUBE_SIZE), []);

  // Move queue hook
  const queue = useSimulatorQueue({
    cubeStateObjRef,
    canAnimateMoves: true,
    solveStackRef,
    setDisplayState,
  });

  // Manual cube controls (drag + keyboard)
  const dispatchManualMove = useCallback((move) => {
    queue.enqueueMoves([move]);
  }, [queue]);

  const controls = useCubeControls({
    cubeSize: CUBE_SIZE,
    dispatchManualMove,
    manualInputLocked: queue.queueActive,
  });

  // Algorithm button handler
  const handleApplyAlgorithm = useCallback((moves) => {
    queue.enqueueMoves(moves);
  }, [queue]);

  // Keyboard nav for steps (only when cube is not animating)
  useEffect(() => {
    const handleKey = (e) => {
      // Don't hijack arrow keys used for cube controls
      if (controls.selectedSticker) return;
      // Let the cube controls handle single-letter keys
      if (e.key.length === 1 && keyMap[e.key]) return;

      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, controls.selectedSticker, keyMap]);

  // Viewport
  const [viewportWidth, setViewportWidth] = useState(
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  );
  const isMobile = viewportWidth < 768;

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cameraProfile = useMemo(() => (
    isMobile
      ? { position: [5.8, 4.8, 7.1], fov: 54, minDistance: 5.5, maxDistance: 22 }
      : { position: [4, 3.5, 5], fov: 45, minDistance: 4, maxDistance: 20 }
  ), [isMobile]);

  return (
    <div
      className={`min-h-screen h-screen flex flex-col overflow-hidden transition-colors duration-300 ${t.pageBg}`}
      style={{
        '--sim-panel': isDark ? '#0A0A0A' : '#F0EDE8',
        '--sim-border': isDark ? 'rgba(176,176,176,0.1)' : '#A89F94',
        '--sim-text': isDark ? '#FFFFFF' : '#2C2A26',
      }}
    >
      {/* Header with nav */}
      <header className={`flex items-center justify-between px-6 py-3 border-b ${t.headerBorder} ${t.headerBg} shrink-0`}>
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5 group">
          <div className="w-6 h-6 rounded-full bg-[#1A1A1A] border border-dictator-red/40 flex items-center justify-center font-mono text-dictator-red text-[10px] font-bold select-none">
            TD
          </div>
          <span className={`font-heading tracking-widest text-sm uppercase transition-colors hidden sm:block ${isDark ? 'text-dictator-chrome group-hover:text-white' : 'text-dictator-ink group-hover:text-dictator-red'}`}>
            The Dictators
          </span>
        </button>

        <div className="flex items-center gap-6">
          {[
            { label: 'Learn', href: '/learn' },
            { label: 'Step by Step', href: '/step-by-step' },
            { label: 'Compete', href: '/leaderboard' },
          ].map((link) => (
            <button
              key={link.label}
              onClick={() => navigate(link.href)}
              className={`font-mono text-xs uppercase tracking-widest transition-colors relative group ${
                location.pathname === link.href
                  ? (isDark ? 'text-white' : 'text-dictator-ink')
                  : (isDark ? 'text-dictator-chrome hover:text-white' : 'text-dictator-ink/70 hover:text-dictator-ink')
              }`}
            >
              {link.label}
              <span className={`absolute -bottom-1 left-0 h-[1px] bg-dictator-red transition-all duration-300 ${
                location.pathname === link.href ? 'w-full' : 'w-0 group-hover:w-full'
              }`} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${t.border} ${t.headerText} hover:border-dictator-red/40`}
          >
            {isDark ? <Sun size={12} /> : <Moon size={12} />}
            {isDark ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={() => navigate('/simulator')}
            className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full bg-dictator-red text-white hover:bg-dictator-deep transition-colors"
          >
            Simulator
          </button>
        </div>
      </header>

      {/* Main content: guide LEFT, cube RIGHT on desktop; stacked on mobile */}
      <div className={`flex flex-1 min-h-0 ${isMobile ? 'flex-col' : 'flex-row'}`}>
        {/* Guide panel — LEFT side */}
        <div className={`${isMobile ? 'flex-1 min-h-[200px]' : 'flex-[0.82] min-w-[340px]'} border-r ${isDark ? 'border-white/5 bg-[#0A0A0A]' : 'border-dictator-ink/10 bg-dictator-linen'} ${isMobile ? 'order-2' : 'order-1'}`}>
          <GuidePanel
            currentStep={current}
            currentIndex={currentIndex}
            totalSlides={STEPS.length}
            canPrev={canPrev}
            canNext={canNext}
            onPrev={goPrev}
            onNext={goNext}
            onApplyAlgorithm={handleApplyAlgorithm}
            queueActive={queue.queueActive}
            isDark={isDark}
            onNavigateSimulator={() => navigate('/simulator')}
          />
        </div>

        {/* 3D Cube area — RIGHT side */}
        <div className={`relative ${isMobile ? 'min-h-[260px] flex-1 order-1' : 'flex-1 min-w-0 order-2'}`}>
          <SimulatorCanvasBoundary
            onError={(err) => console.error('Canvas error:', err)}
            fallback={<div className="flex items-center justify-center h-full text-dictator-red/50 font-mono text-sm">WebGL unavailable</div>}
          >
            <Canvas
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
                key={`3-${layoutResetKey}`}
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

          {queue.queueActive && (
            <div className={`absolute top-4 right-4 ${t.overlay} border border-dictator-red/30 rounded-full px-3 py-1.5 flex items-center gap-2 backdrop-blur`}>
              <span className="w-2 h-2 rounded-full bg-dictator-red animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-dictator-red">
                {queue.activeMove ? `Turning ${queue.activeMove}` : `${queue.queuedMoveCount} Queued`}
              </span>
            </div>
          )}

          <div className={`pointer-events-none absolute bottom-3 left-1/2 w-[calc(100%-2rem)] -translate-x-1/2 text-center font-mono text-[11px] uppercase tracking-widest ${t.textSecondary}`}>
            Drag stickers to turn · right-drag to orbit · scroll to zoom
          </div>
        </div>
      </div>
    </div>
  );
}
