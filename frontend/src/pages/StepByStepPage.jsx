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
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { useTheme } from '../context/ThemeContext';
import PageNavbar from '../components/PageNavbar';
import { CubeState } from '../cube/CubeState';
import { FACE_ORDER, getKeyMap, generateScramble } from './simulator/simulatorConstants';
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
  const { isDark, toggleTheme } = useTheme();
  const t = getThemeClasses(isDark);

  // Step navigation
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = STEPS[currentIndex];
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < STEPS.length - 1;

  const goNext = useCallback(() => {
    if (canNext) startTransition(() => setCurrentIndex((i) => i + 1));
  }, [canNext]);

  const goPrev = useCallback(() => {
    if (canPrev) startTransition(() => setCurrentIndex((i) => i - 1));
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

  // Scramble handler
  const [isScrambled, setIsScrambled] = useState(false);
  const handleScramble = useCallback(() => {
    if (isScrambled || queue.queueActive) return;
    const scrambleMoves = generateScramble(CUBE_SIZE);
    queue.enqueueMoves(scrambleMoves);
    setIsScrambled(true);
  }, [isScrambled, queue]);

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
      <PageNavbar />

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
            onScramble={handleScramble}
            isScrambled={isScrambled}
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
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${t.overlay} border border-dictator-red/30 rounded-2xl px-6 py-4 flex items-center gap-3 backdrop-blur-md shadow-xl z-10`}>
              <span className="w-3 h-3 rounded-full bg-dictator-red animate-pulse" />
              <span className="font-mono text-base font-bold uppercase tracking-widest text-dictator-red">
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
