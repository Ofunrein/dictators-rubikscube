/**
 * LeaderboardPage.jsx — /leaderboard route — global rankings by cube size and stat
 *
 * Supports 2x2 and 3x3 categories, each with 3 leaderboards:
 *   - Number of solves
 *   - Average solve time
 *   - Fastest solve time
 *
 * Includes a result count dropdown (10/50/100) matching the database function's
 * int argument for how many users to return.
 *
 * All data is currently mock. When the database is connected, replace MOCK_DATA
 * with fetch() calls and remove the disclaimer.
 */
import { useState } from 'react';
import { Crown, Medal } from 'lucide-react';
import PageNavbar from '../components/PageNavbar';
import { useTheme } from '../context/ThemeContext';

const STAT_TABS = [
  { key: 'fastest', label: 'Fastest Time' },
  { key: 'average', label: 'Avg Time' },
  { key: 'solves', label: '# of Solves' },
];

const CUBE_TABS = ['3x3', '2x2'];
const RESULT_COUNTS = [10, 50, 100];

const MOCK_DATA = {
  '3x3': {
    fastest: [
      { rank: 1, username: 'cubemaster_x', value: 7.12 },
      { rank: 2, username: 'speedcuber99', value: 8.54 },
      { rank: 3, username: 'AlgoKing', value: 9.03 },
      { rank: 4, username: 'frostbyte', value: 11.22 },
      { rank: 5, username: 'nervewreck', value: 12.88 },
      { rank: 6, username: 'SpeedSolver', value: 18.43 },
      { rank: 7, username: 'cubicle_fan', value: 19.01 },
      { rank: 8, username: 'z_rotate', value: 22.34 },
      { rank: 9, username: 'layer_lord', value: 24.10 },
      { rank: 10, username: 'rookie_irl', value: 31.55 },
    ],
    average: [
      { rank: 1, username: 'cubemaster_x', value: 9.88 },
      { rank: 2, username: 'speedcuber99', value: 12.41 },
      { rank: 3, username: 'AlgoKing', value: 13.20 },
      { rank: 4, username: 'frostbyte', value: 16.05 },
      { rank: 5, username: 'nervewreck', value: 18.73 },
      { rank: 6, username: 'SpeedSolver', value: 22.10 },
      { rank: 7, username: 'cubicle_fan', value: 25.44 },
      { rank: 8, username: 'z_rotate', value: 28.91 },
      { rank: 9, username: 'layer_lord', value: 33.60 },
      { rank: 10, username: 'rookie_irl', value: 45.22 },
    ],
    solves: [
      { rank: 1, username: 'speedcuber99', value: 1243 },
      { rank: 2, username: 'cubemaster_x', value: 980 },
      { rank: 3, username: 'nervewreck', value: 744 },
      { rank: 4, username: 'AlgoKing', value: 612 },
      { rank: 5, username: 'frostbyte', value: 501 },
      { rank: 6, username: 'SpeedSolver', value: 388 },
      { rank: 7, username: 'cubicle_fan', value: 255 },
      { rank: 8, username: 'z_rotate', value: 190 },
      { rank: 9, username: 'layer_lord', value: 120 },
      { rank: 10, username: 'rookie_irl', value: 45 },
    ],
  },
  '2x2': {
    fastest: [
      { rank: 1, username: 'cubemaster_x', value: 2.14 },
      { rank: 2, username: 'frostbyte', value: 2.88 },
      { rank: 3, username: 'SpeedSolver', value: 5.21 },
      { rank: 4, username: 'AlgoKing', value: 5.90 },
      { rank: 5, username: 'z_rotate', value: 6.33 },
      { rank: 6, username: 'speedcuber99', value: 7.01 },
      { rank: 7, username: 'nervewreck', value: 8.12 },
      { rank: 8, username: 'layer_lord', value: 9.44 },
      { rank: 9, username: 'cubicle_fan', value: 10.22 },
      { rank: 10, username: 'rookie_irl', value: 13.07 },
    ],
    average: [
      { rank: 1, username: 'cubemaster_x', value: 3.55 },
      { rank: 2, username: 'frostbyte', value: 4.12 },
      { rank: 3, username: 'SpeedSolver', value: 6.88 },
      { rank: 4, username: 'AlgoKing', value: 7.45 },
      { rank: 5, username: 'z_rotate', value: 8.10 },
      { rank: 6, username: 'speedcuber99', value: 9.33 },
      { rank: 7, username: 'nervewreck', value: 10.71 },
      { rank: 8, username: 'layer_lord', value: 12.05 },
      { rank: 9, username: 'cubicle_fan', value: 13.88 },
      { rank: 10, username: 'rookie_irl', value: 18.40 },
    ],
    solves: [
      { rank: 1, username: 'frostbyte', value: 654 },
      { rank: 2, username: 'cubemaster_x', value: 510 },
      { rank: 3, username: 'nervewreck', value: 322 },
      { rank: 4, username: 'SpeedSolver', value: 280 },
      { rank: 5, username: 'AlgoKing', value: 245 },
      { rank: 6, username: 'speedcuber99', value: 198 },
      { rank: 7, username: 'z_rotate', value: 155 },
      { rank: 8, username: 'cubicle_fan', value: 110 },
      { rank: 9, username: 'layer_lord', value: 78 },
      { rank: 10, username: 'rookie_irl', value: 22 },
    ],
  },
};

