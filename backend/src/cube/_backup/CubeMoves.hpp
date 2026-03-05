#ifndef CUBE_MOVES_HPP
#define CUBE_MOVES_HPP

class CubeState;

enum class Move {
  U,
  D,
  L,
  R,
  F,
  B
};

void applyMove(CubeState& state, Move move);

#endif  // CUBE_MOVES_HPP
