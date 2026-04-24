/**
 * ProfilePage.jsx — /profile route — authenticated user profile and stats
 *
 * Shows user stats matching Corey's database schema:
 *   - Per-size (2x2, 3x3) stats: fastest time, avg time, # of solves
 *   - Per-size ranks for each stat (e.g. "1st in 2x2 avg solve time")
 *   - Recent solves list (placeholder until Corey adds DB support)
 *
 * All data currently from AuthContext mock. When database is connected,
 * AuthContext.login() fetches real data — this component just reads it.
 */
import { useNavigate } from 'react-router-dom';
import { LogOut, Clock, Hash, Zap, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PageNavbar from '../components/PageNavbar';

function formatTime(t) {
  if (t === null || t === undefined) return '—';
  if (t >= 60) {
    const m = Math.floor(t / 60);
    const s = (t % 60).toFixed(2).padStart(5, '0');
    return `${m}:${s}`;
  }
  return `${t.toFixed(2)}s`;
}

function formatRank(r) {
  if (!r) return '—';
  if (r === 1) return '1st';
  if (r === 2) return '2nd';
  if (r === 3) return '3rd';
  return `${r}th`;
}

const CUBE_SIZES = ['3x3', '2x2'];

export default function ProfilePage() {
  const { currentUser, logout } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const bg = isDark ? 'bg-dictator-void text-white' : 'bg-dictator-smoke text-dictator-ink';
  const muted = isDark ? 'text-dictator-chrome' : 'text-dictator-ink/75';
  const border = isDark ? 'border-white/8' : 'border-dictator-ink/20';
  const cardBg = isDark ? 'bg-white/[0.03]' : 'bg-white shadow-sm';
  const rowBorder = isDark ? 'border-white/5' : 'border-dictator-ink/12';
  const headerBg = isDark ? 'bg-white/[0.03]' : 'bg-dictator-ink/[0.05]';
  const rowHover = isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-dictator-ink/[0.03]';
  const tagBg = isDark ? 'bg-white/5 border-white/8' : 'bg-dictator-ink/[0.06] border-dictator-ink/15';
  const primary = isDark ? 'text-white' : 'text-dictator-ink';
  const rankHighlight = 'text-yellow-500';

  if (!currentUser) {
    return (
      <div className={`min-h-screen flex flex-col transition-colors duration-300 items-center justify-center gap-4 ${bg}`}>
        <p className={`font-mono text-sm ${muted}`}>You're not logged in.</p>
        <button onClick={() => navigate('/')} className="font-mono text-xs uppercase tracking-widest text-dictator-red hover:text-dictator-deep transition-colors">
          Go Home
        </button>
      </div>
    );
  }

  const { username, email, joinedAt, stats, recentSolves } = currentUser;

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${bg}`}>
      <PageNavbar />

      <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        {/* Profile header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 sm:mb-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-dictator-red/20 border-2 border-dictator-red/50 flex items-center justify-center font-mono text-dictator-red text-lg sm:text-xl font-bold select-none">
              {username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className={`font-heading text-xl sm:text-2xl font-bold ${primary}`}>{username}</h1>
              <p className={`font-mono text-xs mt-0.5 ${muted}`}>{email}</p>
              <p className={`font-mono text-[10px] mt-1 ${isDark ? 'text-white/30' : 'text-dictator-ink/40'}`}>Joined {joinedAt}</p>
            </div>
          </div>
          <button onClick={handleLogout} className={`flex items-center gap-1.5 font-mono text-xs hover:text-dictator-red transition-colors uppercase tracking-widest ${muted}`}>
            <LogOut size={13} />
            Log Out
          </button>
        </div>

        {/* Per-size stat cards */}
        {CUBE_SIZES.map((size) => (
          <div key={size} className="mb-8">
            <p className={`font-mono text-[10px] uppercase tracking-widest mb-4 ${muted}`}>
              {size} Statistics
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`rounded-xl px-4 py-4 text-center border ${cardBg} ${border}`}>
                <div className={`mx-auto mb-2 flex justify-center ${muted}`}><Zap size={13} className="text-dictator-red" /></div>
                <p className="font-drama text-2xl text-dictator-red">{formatTime(stats.best[size])}</p>
                <p className={`font-mono text-[10px] mt-1 uppercase tracking-wider ${muted}`}>Fastest</p>
                {stats.ranks?.[size]?.fastest && (
                  <p className={`font-mono text-[10px] mt-1 ${stats.ranks[size].fastest <= 3 ? rankHighlight : muted}`}>
                    <Trophy size={9} className="inline mr-0.5" />
                    {formatRank(stats.ranks[size].fastest)}
                  </p>
                )}
              </div>
              <div className={`rounded-xl px-4 py-4 text-center border ${cardBg} ${border}`}>
                <div className={`mx-auto mb-2 flex justify-center ${muted}`}><Clock size={13} /></div>
                <p className={`font-drama text-2xl ${primary}`}>{formatTime(stats.avg[size])}</p>
                <p className={`font-mono text-[10px] mt-1 uppercase tracking-wider ${muted}`}>Average</p>
                {stats.ranks?.[size]?.average && (
                  <p className={`font-mono text-[10px] mt-1 ${stats.ranks[size].average <= 3 ? rankHighlight : muted}`}>
                    <Trophy size={9} className="inline mr-0.5" />
                    {formatRank(stats.ranks[size].average)}
                  </p>
                )}
              </div>
              <div className={`rounded-xl px-4 py-4 text-center border ${cardBg} ${border}`}>
                <div className={`mx-auto mb-2 flex justify-center ${muted}`}><Hash size={13} /></div>
                <p className={`font-drama text-2xl ${primary}`}>{stats.solvesBySize?.[size] ?? stats.solves ?? '—'}</p>
                <p className={`font-mono text-[10px] mt-1 uppercase tracking-wider ${muted}`}>Solves</p>
                {stats.ranks?.[size]?.solves && (
                  <p className={`font-mono text-[10px] mt-1 ${stats.ranks[size].solves <= 3 ? rankHighlight : muted}`}>
                    <Trophy size={9} className="inline mr-0.5" />
                    {formatRank(stats.ranks[size].solves)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Recent solves */}
        <div>
          <p className={`font-mono text-[10px] uppercase tracking-widest mb-4 ${muted}`}>Recent Solves</p>
          <div className={`border rounded-xl overflow-hidden ${border}`}>
            {recentSolves && recentSolves.length > 0 ? (
              recentSolves.map((solve, i) => (
                <div key={i} className={`flex items-center justify-between px-3 sm:px-5 py-3 sm:py-3.5 transition-colors ${rowHover} ${i !== recentSolves.length - 1 ? `border-b ${rowBorder}` : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-xs w-8 tabular-nums ${muted}`}>#{recentSolves.length - i}</span>
                    <span className={`font-mono text-xs border px-2 py-0.5 rounded ${muted} ${tagBg}`}>{solve.cube}</span>
                  </div>
                  <span className="font-mono text-sm text-dictator-red tabular-nums">{formatTime(solve.time)}</span>
                  <span className={`font-mono text-xs ${isDark ? 'text-white/30' : 'text-dictator-ink/40'}`}>{solve.date}</span>
                </div>
              ))
            ) : (
              <div className={`px-5 py-8 text-center ${muted}`}>
                <p className="font-mono text-xs">No recent solves yet</p>
              </div>
            )}
          </div>
        </div>

        <p className={`mt-6 font-mono text-[10px] text-center uppercase tracking-widest ${isDark ? 'text-white/20' : 'text-dictator-ink/30'}`}>
          Mock data — live stats coming soon
        </p>
      </div>
    </div>
  );
}
