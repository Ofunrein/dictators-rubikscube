#include <iostream>
#include "PuzzleCube.h"

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
}

int main() {
    PuzzleCube RubiksCube(3);

    printCube(RubiksCube);
    std::cout << RubiksCube.isSolved();
    std::cout << std::endl;

    RubiksCube.rotate(PuzzleCube::RotationAxis::Y, 1, true);
    printCube(RubiksCube);
    std::cout << RubiksCube.isSolved();
    std::cout << std::endl;

    RubiksCube.rotate(PuzzleCube::RotationAxis::X, 0, false);
    printCube(RubiksCube);
    std::cout << RubiksCube.isSolved();
    std::cout << std::endl;

    RubiksCube.rotate(PuzzleCube::RotationAxis::Z, 2, true);
    printCube(RubiksCube);
    std::cout << RubiksCube.isSolved();
    std::cout << std::endl;

    return 0;
}