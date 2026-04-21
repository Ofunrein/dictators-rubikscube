/**
 * ProfilePage.jsx — /profile route — authenticated user profile and stats
 *
 * Redirects to home if no user is logged in (currentUser === null).
 * All displayed stats come from AuthContext's currentUser object, which is
 * currently populated with mock data. When the database is wired up:
 *   1. AuthContext.login() fetches real user data and sets currentUser
 *   2. This component requires no changes — it just reads from context
 *
 * Sections: avatar + username + email, statistics summary cards (solves, best,
 * avg per cube size), per-cube breakdown table, recent solves list.
 * Full light/dark mode support via ThemeContext.
 */
import { useNavigate } from 'react-router-dom';
import { LogOut, Clock, Hash, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PageNavbar from '../components/PageNavbar';

function formatTime(t) {
  if (t >= 60) {
    const m = Math.floor(t / 60);
    const s = (t % 60).toFixed(2).padStart(5, '0');
    return `${m}:${s}`;
  }
  return `${t.toFixed(2)}s`;
}

const CUBE_SIZES = ['3x3', '2x2', '4x4'];

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

      <div className="flex-1 w-full max-w-2xl mx-auto px-6 py-14">
        {/* Profile header */}
        <div className="flex items-start justify-between mb-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-dictator-red/15 border border-dictator-red/30 flex items-center justify-center font-mono text-dictator-red text-xl font-bold select-none">
              {username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className={`font-heading text-2xl font-bold ${primary}`}>{username}</h1>
              <p className={`font-mono text-xs mt-0.5 ${muted}`}>{email}</p>
              <p className={`font-mono text-[10px] mt-1 ${isDark ? 'text-white/30' : 'text-dictator-ink/40'}`}>Joined {joinedAt}</p>
            </div>
          </div>
          <button onClick={handleLogout} className={`flex items-center gap-1.5 font-mono text-xs hover:text-dictator-red transition-colors uppercase tracking-widest ${muted}`}>
            <LogOut size={13} />
            Log Out
          </button>
        </div>

        {/* Stats grid */}
        <div className="mb-10">
          <p className={`font-mono text-[10px] uppercase tracking-widest mb-4 ${muted}`}>Statistics</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { icon: <Hash size={13} />, value: stats.solves, label: 'Solves', color: primary },
              { icon: <Zap size={13} className="text-dictator-red" />, value: formatTime(stats.best['3x3']), label: 'Best 3x3', color: 'text-dictator-red' },
              { icon: <Clock size={13} />, value: formatTime(stats.avg['3x3']), label: 'Avg 3x3', color: primary },
            ].map(({ icon, value, label, color }) => (
              <div key={label} className={`rounded-xl px-4 py-4 text-center border ${cardBg} ${border}`}>
                <div className={`mx-auto mb-2 flex justify-center ${muted}`}>{icon}</div>
                <p className={`font-drama text-3xl ${color}`}>{value}</p>
                <p className={`font-mono text-[10px] mt-1 uppercase tracking-wider ${muted}`}>{label}</p>
              </div>
            ))}
          </div>

          <div className={`border rounded-xl overflow-hidden ${border}`}>
            <div className={`grid grid-cols-3 border-b ${border} ${headerBg}`}>
              {['Cube', 'Best', 'Average'].map((h) => (
                <span key={h} className={`font-mono text-[10px] uppercase tracking-widest px-5 py-3 ${muted}`}>{h}</span>
              ))}
            </div>
            {CUBE_SIZES.map((size, i) => (
              <div key={size} className={`grid grid-cols-3 px-5 py-3.5 ${i !== CUBE_SIZES.length - 1 ? `border-b ${rowBorder}` : ''}`}>
                <span className={`font-mono text-sm ${primary}`}>{size}</span>
                <span className="font-mono text-sm text-dictator-red tabular-nums">{formatTime(stats.best[size])}</span>
                <span className={`font-mono text-sm tabular-nums ${muted}`}>{formatTime(stats.avg[size])}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent solves */}
        <div>
          <p className={`font-mono text-[10px] uppercase tracking-widest mb-4 ${muted}`}>Recent Solves</p>
          <div className={`border rounded-xl overflow-hidden ${border}`}>
            {recentSolves.map((solve, i) => (
              <div key={i} className={`flex items-center justify-between px-5 py-3.5 transition-colors ${rowHover} ${i !== recentSolves.length - 1 ? `border-b ${rowBorder}` : ''}`}>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-xs w-8 tabular-nums ${muted}`}>#{recentSolves.length - i}</span>
                  <span className={`font-mono text-xs border px-2 py-0.5 rounded ${muted} ${tagBg}`}>{solve.cube}</span>
                </div>
                <span className="font-mono text-sm text-dictator-red tabular-nums">{formatTime(solve.time)}</span>
                <span className={`font-mono text-xs ${isDark ? 'text-white/30' : 'text-dictator-ink/40'}`}>{solve.date}</span>
              </div>
            ))}
          </div>
        </div>

        <p className={`mt-6 font-mono text-[10px] text-center uppercase tracking-widest ${isDark ? 'text-white/20' : 'text-dictator-ink/30'}`}>
          Mock data — live stats coming soon
        </p>
      </div>
    </div>
  );
}
