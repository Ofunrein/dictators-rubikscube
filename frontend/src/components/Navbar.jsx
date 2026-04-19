/**
 * Navigation bar at the top of the landing page. Shows the team logo and
 * name, navigation links (Features, Protocol, Team), and a "Launch Simulator"
 * button. Collapses into a hamburger menu on mobile. Changes background
 * opacity when the user scrolls down (so it gets a dark backdrop). Uses GSAP
 * for smooth animation on the menu toggle.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import gsap from 'gsap';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        // We use IntersectionObserver on the hero section to trigger the navbar morph
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsScrolled(!entry.isIntersecting);
            },
            { rootMargin: '-10% 0px 0px 0px' }
        );

        const hero = document.getElementById('hero');
        if (hero) observer.observe(hero);

        return () => {
            if (hero) observer.unobserve(hero);
        };
    }, []);

    const navLinks = [
        { label: 'Learn', href: '#learn' },
        { label: 'Compete', href: '#compete' },
        { label: 'Team', href: '#team' },
    ];

    return (
        <>
            {/* Desktop & Mobile Navbar Container */}
            <nav
                ref={navRef}
                className={`fixed left-1/2 -translate-x-1/2 top-4 z-[100] transition-all duration-300 ease-out border overflow-hidden
          ${isScrolled
                        ? 'w-[95%] md:w-auto px-6 py-3 bg-dictator-void/80 backdrop-blur-xl border-dictator-chrome/20 rounded-full shadow-lg'
                        : 'w-[95%] md:w-auto px-6 py-4 bg-transparent border-transparent rounded-[2rem]'}
        `}
            >
                <div className="flex items-center justify-between md:gap-12">

                    {/* Logo Area */}
                    <div className="flex items-center gap-3 cursor-pointer group">
                        <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border-2 border-dictator-red/30 flex items-center justify-center font-mono text-dictator-red text-xs font-bold leading-none select-none">
                            TD
                        </div>
                        <span className={`font-heading tracking-[0.15em] text-sm font-bold uppercase transition-colors duration-300
              ${isScrolled ? 'text-dictator-smoke' : 'text-white'}
            `}>
                            The Dictators
                        </span>
                    </div>

                    {/* Desktop Nav Links */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            link.isRoute ? (
                                <button
                                    key={link.label}
                                    onClick={() => navigate(link.href)}
                                    className={`font-mono text-xs uppercase tracking-widest relative group transition-all duration-300 hover:-translate-y-[1px] bg-transparent border-none cursor-pointer
                      ${isScrolled ? 'text-dictator-chrome hover:text-dictator-smoke' : 'text-white/70 hover:text-white'}
                    `}
                                >
                                    {link.label}
                                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-dictator-red transition-all duration-300 group-hover:w-full"></span>
                                </button>
                            ) : (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    className={`font-mono text-xs uppercase tracking-widest relative group transition-all duration-300 hover:-translate-y-[1px]
                      ${isScrolled ? 'text-dictator-chrome hover:text-dictator-smoke' : 'text-white/70 hover:text-white'}
                    `}
                                >
                                    {link.label}
                                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-dictator-red transition-all duration-300 group-hover:w-full"></span>
                                </a>
                            )
                        ))}
                    </div>

                    {/* CTA Button (Desktop) & Mobile Toggle */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/simulator')}
                            className="hidden md:block btn-magnetic bg-dictator-red text-white px-6 py-2 rounded-full font-body text-sm font-semibold tracking-wide border border-transparent hover:border-dictator-red/50">
                            <span>Start Solving</span>
                        </button>

                        <button
                            className="block md:hidden text-white p-1 focus-ring rounded-md"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>

                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <div
                className={`fixed inset-0 z-[90] bg-dictator-void/95 backdrop-blur-3xl transition-opacity duration-300 ease-in-out md:hidden flex flex-col justify-center items-center gap-8
          ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
                {navLinks.map((link, i) => (
                    <a
                        key={link.label}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="font-heading text-4xl uppercase tracking-tighter text-white hover:text-dictator-red transition-colors"
                        style={{ transitionDelay: `${i * 50}ms`, transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(20px)', opacity: mobileMenuOpen ? 1 : 0 }}
                    >
                        {link.label}
                    </a>
                ))}
                <button
                    onClick={() => { setMobileMenuOpen(false); navigate('/simulator'); }}
                    className="mt-8 btn-magnetic bg-dictator-red text-white px-10 py-4 rounded-full font-body text-lg font-bold w-[200px]"
                    style={{ transitionDelay: '200ms', transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(20px)', opacity: mobileMenuOpen ? 1 : 0 }}
                >
                    <span>Start Solving</span>
                </button>
            </div>
        </>
    );
};

export default Navbar;
