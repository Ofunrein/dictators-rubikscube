import React from 'react';

const CTA = () => {
    return (
        <section className="relative w-full bg-dictator-red py-24 px-6 md:px-12 rounded-[4rem] text-center flex flex-col items-center justify-center -mx-4 md:-mx-8 z-20 shadow-2xl">

            {/* Background Texture Overlay to break flat color */}
            <div
                className="absolute inset-0 pointer-events-none opacity-20 rounded-[4rem]"
                style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'noiseFilter\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/></filter><rect width=\'100%\' height=\'100%\' filter=\'url(%23noiseFilter)\'/></svg>")' }}
            ></div>

            <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">

                <h2 className="font-drama text-4xl sm:text-5xl md:text-7xl lg:text-[5.5rem] leading-[0.9] text-white uppercase tracking-tight mb-6">
                    Ready to Conquer the Cube?
                </h2>

                <p className="font-body text-lg md:text-xl text-white/90 mb-10 max-w-md">
                    Free. No sign-up required to start learning.
                </p>

                <button className="btn-magnetic group bg-white text-dictator-red font-bold rounded-full px-12 py-5 shadow-xl transition-all hover:shadow-[#0D0D0D]/20 mb-6 border border-transparent">
                    {/* Default state */}
                    <span className="relative z-10 transition-colors duration-300 group-hover:text-white font-body text-xl tracking-wide">
                        Start Solving
                    </span>
                    {/* Hover background layer */}
                    <div className="absolute inset-0 bg-dictator-void -translate-x-full group-hover:translate-x-0 transition-transform duration-400 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] z-0 rounded-full object-cover"></div>
                </button>

                <p className="font-mono text-[10px] md:text-xs text-white/50 uppercase tracking-widest font-medium">
                    43 algorithms · Unlimited practice · Real-time 3D
                </p>

            </div>
        </section >
    );
};

export default CTA;
