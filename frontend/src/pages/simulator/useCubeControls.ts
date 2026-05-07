/**
 * useCubeControls.js — React hook for keyboard and mouse cube interaction
 *
 * This hook gives the user two ways to make moves:
 *
 *   1. KEYBOARD SHORTCUT MOVES (e.g. press 'r' for R, 'R' for R')
 *      The KEY_MAP in simulatorConstants.js maps lowercase/uppercase letters to moves.
 *      When a mapped key is pressed, the move fires immediately.
 *
 *   2. MOUSE + ARROW KEY MOVES (click a sticker, then press an arrow key)
 *      The user clicks a sticker on the 3D cube to select it (it highlights pink).
 *      Then they press an arrow key to choose the direction of the turn.
 *      getStickerMove() figures out which move corresponds to that face + direction.
 *      For example: click the front-center sticker → press ArrowUp → triggers L' move
 *      (because pushing the front face "up" means rotating the left column upward).
 *      On 4x4 cubes, clicking an inner sticker can trigger lowercase inner-slice
 *      moves like r or u instead of only the outer face turns.
 *
 * The hook returns:
 *   - handleStickerPointerDown(info) → call this when a sticker pointer-down starts on the 3D cube
 *   - selectedSticker             → which sticker is currently highlighted (or null)
 *   - clearSelectedSticker()      → deselect (used when scramble/solve starts)
 *
 * When manualInputLocked is true (an animation is playing), all input is ignored
 * so the user can't queue moves while the cube is mid-turn.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getKeyMap } from './simulatorConstants';

export const DRAG_THRESHOLD_PX = 15;
const MIN_PROJECTED_AXIS_LENGTH = 0.0001;

function buildMoveTrack(
  size,
  { outerMin, middle = null, innerMin = null, innerMax = null, outerMax },
) {
  const track = Array.from({ length: size }, () => null);
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

export function getStickerMove(face, arrowKey, row, col, size) {
  const columnTrack = (track) => buildMoveTrack(size, track)[col] ?? null;
  const rowTrack = (track) => buildMoveTrack(size, track)[row] ?? null;

  const moveMap = {
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

function normalizeScreenVector(vector) {
  const length = Math.hypot(vector?.x ?? 0, vector?.y ?? 0);
  if (length <= MIN_PROJECTED_AXIS_LENGTH) {
    return null;
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function screenAlignedDragDirectionToArrow(deltaX, deltaY) {
  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    if (deltaX === 0) {
      return deltaY > 0 ? 'ArrowDown' : deltaY < 0 ? 'ArrowUp' : null;
    }
    return deltaX > 0 ? 'ArrowRight' : 'ArrowLeft';
  }

  if (deltaY === 0) {
    return null;
  }

  return deltaY > 0 ? 'ArrowDown' : 'ArrowUp';
}

function getPreferredDragAxis(deltaX, deltaY, faceScreenBasis = null) {
  const normalizedRight = normalizeScreenVector(faceScreenBasis?.right);
  const normalizedUp = normalizeScreenVector(faceScreenBasis?.up);

  if (!normalizedRight || !normalizedUp) {
    return Math.abs(deltaX) >= Math.abs(deltaY) ? 'horizontal' : 'vertical';
  }

  const horizontalProjection = (deltaX * normalizedRight.x) + (deltaY * normalizedRight.y);
  const verticalProjection = (deltaX * normalizedUp.x) + (deltaY * normalizedUp.y);

  return Math.abs(horizontalProjection) >= Math.abs(verticalProjection)
    ? 'horizontal'
    : 'vertical';
}

export function dragDirectionToArrow(deltaX, deltaY, faceScreenBasis = null) {
  const normalizedRight = normalizeScreenVector(faceScreenBasis?.right);
  const normalizedUp = normalizeScreenVector(faceScreenBasis?.up);

  if (!normalizedRight || !normalizedUp) {
    return screenAlignedDragDirectionToArrow(deltaX, deltaY);
  }

  const horizontalProjection = (deltaX * normalizedRight.x) + (deltaY * normalizedRight.y);
  const verticalProjection = (deltaX * normalizedUp.x) + (deltaY * normalizedUp.y);

  if (Math.abs(horizontalProjection) >= Math.abs(verticalProjection)) {
    if (horizontalProjection === 0) {
      return verticalProjection > 0 ? 'ArrowUp' : verticalProjection < 0 ? 'ArrowDown' : null;
    }

    return horizontalProjection > 0 ? 'ArrowRight' : 'ArrowLeft';
  }

  if (verticalProjection === 0) {
    return null;
  }

  return verticalProjection > 0 ? 'ArrowUp' : 'ArrowDown';
}

export function hasExceededDragThreshold(deltaX, deltaY, threshold = DRAG_THRESHOLD_PX) {
  return Math.hypot(deltaX, deltaY) > threshold;
}

export function resolveDragMoveFromCandidates(deltaX, deltaY, candidates = [], faceScreenBasis = null) {
  const dragLength = Math.hypot(deltaX, deltaY);
  if (dragLength <= MIN_PROJECTED_AXIS_LENGTH) {
    return null;
  }

  const normalizedDrag = {
    x: deltaX / dragLength,
    y: deltaY / dragLength,
  };

  const preferredDragAxis = getPreferredDragAxis(deltaX, deltaY, faceScreenBasis);
  const scopedCandidates = candidates.filter((candidate) => candidate?.dragAxis === preferredDragAxis);
  const candidatesToScore = scopedCandidates.length > 0 ? scopedCandidates : candidates;

  let bestMove = null;
  let bestScore = 0;

  for (const candidate of candidatesToScore) {
    const candidateLength = Math.hypot(candidate?.screenDelta?.x ?? 0, candidate?.screenDelta?.y ?? 0);
    if (!candidate?.move || candidateLength <= MIN_PROJECTED_AXIS_LENGTH) {
      continue;
    }

    const normalizedCandidate = {
      x: candidate.screenDelta.x / candidateLength,
      y: candidate.screenDelta.y / candidateLength,
    };

    const score = (normalizedDrag.x * normalizedCandidate.x) + (normalizedDrag.y * normalizedCandidate.y);
    if (score > bestScore) {
      bestScore = score;
      bestMove = candidate.move;
    }
  }

  return bestMove;
}

function isTypingTarget(target) {
  const tagName = target?.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA';
}

export function useCubeControls({ cubeSize, dispatchManualMove, manualInputLocked }) {
  const [selectedSticker, setSelectedSticker] = useState(null);
  const dragStateRef = useRef(null);
  const removeDragListenersRef = useRef(() => { });

  const clearSelectedSticker = useCallback(() => {
    setSelectedSticker(null);
  }, []);

  const keyMap = useMemo(() => getKeyMap(cubeSize), [cubeSize]);

  const clearDragListeners = useCallback(() => {
    removeDragListenersRef.current();
    removeDragListenersRef.current = () => { };
    if (typeof document !== 'undefined') {
      document.body.style.cursor = '';
    }
  }, []);

  const toggleStickerSelection = useCallback((info) => {
    setSelectedSticker((previousSelection) =>
      previousSelection?.face === info.face && previousSelection?.index === info.index
        ? null
        : info
    );
  }, []);

  const handleStickerPointerDown = useCallback((info) => {
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
        faceScreenBasis: info.faceScreenBasis ?? null,
        index: info.index,
        row: info.row,
      },
    };

    const handleWindowPointerMove = (event) => {
      const activeDrag = dragStateRef.current;
      if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;

      const deltaX = event.clientX - activeDrag.clientX;
      const deltaY = event.clientY - activeDrag.clientY;

      if (!activeDrag.didDrag && hasExceededDragThreshold(deltaX, deltaY)) {
        activeDrag.didDrag = true;
      }
    };

    const finishPointerGesture = (event, { cancelled = false } = {}) => {
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
          ? getStickerMove(
            activeDrag.sticker.face,
            arrowKey,
            activeDrag.sticker.row,
            activeDrag.sticker.col,
            cubeSize,
          )
          : null
      );

      clearSelectedSticker();

      if (move) {
        dispatchManualMove(move);
      }
    };

    const handleWindowPointerUp = (event) => {
      finishPointerGesture(event);
    };

    const handleWindowPointerCancel = (event) => {
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
    const handleArrowKey = (event) => {
      if (manualInputLocked || !selectedSticker) return;
      if (isTypingTarget(event.target)) return;
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;

      event.preventDefault();

      const move = getStickerMove(
        selectedSticker.face,
        event.key,
        selectedSticker.row,
        selectedSticker.col,
        cubeSize,
      );

      if (move) {
        dispatchManualMove(move);
        setSelectedSticker(null);
      }
    };

    window.addEventListener('keydown', handleArrowKey);
    return () => window.removeEventListener('keydown', handleArrowKey);
  }, [cubeSize, dispatchManualMove, manualInputLocked, selectedSticker]);

  useEffect(() => {
    const handleMoveKey = (event) => {
      if (manualInputLocked || isTypingTarget(event.target)) return;

      const move = keyMap[event.key];
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
