#ifndef CUBE_SOLVER_HPP
#define CUBE_SOLVER_HPP

class CubeState;

class CubeSolver {
 public:
  CubeSolver() = default;
  bool solve(const CubeState& state);
};

#endif  // CUBE_SOLVER_HPP
