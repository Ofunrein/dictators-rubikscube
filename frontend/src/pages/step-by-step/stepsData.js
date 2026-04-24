/**
 * stepsData.js — Data module for the step-by-step solving guide
 *
 * Why it exists:
 *   Centralises all content for the guided solve pages so that GuidePanel.jsx
 *   and StepByStepPage.jsx can stay logic-focused.  Adding or editing a guide
 *   step only requires touching this file.
 *
 * CDN:
 *   All GIF assets are hosted on GitHub via the raw-content CDN:
 *     https://raw.githubusercontent.com/Ofunrein/cube-solving-guide-gifs/main
 *   The CDN constant is exported so other modules can build asset URLs without
 *   hard-coding the base path.
 *
 * STEPS array shape:
 *   Each object in STEPS represents one slide in the guide:
 *     step       {number}   — logical step number (multiple slides can share a
 *                             step number to show sub-stages of the same stage)
 *     title      {string}   — short heading shown at the top of GuidePanel
 *     subtitle   {string}   — secondary heading below the title
 *     text       {string}   — explanatory prose shown in the guide body
 *     gif        {string}   — URL of the illustrative GIF (or local SVG for step 0)
 *     algorithms {Array}    — list of clickable algorithm buttons, each with:
 *                               label {string}  — button display text
 *                               moves {string}  — space-separated move notation
 *                                                 string (e.g. "R U R'")
 *
 *   An empty algorithms array means no buttons are rendered for that slide.
 *
 * TOTAL_STEPS:
 *   Derived count of distinct logical steps (not slides); used by the progress
 *   indicator in GuidePanel to show "Step X of N".
 */

export const CDN = 'https://raw.githubusercontent.com/Ofunrein/cube-solving-guide-gifs/main';

