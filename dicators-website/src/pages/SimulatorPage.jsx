import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CubeState } from '../cube/CubeState';
import { applyMove, MOVES } from '../cube/moves';
import { ArrowLeft, RotateCcw, Shuffle, Timer, ChevronRight } from 'lucide-react';

// ─── Color token → hex mapping (matches team's CubeState tokens) ───────────
const TOKEN_HEX = {
  W: '#FFFFFF',
  R: '#CC1A1A',
  G: '#2E8B57',
  Y: '#FFD700',
  O: '#FF8C00',
  B: '#1E90FF',
};

// ─── Face index → face name for sticker positioning ─────────────────────────
const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];

// ─── Single cubelet mesh ─────────────────────────────────────────────────────
const Cubelet = ({ position, materials }) => {
  const meshRef = useRef();
  return (
    <mesh ref={meshRef} position={position} castShadow>
      <boxGeometry args={[0.95, 0.95, 0.95]} />
      {materials.map((mat, i) => (
        <meshStandardMaterial
          key={i}
          attach={`material-${i}`}
          color={mat}
          roughness={0.25}
          metalness={0.6}
        />
      ))}
    </mesh>
  );
};

// ─── Full 3x3x3 cube driven by CubeState ─────────────────────────────────────
const InteractiveCube = ({ cubeState, animating }) => {
  const groupRef = useRef();

  useFrame(() => {
    if (!groupRef.current) return;
    if (animating) {
      groupRef.current.rotation.y += 0.02;
    }
  });

  const cubelets = useMemo(() => {
    const state = cubeState;
    const offset = 1.0;
    const items = [];

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          // material order: +x, -x, +y, -y, +z, -z  (right, left, top, bottom, front, back)
          const mats = [
            x === 1  ? TOKEN_HEX[state.R[2 - (y + 1) * 3 + (1 - z)]] ?? '#111' : '#111',
            x === -1 ? TOKEN_HEX[state.L[2 - (y + 1) * 3 + (z + 1)]] ?? '#111' : '#111',
            y === 1  ? TOKEN_HEX[state.U[(1 - z) * 3 + (x + 1)]]     ?? '#111' : '#111',
            y === -1 ? TOKEN_HEX[state.D[(z + 1) * 3 + (x + 1)]]     ?? '#111' : '#111',
            z === 1  ? TOKEN_HEX[state.F[(1 - y) * 3 + (x + 1)]]     ?? '#111' : '#111',
            z === -1 ? TOKEN_HEX[state.B[(1 - y) * 3 + (1 - x)]]     ?? '#111' : '#111',
          ];

          items.push(
            <Cubelet
              key={`${x}-${y}-${z}`}
              position={[x * offset, y * offset, z * offset]}
              materials={mats}
            />
          );
        }
      }
    }
    return items;
  }, [cubeState]);

  return (
    <group ref={groupRef} rotation={[0.4, -0.6, 0]}>
      {cubelets}
    </group>
  );
};

// ─── Move button grid ─────────────────────────────────────────────────────────
const MOVE_GROUPS = [
  { label: 'U Face', moves: ['U', "U'"] },
  { label: 'D Face', moves: ['D', "D'"] },
  { label: 'R Face', moves: ['R', "R'"] },
  { label: 'L Face', moves: ['L', "L'"] },
  { label: 'F Face', moves: ['F', "F'"] },
  { label: 'B Face', moves: ['B', "B'"] },
];

// ─── Keyboard map ─────────────────────────────────────────────────────────────
const KEY_MAP = {
  u: 'U', U: "U'",
  d: 'D', D: "D'",
  r: 'R', R: "R'",
  l: 'L', L: "L'",
  f: 'F', F: "F'",
  b: 'B', B: "B'",
};

// ─── Scramble generator ───────────────────────────────────────────────────────
function generateScramble(length = 20) {
  const result = [];
  let last = '';
  for (let i = 0; i < length; i++) {
    let move;
    do { move = MOVES[Math.floor(Math.random() * MOVES.length)]; }
    while (move.replace("'", '') === last.replace("'", ''));
    result.push(move);
    last = move;
  }
  return result;
}

