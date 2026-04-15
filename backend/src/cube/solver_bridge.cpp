/**
 * solver_bridge.cpp
 *
 * WASM-exported bridge between the JavaScript API and the C++ CFOP solver.
 *
 * Input/output format:
 *   A 54-character string, faces in order: U R F D L B
 *   Each face is 9 characters, row-major (top-left to bottom-right).
 *
 * Color token <-> C++ integer mapping:
 *   W=0 (white, Up),  O=1 (orange, Left), G=2 (green, Front),
 *   R=3 (red, Right), B=4 (blue, Back),   Y=5 (yellow, Down)
 *
 * JS face order  -> C++ face enum:
 *   U(0)=Up(0), R(1)=Right(3), F(2)=Front(2), D(3)=Down(5), L(4)=Left(1), B(5)=Back(4)
 */

#include <emscripten.h>
#include <sstream>
#include <string>
#include <cstring>
#include "PuzzleCube.h"
#include "CubeOperations.h"

// JS face index → C++ face enum value
// JS order: U=0, R=1, F=2, D=3, L=4, B=5
// C++ enum: Up=0, Left=1, Front=2, Right=3, Back=4, Down=5
static const int JS_TO_CPP_FACE[6] = { 0, 3, 2, 5, 1, 4 };

static int tokenToInt(char c) {
    switch (c) {
        case 'W': return 0;
        case 'O': return 1;
        case 'G': return 2;
        case 'R': return 3;
        case 'B': return 4;
        case 'Y': return 5;
        default:  return 0;
    }
}

static char intToToken(int i) {
    switch (i) {
        case 0: return 'W';
        case 1: return 'O';
        case 2: return 'G';
        case 3: return 'R';
        case 4: return 'B';
        case 5: return 'Y';
        default: return 'W';
    }
}

static bool loadCubeFromFlat(const char* input, PuzzleCube& cube) {
    if (!input || strlen(input) != 54) {
        return false;
    }

    std::vector<std::vector<std::vector<int>>> state(
        6, std::vector<std::vector<int>>(3, std::vector<int>(3, 0))
    );

    for (int jsFace = 0; jsFace < 6; jsFace++) {
        int cppFace = JS_TO_CPP_FACE[jsFace];
        for (int r = 0; r < 3; r++) {
            for (int c = 0; c < 3; c++) {
                int flatIdx = jsFace * 9 + r * 3 + c;
                const int mappedRow = (jsFace == 0 || jsFace == 3) ? (2 - r) : r;
                state[cppFace][mappedRow][c] = tokenToInt(input[flatIdx]);
            }
        }
    }

    cube.setState(state);
    return true;
}

extern "C" {

/**
 * Solve the cube state given as a 54-char flat string.
 * Returns a pointer to a static 55-byte buffer holding the solved state.
 * The caller must copy the result before calling again.
 *
 * Returns "ERROR" (5 chars) if the input is malformed.
 */
EMSCRIPTEN_KEEPALIVE
const char* solveCube(const char* input) {
    static char output[56];

    PuzzleCube cube(3);
    if (!loadCubeFromFlat(input, cube)) {
        strncpy(output, "ERROR", 6);
        return output;
    }
    CubeOperations::solve3x3(cube);

    // Read the solved state back out in JS face order
    const auto& solved = cube.getState();
    for (int jsFace = 0; jsFace < 6; jsFace++) {
        int cppFace = JS_TO_CPP_FACE[jsFace];
        for (int r = 0; r < 3; r++) {
            for (int c = 0; c < 3; c++) {
                int flatIdx = jsFace * 9 + r * 3 + c;
                const int mappedRow = (jsFace == 0 || jsFace == 3) ? (2 - r) : r;
                output[flatIdx] = intToToken(solved[cppFace][mappedRow][c]);
            }
        }
    }
    output[54] = '\0';
    return output;
}

/**
 * Solve the cube and return the move list as a space-separated string.
 * Returns "ERROR" on malformed input.
 */
EMSCRIPTEN_KEEPALIVE
const char* solveCubeMoves(const char* input) {
    static std::string output;

    PuzzleCube cube(3);
    if (!loadCubeFromFlat(input, cube)) {
        output = "ERROR";
        return output.c_str();
    }

    const auto moves = CubeOperations::solve3x3WithMoves(cube);

    std::ostringstream stream;
    for (std::size_t i = 0; i < moves.size(); i++) {
        if (i > 0) {
            stream << ' ';
        }
        stream << moves[i];
    }

    output = stream.str();
    return output.c_str();
}

} // extern "C"
