"""
nxn-solve.py — Vercel Python serverless function for cube solving

Handles all cube sizes on Vercel where Node.js cannot exec Python:
  3x3 → kociemba (Herbert Kociemba's Two-Phase Algorithm)
  2x2, 4x4 → vendored rubikscubennnsolver

Invoked at POST /api/v1/cube/solve via the vercel.json rewrite:
  { "source": "/api/v1/cube/solve", "destination": "/api/nxn-solve" }

Local dev uses the Node.js subprocess path (pythonNxNSolver.js) instead.
"""

import json
import logging
import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

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

REPO_ROOT = Path(__file__).resolve().parent.parent
VENDOR_PATH = REPO_ROOT / 'backend' / 'vendor' / 'rubiks-cube-NxNxN-solver'


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


def solve_3x3(state):
    import kociemba
    flat = flatten_state_for_solver(state)
    solution_str = kociemba.solve(flat)
    moves = [m for m in solution_str.split() if m]
    return {
        'moves': moves,
        'estimatedMoveCount': len(moves),
        'state': create_solved_state(3),
        'solver': 'kociemba-3x3',
    }


def solve_nxn(state, size):
    os.chdir(str(VENDOR_PATH))
    if str(VENDOR_PATH) not in sys.path:
        sys.path.insert(0, str(VENDOR_PATH))

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
    return solve_nxn(state, size)


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
