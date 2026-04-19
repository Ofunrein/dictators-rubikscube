/**
 * Team section -- shows all team members with their names, initials, and roles.
 * Each member gets a card with their role description. Uses GSAP for staggered
 * scroll-triggered animations (cards fade in one by one as you scroll).
 */
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

const Team = () => {
    const containerRef = useRef(null);

    const teamMembers = [
        { name: 'Kyle', initials: 'KY', role: 'Backend Dev, System Architecture, ML Integration' },
        { name: 'Eric S.', initials: 'ES', role: 'Frontend Dev, UI/UX, Design' },
        { name: 'Eric O.', initials: 'EO', role: 'Backend Development' },
        { name: 'Martin', initials: 'MT', role: 'Testing, QA, Documentation, Scrum Support' },
        { name: 'Corey', initials: 'CR', role: 'Documentation, Full Stack' },
    ];

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(
                '.team-card',
                { y: 40, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    stagger: 0.1,
                    duration: 0.8,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: containerRef.current,
                        start: 'top 80%',
                    }
                }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <section
            id="team"
            ref={containerRef}
            className="w-full bg-dictator-void py-32 px-6 lg:px-12 relative overflow-hidden"
        >
            <div className="max-w-7xl mx-auto relative z-10">

                {/* Section Header */}
                <div className="mb-16">
                    <p className="font-mono text-xs uppercase tracking-widest text-dictator-red mb-4">
            // THE SQUAD
                    </p>
                    <h2 className="font-heading text-4xl md:text-5xl font-bold text-white">
                        Command Roster
                    </h2>
                </div>

                {/* Team Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    {teamMembers.map((member, index) => (
                        <div
                            key={index}
                            className={`team-card bg-[#1A1A1A] border border-dictator-chrome/10 rounded-[2rem] relative p-6 pt-10 flex flex-col hover:border-dictator-chrome/30 transition-colors
                ${index === 4 ? 'sm:col-span-2 lg:col-span-1 sm:w-1/2 sm:mx-auto lg:w-full' : ''}
              `}
                        >
                            {/* Red Top Accent Line */}
                            <div className="absolute top-0 left-0 right-0 h-[3px] bg-dictator-red rounded-t-[2rem]"></div>

                            {/* Avatar Initial Circle */}
                            <div className="w-16 h-16 rounded-full bg-dictator-void border-2 border-dictator-red/30 flex items-center justify-center mb-6 shadow-inner">
                                <span className="font-mono text-lg text-dictator-red font-bold">
                                    {member.initials}
                                </span>
                            </div>

                            {/* Info */}
                            <h3 className="font-heading text-xl font-bold text-white mb-2">
                                {member.name}
                            </h3>
                            <p className="font-mono text-[10px] leading-relaxed uppercase tracking-widest text-dictator-chrome">
                                {member.role}
                            </p>

                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
};

export default Team;
