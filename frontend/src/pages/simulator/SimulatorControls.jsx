/**
 * SimulatorControls.jsx — Left sidebar panel with all the action buttons and controls
 *
 * This is a "dumb" component — it doesn't manage any state itself. It just receives
 * props from SimulatorPage and renders buttons that call the callbacks it was given.
 *
 * Sections (top to bottom):
 *   1. Action buttons: Scramble, Solve, Reset (disabled when a move is animating)
 *   2. Timer display + timed-solve button (scrambles first, starts on first user move)
 *   3. Scramble display: shows the current scramble sequence if one exists
 *   4. Move buttons: grid of face turn and slice move buttons (U, U', D, D', etc.)
 *   5. Keyboard shortcuts: reference card showing which keys map to which moves
 *   6. Move history: scrollable list of the last 50 moves applied
 */

import { Check, RotateCcw, Shuffle, Timer } from 'lucide-react';
import { CUBE_SIZE_OPTIONS, formatTime } from './simulatorConstants';

export default function SimulatorControls({
  activeMove,
  cubeSize,
  interactionLocked,
  keyMap,
  manualInputLocked,
  moveHistory,
  moveGroups,
  onMoveSelect,
  onReset,
  onScramble,
  onSolve,
  onSizeChange,
  onTimerAction,
  scrambleSeq,
  solveDepth,
  timerMs = 0,
  timerPrimed = false,
  timerRunning = false,
}) {
  const actionsDisabled = interactionLocked || solveDepth === 0;
  const timerButtonLabel = timerRunning ? 'Stop Timer' : timerPrimed ? 'Cancel Timed Solve' : 'Start Timed Solve';
  const timerStatusText = timerRunning
    ? 'Active timed solve. Using Solve cancels the timer instead of keeping the result.'
    : timerPrimed
      ? 'Scramble is queued. Timer starts on your first move.'
      : 'Starts from a fresh scramble so every solve uses the same flow.';

  return (
    <aside className="w-full max-h-[35vh] border-b border-dictator-chrome/10 bg-[#0A0A0A] md:max-h-none md:w-[300px] md:min-w-[300px] md:border-b-0 md:border-r lg:w-[248px] lg:min-w-[248px] xl:w-[300px] xl:min-w-[300px] flex flex-col overflow-y-auto">
      <div className="border-b border-dictator-chrome/10 p-4 sm:p-5 lg:p-6">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-white">Cube Size</p>
        <div className="grid grid-cols-3 gap-1.5">
          {CUBE_SIZE_OPTIONS.map((sizeOption) => {
            const selected = cubeSize === sizeOption;
            return (
              <button
                key={sizeOption}
                onClick={() => onSizeChange(sizeOption)}
                disabled={interactionLocked}
                className={`min-h-[42px] rounded-xl border font-mono text-xs font-bold transition-all
                  ${selected
                    ? 'border-dictator-red bg-dictator-red/15 text-dictator-red'
                    : interactionLocked
                      ? 'border-dictator-chrome/10 bg-[#1A1A1A] text-white/50 cursor-not-allowed'
                      : 'border-dictator-chrome/20 bg-[#1A1A1A] text-white hover:border-dictator-red/50 hover:text-dictator-red'
                  }`}
              >
                {sizeOption}x{sizeOption}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-b border-dictator-chrome/10 p-4 sm:p-5 lg:p-6">
        <button
          onClick={onScramble}
          disabled={interactionLocked}
          className={`flex min-h-[50px] items-center justify-center gap-2 rounded-xl px-3 py-3 text-center font-mono text-[11px] font-bold uppercase tracking-wider leading-tight transition-colors sm:text-xs lg:text-[11px]
            ${interactionLocked
              ? 'bg-dictator-red/30 text-white/70 cursor-not-allowed'
              : 'bg-dictator-red text-white hover:bg-[#AA1515] active:scale-95'
            }`}
        >
          <Shuffle size={14} className="shrink-0" />
          <span>Scramble</span>
        </button>
        <button
          onClick={onSolve}
          disabled={actionsDisabled}
          className={`flex min-h-[50px] items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center font-mono text-[11px] font-bold uppercase tracking-wider leading-tight transition-all sm:text-xs lg:text-[11px]
            ${actionsDisabled
              ? 'bg-[#1A1A1A] border-dictator-chrome/10 text-white/60 cursor-not-allowed'
              : 'bg-[#1A1A1A] border-dictator-red/40 text-dictator-red hover:border-dictator-red hover:text-white active:scale-95'
            }`}
        >
          <Check size={14} className="shrink-0" />
          <span>Solve</span>
        </button>
        <button
          onClick={onReset}
          disabled={interactionLocked}
          className={`flex min-h-[50px] items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center font-mono text-[11px] font-bold uppercase tracking-wider leading-tight transition-all sm:text-xs lg:text-[11px]
            ${interactionLocked
              ? 'bg-[#1A1A1A] border-dictator-chrome/10 text-white/60 cursor-not-allowed'
              : 'bg-[#1A1A1A] border-dictator-chrome/20 text-white hover:border-dictator-chrome/50 hover:text-white active:scale-95'
            }`}
        >
          <RotateCcw size={14} className="shrink-0" />
          <span>Reset</span>
        </button>
      </div>

      {/* Timer — below action buttons */}
      <div className="border-b border-dictator-chrome/10 p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 md:gap-3 lg:gap-4">
          <div className="flex items-center justify-between gap-4 md:items-start lg:items-center">
            <div className="min-w-0">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-white/90">Timer</p>
              <p className={`font-mono text-2xl font-bold ${timerRunning ? 'text-dictator-red' : 'text-white'}`}>
                {formatTime(timerMs)}
              </p>
            </div>
            <button
              onClick={onTimerAction}
              disabled={interactionLocked}
              className={`flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-wider leading-tight transition-all sm:text-[11px]
                ${interactionLocked
                  ? 'bg-[#1A1A1A] border-dictator-chrome/10 text-white/50 cursor-not-allowed'
                  : timerRunning || timerPrimed
                    ? 'bg-dictator-red/20 border-dictator-red text-dictator-red'
                    : 'bg-[#1A1A1A] border-dictator-chrome/20 text-white hover:border-dictator-red/50'
                }`}
            >
              <Timer size={12} className="shrink-0" />
              <span>{timerButtonLabel}</span>
            </button>
          </div>
          <div>
            <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-white/90">Timed Solve</p>
            <p className="font-mono text-[11px] leading-relaxed text-white/95">
              {timerStatusText}
            </p>
          </div>
        </div>
      </div>

      {scrambleSeq.length > 0 && (
        <div className="border-b border-dictator-chrome/10 p-4 sm:p-5 lg:p-6">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-white">Scramble</p>
          <p className="font-mono text-[13px] leading-relaxed break-all text-white">
            {scrambleSeq.join(' ')}
          </p>
        </div>
      )}

      <div className="border-b border-dictator-chrome/10 p-4 sm:p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-white">Moves</p>
          <span
            className={`font-mono text-[11px] uppercase tracking-widest ${
              manualInputLocked ? 'text-dictator-red' : 'text-white/90'
            }`}
          >
            {manualInputLocked ? `Locked${activeMove ? ` · ${activeMove}` : ''}` : `${cubeSize}x${cubeSize}`}
          </span>
        </div>
        {cubeSize !== 3 && (
          <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-white/85">
            {cubeSize === 2 ? 'Outer face turns only on 2x2' : 'Lowercase buttons are inner slices on 4x4'}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-2">
          {moveGroups.map(({ label, moves }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/90">
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

      <div className="border-b border-dictator-chrome/10 p-4 sm:p-5 lg:p-6">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-white">Keyboard</p>
        <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3">
          {Object.entries(keyMap).map(([key, move]) => (
            <div key={key} className="flex items-center gap-1.5">
              <kbd className="rounded border border-dictator-chrome/20 bg-[#1A1A1A] px-1.5 py-0.5 font-mono text-[11px] text-white">
                {key}
              </kbd>
              <span className="font-mono text-[11px] text-white">→ {move}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-5 lg:p-6">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-white">
          Move History <span className="text-white/90">({moveHistory.length})</span>
        </p>
        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto md:max-h-28 lg:max-h-32">
          {moveHistory.length === 0 ? (
            <span className="font-mono text-[11px] text-white/90">No moves yet</span>
          ) : (
            moveHistory.map((move, index) => (
              <span
                key={`${move}-${index}`}
                className="rounded border border-dictator-chrome/10 bg-[#1A1A1A] px-2 py-1 font-mono text-[11px] text-white"
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
