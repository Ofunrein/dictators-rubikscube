import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CubeState } from '../cube/CubeState';
import { applyMove, MOVES } from '../cube/moves';
import { applyMoveRemote, fetchSolvedState, generateScrambleRemote, pingBackend, solveCubeRemote } from '../net/api';
import { ArrowLeft, RotateCcw, Shuffle, Timer, ChevronRight } from 'lucide-react';

const TOKEN_HEX = {
  W: '#FFFFFF',
  R: '#CC1A1A',
  G: '#2E8B57',
  Y: '#FFD700',
  O: '#FF8C00',
  B: '#1E90FF'
};

const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];

const MOVE_GROUPS = [
  { label: 'U Face', moves: ['U', "U'"] },
  { label: 'D Face', moves: ['D', "D'"] },
  { label: 'R Face', moves: ['R', "R'"] },
  { label: 'L Face', moves: ['L', "L'"] },
  { label: 'F Face', moves: ['F', "F'"] },
  { label: 'B Face', moves: ['B', "B'"] }
];

const KEY_MAP = {
  u: 'U', U: "U'",
  d: 'D', D: "D'",
  r: 'R', R: "R'",
  l: 'L', L: "L'",
  f: 'F', F: "F'",
  b: 'B', B: "B'"
};

const QUICK_ALGORITHMS = [
  { name: 'Sexy Move', algo: "R U R' U'" },
  { name: 'F2L Insert', algo: "U R U' R'" },
  { name: 'OLL (Sune)', algo: "R U R' U R U2 R'" },
  { name: 'PLL (U-Perm)', algo: "R U' R U R U R U' R' U' R2" },
  { name: 'T-Perm', algo: "R U R' U' R' F R2 U' R' U' R U R' F'" }
];

function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Unexpected request failure.';
}

function generateScramble(length = 20) {
  const result = [];
  let last = '';

  for (let i = 0; i < length; i += 1) {
    let move;
    do {
      move = MOVES[Math.floor(Math.random() * MOVES.length)];
    } while (move.replace("'", '') === last.replace("'", ''));

    result.push(move);
    last = move;
  }

  return result;
}

function expandAlgorithm(algorithm) {
  if (typeof algorithm !== 'string') {
    return [];
  }

  return algorithm.trim().split(/\s+/).flatMap((token) => {
    if (MOVES.includes(token)) {
      return [token];
    }

    if (token.endsWith('2')) {
      const base = token.slice(0, -1);
      if (MOVES.includes(base)) {
        return [base, base];
      }
    }

    return [];
  });
}

