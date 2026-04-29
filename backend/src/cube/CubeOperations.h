#ifndef CUBEOPERATIONS_H
#define CUBEOPERATIONS_H

#include "PuzzleCube.h"
#include <string>
#include <vector>

class PuzzleCube;

namespace CubeOperations {
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

    /**
     * @brief Rotates the entire cube about a rotation axis.
     *
     * Applies a rigid-body rotation to the whole cube, changing its orientation.
     * The rotation follows the same directional convention as the rotate() method in 
     * PuzzleCube.h, with the rotations being done with respect to a rotation axis.
     *
     * @param cube Reference to the PuzzleCube object to rotate.
     * @param axis The global axis of rotation (e.g., X, Y, or Z).
     * @param clockwise true for clockwise rotation, false for counterclockwise.
     */
    void rotateCube(PuzzleCube& cube, PuzzleCube::RotationAxis axis, bool clockwise);

    /**
     * @brief Rotates a face using standard cube notation.
     *
     * Rotation is defined from the perspective of looking directly at the face.
     *
     * @param cube Reference to the PuzzleCube object.
     * @param face The face to rotate.
     * @param clockwise true for clockwise rotation, false for counterclockwise.
     */
    void rotateFace(PuzzleCube& cube, PuzzleCube::Face face, bool clockwise);

    /**
     * @brief Solves a 3x3 cube from its current state.
     *
     * Follows the white cross algorithm and applies a sequence of moves to solve
     * the cube.
     *
     * @param cube Reference to the PuzzleCube object.
     */
    void solve3x3(PuzzleCube& cube);

    /**
     * @brief Solves a 3x3 cube and returns the move sequence used.
     *
     * @param cube Reference to the PuzzleCube object.
     * @return The recorded move sequence in standard notation.
     */
    std::vector<std::string> solve3x3WithMoves(PuzzleCube& cube);
};

#endif
