#!/usr/bin/env python3
"""
nxn_solver_bridge.py - Small JSON bridge around the vendored NxN Python solver.

Node calls this file for 2x2 and 4x4 solves. It keeps the Python-specific
solver setup in one place and returns a tiny JSON payload back to the API.

Input:
  --mode solve|apply
  --size 2|4
  --state <flattened URFDLB sticker string using solver face letters>
  --moves <space-separated move list>   # apply mode only

Output:
  {"size": 4, "solved": true, "move_count": 58, "moves": [...]}
"""

import argparse
import json
import logging
import os
import sys
from pathlib import Path

INTERNAL_FACE_ORDER = "ULFRBD"
REQUEST_FACE_ORDER = "URFDLB"


def build_cube(size: int, state: str):
    if size == 2:
        from rubikscubennnsolver.RubiksCube222 import RubiksCube222

        return RubiksCube222(state, "URFDLB", None)

    if size == 4:
        from rubikscubennnsolver.RubiksCube444 import RubiksCube444

        return RubiksCube444(state, "URFDLB", None)

    raise ValueError(f"Unsupported NxN bridge size: {size}")


def reorder_internal_state(flat_state: str, size: int) -> str:
    chunk_size = size * size
    by_face = {
        face: flat_state[index * chunk_size:(index + 1) * chunk_size]
        for index, face in enumerate(INTERNAL_FACE_ORDER)
    }
    return "".join(by_face[face] for face in REQUEST_FACE_ORDER)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("solve", "apply"), default="solve")
    parser.add_argument("--size", type=int, required=True)
    parser.add_argument("--state", type=str, required=True)
    parser.add_argument("--moves", type=str, default="")
    args = parser.parse_args()

    vendor_root = Path(__file__).resolve().parents[3] / "vendor" / "rubiks-cube-NxNxN-solver"
    os.chdir(vendor_root)
    sys.path.insert(0, str(vendor_root))
    venv_bin = Path(sys.executable).parent
    os.environ["PATH"] = f"{venv_bin}:{os.environ.get('PATH', '')}"

    logging.getLogger().setLevel(logging.ERROR)

    cube = build_cube(args.size, args.state)
    cube.enable_print_cube = False
    cube.sanity_check()

    if args.mode == "apply":
        for step in args.moves.split():
            cube.rotate(step)

        print(json.dumps({
            "mode": "apply",
            "size": args.size,
            "solved": cube.solved(),
            "state": reorder_internal_state("".join(cube.state[1:]), args.size),
        }))
        return 0

    cube.solve([])

    solution_moves = [step for step in cube.solution if not step.startswith("COMMENT")]
    move_count = cube.get_solution_len_minus_rotates(cube.solution)

    print(json.dumps({
        "mode": "solve",
        "size": args.size,
        "solved": cube.solved(),
        "move_count": move_count,
        "moves": solution_moves,
    }))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        raise
