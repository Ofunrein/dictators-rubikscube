/**
 * LearnPage.jsx — /learn route — placeholder for future learning content
 *
 * The learning system is not built yet. This page holds space in the nav so
 * the route exists and teammates can link to it. It shows planned feature cards
 * (Beginner Method, CFOP, Video Guides, Algorithm Trainer) so visitors know
 * what is coming rather than hitting a dead link.
 *
 * When the learning system is built, replace this file's content with real
 * lesson components. The route (/learn), PageNavbar, and ThemeContext wiring
 * can stay as-is.
 */
import { useNavigate } from 'react-router-dom';
import { BookOpen, Play, Trophy, Zap } from 'lucide-react';
import PageNavbar from '../components/PageNavbar';
import { useTheme } from '../context/ThemeContext';

const COMING_SOON = [
  { icon: BookOpen, label: 'Beginner Method', desc: 'Layer-by-layer fundamentals' },
  { icon: Zap, label: 'CFOP / Fridrich', desc: 'F2L, OLL, PLL algorithms' },
  { icon: Play, label: 'Video Guides', desc: 'Step-by-step walkthroughs' },
  { icon: Trophy, label: 'Algorithm Trainer', desc: 'Drill recognition & execution' },
];

export default function LearnPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const muted = isDark ? 'text-dictator-chrome' : 'text-dictator-ink/75';
  const cardBorder = isDark ? 'border-white/8' : 'border-dictator-ink/20';
  const cardBg = isDark ? 'bg-white/[0.03]' : 'bg-white shadow-sm';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDark ? 'bg-dictator-void text-white' : 'bg-dictator-smoke text-dictator-ink'
    }`}>
      <PageNavbar />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-dictator-red mb-4">
          Coming Soon
        </p>
        <h1 className={`font-drama text-6xl md:text-8xl uppercase tracking-tight mb-4 text-center ${
          isDark ? 'text-white' : 'text-dictator-ink'
        }`}>
          Learn
        </h1>
        <p className={`font-body text-center max-w-sm mb-16 text-sm ${muted}`}>
          Guides, algorithms, and training tools are on the way. Here's what's planned.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          {COMING_SOON.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className={`flex items-start gap-4 rounded-xl px-5 py-4 border transition-colors ${cardBg} ${cardBorder}`}
            >
              <div className="mt-0.5 text-dictator-red shrink-0">
                <Icon size={16} />
              </div>
              <div>
                <p className={`font-heading text-sm mb-0.5 ${isDark ? 'text-white' : 'text-dictator-ink'}`}>{label}</p>
                <p className={`font-mono text-[11px] ${muted}`}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/simulator')}
          className="mt-12 bg-dictator-red hover:bg-dictator-deep text-white font-mono text-xs uppercase tracking-widest px-8 py-3 rounded-full transition-colors"
        >
          Start Solving Now
        </button>
      </div>
    </div>
  );
}
