/**
 * PageNavbar.jsx — Shared top navigation bar for inner pages (Learn, Leaderboard, Profile)
 *
 * The landing page uses Navbar.jsx (which has scroll-detection, GSAP animations,
 * and a different visual style). Inner pages use this simpler component instead.
 *
 * What this handles:
 *   - Logo → back to landing page
 *   - Nav links: Learn (/learn), Compete (/leaderboard) with active underline
 *   - Auth state: Log In / Sign Up buttons when logged out, profile avatar when logged in
 *   - Theme toggle: light/dark using shared ThemeContext (persists across all pages)
 *   - Simulator shortcut button
 *   - AuthModal rendered here so any inner page can trigger login/signup
 *
 * All color classes branch on isDark to support both light and dark modes.
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import { useTheme } from '../context/ThemeContext';

const NAV_LINKS = [
  { label: 'Learn', href: '/learn' },
  { label: 'Step-by-Step Guide', href: '/step-by-step' },
  { label: 'Compete', href: '/leaderboard' },
];

export default function PageNavbar() {
  const [authModal, setAuthModal] = useState(null);
  const { currentUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const text = isDark ? 'text-dictator-chrome hover:text-white' : 'text-dictator-ink/70 hover:text-dictator-ink';
  const activeText = isDark ? 'text-white' : 'text-dictator-ink';
  const muted = isDark ? 'text-dictator-chrome' : 'text-dictator-ink/70';
  const border = isDark ? 'border-white/20 hover:border-white/40' : 'border-dictator-ink/30 hover:border-dictator-ink/60';
  const signUpBg = isDark ? 'bg-white/8 border border-white/12 text-white hover:bg-white/15' : 'bg-dictator-ink/10 border border-dictator-ink/20 text-dictator-ink hover:bg-dictator-ink/20';

  return (
    <>
      <header className={`flex items-center justify-between px-6 py-4 border-b transition-colors duration-300 ${isDark ? 'border-white/5' : 'border-dictator-ink/15'}`}>
        {/* Logo */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-full bg-[#1A1A1A] border border-dictator-red/40 flex items-center justify-center font-mono text-dictator-red text-[10px] font-bold select-none">
            TD
          </div>
          <span className={`font-heading tracking-widest text-sm uppercase transition-colors ${isDark ? 'text-dictator-chrome group-hover:text-white' : 'text-dictator-ink group-hover:text-dictator-red'}`}>
            The Dictators
          </span>
        </button>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => navigate(link.href)}
              className={`font-mono text-xs uppercase tracking-widest transition-colors relative group
                ${location.pathname === link.href ? activeText : text}`}
            >
              {link.label}
              <span className={`absolute -bottom-1 left-0 h-[1px] bg-dictator-red transition-all duration-300
                ${location.pathname === link.href ? 'w-full' : 'w-0 group-hover:w-full'}`} />
            </button>
          ))}
        </div>

        {/* Right: auth + theme + simulator */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <button
              onClick={() => navigate('/profile')}
              className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border transition-all
                ${location.pathname === '/profile'
                  ? 'border-dictator-red/50 text-dictator-red'
                  : `${border} ${isDark ? 'text-dictator-chrome hover:text-white' : 'text-dictator-ink/60 hover:text-dictator-ink'}`}`}
            >
              <div className="w-3 h-3 rounded-full bg-dictator-red/30 border border-dictator-red/50 flex items-center justify-center text-dictator-red font-bold shrink-0" style={{ fontSize: '6px' }}>
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              {currentUser.username}
            </button>
          ) : (
            <>
              <button
                onClick={() => setAuthModal('login')}
                className={`font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border transition-all ${border} ${isDark ? 'text-dictator-chrome hover:text-white' : 'text-dictator-ink/60 hover:text-dictator-ink'}`}
              >
                Log In
              </button>
              <button
                onClick={() => setAuthModal('signup')}
                className={`font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full transition-colors ${signUpBg}`}
              >
                Sign Up
              </button>
            </>
          )}

          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border transition-all ${border} ${isDark ? 'text-dictator-chrome hover:text-white' : 'text-dictator-ink/60 hover:text-dictator-ink'}`}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={11} /> : <Moon size={11} />}
            {isDark ? 'Light' : 'Dark'}
          </button>

          <button
            onClick={() => navigate('/simulator')}
            className="font-mono text-[10px] uppercase tracking-widest px-3 py-1 rounded-full bg-dictator-red text-white hover:bg-dictator-deep transition-colors"
          >
            Simulator
          </button>
        </div>
      </header>

      {authModal && (
        <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} />
      )}
    </>
  );
}
