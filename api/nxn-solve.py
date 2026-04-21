"""
nxn-solve.py — Vercel Python serverless function for 2x2 cube solving

Handles only 2x2 solving. 3x3 goes through the Node.js WASM path
(api/v1/[...path].js → wasmSolver.js → Eric's C++ solver).
4x4 is not supported on Vercel — lookup tables (~400 MB) exceed /tmp limits.

Invoked directly at POST /api/nxn-solve by the frontend (api.js routes
size=2 here). The old vercel.json rewrite that blanket-redirected all
/api/v1/cube/solve requests here was removed to restore 3x3 WASM solving.

  2x2 → rubikscubennnsolver (pre-built wheel at api/wheels/)
  4x4 → NotImplementedError (returns 501)

Local dev uses the Node.js path for all sizes:
  pythonNxNSolver.js → nxn_solver_bridge.py → vendored lib at backend/vendor/
"""

import json
import logging
import os
from http.server import BaseHTTPRequestHandler

logging.getLogger().setLevel(logging.ERROR)

FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B']
FACE_COLORS = {'U': 'W', 'R': 'R', 'F': 'G', 'D': 'Y', 'L': 'O', 'B': 'B'}
TOKEN_TO_SOLVER = {'W': 'U', 'R': 'R', 'G': 'F', 'Y': 'D', 'O': 'L', 'B': 'B'}

SOLVER_WIDE_TO_CANONICAL = {
    'Uw': ['U', 'u'], 'Dw': ['D', 'd'], 'Rw': ['R', 'r'],
    'Lw': ['L', 'l'], 'Fw': ['F', 'f'], 'Bw': ['B', 'b'],
}
SOLVER_INNER_TO_CANONICAL = {
    '2U': ['u'], '2D': ['d'], '2R': ['r'],
    '2L': ['l'], '2F': ['f'], '2B': ['b'],
}

# rubikscubennnsolver is installed from a pre-built wheel (api/wheels/).
# It cannot be built from source on Vercel (Python 3.14 removed distutils).
# The wheel was built locally with Python 3.11 from our patched vendored copy.


def remap_face_for_solver(face, stickers, size):
    """Flip U/D rows — vendored solver stores them in opposite vertical order."""
    if face not in ('U', 'D'):
        return stickers
    result = []
    for row in range(size):
        source_row = size - 1 - row
        start = source_row * size
        result.extend(stickers[start:start + size])
    return result


def flatten_state_for_solver(state):
    """Convert { U:[...], R:[...], ... } to a flat URFDLB string with solver face letters."""
    size = int(round(len(state['U']) ** 0.5))
    parts = []
    for face in FACE_ORDER:
        mapped = remap_face_for_solver(face, state[face], size)
        parts.append(''.join(TOKEN_TO_SOLVER[t] for t in mapped))
    return ''.join(parts)


def create_solved_state(size):
    return {face: [FACE_COLORS[face]] * (size * size) for face in FACE_ORDER}


def split_move_suffix(move):
    if move.endswith('2'):
        return move[:-1], '2'
    if move.endswith("'"):
        return move[:-1], "'"
    return move, ''


def normalize_solver_moves(raw_moves, size):
    """Translate vendored solver move notation to our canonical notation."""
    result = []
    for move in raw_moves:
        token = move.strip()
        if not token:
            continue
        if size != 4:
            result.append(token)
            continue
        base, suffix = split_move_suffix(token)
        if base in SOLVER_WIDE_TO_CANONICAL:
            result.extend(m + suffix for m in SOLVER_WIDE_TO_CANONICAL[base])
        elif base in SOLVER_INNER_TO_CANONICAL:
            result.extend(m + suffix for m in SOLVER_INNER_TO_CANONICAL[base])
        else:
            result.append(token)
    return result


def flatten_state_for_kociemba(state):
    """Flatten for kociemba — no U/D row flip (unlike rubikscubennnsolver).
    kociemba expects face letters in our natural row-major order."""
    return ''.join(
        TOKEN_TO_SOLVER[t]
        for face in FACE_ORDER
        for t in state[face]
    )


def solve_3x3(state):
    import kociemba
    flat = flatten_state_for_kociemba(state)
    solution_str = kociemba.solve(flat)
    moves = [m for m in solution_str.split() if m]
    return {
        'moves': moves,
        'estimatedMoveCount': len(moves),
        'state': create_solved_state(3),
        'solver': 'kociemba-3x3',
    }


def solve_nxn(state, size):
    # Vercel's filesystem is read-only except /tmp.
    # The library writes lookup-tables to the working directory, so redirect it.
    os.chdir('/tmp')
    flat = flatten_state_for_solver(state)

    if size == 2:
        from rubikscubennnsolver.RubiksCube222 import RubiksCube222
        cube = RubiksCube222(flat, 'URFDLB', None)
    else:
        from rubikscubennnsolver.RubiksCube444 import RubiksCube444
        cube = RubiksCube444(flat, 'URFDLB', None)

    cube.enable_print_cube = False
    cube.sanity_check()
    cube.solve([])

    raw_moves = [s for s in cube.solution if not s.startswith('COMMENT')]
    move_count = cube.get_solution_len_minus_rotates(cube.solution)
    canonical = normalize_solver_moves(raw_moves, size)

    return {
        'moves': canonical,
        'estimatedMoveCount': move_count,
        'state': create_solved_state(size),
        'solver': f'python-nxn-{size}',
    }


def handle_solve(body):
    size = int(body.get('size', 3))
    state = body.get('state')

    if not state or not isinstance(state, dict):
        raise ValueError("Missing or invalid 'state' in request body.")
    if size not in (2, 3, 4):
        raise ValueError(f"Unsupported cube size: {size}. Must be 2, 3, or 4.")

    if size == 3:
        return solve_3x3(state)
    if size == 4:
        # 4x4 lookup tables are hundreds of MB — too large for Vercel's /tmp.
        raise NotImplementedError(
            '4x4 solving is not available in the deployed version — '
            'run the app locally with `npm run dev` to solve 4x4 cubes.'
        )
    return solve_nxn(state, size)  # size == 2


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length) or b'{}')
            result = handle_solve(body)
            result['size'] = int(body.get('size', 3))
            self._respond(200, result)
        except NotImplementedError as exc:
            self._respond(501, {'error': {'code': 'NOT_SUPPORTED', 'message': str(exc)}})
        except Exception as exc:
            self._respond(500, {'error': {'code': 'SOLVER_FAILURE', 'message': str(exc)}})

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'content-type')

    def _respond(self, code, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass
