import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Canvas } from '@react-three/fiber';
import RubiksCube3D from './RubiksCube3D';

const Features = () => {
    const containerRef = useRef(null);
    const [shufflerKey, setShufflerKey] = useState(0);
    const [typedText, setTypedText] = useState('');
    const [algoIndex, setAlgoIndex] = useState(0);

    const algorithms = [
        "> R U R' U' (T-Perm)",
        "> F2 L' U' L U F2 (Cross)",
        "> x' R U' R' D R U R' D' (A-Perm)"
    ];

    // GSAP scroll reveal
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(
                '.feature-card',
                { y: 60, opacity: 0 },
                {
                    scrollTrigger: {
                        trigger: containerRef.current,
                        start: 'top 85%',
                    },
                    y: 0,
                    opacity: 1,
                    stagger: 0.15,
                    duration: 1,
                    ease: 'power3.out',
                }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    // Card 1: Diagnostic Shuffler Array Cycling
    useEffect(() => {
        const interval = setInterval(() => {
            setShufflerKey(prev => prev + 1);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Card 2: Telemetry Typewriter Effect
    useEffect(() => {
        let currentText = '';
        const currentAlgo = algorithms[algoIndex];
        let charIndex = 0;

        // Typing simulation
        const typingInterval = setInterval(() => {
            if (charIndex < currentAlgo.length) {
                currentText += currentAlgo.charAt(charIndex);
                setTypedText(currentText);
                charIndex++;
            } else {
                clearInterval(typingInterval);
                // Wait 2s before switching to next algo
                setTimeout(() => {
                    setAlgoIndex((prev) => (prev + 1) % algorithms.length);
                }, 2000);
            }
        }, 50);

        return () => clearInterval(typingInterval);
    }, [algoIndex]);

    // Card 3: Cursor Protocol Scheduler Animation
    const schedulerRef = useRef(null);
    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ repeat: -1 });

            // Cursor starts offscreen
            tl.set('.anim-cursor', { x: -20, y: -20, opacity: 0 })
                .set('.anim-cell-wed', { scale: 1, backgroundColor: 'transparent' })

            // Enter and move to Wednesday
            tl.to('.anim-cursor', { opacity: 1, duration: 0.3 })
                .to('.anim-cursor', { x: 120, y: 80, duration: 1, ease: 'power2.inOut' }) // Move to Wed box

            // Click simulation
            tl.to('.anim-cell-wed', { scale: 0.95, duration: 0.15 })
                .to('.anim-cell-wed', { scale: 1, backgroundColor: '#CC1A1A', color: 'white', duration: 0.15 })

            // Move to Save button
            tl.to('.anim-cursor', { x: 180, y: 140, duration: 0.8, ease: 'power2.inOut', delay: 0.5 })

            // Click save
            tl.to('.anim-btn-save', { scale: 0.95, duration: 0.15 })
                .to('.anim-btn-save', { scale: 1, duration: 0.15 })

            // Fade out
            tl.to('.anim-cursor', { opacity: 0, duration: 0.3, delay: 0.5 })

            // Reset after full loop
            tl.set('.anim-cell-wed', { backgroundColor: 'transparent', color: 'currentColor', delay: 0.5 });

        }, schedulerRef);
        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={containerRef}
            className="w-full bg-dictator-smoke py-32 px-6 lg:px-12 relative overflow-hidden"
        >
            <div className="max-w-7xl mx-auto">

                {/* Section Header */}
                <div className="mb-16">
                    <p className="font-mono text-xs uppercase tracking-widest text-dictator-red mb-4">
            // CORE SYSTEMS
                    </p>
                    <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-dictator-charcoal mb-6">
                        Built for Mastery
                    </h2>
                    <p className="font-body text-xl text-dictator-chrome max-w-2xl">
                        Pattern recognition over rote memorization. We provide the tools to build intuition — the kind that makes algorithms feel obvious.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Card 1: Diagnostic Shuffler */}
                    <div className="feature-card bg-white border border-dictator-chrome/20 rounded-[2rem] p-8 shadow-xl shadow-black/5 flex flex-col items-start h-full">

                        <div className="w-full h-[200px] mb-8 bg-dictator-void/5 rounded-2xl flex items-center justify-center relative shadow-inner overflow-hidden">
                            {/* Force re-render of canvas animation via key to trigger small jump effect */}
                            <Canvas key={shufflerKey} camera={{ position: [0, 0, 5], fov: 40 }} className="w-full h-full pointer-events-none">
                                <ambientLight intensity={0.5} />
                                <directionalLight position={[2, 5, 2]} intensity={1} />
                                <RubiksCube3D />
                            </Canvas>
                            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full border border-dictator-chrome/20">
                                <div className="w-2 h-2 rounded-full bg-dictator-red status-pulse"></div>
                                <span className="font-mono text-[10px] sm:text-xs text-dictator-charcoal font-bold tracking-widest">SIM.ACTIVE</span>
                            </div>
                        </div>

                        <h3 className="font-heading text-2xl font-bold text-dictator-charcoal mb-4">
                            Interactive 3D Simulator
                        </h3>
                        <p className="font-body text-dictator-chrome leading-relaxed">
                            Manipulate every face, layer, and slice. Watch the cube respond in real time with full physics feedback.
                        </p>
                    </div>

                    {/* Card 2: Telemetry Typewriter */}
                    <div className="feature-card bg-white border border-dictator-chrome/20 rounded-[2rem] p-8 shadow-xl shadow-black/5 flex flex-col items-start h-full">

                        <div className="w-full h-[200px] mb-8 bg-dictator-void rounded-2xl flex flex-col relative shadow-inner overflow-hidden border border-dictator-chrome/30 p-5">
                            <div className="flex items-center justify-between mb-4 border-b border-dictator-chrome/20 pb-2">
                                <span className="font-mono text-xs text-dictator-chrome tracking-widest uppercase">ALGO.FEED</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-dictator-red cursor-blink"></div>
                                    <span className="font-mono text-[10px] font-bold text-dictator-red uppercase tracking-wide">Live</span>
                                </div>
                            </div>

                            <div className="flex-1 font-mono text-sm text-[#FFD700]/90 leading-relaxed font-medium">
                                {typedText}
                                <span className="inline-block w-2 text-dictator-red cursor-blink ml-1">█</span>
                            </div>
                        </div>

                        <h3 className="font-heading text-2xl font-bold text-dictator-charcoal mb-4">
                            Guided Algorithms
                        </h3>
                        <p className="font-body text-dictator-chrome leading-relaxed">
                            From beginner cross to advanced OLL/PLL. Every algorithm explained, visualized, and drilled.
                        </p>
                    </div>

                    {/* Card 3: Cursor Protocol Scheduler */}
                    <div className="feature-card bg-white border border-dictator-chrome/20 rounded-[2rem] p-8 shadow-xl shadow-black/5 flex flex-col items-start h-full">

                        <div ref={schedulerRef} className="w-full h-[200px] mb-8 bg-dictator-void/5 rounded-2xl flex flex-col relative shadow-inner overflow-hidden border border-dictator-chrome/10 p-5">

                            <div className="flex justify-between items-center mb-6 border-b border-dictator-chrome/20 pb-2">
                                <span className="font-mono text-xs text-dictator-charcoal font-bold tracking-widest uppercase">PROGRESS.LOG</span>
                            </div>

                            {/* Weekly Grid */}
                            <div className="grid grid-cols-7 gap-2 mb-6">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2">
                                        <span className="font-mono text-[10px] text-dictator-chrome">{day}</span>
                                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md border border-dictator-chrome/30 flex items-center justify-center transition-colors
                      ${i === 3 ? 'anim-cell-wed' : i < 3 ? 'bg-dictator-chrome/20' : ''}
                    `}></div>
                                    </div>
                                ))}
                            </div>

                            {/* Save Button */}
                            <div className="mt-auto flex justify-end">
                                <div className="anim-btn-save bg-dictator-chrome/80 text-white font-mono text-[10px] font-bold px-4 py-1.5 rounded uppercase tracking-wider">
                                    Save
                                </div>
                            </div>

                            {/* SVG Cursor Pointer */}
                            <svg
                                className="anim-cursor absolute top-0 left-0 w-5 h-5 drop-shadow-md z-10 text-dictator-charcoal origin-top-left"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M5.5 2.5L20 12L12 14.5L8.5 22L5.5 2.5Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                            </svg>

                        </div>

                        <h3 className="font-heading text-2xl font-bold text-dictator-charcoal mb-4">
                            Track Your Progress
                        </h3>
                        <p className="font-body text-dictator-chrome leading-relaxed">
                            Daily practice streaks. Solve time graphs. Personal bests. Watch yourself go from minutes to seconds.
                        </p>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default Features;
