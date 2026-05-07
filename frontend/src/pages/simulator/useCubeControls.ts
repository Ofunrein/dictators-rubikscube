/**
 * useCubeControls.ts — React hook for keyboard and mouse cube interaction
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getKeyMap } from './simulatorConstants';
import type { FaceName } from '../../cube/cubeModel';

export const DRAG_THRESHOLD_PX = 15;
const MIN_PROJECTED_AXIS_LENGTH = 0.0001;

interface TrackOptions {
  outerMin: string | null;
  middle?: string | null;
  innerMin?: string | null;
  innerMax?: string | null;
  outerMax: string | null;
}

function buildMoveTrack(size: number, { outerMin, middle = null, innerMin = null, innerMax = null, outerMax }: TrackOptions): (string | null)[] {
  const track: (string | null)[] = Array.from({ length: size }, () => null);
  track[0] = outerMin;
  track[size - 1] = outerMax;

  if (size === 4) {
    track[1] = innerMin;
    track[2] = innerMax;
    return track;
  }

  if (size % 2 === 1) {
    track[Math.floor(size / 2)] = middle;
  }

  return track;
}

export function getStickerMove(face: string, arrowKey: string, row: number, col: number, size: number): string | null {
  const columnTrack = (track: TrackOptions) => buildMoveTrack(size, track)[col] ?? null;
  const rowTrack = (track: TrackOptions) => buildMoveTrack(size, track)[row] ?? null;

  const moveMap: Record<string, Record<string, string | null>> = {
    F: {
      ArrowUp: columnTrack({ outerMin: "L'", innerMin: "l'", middle: "M'", innerMax: 'r', outerMax: 'R' }),
      ArrowDown: columnTrack({ outerMin: 'L', innerMin: 'l', middle: 'M', innerMax: "r'", outerMax: "R'" }),
      ArrowLeft: rowTrack({ outerMin: 'U', innerMin: 'u', middle: "E'", innerMax: "d'", outerMax: "D'" }),
      ArrowRight: rowTrack({ outerMin: "U'", innerMin: "u'", middle: 'E', innerMax: 'd', outerMax: 'D' }),
    },
    B: {
      ArrowUp: columnTrack({ outerMin: "R'", innerMin: "r'", middle: 'M', innerMax: 'l', outerMax: 'L' }),
      ArrowDown: columnTrack({ outerMin: 'R', innerMin: 'r', middle: "M'", innerMax: "l'", outerMax: "L'" }),
      ArrowLeft: rowTrack({ outerMin: 'U', innerMin: 'u', middle: "E'", innerMax: "d'", outerMax: "D'" }),
      ArrowRight: rowTrack({ outerMin: "U'", innerMin: "u'", middle: 'E', innerMax: 'd', outerMax: 'D' }),
    },
    R: {
      ArrowUp: columnTrack({ outerMin: "F'", innerMin: "f'", middle: "S'", innerMax: 'b', outerMax: 'B' }),
      ArrowDown: columnTrack({ outerMin: 'F', innerMin: 'f', middle: 'S', innerMax: "b'", outerMax: "B'" }),
      ArrowLeft: rowTrack({ outerMin: 'U', innerMin: 'u', middle: "E'", innerMax: "d'", outerMax: "D'" }),
      ArrowRight: rowTrack({ outerMin: "U'", innerMin: "u'", middle: 'E', innerMax: 'd', outerMax: 'D' }),
    },
    L: {
      ArrowUp: columnTrack({ outerMin: "B'", innerMin: "b'", middle: 'S', innerMax: 'f', outerMax: 'F' }),
      ArrowDown: columnTrack({ outerMin: 'B', innerMin: 'b', middle: "S'", innerMax: "f'", outerMax: "F'" }),
      ArrowLeft: rowTrack({ outerMin: 'U', innerMin: 'u', middle: "E'", innerMax: "d'", outerMax: "D'" }),
      ArrowRight: rowTrack({ outerMin: "U'", innerMin: "u'", middle: 'E', innerMax: 'd', outerMax: 'D' }),
    },
    U: {
      ArrowUp: columnTrack({ outerMin: "L'", innerMin: "l'", middle: "M'", innerMax: 'r', outerMax: 'R' }),
      ArrowDown: columnTrack({ outerMin: 'L', innerMin: 'l', middle: 'M', innerMax: "r'", outerMax: "R'" }),
      ArrowLeft: rowTrack({ outerMin: "F'", innerMin: "f'", middle: "S'", innerMax: 'b', outerMax: 'B' }),
      ArrowRight: rowTrack({ outerMin: 'F', innerMin: 'f', middle: 'S', innerMax: "b'", outerMax: "B'" }),
    },
    D: {
      ArrowUp: columnTrack({ outerMin: 'L', innerMin: 'l', middle: 'M', innerMax: "r'", outerMax: "R'" }),
      ArrowDown: columnTrack({ outerMin: "L'", innerMin: "l'", middle: "M'", innerMax: 'r', outerMax: 'R' }),
      ArrowLeft: rowTrack({ outerMin: "B'", innerMin: "b'", middle: 'S', innerMax: 'f', outerMax: 'F' }),
      ArrowRight: rowTrack({ outerMin: 'B', innerMin: 'b', middle: "S'", innerMax: "f'", outerMax: "F'" }),
    },
  };

  return moveMap[face]?.[arrowKey] ?? null;
}

interface Vec2 { x: number; y: number }

export interface DragMoveCandidate {
  dragAxis: 'horizontal' | 'vertical';
  move: string;
  screenDelta: Vec2;
}

export interface ScreenBasis {
  right: Vec2;
  up: Vec2;
}

interface FaceScreenBasis { right?: Vec2; up?: Vec2 }

function normalizeScreenVector(vector: Vec2 | null | undefined): Vec2 | null {
  const length = Math.hypot(vector?.x ?? 0, vector?.y ?? 0);
  if (length <= MIN_PROJECTED_AXIS_LENGTH) return null;
  return { x: vector!.x / length, y: vector!.y / length };
}

function screenAlignedDragDirectionToArrow(deltaX: number, deltaY: number): string | null {
  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    if (deltaX === 0) return deltaY > 0 ? 'ArrowDown' : deltaY < 0 ? 'ArrowUp' : null;
    return deltaX > 0 ? 'ArrowRight' : 'ArrowLeft';
  }
  if (deltaY === 0) return null;
  return deltaY > 0 ? 'ArrowDown' : 'ArrowUp';
}

function getPreferredDragAxis(deltaX: number, deltaY: number, faceScreenBasis: FaceScreenBasis | null = null): 'horizontal' | 'vertical' {
  const normalizedRight = normalizeScreenVector(faceScreenBasis?.right);
  const normalizedUp = normalizeScreenVector(faceScreenBasis?.up);

  if (!normalizedRight || !normalizedUp) {
    return Math.abs(deltaX) >= Math.abs(deltaY) ? 'horizontal' : 'vertical';
  }

  const horizontalProjection = (deltaX * normalizedRight.x) + (deltaY * normalizedRight.y);
  const verticalProjection = (deltaX * normalizedUp.x) + (deltaY * normalizedUp.y);

  return Math.abs(horizontalProjection) >= Math.abs(verticalProjection) ? 'horizontal' : 'vertical';
}

export function dragDirectionToArrow(deltaX: number, deltaY: number, faceScreenBasis: FaceScreenBasis | null = null): string | null {
  const normalizedRight = normalizeScreenVector(faceScreenBasis?.right);
  const normalizedUp = normalizeScreenVector(faceScreenBasis?.up);

  if (!normalizedRight || !normalizedUp) return screenAlignedDragDirectionToArrow(deltaX, deltaY);

  const horizontalProjection = (deltaX * normalizedRight.x) + (deltaY * normalizedRight.y);
  const verticalProjection = (deltaX * normalizedUp.x) + (deltaY * normalizedUp.y);

  if (Math.abs(horizontalProjection) >= Math.abs(verticalProjection)) {
    if (horizontalProjection === 0) return verticalProjection > 0 ? 'ArrowUp' : verticalProjection < 0 ? 'ArrowDown' : null;
    return horizontalProjection > 0 ? 'ArrowRight' : 'ArrowLeft';
  }

  if (verticalProjection === 0) return null;
  return verticalProjection > 0 ? 'ArrowUp' : 'ArrowDown';
}

export function hasExceededDragThreshold(deltaX: number, deltaY: number, threshold: number = DRAG_THRESHOLD_PX): boolean {
  return Math.hypot(deltaX, deltaY) > threshold;
}

interface Candidate {
  dragAxis?: string;
  move?: string;
  screenDelta?: Vec2;
}

export function resolveDragMoveFromCandidates(deltaX: number, deltaY: number, candidates: Candidate[] = [], faceScreenBasis: FaceScreenBasis | null = null): string | null {
  const dragLength = Math.hypot(deltaX, deltaY);
  if (dragLength <= MIN_PROJECTED_AXIS_LENGTH) return null;

  const normalizedDrag = { x: deltaX / dragLength, y: deltaY / dragLength };
  const preferredDragAxis = getPreferredDragAxis(deltaX, deltaY, faceScreenBasis);
  const scopedCandidates = candidates.filter((candidate) => candidate?.dragAxis === preferredDragAxis);
  const candidatesToScore = scopedCandidates.length > 0 ? scopedCandidates : candidates;

  let bestMove: string | null = null;
  let bestScore = 0;

  for (const candidate of candidatesToScore) {
    const candidateLength = Math.hypot(candidate?.screenDelta?.x ?? 0, candidate?.screenDelta?.y ?? 0);
    if (!candidate?.move || candidateLength <= MIN_PROJECTED_AXIS_LENGTH) continue;

    const normalizedCandidate = {
      x: candidate.screenDelta!.x / candidateLength,
      y: candidate.screenDelta!.y / candidateLength,
    };

    const score = (normalizedDrag.x * normalizedCandidate.x) + (normalizedDrag.y * normalizedCandidate.y);
    if (score > bestScore) {
      bestScore = score;
      bestMove = candidate.move;
    }
  }

  return bestMove;
}

function isTypingTarget(target: EventTarget | null): boolean {
  const tagName = (target as HTMLElement | null)?.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA';
}

interface StickerState {
  col: number;
  dragMoveCandidates: DragMoveCandidate[];
  face: FaceName;
  faceScreenBasis: FaceScreenBasis | null;
  index: number;
  row: number;
}

export interface StickerPointerDownInfo extends StickerState {
  clientX: number;
  clientY: number;
  pointerId: number;
}

interface DragState {
  clientX: number;
  clientY: number;
  didDrag: boolean;
  pointerId: number;
  sticker: StickerState;
}

interface UseCubeControlsProps {
  cubeSize: number;
  dispatchManualMove: (move: string) => void;
  manualInputLocked: boolean;
}

export function useCubeControls({ cubeSize, dispatchManualMove, manualInputLocked }: UseCubeControlsProps) {
  const [selectedSticker, setSelectedSticker] = useState<StickerState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const removeDragListenersRef = useRef<() => void>(() => {});

  const clearSelectedSticker = useCallback(() => {
    setSelectedSticker(null);
  }, []);

  const keyMap = useMemo(() => getKeyMap(cubeSize), [cubeSize]);

  const clearDragListeners = useCallback(() => {
    removeDragListenersRef.current();
    removeDragListenersRef.current = () => {};
    if (typeof document !== 'undefined') {
      document.body.style.cursor = '';
    }
  }, []);

  const toggleStickerSelection = useCallback((info: StickerState) => {
    setSelectedSticker((previousSelection) =>
      previousSelection?.face === info.face && previousSelection?.index === info.index
        ? null
        : info
    );
  }, []);

  const handleStickerPointerDown = useCallback((info: StickerPointerDownInfo) => {
    if (manualInputLocked) return;

    clearDragListeners();
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'grabbing';
    }
    dragStateRef.current = {
      clientX: info.clientX,
      clientY: info.clientY,
      didDrag: false,
      pointerId: info.pointerId,
      sticker: {
        col: info.col,
        dragMoveCandidates: info.dragMoveCandidates ?? [],
        face: info.face,
        faceScreenBasis: (info.faceScreenBasis as FaceScreenBasis | null) ?? null,
        index: info.index,
        row: info.row,
      },
    };

    const handleWindowPointerMove = (event: PointerEvent) => {
      const activeDrag = dragStateRef.current;
      if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;

      const deltaX = event.clientX - activeDrag.clientX;
      const deltaY = event.clientY - activeDrag.clientY;

      if (!activeDrag.didDrag && hasExceededDragThreshold(deltaX, deltaY)) {
        activeDrag.didDrag = true;
      }
    };

    const finishPointerGesture = (event: PointerEvent, { cancelled = false } = {}) => {
      const activeDrag = dragStateRef.current;
      if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;

      clearDragListeners();
      dragStateRef.current = null;

      if (cancelled || manualInputLocked) {
        clearSelectedSticker();
        return;
      }

      const deltaX = event.clientX - activeDrag.clientX;
      const deltaY = event.clientY - activeDrag.clientY;
      const dragged = activeDrag.didDrag || hasExceededDragThreshold(deltaX, deltaY);

      if (!dragged) {
        toggleStickerSelection(activeDrag.sticker);
        return;
      }

      const candidateMove = resolveDragMoveFromCandidates(
        deltaX,
        deltaY,
        activeDrag.sticker.dragMoveCandidates,
        activeDrag.sticker.faceScreenBasis,
      );
      const arrowKey = candidateMove
        ? null
        : dragDirectionToArrow(deltaX, deltaY, activeDrag.sticker.faceScreenBasis);
      const move = candidateMove ?? (
        arrowKey
          ? getStickerMove(activeDrag.sticker.face, arrowKey, activeDrag.sticker.row, activeDrag.sticker.col, cubeSize)
          : null
      );

      clearSelectedSticker();

      if (move) {
        dispatchManualMove(move);
      }
    };

    const handleWindowPointerUp = (event: PointerEvent) => {
      finishPointerGesture(event);
    };

    const handleWindowPointerCancel = (event: PointerEvent) => {
      finishPointerGesture(event, { cancelled: true });
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerCancel);

    removeDragListenersRef.current = () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerCancel);
    };
  }, [clearDragListeners, clearSelectedSticker, cubeSize, dispatchManualMove, manualInputLocked, toggleStickerSelection]);

  useEffect(() => () => {
    clearDragListeners();
    dragStateRef.current = null;
    if (typeof document !== 'undefined') {
      document.body.style.cursor = '';
    }
  }, [clearDragListeners]);

  useEffect(() => {
    const handleArrowKey = (event: KeyboardEvent) => {
      if (manualInputLocked || !selectedSticker) return;
      if (isTypingTarget(event.target)) return;
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;

      event.preventDefault();

      const move = getStickerMove(selectedSticker.face, event.key, selectedSticker.row, selectedSticker.col, cubeSize);

      if (move) {
        dispatchManualMove(move);
        setSelectedSticker(null);
      }
    };

    window.addEventListener('keydown', handleArrowKey);
    return () => window.removeEventListener('keydown', handleArrowKey);
  }, [cubeSize, dispatchManualMove, manualInputLocked, selectedSticker]);

  useEffect(() => {
    const handleMoveKey = (event: KeyboardEvent) => {
      if (manualInputLocked || isTypingTarget(event.target)) return;

      const move = (keyMap as Record<string, string>)[event.key];
      if (move) {
        clearSelectedSticker();
        dispatchManualMove(move);
      }
    };

    window.addEventListener('keydown', handleMoveKey);
    return () => window.removeEventListener('keydown', handleMoveKey);
  }, [clearSelectedSticker, dispatchManualMove, keyMap, manualInputLocked]);

  return {
    clearSelectedSticker,
    handleStickerPointerDown,
    selectedSticker,
  };
}