function formatValue(value, statKey) {
  if (statKey === 'solves') return value.toLocaleString();
  if (value >= 60) {
    const m = Math.floor(value / 60);
    const s = (value % 60).toFixed(2).padStart(5, '0');
    return `${m}:${s}`;
  }
  return `${value.toFixed(2)}s`;
}

function valueLabel(statKey) {
  if (statKey === 'solves') return 'Solves';
  if (statKey === 'average') return 'Avg Time';
  return 'Best Time';
}

function RankIcon({ rank }) {
  if (rank === 1) return <Crown size={14} className="text-yellow-400" />;
  if (rank === 2) return <Medal size={14} className="text-dictator-chrome" />;
  if (rank === 3) return <Medal size={14} className="text-amber-600" />;
  return <span className="font-mono text-xs text-dictator-chrome w-[14px] text-center">{rank}</span>;
}

export default function LeaderboardPage() {
  const [activeSize, setActiveSize] = useState('3x3');
  const [activeStat, setActiveStat] = useState('fastest');
  const [resultCount, setResultCount] = useState(10);
  const { isDark } = useTheme();

  const entries = (MOCK_DATA[activeSize]?.[activeStat] ?? []).slice(0, resultCount);

  const border = isDark ? 'border-white/8' : 'border-dictator-ink/20';
  const rowHover = isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-dictator-ink/[0.04]';
  const topRow = isDark ? 'bg-white/[0.02]' : 'bg-dictator-ink/[0.04]';
  const tableHeader = isDark ? 'bg-white/[0.03]' : 'bg-dictator-ink/[0.06]';
  const muted = isDark ? 'text-dictator-chrome' : 'text-dictator-ink/75';
  const pillBg = isDark ? 'bg-white/[0.04]' : 'bg-dictator-ink/[0.07]';
  const selectBg = isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-white border-dictator-ink/20 text-dictator-ink';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDark ? 'bg-dictator-void text-white' : 'bg-dictator-smoke text-dictator-ink'
    }`}>
      <PageNavbar />

      <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-dictator-red mb-3">
          Global Rankings
        </p>
        <h1 className="font-drama text-4xl sm:text-5xl md:text-6xl uppercase tracking-tight mb-6 sm:mb-10">
          Leaderboard
        </h1>

        {/* Size tabs + dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className={`flex gap-1 rounded-lg p-1 w-fit ${pillBg}`}>
            {CUBE_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSize(tab)}
                className={`px-5 py-1.5 rounded-md font-mono text-xs uppercase tracking-widest transition-all ${
                  activeSize === tab
                    ? 'bg-dictator-red text-white'
                    : isDark ? 'text-dictator-chrome hover:text-white' : 'text-dictator-chrome hover:text-dictator-ink'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Result count dropdown */}
          <select
            value={resultCount}
            onChange={(e) => setResultCount(Number(e.target.value))}
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest cursor-pointer ${selectBg}`}
          >
            {RESULT_COUNTS.map((n) => (
              <option key={n} value={n}>Top {n}</option>
            ))}
          </select>
        </div>

        {/* Stat tabs */}
        <div className={`flex gap-1 rounded-lg p-1 w-fit mb-6 ${pillBg}`}>
          {STAT_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveStat(tab.key)}
              className={`px-4 py-1.5 rounded-md font-mono text-[11px] uppercase tracking-widest transition-all ${
                activeStat === tab.key
                  ? (isDark ? 'bg-white/10 text-white' : 'bg-white text-dictator-ink shadow-sm')
                  : isDark ? 'text-dictator-chrome hover:text-white' : 'text-dictator-chrome hover:text-dictator-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className={`border ${border} rounded-xl overflow-hidden`}>
          <div className={`grid grid-cols-[1.5rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto] gap-2 sm:gap-4 px-3 sm:px-5 py-3 border-b ${border} ${tableHeader}`}>
            <span className={`font-mono text-[10px] uppercase tracking-widest ${muted}`}>#</span>
            <span className={`font-mono text-[10px] uppercase tracking-widest ${muted}`}>Player</span>
            <span className={`font-mono text-[10px] uppercase tracking-widest ${muted} text-right`}>{valueLabel(activeStat)}</span>
          </div>

          {entries.map((entry, i) => (
            <div
              key={entry.rank}
              className={`grid grid-cols-[1.5rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto] gap-2 sm:gap-4 px-3 sm:px-5 py-3 sm:py-3.5 items-center transition-colors ${rowHover} ${
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
                {formatValue(entry.value, activeStat)}
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
