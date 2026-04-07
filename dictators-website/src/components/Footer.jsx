import React from 'react';

const Footer = () => {
    return (
        <footer className="w-full bg-dictator-void rounded-t-[4rem] px-6 lg:px-12 pt-20 pb-10 relative overflow-hidden -mt-8 z-10">

            {/* Decorative Floating Cubes (Background) */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, #B0B0B0 1px, transparent 0)', backgroundSize: '80px 80px' }}></div>
            <div className="scanline"></div>

            <div className="max-w-7xl mx-auto relative z-10">

                {/* Top Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">

                    {/* Column 1: Brand */}
                    <div className="col-span-1 md:col-span-1 flex flex-col items-start text-left">
                        <div className="w-10 h-10 rounded-full bg-[#1A1A1A] border-2 border-dictator-red/40 flex items-center justify-center font-mono text-dictator-red text-xs font-bold leading-none select-none mb-6">
                            TD
                        </div>
                        <h3 className="font-heading text-2xl uppercase font-bold text-white tracking-[0.1em] mb-4">
                            The Dictators
                        </h3>
                        <p className="font-body text-sm text-dictator-chrome max-w-xs leading-relaxed">
                            We bring order to software chaos.
                        </p>
                    </div>

                    {/* Column 2: Platform Links */}
                    <div className="col-span-1 flex flex-col items-start gap-4">
                        <h4 className="font-heading text-lg font-bold text-white mb-2">Platform</h4>
                        {['Learn', 'Simulator', 'Compete', 'Progress'].map(link => (
                            <a key={link} href={`#${link.toLowerCase()}`} className="font-mono text-xs text-dictator-chrome hover:text-white transition-all duration-300 hover:-translate-y-[1px]">
                                {link}
                            </a>
                        ))}
                    </div>

                    {/* Column 3: Company Links */}
                    <div className="col-span-1 flex flex-col items-start gap-4">
                        <h4 className="font-heading text-lg font-bold text-white mb-2">Company</h4>
                        {['Team', 'About', 'Contact', 'GitHub'].map(link => (
                            <a key={link} href={`#${link.toLowerCase()}`} className="font-mono text-xs text-dictator-chrome hover:text-white transition-all duration-300 hover:-translate-y-[1px]">
                                {link}
                            </a>
                        ))}
                    </div>

                    {/* Column 4: Legal Links */}
                    <div className="col-span-1 flex flex-col items-start gap-4">
                        <h4 className="font-heading text-lg font-bold text-white mb-2">Legal</h4>
                        {['Privacy', 'Terms', 'Cookies'].map(link => (
                            <a key={link} href={`#${link.toLowerCase()}`} className="font-mono text-xs text-dictator-chrome hover:text-white transition-all duration-300 hover:-translate-y-[1px]">
                                {link}
                            </a>
                        ))}
                    </div>

                </div>

                {/* Bottom Bar */}
                <div className="border-t border-dictator-chrome/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-6">

                    <p className="font-mono text-xs text-dictator-chrome/50">
                        ┬⌐ 2026 The Dictators. All rights reserved.
                    </p>

                    <div className="flex items-center gap-3 bg-[#1A1A1A] px-4 py-2 rounded-full border border-dictator-chrome/10">
                        <div className="w-2 h-2 rounded-full bg-dictator-red status-pulse"></div>
                        <span className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-dictator-chrome font-medium">
                            System Operational
                        </span>
                    </div>

                </div>

            </div>
        </footer>
    );
};

export default Footer;