// ─── Format ms → mm:ss.cc ────────────────────────────────────────────────────
function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centis = Math.floor((ms % 1000) / 10);
  return `${minutes > 0 ? `${minutes}:` : ''}${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

// ─── Main Simulator Page ──────────────────────────────────────────────────────
const SimulatorPage = () => {
  const navigate = useNavigate();
  const [cubeStateObj] = useState(() => new CubeState());
  const [displayState, setDisplayState] = useState(() => cubeStateObj.getState());
  const [moveHistory, setMoveHistory] = useState([]);
  const [scrambleSeq, setScrambleSeq] = useState([]);
  const [animating, setAnimating] = useState(false);

  // Timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMs, setTimerMs] = useState(0);
  const [bestTime, setBestTime] = useState(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Tutorial panel
  const [tutorialStep, setTutorialStep] = useState(0);
  const TUTORIAL_STEPS = [
    { title: 'Notation Basics', body: 'Each letter represents a face: U (Up), D (Down), R (Right), L (Left), F (Front), B (Back). A plain letter = clockwise. A prime (′) = counter-clockwise.' },
    { title: 'The Cross', body: 'Start by solving a cross on the U (white) face. Find the 4 white edge pieces and bring them to the top layer, matching the center colors on each side.' },
    { title: 'First Two Layers (F2L)', body: 'Pair each corner with its matching edge piece and insert them into the correct slot using R U R′ U′ or L′ U′ L U.' },
    { title: 'Orient Last Layer (OLL)', body: 'Make the top face all one color using OLL algorithms. The most common beginner OLL: F R U R′ U′ F′.' },
    { title: 'Permute Last Layer (PLL)', body: 'Move the top layer pieces into their correct positions. Common PLL: R U R′ U R U2 R′ (U-Perm).' },
  ];

  // ── Dispatch a move ──────────────────────────────────────────────────────────
  const dispatchMove = useCallback((move) => {
    const newState = applyMove(cubeStateObj.getState(), move);
    cubeStateObj.setState(newState);
    setDisplayState({ ...newState });
    setMoveHistory(prev => [...prev.slice(-49), move]);
  }, [cubeStateObj]);

  // ── Keyboard controls ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      const move = KEY_MAP[e.key];
      if (move) dispatchMove(move);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dispatchMove]);

  // ── Scramble ─────────────────────────────────────────────────────────────────
  const handleScramble = useCallback(() => {
    const seq = generateScramble(20);
    setScrambleSeq(seq);
    // Reset to solved then apply all scramble moves
    const fresh = CubeState.createSolvedState();
    cubeStateObj.setState(fresh);
    let state = fresh;
    seq.forEach(m => { state = applyMove(state, m); });
    cubeStateObj.setState(state);
    setDisplayState({ ...state });
    setMoveHistory([]);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 800);
  }, [cubeStateObj]);

  // ── Reset ────────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    const solved = CubeState.createSolvedState();
    cubeStateObj.setState(solved);
    setDisplayState({ ...solved });
    setMoveHistory([]);
    setScrambleSeq([]);
    stopTimer();
    setTimerMs(0);
  }, [cubeStateObj]);

  // ── Timer controls ───────────────────────────────────────────────────────────
  const startTimer = () => {
    if (timerRunning) return;
    startTimeRef.current = Date.now() - timerMs;
    timerRef.current = setInterval(() => {
      setTimerMs(Date.now() - startTimeRef.current);
    }, 10);
    setTimerRunning(true);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    if (timerMs > 0) {
      setBestTime(prev => prev === null || timerMs < prev ? timerMs : prev);
    }
  };

  const toggleTimer = () => timerRunning ? stopTimer() : startTimer();

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── 2D face preview ──────────────────────────────────────────────────────────
  const FacePreview = ({ face, label }) => {
    const faceColors = displayState[face] || Array(9).fill('W');
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome">{label}</span>
        <div className="grid grid-cols-3 gap-[2px]">
          {faceColors.map((token, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-[3px] border border-black/20"
              style={{ backgroundColor: TOKEN_HEX[token] ?? '#333' }}
            />
          ))}
        </div>
      </div>
    );
  };

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

        {/* Timer */}
        <button
          onClick={toggleTimer}
          className={`flex items-center gap-2 font-mono text-sm font-bold px-4 py-2 rounded-full border transition-all duration-200
            ${timerRunning
              ? 'bg-dictator-red/20 border-dictator-red text-dictator-red'
              : 'bg-[#1A1A1A] border-dictator-chrome/20 text-dictator-chrome hover:border-dictator-red/50 hover:text-white'
            }`}
        >
          <Timer size={14} />
          {formatTime(timerMs)}
        </button>
      </header>

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        {/* ── Left Panel: Controls ─────────────────────────────────────────── */}
        <aside className="w-full lg:w-[280px] xl:w-[320px] border-b lg:border-b-0 lg:border-r border-dictator-chrome/10 flex flex-col bg-[#0A0A0A] overflow-y-auto">

          {/* Action Buttons */}
          <div className="p-6 border-b border-dictator-chrome/10 flex gap-3">
            <button
              onClick={handleScramble}
              className="flex-1 flex items-center justify-center gap-2 bg-dictator-red text-white font-mono text-xs font-bold uppercase tracking-widest py-3 rounded-xl hover:bg-[#AA1515] transition-colors active:scale-95"
            >
              <Shuffle size={14} />
              Scramble
            </button>
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 bg-[#1A1A1A] text-dictator-chrome font-mono text-xs font-bold uppercase tracking-widest py-3 rounded-xl border border-dictator-chrome/20 hover:border-dictator-chrome/50 hover:text-white transition-all active:scale-95"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>

          {/* Scramble display */}
          {scrambleSeq.length > 0 && (
            <div className="p-6 border-b border-dictator-chrome/10">
              <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-2">Scramble</p>
              <p className="font-mono text-xs text-white/70 leading-relaxed break-all">{scrambleSeq.join(' ')}</p>
            </div>
          )}

          {/* Move Buttons */}
          <div className="p-6 border-b border-dictator-chrome/10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-4">Moves</p>
            <div className="grid grid-cols-2 gap-3">
              {MOVE_GROUPS.map(({ label, moves }) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <span className="font-mono text-[9px] text-dictator-chrome/50 uppercase tracking-widest">{label}</span>
                  <div className="flex gap-1.5">
                    {moves.map(move => (
                      <button
                        key={move}
                        onClick={() => dispatchMove(move)}
                        className="flex-1 font-mono text-xs font-bold py-2 rounded-lg bg-[#1A1A1A] border border-dictator-chrome/20 text-white hover:bg-dictator-red hover:border-dictator-red transition-all duration-150 active:scale-95"
                      >
                        {move}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard hint */}
          <div className="p-6 border-b border-dictator-chrome/10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-3">Keyboard</p>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(KEY_MAP).map(([key, move]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <kbd className="font-mono text-[10px] bg-[#1A1A1A] border border-dictator-chrome/20 px-1.5 py-0.5 rounded text-dictator-chrome">{key}</kbd>
                  <span className="font-mono text-[10px] text-white/50">→ {move}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Best time */}
          {bestTime !== null && (
            <div className="p-6 border-b border-dictator-chrome/10">
              <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-1">Best Time</p>
              <p className="font-mono text-2xl font-bold text-dictator-red">{formatTime(bestTime)}</p>
            </div>
          )}

          {/* Move History */}
          <div className="p-6 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-3">
              Move History <span className="text-dictator-chrome/40">({moveHistory.length})</span>
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {moveHistory.length === 0
                ? <span className="font-mono text-[10px] text-dictator-chrome/30">No moves yet</span>
                : moveHistory.map((m, i) => (
                  <span key={i} className="font-mono text-[10px] bg-[#1A1A1A] border border-dictator-chrome/10 px-2 py-1 rounded text-white/70">{m}</span>
                ))
              }
            </div>
          </div>

        </aside>

        {/* ── Center: 3D Canvas ────────────────────────────────────────────── */}
        <main className="flex-1 relative bg-dictator-void flex flex-col">

          {/* 3D Cube */}
          <div className="flex-1 min-h-[400px] relative">
            <Canvas
              camera={{ position: [4, 3.5, 5], fov: 45 }}
              shadows
              className="w-full h-full"
            >
              <color attach="background" args={['#0D0D0D']} />
              <ambientLight intensity={0.5} />
              <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
              <pointLight position={[-5, -5, -5]} color="#CC1A1A" intensity={0.4} distance={20} />
              <pointLight position={[5, 5, -5]} color="#1E90FF" intensity={0.2} distance={20} />

              <InteractiveCube cubeState={displayState} animating={animating} />
              <OrbitControls
                enablePan={false}
                minDistance={4}
                maxDistance={12}
                autoRotate={false}
                dampingFactor={0.08}
                enableDamping
              />
            </Canvas>

            {/* Drag hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] text-dictator-chrome/40 uppercase tracking-widest pointer-events-none">
              Drag to rotate · Scroll to zoom
            </div>
          </div>

          {/* 2D Face Map */}
          <div className="border-t border-dictator-chrome/10 bg-[#0A0A0A] px-6 py-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-4">Face Map</p>
            <div className="flex flex-wrap gap-6 justify-center">
              {FACE_ORDER.map(face => (
                <FacePreview key={face} face={face} label={face} />
              ))}
            </div>
          </div>

        </main>

        {/* ── Right Panel: Tutorial ────────────────────────────────────────── */}
        <aside className="w-full lg:w-[280px] xl:w-[320px] border-t lg:border-t-0 lg:border-l border-dictator-chrome/10 bg-[#0A0A0A] flex flex-col overflow-y-auto">

          <div className="p-6 border-b border-dictator-chrome/10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-1">// LEARN</p>
            <h2 className="font-heading text-xl font-bold text-white">Step-by-Step Guide</h2>
          </div>

          {/* Steps list */}
          <div className="flex flex-col divide-y divide-dictator-chrome/10">
            {TUTORIAL_STEPS.map((step, i) => (
              <button
                key={i}
                onClick={() => setTutorialStep(i)}
                className={`text-left p-5 transition-all duration-200 flex items-start gap-3 hover:bg-white/5
                  ${tutorialStep === i ? 'bg-dictator-red/10 border-l-2 border-dictator-red' : 'border-l-2 border-transparent'}`}
              >
                <span className={`font-mono text-xs font-bold mt-0.5 shrink-0 ${tutorialStep === i ? 'text-dictator-red' : 'text-dictator-chrome/40'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className={`font-heading text-sm font-bold mb-1 ${tutorialStep === i ? 'text-white' : 'text-dictator-chrome'}`}>
                    {step.title}
                  </p>
                  {tutorialStep === i && (
                    <p className="font-body text-xs text-dictator-chrome leading-relaxed">
                      {step.body}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Algorithm quick-ref */}
          <div className="p-6 border-t border-dictator-chrome/10 mt-auto">
            <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-4">Quick Algorithms</p>
            <div className="flex flex-col gap-3">
              {[
                { name: 'Sexy Move', algo: "R U R' U'" },
                { name: 'F2L Insert', algo: "U R U' R'" },
                { name: 'OLL (Sune)', algo: "R U R' U R U2 R'" },
                { name: 'PLL (U-Perm)', algo: "R U' R U R U R U' R' U' R2" },
                { name: 'T-Perm', algo: "R U R' U' R' F R2 U' R' U' R U R' F'" },
              ].map(({ name, algo }) => (
                <div key={name} className="bg-[#111] rounded-xl p-3 border border-dictator-chrome/10">
                  <p className="font-mono text-[10px] text-dictator-chrome uppercase tracking-widest mb-1">{name}</p>
                  <p className="font-mono text-xs text-dictator-red font-bold">{algo}</p>
                  <button
                    onClick={() => {
                      algo.split(' ').forEach(m => dispatchMove(m));
                    }}
                    className="mt-2 flex items-center gap-1 font-mono text-[10px] text-dictator-chrome/50 hover:text-dictator-red transition-colors"
                  >
                    <ChevronRight size={10} />
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
};

export default SimulatorPage;
