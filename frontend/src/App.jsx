/**
 * App.jsx — Root component of the website
 *
 * This is the entry point React renders. It assembles the landing page by
 * stacking the section components in order: Navbar, Hero, Features, Philosophy,
 * Protocol, Team, CTA, Footer.
 *
 * The Simulator page is NOT here — it lives at /simulator and is loaded via
 * React Router (see main.jsx). This file is just the landing/marketing page.
 *
 * Uses GSAP + ScrollTrigger for scroll-based animations on the landing page.
 */

/**
 * App.jsx — Landing page (route: /)
 *
 * Assembles the public marketing page by stacking section components in order.
 * The simulator, learn, leaderboard, and profile pages are separate routes
 * defined in main.jsx — this file is only the landing page.
 *
 * Auth state (login/signup buttons + modal) lives here rather than inside
 * Navbar so the fixed top-right buttons stay independent of the centered
 * navbar pill and don't collide with it on any screen size. On mobile the
 * auth buttons are hidden (md:hidden) — the hamburger menu inside Navbar
 * handles auth on small screens.
 *
 * Uses GSAP + ScrollTrigger for scroll-based section animations.
 */
import React, { useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';

// Components
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Philosophy from './components/Philosophy';
import Protocol from './components/Protocol';
import Team from './components/Team';
import CTA from './components/CTA';
import Footer from './components/Footer';

// Register global plugins before any component mounts
gsap.registerPlugin(ScrollTrigger);

function App() {
  const [authModal, setAuthModal] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Refresh ScrollTriggers occasionally to ensure correct measurements,
    // especially after 3D canvas loads or fonts render.
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-dictator-void">
      <div className="scanline"></div>

      {/* Fixed top-right auth — hidden on mobile to avoid navbar overlap */}
      <div className="fixed top-5 right-6 z-[110] hidden md:flex items-center gap-2">
        {currentUser ? (
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full bg-dictator-void/80 backdrop-blur-md border border-white/20 text-white hover:border-white/50 transition-all"
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
              className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full bg-dictator-void/80 backdrop-blur-md border border-white/25 text-white hover:border-white/60 transition-all"
            >
              Log In
            </button>
            <button
              onClick={() => setAuthModal('signup')}
              className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full bg-dictator-red text-white hover:bg-dictator-deep transition-colors"
            >
              Sign Up
            </button>
          </>
        )}
      </div>

      <Navbar />

      <main>
        <Hero />
        <Features />
        <Philosophy />
        <Protocol />
        <Team />

        {/* Container for CTA overlapping Footer naturally */}
        <div className="relative w-full bg-dictator-void overflow-hidden flex flex-col pt-12">
          <div className="px-6 lg:px-12 w-full max-w-7xl mx-auto z-20">
            <CTA />
          </div>
          <Footer />
        </div>

      </main>

      {authModal && (
        <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} />
      )}
    </div>
  );
}

export default App;
