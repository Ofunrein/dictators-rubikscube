/**
 * PageNavbar.jsx — Shared top navigation bar for inner pages
 *
 * Features:
 *   - Logo → back to landing page
 *   - Nav links: Learn, Step-by-Step Guide, Compete with active underline
 *   - Mobile hamburger menu with full-screen overlay
 *   - Auth state: Log In / Sign Up or profile avatar (more visible styling)
 *   - Theme toggle + Simulator shortcut
 *   - AuthModal for login/signup
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, Menu, X } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const text = isDark ? 'text-dictator-chrome hover:text-white' : 'text-dictator-ink/70 hover:text-dictator-ink';
  const activeText = isDark ? 'text-white' : 'text-dictator-ink';
  const border = isDark ? 'border-white/20 hover:border-white/40' : 'border-dictator-ink/30 hover:border-dictator-ink/60';

  function navTo(href) {
    navigate(href);
    setMobileMenuOpen(false);
  }

  return (
    <>
      <header className={`flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b transition-colors duration-300 ${isDark ? 'border-white/5' : 'border-dictator-ink/15'}`}>
        {/* Logo */}
        <button onClick={() => navTo('/')} className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
          <div className="w-7 h-7 rounded-full bg-[#1A1A1A] border border-dictator-red/40 flex items-center justify-center font-mono text-dictator-red text-[10px] font-bold select-none">
            TD
          </div>
          <span className={`font-heading tracking-widest text-sm uppercase transition-colors hidden sm:block ${isDark ? 'text-dictator-chrome group-hover:text-white' : 'text-dictator-ink group-hover:text-dictator-red'}`}>
            The Dictators
          </span>
        </button>

        {/* Desktop nav links */}
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

        {/* Right side: auth + theme + simulator + hamburger */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Auth — desktop */}
          {currentUser ? (
            <button
              onClick={() => navigate('/profile')}
              className={`hidden sm:flex items-center gap-2 font-mono text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all
                ${location.pathname === '/profile'
                  ? 'border-dictator-red bg-dictator-red/10 text-dictator-red'
                  : `${border} ${isDark ? 'text-white hover:text-white' : 'text-dictator-ink/80 hover:text-dictator-ink'}`}`}
            >
              <div className="w-5 h-5 rounded-full bg-dictator-red/20 border-2 border-dictator-red/60 flex items-center justify-center text-dictator-red font-bold shrink-0 text-[9px]">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              {currentUser.username}
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => setAuthModal('login')}
                className={`font-mono text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all ${border} ${isDark ? 'text-white/80 hover:text-white' : 'text-dictator-ink/70 hover:text-dictator-ink'}`}
              >
                Log In
              </button>
              <button
                onClick={() => setAuthModal('signup')}
                className="font-mono text-xs uppercase tracking-widest px-3 py-1.5 rounded-full bg-dictator-red text-white hover:bg-dictator-deep transition-colors"
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1 font-mono text-[10px] sm:text-xs uppercase tracking-widest px-2 sm:px-3 py-1.5 rounded-full border transition-all ${border} ${isDark ? 'text-dictator-chrome hover:text-white' : 'text-dictator-ink/60 hover:text-dictator-ink'}`}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={12} /> : <Moon size={12} />}
            <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
          </button>

          {/* Simulator button — desktop */}
          <button
            onClick={() => navigate('/simulator')}
            className="hidden sm:block font-mono text-xs uppercase tracking-widest px-3 py-1.5 rounded-full bg-dictator-red text-white hover:bg-dictator-deep transition-colors"
          >
            Simulator
          </button>

          {/* Hamburger — mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${isDark ? 'text-white hover:bg-white/10' : 'text-dictator-ink hover:bg-dictator-ink/10'}`}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className={`md:hidden fixed inset-0 top-[52px] z-50 flex flex-col ${isDark ? 'bg-dictator-void/98' : 'bg-dictator-smoke/98'} backdrop-blur-lg`}>
          <nav className="flex flex-col px-6 py-6 gap-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => navTo(link.href)}
                className={`text-left font-mono text-lg uppercase tracking-widest py-3 border-b transition-colors ${
                  isDark ? 'border-white/5' : 'border-dictator-ink/10'
                } ${location.pathname === link.href
                  ? 'text-dictator-red'
                  : isDark ? 'text-white' : 'text-dictator-ink'
                }`}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => navTo('/simulator')}
              className={`text-left font-mono text-lg uppercase tracking-widest py-3 border-b transition-colors ${isDark ? 'border-white/5 text-white' : 'border-dictator-ink/10 text-dictator-ink'}`}
            >
              Simulator
            </button>
          </nav>

          <div className="px-6 mt-auto pb-8 flex flex-col gap-3">
            {currentUser ? (
              <button
                onClick={() => navTo('/profile')}
                className="flex items-center gap-3 font-mono text-sm uppercase tracking-widest py-3"
              >
                <div className="w-8 h-8 rounded-full bg-dictator-red/20 border-2 border-dictator-red/60 flex items-center justify-center text-dictator-red font-bold text-sm">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
                <span className={isDark ? 'text-white' : 'text-dictator-ink'}>{currentUser.username}</span>
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => { setMobileMenuOpen(false); setAuthModal('login'); }}
                  className={`flex-1 font-mono text-sm uppercase tracking-widest py-3 rounded-xl border transition-colors ${border} ${isDark ? 'text-white' : 'text-dictator-ink'}`}
                >
                  Log In
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); setAuthModal('signup'); }}
                  className="flex-1 font-mono text-sm uppercase tracking-widest py-3 rounded-xl bg-dictator-red text-white hover:bg-dictator-deep transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {authModal && (
        <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} />
      )}
    </>
  );
}
