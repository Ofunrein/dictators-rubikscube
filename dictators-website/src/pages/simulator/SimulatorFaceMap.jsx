/**
 * SimulatorFaceMap.jsx — 2D flattened view of all 6 cube faces
 *
 * Shows a grid of colored squares below the 3D cube so the user can see
 * the state of faces that might be hidden by the camera angle.
 * Each face is a 3x3 grid of sticker colors, labeled U/R/F/D/L/B.
 *
 * This component just reads displayState and renders — no logic, no state.
 */

import { FACE_ORDER, TOKEN_HEX } from './simulatorConstants';

function FacePreview({ face, label }) {
  const faceColors = face || Array(9).fill('W');

  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <span className="font-mono text-[10px] uppercase tracking-widest text-white">{label}</span>
      <div className="grid grid-cols-3 gap-[2px] sm:gap-1">
        {faceColors.map((token, index) => (
          <div
            key={`${label}-${index}`}
            className="h-4 w-4 rounded-[3px] border border-black/20 sm:h-5 sm:w-5"
            style={{ backgroundColor: TOKEN_HEX[token] ?? '#333' }}
          />
        ))}
      </div>
    </div>
  );
}

export default function SimulatorFaceMap({ displayState }) {
  return (
    <div className="border-t border-dictator-chrome/10 bg-[#0A0A0A] px-4 py-4 sm:px-6 sm:py-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-white mb-4">Face Map</p>
      <div className="grid grid-cols-3 gap-x-4 gap-y-4 sm:flex sm:flex-wrap sm:justify-center sm:gap-6">
        {FACE_ORDER.map((face) => (
          <FacePreview key={face} face={displayState[face]} label={face} />
        ))}
      </div>
    </div>
  );
}
