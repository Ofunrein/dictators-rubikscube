/**
 * solver_bridge.cpp
 *
 * This file is the C++ / WebAssembly bridge for the cube API.
 *
 * Why it exists:
 *   JavaScript cannot call Eric's C++ cube code directly. We compile this file
 *   with Emscripten, then Node.js calls the exported functions through
 *   `backend/api/src/wasmSolver.js`.
 *
 * What this bridge does:
 *   - Keeps the original 3x3 solve exports (`solveCube`, `solveCubeMoves`)
 *   - Creates solved cube states for 2x2, 3x3, and 4x4
 *   - Applies move sequences to a solved cube or an arbitrary cube state
 *   - Generates deterministic scramble sequences when a seed is provided
 *   - Converts between the frontend flat-string layout and PuzzleCube's
 *     internal face layout
 *
 * Flat-string format:
 *   Faces are stored in this order: U R F D L B
 *   Each face is row-major (top-left to bottom-right)
 *   Length is always 6 * size * size
 *
 * Beginner note:
 *   The frontend and backend both use the same public move notation:
 *     U D L R F B   outer turns
 *     M E S         middle slices on odd cubes like 3x3
 *     r l u d f b   4x4 inner slices
 *     x y z         whole-cube rotations
 *   Prime (') means counterclockwise from the face's point of view.
 *   2 means do the same move twice.
 */

#include <emscripten.h>

#include <array>
#include <cstring>
#include <random>
#include <sstream>
#include <string>
#include <vector>

#include "CubeOperations.h"
#include "PuzzleCube.h"

namespace {
    using Face = PuzzleCube::Face;
    using RotationAxis = PuzzleCube::RotationAxis;

    // JS order: U=0, R=1, F=2, D=3, L=4, B=5
    // C++ enum: Up=0, Left=1, Front=2, Right=3, Back=4, Down=5
    constexpr std::array<int, 6> JS_TO_CPP_FACE = {0, 3, 2, 5, 1, 4};
    constexpr std::array<char, 6> SCRAMBLE_FACES = {'U', 'D', 'L', 'R', 'F', 'B'};
    constexpr std::array<const char*, 3> SCRAMBLE_SUFFIXES = {"", "'", "2"};

    bool isSupportedSize(int size) {
        return size >= 2;
    }

    int defaultScrambleLength(int size) {
        switch (size) {
            case 2:
                return 14;
            case 4:
                return 40;
            default:
                return 25;
        }
    }

    int tokenToInt(char token) {
        switch (token) {
            case 'W':
                return 0;
            case 'O':
                return 1;
            case 'G':
                return 2;
            case 'R':
                return 3;
            case 'B':
                return 4;
            case 'Y':
                return 5;
            default:
                return -1;
        }
    }

    char intToToken(int value) {
        switch (value) {
            case 0:
                return 'W';
            case 1:
                return 'O';
            case 2:
                return 'G';
            case 3:
                return 'R';
            case 4:
                return 'B';
            case 5:
                return 'Y';
            default:
                return '?';
        }
    }

    std::size_t expectedFlatLength(int size) {
        return static_cast<std::size_t>(6 * size * size);
    }

    bool loadCubeFromFlat(const char* input, int size, PuzzleCube& cube) {
        if (!input || !isSupportedSize(size) || cube.size() != size) {
            return false;
        }

        const std::size_t flatLength = std::strlen(input);
        if (flatLength != expectedFlatLength(size)) {
            return false;
        }

        std::vector<std::vector<std::vector<int>>> state(
            6,
            std::vector<std::vector<int>>(size, std::vector<int>(size, 0))
        );

        const int stickersPerFace = size * size;

        for (int jsFace = 0; jsFace < 6; jsFace++) {
            const int cppFace = JS_TO_CPP_FACE[jsFace];

            for (int row = 0; row < size; row++) {
                for (int col = 0; col < size; col++) {
                    const int flatIndex = jsFace * stickersPerFace + row * size + col;
                    const int mappedRow = (jsFace == 0 || jsFace == 3) ? (size - 1 - row) : row;
                    const int color = tokenToInt(input[flatIndex]);

                    if (color < 0) {
                        return false;
                    }

                    state[cppFace][mappedRow][col] = color;
                }
            }
        }

        cube.setState(state);
        return true;
    }

    const char* writeCubeToFlat(const PuzzleCube& cube) {
        static std::string output;

        const int size = cube.size();
        const int stickersPerFace = size * size;
        const auto& state = cube.getState();

        output.assign(expectedFlatLength(size), '?');

        for (int jsFace = 0; jsFace < 6; jsFace++) {
            const int cppFace = JS_TO_CPP_FACE[jsFace];

            for (int row = 0; row < size; row++) {
                for (int col = 0; col < size; col++) {
                    const int flatIndex = jsFace * stickersPerFace + row * size + col;
                    const int mappedRow = (jsFace == 0 || jsFace == 3) ? (size - 1 - row) : row;
                    output[flatIndex] = intToToken(state[cppFace][mappedRow][col]);
                }
            }
        }

        return output.c_str();
    }