export const STEPS = [
  {
    step: 0,
    title: 'Introduction',
    subtitle: 'Notation & Terminology',
    text: `This guide walks you through solving a 3×3 Rubik's Cube using a beginner algorithm optimized for straightforwardness, not speed. It details every step with moves in standard cube notation and visual aids.\n\nIn this guide, "tiles" refers to the 9 colored squares on each face (sometimes called "stickers"), while "pieces" refers to the cubic pieces tiles rest on (sometimes called "cubies"). "Corner" pieces sit at the corners and have 3 colored tiles. "Edge" pieces sit between corners and have 2 colored tiles. The center tile on each face determines that face's color — a face with a yellow center is the "yellow face."\n\nStandard notation for 90° clockwise rotations:\n• L — Left face\n• R — Right face\n• U — Up face\n• D — Down face\n• F — Front face\n• B — Back face\n• M — Middle layer (between L and R), follows L direction\n• E — Equator layer (between D and U), follows D direction\n• S — Standing layer (between F and B), follows F direction\n\nAdd an apostrophe (') for counterclockwise: U' means turn the Up face 90° counterclockwise. Add "2" for a double turn: F2 means turn the Front face twice.`,
    gif: '/cube-notation.svg',
    algorithms: [],
  },
  {
    step: 1,
    title: 'Step 1',
    subtitle: 'The Daisy',
    text: `Form a "daisy" by moving all four white edge tiles next to the yellow center tile. There's no specific algorithm — just move white edges to the top face without displacing ones already in place. Corner colors don't matter yet.`,
    gif: `${CDN}/Daisy.gif`,
    algorithms: [],
  },
  {
    step: 2,
    title: 'Step 2',
    subtitle: 'The White Cross',
    text: `With the daisy formed, look at the other color on each white edge piece. Rotate the top layer until that side color matches the center tile of its side face. Then rotate that side face twice (e.g. F2) to send the white edge down.`,
    gif: `${CDN}/White_Cross_From_Daisy.gif`,
    algorithms: [],
  },
  {
    step: 2,
    title: 'Step 2',
    subtitle: 'White Cross — Result',
    text: `You should now have a white cross on the bottom with each edge's side color matching the center tile of its face.`,
    gif: `${CDN}/White_Cross_Solved.gif`,
    algorithms: [],
  },
  {
    step: 3,
    title: 'Step 3',
    subtitle: 'First Layer — Corner Insert',
    text: `Flip the cube so white is on the bottom. Find a white corner tile on the top row of a side face. Rotate the top layer until the other side color matches a center tile. Then insert:\n\n• Right side: R U R'\n• Left side: L' U' L`,
    gif: `${CDN}/First_Layer_Tile_Insert.gif`,
    algorithms: [
      { label: 'Right insert', moves: "R U R'" },
      { label: 'Left insert', moves: "L' U' L" },
    ],
  },
  {
    step: 3,
    title: 'Step 3',
    subtitle: 'First Layer — Bottom Row Tile',
    text: `If a white tile is stuck in the bottom row instead of the top, move it up first:\n\n• Right side: R U' R'\n• Left side: L' U L\n\nThen use the normal insertion algorithm.`,
    gif: `${CDN}/First_Layer_Bottom_Row_Tile.gif`,
    algorithms: [
      { label: 'Right bump up', moves: "R U' R'" },
      { label: 'Left bump up', moves: "L' U L" },
    ],
  },
  {
    step: 3,
    title: 'Step 3',
    subtitle: 'First Layer — Top Face Tile',
    text: `If the white tile is on the top face, rotate the top layer until it's above an unsolved corner. Then:\n\n• Right side: R U2 R'\n• Left side: L' U2 L\n\nThis moves it to the top row so you can insert normally.`,
    gif: `${CDN}/First_Layer_Top_Tile.gif`,
    algorithms: [
      { label: 'Right drop', moves: "R U2 R'" },
      { label: 'Left drop', moves: "L' U2 L" },
    ],
  },
  {
    step: 3,
    title: 'Step 3',
    subtitle: 'First Layer — Result',
    text: `After inserting all four white corner pieces, you should have a solved white face and a complete first layer.`,
    gif: `${CDN}/First_Layer_Solved.gif`,
    algorithms: [],
  },
  {
    step: 4,
    title: 'Step 4',
    subtitle: 'Second Layer — Right Insert',
    text: `With the first layer solved, it's time to solve the second layer by inserting all non-yellow edge pieces. Find an edge piece in the top layer and look at the side tile's color — line it up with the corresponding side face center tile.\n\nIf the top tile on the edge piece matches the right side's color, perform the right-side insertion algorithm:\n\nU R U' R' U' F' U F\n\nNotice how you first move the corner piece next to the edge piece, then move pieces out of the way so they can be re-inserted with the front face rotations.`,
    gif: `${CDN}/Second_Layer_Right_Insert.gif`,
    algorithms: [
      { label: 'Right insert', moves: "U R U' R' U' F' U F" },
    ],
  },
  {
    step: 4,
    title: 'Step 4',
    subtitle: 'Second Layer — Left Insert',
    text: `If the top color matches the left side:\n\nU' L' U L U F U' F'`,
    gif: `${CDN}/Second_Layer_Left_Insert.gif`,
    algorithms: [
      { label: 'Left insert', moves: "U' L' U L U F U' F'" },
    ],
  },
  {
    step: 4,
    title: 'Step 4',
    subtitle: 'Second Layer — Mismatch Fix',
    text: `If all top-layer edges have yellow but the second layer isn't solved, you have a mismatch. "Boot" the misplaced edge by inserting any other edge into its spot using the left/right algorithm. The mismatched piece goes to the top layer where you can re-insert it correctly.`,
    gif: `${CDN}/Second_Layer_Mismatch.gif`,
    algorithms: [
      { label: 'Boot right', moves: "U R U' R' U' F' U F" },
      { label: 'Boot left', moves: "U' L' U L U F U' F'" },
    ],
  },
  {
    step: 4,
    title: 'Step 4',
    subtitle: 'Second Layer — Result',
    text: `With all four non-yellow edge pieces correctly inserted, the second layer is solved.`,
    gif: `${CDN}/Second_Layer_Solved.gif`,
    algorithms: [],
  },
  {
    step: 5,
    title: 'Step 5',
    subtitle: 'Yellow Cross — Dot',
    text: `Time to make a yellow cross on top. The only algorithm you need is the "dog algorithm":\n\nF U R U' R' F'\n\n(FUR-URF, like a dog's fur and bark!)\n\nIf you have a yellow dot (no yellow edges on top), just perform the algorithm.`,
    gif: `${CDN}/Yellow_Cross_Dot.gif`,
    algorithms: [
      { label: 'Dog algorithm', moves: "F U R U' R' F'" },
    ],
  },
  {
    step: 5,
    title: 'Step 5',
    subtitle: 'Yellow Cross — Bar',
    text: `If you have a yellow bar (two opposite yellow edges), orient it left-to-right, then perform:\n\nF U R U' R' F'`,
    gif: `${CDN}/Yellow_Cross_Bar.gif`,
    algorithms: [
      { label: 'Dog algorithm', moves: "F U R U' R' F'" },
    ],
  },
  {
    step: 5,
    title: 'Step 5',
    subtitle: 'Yellow Cross — Crescent',
    text: `If you have a yellow crescent (two perpendicular yellow edges), orient them pointing up-and-left, then perform:\n\nF U R U' R' F'`,
    gif: `${CDN}/Yellow_Cross_Crescent.gif`,
    algorithms: [
      { label: 'Dog algorithm', moves: "F U R U' R' F'" },
    ],
  },
  {
    step: 6,
    title: 'Step 6',
    subtitle: 'Yellow Face — Cross Pattern',
    text: `Now solve the entire yellow face using the "spinning algorithm":\n\nR U R' U R U2 R'\n\nIf you have no yellow corners on top (cross pattern), move the top layer so a yellow corner is on the left face, then perform the algorithm.`,
    gif: `${CDN}/Top_Face_Cross.gif`,
    algorithms: [
      { label: 'Spinning algorithm', moves: "R U R' U R U2 R'" },
    ],
  },
  {
    step: 6,
    title: 'Step 6',
    subtitle: 'Yellow Face — Tank Pattern',
    text: `If two yellow corners are on the same side (tank pattern), position the yellow corner tile on the top-left of the front face, then:\n\nR U R' U R U2 R'`,
    gif: `${CDN}/Top_Face_Tank.gif`,
    algorithms: [
      { label: 'Spinning algorithm', moves: "R U R' U R U2 R'" },
    ],
  },
  {
    step: 6,
    title: 'Step 6',
    subtitle: 'Yellow Face — Figure-8 Pattern',
    text: `If two yellow corners are diagonally opposite (figure-8), position a yellow corner on the top-left of the front face, then:\n\nR U R' U R U2 R'`,
    gif: `${CDN}/Top_Face_Figure8.gif`,
    algorithms: [
      { label: 'Spinning algorithm', moves: "R U R' U R U2 R'" },
    ],
  },
  {
    step: 6,
    title: 'Step 6',
    subtitle: 'Yellow Face — Fish Pattern',
    text: `If one yellow corner is on top (fish pattern), make the fish point down-and-left, then:\n\nR U R' U R U2 R'\n\nIf you get the fish again, orient it down-and-right and repeat.`,
    gif: `${CDN}/Top_Face_Fish.gif`,
    algorithms: [
      { label: 'Spinning algorithm', moves: "R U R' U R U2 R'" },
    ],
  },
  {
    step: 7,
    title: 'Step 7',
    subtitle: 'Third Layer Corners — Opposites',
    text: `Position the yellow corner pieces correctly using the "double-back algorithm":\n\nR' F R' B2 R F' R' B2 R2\n\nRotate the top layer until two corners match their side colors. If the correct corners are diagonally opposite, just perform the algorithm.`,
    gif: `${CDN}/Corner_Solve_Opposites.gif`,
    algorithms: [
      { label: 'Double-back algorithm', moves: "R' F R' B2 R F' R' B2 R2" },
    ],
  },
  {
    step: 7,
    title: 'Step 7',
    subtitle: 'Third Layer Corners — Tail Lights',
    text: `If the two correct corners are on the same side (like taillights on a car), put them at the back, then:\n\nR' F R' B2 R F' R' B2 R2\n\nAfterward, rotate the top layer to align all corners.`,
    gif: `${CDN}/Corner_Solve_Tail_Lights.gif`,
    algorithms: [
      { label: 'Double-back algorithm', moves: "R' F R' B2 R F' R' B2 R2" },
    ],
  },
  {
    step: 8,
    title: 'Step 8',
    subtitle: 'Final Edges — No Solved Face',
    text: `Last step! Position the final edge pieces using the "front flipper algorithm":\n\nF2 U L R' F2 L' R U F2\n\nIf no side face is fully solved, just perform the algorithm.`,
    gif: `${CDN}/Last_Edges_No_Solved_Side_Face.gif`,
    algorithms: [
      { label: 'Front flipper', moves: "F2 U L R' F2 L' R U F2" },
    ],
  },
  {
    step: 8,
    title: 'Step 8',
    subtitle: 'Final Edges — Solved Face',
    text: `If one side face is solved, move it to the back, then:\n\nF2 U L R' F2 L' R U F2\n\nIf not solved yet, perform the algorithm again.`,
    gif: `${CDN}/Last_Edges_Solved_Side_Face_Part1.gif`,
    algorithms: [
      { label: 'Front flipper', moves: "F2 U L R' F2 L' R U F2" },
    ],
  },
  {
    step: 8,
    title: 'Step 8',
    subtitle: 'Final Edges — Repeat',
    text: `Sometimes you need to repeat the front flipper algorithm a second time. That's normal.`,
    gif: `${CDN}/Last_Edges_Solved_Side_Face_Part2.gif`,
    algorithms: [
      { label: 'Front flipper', moves: "F2 U L R' F2 L' R U F2" },
    ],
  },
  {
    step: 8,
    title: 'Congratulations!',
    subtitle: 'Cube Solved',
    text: `You've solved the Rubik's Cube! With practice, you'll memorize these algorithms and solve faster each time. Head to the simulator to practice.`,
    gif: `${CDN}/Solved_Cube.gif`,
    algorithms: [],
  },
];

export const TOTAL_STEPS = 8;
