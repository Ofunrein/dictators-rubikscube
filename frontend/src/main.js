import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './style.css';
import { CubeState } from './cube/CubeState.js';

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
scene.background = new THREE.Color(0x0b0d12);

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

const cubeBody = new THREE.Mesh(
  new THREE.BoxGeometry(3.35, 3.35, 3.35),
  new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.05, roughness: 0.7 })
);
cubeGroup.add(cubeBody);

const stickerGeometry = new THREE.PlaneGeometry(0.95, 0.95);
const stickerMap = FACE_ORDER.reduce((acc, face) => {
  acc[face] = new Array(9);
  return acc;
}, {});

function createStickerMesh() {
  return new THREE.Mesh(
    stickerGeometry,
    new THREE.MeshBasicMaterial({ color: '#808080', side: THREE.DoubleSide })
  );
}

function indexToRowCol(index) {
  return {
    row: Math.floor(index / 3),
    col: index % 3
  };
}

function stickerTransform(face, index, step, half, epsilon) {
  const { row, col } = indexToRowCol(index);

  if (face === 'F') {
    return {
      position: [(col - 1) * step, (1 - row) * step, half + epsilon],
      rotation: [0, 0, 0]
    };
  }
  if (face === 'B') {
    return {
      position: [(1 - col) * step, (1 - row) * step, -half - epsilon],
      rotation: [0, Math.PI, 0]
    };
  }
  if (face === 'U') {
    return {
      position: [(col - 1) * step, half + epsilon, (row - 1) * step],
      rotation: [-Math.PI / 2, 0, 0]
    };
  }
  if (face === 'D') {
    return {
      position: [(col - 1) * step, -half - epsilon, (1 - row) * step],
      rotation: [Math.PI / 2, 0, 0]
    };
  }
  if (face === 'R') {
    return {
      position: [half + epsilon, (1 - row) * step, (1 - col) * step],
      rotation: [0, Math.PI / 2, 0]
    };
  }

  return {
    position: [-half - epsilon, (1 - row) * step, (col - 1) * step],
    rotation: [0, -Math.PI / 2, 0]
  };
}

function buildStickerMap() {
  const step = 1.08;
  const half = 1.675;
  const epsilon = 0.02;

  for (const face of FACE_ORDER) {
    for (let index = 0; index < 9; index += 1) {
      const sticker = createStickerMesh();
      const transform = stickerTransform(face, index, step, half, epsilon);
      sticker.position.set(...transform.position);
      sticker.rotation.set(...transform.rotation);
      cubeGroup.add(sticker);
      stickerMap[face][index] = sticker;
    }
  }
}

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

export function applyCubeState(nextStickerMap, state) {
  validateCubeState(state);

  for (const face of FACE_ORDER) {
    for (let i = 0; i < 9; i += 1) {
      const mesh = nextStickerMap[face][i];
      mesh.material.color.set(resolveStickerColor(state[face][i], face));
    }
  }
}

buildStickerMap();
applyCubeState(stickerMap, CubeState.createSolvedState());
cubeGroup.rotation.x = -0.52;
cubeGroup.rotation.y = 0.68;

window.setCubeState = (nextState) => applyCubeState(stickerMap, nextState);

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
