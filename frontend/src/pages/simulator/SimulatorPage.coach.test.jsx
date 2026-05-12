import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

// ---- Mock all 3D/WebGL deps before component import ----
vi.mock('three', () => {
  const mockObj = { position: { set: vi.fn() }, rotation: {}, children: [], add: vi.fn(), remove: vi.fn() };
  return {
    WebGLRenderer: vi.fn(() => ({ render: vi.fn(), setSize: vi.fn(), setPixelRatio: vi.fn(), domElement: document.createElement('canvas'), dispose: vi.fn() })),
    Scene: vi.fn(() => mockObj),
    PerspectiveCamera: vi.fn(() => ({ ...mockObj, aspect: 1, updateProjectionMatrix: vi.fn() })),
    BoxGeometry: vi.fn(),
    MeshStandardMaterial: vi.fn(() => ({ dispose: vi.fn() })),
    MeshLambertMaterial: vi.fn(() => ({ dispose: vi.fn() })),
    Mesh: vi.fn(() => ({ ...mockObj, geometry: {}, material: {} })),
    Group: vi.fn(() => mockObj),
    AmbientLight: vi.fn(() => mockObj),
    DirectionalLight: vi.fn(() => ({ ...mockObj, position: { set: vi.fn() } })),
    Color: vi.fn(),
    Vector2: vi.fn(() => ({ x: 0, y: 0 })),
    Vector3: vi.fn(() => ({ x: 0, y: 0, z: 0, set: vi.fn(), normalize: vi.fn(), clone: vi.fn(() => ({ normalize: vi.fn() })), subVectors: vi.fn(), multiplyScalar: vi.fn(), length: vi.fn(() => 0), dot: vi.fn(() => 0), cross: vi.fn(() => ({ normalize: vi.fn() })) })),
    Raycaster: vi.fn(() => ({ setFromCamera: vi.fn(), intersectObjects: vi.fn(() => []) })),
    PlaneGeometry: vi.fn(),
    Quaternion: vi.fn(() => ({ setFromAxisAngle: vi.fn() })),
    Euler: vi.fn(),
    Matrix4: vi.fn(() => ({ makeRotationAxis: vi.fn(() => ({ extractRotation: vi.fn() })) })),
    MOUSE: { LEFT: 0, MIDDLE: 1, RIGHT: 2 },
    TOUCH: { ROTATE: 0, PAN: 2 },
    default: {},
  };
});

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, onCreated }) => {
    if (onCreated) onCreated({ gl: { domElement: document.createElement('canvas') } });
    return <div data-testid="r3f-canvas">{children}</div>;
  },
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    gl: { domElement: document.createElement('canvas'), setSize: vi.fn() },
    camera: { position: { set: vi.fn() }, lookAt: vi.fn(), aspect: 1, updateProjectionMatrix: vi.fn() },
    scene: { add: vi.fn(), remove: vi.fn() },
    size: { width: 800, height: 600 },
    events: { connect: vi.fn() },
  })),
  extend: vi.fn(),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: vi.fn(() => null),
  PerspectiveCamera: vi.fn(() => null),
  Html: vi.fn(({ children }) => <div>{children}</div>),
}));

// Mock local simulator modules that have heavy deps
vi.mock('./InteractiveCube', () => ({
  InteractiveCube: vi.fn(() => null),
  SimulatorCanvasBoundary: vi.fn(({ children }) => <div>{children}</div>),
  ResponsiveSceneCamera: vi.fn(() => null),
}));

vi.mock('./useCubeControls', () => ({
  useCubeControls: vi.fn(() => ({})),
}));

vi.mock('./useSimulatorQueue', () => ({
  useSimulatorQueue: vi.fn(() => ({
    cubeState: {
      U: Array(9).fill('white'),
      R: Array(9).fill('red'),
      F: Array(9).fill('green'),
      D: Array(9).fill('yellow'),
      L: Array(9).fill('orange'),
      B: Array(9).fill('blue'),
    },
    displayState: {
      U: Array(9).fill('white'),
      R: Array(9).fill('red'),
      F: Array(9).fill('green'),
      D: Array(9).fill('yellow'),
      L: Array(9).fill('orange'),
      B: Array(9).fill('blue'),
    },
    moveHistory: [],
    queueActive: false,
    activeMove: null,
    activeMoveId: null,
    activeMoveDurationSeconds: 0,
    queuedMoveCount: 0,
    solveDepth: 0,
    activeMoveRef: { current: null },
    moveQueueRef: { current: [] },
    enqueueMove: vi.fn(),
    enqueueSequence: vi.fn(),
    applyMovesInstantly: vi.fn(),
    clearQueue: vi.fn(),
    clearPendingAnimation: vi.fn(),
    undoMove: vi.fn(),
    setMoveHistory: vi.fn(),
    setSolveDepth: vi.fn(),
    handleMoveAnimationComplete: vi.fn(),
  })),
}));

