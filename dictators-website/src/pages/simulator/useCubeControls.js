import { useCallback, useEffect, useState } from 'react';
import { KEY_MAP } from './simulatorConstants';

function getStickerMove(face, arrowKey, row, col) {
  const moveMap = {
    F: { ArrowUp: ["L'", "M'", 'R'][col], ArrowDown: ['L', 'M', "R'"][col], ArrowLeft: ['U', "E'", "D'"][row], ArrowRight: ["U'", 'E', 'D'][row] },
    B: { ArrowUp: ["R'", 'M', 'L'][col], ArrowDown: ['R', "M'", "L'"][col], ArrowLeft: ['U', "E'", "D'"][row], ArrowRight: ["U'", 'E', 'D'][row] },
    R: { ArrowUp: ["F'", "S'", 'B'][col], ArrowDown: ['F', 'S', "B'"][col], ArrowLeft: ['U', "E'", "D'"][row], ArrowRight: ["U'", 'E', 'D'][row] },
    L: { ArrowUp: ["B'", 'S', 'F'][col], ArrowDown: ['B', "S'", "F'"][col], ArrowLeft: ['U', "E'", "D'"][row], ArrowRight: ["U'", 'E', 'D'][row] },
    U: { ArrowUp: ["F'", "S'", 'B'][row], ArrowDown: ['F', 'S', "B'"][row], ArrowLeft: ["L'", "M'", 'R'][col], ArrowRight: ['L', 'M', "R'"][col] },
    D: { ArrowUp: ["B'", 'S', 'F'][row], ArrowDown: ['B', "S'", "F'"][row], ArrowLeft: ['L', 'M', "R'"][col], ArrowRight: ["L'", "M'", 'R'][col] },
  };

  return moveMap[face]?.[arrowKey] ?? null;
}

function isTypingTarget(target) {
  const tagName = target?.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA';
}

export function useCubeControls({ dispatchManualMove, manualInputLocked }) {
  const [selectedSticker, setSelectedSticker] = useState(null);
  const clearSelectedSticker = useCallback(() => {
    setSelectedSticker(null);
  }, []);

  useEffect(() => {
    if (manualInputLocked) {
      clearSelectedSticker();
    }
  }, [clearSelectedSticker, manualInputLocked]);

  const handleStickerSelect = useCallback((info) => {
    if (manualInputLocked) return;

    setSelectedSticker((previousSelection) =>
      previousSelection?.face === info.face && previousSelection?.index === info.index
        ? null
        : info
    );
  }, [manualInputLocked]);

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
      );

      if (move) {
        dispatchManualMove(move);
        setSelectedSticker(null);
      }
    };

    window.addEventListener('keydown', handleArrowKey);
    return () => window.removeEventListener('keydown', handleArrowKey);
  }, [dispatchManualMove, manualInputLocked, selectedSticker]);

  useEffect(() => {
    const handleMoveKey = (event) => {
      if (manualInputLocked || isTypingTarget(event.target)) return;

      const move = KEY_MAP[event.key];
      if (move) {
        dispatchManualMove(move);
      }
    };

    window.addEventListener('keydown', handleMoveKey);
    return () => window.removeEventListener('keydown', handleMoveKey);
  }, [dispatchManualMove, manualInputLocked]);

  return {
    clearSelectedSticker,
    handleStickerSelect,
    selectedSticker,
  };
}