    struct ParsedMove {
        char base = '\0';
        bool clockwise = true;
        int turns = 1;
    };

    bool parseMoveToken(const std::string& token, ParsedMove& parsed) {
        if (token.empty() || token.size() > 2) {
            return false;
        }

        parsed.base = token[0];
        parsed.clockwise = true;
        parsed.turns = 1;

        if (token.size() == 2) {
            if (token[1] == '\'') {
                parsed.clockwise = false;
            } else if (token[1] == '2') {
                parsed.turns = 2;
            } else {
                return false;
            }
        }

        return true;
    }

    bool applySingleTurn(PuzzleCube& cube, char base, bool clockwise) {
        const int size = cube.size();

        switch (base) {
            case 'U':
                CubeOperations::rotateFace(cube, Face::Up, clockwise);
                return true;
            case 'D':
                CubeOperations::rotateFace(cube, Face::Down, clockwise);
                return true;
            case 'L':
                CubeOperations::rotateFace(cube, Face::Left, clockwise);
                return true;
            case 'R':
                CubeOperations::rotateFace(cube, Face::Right, clockwise);
                return true;
            case 'F':
                CubeOperations::rotateFace(cube, Face::Front, clockwise);
                return true;
            case 'B':
                CubeOperations::rotateFace(cube, Face::Back, clockwise);
                return true;
            case 'M':
                if (size % 2 == 0) return false;
                cube.rotate(RotationAxis::X, size / 2, !clockwise);
                return true;
            case 'E':
                if (size % 2 == 0) return false;
                cube.rotate(RotationAxis::Y, size / 2, !clockwise);
                return true;
            case 'S':
                if (size % 2 == 0) return false;
                cube.rotate(RotationAxis::Z, size / 2, clockwise);
                return true;
            case 'r':
                if (size != 4) return false;
                cube.rotate(RotationAxis::X, size - 2, clockwise);
                return true;
            case 'l':
                if (size != 4) return false;
                cube.rotate(RotationAxis::X, 1, !clockwise);
                return true;
            case 'u':
                if (size != 4) return false;
                cube.rotate(RotationAxis::Y, 1, clockwise);
                return true;
            case 'd':
                if (size != 4) return false;
                cube.rotate(RotationAxis::Y, size - 2, !clockwise);
                return true;
            case 'f':
                if (size != 4) return false;
                cube.rotate(RotationAxis::Z, size - 2, clockwise);
                return true;
            case 'b':
                if (size != 4) return false;
                cube.rotate(RotationAxis::Z, 1, !clockwise);
                return true;
            case 'x':
                CubeOperations::rotateCube(cube, RotationAxis::X, clockwise);
                return true;
            case 'y':
                CubeOperations::rotateCube(cube, RotationAxis::Y, clockwise);
                return true;
            case 'z':
                CubeOperations::rotateCube(cube, RotationAxis::Z, clockwise);
                return true;
            default:
                return false;
        }
    }

    bool applyMoveToken(PuzzleCube& cube, const std::string& token) {
        ParsedMove parsed;
        if (!parseMoveToken(token, parsed)) {
            return false;
        }

        for (int turn = 0; turn < parsed.turns; turn++) {
            if (!applySingleTurn(cube, parsed.base, parsed.clockwise)) {
                return false;
            }
        }

        return true;
    }

    bool applyMoveSequence(PuzzleCube& cube, const char* moves) {
        if (!moves) {
            return false;
        }

        std::istringstream stream(moves);
        std::string token;
        while (stream >> token) {
            if (!applyMoveToken(cube, token)) {
                return false;
            }
        }

        return true;
    }

