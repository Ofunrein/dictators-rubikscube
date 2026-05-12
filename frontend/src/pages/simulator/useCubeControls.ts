/**
 * useCubeControls.ts — React hook for keyboard and mouse cube interaction
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getKeyMap } from './simulatorConstants';
import type { FaceName } from '../../cube/cubeModel';

// 15 px is enough to distinguish an intentional swipe from a tap/jitter on both
// mouse and touch, without being so large that short drags get ignored.
export const DRAG_THRESHOLD_PX = 15;
// Any projected length shorter than this is treated as zero to guard against
// divide-by-near-zero when normalizing screen-space vectors.
const MIN_PROJECTED_AXIS_LENGTH = 0.0001;

interface TrackOptions {
  outerMin: string | null;
  middle?: string | null;
  innerMin?: string | null;
  innerMax?: string | null;
  outerMax: string | null;
}

// Maps a layer index (0…size-1) to a move string.
// The face outer layers are always at index 0 and size-1; inner layers and the
// middle slice sit in between, so the track positions depend on cube size.
function buildMoveTrack(size: number, { outerMin, middle = null, innerMin = null, innerMax = null, outerMax }: TrackOptions): (string | null)[] {
  const track: (string | null)[] = Array.from({ length: size }, () => null);
  track[0] = outerMin;
  track[size - 1] = outerMax;

  // 4×4 has two inner layers (indices 1 and 2) but no true middle slice.
  if (size === 4) {
    track[1] = innerMin;
    track[2] = innerMax;
    return track;
  }

  // Odd-sized cubes (3×3, 5×5…) have a single centre layer; place the slice
  // move there so dragging through the middle fires M/E/S correctly.
  if (size % 2 === 1) {
    track[Math.floor(size / 2)] = middle;
  }

  return track;
}

// Given which sticker was hit (face + row/col) and which arrow direction was
// detected, returns the WCA move notation that should execute.
// The mapping is derived from the physical geometry: dragging left on the Front
// face's top row moves U because that row belongs to the U-D belt of layers.
export function getStickerMove(face: string, arrowKey: string, row: number, col: number, size: number): string | null {
  // columnTrack picks the move at this sticker's column — vertical drags slide
  // the column's layer through the cube along a left-right axis (L/R/M/r/l…).
  const columnTrack = (track: TrackOptions) => buildMoveTrack(size, track)[col] ?? null;
  // rowTrack picks the move at this sticker's row — horizontal drags slide the
  // row's layer through the cube along an up-down axis (U/D/E/u/d…).
  const rowTrack = (track: TrackOptions) => buildMoveTrack(size, track)[row] ?? null;

  const moveMap: Record<string, Record<string, string | null>> = {
    // Front face (Z+ in standard cube orientation, looking toward the solver).
    // ArrowUp on a column → that column rotates toward the top, which is an L'
    // at col 0 or R at the last col (right-hand rule: L' and R both rotate their
    // respective layers upward when viewed from the front).
    F: {
      ArrowUp: columnTrack({ outerMin: "L'", innerMin: "l'", middle: "M'", innerMax: 'r', outerMax: 'R' }),
      ArrowDown: columnTrack({ outerMin: 'L', innerMin: 'l', middle: 'M', innerMax: "r'", outerMax: "R'" }),
      // ArrowLeft on a row → the row slides left, which is a U rotation at row 0
      // (top row goes with U), or D' at the bottom row.
      ArrowLeft: rowTrack({ outerMin: 'U', innerMin: 'u', middle: "E'", innerMax: "d'", outerMax: "D'" }),
      ArrowRight: rowTrack({ outerMin: "U'", innerMin: "u'", middle: 'E', innerMax: 'd', outerMax: 'D' }),
    },
    // Back face is viewed from behind, so left/right are mirrored compared to
    // Front — column 0 on B is physically the rightmost column from the front.
    // That's why col 0 maps to R' (not L') and the primes are inverted.
    B: {
      ArrowUp: columnTrack({ outerMin: "R'", innerMin: "r'", middle: 'M', innerMax: 'l', outerMax: 'L' }),
      ArrowDown: columnTrack({ outerMin: 'R', innerMin: 'r', middle: "M'", innerMax: "l'", outerMax: "L'" }),
      // Horizontal drags on B rows still map to U/D because those layers are
      // the same physical rings; the direction conventions stay identical.
      ArrowLeft: rowTrack({ outerMin: 'U', innerMin: 'u', middle: "E'", innerMax: "d'", outerMax: "D'" }),
      ArrowRight: rowTrack({ outerMin: "U'", innerMin: "u'", middle: 'E', innerMax: 'd', outerMax: 'D' }),
    },
    // Right face: vertical drags shift the column through the F-B belt.
    // col 0 is the front-most column (maps to F'), col last is the back (maps to B).
    R: {
      ArrowUp: columnTrack({ outerMin: "F'", innerMin: "f'", middle: "S'", innerMax: 'b', outerMax: 'B' }),
      ArrowDown: columnTrack({ outerMin: 'F', innerMin: 'f', middle: 'S', innerMax: "b'", outerMax: "B'" }),
      ArrowLeft: rowTrack({ outerMin: 'U', innerMin: 'u', middle: "E'", innerMax: "d'", outerMax: "D'" }),
      ArrowRight: rowTrack({ outerMin: "U'", innerMin: "u'", middle: 'E', innerMax: 'd', outerMax: 'D' }),
    },
    // Left face: mirror of Right — col 0 is the back-most column from Left's
    // perspective, so it maps to B' rather than F'.
    L: {
      ArrowUp: columnTrack({ outerMin: "B'", innerMin: "b'", middle: 'S', innerMax: 'f', outerMax: 'F' }),
      ArrowDown: columnTrack({ outerMin: 'B', innerMin: 'b', middle: "S'", innerMax: "f'", outerMax: "F'" }),
      ArrowLeft: rowTrack({ outerMin: 'U', innerMin: 'u', middle: "E'", innerMax: "d'", outerMax: "D'" }),
      ArrowRight: rowTrack({ outerMin: "U'", innerMin: "u'", middle: 'E', innerMax: 'd', outerMax: 'D' }),
    },
    // Up face: looking down from above. Vertical drags (ArrowUp/Down on screen)
    // correspond to moving rows that belong to the L/R/M belt.
    // Horizontal drags correspond to moving columns that belong to the F/B/S belt.
    U: {
      ArrowUp: columnTrack({ outerMin: "L'", innerMin: "l'", middle: "M'", innerMax: 'r', outerMax: 'R' }),
      ArrowDown: columnTrack({ outerMin: 'L', innerMin: 'l', middle: 'M', innerMax: "r'", outerMax: "R'" }),
      ArrowLeft: rowTrack({ outerMin: "F'", innerMin: "f'", middle: "S'", innerMax: 'b', outerMax: 'B' }),
      ArrowRight: rowTrack({ outerMin: 'F', innerMin: 'f', middle: 'S', innerMax: "b'", outerMax: "B'" }),
    },
    // Down face: U's conventions are flipped because the face is seen upside-down
    // relative to Up — ArrowUp here rotates L inward (not outward).
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

// The 3D face axes projected onto screen space: `right` is the screen-space
// direction of the face's local +X axis, `up` is its local +Y axis.
// These are computed from the 3D renderer and passed in so this hook stays
// renderer-agnostic while still understanding the cube's perspective projection.
export interface ScreenBasis {
  right: Vec2;
  up: Vec2;
}

interface FaceScreenBasis { right?: Vec2; up?: Vec2 }

// Returns a unit vector, or null if the input is too short to be meaningful.
// Normalizing before dot-product comparisons ensures direction comparison is
// length-independent — we care about alignment, not magnitude.
function normalizeScreenVector(vector: Vec2 | null | undefined): Vec2 | null {
  const length = Math.hypot(vector?.x ?? 0, vector?.y ?? 0);
  if (length <= MIN_PROJECTED_AXIS_LENGTH) return null;
  return { x: vector!.x / length, y: vector!.y / length };
}

// Fallback used when no 3D screen-basis is available (e.g. flat/orthographic view).
// Picks the arrow whose screen axis has the larger component in the drag delta.
function screenAlignedDragDirectionToArrow(deltaX: number, deltaY: number): string | null {
  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    if (deltaX === 0) return deltaY > 0 ? 'ArrowDown' : deltaY < 0 ? 'ArrowUp' : null;
    return deltaX > 0 ? 'ArrowRight' : 'ArrowLeft';
  }
  if (deltaY === 0) return null;
  return deltaY > 0 ? 'ArrowDown' : 'ArrowUp';
}

// Projects the drag vector onto each face axis and returns which axis it aligns
// with more strongly. This is dot product geometry: the larger projection tells
// us whether the user intended to move along the face's local horizontal or
// vertical direction rather than screen horizontal/vertical.
function getPreferredDragAxis(deltaX: number, deltaY: number, faceScreenBasis: FaceScreenBasis | null = null): 'horizontal' | 'vertical' {
  const normalizedRight = normalizeScreenVector(faceScreenBasis?.right);
  const normalizedUp = normalizeScreenVector(faceScreenBasis?.up);

  // Without a valid basis fall back to raw screen axes — axes are aligned with
  // the viewport so the dot product simplifies to comparing |deltaX| vs |deltaY|.
  if (!normalizedRight || !normalizedUp) {
    return Math.abs(deltaX) >= Math.abs(deltaY) ? 'horizontal' : 'vertical';
  }

  // dot(drag, right) > dot(drag, up) means the drag is more along the face's
  // horizontal axis than its vertical axis in projected screen space.
  const horizontalProjection = (deltaX * normalizedRight.x) + (deltaY * normalizedRight.y);
  const verticalProjection = (deltaX * normalizedUp.x) + (deltaY * normalizedUp.y);

  return Math.abs(horizontalProjection) >= Math.abs(verticalProjection) ? 'horizontal' : 'vertical';
}

// Converts a raw screen drag delta into an arrow key direction, accounting for
// the face's perspective projection so a diagonal face still feels natural to drag.
// Without the screen basis, a tilted face would require the user to drag at the
// wrong screen angle to hit the intended move.
export function dragDirectionToArrow(deltaX: number, deltaY: number, faceScreenBasis: FaceScreenBasis | null = null): string | null {
  const normalizedRight = normalizeScreenVector(faceScreenBasis?.right);
  const normalizedUp = normalizeScreenVector(faceScreenBasis?.up);

  if (!normalizedRight || !normalizedUp) return screenAlignedDragDirectionToArrow(deltaX, deltaY);

  // Project onto each face axis to get a signed magnitude along that direction.
  const horizontalProjection = (deltaX * normalizedRight.x) + (deltaY * normalizedRight.y);
  const verticalProjection = (deltaX * normalizedUp.x) + (deltaY * normalizedUp.y);

  // Pick the dominant axis first, then use the sign of its projection to choose
  // the arrow direction. The up axis uses screen-Y convention: positive Y is down
  // on screen, but positive up-projection means upward on the face, so the sign
  // maps to ArrowUp when positive.
  if (Math.abs(horizontalProjection) >= Math.abs(verticalProjection)) {
    if (horizontalProjection === 0) return verticalProjection > 0 ? 'ArrowUp' : verticalProjection < 0 ? 'ArrowDown' : null;
    return horizontalProjection > 0 ? 'ArrowRight' : 'ArrowLeft';
  }

  if (verticalProjection === 0) return null;
  return verticalProjection > 0 ? 'ArrowUp' : 'ArrowDown';
}

// Using Euclidean distance (not separate axis thresholds) so diagonal drags
// are treated the same as pure horizontal/vertical ones — avoids a dead-zone
// artifact at 45° where neither axis alone clears its threshold.
export function hasExceededDragThreshold(deltaX: number, deltaY: number, threshold: number = DRAG_THRESHOLD_PX): boolean {
  return Math.hypot(deltaX, deltaY) > threshold;
}

interface Candidate {
  dragAxis?: string;
  move?: string;
  screenDelta?: Vec2;
}

// Picks the best move from a pre-computed list of candidates (provided by the
// 3D renderer, which knows the exact projected edge directions) rather than
// re-deriving the move purely from face/row/col.  This gives sub-pixel accuracy
// when multiple layers are near the drag boundary.
export function resolveDragMoveFromCandidates(deltaX: number, deltaY: number, candidates: Candidate[] = [], faceScreenBasis: FaceScreenBasis | null = null): string | null {
  const dragLength = Math.hypot(deltaX, deltaY);
  if (dragLength <= MIN_PROJECTED_AXIS_LENGTH) return null;

  const normalizedDrag = { x: deltaX / dragLength, y: deltaY / dragLength };
  const preferredDragAxis = getPreferredDragAxis(deltaX, deltaY, faceScreenBasis);
  // Narrow candidates to those on the preferred axis first.  If none match we
  // fall back to all candidates rather than returning nothing — a graceful
  // degradation when the renderer didn't tag candidates with an axis.
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

    // Dot product of two unit vectors = cosine of the angle between them.
    // The candidate whose screen-space direction is most aligned with the drag
    // wins — score of 1 means perfectly aligned, 0 means perpendicular, negative
    // means opposite direction (those are never chosen because bestScore starts at 0).
    const score = (normalizedDrag.x * normalizedCandidate.x) + (normalizedDrag.y * normalizedCandidate.y);
    if (score > bestScore) {
      bestScore = score;
      bestMove = candidate.move;
    }
  }

  return bestMove;
}

// Prevents arrow-key move events from firing while the user types in a text
// field — without this check, typing "up" in an input would rotate the cube.
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
  // Sticker selection is React state (not a ref) because the UI needs to
  // re-render the highlight whenever the selection changes.
  const [selectedSticker, setSelectedSticker] = useState<StickerState | null>(null);
  // Drag state lives in a ref, not useState, because we only need it inside
  // imperative pointer-event callbacks — React re-renders would be wasted work
  // and could introduce stale-closure bugs mid-gesture.
  const dragStateRef = useRef<DragState | null>(null);
  // The remove-listeners function is stored in a ref so clearDragListeners can
  // call whatever the current registered cleanup is without holding stale
  // references in closures.
  const removeDragListenersRef = useRef<() => void>(() => {});

  const clearSelectedSticker = useCallback(() => {
    setSelectedSticker(null);
  }, []);

  // Re-computed only when cube size changes; avoids reconstructing the map
  // on every keystroke which would be especially wasteful on large cubes.
  const keyMap = useMemo(() => getKeyMap(cubeSize), [cubeSize]);

  const clearDragListeners = useCallback(() => {
    removeDragListenersRef.current();
    // Reset to a no-op so a double-call doesn't remove listeners that were
    // registered by a subsequent gesture.
    removeDragListenersRef.current = () => {};
    if (typeof document !== 'undefined') {
      document.body.style.cursor = '';
    }
  }, []);

  // Toggle: tapping the same sticker twice deselects it, which lets the user
  // dismiss the selection without clicking away to empty space.
  const toggleStickerSelection = useCallback((info: StickerState) => {
    setSelectedSticker((previousSelection) =>
      previousSelection?.face === info.face && previousSelection?.index === info.index
        ? null
        : info
    );
  }, []);

  const handleStickerPointerDown = useCallback((info: StickerPointerDownInfo) => {
    if (manualInputLocked) return;

    // Cancel any in-flight drag before starting a new one — prevents a second
    // finger or a rapid re-press from leaving orphan listeners on the window.
    clearDragListeners();
    if (typeof document !== 'undefined') {
      // Grabbing cursor gives instant visual feedback that a drag has started,
      // even before the pointer moves past the threshold.
      document.body.style.cursor = 'grabbing';
    }
    dragStateRef.current = {
      clientX: info.clientX,
      clientY: info.clientY,
      // didDrag starts false; it flips to true once the threshold is exceeded
      // so the pointer-up handler knows whether to treat this as a tap or drag.
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
      // Guard against multi-touch: only track the pointer that started this drag.
      if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;

      const deltaX = event.clientX - activeDrag.clientX;
      const deltaY = event.clientY - activeDrag.clientY;

      // Set didDrag eagerly on move rather than waiting for pointerup; this way
      // even a fast flick that ends before the next event loop still registers
      // as a drag when the final delta is computed on pointerup.
      if (!activeDrag.didDrag && hasExceededDragThreshold(deltaX, deltaY)) {
        activeDrag.didDrag = true;
      }
    };

    const finishPointerGesture = (event: PointerEvent, { cancelled = false } = {}) => {
      const activeDrag = dragStateRef.current;
      if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;

      // Remove listeners before any async state updates so a rapid second gesture
      // can't race with cleanup and attach duplicate listeners.
      clearDragListeners();
      dragStateRef.current = null;

      // pointercancel fires when the browser takes over the pointer (e.g. scroll
      // gesture, pinch-zoom, or system gesture) — treat it as an abort so the
      // cube doesn't execute a spurious move.
      if (cancelled || manualInputLocked) {
        clearSelectedSticker();
        return;
      }

      const deltaX = event.clientX - activeDrag.clientX;
      const deltaY = event.clientY - activeDrag.clientY;
      // Re-check threshold at pointer-up to catch fast flicks where didDrag
      // was never set during move events (e.g. if pointermove fired only once).
      const dragged = activeDrag.didDrag || hasExceededDragThreshold(deltaX, deltaY);

      if (!dragged) {
        // Short press without movement → selection toggle, not a move.
        toggleStickerSelection(activeDrag.sticker);
        return;
      }

      // Try candidates first (they carry exact projected edge directions from the
      // renderer); fall through to the generic face/row/col lookup only if the
      // renderer provided no candidates for this sticker.
      const candidateMove = resolveDragMoveFromCandidates(
        deltaX,
        deltaY,
        activeDrag.sticker.dragMoveCandidates,
        activeDrag.sticker.faceScreenBasis,
      );
      const arrowKey = candidateMove
        ? null
        // Only run the arrow computation when candidates gave nothing — avoids
        // producing a second move that disagrees with the candidate result.
        : dragDirectionToArrow(deltaX, deltaY, activeDrag.sticker.faceScreenBasis);
      const move = candidateMove ?? (
        arrowKey
          ? getStickerMove(activeDrag.sticker.face, arrowKey, activeDrag.sticker.row, activeDrag.sticker.col, cubeSize)
          : null
      );

      // Deselect regardless of whether a move was found — dragging always ends
      // the sticker-selection mode to avoid a confusing "still selected" state.
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

    // Listeners are on window (not the sticker element) so the drag continues
    // to be tracked even when the pointer leaves the sticker or the cube entirely.
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerCancel);

    // Store the cleanup so clearDragListeners can remove exactly these three
    // listeners — using a closure ensures we hold references to the exact
    // same function objects that were passed to addEventListener.
    removeDragListenersRef.current = () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerCancel);
    };
  }, [clearDragListeners, clearSelectedSticker, cubeSize, dispatchManualMove, manualInputLocked, toggleStickerSelection]);

  // Component unmount cleanup: if the user navigates away mid-drag, remove the
  // window listeners and restore the cursor so no ghost state bleeds into other pages.
  useEffect(() => () => {
    clearDragListeners();
    dragStateRef.current = null;
    if (typeof document !== 'undefined') {
      document.body.style.cursor = '';
    }
  }, [clearDragListeners]);

  // Arrow-key handler only fires when a sticker is selected; separating it from
  // the global move-key handler below lets the two effects have different
  // dependency arrays and avoids re-subscribing both on every keystroke.
  useEffect(() => {
    const handleArrowKey = (event: KeyboardEvent) => {
      if (manualInputLocked || !selectedSticker) return;
      if (isTypingTarget(event.target)) return;
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;

      // Prevent the browser from scrolling the page when arrow keys are used
      // to control the cube — without this, every move also scrolls.
      event.preventDefault();

      const move = getStickerMove(selectedSticker.face, event.key, selectedSticker.row, selectedSticker.col, cubeSize);

      if (move) {
        dispatchManualMove(move);
        // Clear selection after the move so the next arrow key acts on the
        // whole cube via the letter-key handler rather than the same sticker.
        setSelectedSticker(null);
      }
    };

    window.addEventListener('keydown', handleArrowKey);
    return () => window.removeEventListener('keydown', handleArrowKey);
    // selectedSticker in the dep array means this re-subscribes whenever the
    // selection changes; that's intentional — the handler closure must capture
    // the latest selectedSticker or it would reference stale row/col/face data.
  }, [cubeSize, dispatchManualMove, manualInputLocked, selectedSticker]);

  // Global move-key handler: fires on letter keys (u/U/r/R etc.) regardless of
  // sticker selection — mirrors standard speedcubing timer notation.
  useEffect(() => {
    const handleMoveKey = (event: KeyboardEvent) => {
      if (manualInputLocked || isTypingTarget(event.target)) return;

      const move = (keyMap as Record<string, string>)[event.key];
      if (move) {
        // A letter-key move implicitly cancels any sticker selection because
        // mixing the two input modes simultaneously would be confusing.
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
