/**
 * The following ASCII art shows the coordinate system and rotation conventions for PuzzleCube.
 *
 * This section defines:
 *   - Face layout in unfolded form
 *   - Row/column indexing within each face
 *   - Axis directions (X, Y, Z)
 *   - Clockwise rotation perspectives
 *   - Layer numbering convention
 *
 * The origin for layer indexing is the back-upper-left corner
 * of the cube.
 *
 * All rotations and indexing in this class follow this convention.
 */
/*

Face layout of generic cube:
       +------+
       |  up  |
+------+------+------+------+
| left |front |right | back |
+------+------+------+------+
       | down |
       +------+


Row/Column indexing of each tile on a 3x3x3 cube (each face has it's own grid):   
                    +-----+-----+-----+
                    | 0,0 | 0,1 | 0,2 |
                    +-----+-----+-----+
                    | 1,0 | 1,1 | 1,2 |
                    +-----+-----+-----+
                    | 2,0 | 2,1 | 2,2 |
                    +-----+-----+-----+
+-----+-----+-----+ +-----+-----+-----+ +-----+-----+-----+ +-----+-----+-----+
| 0,0 | 0,1 | 0,2 | | 0,0 | 0,1 | 0,2 | | 0,0 | 0,1 | 0,2 | | 0,0 | 0,1 | 0,2 |
+-----+-----+-----+ +-----+-----+-----+ +-----+-----+-----+ +-----+-----+-----+
| 1,0 | 1,1 | 1,2 | | 1,0 | 1,1 | 1,2 | | 1,0 | 1,1 | 1,2 | | 1,0 | 1,1 | 1,2 |
+-----+-----+-----+ +-----+-----+-----+ +-----+-----+-----+ +-----+-----+-----+
| 2,0 | 2,1 | 2,2 | | 2,0 | 2,1 | 2,2 | | 2,0 | 2,1 | 2,2 | | 2,0 | 2,1 | 2,2 |
+-----+-----+-----+ +-----+-----+-----+ +-----+-----+-----+ +-----+-----+-----+
                    +-----+-----+-----+
                    | 0,0 | 0,1 | 0,2 |
                    +-----+-----+-----+
                    | 1,0 | 1,1 | 1,2 |
                    +-----+-----+-----+
                    | 2,0 | 2,1 | 2,2 |
                    +-----+-----+-----+


                   PERSPECTIVE OF CLOCKWISE ROTATIONS
      About the X-axis:     About the Y-axis:     About the Z-axis:
         > > > > > >           > > > > > >           > > > > > >  
       ^ +---------+ v       ^ +---------+ v       ^ +---------+ v
       ^ |         | v       ^ |         | v       ^ |         | v
       ^ |  RIGHT  | v       ^ |   UP    | v       ^ |  FRONT  | v
       ^ |         | v       ^ |         | v       ^ |         | v
       ^ +---------+ v       ^ +---------+ v       ^ +---------+ v
         < < < < < <           < < < < < <           < < < < < <  

                  Layers of each axis of rotation (for 3x3x3 cube):
                                   0  1  2                           _0_ _1_ _2_
                                O ---------> x-axis              0 /___/___/___/|
                            0 / | 0                             1 /___/___/___/||
                           1 /  | 1                            2 /___/___/__ /|/|
                          2 /   | 2                           0 |   |   |   | /||
(pointing forwards) z-axis v    V                               |___|___|___|/|/|
                              y-axis                          1 |   |   |   | /||
                                                                |___|___|___|/|/
                                                              2 |   |   |   | /
                                                                |___|___|___|/
        THE ORIGIN FOR COUNTING LAYERS IS THE BACK-UPPER-LEFT CORNER OF THE CUBE

*/

#ifndef PUZZLECUBE_H
#define PUZZLECUBE_H

#include <vector>

class PuzzleCube {
public:
    enum class Face {
        Up = 0,
        Left, // = 1
        Front, // = 2
        Right, // = 3
        Back, // = 4
        Down // = 5
    };

    enum class RotationAxis{
        X = 0, // vertical slices from left to right
        Y, // = 1, horizontal slices from top to bottom
        Z // = 2, slices from back to front
    };

    /**
     * @brief Constructs an n × n × n puzzle cube.
     * 
     * Initializes the cube in a solved state.
     *
     * @param n The dimension of the cube (e.g., n = 3 creates a 3×3×3 cube).
     *          Must be greater than or equal to 1.
     */
    explicit PuzzleCube(int n);

    /**
     * @brief Resets puzzle cube to its initial state.
     * 
     * Resets all the tiles on the cube to when it was first initialized.
     */
    void reset();

     /**
      * @brief Returns the current state of the puzzle cube. 
      * 
      * The state is stored as a 3-dimensional vector of integers:
      *     - First index: face (0-5)
      *     - Second index: row within the face
      *     - Third index: column within the face
      * 
      * Each integer represents the color of the tile.
      * 
      * @return Const reference to the 3D state container.
      */
    const std::vector<std::vector<std::vector<int>>>& getState() const;

    /**
     * @brief Sets the cube to the provided state.
     *
     * @param newState A 6×N×N vector of integers representing the new state.
     */
    void setState(const std::vector<std::vector<std::vector<int>>>& newState);

    /**
     * @brief Checks if the puzzle cube is in a solved state. 
     * 
     * A cube is considered solved when each face contains a uniform color across all its tiles.
     * 
     * @return true if the cube is solved, false otherwise.
     */
    bool isSolved() const;

    /**
     * @brief Rotates a single layer of the cube around the specified axis.
     *
     * The rotation is performed on the layer indexed along the given axis.
     * Layers are numbered from 0 to N-1:
     *   - X-axis: 0 = leftmost layer, N-1 = rightmost layer
     *   - Y-axis: 0 = topmost layer,  N-1 = bottommost layer
     *   - Z-axis: 0 = backmost layer, N-1 = frontmost layer
     *
     * The direction of rotation is defined relative to the positive axis direction:
     *   - X-axis: clockwise when looking at the Front face
     *   - Y-axis: clockwise when looking at the Up face
     *   - Z-axis: clockwise when looking at the Front face
     *
     * @param axis The axis about which the rotation is performed.
     * @param layer Index of the layer to rotate (0 ≤ layer < N).
     * @param clockwise true for clockwise rotation, false for counterclockwise.
     */
    void rotate(RotationAxis axis, int layer, bool clockwise);

    /**
     * @brief Returns the dimension length of the cube.
     * 
     * @return the value N for an N x N x N cube.
     */
    int size() const { return N; }

private:
    //Size of cube represented with N, as in a N x N x N cube
    int N;

    //cube[face][row][col]
    std::vector<std::vector<std::vector<int>>> cube;

    //Helper function for rotations of face layers
    void rotateFaceMatrix(Face face, bool clockwise);
};

#endif