import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CubeState } from '../cube/CubeState';
import { applyMove, MOVES } from '../cube/moves';
import { ArrowLeft, RotateCcw, Shuffle, Timer, ChevronRight, Check } from 'lucide-react';
import {
  CUBIE_LAYOUT,
  TURN_DURATION_SECONDS,
  easeInOutCubic,
  mergeMoveIntoSolveStack,
  normalizeMoveSequence,
  parseMoveAnimation,
  rotateCubiePosition,
} from './simulatorAnimation';
import { solveCubeRemote } from '../net/api';

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

const AXIS_VECTORS = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

class SimulatorCanvasBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }

    return this.props.children;
  }
}

function ResponsiveSceneCamera({ position, fov }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(...position);
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }, [camera, fov, position]);

  return null;
}

// ─── Kyle's sticker-mesh constants (from frontend/src/main.js) ───────────────
const CUBIE_SIZE = 0.95;
const STICKER_SIZE = 0.85;
const GAP = 1.0;
const EPSILON = 0.02;

const CUBIE_FACES_DEF = [
  { axis: 'x', sign: 1, face: 'R', rotation: [0, Math.PI / 2, 0] },
  { axis: 'x', sign: -1, face: 'L', rotation: [0, -Math.PI / 2, 0] },
  { axis: 'y', sign: 1, face: 'U', rotation: [-Math.PI / 2, 0, 0] },
  { axis: 'y', sign: -1, face: 'D', rotation: [Math.PI / 2, 0, 0] },
  { axis: 'z', sign: 1, face: 'F', rotation: [0, 0, 0] },
  { axis: 'z', sign: -1, face: 'B', rotation: [0, Math.PI, 0] },
];

function getStickerIndex(face, gx, gy, gz) {
  switch (face) {
    case 'U': return (1 - gz) * 3 + (gx + 1);
    case 'D': return (gz + 1) * 3 + (gx + 1);
    case 'F': return (1 - gy) * 3 + (gx + 1);
    case 'B': return (1 - gy) * 3 + (1 - gx);
    case 'R': return (1 - gy) * 3 + (1 - gz);
    case 'L': return (1 - gy) * 3 + (gz + 1);
    default: return 0;
  }
}

// ─── Move lookup for mouse+keyboard sticker selection ────────────────────────
function getStickerMove(face, arrowKey, row, col) {
  const map = {
    F: { ArrowUp: ["L'", "M'", 'R'][col], ArrowDown: ['L', 'M', "R'"][col], ArrowLeft: ['U', "E'", "D'"][row], ArrowRight: ["U'", 'E', 'D'][row] },
    B: { ArrowUp: ["R'", 'M', 'L'][col], ArrowDown: ['R', "M'", "L'"][col], ArrowLeft: ['U', "E'", "D'"][row], ArrowRight: ["U'", 'E', 'D'][row] },
    R: { ArrowUp: ["F'", "S'", 'B'][col], ArrowDown: ['F', 'S', "B'"][col], ArrowLeft: ['U', "E'", "D'"][row], ArrowRight: ["U'", 'E', 'D'][row] },
    L: { ArrowUp: ["B'", 'S', 'F'][col], ArrowDown: ['B', "S'", "F'"][col], ArrowLeft: ['U', "E'", "D'"][row], ArrowRight: ["U'", 'E', 'D'][row] },
    U: { ArrowUp: ["F'", "S'", 'B'][row], ArrowDown: ['F', 'S', "B'"][row], ArrowLeft: ["L'", "M'", 'R'][col], ArrowRight: ['L', 'M', "R'"][col] },
    D: { ArrowUp: ["B'", 'S', 'F'][row], ArrowDown: ['B', "S'", "F'"][row], ArrowLeft: ['L', 'M', "R'"][col], ArrowRight: ["L'", "M'", 'R'][col] },
  };
  return map[face]?.[arrowKey] ?? null;
}

function resolveStickerColor(value) {
  if (typeof value === 'string') {
    const token = value.trim().toUpperCase();
    if (TOKEN_HEX[token]) return TOKEN_HEX[token];
  }
  return '#808080';
}

// ─── Single sticker plane (Kyle's approach) ──────────────────────────────────
const Sticker = ({ color, position, rotation, onPointerDown, isSelected }) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh onPointerDown={onPointerDown}>
        <planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
        <meshBasicMaterial color={color} side={THREE.FrontSide} />
      </mesh>
      {isSelected && (
        <mesh renderOrder={1}>
          <planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
          <meshBasicMaterial color="#ff69b4" transparent opacity={0.5} side={THREE.FrontSide} depthTest={false} />
        </mesh>
      )}
    </group>
  );
};