    std::string generateScrambleSequence(int size, int numMoves, int seed) {
        const int safeMoveCount = numMoves > 0 ? numMoves : defaultScrambleLength(size);

        std::mt19937 generator;
        if (seed >= 0) {
            generator.seed(static_cast<std::mt19937::result_type>(seed));
        } else {
            std::random_device randomDevice;
            generator.seed(randomDevice());
        }

        std::uniform_int_distribution<int> faceDist(0, static_cast<int>(SCRAMBLE_FACES.size() - 1));
        std::uniform_int_distribution<int> suffixDist(0, static_cast<int>(SCRAMBLE_SUFFIXES.size() - 1));

        std::ostringstream sequence;
        char previousFace = '\0';

        for (int index = 0; index < safeMoveCount; index++) {
            char nextFace;
            do {
                nextFace = SCRAMBLE_FACES[faceDist(generator)];
            } while (nextFace == previousFace);

            previousFace = nextFace;

            if (index > 0) {
                sequence << ' ';
            }

            sequence << nextFace << SCRAMBLE_SUFFIXES[suffixDist(generator)];
        }

        return sequence.str();
    }
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
const char* solveCube(const char* input) {
    PuzzleCube cube(3);
    if (!loadCubeFromFlat(input, 3, cube)) {
        return "ERROR";
    }

    CubeOperations::solve3x3(cube);
    return writeCubeToFlat(cube);
}

EMSCRIPTEN_KEEPALIVE
const char* solveCubeMoves(const char* input) {
    static std::string output;

    PuzzleCube cube(3);
    if (!loadCubeFromFlat(input, 3, cube)) {
        output = "ERROR";
        return output.c_str();
    }

    const auto moves = CubeOperations::solve3x3WithMoves(cube);

    std::ostringstream stream;
    for (std::size_t index = 0; index < moves.size(); index++) {
        if (index > 0) {
            stream << ' ';
        }
        stream << moves[index];
    }

    output = stream.str();
    return output.c_str();
}

EMSCRIPTEN_KEEPALIVE
const char* roundTripState(const char* input) {
    PuzzleCube cube(3);
    if (!loadCubeFromFlat(input, 3, cube)) {
        return "ERROR";
    }

    return writeCubeToFlat(cube);
}

EMSCRIPTEN_KEEPALIVE
const char* applyMovesToSolved(const char* moves) {
    PuzzleCube cube(3);
    if (!applyMoveSequence(cube, moves)) {
        return "ERROR";
    }

    return writeCubeToFlat(cube);
}

EMSCRIPTEN_KEEPALIVE
const char* applyMovesToState(const char* input, const char* moves) {
    PuzzleCube cube(3);
    if (!loadCubeFromFlat(input, 3, cube)) {
        return "ERROR";
    }
    if (!applyMoveSequence(cube, moves)) {
        return "ERROR";
    }

    return writeCubeToFlat(cube);
}

EMSCRIPTEN_KEEPALIVE
const char* scrambleCube(int numMoves) {
    const std::string scramble = generateScrambleSequence(3, numMoves, -1);
    PuzzleCube cube(3);
    if (!applyMoveSequence(cube, scramble.c_str())) {
        return "ERROR";
    }

    return writeCubeToFlat(cube);
}

EMSCRIPTEN_KEEPALIVE
const char* createSolvedCubeSized(int size) {
    if (!isSupportedSize(size)) {
        return "ERROR";
    }

    PuzzleCube cube(size);
    return writeCubeToFlat(cube);
}

EMSCRIPTEN_KEEPALIVE
const char* roundTripStateSized(int size, const char* input) {
    if (!isSupportedSize(size)) {
        return "ERROR";
    }

    PuzzleCube cube(size);
    if (!loadCubeFromFlat(input, size, cube)) {
        return "ERROR";
    }

    return writeCubeToFlat(cube);
}

EMSCRIPTEN_KEEPALIVE
const char* applyMovesToSolvedSized(int size, const char* moves) {
    if (!isSupportedSize(size)) {
        return "ERROR";
    }

    PuzzleCube cube(size);
    if (!applyMoveSequence(cube, moves)) {
        return "ERROR";
    }

    return writeCubeToFlat(cube);
}

EMSCRIPTEN_KEEPALIVE
const char* applyMovesToStateSized(int size, const char* input, const char* moves) {
    if (!isSupportedSize(size)) {
        return "ERROR";
    }

    PuzzleCube cube(size);
    if (!loadCubeFromFlat(input, size, cube)) {
        return "ERROR";
    }
    if (!applyMoveSequence(cube, moves)) {
        return "ERROR";
    }

    return writeCubeToFlat(cube);
}

EMSCRIPTEN_KEEPALIVE
const char* scrambleCubeSized(int size, int numMoves, int seed) {
    if (!isSupportedSize(size)) {
        return "ERROR";
    }

    const std::string scramble = generateScrambleSequence(size, numMoves, seed);
    PuzzleCube cube(size);
    if (!applyMoveSequence(cube, scramble.c_str())) {
        return "ERROR";
    }

    return writeCubeToFlat(cube);
}

EMSCRIPTEN_KEEPALIVE
const char* scrambleCubeSequenceSized(int size, int numMoves, int seed) {
    static std::string output;

    if (!isSupportedSize(size)) {
        output = "ERROR";
        return output.c_str();
    }

    output = generateScrambleSequence(size, numMoves, seed);
    return output.c_str();
}

}  // extern "C"
