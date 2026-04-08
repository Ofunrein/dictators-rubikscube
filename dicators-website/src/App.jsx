import React, { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

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
      {/* Decorative red scanline overlay spanning the whole page */}
      <div className="scanline"></div>

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
    </div>
  );
}

export default App;
