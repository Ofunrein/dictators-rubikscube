import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Canvas } from '@react-three/fiber';
import { Edges } from '@react-three/drei';

const Protocol = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        // We create a ScrollTrigger that pins the entire section container
        // and animates the cards based on scroll progress
        const ctx = gsap.context(() => {

            const cards = gsap.utils.toArray('.protocol-card');
            const totalCards = cards.length;

            // Pin the section and link animations to scrub
            ScrollTrigger.create({
                trigger: containerRef.current,
                start: "top top",
                end: `+=${totalCards * 100}%`,
                pin: true,
                scrub: 1,
                animation: gsap.timeline()
                    // Set initial states explicitly for cards 2 and 3 so they sit below the viewport
                    .set('.card-2, .card-3', { yPercent: 100, opacity: 0 })

                    // Sequence 1: Shift Card 1 back, pull Card 2 up
                    .to('.card-1', { scale: 0.95, filter: 'blur(8px)', opacity: 0.6, ease: 'power1.inOut' }, 0)
                    .to('.card-2', { yPercent: 0, opacity: 1, ease: 'power1.inOut' }, 0)

                    // Sequence 2: Shift Cards 1 and 2 back, pull Card 3 up
                    .to('.card-1', { scale: 0.9, filter: 'blur(12px)', opacity: 0.3, ease: 'power1.inOut' }, 1)
                    .to('.card-2', { scale: 0.95, filter: 'blur(8px)', opacity: 0.6, ease: 'power1.inOut' }, 1)
                    .to('.card-3', { yPercent: 0, opacity: 1, ease: 'power1.inOut' }, 1)
            });

        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            id="learn"
            ref={containerRef}
            className="relative w-full h-screen bg-dictator-smoke overflow-hidden"
        >

            {/* Decorative Circuit Lines background */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #0D0D0D 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>

            {/* Cards Container */}
            <div className="relative w-full h-full flex items-center justify-center p-6 md:p-12">

                {/* CARD 1: Understand */}
                <div className="protocol-card card-1 absolute inset-6 md:inset-12 bg-dictator-void border border-dictator-chrome/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row shadow-black/40 z-10 origin-top">

                    <div className="w-full md:w-[60%] h-1/2 md:h-full flex flex-col justify-center p-12 md:p-20 relative z-10">
                        <span className="absolute top-12 left-12 md:top-20 md:left-20 font-mono text-[8rem] md:text-[14rem] leading-none text-dictator-red font-bold opacity-10 select-none z-0">
                            01
                        </span>
                        <div className="relative z-10">
                            <h3 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">Learn the Language</h3>
                            <p className="font-body text-xl text-dictator-chrome max-w-lg leading-relaxed">
                                Cube notation, face names, piece types. Build the mental model that makes every algorithm click.
                            </p>
                        </div>
                    </div>

                    <div className="w-full md:w-[40%] h-1/2 md:h-full bg-[#111111] border-t md:border-t-0 md:border-l border-dictator-chrome/10 relative overflow-hidden flex items-center justify-center p-10">
                        <Canvas camera={{ position: [0, 0, 8], fov: 40 }} className="w-full h-full relative z-10 pointer-events-none">
                            <ambientLight intensity={1} />
                            <mesh>
                                <boxGeometry args={[3, 3, 3]} />
                                <Edges scale={1.05} threshold={15} color="#CC1A1A" />
                                <meshBasicMaterial transparent opacity={0.05} color="#B0B0B0" />
                            </mesh>
                        </Canvas>
                    </div>
                </div>

                {/* CARD 2: Practice */}
                <div className="protocol-card card-2 absolute inset-6 md:inset-12 bg-dictator-void border border-dictator-chrome/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row shadow-black/40 z-20 origin-top">

                    <div className="w-full md:w-[60%] h-1/2 md:h-full flex flex-col justify-center p-12 md:p-20 relative z-10">
                        <span className="absolute top-12 left-12 md:top-20 md:left-20 font-mono text-[8rem] md:text-[14rem] leading-none text-dictator-red font-bold opacity-10 select-none z-0">
                            02
                        </span>
                        <div className="relative z-10">
                            <h3 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">Follow the Path</h3>
                            <p className="font-body text-xl text-dictator-chrome max-w-lg leading-relaxed">
                                Guided solves walk you through each stage. Cross, F2L, OLL, PLL — one layer at a time.
                            </p>
                        </div>
                    </div>

                    <div className="w-full md:w-[40%] h-1/2 md:h-full bg-[#111111] border-t md:border-t-0 md:border-l border-dictator-chrome/10 relative overflow-hidden p-10 flex items-center justify-center">

                        {/* Scanning Laser Animation */}
                        <div className="relative w-[200px] h-[300px] border border-dictator-chrome/20 flex flex-col">
                            {/* 9x9 Grid dots */}
                            <div className="absolute inset-0 grid grid-cols-5 grid-rows-7 gap-[2px] p-2 opacity-30">
                                {Array.from({ length: 35 }).map((_, i) => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-dictator-chrome place-self-center"></div>
                                ))}
                            </div>
                            {/* Laser */}
                            <div className="absolute left-0 right-0 h-0.5 bg-dictator-red shadow-[0_0_15px_#CC1A1A] animate-[scanline_3s_linear_infinite] z-20"></div>
                        </div>

                    </div>
                </div>

                {/* CARD 3: Compete */}
                <div className="protocol-card card-3 absolute inset-6 md:inset-12 bg-dictator-void border border-dictator-chrome/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row shadow-black/40 z-30 origin-top">

                    <div className="w-full md:w-[60%] h-1/2 md:h-full flex flex-col justify-center p-12 md:p-20 relative z-10">
                        <span className="absolute top-12 left-12 md:top-20 md:left-20 font-mono text-[8rem] md:text-[14rem] leading-none text-dictator-red font-bold opacity-10 select-none z-0">
                            03
                        </span>
                        <div className="relative z-10">
                            <h3 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">Prove Your Speed</h3>
                            <p className="font-body text-xl text-dictator-chrome max-w-lg leading-relaxed">
                                Timed solves. Leaderboards. Multiplayer races. Turn practice into performance.
                            </p>
                        </div>
                    </div>

                    <div className="w-full md:w-[40%] h-1/2 md:h-full bg-[#111111] border-t md:border-t-0 md:border-l border-dictator-chrome/10 relative overflow-hidden flex items-center justify-center">

                        {/* EKG Waveform Component */}
                        <div className="w-full px-12 relative h-[200px] flex items-center overflow-hidden bg-gradient-to-r from-transparent via-[#0D0D0D]/50 to-transparent">
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 100" preserveAspectRatio="none">
                                {/* Grid lines */}
                                <path d="M0,50 L500,50" stroke="#B0B0B0" strokeWidth="1" strokeOpacity="0.1" />
                                <path d="M0,25 L500,25" stroke="#B0B0B0" strokeWidth="1" strokeOpacity="0.1" />
                                <path d="M0,75 L500,75" stroke="#B0B0B0" strokeWidth="1" strokeOpacity="0.1" />

                                {/* Animated Wave */}
                                <path
                                    d="M0,50 L100,50 L120,20 L140,80 L160,50 L250,50 C280,50 300,70 330,40 C360,10 380,50 400,50 L500,50"
                                    fill="none"
                                    stroke="#CC1A1A"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeDasharray="1000"
                                    strokeDashoffset="1000"
                                    className="animate-[dash_4s_linear_infinite]"
                                    style={{ filter: 'drop-shadow(0 0 8px rgba(204,26,26,0.5))' }}
                                />

                                <style>{`
                   @keyframes dash {
                     to { stroke-dashoffset: 0; }
                   }
                 `}</style>
                            </svg>
                        </div>

                    </div>
                </div>

            </div>
        </section>
    );
};

export default Protocol;
