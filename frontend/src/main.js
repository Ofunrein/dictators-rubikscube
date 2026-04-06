import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './style.css';
import { CubeState } from './cube/CubeState.js';
import { initUI } from './ui/ui.js';

const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];
const FACE_DEFAULT_COLORS = {
  U: '#ffffff',
  R: '#ff2f2f',
  F: '#1fb55c',
  D: '#ffd93d',
  L: '#ff8a2a',
  B: '#2e63ff'
};
const TOKEN_COLORS = {
  W: FACE_DEFAULT_COLORS.U,
  R: FACE_DEFAULT_COLORS.R,
  G: FACE_DEFAULT_COLORS.F,
  Y: FACE_DEFAULT_COLORS.D,
  O: FACE_DEFAULT_COLORS.L,
  B: FACE_DEFAULT_COLORS.B
};

const app = document.getElementById('app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1f1f1f);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(6, 5.5, 7.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.update();

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
keyLight.position.set(7, 9, 8);
scene.add(keyLight);

const cubeGroup = new THREE.Group();
scene.add(cubeGroup);

const CUBIE_SIZE = 0.95;
const STICKER_SIZE = 0.85;
const GAP = 1.0;
const EPSILON = 0.02;

const stickerMap = {
  U: new Array(9),
  R: new Array(9),
  F: new Array(9),
  D: new Array(9),
  L: new Array(9),
  B: new Array(9)
};

// Defines faces of cube and orientation
const CUBIE_FACES_DEF = [
  {axis: 'x', sign: 1, face: 'R', rotation: [0, Math.PI / 2, 0]},
  {axis: 'x', sign: -1, face: 'L', rotation: [0, -Math.PI / 2, 0]},
  {axis: 'y', sign: 1, face: 'U', rotation: [-Math.PI / 2, 0, 0]},
  {axis: 'y', sign: -1, face: 'D', rotation: [Math.PI / 2, 0, 0]},
  {axis: 'z', sign: 1, face: 'F', rotation: [0, 0, 0]},
  {axis: 'z', sign: -1, face: 'B', rotation: [0, Math.PI, 0]}
];

/**
 * Get the index of a sticker based on its face and position.
 * @param {string} face
 * @param {number} gx
 * @param {number} gy
 * @param {number} gz
 * @returns {number}
 */
function getStickerIndex( face, gx, gy, gz) {
  switch (face) {
    case 'U': return (1 - gz) * 3 + (gx + 1);
    case 'D': return (gz + 1) * 3 + (gx + 1);
    case 'F': return (1 - gy) * 3 + (gx + 1);
    case 'B': return (1 - gy) * 3 + (1 - gx);
    case 'R': return (1 - gy) * 3 + (1 - gz);
    case 'L': return (1 - gy) * 3 + (gz + 1);
  }
}

/**
 * Build the cubies that make up the Rubik's cube.
 */
function buildCubies() {
  // Plane used for all stickers
  const stickerGeo = new THREE.PlaneGeometry(STICKER_SIZE, STICKER_SIZE);
  // Cube used for every cubie (all share same geometry)
  const cubieGeo = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
  // Dark inner body of all cubies (shared material)
  const cubieMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

  for (let gx = -1; gx <= 1; gx++) {
    for (let gy = -1; gy <= 1; gy++) {
      for (let gz = -1; gz <= 1; gz++) {
        // Group allows move/rotate the cubie and stickers together as one
        const cubieGroup = new THREE.Group();
        // Creates gap between cubies
        cubieGroup.position.set(gx * GAP, gy * GAP, gz * GAP);
        cubieGroup.add(new THREE.Mesh(cubieGeo, cubieMat));

        // Check if each face of the cubie is exposed and add sticker if so
        for (const def of CUBIE_FACES_DEF) {
          const isExposed = (def.axis === 'x' && gx == def.sign) ||
                            (def.axis === 'y' && gy == def.sign) ||
                            (def.axis === 'z' && gz == def.sign);
          if (!isExposed) continue;

          // Creates gray placeholder sticker - color will be applied later based on cube state
          const mat = new THREE.MeshBasicMaterial({ color: '#808080', side: THREE.FrontSide });
          const sticker = new THREE.Mesh(stickerGeo, mat);

          // Position sticker slightly above cubie face
          sticker.position[def.axis] = def.sign * (CUBIE_SIZE / 2 + EPSILON);
          sticker.rotation.set(...def.rotation);
          cubieGroup.add(sticker);

          // Map sticker to its face and index for easy access
          const index = getStickerIndex(def.face, gx, gy, gz);
          stickerMap[def.face][index] = sticker;
        }

        cubeGroup.add(cubieGroup);
      }
    }
  }
}

/**
 * Normalize a sticker value into a THREE.Color instance.
 * Accepts face tokens (e.g. 'W', 'R') or any color compatible with THREE.Color.
 * @param {unknown} value
 * @param {'U'|'R'|'F'|'D'|'L'|'B'} face
 * @returns {THREE.Color|string}
 */
function resolveStickerColor(value, face) {
  if (typeof value === 'string') {
    const token = value.trim().toUpperCase();
    if (TOKEN_COLORS[token]) {
      return TOKEN_COLORS[token];
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new THREE.Color();
    try {
      parsed.set(value);
      return parsed;
    } catch {
      return FACE_DEFAULT_COLORS[face];
    }
  }

  return FACE_DEFAULT_COLORS[face];
}

/**
 * Validate cube state shape before applying colors.
 * @param {object} state
 */
function validateCubeState(state) {
  if (!state || typeof state !== 'object') {
    throw new Error('Cube state must be an object with U, R, F, D, L, B faces.');
  }

  for (const face of FACE_ORDER) {
    if (!Array.isArray(state[face]) || state[face].length !== 9) {
      throw new Error(`Cube face ${face} must contain exactly 9 stickers.`);
    }
  }
}

/**
 * Apply a cube state to a given sticker mesh map.
 * @param {Record<string, THREE.Mesh[]>} nextStickerMap
 * @param {object} state
 */
export function applyCubeState(nextStickerMap, state) {
  validateCubeState(state);

  for (const face of FACE_ORDER) {
    for (let i = 0; i < 9; i += 1) {
      const mesh = nextStickerMap[face][i];
      mesh.material.color.set(resolveStickerColor(state[face][i], face));
    }
  }
}

buildCubies();
const cubeState = new CubeState();
applyCubeState(stickerMap, cubeState.getState());
initUI({
  cubeState,
  scene,
  camera,
  renderer,
  stickerMap
});

// Expose a simple integration hook for external demos.
window.setCubeState = (nextState) => applyCubeState(stickerMap, nextState);

/**
 * Animation loop for orbit controls and rendering.
 */
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
