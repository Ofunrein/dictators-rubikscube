/**
 * CanvasFallbackPanel.jsx — Shown when the 3D renderer fails
 *
 * If the browser can't initialize WebGL (old hardware, out of memory, driver crash),
 * this panel replaces the 3D cube. The move controls and solve logic still work —
 * you just can't see the animated cube. There's a "Retry 3D" button to try again.
 *
 * Displays the error message and stack trace if available, which helps with debugging.
 */

export default function CanvasFallbackPanel({
  canvasErrorDetails,
  canvasErrorMessage,
  onRetry,
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-dictator-red/30 bg-black/55 px-6 py-5 text-center backdrop-blur">
        <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-red mb-2">
          3D Renderer Disabled
        </p>
        <p className="font-body text-sm text-white leading-relaxed">
          The browser could not initialize WebGL for the animated cube. Move controls and solve tracking still work in fallback mode.
        </p>
        {canvasErrorMessage && (
          <p className="mt-3 rounded-lg border border-dictator-chrome/20 bg-black/40 px-3 py-2 font-mono text-[10px] leading-relaxed text-white/90 break-words">
            {canvasErrorMessage}
          </p>
        )}
        {canvasErrorDetails && (
          <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-dictator-chrome/20 bg-black/40 p-3 text-left font-mono text-[10px] leading-relaxed text-white/90 whitespace-pre-wrap break-words">
            {canvasErrorDetails}
          </pre>
        )}
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center justify-center rounded-lg border border-dictator-red/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-dictator-red transition-colors hover:bg-dictator-red hover:text-white"
        >
          Retry 3D
        </button>
      </div>
    </div>
  );
}
