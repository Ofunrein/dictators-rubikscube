/**
 * PuzzleCube.cpp — Core NxN cube state class
 *
 * Why it exists:
 *   This is the single source of truth for the physical cube state.  Every
 *   algorithm, scramble generator, and WASM bridge ultimately reads from or
 *   writes to the 3-D tile grid managed here.
 *
 * Internal data representation:
 *   cube[face][row][col]  — a 3-D vector<vector<vector<int>>>
 *
 *   Face indices (matching the Face enum in PuzzleCube.h):
 *     0 = Up   1 = Left   2 = Front   3 = Right   4 = Back   5 = Down
 *
 *   Each element is an integer color ID.  In the solved state the constructor
 *   initialises every tile on face f to the value f, so Up is all 0s, Left
 *   all 1s, and so on.  CubeOperations.cpp maps these IDs back to color names
 *   when building the flat string that the frontend consumes.
 *
 * Rotation model:
 *   rotate(axis, layer, clockwise) is the single primitive used by everything
 *   above it.  It handles three rotation axes (X / Y / Z), correctly updates
 *   the face matrix at the two boundary layers (layer 0 and layer N-1), and
 *   cycles the ring of tiles that runs through the given interior or boundary
 *   layer.  Higher-level move names (R, U', F2, M, …) in CubeOperations.cpp
 *   are translated into one or more calls to this method.
 *
 * State management helpers:
 *   getState / setState  — expose the full cube for serialisation and
 *                          copy-on-write patterns used by the solver.
 *   isSolved             — O(6·N²) check: every tile on a face must share the
 *                          same color value as cube[f][0][0].
 *   rotateFaceMatrix     — private 90-degree in-place rotation of an NxN face
 *                          grid; called by rotate() for the two end-cap faces.
 */

#include "PuzzleCube.h"

PuzzleCube::PuzzleCube(int n) : N(n) {
    //set size of cube, 6 faces with each face having NxN tiles
    cube.resize(6, std::vector<std::vector<int>>(N, std::vector<int>(N)));

    //Initialize tile values so that every tile on a given face has the same value
    for(int f = 0; f < 6; f++) { //6 faces (f)
        for(int r = 0; r < N; r++) { //N rows (r)
            for(int c = 0; c < N; c++) { //N columns (c)
                cube[f][r][c] = f;
            }
        }
    }

}

const std::vector<std::vector<std::vector<int>>>& PuzzleCube::getState() const {
    return cube;
}

void PuzzleCube::setState(const std::vector<std::vector<std::vector<int>>>& newState) {
    cube = newState;
}

bool PuzzleCube::isSolved() const {
    //to be solved, every face has to have every tile equal the same value
    for (int f = 0; f < 6; f++) {
        int color = cube[f][0][0];

        for(int r = 0; r < N; r++) {
            for(int c = 0; c < N; c++) {
                if(cube[f][r][c] != color)
                    return false;
            }
        }
    }

    return true;
}

void PuzzleCube::rotate(RotationAxis axis, int layer, bool clockwise) {
    if(layer >= N || layer < 0) return; //Invalid layer number

    switch(axis) {
    case RotationAxis::X:
        //A clockwise rotation about the x-axis is a counter clockwise rotation for the left face
        if(layer == 0)
            rotateFaceMatrix(Face::Left, !clockwise);

        if(layer == N-1)
            rotateFaceMatrix(Face::Right, clockwise);

        //Rotate the ring of tiles in a layer by 90 degrees
        for(int i = 0; i < N; i++) {
            int up = cube[(int)Face::Up][i][layer];
            int front = cube[(int)Face::Front][i][layer];
            int down = cube[(int)Face::Down][i][layer];
            int back = cube[(int)Face::Back][N-1-i][N-1-layer];

            if(clockwise) {
                cube[(int)Face::Up][i][layer] = front;
                cube[(int)Face::Front][i][layer] = down;
                cube[(int)Face::Down][i][layer] = back;
                cube[(int)Face::Back][N-1-i][N-1-layer] = up;
            } else { //Counter clockwise rotation
                cube[(int)Face::Up][i][layer] = back;
                cube[(int)Face::Front][i][layer] = up;
                cube[(int)Face::Down][i][layer] = front;
                cube[(int)Face::Back][N-1-i][N-1-layer] = down;
            }
        }
        break;

    case RotationAxis::Y:
        if(layer == 0)
            rotateFaceMatrix(Face::Up, clockwise);

        //A clockwise rotation about the y-axis is a counter clockwise rotation for the down face
        if(layer == N-1)
            rotateFaceMatrix(Face::Down, !clockwise);

        //Rotate the ring of tiles in a layer by 90 degrees
        for(int i = 0; i < N; i++) {
            int front = cube[(int)Face::Front][layer][i];
            int left = cube[(int)Face::Left][layer][i];
            int back = cube[(int)Face::Back][layer][i];
            int right = cube[(int)Face::Right][layer][i];

            if(clockwise) {
                cube[(int)Face::Front][layer][i] = right;
                cube[(int)Face::Left][layer][i] = front;
                cube[(int)Face::Back][layer][i] = left;
                cube[(int)Face::Right][layer][i] = back;
            } else { //Counter clockwise rotation
                cube[(int)Face::Front][layer][i] = left;
                cube[(int)Face::Left][layer][i] = back;
                cube[(int)Face::Back][layer][i] = right;
                cube[(int)Face::Right][layer][i] = front;
            }
        }
        break;

    case RotationAxis::Z:
        if(layer == 0)
            //A clockwise rotation about the z-axis is a counter clockwise rotation for the back face
            rotateFaceMatrix(Face::Back, !clockwise);

        if(layer == N-1)
            rotateFaceMatrix(Face::Front, clockwise);

        //Rotate the ring of tiles in a layer by 90 degrees
        for(int i = 0; i < N; i++) {
            int up = cube[(int)Face::Up][layer][i];
            int right = cube[(int)Face::Right][i][N-1-layer];
            int down = cube[(int)Face::Down][N-1-layer][N-1-i];
            int left = cube[(int)Face::Left][N-1-i][layer];

            if(clockwise) {
                cube[(int)Face::Up][layer][i] = left;
                cube[(int)Face::Right][i][N-1-layer] = up;
                cube[(int)Face::Down][N-1-layer][N-1-i] = right;
                cube[(int)Face::Left][N-1-i][layer] = down;
            } else { //Counter clockwise rotation
                cube[(int)Face::Up][layer][i] = right;
                cube[(int)Face::Right][i][N-1-layer] = down;
                cube[(int)Face::Down][N-1-layer][N-1-i] = left;
                cube[(int)Face::Left][N-1-i][layer] = up;
            }
        }
        break;

    default:
        return; //Invalid rotation axis
    };

}

void PuzzleCube::rotateFaceMatrix(Face face, bool clockwise) {
    int f = static_cast<int>(face);
    std::vector<std::vector<int>> oldFace = cube[f];

    for(int r = 0; r < N; r++) {
        for(int c = 0; c < N; c++) {
            if(clockwise) {
                cube[f][r][c] = oldFace[N-1-c][r];
            } else { //Counterclockwise rotation
                cube[f][r][c] = oldFace[c][N-1-r];
            }
        }
    }
}