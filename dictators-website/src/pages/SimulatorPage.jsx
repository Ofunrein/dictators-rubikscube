import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const SimulatorPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dictator-void text-white flex flex-col overflow-hidden">

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-dictator-chrome/10 bg-dictator-void/90 backdrop-blur-xl sticky top-0 z-50">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-dictator-chrome hover:text-white transition-colors hover:-translate-x-1 duration-200"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[#1A1A1A] border border-dictator-red/40 flex items-center justify-center font-mono text-dictator-red text-[10px] font-bold">TD</div>
          <span className="font-heading text-sm font-bold uppercase tracking-widest hidden sm:block">The Dictators — Simulator</span>
        </div>
      </header>

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 relative bg-dictator-void">
          <iframe
            src={import.meta.env.VITE_CUBE_APP_URL ?? 'http://localhost:5174'}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Rubik's Cube App"
          />
        </main>
      </div>

    </div>
  );
};

export default SimulatorPage;