vi.mock('./useSimulatorActions', () => ({
  useSimulatorActions: vi.fn(() => ({
    isScrambling: false,
    isSolving: false,
    isTimedSolveSession: false,
    timerPrimed: false,
    scrambleSeq: [],
    onScramble: vi.fn(),
    onSolve: vi.fn(),
    onReset: vi.fn(),
    onSizeChange: vi.fn(),
  })),
}));

vi.mock('./SimulatorControls', () => ({
  default: vi.fn(() => null),
}));

vi.mock('./TutorialPanel', () => ({
  default: vi.fn(() => null),
}));

vi.mock('./SimulatorFaceMap', () => ({
  default: vi.fn(() => null),
}));

vi.mock('./CanvasFallbackPanel', () => ({
  default: vi.fn(() => null),
}));

vi.mock('./useTimer', () => ({
  useTimer: vi.fn(() => ({
    timerRunning: false,
    elapsed: 0,
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    resetTimer: vi.fn(),
  })),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock('../../context/ThemeContext', () => ({
  useTheme: vi.fn(() => ({ isDark: false })),
}));

vi.mock('../../lib/stats', () => ({
  saveSolveResult: vi.fn(),
}));

vi.mock('../../cube/CubeState', () => {
  const solvedFaces = {
    U: Array(9).fill('white'),
    R: Array(9).fill('red'),
    F: Array(9).fill('green'),
    D: Array(9).fill('yellow'),
    L: Array(9).fill('orange'),
    B: Array(9).fill('blue'),
  };
  function CubeState(size = 3) {
    this.size = size;
    this.state = { ...solvedFaces };
    this.getState = vi.fn(() => ({ ...solvedFaces }));
    this.setState = vi.fn();
  }
  CubeState.createSolvedState = vi.fn(() => ({ ...solvedFaces }));
  CubeState.validate = vi.fn((s) => s);
  return { CubeState };
});

// Mock the AI API call
vi.mock('../../net/api', () => ({
  requestAiHelp: vi.fn(),
  fetchSolvedState: vi.fn(() => Promise.resolve({
    state: {
      U: Array(9).fill('white'),
      R: Array(9).fill('red'),
      F: Array(9).fill('green'),
      D: Array(9).fill('yellow'),
      L: Array(9).fill('orange'),
      B: Array(9).fill('blue'),
    }
  })),
  applyMoveRemote: vi.fn(),
  generateScrambleRemote: vi.fn(),
  solveCubeRemote: vi.fn(),
  pingBackend: vi.fn(),
}));

import SimulatorPage from './SimulatorPage.jsx';

// jsdom does not implement scrollIntoView — polyfill it globally
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const MOCK_COACH_RESPONSE = {
  requestId: 'test-req-1',
  coachMessage: {
    id: 'msg-1',
    role: 'assistant',
    mode: 'hint',
    content: 'Try moving the top layer clockwise.',
    moves: ['U'],
    nextActions: ['Look at your cross', 'Align corners'],
    disclaimer: '',
  },
};

function renderSimulator() {
  return render(
    <BrowserRouter>
      <SimulatorPage />
    </BrowserRouter>
  );
}

// ---------------------------------------------------------------------------
// Solver label tests — unit-test useSimulatorActions directly via renderHook.
// vi.mock above stubs the module for SimulatorPage renders; we bypass it here
// by importing the real implementation via vi.importActual inside each test.
// ---------------------------------------------------------------------------
describe('useSimulatorActions — solveStatusLabel', () => {
  // Shared mock deps for renderHook
  let mockProps;

  beforeEach(() => {
    const cubeStateMock = {
      getState: vi.fn(() => ({
        U: Array(9).fill('white'),
        R: Array(9).fill('red'),
        F: Array(9).fill('green'),
        D: Array(9).fill('yellow'),
        L: Array(9).fill('orange'),
        B: Array(9).fill('blue'),
      })),
      setState: vi.fn(),
    };

    mockProps = {
      cubeSize: 3,
      setCubeSize: vi.fn(),
      cubeStateObjRef: { current: cubeStateMock },
      solveStackRef: { current: [] },
      setDisplayState: vi.fn(),
      enqueueMoves: vi.fn(),
      clearPendingAnimation: vi.fn(),
      setMoveHistory: vi.fn(),
      setSolveDepth: vi.fn(),
      clearSelectedStickerRef: { current: vi.fn() },
      timer: {
        timerRunning: false,
        timerMs: 0,
        startFreshTimer: vi.fn(),
        stopTimer: vi.fn(),
        resetTimer: vi.fn(),
      },
      queueActive: false,
      bumpLayout: vi.fn(),
      scrambleLength: 20,
      moveHistory: [],
    };
  });

  it('shows "Solving 3x3 via Kociemba" for 3x3 with short history (≤10 moves) in production', async () => {
    // Short 3x3 scrambles use the kociemba path via /api/nxn-solve on Vercel
    vi.stubEnv('DEV', false);

    const { solveCubeRemote: mockSolve } = await import('../../net/api');
    let resolveRemote;
    mockSolve.mockReturnValue(new Promise((res) => { resolveRemote = res; }));

    const { useSimulatorActions: realHook } = await vi.importActual('./useSimulatorActions');

    mockProps.solveStackRef.current = ['U', 'R', 'F', 'L', 'B'];  // 5 moves

    const { result } = renderHook(() => realHook(mockProps));

    act(() => {
      result.current.handleSolve();
    });

    await waitFor(() => {
      expect(result.current.isSolvingRemote).toBe(true);
    });

    expect(result.current.solveStatusLabel).toBe('Solving 3x3 via Kociemba');

    resolveRemote({ moves: [] });

    vi.unstubAllEnvs();
  });

  it('shows "Solving via Eric C++ WASM" for 3x3 with >10 history moves', async () => {
    const { solveCubeRemote: mockSolve } = await import('../../net/api');
    let resolveRemote;
    mockSolve.mockReturnValue(new Promise((res) => { resolveRemote = res; }));

    const { useSimulatorActions: realHook } = await vi.importActual('./useSimulatorActions');

    // 11 moves
    mockProps.solveStackRef.current = ['U','R','F','L','B','U','R','F','L','B','U'];

    const { result } = renderHook(() => realHook(mockProps));

    act(() => {
      result.current.handleSolve();
    });

    await waitFor(() => {
      expect(result.current.isSolvingRemote).toBe(true);
    });

    expect(result.current.solveStatusLabel).toBe('Solving via Eric C++ WASM');

    resolveRemote({ moves: [] });
  });
});

describe('AI Coach panel', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('coach panel is not visible on initial render', () => {
    renderSimulator();
    expect(screen.queryByText('AI Cube Coach')).toBeNull();
  });

  it('opens coach panel when AI Coach button clicked', async () => {
    const user = userEvent.setup();
    renderSimulator();
    await user.click(screen.getByRole('button', { name: /open ai cube coach/i }));
    expect(screen.getByText('AI Cube Coach')).toBeTruthy();
    expect(screen.getByText('Ready')).toBeTruthy();
  });

  it('closes coach panel when close button clicked', async () => {
    const user = userEvent.setup();
    renderSimulator();
    await user.click(screen.getByRole('button', { name: /open ai cube coach/i }));
    expect(screen.getByText('AI Cube Coach')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /close ai cube coach/i }));
    expect(screen.queryByText('AI Cube Coach')).toBeNull();
  });

  it('renders assistant message after successful API response', async () => {
    const { requestAiHelp } = await import('../../net/api');
    requestAiHelp.mockResolvedValue(MOCK_COACH_RESPONSE);

    const user = userEvent.setup();
    renderSimulator();
    await user.click(screen.getByRole('button', { name: /open ai cube coach/i }));

    // The 'hint' button text is lowercase 'hint' (the explain mode renders as 'Why')
    const hintBtn = screen.getByRole('button', { name: /^hint$/i });
    await user.click(hintBtn);

    await waitFor(() => {
      expect(screen.getByText('Try moving the top layer clockwise.')).toBeTruthy();
    }, { timeout: 3000 });

    expect(screen.getByText('U')).toBeTruthy();
  });

  it('renders error message when API call throws', async () => {
    const { requestAiHelp } = await import('../../net/api');
    requestAiHelp.mockRejectedValue(new Error('Network error'));

    const user = userEvent.setup();
    renderSimulator();
    await user.click(screen.getByRole('button', { name: /open ai cube coach/i }));

    const hintBtn = screen.getByRole('button', { name: /^hint$/i });
    await user.click(hintBtn);

    await waitFor(() => {
      expect(screen.getByText('Coach Error')).toBeTruthy();
    }, { timeout: 3000 });
  });
});
