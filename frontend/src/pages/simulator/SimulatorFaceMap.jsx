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
  if (compact) {
    return size >= 4
      ? { width: 'clamp(0.8rem, 3vw, 0.95rem)', height: 'clamp(0.8rem, 3vw, 0.95rem)' }
      : { width: 'clamp(0.95rem, 4vw, 1.15rem)', height: 'clamp(0.95rem, 4vw, 1.15rem)' };
  }

  return size >= 4
    ? { width: 'clamp(0.95rem, 1vw + 0.5rem, 1.25rem)', height: 'clamp(0.95rem, 1vw + 0.5rem, 1.25rem)' }
    : { width: 'clamp(1.1rem, 1.2vw + 0.6rem, 1.6rem)', height: 'clamp(1.1rem, 1.2vw + 0.6rem, 1.6rem)' };
}

function getGridGap(size, compact) {
  if (compact) {
    return size >= 4 ? '3px' : '4px';
  }

  return size >= 4 ? '4px' : '5px';
}

function FacePreview({ face, label, size, compact = false }) {
  const normalized = normalizeFaceStickers(face, size);
  const faceColors = orientFaceForMap(normalized, label, size);
  const cellStyle = getCellStyle(size, compact);
  const gap = getGridGap(size, compact);

  return (
    <div className={`flex min-w-0 flex-col items-center rounded-2xl border border-dictator-chrome/10 bg-[#111111] shadow-[0_10px_30px_rgba(0,0,0,0.16)] ${
      compact ? 'gap-1.5 px-2.5 py-2.5' : 'gap-2 px-3 py-3.5 sm:px-4 sm:py-4'
    }`}>
      <span className={`font-mono uppercase tracking-[0.22em] text-white ${
        compact ? 'text-[10px]' : 'text-[11px] sm:text-xs'
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
            className="rounded-[4px] border border-black/20"
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
    <div className={`min-w-0 border-t border-dictator-chrome/10 bg-[#0A0A0A] ${
      compact ? 'px-3 py-3' : 'px-4 py-4 sm:px-6 sm:py-5'
    }`}>
      <p className={`font-mono text-[11px] uppercase tracking-widest text-white ${compact ? 'mb-3' : 'mb-4'}`}>
        Face Map
      </p>
      <div className="min-w-0 overflow-x-auto pb-1">
        <div className={`mx-auto w-fit ${
          compact
            ? 'grid grid-cols-2 gap-x-2.5 gap-y-2.5'
            : 'grid min-w-max grid-cols-3 gap-x-3 gap-y-3 max-[359px]:grid-cols-2 max-[359px]:gap-x-2.5 max-[359px]:gap-y-2.5 sm:flex sm:flex-wrap sm:justify-center sm:gap-4 lg:gap-5'
        }`}>
          {FACE_ORDER.map((face) => (
            <FacePreview key={face} face={displayState[face]} label={face} size={cubeSize} compact={compact} />
          ))}
        </div>
      </div>
    </div>
  );
}
