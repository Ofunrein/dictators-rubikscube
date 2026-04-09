import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Canvas } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import RubiksCube3D from './RubiksCube3D';

const Hero = () => {
    const containerRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Stagger reveal text elements
            gsap.fromTo(
                '.hero-stagger',
                { y: 50, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 1,
                    stagger: 0.08,
                    ease: 'power3.out',
                }
            );

            // Fade in 3D canvas slightly delayed
            gsap.fromTo(
                '.hero-canvas-container',
                { opacity: 0, scale: 0.8 },
                {
                    opacity: 1,
                    scale: 1,
                    duration: 1.5,
                    delay: 0.4,
                    ease: 'power2.out',
                }
            );
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            id="hero"
            ref={containerRef}
            className="relative min-h-[100dvh] w-full bg-dictator-void overflow-hidden flex flex-col md:flex-row"
        >
            {/* Background Layers */}
            <div className="absolute inset-x-0 bottom-0 top-1/2 bg-[radial-gradient(ellipse_at_30%_70%,rgba(204,26,26,0.1)_0%,transparent_60%)] pointer-events-none z-0"></div>

            {/* Binary Rain CSS Animation */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className="binary-column"
                        style={{
                            left: `${i * 7}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${10 + Math.random() * 10}s`
                        }}
                    >
                        {Array(30).fill(0).map(() => Math.round(Math.random())).join('\n')}
                    </div>
                ))}
            </div>

            {/* Content Column (Left) */}
            <div className="relative z-10 w-full md:w-[60%] flex flex-col justify-center px-6 pt-32 pb-12 md:pl-24 lg:pl-32 xl:pl-40 h-full">

                <div className="hero-stagger opacity-0 mb-6">
                    <span className="font-mono text-xs uppercase tracking-superwide text-dictator-chrome">
                        {'//'} INTERACTIVE LEARNING PLATFORM
                    </span>
                </div>

                <h1 className="flex flex-col mb-8">
                    <span className="hero-stagger opacity-0 font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2">
                        Conquer the
                    </span>
                    <span className="hero-stagger opacity-0 font-drama text-7xl md:text-[8rem] lg:text-[10rem] xl:text-[12rem] leading-[0.85] text-dictator-red uppercase tracking-tight transform -ml-1">
                        Cube.
                    </span>
                </h1>

                <p className="hero-stagger opacity-0 font-body text-lg md:text-xl text-dictator-chrome max-w-md mb-12">
                    Real-time 3D simulation. Step-by-step algorithms. Progress you can see.
                </p>

                <div className="hero-stagger opacity-0 flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-16">
                    <button
                        onClick={() => navigate('/simulator')}
                        className="btn-magnetic bg-dictator-red text-white px-8 py-4 rounded-full font-body text-lg font-bold tracking-wide">
                        <span>Start Solving</span>
                    </button>

                    <a href="#demo" className="text-dictator-chrome font-body font-medium hover:text-white transition-colors underline underline-offset-4 decoration-dictator-chrome/30 hover:decoration-white/70">
                        Watch Demo
                    </a>
                </div>

                {/* Desktop Stat Bar */}
                <div className="hero-stagger opacity-0 hidden md:flex items-center gap-4 font-mono text-xs text-dictator-chrome mt-auto">
                    <span>43 ALGORITHMS</span>
                    <span className="w-px h-3 bg-dictator-chrome/50"></span>
                    <span>REAL-TIME 3D</span>
                    <span className="w-px h-3 bg-dictator-chrome/50"></span>
                    <span>MULTIPLAYER READY</span>
                </div>

            </div>

            {/* 3D Canvas Column (Right) */}
            <div className="relative z-10 w-full md:w-[40%] h-[50vh] md:h-full flex items-center justify-center pt-0 md:pt-16 pb-12 overflow-visible">
                <div className="hero-canvas-container opacity-0 w-full h-full max-w-[600px] aspect-square absolute right-0 md:right-12 xl:right-24 top-1/2 -translate-y-1/2 scale-150 md:scale-110 lg:scale-[1.3] z-20">
                    <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
                        <ambientLight intensity={0.4} />
                        <directionalLight position={[5, 5, 5]} intensity={0.8} />
                        <pointLight position={[-5, -5, -5]} color="#CC1A1A" intensity={0.5} distance={20} />

                        <RubiksCube3D />
                    </Canvas>
                </div>
            </div>

        </section>
    );
};

export default Hero;
