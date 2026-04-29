/**
 * CubeOperations.cpp — Face rotations, layer rotations, and the 3×3 solve algorithm
 *
 * Why it exists:
 *   PuzzleCube stores the raw tile grid but knows nothing about cube notation or
 *   solving logic.  This translation layer converts named moves (U, R', F2, M, …)
 *   into the axis/layer/direction calls that PuzzleCube understands, and houses
 *   the beginner-method solve algorithm for 3×3 cubes.
 *
 * Coordinate system — face enum ordering in PuzzleCube.h:
 *   Index 0 = Up    (white center, solved state)
 *   Index 1 = Left
 *   Index 2 = Front
 *   Index 3 = Right
 *   Index 4 = Back
 *   Index 5 = Down  (yellow center, solved state)
 *
 *   RotationAxis::X  — vertical columns (L/R face moves)
 *   RotationAxis::Y  — horizontal rows  (U/D face moves)
 *   RotationAxis::Z  — front-to-back slices (F/B face moves)
 *
 *   Layer 0 is always the layer closest to the face whose axis points in the
 *   positive direction (Right for X, Up for Y, Front for Z).
 *   Layer N-1 is the far side.  Middle slice M/E/S target layer N/2 on odd cubes.
 *
 * WASM compilation:
 *   This file is compiled alongside solver_bridge.cpp via Emscripten.  The bridge
 *   exposes the high-level functions (applyMoves, solveCube, scramble, …) to
 *   Node.js; CubeOperations provides the move-application and solving internals
 *   that the bridge delegates to.
 *
 * Key responsibilities:
 *   - applyMove / applyMoves: parse standard notation tokens and forward to
 *     PuzzleCube::rotate, including wide moves (r, u, f) and whole-cube
 *     rotations (x, y, z) by rotating multiple layers at once.
 *   - isSolved / solveCube: beginner-method 3×3 solver that operates in stages
 *     (daisy → white cross → first layer → second layer → OLL → PLL).
 *   - generateScramble: produces a random move sequence, avoiding redundant
 *     consecutive moves on the same face.
 *   - MoveRecorder (gRecorder): optional recording shim that captures every
 *     applied move token — used by the solver to build the solution move list.
 */

#include "CubeOperations.h"
#include "PuzzleCube.h"
#include <array>
#include <random>
#include <algorithm>
// #include <iostream> //DEBUG

// //DEBUG
// void debugPrintCube(const PuzzleCube& cube) {
//     const auto& state = cube.getState();
//     int N = cube.size();
//
//     //print up face
//     for(int i = 0; i < N; i++) {
//         for(int s = 0; s < N; s++) {
//             std::cout << "  ";
//         }
//         for(int j = 0; j < N; j++) {
//             std::cout << state[(int)PuzzleCube::Face::Up][i][j] << ' ';
//         }
//         std::cout << '\n';
//     }
//     //print left, front, right, back face
//     for(int i = 0; i < N; i++) {
//         for(int j = 1; j <= 4; j++) {
//             for(int k = 0; k < N; k++) {
//                 std::cout << state[j][i][k] << ' ';
//             }
//         }
//         std::cout << '\n';
//     }
//     //print down face
//     for(int i = 0; i < N; i++) {
//         for(int s = 0; s < N; s++) {
//             std::cout << "  ";
//         }
//         for(int j = 0; j < N; j++) {
//             std::cout << state[(int)PuzzleCube::Face::Down][i][j] << ' ';
//         }
//         std::cout << '\n';
//     }
//
//     std::cout << '\n';
// }

namespace {
    using Face = PuzzleCube::Face;
    using RotationAxis = PuzzleCube::RotationAxis;

    struct MoveRecorder {
        bool enabled = false;
        std::vector<std::string> moves;
    };

    MoveRecorder gRecorder;

    std::string tokenFor(char face, bool clockwise) {
        std::string token(1, face);
        if (!clockwise) {
            token.push_back('\'');
        }
        return token;
    }

    void recordFaceTurn(Face face, bool clockwise) {
        if (!gRecorder.enabled) {
            return;
        }

        switch (face) {
            case Face::Up:
                gRecorder.moves.push_back(tokenFor('U', clockwise));
                break;
            case Face::Left:
                gRecorder.moves.push_back(tokenFor('L', clockwise));
                break;
            case Face::Front:
                gRecorder.moves.push_back(tokenFor('F', clockwise));
                break;
            case Face::Right:
                gRecorder.moves.push_back(tokenFor('R', clockwise));
                break;
            case Face::Back:
                gRecorder.moves.push_back(tokenFor('B', clockwise));
                break;
            case Face::Down:
                gRecorder.moves.push_back(tokenFor('D', clockwise));
                break;
        }
    }

