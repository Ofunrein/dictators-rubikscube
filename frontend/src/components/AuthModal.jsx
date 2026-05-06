/**
 * AuthModal.jsx — Login / Sign Up modal overlay
 *
 * A self-contained modal that floats above any page. It is NOT a route — it
 * is triggered by buttons in Navbar (landing page) and SimulatorPage header.
 * It mounts/unmounts via a parent's authModal state (null = hidden).
 *
 * Props:
 *   initialMode — 'login' | 'signup'  — which tab opens first
 *   onClose     — called when the user presses Escape, clicks the backdrop,
 *                 or completes a successful auth action
 *
 * On submit the modal calls AuthContext's Supabase-backed login() or signup()
 * action, then closes after a successful auth response.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ initialMode = 'login', onClose }) {
  const [mode, setMode] = useState(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);
  const headingId = useId();
  const descriptionId = useId();
  const usernameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const { login, signup } = useAuth();

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    if (mode === 'signup' && !username) { setError('Username is required.'); return; }

    setSubmitting(true);

    let result;
    if (mode === 'login') {
      result = await login(email, password);
    } else {
      result = await signup(username, email, password);
    }

    setSubmitting(false);

    if (result?.error) {
      setError(result.error.message || 'Something went wrong. Please try again.');
      return;
    }

    onClose();
  }

  function switchMode(next) {
    setMode(next);
    setError('');
    setUsername('');
    setEmail('');
    setPassword('');
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md bg-[#0D0D0D] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >

        {/* Top accent line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-dictator-red to-transparent" />

        <div className="px-8 py-8">
          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Close authentication modal"
            className="absolute top-5 right-5 text-dictator-chrome hover:text-white transition-colors"
          >
            <X size={18} />
          </button>

          {/* Logo mark */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-7 h-7 rounded-full bg-[#1A1A1A] border border-dictator-red/40 flex items-center justify-center font-mono text-dictator-red text-[10px] font-bold select-none">
              TD
            </div>
            <span id={headingId} className="font-heading text-sm tracking-widest uppercase text-dictator-chrome">
              The Dictators
            </span>
          </div>
          <p id={descriptionId} className="sr-only">
            {mode === 'login'
              ? 'Log in to save solve times and view profile stats.'
              : 'Create an account to save solve times and appear on leaderboards.'}
          </p>

          {/* Tab switcher */}
          <div className="flex gap-1 mb-8 bg-white/5 rounded-lg p-1">
            {['login', 'signup'].map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-md font-mono text-xs uppercase tracking-widest transition-all ${
                  mode === m
                    ? 'bg-dictator-red text-white'
                    : 'text-dictator-chrome hover:text-white'
                }`}
              >
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor={usernameId} className="block font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-1.5">
                  Username
                </label>
                <input
                  id={usernameId}
                  ref={firstFieldRef}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="speedcuber99"
                  autoComplete="username"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 font-mono outline-none focus:border-dictator-red/60 transition-colors"
                />
              </div>
            )}

            <div>
              <label htmlFor={emailId} className="block font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-1.5">
                Email
              </label>
              <input
                id={emailId}
                ref={mode === 'login' ? firstFieldRef : undefined}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 font-mono outline-none focus:border-dictator-red/60 transition-colors"
              />
            </div>

            <div>
              <label htmlFor={passwordId} className="block font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-1.5">
                Password
              </label>
              <input
                id={passwordId}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 font-mono outline-none focus:border-dictator-red/60 transition-colors"
              />
            </div>

            {error && (
              <p id={errorId} role="alert" className="font-mono text-[11px] text-dictator-red">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              aria-describedby={error ? errorId : undefined}
              className="mt-2 w-full bg-dictator-red hover:bg-dictator-deep text-white font-mono text-xs uppercase tracking-widest py-3 rounded-lg transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Working...' : mode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