// ─── Single cubie with dark body + sticker planes (Kyle's buildCubies) ───────
const StickerCubelet = React.forwardRef(({ gx, gy, gz, cubeState, onStickerSelect, selectedSticker }, ref) => {
  const stickers = [];

  for (const def of CUBIE_FACES_DEF) {
    const isExposed =
      (def.axis === 'x' && gx === def.sign) ||
      (def.axis === 'y' && gy === def.sign) ||
      (def.axis === 'z' && gz === def.sign);
    if (!isExposed) continue;

    const stickerIndex = getStickerIndex(def.face, gx, gy, gz);
    const tokenValue = cubeState[def.face]?.[stickerIndex];
    const color = resolveStickerColor(tokenValue);

    const stickerPosition = [0, 0, 0];
    stickerPosition[def.axis === 'x' ? 0 : def.axis === 'y' ? 1 : 2] =
      def.sign * (CUBIE_SIZE / 2 + EPSILON);

    const isSelected = selectedSticker?.face === def.face && selectedSticker?.index === stickerIndex;

    stickers.push(
      <Sticker
        key={def.face}
        face={def.face}
        index={stickerIndex}
        color={color}
        position={stickerPosition}
        rotation={def.rotation}
        isSelected={isSelected}
        onPointerDown={onStickerSelect ? (e) => {
          e.stopPropagation();
          const row = Math.floor(stickerIndex / 3);
          const col = stickerIndex % 3;
          onStickerSelect({ face: def.face, index: stickerIndex, row, col });
        } : undefined}
      />
    );
  }

  return (
    <group ref={ref} position={[gx * GAP, gy * GAP, gz * GAP]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE]} />
        <meshStandardMaterial color="#111111" roughness={0.8} />
      </mesh>
      {stickers}
    </group>
  );
});

StickerCubelet.displayName = 'StickerCubelet';

// ─── Full 3x3x3 cube using Kyle's sticker-mesh rendering ─────────────────────
const InteractiveCube = ({ cubeState, activeMove, onMoveComplete, onUserMove }) => {
  const groupRef = useRef();
  const cubieRefs = useRef([]);
  const pivotRef = useRef(null);
  const activeAnimationRef = useRef(null);
  const onMoveCompleteRef = useRef(onMoveComplete);
  const [cubieLayout, setCubieLayout] = useState(() =>
    CUBIE_LAYOUT.map((cubie) => ({ ...cubie })),
  );

  useEffect(() => {
    onMoveCompleteRef.current = onMoveComplete;
  }, [onMoveComplete]);

  useEffect(() => {
    setCubieLayout(CUBIE_LAYOUT.map((cubie) => ({ ...cubie })));
  }, [cubeState]);

  // ─── Mouse+keyboard sticker selection ───────────────────────────────────────
  const [selectedSticker, setSelectedSticker] = useState(null); // { face, index, row, col }

  const handleStickerSelect = useCallback((info) => {
    setSelectedSticker((prev) =>
      prev?.face === info.face && prev?.index === info.index ? null : info
    );
  }, []);

  useEffect(() => {
    if (!onUserMove) return;
    function handleArrowKey(e) {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      if (!selectedSticker) return;
      e.preventDefault();
      const move = getStickerMove(selectedSticker.face, e.key, selectedSticker.row, selectedSticker.col);
      if (move) {
        onUserMove(move);
        setSelectedSticker(null);
      }
    }
    window.addEventListener('keydown', handleArrowKey);
    return () => window.removeEventListener('keydown', handleArrowKey);
  }, [selectedSticker, onUserMove]);

  useEffect(() => {
    if (!activeMove) {
      activeAnimationRef.current = null;
      return;
    }

    const config = parseMoveAnimation(activeMove);
    if (!config) {
      onMoveCompleteRef.current?.(activeMove);
      return;
    }

    const pivot = new THREE.Group();
    groupRef.current.add(pivot);
    pivotRef.current = pivot;

    cubieLayout.forEach((cubie, index) => {
      if (cubie[config.axis] !== config.layer) return;
      const cubieGroup = cubieRefs.current[index];
      if (!cubieGroup) return;
      pivot.attach(cubieGroup);
    });

    activeAnimationRef.current = {
      move: activeMove,
      config,
      progress: 0,
    };
  }, [activeMove, cubieLayout]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const animation = activeAnimationRef.current;
    if (!animation?.config) return;

    animation.progress = Math.min(1, animation.progress + delta / TURN_DURATION_SECONDS);
    const easedProgress = easeInOutCubic(animation.progress);
    
    let direction = animation.config.direction;

    if (animation.config.axis === 'y') {
      direction *= -1;
    }

    const totalAngle = direction * (Math.PI / 2);
    const axisVector = AXIS_VECTORS[animation.config.axis];

    pivotRef.current.setRotationFromAxisAngle(axisVector, totalAngle * easedProgress);

    if (animation.progress < 1) return;

    pivotRef.current.setRotationFromAxisAngle(axisVector, totalAngle);

    cubieLayout.forEach((cubie, index) => {
      if (cubie[animation.config.axis] !== animation.config.layer) return;
      const cubieGroup = cubieRefs.current[index];
      if (!cubieGroup) return;
      groupRef.current.attach(cubieGroup);
    });

    groupRef.current.remove(pivotRef.current);
    pivotRef.current = null;

    const effectiveDirection =
      animation.config.axis === 'y' ? -animation.config.direction : animation.config.direction;

    const nextLayout = cubieLayout.map((cubie) => (
      cubie[animation.config.axis] === animation.config.layer
        ? rotateCubiePosition(cubie, animation.config.axis, effectiveDirection)
        : cubie
    ));

    nextLayout.forEach((cubie, index) => {
      const cubieGroup = cubieRefs.current[index];
      if (!cubieGroup) return;

      cubieGroup.position.set(
        cubie.x * GAP,
        cubie.y * GAP,
        cubie.z * GAP
      );

      cubieGroup.rotation.set(0, 0, 0);
    });

    setCubieLayout(nextLayout);

    const finishedMove = animation.move;
    activeAnimationRef.current = null;
    onMoveCompleteRef.current?.(finishedMove);
  });

  const cubelets = [];
  let index = 0;
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const i = index;
        cubelets.push(
          <StickerCubelet
            key={`${x}-${y}-${z}`}
            ref={(node) => { cubieRefs.current[i] = node; }}
            gx={cubieLayout[i].x}
            gy={cubieLayout[i].y}
            gz={cubieLayout[i].z}
            cubeState={cubeState}
            selectedSticker={selectedSticker}
            onStickerSelect={onUserMove ? handleStickerSelect : undefined}
          />
        );
        index++;
      }
    }
  }

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
  { label: 'M Slice', moves: ['M', "M'"] },
  { label: 'E Slice', moves: ['E', "E'"] },
  { label: 'S Slice', moves: ['S', "S'"] },
];

