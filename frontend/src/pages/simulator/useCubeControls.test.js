import { describe, expect, it } from 'vitest';
import {
  DRAG_THRESHOLD_PX,
  dragDirectionToArrow,
  getStickerMove,
  hasExceededDragThreshold,
  resolveDragMoveFromCandidates,
} from './useCubeControls';

describe('useCubeControls drag helpers', () => {
  it('maps dominant drag direction to arrow keys', () => {
    expect(dragDirectionToArrow(20, 4)).toBe('ArrowRight');
    expect(dragDirectionToArrow(-20, 4)).toBe('ArrowLeft');
    expect(dragDirectionToArrow(4, 20)).toBe('ArrowDown');
    expect(dragDirectionToArrow(4, -20)).toBe('ArrowUp');
  });

  it('prefers horizontal movement when deltas tie', () => {
    expect(dragDirectionToArrow(18, 18)).toBe('ArrowRight');
    expect(dragDirectionToArrow(-18, 18)).toBe('ArrowLeft');
  });

  it('resolves drag direction against the sticker orientation when provided', () => {
    const rotatedFaceBasis = {
      right: { x: 0.8, y: 0.6 },
      up: { x: -0.6, y: 0.8 },
    };

    expect(dragDirectionToArrow(24, 18, rotatedFaceBasis)).toBe('ArrowRight');
    expect(dragDirectionToArrow(-24, -18, rotatedFaceBasis)).toBe('ArrowLeft');
    expect(dragDirectionToArrow(-18, 24, rotatedFaceBasis)).toBe('ArrowUp');
    expect(dragDirectionToArrow(18, -24, rotatedFaceBasis)).toBe('ArrowDown');
  });

  it('falls back to screen-aligned drag mapping if the projected basis is unusable', () => {
    expect(dragDirectionToArrow(5, -20, {
      right: { x: 0, y: 0 },
      up: { x: 0, y: 0 },
    })).toBe('ArrowUp');
  });

  it('chooses the candidate move whose projected motion best matches the swipe', () => {
    const candidates = [
      { move: 'S', dragAxis: 'horizontal', screenDelta: { x: 18, y: 0 } },
      { move: 'R', dragAxis: 'vertical', screenDelta: { x: 0, y: 18 } },
    ];

    expect(resolveDragMoveFromCandidates(1, 24, candidates)).toBe('R');
    expect(resolveDragMoveFromCandidates(24, 1, candidates)).toBe('S');
  });

  it('locks drag resolution to the swipe axis before picking move direction', () => {
    const topFaceBasis = {
      right: { x: 1, y: 0 },
      up: { x: 0, y: -1 },
    };
    const candidates = [
      { move: 'S', dragAxis: 'horizontal', screenDelta: { x: 2, y: 50 } },
      { move: "R'", dragAxis: 'vertical', screenDelta: { x: -20, y: 40 } },
    ];

    expect(resolveDragMoveFromCandidates(0, 24, candidates, topFaceBasis)).toBe("R'");
    expect(resolveDragMoveFromCandidates(24, 0, candidates, topFaceBasis)).toBe('S');
  });

  it('ignores empty or opposite-facing candidate motion', () => {
    expect(resolveDragMoveFromCandidates(0, 20, [])).toBe(null);
    expect(resolveDragMoveFromCandidates(0, 20, [
      { move: 'R', dragAxis: 'vertical', screenDelta: { x: 0, y: -18 } },
    ])).toBe(null);
  });

  it('maps U and D drag directions to the slice that contains the grabbed sticker', () => {
    expect(getStickerMove('U', 'ArrowDown', 1, 2, 3)).toBe("R'");
    expect(getStickerMove('U', 'ArrowRight', 1, 1, 3)).toBe('S');
    expect(getStickerMove('D', 'ArrowDown', 1, 2, 3)).toBe('R');
    expect(getStickerMove('D', 'ArrowRight', 1, 1, 3)).toBe("S'");
  });

  it('uses a strict drag threshold so taps remain taps', () => {
    expect(hasExceededDragThreshold(0, 0)).toBe(false);
    expect(hasExceededDragThreshold(DRAG_THRESHOLD_PX, 0)).toBe(false);
    expect(hasExceededDragThreshold(DRAG_THRESHOLD_PX + 1, 0)).toBe(true);
    expect(hasExceededDragThreshold(12, 10)).toBe(true);
  });
});
