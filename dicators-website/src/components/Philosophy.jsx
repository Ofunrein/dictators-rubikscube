import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Canvas, useFrame } from '@react-three/fiber';
import { Edges, Float } from '@react-three/drei';

// Helper component for floating wireframes
const FloatingCube = ({ position, rotationSpeed, scale }) => {
    const meshRef = useRef();

    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.rotation.x += rotationSpeed.x;
            meshRef.current.rotation.y += rotationSpeed.y;
        }
    });

    return (
        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
            <mesh ref={meshRef} position={position} scale={scale}>
                <boxGeometry args={[1, 1, 1]} />
                <Edges scale={1.0} threshold={15} color="#B0B0B0" />
                <meshBasicMaterial transparent opacity={0.0} color="#0D0D0D" />
            </mesh>
        </Float>
    );
};

// Main Philosophy Component
const Philosophy = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Background Image Parallax
            gsap.fromTo(
                '.philosophy-bg-image',
                { y: '-10%' },
                {
                    y: '10%',
                    ease: 'none',
                    scrollTrigger: {
                        trigger: containerRef.current,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: true,
                    }
                }
            );

            // Text Reveal Animation
            const lines = gsap.utils.toArray('.phil-line');

            lines.forEach((line, index) => {
                gsap.fromTo(line,
                    { y: 30, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 1.2,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: containerRef.current,
                            start: 'top 65%',
                        },
                        delay: index * 0.15
                    }
                );
            });

            // Special scale up for the massive text
            gsap.fromTo(
                '.phil-massive-text',
                { scale: 0.95, opacity: 0, y: 30 },
                {
                    scale: 1,
                    opacity: 1,
                    y: 0,
                    duration: 1.5,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: containerRef.current,
                        start: 'top 65%',
                    },
                    delay: 0.3
                }
            );

        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={containerRef}
            className="relative w-full py-40 bg-dictator-void overflow-hidden flex items-center justify-center"
        >
            {/* 1. Parallaxing Texture Image */}
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none overflow-hidden">
                <img
                    src="https://images.unsplash.com/photo-1550684376-efcb6e0526f5?w=1920&q=80"
                    alt="Dark Technology Abstract Texture"
                    className="philosophy-bg-image w-[120%] h-[120%] object-cover -mx-[10%] -my-[10%]"
                />
            </div>

            {/* 2. Floating Wireframe Cubes Decor */}
            <div className="absolute inset-0 z-[1] pointer-events-none opacity-20">
                <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
                    <ambientLight intensity={1} />
                    {/* Top Left */}
                    <FloatingCube position={[-6, 3, -5]} rotationSpeed={{ x: 0.002, y: 0.003 }} scale={0.8} />
                    {/* Top Right */}
                    <FloatingCube position={[7, 4, -8]} rotationSpeed={{ x: 0.001, y: -0.002 }} scale={1.2} />
                    {/* Bottom Right */}
                    <FloatingCube position={[5, -4, -3]} rotationSpeed={{ x: -0.003, y: 0.002 }} scale={0.7} />
                    {/* Bottom Left */}
                    <FloatingCube position={[-8, -2, -6]} rotationSpeed={{ x: 0.002, y: -0.001 }} scale={1} />
                    {/* Far Left */}
                    <FloatingCube position={[-12, 1, -10]} rotationSpeed={{ x: 0.001, y: 0.001 }} scale={1.5} />
                </Canvas>
            </div>

            {/* 3. Text Content */}
            <div className="relative z-10 max-w-4xl mx-auto px-6 text-center md:text-left pt-12">
                <h2 className="flex flex-col gap-2">

                    <div className="phil-line flex flex-col md:flex-row md:items-baseline gap-2 mb-2">
                        <span className="font-body text-xl md:text-3xl text-dictator-chrome font-normal">
                            Most tutorials teach you to
                        </span>
                        <span className="font-body text-xl md:text-3xl text-white font-semibold">
                            memorize algorithms.
                        </span>
                    </div>

                    <div className="flex flex-col mt-4">
                        <span className="phil-line font-body text-xl md:text-3xl text-dictator-chrome font-normal mb-2">
                            We teach you to
                        </span>
                        <span className="phil-massive-text font-drama text-6xl sm:text-7xl md:text-8xl lg:text-[9rem] leading-none text-dictator-red uppercase">
                            see the cube.
                        </span>
                    </div>

                </h2>

                {/* Separator */}
                <div className="phil-line w-24 h-px bg-dictator-chrome opacity-20 my-10 md:ml-0 mx-auto"></div>

                {/* Supporting text */}
                <p className="phil-line font-body text-base md:text-lg text-dictator-chrome max-w-[500px] leading-relaxed mx-auto md:mx-0">
                    Pattern recognition over rote memorization. Spatial reasoning over cheat sheets. We build intuition — the kind that makes algorithms feel obvious.
                </p>
            </div>

        </section>
    );
};

export default Philosophy;