// ─── Keyboard map ─────────────────────────────────────────────────────────────
const KEY_MAP = {
  u: 'U', U: "U'",
  d: 'D', D: "D'",
  r: 'R', R: "R'",
  l: 'L', L: "L'",
  f: 'F', F: "F'",
  b: 'B', B: "B'",
  m: 'M', M: "M'",
  e: 'E', E: "E'",
  s: 'S', S: "S'",
};

// ─── Scramble generator ───────────────────────────────────────────────────────
function generateScramble(length = 20) {
  const result = [];
  let last = '';
  for (let i = 0; i < length; i++) {
    let move;
    do {
      move = MOVES[Math.floor(Math.random() * MOVES.length)];
    } while (move.replace("'", '') === last.replace("'", ''));
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
  const [activeMove, setActiveMove] = useState(null);
  const [queuedMoveCount, setQueuedMoveCount] = useState(0);
  const [solveDepth, setSolveDepth] = useState(0);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [canvasErrorMessage, setCanvasErrorMessage] = useState('');
  const [canvasErrorDetails, setCanvasErrorDetails] = useState('');
  const [canvasRetryKey, setCanvasRetryKey] = useState(0);
  const [isSolvingRemote, setIsSolvingRemote] = useState(false);

  const moveQueueRef = useRef([]);
  const activeMoveRef = useRef(null);
  const solveStackRef = useRef([]);
  const waitingForFirstMoveRef = useRef(false); // set true after scramble, clears on first user move

  // Timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMs, setTimerMs] = useState(0);
  const [bestTime, setBestTime] = useState(() => {
    const stored = localStorage.getItem('rubiks_best_time_ms');
    return stored ? parseInt(stored, 10) : null;
  });
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Tutorial panel
  const [tutorialStep, setTutorialStep] = useState(0);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
  }));
  const TUTORIAL_STEPS = [
    { title: 'Notation Basics', body: 'Each letter represents a face: U (Up), D (Down), R (Right), L (Left), F (Front), B (Back). A plain letter = clockwise. A prime (′) = counter-clockwise.' },
    { title: 'The Cross', body: 'Start by solving a cross on the U (white) face. Find the 4 white edge pieces and bring them to the top layer, matching the center colors on each side.' },
    { title: 'First Two Layers (F2L)', body: 'Pair each corner with its matching edge piece and insert them into the correct slot using R U R′ U′ or L′ U′ L U.' },
    { title: 'Orient Last Layer (OLL)', body: 'Make the top face all one color using OLL algorithms. The most common beginner OLL: F R U R′ U′ F′.' },
    { title: 'Permute Last Layer (PLL)', body: 'Move the top layer pieces into their correct positions. Common PLL: R U R′ U R U2 R′ (U-Perm).' },
  ];

  const queueActive = activeMove !== null || queuedMoveCount > 0;
  const interactionLocked = queueActive || isSolvingRemote;
  const manualInputLocked = interactionLocked;
  const canAnimateMoves = !canvasFailed;
  const isMobileViewport = viewportSize.width < 768;
  const isTabletViewport = viewportSize.width >= 768 && viewportSize.width < 1280;
  const isShortViewport = viewportSize.height < 760;

  const cameraProfile = isMobileViewport
    ? { position: [5.8, 4.8, 7.1], fov: 54, minDistance: 5.5, maxDistance: 13.5 }
    : isTabletViewport
      ? { position: [4.8, 4.0, 5.9], fov: 49, minDistance: 4.8, maxDistance: 12.5 }
      : { position: [4, 3.5, 5], fov: 45, minDistance: 4, maxDistance: 12 };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const applyMovesInstantly = useCallback((moves) => {
    const normalized = normalizeMoveSequence(moves);
    if (normalized.length === 0) return;

    let nextState = cubeStateObj.getState();
    for (const move of normalized) {
      nextState = applyMove(nextState, move);
      mergeMoveIntoSolveStack(solveStackRef.current, move);
    }

    cubeStateObj.setState(nextState);
    setDisplayState({ ...nextState });
    setMoveHistory((prev) => [...prev, ...normalized].slice(-50));
    setSolveDepth(solveStackRef.current.length);
  }, [cubeStateObj]);

  const handleCanvasFailure = useCallback((error, info) => {
    // Keep diagnostics in console for quick browser-side debugging.
    console.error('Simulator 3D canvas failed; switching to fallback mode.', error);
    setCanvasErrorMessage(error?.message || String(error) || 'Unknown renderer error');
    setCanvasErrorDetails(
      [error?.name, error?.stack, info?.componentStack]
        .filter(Boolean)
        .join('\n\n'),
    );

    setCanvasFailed((prev) => {
      if (prev) return prev;

      const pendingMoves = [];
      if (activeMoveRef.current) pendingMoves.push(activeMoveRef.current);
      if (moveQueueRef.current.length > 0) pendingMoves.push(...moveQueueRef.current);

      activeMoveRef.current = null;
      moveQueueRef.current = [];
      setActiveMove(null);
      setQueuedMoveCount(0);

      if (pendingMoves.length > 0) {
        applyMovesInstantly(pendingMoves);
      }

      return true;
    });
  }, [applyMovesInstantly]);

  const handleCanvasRetry = useCallback(() => {
    setCanvasFailed(false);
    setCanvasErrorMessage('');
    setCanvasErrorDetails('');
    setCanvasRetryKey((prev) => prev + 1);
  }, []);

  const startNextMove = useCallback(() => {
    if (activeMoveRef.current || moveQueueRef.current.length === 0) {
      setQueuedMoveCount(moveQueueRef.current.length);
      return;
    }

    const nextMove = moveQueueRef.current.shift();
    setQueuedMoveCount(moveQueueRef.current.length);
    activeMoveRef.current = nextMove;
    setActiveMove(nextMove);
  }, []);

  const enqueueMoves = useCallback((moves) => {
    const normalized = normalizeMoveSequence(moves);
    if (normalized.length === 0) return;

    if (!canAnimateMoves) {
      applyMovesInstantly(normalized);
      return;
    }

    moveQueueRef.current.push(...normalized);
    setQueuedMoveCount(moveQueueRef.current.length);
    startNextMove();
  }, [startNextMove, canAnimateMoves, applyMovesInstantly]);

  const handleMoveAnimationComplete = useCallback((move) => {
    if (activeMoveRef.current !== move) return;

    const newState = applyMove(cubeStateObj.getState(), move);
    cubeStateObj.setState(newState);
    setDisplayState({ ...newState });
    setMoveHistory((prev) => [...prev.slice(-49), move]);

    mergeMoveIntoSolveStack(solveStackRef.current, move);
    setSolveDepth(solveStackRef.current.length);

    activeMoveRef.current = null;
    setActiveMove(null);
    startNextMove();
  }, [cubeStateObj, startNextMove]);

  const dispatchManualMove = useCallback((move) => {
    if (!move) return;
    if (activeMoveRef.current || moveQueueRef.current.length > 0) return;

    const isSolvedNow = FACE_ORDER.every((face) =>
      cubeStateObj.getState()[face].every((sticker) => sticker === cubeStateObj.getState()[face][0])
    );
    const shouldStartTimer =
      waitingForFirstMoveRef.current || (!timerRunning && timerMs === 0 && isSolvedNow);

    // Auto-start timer on first user move after a scramble or from a fresh solved/reset cube.
    if (shouldStartTimer) {
      waitingForFirstMoveRef.current = false;
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setTimerMs(Date.now() - startTimeRef.current);
      }, 10);
      setTimerRunning(true);
    }

    enqueueMoves([move]);
  }, [cubeStateObj, enqueueMoves, timerMs, timerRunning]);

  // ── Watchdog: force-complete a stalled animation ─────────────────────────────
  useEffect(() => {
    if (!activeMove) return;
    const timeout = setTimeout(() => {
      // If activeMove is still set after 4× the animation window, the
      // useFrame render loop stalled (tab hidden, low memory, etc.).
      // Force-complete so the queue and controls don't stay locked.
      if (activeMoveRef.current === activeMove) {
        handleMoveAnimationComplete(activeMove);
      }
    }, TURN_DURATION_SECONDS * 4 * 1000);
    return () => clearTimeout(timeout);
  }, [activeMove, handleMoveAnimationComplete]);

  // ── Keyboard controls ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (activeMoveRef.current || moveQueueRef.current.length > 0) return;

      const move = KEY_MAP[e.key];
      if (move) dispatchManualMove(move);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dispatchManualMove]);

  // ── Auto-stop timer on solve ─────────────────────────────────────────────────
  useEffect(() => {
    if (!timerRunning) return;
    const isSolved = FACE_ORDER.every(f => displayState[f].every(s => s === displayState[f][0]));
    if (isSolved) {
      clearInterval(timerRef.current);
      setTimerRunning(false);
      setBestTime(prev => {
        const next = timerMs > 0 && (prev === null || timerMs < prev) ? timerMs : prev;
        if (next !== prev && next !== null) {
          localStorage.setItem('rubiks_best_time_ms', String(next));
        }
        return next;
      });
    }
  }, [displayState, timerRunning, timerMs]);

  // ── Timer controls ───────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (timerRunning) return;
    startTimeRef.current = Date.now() - timerMs;
    timerRef.current = setInterval(() => {
      setTimerMs(Date.now() - startTimeRef.current);
    }, 10);
    setTimerRunning(true);
  }, [timerRunning, timerMs]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    if (timerMs > 0) {
      setBestTime((prev) => {
        const next = prev === null || timerMs < prev ? timerMs : prev;
        if (next !== prev) localStorage.setItem('rubiks_best_time_ms', String(next));
        return next;
      });
    }
  }, [timerMs]);

  const toggleTimer = useCallback(() => {
    if (timerRunning) stopTimer();
    else startTimer();
  }, [timerRunning, startTimer, stopTimer]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // ── Cube helpers ─────────────────────────────────────────────────────────────
  const resetCubeToSolved = useCallback(() => {
    const solved = CubeState.createSolvedState();
    cubeStateObj.setState(solved);
    setDisplayState({ ...solved });
  }, [cubeStateObj]);

  // ── Scramble ─────────────────────────────────────────────────────────────────
  const handleScramble = useCallback(() => {
    if (activeMoveRef.current || moveQueueRef.current.length > 0 || isSolvingRemote) return;

    const seq = generateScramble(20);
    setScrambleSeq(seq);

    resetCubeToSolved();
    setMoveHistory([]);
    solveStackRef.current = [];
    setSolveDepth(0);

    // Reset timer and set flag so it auto-starts on the user's first move
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimerMs(0);
    waitingForFirstMoveRef.current = true;

    enqueueMoves(seq);
  }, [enqueueMoves, isSolvingRemote, resetCubeToSolved]);

  // ── Solve ────────────────────────────────────────────────────────────────────
  const handleSolve = useCallback(async () => {
    if (activeMoveRef.current || moveQueueRef.current.length > 0 || isSolvingRemote) return;
    if (solveStackRef.current.length === 0) return;

    setIsSolvingRemote(true);

    try {
      const payload = await solveCubeRemote(cubeStateObj.getState());
      if (!payload.state) {
        throw new Error('Backend did not return a solved state.');
      }

      moveQueueRef.current = [];
      activeMoveRef.current = null;
      setQueuedMoveCount(0);
      setActiveMove(null);

      cubeStateObj.setState(payload.state);
      setDisplayState({ ...payload.state });
      setMoveHistory((prev) => [...prev.slice(-49), 'SOLVED']);
      solveStackRef.current = [];
      setSolveDepth(0);
      waitingForFirstMoveRef.current = false;

      stopTimer();
    } catch (error) {
      console.error('Remote solve failed.', error);
      window.alert(error instanceof Error ? error.message : 'Remote solve failed.');
    } finally {
      setIsSolvingRemote(false);
    }
  }, [cubeStateObj, isSolvingRemote, stopTimer]);

  // ── Reset ────────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (activeMoveRef.current || moveQueueRef.current.length > 0 || isSolvingRemote) return;

    moveQueueRef.current = [];
    activeMoveRef.current = null;
    waitingForFirstMoveRef.current = false;
    setQueuedMoveCount(0);
    setActiveMove(null);

    solveStackRef.current = [];
    setSolveDepth(0);
    setMoveHistory([]);
    setScrambleSeq([]);

    resetCubeToSolved();
    stopTimer();
    setTimerMs(0);
  }, [isSolvingRemote, resetCubeToSolved, stopTimer]);

  // ── 2D face preview ──────────────────────────────────────────────────────────
  const FacePreview = ({ face, label }) => {
    const faceColors = displayState[face] || Array(9).fill('W');
    return (
      <div className="flex flex-col items-center gap-1 min-w-0">
        <span className="font-mono text-[10px] uppercase tracking-widest text-white">{label}</span>
        <div className="grid grid-cols-3 gap-[2px] sm:gap-1">
          {faceColors.map((token, i) => (
            <div
              key={i}
              className="h-4 w-4 rounded-[3px] border border-black/20 sm:h-5 sm:w-5"
              style={{ backgroundColor: TOKEN_HEX[token] ?? '#333' }}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-dictator-void text-white flex flex-col overflow-x-hidden">

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-dictator-chrome/10 bg-dictator-void/90 backdrop-blur-xl sticky top-0 z-50">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-white hover:text-white transition-colors hover:-translate-x-1 duration-200"
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
              : 'bg-[#1A1A1A] border-dictator-chrome/20 text-white hover:border-dictator-red/50 hover:text-white'
            }`}
        >
          <Timer size={14} />
          {formatTime(timerMs)}
        </button>
      </header>

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">

        {/* ── Left Panel: Controls ─────────────────────────────────────────── */}
        <aside className="w-full max-h-[42vh] lg:max-h-none lg:w-[280px] xl:w-[320px] border-b lg:border-b-0 lg:border-r border-dictator-chrome/10 flex flex-col bg-[#0A0A0A] overflow-y-auto">

          {/* Action Buttons */}
          <div className="p-6 border-b border-dictator-chrome/10 grid grid-cols-3 gap-2">
            <button
              onClick={handleScramble}
              disabled={interactionLocked}
              className={`flex items-center justify-center gap-2 font-mono text-xs font-bold uppercase tracking-widest py-3 rounded-xl transition-colors
                ${interactionLocked
                  ? 'bg-dictator-red/30 text-white/70 cursor-not-allowed'
                  : 'bg-dictator-red text-white hover:bg-[#AA1515] active:scale-95'
                }`}
            >
              <Shuffle size={14} />
              Scramble
            </button>
            <button
              onClick={handleSolve}
              disabled={interactionLocked || solveDepth === 0}
              className={`flex items-center justify-center gap-2 font-mono text-xs font-bold uppercase tracking-widest py-3 rounded-xl border transition-all
                ${interactionLocked || solveDepth === 0
                  ? 'bg-[#1A1A1A] border-dictator-chrome/10 text-white/60 cursor-not-allowed'
                  : 'bg-[#1A1A1A] border-dictator-red/40 text-dictator-red hover:border-dictator-red hover:text-white active:scale-95'
                }`}
            >
              <Check size={14} />
              Solve
            </button>
            <button
              onClick={handleReset}
              disabled={interactionLocked}
              className={`flex items-center justify-center gap-2 font-mono text-xs font-bold uppercase tracking-widest py-3 rounded-xl border transition-all
                ${interactionLocked
                  ? 'bg-[#1A1A1A] border-dictator-chrome/10 text-white/60 cursor-not-allowed'
                  : 'bg-[#1A1A1A] border-dictator-chrome/20 text-white hover:border-dictator-chrome/50 hover:text-white active:scale-95'
                }`}
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>

          {/* Scramble display */}
          {scrambleSeq.length > 0 && (
            <div className="p-6 border-b border-dictator-chrome/10">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white mb-2">Scramble</p>
              <p className="font-mono text-xs text-white/70 leading-relaxed break-all">{scrambleSeq.join(' ')}</p>
            </div>
          )}

          {/* Move Buttons */}
          <div className="p-6 border-b border-dictator-chrome/10">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white">Moves</p>
              <span className={`font-mono text-[10px] uppercase tracking-widest ${manualInputLocked ? 'text-dictator-red' : 'text-white/60'}`}>
                {manualInputLocked ? `Locked ${activeMove ? `· ${activeMove}` : ''}` : 'Ready'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MOVE_GROUPS.map(({ label, moves }) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <span className="font-mono text-[9px] text-white/70 uppercase tracking-widest">{label}</span>
                  <div className="flex gap-1.5">
                    {moves.map((move) => (
                      <button
                        key={move}
                        onClick={() => dispatchManualMove(move)}
                        disabled={manualInputLocked}
                        className={`flex-1 font-mono text-xs font-bold py-2 rounded-lg border transition-all duration-150
                          ${manualInputLocked
                            ? 'bg-[#1A1A1A] border-dictator-chrome/10 text-white/30 cursor-not-allowed'
                            : 'bg-[#1A1A1A] border-dictator-chrome/20 text-white hover:bg-dictator-red hover:border-dictator-red active:scale-95'
                          }`}
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
            <p className="font-mono text-[10px] uppercase tracking-widest text-white mb-3">Keyboard</p>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(KEY_MAP).map(([key, move]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <kbd className="font-mono text-[10px] bg-[#1A1A1A] border border-dictator-chrome/20 px-1.5 py-0.5 rounded text-white">{key}</kbd>
                  <span className="font-mono text-[10px] text-white/70">→ {move}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Best time */}
          {bestTime !== null && (
            <div className="p-6 border-b border-dictator-chrome/10">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white mb-1">Best Time</p>
              <p className="font-mono text-2xl font-bold text-dictator-red">{formatTime(bestTime)}</p>
            </div>
          )}

          {/* Move History */}
          <div className="p-6 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white mb-3">
              Move History <span className="text-white/60">({moveHistory.length})</span>
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {moveHistory.length === 0
                ? <span className="font-mono text-[10px] text-white/70">No moves yet</span>
                : moveHistory.map((m, i) => (
                  <span key={i} className="font-mono text-[10px] bg-[#1A1A1A] border border-dictator-chrome/10 px-2 py-1 rounded text-white/70">{m}</span>
                ))
              }
            </div>
          </div>

        </aside>

        {/* ── Center: 3D Canvas ────────────────────────────────────────────── */}
        <main className="relative flex min-h-[360px] min-w-0 flex-1 flex-col overflow-y-auto bg-dictator-void sm:min-h-[420px] lg:min-h-0">

          {/* 3D Cube */}
          <div
            className={`relative flex-1 ${
              isMobileViewport
                ? 'min-h-[320px]'
                : isShortViewport
                  ? 'min-h-[300px] lg:min-h-[280px] xl:min-h-[320px]'
                  : 'min-h-[360px] lg:min-h-[320px] xl:min-h-[420px]'
            }`}
          >
            {canAnimateMoves ? (
              <SimulatorCanvasBoundary
                onError={handleCanvasFailure}
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center p-6">
                    <div className="max-w-md rounded-2xl border border-dictator-red/30 bg-black/55 px-6 py-5 text-center backdrop-blur">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-red mb-2">3D Renderer Disabled</p>
                      <p className="font-body text-sm text-white leading-relaxed">
                        The browser could not initialize WebGL for the animated cube. Move controls and solve tracking still work in fallback mode.
                      </p>
                      {canvasErrorMessage && (
                        <p className="mt-3 rounded-lg border border-dictator-chrome/20 bg-black/40 px-3 py-2 font-mono text-[10px] leading-relaxed text-white/90 break-words">
                          {canvasErrorMessage}
                        </p>
                      )}
                      {canvasErrorDetails && (
                        <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-dictator-chrome/20 bg-black/40 p-3 text-left font-mono text-[10px] leading-relaxed text-white/90 whitespace-pre-wrap break-words">
                          {canvasErrorDetails}
                        </pre>
                      )}
                      <button
                        type="button"
                        onClick={handleCanvasRetry}
                        className="mt-3 inline-flex items-center justify-center rounded-lg border border-dictator-red/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-dictator-red transition-colors hover:bg-dictator-red hover:text-white"
                      >
                        Retry 3D
                      </button>
                    </div>
                  </div>
                }
              >
                <Canvas
                  key={canvasRetryKey}
                  camera={{ position: cameraProfile.position, fov: cameraProfile.fov }}
                  shadows
                  className="w-full h-full"
                >
                  <ResponsiveSceneCamera position={cameraProfile.position} fov={cameraProfile.fov} />
                  <color attach="background" args={['#0D0D0D']} />
                  <ambientLight intensity={0.5} />
                  <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
                  <pointLight position={[-5, -5, -5]} color="#CC1A1A" intensity={0.4} distance={20} />
                  <pointLight position={[5, 5, -5]} color="#1E90FF" intensity={0.2} distance={20} />

                  <InteractiveCube
                    cubeState={displayState}
                    activeMove={activeMove}
                    onMoveComplete={handleMoveAnimationComplete}
                    onUserMove={dispatchManualMove}
                  />
                  <OrbitControls
                    enablePan={false}
                    minDistance={cameraProfile.minDistance}
                    maxDistance={cameraProfile.maxDistance}
                    autoRotate={false}
                    dampingFactor={0.08}
                    enableDamping
                    maxPolarAngle={Math.PI * 0.7}
                  />
                </Canvas>
              </SimulatorCanvasBoundary>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="max-w-md rounded-2xl border border-dictator-red/30 bg-black/55 px-6 py-5 text-center backdrop-blur">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-dictator-red mb-2">3D Renderer Disabled</p>
                  <p className="font-body text-sm text-white leading-relaxed">
                    The browser could not initialize WebGL for the animated cube. Move controls and solve tracking still work in fallback mode.
                  </p>
                  {canvasErrorMessage && (
                    <p className="mt-3 rounded-lg border border-dictator-chrome/20 bg-black/40 px-3 py-2 font-mono text-[10px] leading-relaxed text-white/90 break-words">
                      {canvasErrorMessage}
                    </p>
                  )}
                  {canvasErrorDetails && (
                    <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-dictator-chrome/20 bg-black/40 p-3 text-left font-mono text-[10px] leading-relaxed text-white/90 whitespace-pre-wrap break-words">
                      {canvasErrorDetails}
                    </pre>
                  )}
                  <button
                    type="button"
                    onClick={handleCanvasRetry}
                    className="mt-3 inline-flex items-center justify-center rounded-lg border border-dictator-red/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-dictator-red transition-colors hover:bg-dictator-red hover:text-white"
                  >
                    Retry 3D
                  </button>
                </div>
              </div>
            )}

            {queueActive && (
              <div className="absolute top-4 right-4 bg-black/50 border border-dictator-red/30 rounded-full px-3 py-1.5 flex items-center gap-2 backdrop-blur">
                <span className="w-2 h-2 rounded-full bg-dictator-red animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-dictator-red">
                  {activeMove ? `Turning ${activeMove}` : `${queuedMoveCount} Queued`}
                </span>
              </div>
            )}

            {isSolvingRemote && (
              <div className="absolute top-4 left-4 bg-black/50 border border-dictator-red/30 rounded-full px-3 py-1.5 flex items-center gap-2 backdrop-blur">
                <span className="w-2 h-2 rounded-full bg-dictator-red animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-dictator-red">
                  Solving via Eric C++ WASM
                </span>
              </div>
            )}

            {/* Drag hint */}
            <div className="absolute bottom-3 left-1/2 w-[calc(100%-2rem)] -translate-x-1/2 text-center font-mono text-[10px] text-white/60 uppercase tracking-widest pointer-events-none sm:bottom-4">
              {canAnimateMoves ? 'Drag to rotate · Scroll to zoom' : 'Fallback mode · Use controls to apply moves'}
            </div>
          </div>

          {/* 2D Face Map */}
          <div className="border-t border-dictator-chrome/10 bg-[#0A0A0A] px-4 py-4 sm:px-6 sm:py-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white mb-4">Face Map</p>
            <div className="grid grid-cols-3 gap-x-4 gap-y-4 sm:flex sm:flex-wrap sm:justify-center sm:gap-6">
              {FACE_ORDER.map((face) => (
                <FacePreview key={face} face={face} label={face} />
              ))}
            </div>
          </div>

        </main>

        {/* ── Right Panel: Tutorial ────────────────────────────────────────── */}
        <aside className="w-full max-h-[42vh] lg:max-h-none lg:w-[280px] xl:w-[320px] border-t lg:border-t-0 lg:border-l border-dictator-chrome/10 bg-[#0A0A0A] flex flex-col overflow-y-auto">

          <div className="p-6 border-b border-dictator-chrome/10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white mb-1">// LEARN</p>
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
                <span className={`font-mono text-xs font-bold mt-0.5 shrink-0 ${tutorialStep === i ? 'text-dictator-red' : 'text-white/60'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className={`font-heading text-sm font-bold mb-1 ${tutorialStep === i ? 'text-white' : 'text-white'}`}>
                    {step.title}
                  </p>
                  {tutorialStep === i && (
                    <p className="font-body text-xs text-white leading-relaxed">
                      {step.body}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Algorithm quick-ref */}
          <div className="p-6 border-t border-dictator-chrome/10 mt-auto">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white mb-4">Quick Algorithms</p>
            <div className="flex flex-col gap-3">
              {[
                { name: 'Sexy Move', algo: "R U R' U'" },
                { name: 'F2L Insert', algo: "U R U' R'" },
                { name: 'OLL (Sune)', algo: "R U R' U R U2 R'" },
                { name: 'PLL (U-Perm)', algo: "R U' R U R U R U' R' U' R2" },
                { name: 'T-Perm', algo: "R U R' U' R' F R2 U' R' U' R U R' F'" },
              ].map(({ name, algo }) => (
                <div key={name} className="bg-[#111] rounded-xl p-3 border border-dictator-chrome/10">
                  <p className="font-mono text-[10px] text-white uppercase tracking-widest mb-1">{name}</p>
                  <p className="font-mono text-xs text-dictator-red font-bold">{algo}</p>
                  <button
                    onClick={() => enqueueMoves(algo.split(' '))}
                    disabled={queueActive}
                    className={`mt-2 flex items-center gap-1 font-mono text-[10px] transition-colors
                      ${queueActive ? 'text-white/70 cursor-not-allowed' : 'text-white/70 hover:text-dictator-red'}`}
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
