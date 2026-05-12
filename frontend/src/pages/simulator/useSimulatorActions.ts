/**
 * useSimulatorActions.ts — Scramble, Solve, Reset, and size-change handlers
 *
 * Coordinates the higher-level user actions that affect the whole cube state
 * rather than a single move. Fetches scrambles and solves from the remote API,
 * feeds the resulting move sequences into the animation queue, and manages the
 * loading/error state for each action.
 *
 * Key exports:
 *   - useSimulatorActions(props) — returns { scramble, solve, reset, changeSize, … }
 *
 * Network requests go through net/api.ts. Animation is handled by the queue
 * from useSimulatorQueue.ts — this hook only decides what to enqueue and when.
 */

import { useCallback, useRef, useState } from 'react';
import { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { SUPPORTED_CUBE_SIZES, normalizeCubeSize, type CubeStateObj } from '../../cube/cubeModel.js';
import { CubeState } from '../../cube/CubeState';
import { generateScrambleRemote, solveCubeRemote } from '../../net/api';
import { SOLVE_TURN_DURATION_SECONDS } from './simulatorAnimation';
import { normalizeMoveSequence } from './moveNotation';

const MAX_HISTORY_LENGTH = 250;

interface UseSimulatorActionsProps {
  cubeSize: number;
  setCubeSize: Dispatch<SetStateAction<number>>;
  cubeStateObjRef: MutableRefObject<CubeState>;
  solveStackRef: MutableRefObject<string[]>;
  setDisplayState: Dispatch<SetStateAction<CubeStateObj>>;
  enqueueMoves: (moves: string[], options?: { durationSeconds?: number; recordHistory?: boolean }) => void;
  clearPendingAnimation: () => void;
  setMoveHistory: Dispatch<SetStateAction<string[]>>;
  setSolveDepth: Dispatch<SetStateAction<number>>;
  clearSelectedStickerRef: MutableRefObject<() => void>;
  timer: {
    timerRunning: boolean;
    timerMs: number;
    startFreshTimer: () => void;
    stopTimer: (opts?: { clearElapsed?: boolean }) => void;
    resetTimer: () => void;
  };
  queueActive: boolean;
  bumpLayout: () => void;
  scrambleLength: number;
  moveHistory: string[];
}

export function useSimulatorActions({
  cubeSize,
  setCubeSize,
  cubeStateObjRef,
  solveStackRef,
  setDisplayState,
  enqueueMoves,
  clearPendingAnimation,
  setMoveHistory,
  setSolveDepth,
  clearSelectedStickerRef,
  timer,
  queueActive,
  bumpLayout,
  scrambleLength,
  moveHistory,
}: UseSimulatorActionsProps) {
  const [isSolvingRemote, setIsSolvingRemote] = useState(false);
  const [isScramblingRemote, setIsScramblingRemote] = useState(false);
  const [scrambleSeq, setScrambleSeq] = useState<string[]>([]);
  const [timerPrimed, setTimerPrimed] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [scrambleMoveCount, setScrambleMoveCount] = useState(0);
  const [isTimedSolveSession, setIsTimedSolveSession] = useState(false);

  const waitingForFirstMoveRef = useRef(false);

  const moveHistoryRef = useRef(moveHistory);
  // eslint-disable-next-line react-hooks/refs
  moveHistoryRef.current = moveHistory;

  const [solveStatusLabel, setSolveStatusLabel] = useState('Solving via Eric C++ WASM');

  const interactionLocked = queueActive || isSolvingRemote || isScramblingRemote;

  const clearTimedSolveState = useCallback(() => {
    waitingForFirstMoveRef.current = false;
    setTimerPrimed(false);
    setScrambleMoveCount(0);
    setIsTimedSolveSession(false);
  }, []);

  const cancelTimedSolve = useCallback(() => {
    clearTimedSolveState();
    timer.resetTimer();
  }, [clearTimedSolveState, timer]);

  const resetCubeToSolved = useCallback(() => {
    const solved = CubeState.createSolvedState(cubeSize);
    cubeStateObjRef.current.setState(solved);
    setDisplayState({ ...solved });
  }, [cubeSize, cubeStateObjRef, setDisplayState]);

  const dispatchManualMove = useCallback((move: string) => {
    if (!move || interactionLocked) return;

    if (waitingForFirstMoveRef.current) {
      waitingForFirstMoveRef.current = false;
      setTimerPrimed(false);
      setScrambleMoveCount(moveHistoryRef.current.length);
      timer.startFreshTimer();
    }

    enqueueMoves([move]);
  }, [enqueueMoves, interactionLocked, timer]);

  const handleScramble = useCallback(async ({ armTimer = false } = {}) => {
    if (interactionLocked) return;

    setIsScramblingRemote(true);

    try {
      const payload = await generateScrambleRemote({
        size: cubeSize,
        length: scrambleLength,
      });

      const scramble = payload['scramble'] as string[];
      setScrambleSeq(normalizeMoveSequence(scramble));
      clearSelectedStickerRef.current?.();

      resetCubeToSolved();
      bumpLayout();
      setMoveHistory([]);
      solveStackRef.current = [];
      setSolveDepth(0);
      timer.resetTimer();
      waitingForFirstMoveRef.current = armTimer;
      setTimerPrimed(armTimer);
      setScrambleMoveCount(armTimer ? scramble.length : 0);
      if (armTimer) setIsTimedSolveSession(true);

      enqueueMoves(scramble, { recordHistory: !armTimer });
    } catch (error) {
      clearTimedSolveState();
      console.error('Remote scramble failed.', error);
      setActionError(error instanceof Error ? error.message : 'Scramble failed. Check your connection.');
    } finally {
      setIsScramblingRemote(false);
    }
  }, [bumpLayout, clearSelectedStickerRef, clearTimedSolveState, cubeSize, enqueueMoves, interactionLocked, resetCubeToSolved, scrambleLength, setMoveHistory, setSolveDepth, solveStackRef, timer]);

  const handleTimerAction = useCallback(() => {
    if (timer.timerRunning || timerPrimed) {
      cancelTimedSolve();
      return;
    }

    handleScramble({ armTimer: true });
  }, [cancelTimedSolve, handleScramble, timerPrimed, timer]);

  const handleSolve = useCallback(async () => {
    if (interactionLocked || !solveStackRef.current.length) return;

    cancelTimedSolve();

    const label = cubeSize !== 3
      ? `Solving ${cubeSize}x${cubeSize} via Python NxN`
      : 'Solving via Eric C++ WASM';
    setSolveStatusLabel(label);
    setIsSolvingRemote(true);

    try {
      const payload = await solveCubeRemote(
        cubeStateObjRef.current.getState(),
        'beginner',
        cubeSize,
        solveStackRef.current,
      );
      clearPendingAnimation();

      const moves = payload['moves'] as string[];
      if (Array.isArray(moves) && moves.length > 0) {
        enqueueMoves(moves, { durationSeconds: SOLVE_TURN_DURATION_SECONDS });
        return;
      }

      if (!payload['state']) {
        throw new Error('Backend did not return a solved state.');
      }

      const solvedState = payload['state'] as CubeStateObj;
      cubeStateObjRef.current.setState(solvedState);
      setDisplayState({ ...solvedState });
      bumpLayout();
      setMoveHistory((prev) => [...prev, 'SOLVED'].slice(-MAX_HISTORY_LENGTH));
      solveStackRef.current = [];
      setSolveDepth(0);
      clearTimedSolveState();
    } catch (error) {
      console.error('Remote solve failed.', error);
      setActionError(error instanceof Error ? error.message : 'Solve failed. Check your connection.');
    } finally {
      setIsSolvingRemote(false);
    }
  }, [bumpLayout, cancelTimedSolve, clearPendingAnimation, clearTimedSolveState, cubeSize, cubeStateObjRef, enqueueMoves, interactionLocked, setDisplayState, setMoveHistory, setSolveDepth, solveStackRef]);

  const handleReset = useCallback(() => {
    if (interactionLocked) return;

    clearPendingAnimation();
    clearTimedSolveState();
    solveStackRef.current = [];
    setSolveDepth(0);
    setMoveHistory([]);
    setScrambleSeq([]);
    clearSelectedStickerRef.current?.();

    resetCubeToSolved();
    bumpLayout();
    timer.resetTimer();
  }, [bumpLayout, clearPendingAnimation, clearSelectedStickerRef, clearTimedSolveState, interactionLocked, resetCubeToSolved, setMoveHistory, setSolveDepth, solveStackRef, timer]);

  const handleSizeChange = useCallback((nextSize: number) => {
    const normalizedSize = normalizeCubeSize(nextSize);
    if (interactionLocked || normalizedSize === cubeSize) return;
    if (!SUPPORTED_CUBE_SIZES.includes(normalizedSize)) return;

    clearPendingAnimation();
    clearTimedSolveState();
    solveStackRef.current = [];
    setSolveDepth(0);
    setMoveHistory([]);
    setScrambleSeq([]);
    clearSelectedStickerRef.current?.();
    timer.resetTimer();

    const nextCube = new CubeState(normalizedSize);
    cubeStateObjRef.current = nextCube;
    setCubeSize(normalizedSize);
    setDisplayState(nextCube.getState());
    bumpLayout();
  }, [bumpLayout, clearPendingAnimation, clearSelectedStickerRef, clearTimedSolveState, cubeSize, cubeStateObjRef, interactionLocked, setCubeSize, setDisplayState, setMoveHistory, setSolveDepth, solveStackRef, timer]);

  return {
    actionError,
    clearActionError: () => setActionError(null),
    cancelTimedSolve,
    dispatchManualMove,
    handleReset,
    handleScramble,
    handleSizeChange,
    handleSolve,
    handleTimerAction,
    interactionLocked,
    isScramblingRemote,
    isSolvingRemote,
    isTimedSolveSession,
    scrambleSeq,
    scrambleMoveCount,
    solveStatusLabel,
    timerPrimed,
  };
}
