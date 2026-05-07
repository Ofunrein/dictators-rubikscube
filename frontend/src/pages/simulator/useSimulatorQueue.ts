/**
 * useSimulatorQueue.ts — Manages the move animation queue
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { applyMove } from '../../cube/moves';
import { type CubeStateObj } from '../../cube/cubeModel';
import { type CubeState } from '../../cube/CubeState';
import { TURN_DURATION_SECONDS } from './simulatorAnimation';
import { mergeMoveIntoSolveStack, normalizeMoveSequence } from './moveNotation';

const MAX_HISTORY_LENGTH = 250;

interface QueuedMove {
  id: number;
  move: string;
  durationSeconds: number;
  recordHistory: boolean;
}

interface UseSimulatorQueueProps {
  cubeStateObjRef: MutableRefObject<CubeState>;
  canAnimateMoves: boolean;
  solveStackRef: MutableRefObject<string[]>;
  setDisplayState: Dispatch<SetStateAction<CubeStateObj>>;
}

export function useSimulatorQueue({
  cubeStateObjRef,
  canAnimateMoves,
  solveStackRef,
  setDisplayState,
}: UseSimulatorQueueProps) {
  const [activeMove, setActiveMove] = useState<string | null>(null);
  const [activeMoveId, setActiveMoveId] = useState<number | null>(null);
  const [activeMoveDurationSeconds, setActiveMoveDurationSeconds] = useState(TURN_DURATION_SECONDS);
  const [queuedMoveCount, setQueuedMoveCount] = useState(0);

  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [solveDepth, setSolveDepth] = useState(0);

  const moveQueueRef = useRef<QueuedMove[]>([]);
  const activeMoveRef = useRef<string | null>(null);
  const activeRecordHistoryRef = useRef(true);
  const moveIdRef = useRef(0);

  const startNextMove = useCallback(() => {
    if (activeMoveRef.current || moveQueueRef.current.length === 0) {
      setQueuedMoveCount(moveQueueRef.current.length);
      return;
    }

    const nextMove = moveQueueRef.current.shift();
    if (!nextMove) return;
    setQueuedMoveCount(moveQueueRef.current.length);
    activeMoveRef.current = nextMove.move;
    activeRecordHistoryRef.current = nextMove.recordHistory ?? true;
    setActiveMove(nextMove.move);
    setActiveMoveId(nextMove.id);
    setActiveMoveDurationSeconds(nextMove.durationSeconds);
  }, []);

  const clearPendingAnimation = useCallback(() => {
    moveQueueRef.current = [];
    activeMoveRef.current = null;
    setQueuedMoveCount(0);
    setActiveMove(null);
    setActiveMoveId(null);
    setActiveMoveDurationSeconds(TURN_DURATION_SECONDS);
  }, []);

  const applyMovesInstantly = useCallback((moves: string[]) => {
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

  const enqueueMoves = useCallback((
    moves: string[],
    { durationSeconds = TURN_DURATION_SECONDS, recordHistory = true } = {},
  ) => {
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

    const queuedMoves: QueuedMove[] = normalized.map((move) => {
      moveIdRef.current += 1;
      return {
        id: moveIdRef.current,
        move,
        durationSeconds,
        recordHistory,
      };
    });

    moveQueueRef.current.push(...queuedMoves);
    setQueuedMoveCount(moveQueueRef.current.length);
    startNextMove();
  }, [applyMovesInstantly, canAnimateMoves, solveStackRef, startNextMove]);

  const handleMoveAnimationComplete = useCallback((move: string) => {
    if (activeMoveRef.current !== move) {
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
