/**
 * LeaderboardPage.jsx — /leaderboard route — global rankings by cube size and stat
 *
 * Fetches leaderboard data from Supabase using size-specific and stat-specific
 * database functions. Supports 2x2 and 3x3 sizes, each with Fastest, Avg, and
 * Solves stat types, and a result count dropdown (10/50/100).
 */
import { useState, useEffect } from 'react';
import { Crown, Medal } from 'lucide-react';
import PageNavbar from '../components/PageNavbar';
import { useTheme } from '../context/ThemeContext';
import { getLeaderboard } from '../lib/stats';

const CUBE_TABS = ['3x3', '2x2'];
const STAT_TABS = [
  { key: 'fastest', label: 'Fastest' },
  { key: 'avg', label: 'Avg' },
  { key: 'solves', label: 'Solves' },
];
const RESULT_COUNTS = [10, 50, 100];

function formatValue(value, statKey) {
  if (value === null || value === undefined) return '—';
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
  if (statKey === 'fastest') return 'Best Time';
  return 'Avg Time';
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
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isDark } = useTheme();

  // Fetch leaderboard data whenever size, stat, or count changes
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await getLeaderboard(activeSize, activeStat, resultCount);

      if (fetchError) {
        setError(fetchError.message);
        setEntries([]);
      } else {
        setEntries(data ?? []);
      }

      setLoading(false);
    }

    fetchData();
  }, [activeSize, activeStat, resultCount]);

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

        {/* Size tabs */}
        <div className={`flex gap-1 rounded-lg p-1 w-fit mb-3 ${pillBg}`}>
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

        {/* Stat type tabs + result count */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className={`flex gap-1 rounded-lg p-1 w-fit ${pillBg}`}>
            {STAT_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveStat(tab.key)}
                className={`px-4 py-1.5 rounded-md font-mono text-xs uppercase tracking-widest transition-all ${
                  activeStat === tab.key
                    ? 'bg-dictator-red text-white'
                    : isDark ? 'text-dictator-chrome hover:text-white' : 'text-dictator-chrome hover:text-dictator-ink'
                }`}
              >
                {tab.label}
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

        {/* Table */}
        <div className={`border ${border} rounded-xl overflow-hidden`}>
          <div className={`grid grid-cols-[1.5rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto] gap-2 sm:gap-4 px-3 sm:px-5 py-3 border-b ${border} ${tableHeader}`}>
            <span className={`font-mono text-[10px] uppercase tracking-widest ${muted}`}>#</span>
            <span className={`font-mono text-[10px] uppercase tracking-widest ${muted}`}>Player</span>
            <span className={`font-mono text-[10px] uppercase tracking-widest ${muted} text-right`}>{valueLabel(activeStat)}</span>
          </div>

          {loading ? (
            <div className={`px-5 py-8 text-center ${muted}`}>
              <p className="font-mono text-xs">Loading leaderboard...</p>
            </div>
          ) : error ? (
            <div className={`px-5 py-8 text-center`}>
              <p className="font-mono text-xs text-dictator-red">{error}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className={`px-5 py-8 text-center ${muted}`}>
              <p className="font-mono text-xs">No data yet. Be the first to solve!</p>
            </div>
          ) : (
            entries.map((entry, i) => (
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}