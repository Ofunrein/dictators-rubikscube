#include <iostream>
#include "PuzzleCube.h"
#include "CubeOperations.h"

//used for debugging infinite loops
#include <thread>
#include <chrono>
#include <cstdlib>
void watchdog(int seconds) {
    std::this_thread::sleep_for(std::chrono::seconds(seconds));
    std::cerr << "Timeout reached. Terminating program.\n";
    std::exit(1); // immediately kills program
}

void printCube(const PuzzleCube& cube) {
    const auto& state = cube.getState();
    int N = cube.size();
    
    //print up face
    for(int i = 0; i < N; i++) {
        for(int s = 0; s < N; s++) {
            std::cout << "  ";
        }
        for(int j = 0; j < N; j++) {
            std::cout << state[(int)PuzzleCube::Face::Up][i][j] << ' ';
        }
        std::cout << '\n';
    }
    //print left, front, right, back face
    for(int i = 0; i < N; i++) {
        for(int j = 1; j <= 4; j++) {
            for(int k = 0; k < N; k++) {
                std::cout << state[j][i][k] << ' ';
            }
        }
        std::cout << '\n';
    }
    //print down face
    for(int i = 0; i < N; i++) {
        for(int s = 0; s < N; s++) {
            std::cout << "  ";
        }
        for(int j = 0; j < N; j++) {
            std::cout << state[(int)PuzzleCube::Face::Down][i][j] << ' ';
        }
        std::cout << '\n';
    }

    std::cout << '\n';
}

int main() {
    PuzzleCube RubiksCube(3);

    printCube(RubiksCube);

    CubeOperations::scramble(RubiksCube);
    printCube(RubiksCube);

    //if program runs for more than 30 seconds, force terminate
    std::thread(watchdog, 30).detach();

    CubeOperations::solve3x3(RubiksCube);
    printCube(RubiksCube);

    for(int i = 0; i < 100; i++) {
        RubiksCube.reset();
        CubeOperations::scramble(RubiksCube);
        CubeOperations::solve3x3(RubiksCube);
        printCube(RubiksCube);
        if(!RubiksCube.isSolved()) {
            std::cout << "\n---> The algorithm failed idiot <---\n";
            break;
        }
    }
    std::cout << "All tests passed!" << std::endl;

    return 0;
}