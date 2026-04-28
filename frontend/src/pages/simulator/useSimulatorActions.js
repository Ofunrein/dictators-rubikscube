/**
 * useSimulatorActions.js — Scramble, Solve, Reset, and size-change handlers
 *
 * These are the "big actions" the user triggers from the control panel.
 * Each one coordinates multiple subsystems (queue, timer, cube state, API calls).
 *
 * Also owns:
 *   - dispatchManualMove: the function called when a user clicks a move button
 *     or presses a keyboard shortcut. It checks if the timer should start,
 *     then enqueues the move.
 *   - Timed solve state: the waitingForFirstMoveRef and timerPrimed flag that
 *     control when the timer starts after a timed scramble.
 *   - Remote loading flags: isSolvingRemote and isScramblingRemote.
 *
 * Separated from SimulatorPage so the page component only handles
 * wiring and layout, not 200 lines of async handler logic.
 *
 * Used by: SimulatorPage.jsx
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { SUPPORTED_CUBE_SIZES, normalizeCubeSize } from '../../cube/cubeModel.js';
import { CubeState } from '../../cube/CubeState';
import { generateScrambleRemote, solveCubeRemote } from '../../net/api';
import { SOLVE_TURN_DURATION_SECONDS } from './simulatorAnimation';
import { normalizeMoveSequence } from './moveNotation';

const MAX_HISTORY_LENGTH = 250;

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
}) {
  const [isSolvingRemote, setIsSolvingRemote] = useState(false);
  const [isScramblingRemote, setIsScramblingRemote] = useState(false);
  const [scrambleSeq, setScrambleSeq] = useState([]);
  const [timerPrimed, setTimerPrimed] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [scrambleMoveCount, setScrambleMoveCount] = useState(0);
  const [isTimedSolveSession, setIsTimedSolveSession] = useState(false);

  // This ref is set to true after a timed scramble. The first user move
  // after the scramble clears it and starts the timer.
  const waitingForFirstMoveRef = useRef(false);

  const moveHistoryRef = useRef(moveHistory);
  moveHistoryRef.current = moveHistory;

  const solveStatusLabel = useMemo(() => (
    cubeSize === 3
      ? 'Solving via Eric C++ WASM'
      : `Solving ${cubeSize}x${cubeSize} via Python bridge`
  ), [cubeSize]);

  // Compute interactionLocked from queueActive + our own loading flags.
  // This breaks the circular dependency — SimulatorPage passes queueActive (from the queue hook)
  // and we add our own remote-loading states.
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

  // Resets the cube to a clean solved state for the current size.
  const resetCubeToSolved = useCallback(() => {
    const solved = CubeState.createSolvedState(cubeSize);
    cubeStateObjRef.current.setState(solved);
    setDisplayState({ ...solved });
  }, [cubeSize, cubeStateObjRef, setDisplayState]);

  // The function that fires when a user clicks a move button or presses a key.
  // If a timed solve is armed, this is where the timer actually starts.
  const dispatchManualMove = useCallback((move) => {
    if (!move || interactionLocked) return;

    if (waitingForFirstMoveRef.current) {
      waitingForFirstMoveRef.current = false;
      setTimerPrimed(false);
      setScrambleMoveCount(moveHistoryRef.current.length);
      timer.startFreshTimer();
    }

    enqueueMoves([move]);
  }, [enqueueMoves, interactionLocked, timer]);

  // Scramble: asks the backend for a scramble, resets the cube, then
  // animates the scramble moves step by step.
  const handleScramble = useCallback(async ({ armTimer = false } = {}) => {
    if (interactionLocked) return;

    setIsScramblingRemote(true);

    try {
      const payload = await generateScrambleRemote({
        size: cubeSize,
        length: scrambleLength,
      });

      setScrambleSeq(normalizeMoveSequence(payload.scramble));
      clearSelectedStickerRef.current?.();

      resetCubeToSolved();
      bumpLayout();
      setMoveHistory([]);
      solveStackRef.current = [];
      setSolveDepth(0);
      timer.resetTimer();
      waitingForFirstMoveRef.current = armTimer;
      setTimerPrimed(armTimer);
      setScrambleMoveCount(armTimer ? payload.scramble.length : 0);
      if (armTimer) setIsTimedSolveSession(true);

      // In timed solve mode, scramble moves are hidden from history —
      // only the user's manual moves and solve moves should appear.
      enqueueMoves(payload.scramble, { recordHistory: !armTimer });
    } catch (error) {
      clearTimedSolveState();
      console.error('Remote scramble failed.', error);
      setActionError(error instanceof Error ? error.message : 'Scramble failed. Check your connection.');
    } finally {
      setIsScramblingRemote(false);
    }
  }, [bumpLayout, clearSelectedStickerRef, clearTimedSolveState, cubeSize, enqueueMoves, interactionLocked, resetCubeToSolved, scrambleLength, setMoveHistory, setSolveDepth, solveStackRef, timer]);

  // Timer button: if running or primed, cancel. Otherwise start a timed scramble.
  const handleTimerAction = useCallback(() => {
    if (timer.timerRunning || timerPrimed) {
      cancelTimedSolve();
      return;
    }

    handleScramble({ armTimer: true });
  }, [cancelTimedSolve, handleScramble, timerPrimed, timer]);

  // Solve: sends the current state to the backend, then animates the solution.
  // Always cancels the timer — using the solver invalidates a timed solve.
  const handleSolve = useCallback(async () => {
    if (interactionLocked || !solveStackRef.current.length) return;

    cancelTimedSolve();
    setIsSolvingRemote(true);

    try {
      const payload = await solveCubeRemote(cubeStateObjRef.current.getState(), 'beginner', cubeSize);
      clearPendingAnimation();

      if (Array.isArray(payload.moves) && payload.moves.length > 0) {
        enqueueMoves(payload.moves, { durationSeconds: SOLVE_TURN_DURATION_SECONDS });
        return;
      }

      if (!payload.state) {
        throw new Error('Backend did not return a solved state.');
      }

      // When the backend can solve but cannot provide a replayable move list,
      // snap to the solved state and rebuild the layout.
      cubeStateObjRef.current.setState(payload.state);
      setDisplayState({ ...payload.state });
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

  // Reset: clears everything back to a fresh solved cube.
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

  // Size change: switches to a different cube size (2x2, 3x3, or 4x4).
  // Resets everything since the old state doesn't apply to the new size.
  const handleSizeChange = useCallback((nextSize) => {
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
