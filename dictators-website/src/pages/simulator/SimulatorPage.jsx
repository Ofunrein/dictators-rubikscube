import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ArrowLeft, Timer } from 'lucide-react';
import { CubeState } from '../../cube/CubeState';
import { applyMove } from '../../cube/moves';
import { solveCubeRemote } from '../../net/api';
import {
  inverseMove,
  invertMoveSequence,
  isSliceMove,
  SOLVE_TURN_DURATION_SECONDS,
  TURN_DURATION_SECONDS,
  mergeMoveIntoSolveStack,
  normalizeMoveSequence,
} from './simulatorAnimation';
import {
  FACE_ORDER,
  formatTime,
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

  const isSolved = FACE_ORDER.every((face) =>
    displayState[face].every((sticker) => sticker === displayState[face][0]),
  );

  const {
    bestTime,
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

  const cameraProfile = isMobileViewport
    ? { position: [5.8, 4.8, 7.1], fov: 54, minDistance: 5.5, maxDistance: 13.5 }
    : isTabletViewport
      ? { position: [4.8, 4.0, 5.9], fov: 49, minDistance: 4.8, maxDistance: 12.5 }
      : { position: [4, 3.5, 5], fov: 45, minDistance: 4, maxDistance: 12 };

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

    const shouldStartTimer =
      waitingForFirstMoveRef.current || (!timerRunning && timerMs === 0 && isSolved);

    if (shouldStartTimer) {
      waitingForFirstMoveRef.current = false;
      startFreshTimer();
    }

    enqueueMoves([move]);
  }, [enqueueMoves, interactionLocked, isSolved, startFreshTimer, timerMs, timerRunning]);

  const { handleStickerSelect, selectedSticker } = useCubeControls({
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

    resetCubeToSolved();
    setMoveHistory([]);
    solveStackRef.current = [];
    setSolveDepth(0);
    resetTimer();
    waitingForFirstMoveRef.current = true;

    enqueueMoves(sequence);
  }, [enqueueMoves, interactionLocked, resetCubeToSolved, resetTimer]);

  const handleSolve = useCallback(async () => {
    if (interactionLocked || solveDepth === 0) return;

    const solveStackSnapshot = [...solveStackRef.current];
    const inverseSolveMoves = invertMoveSequence(solveStackSnapshot);
    const needsLocalHistorySolve = solveStackSnapshot.some(isSliceMove);

    if (needsLocalHistorySolve) {
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

      cubeStateObj.setState(payload.state);
      setDisplayState({ ...payload.state });
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

    resetCubeToSolved();
    resetTimer();
  }, [interactionLocked, resetCubeToSolved, resetTimer]);

  const handleUndo = useCallback(() => {
    if (interactionLocked || solveDepth === 0) return;

    const lastMove = solveStackRef.current[solveStackRef.current.length - 1];
    if (!lastMove) return;

    enqueueMoves([inverseMove(lastMove)]);
  }, [enqueueMoves, interactionLocked, solveDepth]);

  const handleUndoAll = useCallback(() => {
    if (interactionLocked || solveDepth === 0) return;

    const inverseMoves = invertMoveSequence(solveStackRef.current);
    if (inverseMoves.length === 0) return;

    enqueueMoves(inverseMoves);
  }, [enqueueMoves, interactionLocked, solveDepth]);

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

        <button
          onClick={toggleTimer}
          className={`flex items-center gap-2 font-mono text-sm font-bold px-4 py-2 rounded-full border transition-all duration-200
            ${timerRunning
              ? 'bg-dictator-red/20 border-dictator-red text-dictator-red'
              : 'bg-[#1A1A1A] border-dictator-chrome/20 text-white hover:border-dictator-red/50 hover:text-white'
            }`}
        >
          <Timer size={14} />
          {formatTime(timerMs)}
        </button>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">
        <SimulatorControls
          activeMove={activeMove}
          bestTime={bestTime}
          interactionLocked={interactionLocked}
          manualInputLocked={manualInputLocked}
          moveHistory={moveHistory}
          onMoveSelect={dispatchManualMove}
          onReset={handleReset}
          onScramble={handleScramble}
          onSolve={handleSolve}
          onUndo={handleUndo}
          onUndoAll={handleUndoAll}
          scrambleSeq={scrambleSeq}
          solveDepth={solveDepth}
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
