cmake_minimum_required(VERSION 3.20)

project(rubiks_backend LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)
FetchContent_Declare(
  httplib
  GIT_REPOSITORY https://github.com/yhirose/cpp-httplib.git
  GIT_TAG        v0.15.3
)
FetchContent_MakeAvailable(httplib)

add_executable(cube_server
    src/main.cpp
    src/cube/PuzzleCube.cpp
    src/cube/CubeOperations.cpp
)

target_include_directories(cube_server PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/src/cube
)

target_link_libraries(cube_server PRIVATE httplib::httplib)