    void recordLayerTurn(RotationAxis axis, int layer, bool clockwise, int size) {
        if (!gRecorder.enabled) {
            return;
        }

        std::string token;

        if (axis == RotationAxis::X) {
            if (layer == 0) token = tokenFor('L', !clockwise);
            else if (layer == size - 1) token = tokenFor('R', clockwise);
            else token = tokenFor('M', !clockwise);
        } else if (axis == RotationAxis::Y) {
            if (layer == 0) token = tokenFor('U', clockwise);
            else if (layer == size - 1) token = tokenFor('D', !clockwise);
            else token = tokenFor('E', !clockwise);
        } else {
            if (layer == 0) token = tokenFor('B', !clockwise);
            else if (layer == size - 1) token = tokenFor('F', clockwise);
            else token = tokenFor('S', clockwise);
        }

        gRecorder.moves.push_back(token);
    }

    void recordCubeRotation(RotationAxis axis, bool clockwise) {
        if (!gRecorder.enabled) {
            return;
        }

        if (axis == RotationAxis::X) {
            gRecorder.moves.push_back(tokenFor('x', clockwise));
        } else if (axis == RotationAxis::Y) {
            gRecorder.moves.push_back(tokenFor('y', clockwise));
        } else {
            gRecorder.moves.push_back(tokenFor('z', clockwise));
        }
    }

    void rotateLayerAndRecord(PuzzleCube& cube, RotationAxis axis, int layer, bool clockwise) {
        recordLayerTurn(axis, layer, clockwise, cube.size());
        cube.rotate(axis, layer, clockwise);
    }
}

namespace CubeOperations {
    void scramble(PuzzleCube& cube, int moves) {
        static std::random_device rd; //true random number from system
        static std::mt19937 gen(rd()); //seed the generator with true random number

        //Map pseudo-random numbers to accepted range of integers
        std::uniform_int_distribution<> axisDist(0,2);
        std::uniform_int_distribution<> layerDist(0, cube.size() - 1);
        std::uniform_int_distribution<> dirDist(0,1);

        //Variables to hold randomly generated move
        PuzzleCube::RotationAxis axis;
        int layer;
        bool clockwise;

        //Tracking previous moves, initialized with garbage values to guarentee pass on first check
        auto prevAxis = static_cast<PuzzleCube::RotationAxis>(-1);
        int prevLayer = -1;
        bool prevClockwise = true;

        for(int i = 0; i < moves; i++) {
            //If two consecutive moves are on the same axis and layer, but opposite directions, the moves cancel out.
            //The loop will regenerate the move if this case happens.
            do {
                //Generate pseudo-random numbers to be used as arguments for rotate method
                axis = static_cast<PuzzleCube::RotationAxis>(axisDist(gen));
                layer = layerDist(gen);
                clockwise = dirDist(gen);
            } while(axis == prevAxis && layer == prevLayer && clockwise != prevClockwise);

            cube.rotate(axis, layer, clockwise);
        }
    }

    void rotateCube(PuzzleCube& cube, PuzzleCube::RotationAxis axis, bool clockwise) {
        //Applying a rotation to every layer on an axis is equivalent to rotating the cube itself
        recordCubeRotation(axis, clockwise);
        for(int l = cube.size()-1; l >= 0; l--) {
            cube.rotate(axis, l, clockwise);
        }
    }

    void rotateFace(PuzzleCube& cube, PuzzleCube::Face face, bool clockwise) {
        recordFaceTurn(face, clockwise);
        //Converts face rotation to cube rotate method()
        switch(face) {
        case PuzzleCube::Face::Up:
            cube.rotate(PuzzleCube::RotationAxis::Y, 0, clockwise);
            break;
        case PuzzleCube::Face::Left:
            cube.rotate(PuzzleCube::RotationAxis::X, 0, !clockwise);
            break;
        case PuzzleCube::Face::Front:
            cube.rotate(PuzzleCube::RotationAxis::Z, cube.size()-1, clockwise);
            break;
        case PuzzleCube::Face::Right:
            cube.rotate(PuzzleCube::RotationAxis::X, cube.size()-1, clockwise);
            break;
        case PuzzleCube::Face::Back:
            cube.rotate(PuzzleCube::RotationAxis::Z, 0, !clockwise);
            break;
        case PuzzleCube::Face::Down:
            cube.rotate(PuzzleCube::RotationAxis::Y, cube.size()-1, !clockwise);
        }
    }

