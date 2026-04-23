import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { TOTAL_STEPS } from './stepsData';

function parseAlgorithmMoves(movesStr) {
  return movesStr.split(/\s+/).filter(Boolean);
}

export default function GuidePanel({
  currentStep,
  currentIndex,
  totalSlides,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onApplyAlgorithm,
  queueActive,
  isDark,
  onNavigateSimulator,
}) {
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    setImgLoaded(false);
  }, [currentStep.gif]);

  const cardBg = isDark ? 'bg-[#111] border-white/8' : 'bg-white border-dictator-ink/10';
  const muted = isDark ? 'text-white/50' : 'text-dictator-ink/50';
  const textBody = isDark ? 'text-white/80' : 'text-dictator-ink/80';
  const navBtn = isDark
    ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
    : 'border-dictator-ink/15 bg-white text-dictator-ink/60 hover:bg-dictator-ink/5 hover:text-dictator-ink';
  const navBtnDisabled = isDark
    ? 'border-white/5 bg-white/[0.02] text-white/15 cursor-not-allowed'
    : 'border-dictator-ink/8 bg-dictator-ink/[0.02] text-dictator-ink/15 cursor-not-allowed';
  const dotActive = 'bg-dictator-red';
  const dotInactive = isDark ? 'bg-white/15' : 'bg-dictator-ink/15';

  const isLastSlide = currentIndex === totalSlides - 1;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Progress bar */}
      <div className={`h-0.5 shrink-0 ${isDark ? 'bg-white/5' : 'bg-dictator-ink/5'}`}>
        <div
          className="h-full bg-dictator-red transition-all duration-500 ease-out"
          style={{ width: `${((currentIndex + 1) / totalSlides) * 100}%` }}
        />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {/* Step header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-dictator-red mb-1">
              {currentStep.title}
            </p>
            <h2 className={`font-heading text-lg tracking-tight ${isDark ? 'text-white' : 'text-dictator-ink'}`}>
              {currentStep.subtitle}
            </h2>
          </div>
          <p className={`font-mono text-[11px] shrink-0 ${muted}`}>
            {currentIndex + 1} / {totalSlides}
          </p>
        </div>

        {/* GIF */}
        {currentStep.gif ? (
          <div className={`relative rounded-xl overflow-hidden ${isDark ? 'bg-black/30' : 'bg-dictator-ink/[0.03]'}`}
            style={{ minHeight: '140px' }}
          >
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-dictator-red/30 border-t-dictator-red rounded-full animate-spin" />
              </div>
            )}
            <img
              key={currentStep.gif}
              src={currentStep.gif}
              alt={currentStep.subtitle}
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-auto rounded-xl transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>
        ) : (
          <div className={`flex items-center justify-center rounded-xl p-6 ${isDark ? 'bg-black/30' : 'bg-dictator-ink/[0.03]'}`}>
            <RotateCcw size={36} className="text-dictator-red/30" />
          </div>
        )}

        {/* Text */}
        <div>
          {currentStep.text.split('\n\n').map((para, i) => (
            <p key={i} className={`font-body text-sm leading-relaxed mb-2.5 last:mb-0 ${textBody}`}>
              {para.split('\n').map((line, j) => (
                <span key={j}>
                  {j > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
          ))}
        </div>

        {/* Algorithm buttons */}
        {currentStep.algorithms.length > 0 && (
          <div className="space-y-2">
            <p className={`font-mono text-[10px] uppercase tracking-widest ${muted}`}>
              Try it on the cube
            </p>
            <div className="flex flex-wrap gap-2">
              {currentStep.algorithms.map((alg, i) => (
                <button
                  key={i}
                  onClick={() => onApplyAlgorithm(parseAlgorithmMoves(alg.moves))}
                  disabled={queueActive}
                  className={`rounded-lg border px-3 py-2 font-mono text-xs transition-all ${
                    queueActive
                      ? 'border-white/5 text-white/20 cursor-not-allowed'
                      : 'border-dictator-red/30 bg-dictator-red/10 text-dictator-red hover:bg-dictator-red/20 hover:border-dictator-red/50 active:scale-95'
                  }`}
                >
                  <span className="block font-bold">{alg.moves}</span>
                  <span className={`block text-[10px] mt-0.5 ${queueActive ? 'text-white/10' : 'text-dictator-red/60'}`}>
                    {alg.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation — pinned at bottom */}
      <div className={`shrink-0 border-t px-4 py-3 flex items-center justify-between ${isDark ? 'border-white/5' : 'border-dictator-ink/10'}`}>
        {/* Step dots */}
        <div className="flex items-center gap-1">
          {Array.from({ length: TOTAL_STEPS + 2 }).map((_, i) => {
            const stepNum = i - 1;
            const isCurrentStep = currentStep.step === stepNum
              || (i === 0 && currentStep.step === 0)
              || (i === TOTAL_STEPS + 1 && isLastSlide);
            return (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  isCurrentStep ? `w-4 h-1.5 ${dotActive}` : `w-1.5 h-1.5 ${dotInactive}`
                }`}
              />
            );
          })}
        </div>

        {/* Prev / Next */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={!canPrev}
            className={`flex items-center gap-1 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all ${
              canPrev ? navBtn : navBtnDisabled
            }`}
          >
            <ChevronLeft size={12} />
            Prev
          </button>
          {isLastSlide ? (
            <button
              onClick={onNavigateSimulator}
              className="flex items-center gap-1 rounded-full bg-dictator-red text-white px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest hover:bg-dictator-deep transition-colors"
            >
              Free Solve
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={!canNext}
              className={`flex items-center gap-1 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all ${
                canNext ? navBtn : navBtnDisabled
              }`}
            >
              Next
              <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
