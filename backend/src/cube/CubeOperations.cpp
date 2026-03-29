#include "CubeOperations.h"
#include "PuzzleCube.h"
#include <random>

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

}
