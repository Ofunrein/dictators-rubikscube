/**
 * SimulatorControls.jsx — Left sidebar panel with all the action buttons and controls
 */

import { Check, Play, RotateCcw, Shuffle, Square, Timer } from 'lucide-react';
import { CUBE_SIZE_OPTIONS, formatTime } from './simulatorConstants';
import { getThemeClasses } from './simulatorTheme';

export default function SimulatorControls({
  activeMove,
  cubeSize,
  interactionLocked,
  isDark = true,
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
  scrambleMoveCount = 0,
  scrambleSeq,
  solveDepth,
  timerMs = 0,
  timerPrimed = false,
  timerRunning = false,
}) {
  const actionsDisabled = interactionLocked || solveDepth === 0;
  const t = getThemeClasses(isDark);
  const timerButtonLabel = timerRunning ? 'Stop Timer' : timerPrimed ? 'Cancel Timed Solve' : 'Start Timed Solve';
  const timerStatusText = timerRunning
    ? 'Active timed solve. Using Solve cancels the timer instead of keeping the result.'
    : timerPrimed
      ? 'Scramble is queued. Timer starts on your first move.'
      : 'Starts from a fresh scramble so every solve uses the same flow.';

  const isTimedSolve = timerPrimed || timerRunning;
  const hiddenMoves = /^[xyXY]'?$/;
  const visibleMoves = (isTimedSolve
    ? moveHistory.slice(scrambleMoveCount)
    : moveHistory
  ).filter((m) => !hiddenMoves.test(m));

  return (
    <aside className="w-full max-h-[40vh] border-b sim-border sim-panel-bg md:max-h-none md:w-[260px] md:min-w-[220px] md:border-b-0 md:border-r lg:w-[280px] lg:min-w-[240px] xl:w-[300px] xl:min-w-[260px] flex flex-col overflow-y-auto shrink-0">

      {/* Cube size + actions */}
      <div className="border-b border-[--sim-border] p-2 sm:p-3 md:p-4">
        <div className="flex items-center gap-2 mb-1.5 md:mb-2">
          <p className="font-mono text-[9px] md:text-[10px] uppercase tracking-widest sim-text shrink-0">Size</p>
          <div className="grid grid-cols-3 gap-1 flex-1">
            {CUBE_SIZE_OPTIONS.map((sizeOption) => {
              const selected = cubeSize === sizeOption;
              return (
                <button
                  key={sizeOption}
                  onClick={() => onSizeChange(sizeOption)}
                  disabled={interactionLocked}
                  className={`py-1.5 rounded-lg border font-mono text-[11px] font-bold transition-all
                    ${selected
                      ? 'border-dictator-red bg-dictator-red/15 text-dictator-red'
                      : interactionLocked
                        ? 'border-[--sim-border] bg-[--sim-kbd] sim-text/50 cursor-not-allowed'
                        : 'border-dictator-chrome/20 bg-[--sim-kbd] sim-text hover:border-dictator-red/50 hover:text-dictator-red'
                    }`}
                >
                  {sizeOption}x{sizeOption}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={onScramble}
            disabled={interactionLocked}
            className={`flex items-center justify-center gap-1 rounded-lg px-1 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide transition-colors min-w-0
              ${interactionLocked
                ? 'bg-dictator-red/30 sim-text/70 cursor-not-allowed'
                : 'bg-dictator-red sim-text hover:bg-[#AA1515] active:scale-95'
              }`}
          >
            <Shuffle size={11} className="shrink-0" />
            <span className="truncate">Scramble</span>
          </button>
          <button
            onClick={onSolve}
            disabled={actionsDisabled}
            className={`flex items-center justify-center gap-1 rounded-lg border px-1 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide transition-all min-w-0
              ${actionsDisabled
                ? 'bg-[--sim-kbd] border-[--sim-border] sim-text/60 cursor-not-allowed'
                : 'bg-[--sim-kbd] border-dictator-red/40 text-dictator-red hover:border-dictator-red hover:sim-text active:scale-95'
              }`}
          >
            <Check size={11} className="shrink-0" />
            <span className="truncate">Solve</span>
          </button>
          <button
            onClick={onReset}
            disabled={interactionLocked}
            className={`flex items-center justify-center gap-1 rounded-lg border px-1 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide transition-all min-w-0
              ${interactionLocked
                ? 'bg-[--sim-kbd] border-[--sim-border] sim-text/60 cursor-not-allowed'
                : 'bg-[--sim-kbd] border-dictator-chrome/20 sim-text hover:border-dictator-chrome/50 hover:sim-text active:scale-95'
              }`}
          >
            <RotateCcw size={11} className="shrink-0" />
            <span className="truncate">Reset</span>
          </button>
        </div>
      </div>

      {/* Timer — compact row on mobile, original card on desktop */}
      <div className="border-b border-[--sim-border] p-2 sm:p-3 md:p-4">
        {/* Mobile */}
        <div className="md:hidden flex items-center justify-between gap-2 rounded-lg border border-[--sim-border] bg-[--sim-card] px-2 py-1.5">
          <p className={`font-mono text-lg font-extrabold tracking-tight tabular-nums ${timerRunning ? 'text-dictator-red' : timerPrimed ? 'text-[#5B5FC7]' : 'sim-text'}`}>
            {timerPrimed ? 'READY' : formatTime(timerMs)}
          </p>
          <button
            onClick={onTimerAction}
            disabled={interactionLocked}
            className={`flex items-center gap-1 rounded-full px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wide transition-all shrink-0
              ${interactionLocked
                ? 'bg-[--sim-kbd] border border-[--sim-border] sim-text/30 cursor-not-allowed'
                : timerRunning || timerPrimed
                  ? 'bg-dictator-red/20 border border-dictator-red text-dictator-red'
                  : 'bg-[--sim-kbd] border border-dictator-chrome/20 sim-text hover:border-dictator-red/50'
              }`}
          >
            <Timer size={10} className="shrink-0" />
            {timerRunning ? 'Stop' : timerPrimed ? 'Cancel' : 'Start'}
          </button>
        </div>

        {/* Desktop */}
        <div className="hidden md:block">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="mb-1 font-mono text-[11px] uppercase tracking-widest sim-text/90">Timer</p>
                <p className={`font-mono text-2xl font-bold ${timerRunning ? 'text-dictator-red' : 'sim-text'}`}>
                  {formatTime(timerMs)}
                </p>
              </div>
              <button
                onClick={onTimerAction}
                disabled={interactionLocked}
                className={`flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-wider leading-tight transition-all sm:text-[11px]
                  ${interactionLocked
                    ? 'bg-[--sim-kbd] border-[--sim-border] sim-text/50 cursor-not-allowed'
                    : timerRunning || timerPrimed
                      ? 'bg-dictator-red/20 border-dictator-red text-dictator-red'
                      : 'bg-[--sim-kbd] border-dictator-chrome/20 sim-text hover:border-dictator-red/50'
                  }`}
              >
                <Timer size={12} className="shrink-0" />
                <span>{timerButtonLabel}</span>
              </button>
            </div>
            <div>
              <p className="mb-1 font-mono text-[11px] uppercase tracking-widest sim-text/90">Timed Solve</p>
              <p className="font-mono text-[11px] leading-relaxed sim-text/95">
                {timerStatusText}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Move buttons */}
      <div className="border-b border-[--sim-border] p-2 sm:p-3 md:p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-mono text-[10px] uppercase tracking-widest sim-text">Moves</p>
          <span
            className={`font-mono text-[10px] uppercase tracking-widest ${
              manualInputLocked ? 'text-dictator-red' : 'sim-text/90'
            }`}
          >
            {manualInputLocked ? `Locked${activeMove ? ` · ${activeMove}` : ''}` : `${cubeSize}x${cubeSize}`}
          </span>
        </div>
        {cubeSize !== 3 && (
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest sim-text/85">
            {cubeSize === 2 ? 'Outer face turns only on 2x2' : 'Lowercase = inner slices on 4x4'}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {moveGroups.map(({ label, moves }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="font-mono text-[9px] uppercase tracking-widest sim-text/90">
                {label}
              </span>
              <div className="flex gap-1">
                {moves.map((move) => (
                  <button
                    key={move}
                    onClick={() => onMoveSelect(move)}
                    disabled={manualInputLocked}
                    className={`flex-1 font-mono text-[11px] font-bold py-1.5 rounded-md border transition-all duration-150 min-w-0
                      ${manualInputLocked
                        ? 'bg-[--sim-kbd] border-[--sim-border] sim-text/30 cursor-not-allowed'
                        : 'bg-[--sim-kbd] border-dictator-chrome/20 sim-text hover:bg-dictator-red hover:border-dictator-red active:scale-95'
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

      {/* Keyboard shortcuts — hidden on mobile */}
      <div className="hidden md:block border-b border-[--sim-border] p-3 md:p-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest sim-text">Keyboard</p>
        <div className="grid grid-cols-2 gap-1 lg:grid-cols-3">
          {Object.entries(keyMap).map(([key, move]) => (
            <div key={key} className="flex items-center gap-1">
              <kbd className="rounded border border-dictator-chrome/20 bg-[--sim-kbd] px-1 py-0.5 font-mono text-[10px] sim-text">
                {key}
              </kbd>
              <span className="font-mono text-[10px] sim-text">→ {move}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Move history */}
      <div className="flex-1 p-2 sm:p-3 md:p-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest sim-text">
          Move History
        </p>
        <div className="flex max-h-16 flex-wrap gap-1 overflow-y-auto md:max-h-24 lg:max-h-28">
          {timerPrimed ? (
            <span className="font-mono text-[10px] text-[#5B5FC7]">
              Waiting for first move...
            </span>
          ) : visibleMoves.length === 0 ? (
            <span className="font-mono text-[10px] sim-text/90">No moves yet</span>
          ) : (
            visibleMoves.map((move, index) => (
              <span
                key={`${move}-${index}`}
                className="rounded border border-[--sim-border] bg-[--sim-kbd] px-1.5 py-0.5 font-mono text-[10px] sim-text"
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