    void solve3x3(PuzzleCube& cube) {
        if(cube.size() != 3) { return; } //verifies that the cube is 3x3x3
        if(cube.isSolved()) { return; } //no need to solve an already solved cube

        std::vector<std::vector<std::vector<int>>> cubeState = cube.getState();

        //STEP 0. Orient cube with white face on top and yellow face on bottom
        //First find where white center piece is
        int ft = 0;
        for(int f = 0; f < 6; f++) {
            if(cubeState[f][1][1] == 0) {
                ft = f;
                break;
            }
        }
        //Put white center piece on top, yellow center piece on bottom
        switch(ft) {
        case 0: //up, already in place
            break;
        case 1: //left
            rotateCube(cube, PuzzleCube::RotationAxis::Z, true);
            break;
        case 2: //front
            rotateCube(cube, PuzzleCube::RotationAxis::X, true);
            break;
        case 3: //right
            rotateCube(cube, PuzzleCube::RotationAxis::Z, false);
            break;
        case 4: //back
            rotateCube(cube, PuzzleCube::RotationAxis::X, false);
            break;
        case 5: //down
            rotateCube(cube, PuzzleCube::RotationAxis::X, true); //rotate twice to get on top
            rotateCube(cube, PuzzleCube::RotationAxis::X, true);
            break;
        }
        cubeState = cube.getState();

        // //DEBUG
        // std::cout << "Align white on top\n";
        // debugPrintCube(cube);

//---------------------------------------------------------------------------------------------------------------------
        //STEP 1. Daisy
        //COMPLETED WHEN FOUR LOCKED INDICES
        //tracks which side faces (from 1-4) that shouldn't be rotated due to white edge piece being in place
        bool doNotRotate[4] = {false};
        bool stepComplete = false;
        while(!stepComplete) { //loop keeps running until step is complete
            std::fill(doNotRotate, doNotRotate + 4, false);

            //If white edge piece is at the bottom, it is already in place for this step
            if(cubeState[5][1][0] == 0)
                doNotRotate[1-1] = true; //do not rotate left side (side 1)
            if(cubeState[5][0][1] == 0)
                doNotRotate[2-1] = true; //front (side 2)
            if(cubeState[5][1][2] == 0)
                doNotRotate[3-1] = true; //right (side 3)
            if(cubeState[5][2][1] == 0)
                doNotRotate[4-1] = true; //back (side 4)

            //If white edge piece is at the top...
            for(int r = 0; r <= 2; r++) { //loop will run until no more white edge pieces on top
                for(int c = 0; c <= 2; c++) {
                    if((r + c) % 2 == 0) //skip any non-edge pieces
                        continue;

                    //if white edge found on top face
                    if(cubeState[0][r][c] == 0) {
                        ft = 1; //track which face layer the edge piece sits on
                        if(r == 1 && c == 0) { ft = 1; } //left
                        if(r == 2 && c == 1) { ft = 2; } //front
                        if(r == 1 && c == 2) { ft = 3; } //right
                        if(r == 0 && c == 1) { ft = 4; } //back

                        while(doNotRotate[ft-1]) { //lines up white edge piece with empty spot
                            rotateLayerAndRecord(cube, PuzzleCube::RotationAxis::Y, 0, false); //rotate top and try again
                            ft = ((ft) % 4) + 1; //update which face layer the edge piece is on
                        }
                        rotateFace(cube, static_cast<PuzzleCube::Face>(ft), true); //double rotate to insert
                        rotateFace(cube, static_cast<PuzzleCube::Face>(ft), true);
                        doNotRotate[ft-1] = true; //lock out face layer from rotating
                        cubeState = cube.getState(); //update map of cube

                        // //DEBUG
                        // std::cout << "White edge on top, inserted\n";
                        // debugPrintCube(cube);
                    }
                }
            }

            //If white edge piece is on side face...
            for(int f = 1; f <= 4; f++) { //cycle through every side face (1-4)
                for(int r = 0; r <= 2; r++) { //loop will run until no more white edge pieces on top
                    for(int c = 0; c <= 2; c++) {
                        if((r + c) % 2 == 0) //skip any non-edge pieces
                            continue;

                        //if white edge found on side face
                        if(cubeState[f][r][c] == 0) {
                            ft = f; //track which face layer the edge piece sits on

                            while(doNotRotate[ft-1]) { //moves white edge piece to face that is not locked
                                rotateLayerAndRecord(cube, PuzzleCube::RotationAxis::Y, r, false); //rotate top and try again
                                ft = ((ft) % 4) + 1; //update which face layer the edge piece is on
                            }
                            cubeState = cube.getState(); //update map of cube

                            //if white edge piece is on top or bottom row, move it to the middle
                            if(r != 1) {
                                rotateFace(cube, static_cast<PuzzleCube::Face>(ft), true);
                                cubeState = cube.getState();
                            }

                            if(cubeState[ft][1][0] == 0) { //white edge piece is on the left column
                                rotateLayerAndRecord(cube, PuzzleCube::RotationAxis::Y, 1, false);
                                rotateFace(cube, static_cast<PuzzleCube::Face>(ft), true);
                                doNotRotate[ft-1] = true; //lock out face layer from rotating
                                cubeState = cube.getState(); //update map of cube
                            }
                            if(cubeState[ft][1][2] == 0) { //white edge piece is on the right column
                                rotateLayerAndRecord(cube, PuzzleCube::RotationAxis::Y, 1, true);
                                rotateFace(cube, static_cast<PuzzleCube::Face>(ft), false);
                                doNotRotate[ft-1] = true; //lock out face layer from rotating
                                cubeState = cube.getState(); //update map of cube
                            }

                            // //DEBUG
                            // std::cout << "White edge on side, inserted\n";
                            // debugPrintCube(cube);
                        }
                    }
                }
            }
            
            //if all four white edges have been inserted into the bottom face, all faces should be locked
            if(std::all_of(doNotRotate, doNotRotate + 4, [](bool b){ return b;})) {
                stepComplete = true;
            }

        }
        // //DEBUG
        // std::cout << "Daisy Complete!\n";
        // debugPrintCube(cube);
        
//---------------------------------------------------------------------------------------------------------------------
        //STEP 2. White cross
        //COMPLETED WHEN ALL WHITE EDGE PIECES ARE INSERTED PROPERLY INTO THE WHITE CROSS
        for(int f = 1; f <= 4; f++) {
            //line up edge piece with corresponding center piece color (ensure the white edge piece is getting rotated)
            while((cubeState[f][1][1] != cubeState[f][2][1]) || (cubeState[5][abs(f-2)][-abs(f-3)+2] != 0)) {
                rotateLayerAndRecord(cube, PuzzleCube::RotationAxis::Y, 2, true);
                cubeState = cube.getState();
            }
            //insert into white cross
            rotateFace(cube, static_cast<PuzzleCube::Face>(f), true);
            rotateFace(cube, static_cast<PuzzleCube::Face>(f), true);
            cubeState = cube.getState();

            // //DEBUG
            // std::cout << "White edge alligned and inserted\n";
            // debugPrintCube(cube);
        }
        // //DEBUG
        // std::cout << "White Cross Complete!\n";
        // debugPrintCube(cube);

//---------------------------------------------------------------------------------------------------------------------
        //STEP 3. Solve first layer
        //COMPLETED WHEN FIRST LAYER OF CUBE IS SOLVED
        //First reorient cube to put the white cross on the bottom
        rotateCube(cube, PuzzleCube::RotationAxis::X, true);
        rotateCube(cube, PuzzleCube::RotationAxis::X, true);
        cubeState = cube.getState();

        // //DEBUG
        // std::cout << "Reoriented cube\n";
        // debugPrintCube(cube);

        //for dealing with white tiles on the top face
        bool whiteTileOnTop = false;
        int rt = 0;
        int ct = 0;

        int passes = 0; //tracks the amount of side faces scanned that had no white tiles
    startOfFirstLayerSolver:
        //white corner in the top left of the front face?
        if(cubeState[(int)PuzzleCube::Face::Front][0][0] == 0) {
            rotateCube(cube, PuzzleCube::RotationAxis::Y, false);
            cubeState = cube.getState();

            //match corner color to center piece
            while(cubeState[2][0][2] != cubeState[2][1][1]) { //Front face is index 2
                rotateLayerAndRecord(cube, PuzzleCube::RotationAxis::Y, 0, true);
                rotateCube(cube, PuzzleCube::RotationAxis::Y, false);
                cubeState = cube.getState();
            }

            //insert corner piece
            rotateFace(cube, PuzzleCube::Face::Right, true);
            rotateFace(cube, PuzzleCube::Face::Up, true);
            rotateFace(cube, PuzzleCube::Face::Right, false);
            cubeState = cube.getState();
            passes = 0; //reset pass counter

            // //DEBUG
            // std::cout << "White corner inserted\n";
            // debugPrintCube(cube);
        }
        //white corner in the top right of the front face?
        if(cubeState[(int)PuzzleCube::Face::Front][0][2] == 0) {
            rotateCube(cube, PuzzleCube::RotationAxis::Y, true);
            cubeState = cube.getState();

            //match corner color to center piece
            while(cubeState[2][0][0] != cubeState[2][1][1]) { //Front face is index 2
                rotateLayerAndRecord(cube, PuzzleCube::RotationAxis::Y, 0, false);
                rotateCube(cube, PuzzleCube::RotationAxis::Y, true);
                cubeState = cube.getState();
            }

            //insert corner piece
            rotateFace(cube, PuzzleCube::Face::Left, false);
            rotateFace(cube, PuzzleCube::Face::Up, false);
            rotateFace(cube, PuzzleCube::Face::Left, true);
            cubeState = cube.getState();
            passes = 0; //reset pass counter

            // //DEBUG
            // std::cout << "White corner inserted\n";
            // debugPrintCube(cube);
        }

        //Bottom left of the front face?
        if(cubeState[(int)PuzzleCube::Face::Front][2][0] == 0) {
            //move to top row
            rotateFace(cube, PuzzleCube::Face::Left, false);
            rotateFace(cube, PuzzleCube::Face::Up, true);
            rotateFace(cube, PuzzleCube::Face::Left, true);
            cubeState = cube.getState();
            
            goto startOfFirstLayerSolver;
        }
        //Bottom right of the front face?
        if(cubeState[(int)PuzzleCube::Face::Front][2][2] == 0) {
            //move to top row
            rotateFace(cube, PuzzleCube::Face::Right, true);
            rotateFace(cube, PuzzleCube::Face::Up, false);
            rotateFace(cube, PuzzleCube::Face::Right, false);
            cubeState = cube.getState();

            goto startOfFirstLayerSolver;
        }

        passes++; //Face is clear of white tiles if all conditionals were passed through
        //Reorient the cube and search again. If four passes clear side faces, proceed to next check
        if(passes < 4) {
            rotateCube(cube, PuzzleCube::RotationAxis::Y, false);
            cubeState = cube.getState();

            goto startOfFirstLayerSolver;
        }

        whiteTileOnTop = false;
        rt = 0;
        ct = 0;
        //Checking for white tiles on the top face
        for(int r = 0; r <= 2; r++) {
            for(int c = 0; c <=2; c++) {
                if((r + c) % 2 == 1) //skip edge pieces
                    continue;

                if(cubeState[(int)PuzzleCube::Face::Up][r][c] == 0) { //check for white tile
                    whiteTileOnTop = true;
                }
                if(cubeState[(int)PuzzleCube::Face::Down][r][c] != 0) { //find empty spot in white face
                    rt = r;
                    ct = c;
                }
            }
        }
        if(whiteTileOnTop) {
            //align white tile over empty spot in white face
            while(cubeState[(int)PuzzleCube::Face::Up][2 - rt][ct] != 0) {
                rotateLayerAndRecord(cube, PuzzleCube::RotationAxis::Y, 0, true);
                cubeState = cube.getState();
            }
            //Align cube for next set of moves
            while(cubeState[(int)PuzzleCube::Face::Down][0][0] == 0) {
                rotateCube(cube, PuzzleCube::RotationAxis::Y, true);
                cubeState = cube.getState();
            }

            rotateFace(cube, PuzzleCube::Face::Left, false);
            rotateFace(cube, PuzzleCube::Face::Up, true);
            rotateFace(cube, PuzzleCube::Face::Up, true);
            rotateFace(cube, PuzzleCube::Face::Left, true);
            cubeState = cube.getState();

            goto startOfFirstLayerSolver;
        }

        //check first layer...
        for(int f = 1; f <= 4; f++) {
            for(int c : {0, 2}) { //only check corners
                //if any of the first layer tiles are out of place, a white corner has been mismatched
                if(cubeState[f][2][c] != cubeState[f][1][1]) {
                    //boot the mismatched white tile and do the scan again
                    if (c == 0) { //left corner
                        rotateFace(cube, static_cast<PuzzleCube::Face>(f), true);
                        rotateFace(cube, PuzzleCube::Face::Up, true);
                        rotateFace(cube, static_cast<PuzzleCube::Face>(f), false);
                        rotateFace(cube, PuzzleCube::Face::Up, false);
                    }
                    else { //c == 2, right corner
                        rotateFace(cube, static_cast<PuzzleCube::Face>(f), false);
                        rotateFace(cube, PuzzleCube::Face::Up, false);
                        rotateFace(cube, static_cast<PuzzleCube::Face>(f), true);
                        rotateFace(cube, PuzzleCube::Face::Up, true);
                    }
                    cubeState = cube.getState();

                    passes = 0; //reset passes so that it actually checks all faces again
                    goto startOfFirstLayerSolver;
                }
            }
        }
        cubeState = cube.getState();
        //If first layer check passed, this step is complete
        // //DEBUG
        // std::cout << "First Layer Complete!\n";
        // debugPrintCube(cube);
        
//---------------------------------------------------------------------------------------------------------------------
        //STEP 4. Solve second layer
        //COMPLETED WHEN SECOND LAYER OF CUBE IS SOLVED
        bool topRowClear = false; //flag for if the top row no longer has any non-yellow edge pieces
    startOfSecondLayerSolver:
        for(int i = 0; i < 4; i++) { //only checks four times for four side faces
            //if edge piece has no yellow, allign and proceed
            if(cubeState[(int)PuzzleCube::Face::Front][0][1] != 5 && cubeState[(int)PuzzleCube::Face::Up][2][1] != 5) {
                //If edge piece is not aligned, keep rotating
                while(cubeState[(int)PuzzleCube::Face::Front][0][1] != cubeState[(int)PuzzleCube::Face::Front][1][1]) {
                    rotateLayerAndRecord(cube, PuzzleCube::RotationAxis::Y, 0, false);
                    rotateCube(cube, PuzzleCube::RotationAxis::Y, true);
                    cubeState = cube.getState();
                }

                //If top color of edge piece matches left center piece, perform left algorithm
                if(cubeState[(int)PuzzleCube::Face::Up][2][1] == cubeState[(int)PuzzleCube::Face::Left][1][1]) {
                    //insert the edge piece into the second layer left version
                    rotateFace(cube, PuzzleCube::Face::Up, false);
                    rotateFace(cube, PuzzleCube::Face::Left, false);
                    rotateFace(cube, PuzzleCube::Face::Up, true);
                    rotateFace(cube, PuzzleCube::Face::Left, true);
                    rotateFace(cube, PuzzleCube::Face::Up, true);
                    rotateFace(cube, PuzzleCube::Face::Front, true);
                    rotateFace(cube, PuzzleCube::Face::Up, false);
                    rotateFace(cube, PuzzleCube::Face::Front, false);
                    cubeState = cube.getState();

                    // //DEBUG
                    // std::cout << "Edge piece inserted\n";
                    // debugPrintCube(cube);

                    break; //break from for-loop and proceed to top row check
                }
                //If top color of edge piece matches right center piece, perform right algorithm
                if(cubeState[(int)PuzzleCube::Face::Up][2][1] == cubeState[(int)PuzzleCube::Face::Right][1][1]) {
                    //insert the edge piece into the second layer right version
                    rotateFace(cube, PuzzleCube::Face::Up, true);
                    rotateFace(cube, PuzzleCube::Face::Right, true);
                    rotateFace(cube, PuzzleCube::Face::Up, false);
                    rotateFace(cube, PuzzleCube::Face::Right, false);
                    rotateFace(cube, PuzzleCube::Face::Up, false);
                    rotateFace(cube, PuzzleCube::Face::Front, false);
                    rotateFace(cube, PuzzleCube::Face::Up, true);
                    rotateFace(cube, PuzzleCube::Face::Front, true);
                    cubeState = cube.getState();

                    // //DEBUG
                    // std::cout << "Edge piece inserted\n";
                    // debugPrintCube(cube);

                    break; //break from for-loop and proceed to top row check
                }
            }

            //otherwise keep checking
            rotateLayerAndRecord(cube, PuzzleCube::RotationAxis::Y, 0, true);
            cubeState = cube.getState();

            //if fourth iteration is cleared, all edge pieces in top layer have yellow
            if(i == 3) {
                topRowClear = true;
            }
        }

        if(!topRowClear) { //reiterate until all non-yellow edge pieces are in the second layer
            goto startOfSecondLayerSolver;
        }

        //check second layer...
        for(int i = 0; i < 4; i++) {
            for(int c : {0, 2}) { //only check edges
                //if any of the second layer tiles are out of place, an edge piece has been mismatched
                if(cubeState[(int)PuzzleCube::Face::Front][1][c] != cubeState[(int)PuzzleCube::Face::Front][1][1]) {
                    //boot the mismatched edge piece by inserting a random piece and do the scan again
                    if (c == 0) { //left edge
                        //insert the edge piece into the second layer left version
                        rotateFace(cube, PuzzleCube::Face::Up, false);
                        rotateFace(cube, PuzzleCube::Face::Left, false);
                        rotateFace(cube, PuzzleCube::Face::Up, true);
                        rotateFace(cube, PuzzleCube::Face::Left, true);
                        rotateFace(cube, PuzzleCube::Face::Up, true);
                        rotateFace(cube, PuzzleCube::Face::Front, true);
                        rotateFace(cube, PuzzleCube::Face::Up, false);
                        rotateFace(cube, PuzzleCube::Face::Front, false);
                        cubeState = cube.getState();

                        // //DEBUG
                        // std::cout << "Edge piece booted\n";
                        // debugPrintCube(cube);
                    }
                    else { //c == 2, right edge
                        //insert the edge piece into the second layer right version
                        rotateFace(cube, PuzzleCube::Face::Up, true);
                        rotateFace(cube, PuzzleCube::Face::Right, true);
                        rotateFace(cube, PuzzleCube::Face::Up, false);
                        rotateFace(cube, PuzzleCube::Face::Right, false);
                        rotateFace(cube, PuzzleCube::Face::Up, false);
                        rotateFace(cube, PuzzleCube::Face::Front, false);
                        rotateFace(cube, PuzzleCube::Face::Up, true);
                        rotateFace(cube, PuzzleCube::Face::Front, true);
                        cubeState = cube.getState();

                        // //DEBUG
                        // std::cout << "Edge piece booted\n";
                        // debugPrintCube(cube);
                    }

                    topRowClear = false; //reset flag so that it actually checks all faces again
                    goto startOfSecondLayerSolver;
                }
            }
            rotateCube(cube, PuzzleCube::RotationAxis::Y, true); //look at next face
            cubeState = cube.getState();
        }
        cubeState = cube.getState();
        //If second layer check passed, this step is complete
        // //DEBUG
        // std::cout << "Second Layer Complete!\n";
        // debugPrintCube(cube);

//---------------------------------------------------------------------------------------------------------------------
        //STEP 5. Make yellow cross
        //COMPLETED WHEN ALL FOUR YELLOW EDGES ARE ON TOP FACE
        int count = 0; //will track the number of yellow edges on the top face
        while(count < 4) { //when all yellow edges are one the top face, the yellow cross is formed
            //count number of yellow edges on top face
            for(int r = 0; r <= 2; r++) {
                for(int c = 0; c <=2; c++) {
                    if((r + c) % 2 == 0) //skip corner pieces
                        continue;

                    if(cubeState[(int)PuzzleCube::Face::Up][r][c] == 5) { //check for yellow tile
                        count++;
                    }
                }
            }

            if(count != 4) {
                if(count == 2) { //either a right angle or line on the top face
                    //align top face
                    while(!(cubeState[(int)PuzzleCube::Face::Up][1][0] == 5 &&
                            (cubeState[(int)PuzzleCube::Face::Up][0][1] == 5 ||
                             cubeState[(int)PuzzleCube::Face::Up][1][2] == 5) )) {
                        rotateLayerAndRecord(cube, PuzzleCube::RotationAxis::Y, 0, true);
                        cubeState = cube.getState();
                    }
                }
                //Algorithm to make the yellow cross
                rotateFace(cube, PuzzleCube::Face::Front, true);
                rotateFace(cube, PuzzleCube::Face::Up, true);
                rotateFace(cube, PuzzleCube::Face::Right, true);
                rotateFace(cube, PuzzleCube::Face::Up, false);
                rotateFace(cube, PuzzleCube::Face::Right, false);
                rotateFace(cube, PuzzleCube::Face::Front, false);
                cubeState = cube.getState();

                count = 0;
            }
        }
        cubeState = cube.getState();
        // //DEBUG
        // std::cout << "Yellow Cross Complete!\n";
        // debugPrintCube(cube);

//---------------------------------------------------------------------------------------------------------------------
        //STEP 6. Solve yellow face
        //COMPLETED WHEN ALL FOUR YELLOW CORNERS ARE ON TOP FACE
        count = 0; //will track the number of yellow corners on the top face
        while(count < 4) { //when all yellow corners are one the top face, the yellow face is solved
            //count number of yellow corners on top face
            for(int r: {0, 2}) {
                for(int c: {0, 2}) {
                    if(cubeState[(int)PuzzleCube::Face::Up][r][c] == 5) { //check for yellow tile
                        count++;
                    }
                }
            }

            if(count != 4) {
                if(count == 1) { //top face looks like a fish
                    //align top face so that the fish is pointing bottom-left
                    while(cubeState[(int)PuzzleCube::Face::Up][2][0] != 5) {
                        rotateLayerAndRecord(cube, PuzzleCube::RotationAxis::Y, 0, true);
                        cubeState = cube.getState();
                    }
                }
                if(count == 2) { //top face looks either like a tank or a figure-eight
                    //align top face so that there is a yellow tile on the upper-left of the front face
                    while(!(cubeState[(int)PuzzleCube::Face::Front][0][0] == 5)) {
                        rotateLayerAndRecord(cube, PuzzleCube::RotationAxis::Y, 0, true);
                        cubeState = cube.getState();
                    }
                }
                //Algorithm for solving yellow face
                rotateFace(cube, PuzzleCube::Face::Right, true);
                rotateFace(cube, PuzzleCube::Face::Up, true);
                rotateFace(cube, PuzzleCube::Face::Right, false);
                rotateFace(cube, PuzzleCube::Face::Up, true);
                rotateFace(cube, PuzzleCube::Face::Right, true);
                rotateFace(cube, PuzzleCube::Face::Up, true);
                rotateFace(cube, PuzzleCube::Face::Up, true);
                rotateFace(cube, PuzzleCube::Face::Right, false);
                cubeState = cube.getState();

                count = 0; //reset counter
            }
        }
        cubeState = cube.getState();
        // //DEBUG
        // std::cout << "Yellow Face Complete!\n";
        // debugPrintCube(cube);

//---------------------------------------------------------------------------------------------------------------------
        //Step 7. Solve third layer corners
        //COMPLETED WHEN ALL FOUR CORNER PIECES ARE IN PLACE
        count = 0; //will track the number of corner pieces that are solved
        while(count < 4) { //when all corner pieces are solved, proceed to next step
            //these are to track where each solved corner is
            int corner1 = 0;
            int corner2 = 0;
            //align corner pieces
            while(count < 2) {
                //keep rotating top layer until two corners are in the correct place
                rotateLayerAndRecord(cube, PuzzleCube::RotationAxis::Y, 0, false);
                cubeState = cube.getState();
                count = 0;

                for(int f = 1; f <= 4; f++) { //checking every face
                    //check side tiles of the corner piece and if it matches the center piece, it is solved
                    if((cubeState[f][0][2] == cubeState[f][1][1]) &&
                       (cubeState[(f%4)+1][0][0] == cubeState[(f%4)+1][1][1])) {

                        corner2 = corner1;
                        corner1 = f;
                        count++;
                    }
                }
            }

            // //DEBUG
            // std::cout << "Corner pieces aligned\n";
            // debugPrintCube(cube);

            if(count != 4) {
                if(abs(corner1 - corner2) == 1) { //the solved corner pieces are next to each other
                    //Bcause of this, one of the faces has two top corner tiles match the center, move this face to the back
                    while((cubeState[(int)PuzzleCube::Face::Back][0][0] != cubeState[(int)PuzzleCube::Face::Back][1][1]) ||
                          (cubeState[(int)PuzzleCube::Face::Back][0][2] != cubeState[(int)PuzzleCube::Face::Back][1][1])) {
                        
                        rotateCube(cube, PuzzleCube::RotationAxis::Y, true);
                        cubeState = cube.getState();
                    }

                    // //DEBUG
                    // std::cout << "Corner pieces moved to back\n";
                    // debugPrintCube(cube);
                }
                //Algorithm to solve corners
                rotateFace(cube, PuzzleCube::Face::Right, false);
                rotateFace(cube, PuzzleCube::Face::Front, true);
                rotateFace(cube, PuzzleCube::Face::Right, false);
                rotateFace(cube, PuzzleCube::Face::Back, true);
                rotateFace(cube, PuzzleCube::Face::Back, true);
                rotateFace(cube, PuzzleCube::Face::Right, true);
                rotateFace(cube, PuzzleCube::Face::Front, false);
                rotateFace(cube, PuzzleCube::Face::Right, false);
                rotateFace(cube, PuzzleCube::Face::Back, true);
                rotateFace(cube, PuzzleCube::Face::Back, true);
                rotateFace(cube, PuzzleCube::Face::Right, true);
                rotateFace(cube, PuzzleCube::Face::Right, true);
                cubeState = cube.getState();

                count = 0; //reset counter
            }
        }
        cubeState = cube.getState();
        // //DEBUG
        // std::cout << "Third Layer Corners Complete!\n";
        // debugPrintCube(cube);

//---------------------------------------------------------------------------------------------------------------------
        //Step 7. Solve remaining top edge pieces
        //COMPLETED WHEN CUBE IS SOLVED
        //Last step, loop will run until the cube is solved
        while(!cube.isSolved()) {
            //Check if top-middle tile on side face matches center piece (this indicates a solved side face)
            for(int f = 1; f <= 4; f++) {
                if(cubeState[f][0][1] == cubeState[f][1][1]) {
                    //Move solved side face to the back
                    while(cubeState[(int)PuzzleCube::Face::Back][0][1] != cubeState[(int)PuzzleCube::Face::Back][1][1]) {
                        rotateCube(cube, PuzzleCube::RotationAxis::Y, true);
                        cubeState = cube.getState();
                    }

                    // //DEBUG
                    // std::cout << "Solved face moved to back\n";
                    // debugPrintCube(cube);

                    break; //no need to continue with for loop once solved face is moved to back
                }
            }
            //Algorithm to solve top layer edge pieces
            rotateFace(cube, PuzzleCube::Face::Front, true);
            rotateFace(cube, PuzzleCube::Face::Front, true);
            rotateFace(cube, PuzzleCube::Face::Up, true);
            rotateFace(cube, PuzzleCube::Face::Left, true);
            rotateFace(cube, PuzzleCube::Face::Right, false);
            rotateFace(cube, PuzzleCube::Face::Front, true);
            rotateFace(cube, PuzzleCube::Face::Front, true);
            rotateFace(cube, PuzzleCube::Face::Left, false);
            rotateFace(cube, PuzzleCube::Face::Right, true);
            rotateFace(cube, PuzzleCube::Face::Up, true);
            rotateFace(cube, PuzzleCube::Face::Front, true);
            rotateFace(cube, PuzzleCube::Face::Front, true);
            cubeState = cube.getState();

            // //DEBUG
            // std::cout << "Last algorithm!\n";
            // debugPrintCube(cube);
        }

        // //DEBUG
        // std::cout << "CUBE IS SOLVED HOORAY!\n";
        // debugPrintCube(cube);
    }

    std::vector<std::string> solve3x3WithMoves(PuzzleCube& cube) {
        gRecorder.enabled = true;
        gRecorder.moves.clear();

        solve3x3(cube);

        gRecorder.enabled = false;
        return gRecorder.moves;
    }

}
