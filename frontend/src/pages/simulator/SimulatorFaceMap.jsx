/**
 * SimulatorFaceMap.jsx — 2D flattened view of all 6 cube faces
 *
 * Shows a grid of colored squares below the 3D cube so the user can see
 * the state of faces that might be hidden by the camera angle.
 * Each face is shown as an NxN grid of sticker colors, labeled U/R/F/D/L/B.
 *
 * This component just reads displayState and renders — no logic, no state.
 */

import { getFaceSize } from '../../cube/cubeModel.js';
import { FACE_ORDER, TOKEN_HEX } from './simulatorConstants';
import { normalizeFaceStickers, orientFaceForMap } from './simulatorFaceMapUtils';

function getCellStyle(size, compact) {
  const vhUnit = size >= 4 ? '1.2vh' : '1.6vh';
  if (compact) {
    return size >= 4
      ? { width: `clamp(0.5rem, min(2.5vw, ${vhUnit}), 0.85rem)`, height: `clamp(0.5rem, min(2.5vw, ${vhUnit}), 0.85rem)` }
      : { width: `clamp(0.6rem, min(3.5vw, ${vhUnit}), 1rem)`, height: `clamp(0.6rem, min(3.5vw, ${vhUnit}), 1rem)` };
  }

  return size >= 4
    ? { width: `clamp(0.5rem, min(0.9vw + 0.4rem, ${vhUnit}), 1.1rem)`, height: `clamp(0.5rem, min(0.9vw + 0.4rem, ${vhUnit}), 1.1rem)` }
    : { width: `clamp(0.6rem, min(1.1vw + 0.5rem, ${vhUnit}), 1.45rem)`, height: `clamp(0.6rem, min(1.1vw + 0.5rem, ${vhUnit}), 1.45rem)` };
}

function getGridGap(size, compact) {
  if (compact) {
    return size >= 4 ? '2px' : '3px';
  }

  return size >= 4 ? 'clamp(2px, 0.4vh, 4px)' : 'clamp(2px, 0.5vh, 5px)';
}

function FacePreview({ face, label, size, compact = false }) {
  const normalized = normalizeFaceStickers(face, size);
  const faceColors = orientFaceForMap(normalized, label, size);
  const cellStyle = getCellStyle(size, compact);
  const gap = getGridGap(size, compact);

  return (
    <div className={`flex min-w-0 flex-col items-center rounded-2xl border border-[--sim-border] bg-[--sim-card] shadow-[0_10px_30px_rgba(0,0,0,0.16)] ${
      compact ? 'gap-1 px-1.5 py-1.5' : 'gap-1 px-2 py-2 sm:px-3 sm:py-2.5'
    }`}>
      <span className={`font-mono uppercase tracking-[0.22em] sim-text ${
        compact ? 'text-[9px]' : 'text-[10px] sm:text-xs'
      }`}>{label}</span>
      <div
        className="grid"
        style={{
          gap,
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        }}
      >
        {faceColors.map((token, index) => (
          <div
            key={`${label}-${index}`}
            className="rounded-[4px] border-2 border-black/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]"
            style={{
              ...cellStyle,
              backgroundColor: TOKEN_HEX[token] ?? '#333',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function SimulatorFaceMap({ displayState, compact = false }) {
  const cubeSize = getFaceSize(displayState) ?? 3;

  return (
    <div className={`z-20 min-w-0 border-t border-[--sim-border] bg-[--sim-panel]/95 backdrop-blur ${
      compact ? 'px-3 py-2' : 'px-4 py-2 sm:px-6 sm:py-2'
    }`} style={{ maxHeight: '30vh' }}>
      <p className={`font-mono text-[11px] uppercase tracking-widest sim-text ${compact ? 'mb-2' : 'mb-2'}`}>
        Face Map
      </p>
      <div
        className={`grid pb-1 ${
          compact
            ? 'grid-cols-3 gap-2 min-[390px]:grid-cols-6'
            : 'grid-cols-6 gap-2 sm:gap-2.5'
        }`}
      >
        {FACE_ORDER.map((face) => (
          <FacePreview key={face} face={displayState[face]} label={face} size={cubeSize} compact={compact} />
        ))}
      </div>
    </div>
  );
}
