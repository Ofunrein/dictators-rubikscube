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
 * On submit the modal calls AuthContext's login() or signup() stub, then
 * closes. When the database is wired up, only those stub functions need to
 * change — this component stays the same.
 */
import { useEffect, useRef, useState } from 'react';
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
  const { login, signup } = useAuth();

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
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
      <div className="relative w-full max-w-md bg-[#0D0D0D] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

        {/* Top accent line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-dictator-red to-transparent" />

        <div className="px-8 py-8">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-dictator-chrome hover:text-white transition-colors"
          >
            <X size={18} />
          </button>

          {/* Logo mark */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-7 h-7 rounded-full bg-[#1A1A1A] border border-dictator-red/40 flex items-center justify-center font-mono text-dictator-red text-[10px] font-bold select-none">
              TD
            </div>
            <span className="font-heading text-sm tracking-widest uppercase text-dictator-chrome">
              The Dictators
            </span>
          </div>

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
                <label className="block font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-1.5">
                  Username
                </label>
                <input
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
              <label className="block font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 font-mono outline-none focus:border-dictator-red/60 transition-colors"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 font-mono outline-none focus:border-dictator-red/60 transition-colors"
              />
            </div>

            {error && (
              <p className="font-mono text-[11px] text-dictator-red">{error}</p>
            )}

            <button
              type="submit"
              className="mt-2 w-full bg-dictator-red hover:bg-dictator-deep text-white font-mono text-xs uppercase tracking-widest py-3 rounded-lg transition-colors active:scale-95"
            >
              {mode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
