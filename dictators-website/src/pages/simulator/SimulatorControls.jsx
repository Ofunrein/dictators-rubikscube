/**
 * SimulatorControls.jsx — Left sidebar panel with all the action buttons and controls
 *
 * This is a "dumb" component — it doesn't manage any state itself. It just receives
 * props from SimulatorPage and renders buttons that call the callbacks it was given.
 *
 * Sections (top to bottom):
 *   1. Action buttons: Scramble, Solve, Reset (disabled when a move is animating)
 *   2. Scramble display: shows the current scramble sequence if one exists
 *   3. Move buttons: grid of face turn and slice move buttons (U, U', D, D', etc.)
 *   4. Keyboard shortcuts: reference card showing which keys map to which moves
 *   5. Best time: shows the fastest solve time (only appears after at least one solve)
 *   6. Move history: scrollable list of the last 50 moves applied
 */

import { Check, RotateCcw, Shuffle } from 'lucide-react';
import { KEY_MAP, MOVE_GROUPS, formatTime } from './simulatorConstants';

export default function SimulatorControls({
  activeMove,
  bestTime,
  interactionLocked,
  manualInputLocked,
  moveHistory,
  onMoveSelect,
  onReset,
  onScramble,
  onSolve,
  scrambleSeq,
  solveDepth,
}) {
  const actionsDisabled = interactionLocked || solveDepth === 0;

  return (
    <aside className="w-full max-h-[42vh] lg:max-h-none lg:w-[280px] xl:w-[320px] border-b lg:border-b-0 lg:border-r border-dictator-chrome/10 flex flex-col bg-[#0A0A0A] overflow-y-auto">
      <div className="p-6 border-b border-dictator-chrome/10 grid grid-cols-3 gap-2">
        <button
          onClick={onScramble}
          disabled={interactionLocked}
          className={`flex min-h-[48px] items-center justify-center gap-2 font-mono text-xs font-bold uppercase tracking-widest px-2 py-3 rounded-xl transition-colors
            ${interactionLocked
              ? 'bg-dictator-red/30 text-white/70 cursor-not-allowed'
              : 'bg-dictator-red text-white hover:bg-[#AA1515] active:scale-95'
            }`}
        >
          <Shuffle size={14} />
          Scramble
        </button>
        <button
          onClick={onSolve}
          disabled={actionsDisabled}
          className={`flex min-h-[48px] items-center justify-center gap-2 font-mono text-xs font-bold uppercase tracking-widest px-2 py-3 rounded-xl border transition-all
            ${actionsDisabled
              ? 'bg-[#1A1A1A] border-dictator-chrome/10 text-white/60 cursor-not-allowed'
              : 'bg-[#1A1A1A] border-dictator-red/40 text-dictator-red hover:border-dictator-red hover:text-white active:scale-95'
            }`}
        >
          <Check size={14} />
          Solve
        </button>
        <button
          onClick={onReset}
          disabled={interactionLocked}
          className={`flex min-h-[48px] items-center justify-center gap-2 font-mono text-xs font-bold uppercase tracking-widest px-2 py-3 rounded-xl border transition-all
            ${interactionLocked
              ? 'bg-[#1A1A1A] border-dictator-chrome/10 text-white/60 cursor-not-allowed'
              : 'bg-[#1A1A1A] border-dictator-chrome/20 text-white hover:border-dictator-chrome/50 hover:text-white active:scale-95'
            }`}
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {scrambleSeq.length > 0 && (
        <div className="p-6 border-b border-dictator-chrome/10">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white mb-2">Scramble</p>
          <p className="font-mono text-xs text-white/70 leading-relaxed break-all">
            {scrambleSeq.join(' ')}
          </p>
        </div>
      )}

      <div className="p-6 border-b border-dictator-chrome/10">
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white">Moves</p>
          <span
            className={`font-mono text-[10px] uppercase tracking-widest ${
              manualInputLocked ? 'text-dictator-red' : 'text-white/60'
            }`}
          >
            {manualInputLocked ? `Locked${activeMove ? ` · ${activeMove}` : ''}` : 'Ready'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {MOVE_GROUPS.map(({ label, moves }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <span className="font-mono text-[9px] text-white/70 uppercase tracking-widest">
                {label}
              </span>
              <div className="flex gap-1.5">
                {moves.map((move) => (
                  <button
                    key={move}
                    onClick={() => onMoveSelect(move)}
                    disabled={manualInputLocked}
                    className={`flex-1 font-mono text-xs font-bold py-2 rounded-lg border transition-all duration-150
                      ${manualInputLocked
                        ? 'bg-[#1A1A1A] border-dictator-chrome/10 text-white/30 cursor-not-allowed'
                        : 'bg-[#1A1A1A] border-dictator-chrome/20 text-white hover:bg-dictator-red hover:border-dictator-red active:scale-95'
                      }`}
                  >
                    {move}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 border-b border-dictator-chrome/10">
        <p className="font-mono text-[10px] uppercase tracking-widest text-white mb-3">Keyboard</p>
        <div className="grid grid-cols-3 gap-1.5">
          {Object.entries(KEY_MAP).map(([key, move]) => (
            <div key={key} className="flex items-center gap-1.5">
              <kbd className="font-mono text-[10px] bg-[#1A1A1A] border border-dictator-chrome/20 px-1.5 py-0.5 rounded text-white">
                {key}
              </kbd>
              <span className="font-mono text-[10px] text-white/70">→ {move}</span>
            </div>
          ))}
        </div>
      </div>

      {bestTime !== null && (
        <div className="p-6 border-b border-dictator-chrome/10">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white mb-1">Best Time</p>
          <p className="font-mono text-2xl font-bold text-dictator-red">{formatTime(bestTime)}</p>
        </div>
      )}

      <div className="p-6 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-white mb-3">
          Move History <span className="text-white/60">({moveHistory.length})</span>
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {moveHistory.length === 0 ? (
            <span className="font-mono text-[10px] text-white/70">No moves yet</span>
          ) : (
            moveHistory.map((move, index) => (
              <span
                key={`${move}-${index}`}
                className="font-mono text-[10px] bg-[#1A1A1A] border border-dictator-chrome/10 px-2 py-1 rounded text-white/70"
              >
                {move}
              </span>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
