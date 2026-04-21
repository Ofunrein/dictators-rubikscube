/**
 * LeaderboardPage.jsx — /leaderboard route — global rankings by cube size
 *
 * All data is currently mock (hardcoded in MOCK_ENTRIES). The table structure,
 * tabs, rank icons, and time formatting are production-ready — when the database
 * is connected, replace MOCK_ENTRIES with a fetch() call to the API and remove
 * the "Mock data" disclaimer at the bottom.
 *
 * Supports 3x3 / 2x2 / 4x4 via tab switcher. Times ≥ 60 seconds are shown as
 * M:SS.ms format. Ranks 1-3 get Crown/Medal icons and a subtle row highlight.
 * Full light/dark mode support via ThemeContext.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Medal } from 'lucide-react';
import PageNavbar from '../components/PageNavbar';
import { useTheme } from '../context/ThemeContext';

const MOCK_ENTRIES = {
  '3x3': [
    { rank: 1, username: 'cubemaster_x', time: 7.12, date: 'Apr 19' },
    { rank: 2, username: 'speedcuber99', time: 8.54, date: 'Apr 18' },
    { rank: 3, username: 'AlgoKing', time: 9.03, date: 'Apr 20' },
    { rank: 4, username: 'frostbyte', time: 11.22, date: 'Apr 17' },
    { rank: 5, username: 'nervewreck', time: 12.88, date: 'Apr 16' },
    { rank: 6, username: 'SpeedSolver', time: 18.43, date: 'Apr 16' },
    { rank: 7, username: 'cubicle_fan', time: 19.01, date: 'Apr 15' },
    { rank: 8, username: 'z_rotate', time: 22.34, date: 'Apr 14' },
    { rank: 9, username: 'layer_lord', time: 24.10, date: 'Apr 13' },
    { rank: 10, username: 'rookie_irl', time: 31.55, date: 'Apr 12' },
  ],
  '2x2': [
    { rank: 1, username: 'cubemaster_x', time: 2.14, date: 'Apr 20' },
    { rank: 2, username: 'frostbyte', time: 2.88, date: 'Apr 19' },
    { rank: 3, username: 'SpeedSolver', time: 5.21, date: 'Apr 18' },
    { rank: 4, username: 'AlgoKing', time: 5.90, date: 'Apr 17' },
    { rank: 5, username: 'z_rotate', time: 6.33, date: 'Apr 16' },
    { rank: 6, username: 'speedcuber99', time: 7.01, date: 'Apr 15' },
    { rank: 7, username: 'nervewreck', time: 8.12, date: 'Apr 15' },
    { rank: 8, username: 'layer_lord', time: 9.44, date: 'Apr 14' },
    { rank: 9, username: 'cubicle_fan', time: 10.22, date: 'Apr 13' },
    { rank: 10, username: 'rookie_irl', time: 13.07, date: 'Apr 12' },
  ],
  '4x4': [
    { rank: 1, username: 'AlgoKing', time: 41.33, date: 'Apr 20' },
    { rank: 2, username: 'cubemaster_x', time: 48.91, date: 'Apr 19' },
    { rank: 3, username: 'frostbyte', time: 55.02, date: 'Apr 18' },
    { rank: 4, username: 'SpeedSolver', time: 62.11, date: 'Apr 17' },
    { rank: 5, username: 'speedcuber99', time: 70.44, date: 'Apr 16' },
    { rank: 6, username: 'nervewreck', time: 81.20, date: 'Apr 15' },
    { rank: 7, username: 'z_rotate', time: 92.05, date: 'Apr 14' },
    { rank: 8, username: 'layer_lord', time: 101.3, date: 'Apr 13' },
    { rank: 9, username: 'cubicle_fan', time: 115.8, date: 'Apr 12' },
    { rank: 10, username: 'rookie_irl', time: 138.0, date: 'Apr 11' },
  ],
};

const CUBE_TABS = ['3x3', '2x2']; // 4x4 hidden — solving not available on Vercel

function formatTime(t) {
  if (t >= 60) {
    const m = Math.floor(t / 60);
    const s = (t % 60).toFixed(2).padStart(5, '0');
    return `${m}:${s}`;
  }
  return `${t.toFixed(2)}s`;
}

function RankIcon({ rank }) {
  if (rank === 1) return <Crown size={14} className="text-yellow-400" />;
  if (rank === 2) return <Medal size={14} className="text-dictator-chrome" />;
  if (rank === 3) return <Medal size={14} className="text-amber-600" />;
  return <span className="font-mono text-xs text-dictator-chrome w-[14px] text-center">{rank}</span>;
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState('3x3');
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const entries = MOCK_ENTRIES[activeTab];

  const border = isDark ? 'border-white/8' : 'border-dictator-ink/20';
  const rowHover = isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-dictator-ink/[0.04]';
  const topRow = isDark ? 'bg-white/[0.02]' : 'bg-dictator-ink/[0.04]';
  const tableHeader = isDark ? 'bg-white/[0.03]' : 'bg-dictator-ink/[0.06]';
  const muted = isDark ? 'text-dictator-chrome' : 'text-dictator-ink/75';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDark ? 'bg-dictator-void text-white' : 'bg-dictator-smoke text-dictator-ink'
    }`}>
      <PageNavbar />

      <div className="flex-1 w-full max-w-2xl mx-auto px-6 py-14">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-dictator-red mb-3">
          Global Rankings
        </p>
        <h1 className="font-drama text-5xl md:text-6xl uppercase tracking-tight mb-10">
          Leaderboard
        </h1>

        <div className={`flex gap-1 mb-6 rounded-lg p-1 w-fit ${isDark ? 'bg-white/[0.04]' : 'bg-dictator-ink/[0.07]'}`}>
          {CUBE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-1.5 rounded-md font-mono text-xs uppercase tracking-widest transition-all ${
                activeTab === tab
                  ? 'bg-dictator-red text-white'
                  : isDark ? 'text-dictator-chrome hover:text-white' : 'text-dictator-chrome hover:text-dictator-ink'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={`border ${border} rounded-xl overflow-hidden`}>
          <div className={`grid grid-cols-[2rem_1fr_auto_auto] gap-4 px-5 py-3 border-b ${border} ${tableHeader}`}>
            <span className={`font-mono text-[10px] uppercase tracking-widest ${muted}`}>#</span>
            <span className={`font-mono text-[10px] uppercase tracking-widest ${muted}`}>Player</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome text-right">Best</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome text-right">Date</span>
          </div>

          {entries.map((entry, i) => (
            <div
              key={entry.rank}
              className={`grid grid-cols-[2rem_1fr_auto_auto] gap-4 px-5 py-3.5 items-center transition-colors ${rowHover} ${
                i !== entries.length - 1 ? `border-b ${isDark ? 'border-white/5' : 'border-dictator-sand/60'}` : ''
              } ${entry.rank <= 3 ? topRow : ''}`}
            >
              <div className="flex items-center justify-center">
                <RankIcon rank={entry.rank} />
              </div>
              <span className={`font-heading text-sm ${entry.rank === 1 ? 'text-yellow-500' : isDark ? 'text-white' : 'text-dictator-ink'}`}>
                {entry.username}
              </span>
              <span className="font-mono text-sm text-dictator-red tabular-nums text-right">
                {formatTime(entry.time)}
              </span>
              <span className={`font-mono text-xs text-right ${muted}`}>
                {entry.date}
              </span>
            </div>
          ))}
        </div>

        <p className={`mt-4 font-mono text-[10px] text-center uppercase tracking-widest ${isDark ? 'text-white/20' : 'text-dictator-chrome/50'}`}>
          Mock data — live rankings coming soon
        </p>
      </div>
    </div>
  );
}
