cmake_minimum_required(VERSION 3.20)

project(rubiks_backend LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(cube
    src/main.cpp
    src/cube/PuzzleCube.cpp
)
