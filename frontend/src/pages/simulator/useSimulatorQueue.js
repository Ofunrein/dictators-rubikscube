/**
 * useSimulatorQueue.js — Manages the move animation queue
 *
 * When you click a move button or press a key, the move doesn't happen instantly.
 * It goes into a QUEUE and gets animated one at a time so turns don't overlap.
 *
 * Think of it like a playlist: each move waits its turn, plays its animation,
 * then the next move starts. This hook handles that entire lifecycle:
 *   - Queuing moves (enqueueMoves)
 *   - Starting the next move when the current one finishes (startNextMove)
 *   - Updating cube state after each animated move completes (handleMoveAnimationComplete)
 *   - Instantly applying moves when the 3D canvas is offline (applyMovesInstantly)
 *   - Tracking move history and solve depth for the UI
 *
 * Used by: SimulatorPage.jsx (and nothing else — this is a page-level hook)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { applyMove } from '../../cube/moves';
import { TURN_DURATION_SECONDS } from './simulatorAnimation';
import { mergeMoveIntoSolveStack, normalizeMoveSequence } from './moveNotation';

const MAX_HISTORY_LENGTH = 250;

export function useSimulatorQueue({ cubeStateObjRef, canAnimateMoves, solveStackRef, setDisplayState }) {
  // State that drives the 3D animation layer and the queue status indicator
  const [activeMove, setActiveMove] = useState(null);
  const [activeMoveId, setActiveMoveId] = useState(null);
  const [activeMoveDurationSeconds, setActiveMoveDurationSeconds] = useState(TURN_DURATION_SECONDS);
  const [queuedMoveCount, setQueuedMoveCount] = useState(0);

  // Move history shown in the left panel, and solve depth used to enable/disable Solve
  const [moveHistory, setMoveHistory] = useState([]);
  const [solveDepth, setSolveDepth] = useState(0);

  // Refs survive re-renders. The queue and active-move refs need to be refs (not state)
  // because animation callbacks read them synchronously mid-frame.
  const moveQueueRef = useRef([]);
  const activeMoveRef = useRef(null);
  const activeRecordHistoryRef = useRef(true);
  const moveIdRef = useRef(0);

  // Pulls the next move off the queue and starts its animation.
  // If the queue is empty or something is already animating, it's a no-op.
  const startNextMove = useCallback(() => {
    if (activeMoveRef.current || moveQueueRef.current.length === 0) {
      setQueuedMoveCount(moveQueueRef.current.length);
      return;
    }

    const nextMove = moveQueueRef.current.shift();
    setQueuedMoveCount(moveQueueRef.current.length);
    activeMoveRef.current = nextMove.move;
    activeRecordHistoryRef.current = nextMove.recordHistory ?? true;
    setActiveMove(nextMove.move);
    setActiveMoveId(nextMove.id);
    setActiveMoveDurationSeconds(nextMove.durationSeconds);
  }, []);

  // Wipes the entire queue and resets the active move.
  // Called by Reset, Solve (before replaying solver moves), and size change.
  const clearPendingAnimation = useCallback(() => {
    moveQueueRef.current = [];
    activeMoveRef.current = null;
    setQueuedMoveCount(0);
    setActiveMove(null);
    setActiveMoveId(null);
    setActiveMoveDurationSeconds(TURN_DURATION_SECONDS);
  }, []);

  // Fallback path: when the 3D canvas is unavailable, apply moves to the logical
  // state immediately (no animation). The cube state still updates correctly,
  // you just can't see the turn.
  const applyMovesInstantly = useCallback((moves) => {
    const normalized = normalizeMoveSequence(moves);
    if (normalized.length === 0) return;

    let nextState = cubeStateObjRef.current.getState();
    for (const move of normalized) {
      nextState = applyMove(nextState, move);
      mergeMoveIntoSolveStack(solveStackRef.current, move);
    }

    cubeStateObjRef.current.setState(nextState);
    setDisplayState({ ...nextState });
  }, [cubeStateObjRef, setDisplayState, solveStackRef]);

  // Adds moves to the queue. If the canvas is down, applies them instantly instead.
  const enqueueMoves = useCallback((moves, { durationSeconds = TURN_DURATION_SECONDS, recordHistory = true } = {}) => {
    const normalized = normalizeMoveSequence(moves);
    if (normalized.length === 0) return;

    if (!canAnimateMoves) {
      applyMovesInstantly(normalized);
      if (recordHistory) {
        setMoveHistory((prev) => [...prev, ...normalized].slice(-MAX_HISTORY_LENGTH));
      }
      setSolveDepth(solveStackRef.current.length);
      return;
    }

    const queuedMoves = normalized.map((move) => {
      moveIdRef.current += 1;
      return {
        id: moveIdRef.current,
        move,
        durationSeconds,
        recordHistory,
      };
    });

    moveQueueRef.current.push(
      ...queuedMoves,
    );
    setQueuedMoveCount(moveQueueRef.current.length);
    startNextMove();
  }, [applyMovesInstantly, canAnimateMoves, solveStackRef, startNextMove]);

  // Called by InteractiveCube when a turn animation finishes.
  // Updates the logical cube state, records the move in history and solve stack,
  // then kicks off the next queued move.
  const handleMoveAnimationComplete = useCallback((move) => {
    // Guard: only process if this is still the active move. This prevents
    // double-processing if both the animation callback and the safety timeout fire.
    if (activeMoveRef.current !== move) {
      // If nothing is active and the queue has moves, unstick it.
      if (!activeMoveRef.current && moveQueueRef.current.length > 0) {
        startNextMove();
      }
      return;
    }

    const newState = applyMove(cubeStateObjRef.current.getState(), move);
    cubeStateObjRef.current.setState(newState);
    setDisplayState({ ...newState });

    if (activeRecordHistoryRef.current) {
      setMoveHistory((prev) => [...prev, move].slice(-MAX_HISTORY_LENGTH));
    }
    mergeMoveIntoSolveStack(solveStackRef.current, move);
    setSolveDepth(solveStackRef.current.length);

    activeMoveRef.current = null;
    setActiveMove(null);
    setActiveMoveId(null);
    setActiveMoveDurationSeconds(TURN_DURATION_SECONDS);
    startNextMove();
  }, [cubeStateObjRef, setDisplayState, solveStackRef, startNextMove]);

  // Safety net: if an animation takes way too long (4x the expected duration),
  // force-complete it. This prevents the queue from getting permanently stuck
  // if Three.js drops a frame callback.
  useEffect(() => {
    if (!activeMove) return undefined;

    const timeout = setTimeout(() => {
      if (activeMoveRef.current === activeMove) {
        handleMoveAnimationComplete(activeMove);
      }
    }, activeMoveDurationSeconds * 4 * 1000);

    return () => clearTimeout(timeout);
  }, [activeMove, activeMoveDurationSeconds, handleMoveAnimationComplete]);

  const queueActive = activeMove !== null || queuedMoveCount > 0;

  return {
    activeMove,
    activeMoveId,
    activeMoveDurationSeconds,
    applyMovesInstantly,
    clearPendingAnimation,
    enqueueMoves,
    handleMoveAnimationComplete,
    moveHistory,
    moveQueueRef,
    activeMoveRef,
    queueActive,
    queuedMoveCount,
    setMoveHistory,
    setSolveDepth,
    solveDepth,
  };
}