function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centis = Math.floor((ms % 1000) / 10);
  return `${minutes > 0 ? `${minutes}:` : ''}${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

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

const InteractiveCube = ({ cubeState, animating }) => {
  const groupRef = useRef();

  useFrame(() => {
    if (!groupRef.current || !animating) {
      return;
    }
    groupRef.current.rotation.y += 0.02;
  });

  const cubelets = useMemo(() => {
    const state = cubeState;
    const offset = 1.0;
    const items = [];

    for (let x = -1; x <= 1; x += 1) {
      for (let y = -1; y <= 1; y += 1) {
        for (let z = -1; z <= 1; z += 1) {
          const mats = [
            x === 1 ? TOKEN_HEX[state.R[2 - (y + 1) * 3 + (1 - z)]] ?? '#111' : '#111',
            x === -1 ? TOKEN_HEX[state.L[2 - (y + 1) * 3 + (z + 1)]] ?? '#111' : '#111',
            y === 1 ? TOKEN_HEX[state.U[(1 - z) * 3 + (x + 1)]] ?? '#111' : '#111',
            y === -1 ? TOKEN_HEX[state.D[(z + 1) * 3 + (x + 1)]] ?? '#111' : '#111',
            z === 1 ? TOKEN_HEX[state.F[(1 - y) * 3 + (x + 1)]] ?? '#111' : '#111',
            z === -1 ? TOKEN_HEX[state.B[(1 - y) * 3 + (1 - x)]] ?? '#111' : '#111'
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

const SimulatorPage = () => {
  const navigate = useNavigate();

  const [cubeStateObj] = useState(() => new CubeState());
  const [displayState, setDisplayState] = useState(() => cubeStateObj.getState());
  const [moveHistory, setMoveHistory] = useState([]);
  const [scrambleSeq, setScrambleSeq] = useState([]);
  const [animating, setAnimating] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMs, setTimerMs] = useState(0);
  const [bestTime, setBestTime] = useState(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const [actionError, setActionError] = useState('');
  const [apiMode, setApiMode] = useState('connecting');
  const [apiMessage, setApiMessage] = useState('Connecting to backend API...');
  const [solveInfo, setSolveInfo] = useState(null);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const actionQueueRef = useRef(Promise.resolve());
  const animationTimeoutRef = useRef(null);

  const TUTORIAL_STEPS = [
    {
      title: 'Notation Basics',
      body: 'Each letter represents a face: U (Up), D (Down), R (Right), L (Left), F (Front), B (Back). A plain letter = clockwise. A prime (′) = counter-clockwise.'
    },
    {
      title: 'The Cross',
      body: 'Start by solving a cross on the U (white) face. Find the 4 white edge pieces and bring them to the top layer, matching the center colors on each side.'
    },
    {
      title: 'First Two Layers (F2L)',
      body: 'Pair each corner with its matching edge piece and insert them into the correct slot using R U R′ U′ or L′ U′ L U.'
    },
    {
      title: 'Orient Last Layer (OLL)',
      body: 'Make the top face all one color using OLL algorithms. The most common beginner OLL: F R U R′ U′ F′.'
    },
    {
      title: 'Permute Last Layer (PLL)',
      body: 'Move the top layer pieces into their correct positions. Common PLL: R U R′ U R U2 R′ (U-Perm).'
    }
  ];

  const commitCubeState = useCallback((nextState) => {
    cubeStateObj.setState(nextState);
    setDisplayState({ ...nextState });
  }, [cubeStateObj]);

  const setApiConnected = useCallback((message = 'Connected to backend API.') => {
    setApiMode('connected');
    setApiMessage(message);
  }, []);

  const setApiFallback = useCallback((reason) => {
    setApiMode('degraded');
    setApiMessage(`Local fallback active: ${reason}`);
  }, []);

  const pulseCubeAnimation = useCallback(() => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    setAnimating(true);
    animationTimeoutRef.current = setTimeout(() => {
      setAnimating(false);
      animationTimeoutRef.current = null;
    }, 800);
  }, []);

  const resolveMoveState = useCallback(
    async (state, move) => {
      if (apiMode !== 'degraded') {
        try {
          const payload = await applyMoveRemote(state, move);
          setApiConnected('Connected to backend API.');
          return payload.state;
        } catch (error) {
          const message = getErrorMessage(error);
          setApiFallback(message);
        }
      }

      if (!MOVES.includes(move)) {
        throw new Error(`Move "${move}" is not available in local fallback mode.`);
      }

      return applyMove(state, move);
    },
    [apiMode, setApiConnected, setApiFallback]
  );

  const dispatchMove = useCallback(
    async (move) => {
      const current = cubeStateObj.getState();
      const nextState = await resolveMoveState(current, move);
      commitCubeState(nextState);
      setMoveHistory((prev) => [...prev.slice(-49), move]);
      setSolveInfo(null);
    },
    [cubeStateObj, resolveMoveState, commitCubeState]
  );

  const startTimer = useCallback(() => {
    if (timerRunning) {
      return;
    }
    startTimeRef.current = Date.now() - timerMs;
    timerRef.current = setInterval(() => {
      setTimerMs(Date.now() - startTimeRef.current);
    }, 10);
    setTimerRunning(true);
  }, [timerRunning, timerMs]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerRunning(false);
    if (timerMs > 0) {
      setBestTime((prev) => (prev === null || timerMs < prev ? timerMs : prev));
    }
  }, [timerMs]);

  const toggleTimer = useCallback(() => {
    if (timerRunning) {
      stopTimer();
      return;
    }
    startTimer();
  }, [timerRunning, startTimer, stopTimer]);

  const handleScramble = useCallback(
    async () => {
      let sequence;
      let state;

      if (apiMode !== 'degraded') {
        try {
          const response = await generateScrambleRemote({ length: 20 });
          sequence = response.scramble;
          state = response.state;
          setApiConnected('Connected to backend API.');
        } catch (error) {
          const message = getErrorMessage(error);
          setApiFallback(message);
        }
      }

      if (!sequence || !state) {
        sequence = generateScramble(20);
        state = CubeState.createSolvedState();
        for (const move of sequence) {
          state = applyMove(state, move);
        }
      }

      setScrambleSeq(sequence);
      commitCubeState(state);
      setMoveHistory([]);
      setSolveInfo(null);
      pulseCubeAnimation();
    },
    [apiMode, setApiConnected, setApiFallback, commitCubeState, pulseCubeAnimation]
  );

  const handleReset = useCallback(
    async () => {
      let solvedState;

      if (apiMode !== 'degraded') {
        try {
          solvedState = await fetchSolvedState();
          setApiConnected('Connected to backend API.');
        } catch (error) {
          const message = getErrorMessage(error);
          setApiFallback(message);
        }
      }

      if (!solvedState) {
        solvedState = CubeState.createSolvedState();
      }

      commitCubeState(solvedState);
      setMoveHistory([]);
      setScrambleSeq([]);
      setSolveInfo(null);
      stopTimer();
      setTimerMs(0);
    },
    [apiMode, setApiConnected, setApiFallback, commitCubeState, stopTimer]
  );

  const handleSolve = useCallback(
    async () => {
      const startingState = cubeStateObj.getState();
      let solveResponse;

      try {
        solveResponse = await solveCubeRemote(startingState, 'beginner');
        setApiConnected('Connected to backend API.');
      } catch (error) {
        const message = getErrorMessage(error);
        setApiFallback(message);
        throw new Error(`Solve requires backend availability. ${message}`);
      }

      const moves = Array.isArray(solveResponse.moves) ? solveResponse.moves : [];
      if (moves.length === 0) {
        setSolveInfo({
          moveCount: 0,
          isMock: Boolean(solveResponse.isMock),
          note: solveResponse.note || 'Cube is already solved.'
        });
        return;
      }

      let state = startingState;
      for (const move of moves) {
        state = await resolveMoveState(state, move);
      }

      commitCubeState(state);
      setMoveHistory((prev) => [...prev, ...moves].slice(-50));
      setSolveInfo({
        moveCount: moves.length,
        isMock: Boolean(solveResponse.isMock),
        note: solveResponse.note || null,
        estimatedMoveCount: solveResponse.estimatedMoveCount
      });
      pulseCubeAnimation();
    },
    [cubeStateObj, resolveMoveState, commitCubeState, pulseCubeAnimation, setApiConnected, setApiFallback]
  );

  const handleReconnect = useCallback(async () => {
    setApiMode('connecting');
    setApiMessage('Reconnecting to backend API...');

    try {
      await pingBackend();
      setApiConnected('Connected to backend API.');
    } catch (error) {
      const message = getErrorMessage(error);
      setApiFallback(message);
    }
  }, [setApiConnected, setApiFallback]);

  const enqueueAction = useCallback((task) => {
    const next = actionQueueRef.current.then(async () => {
      setIsPending(true);
      setActionError('');
      try {
        await task();
      } catch (error) {
        setActionError(getErrorMessage(error));
      } finally {
        setIsPending(false);
      }
    });

    actionQueueRef.current = next.catch(() => {});
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setApiMode('connecting');
      setApiMessage('Connecting to backend API...');

      try {
        await pingBackend();
        const solved = await fetchSolvedState();
        if (cancelled) {
          return;
        }
        commitCubeState(solved);
        setApiConnected('Connected to backend API.');
      } catch (error) {
        if (cancelled) {
          return;
        }
        setApiFallback(getErrorMessage(error));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [commitCubeState, setApiConnected, setApiFallback]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.target?.tagName === 'INPUT' || event.target?.tagName === 'TEXTAREA') {
        return;
      }

      const move = KEY_MAP[event.key];
      if (!move) {
        return;
      }

      event.preventDefault();
      enqueueAction(() => dispatchMove(move));
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dispatchMove, enqueueAction]);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    },
    []
  );

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

  const apiLabel = apiMode === 'connected'
    ? 'Connected'
    : apiMode === 'connecting'
      ? 'Connecting...'
      : 'Fallback';

  const apiColor = apiMode === 'connected'
    ? 'text-emerald-400'
    : apiMode === 'connecting'
      ? 'text-dictator-chrome'
      : 'text-amber-400';

  return (
    <div className="min-h-screen bg-dictator-void text-white flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-dictator-chrome/10 bg-dictator-void/90 backdrop-blur-xl sticky top-0 z-50">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-dictator-chrome hover:text-white transition-colors hover:-translate-x-1 duration-200"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[#1A1A1A] border border-dictator-red/40 flex items-center justify-center font-mono text-dictator-red text-[10px] font-bold">
            TD
          </div>
          <span className="font-heading text-sm font-bold uppercase tracking-widest hidden sm:block">
            The Dictators - Simulator
          </span>
        </div>

        <button
          onClick={toggleTimer}
          className={`flex items-center gap-2 font-mono text-sm font-bold px-4 py-2 rounded-full border transition-all duration-200 ${timerRunning
            ? 'bg-dictator-red/20 border-dictator-red text-dictator-red'
            : 'bg-[#1A1A1A] border-dictator-chrome/20 text-dictator-chrome hover:border-dictator-red/50 hover:text-white'
            }`}
        >
          <Timer size={14} />
          {formatTime(timerMs)}
        </button>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        <aside className="w-full lg:w-[280px] xl:w-[320px] border-b lg:border-b-0 lg:border-r border-dictator-chrome/10 flex flex-col bg-[#0A0A0A] overflow-y-auto">
          <div className="p-6 border-b border-dictator-chrome/10">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome">API Status</p>
              <span className={`font-mono text-[10px] uppercase tracking-widest ${apiColor}`}>{apiLabel}</span>
            </div>
            <p className="mt-2 font-mono text-[10px] text-white/60 leading-relaxed">{apiMessage}</p>
            {apiMode !== 'connected' && (
              <button
                onClick={() => enqueueAction(handleReconnect)}
                disabled={isPending}
                className="mt-3 font-mono text-[10px] uppercase tracking-widest text-dictator-red hover:text-white transition-colors disabled:opacity-50"
              >
                Retry API Connection
              </button>
            )}
            {actionError && (
              <p className="mt-2 font-mono text-[10px] text-dictator-red/90 leading-relaxed">{actionError}</p>
            )}
          </div>

          <div className="p-6 border-b border-dictator-chrome/10 grid grid-cols-2 gap-3">
            <button
              onClick={() => enqueueAction(handleScramble)}
              disabled={isPending}
              className="flex items-center justify-center gap-2 bg-dictator-red text-white font-mono text-xs font-bold uppercase tracking-widest py-3 rounded-xl hover:bg-[#AA1515] transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Shuffle size={14} />
              Scramble
            </button>
            <button
              onClick={() => enqueueAction(handleReset)}
              disabled={isPending}
              className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-dictator-chrome font-mono text-xs font-bold uppercase tracking-widest py-3 rounded-xl border border-dictator-chrome/20 hover:border-dictator-chrome/50 hover:text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={14} />
              Reset
            </button>
            <button
              onClick={() => enqueueAction(handleSolve)}
              disabled={isPending}
              className="col-span-2 flex items-center justify-center gap-2 bg-[#141414] text-white font-mono text-xs font-bold uppercase tracking-widest py-3 rounded-xl border border-dictator-red/40 hover:border-dictator-red hover:text-dictator-red transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
              Solve via API
            </button>
          </div>

          {scrambleSeq.length > 0 && (
            <div className="p-6 border-b border-dictator-chrome/10">
              <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-2">Scramble</p>
              <p className="font-mono text-xs text-white/70 leading-relaxed break-all">{scrambleSeq.join(' ')}</p>
            </div>
          )}

          {solveInfo && (
            <div className="p-6 border-b border-dictator-chrome/10">
              <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-2">Solver Result</p>
              <p className="font-mono text-xs text-dictator-red">
                {solveInfo.moveCount === 0
                  ? 'Already solved.'
                  : `${solveInfo.moveCount} moves applied${typeof solveInfo.estimatedMoveCount === 'number' ? ` (est. ${solveInfo.estimatedMoveCount})` : ''}.`}
                {solveInfo.isMock ? ' (mock solver response)' : ''}
              </p>
              {solveInfo.note && (
                <p className="mt-2 font-mono text-[10px] text-white/60 leading-relaxed">{solveInfo.note}</p>
              )}
            </div>
          )}

          <div className="p-6 border-b border-dictator-chrome/10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-4">Moves</p>
            <div className="grid grid-cols-2 gap-3">
              {MOVE_GROUPS.map(({ label, moves }) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <span className="font-mono text-[9px] text-dictator-chrome/50 uppercase tracking-widest">{label}</span>
                  <div className="flex gap-1.5">
                    {moves.map((move) => (
                      <button
                        key={move}
                        onClick={() => enqueueAction(() => dispatchMove(move))}
                        disabled={isPending}
                        className="flex-1 font-mono text-xs font-bold py-2 rounded-lg bg-[#1A1A1A] border border-dictator-chrome/20 text-white hover:bg-dictator-red hover:border-dictator-red transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {move}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-b border-dictator-chrome/10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-3">Keyboard</p>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(KEY_MAP).map(([key, move]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <kbd className="font-mono text-[10px] bg-[#1A1A1A] border border-dictator-chrome/20 px-1.5 py-0.5 rounded text-dictator-chrome">
                    {key}
                  </kbd>
                  <span className="font-mono text-[10px] text-white/50">-&gt; {move}</span>
                </div>
              ))}
            </div>
          </div>

          {bestTime !== null && (
            <div className="p-6 border-b border-dictator-chrome/10">
              <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-1">Best Time</p>
              <p className="font-mono text-2xl font-bold text-dictator-red">{formatTime(bestTime)}</p>
            </div>
          )}

          <div className="p-6 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-3">
              Move History <span className="text-dictator-chrome/40">({moveHistory.length})</span>
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {moveHistory.length === 0
                ? <span className="font-mono text-[10px] text-dictator-chrome/30">No moves yet</span>
                : moveHistory.map((move, i) => (
                  <span key={`${move}-${i}`} className="font-mono text-[10px] bg-[#1A1A1A] border border-dictator-chrome/10 px-2 py-1 rounded text-white/70">
                    {move}
                  </span>
                ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 relative bg-dictator-void flex flex-col">
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

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] text-dictator-chrome/40 uppercase tracking-widest pointer-events-none">
              Drag to rotate · Scroll to zoom
            </div>
            {isPending && (
              <div className="absolute top-4 right-4 font-mono text-[10px] uppercase tracking-widest text-dictator-red bg-black/30 border border-dictator-red/30 px-3 py-1.5 rounded-full">
                Syncing...
              </div>
            )}
          </div>

          <div className="border-t border-dictator-chrome/10 bg-[#0A0A0A] px-6 py-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-4">Face Map</p>
            <div className="flex flex-wrap gap-6 justify-center">
              {FACE_ORDER.map((face) => (
                <FacePreview key={face} face={face} label={face} />
              ))}
            </div>
          </div>
        </main>

        <aside className="w-full lg:w-[280px] xl:w-[320px] border-t lg:border-t-0 lg:border-l border-dictator-chrome/10 bg-[#0A0A0A] flex flex-col overflow-y-auto">
          <div className="p-6 border-b border-dictator-chrome/10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-1">// LEARN</p>
            <h2 className="font-heading text-xl font-bold text-white">Step-by-Step Guide</h2>
          </div>

          <div className="flex flex-col divide-y divide-dictator-chrome/10">
            {TUTORIAL_STEPS.map((step, i) => (
              <button
                key={step.title}
                onClick={() => setTutorialStep(i)}
                className={`text-left p-5 transition-all duration-200 flex items-start gap-3 hover:bg-white/5 ${tutorialStep === i ? 'bg-dictator-red/10 border-l-2 border-dictator-red' : 'border-l-2 border-transparent'
                  }`}
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

          <div className="p-6 border-t border-dictator-chrome/10 mt-auto">
            <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-chrome mb-4">Quick Algorithms</p>
            <div className="flex flex-col gap-3">
              {QUICK_ALGORITHMS.map(({ name, algo }) => (
                <div key={name} className="bg-[#111] rounded-xl p-3 border border-dictator-chrome/10">
                  <p className="font-mono text-[10px] text-dictator-chrome uppercase tracking-widest mb-1">{name}</p>
                  <p className="font-mono text-xs text-dictator-red font-bold">{algo}</p>
                  <button
                    onClick={() => enqueueAction(async () => {
                      const sequence = expandAlgorithm(algo);
                      if (sequence.length === 0) {
                        throw new Error(`No supported moves found for ${name}.`);
                      }
                      for (const move of sequence) {
                        await dispatchMove(move);
                      }
                    })}
                    disabled={isPending}
                    className="mt-2 flex items-center gap-1 font-mono text-[10px] text-dictator-chrome/50 hover:text-dictator-red transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
