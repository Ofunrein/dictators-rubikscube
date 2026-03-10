#ifndef CUBEOPERATIONS_H
#define CUBEOPERATIONS_H

class PuzzleCube;

namespace CubeOperations {
//NOTE: WCA standard is to generate a random state, solve it, than reverse the solution for the scramble.
//      This will not be implemented for sprint 1, instead the scramble algorithm will just be random
//      moves, where two consecutive moves cannot undo each other.

    /**
     * @brief Scrambles the puzzle cube.
     * 
     * Performs a specified number of random rotations on the cube.
     * If no number of moves is provided, the default number of 25 rotations is used.
     * 
     * @param cube Reference to the PuzzleCube object.
     * @param moves Number of rotations to perform (default = 25).
     */
    void scramble(PuzzleCube& cube, int moves = 25);

    //NOT IMPLEMENTED THIS SPRINT
    //maybe save moves to solve? (Use a struct Moves)
    //void solve(PuzzleCube& cube);

    //changeCube method?
};

#endif