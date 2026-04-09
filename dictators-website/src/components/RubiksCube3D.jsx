import React, { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Kyle's sticker-mesh constants ──────────────────────────────────────────
const CUBIE_SIZE = 0.95;
const STICKER_SIZE = 0.85;
const GAP = 1.0;
const EPSILON = 0.02;

const TOKEN_HEX = {
  W: '#FFFFFF',
  R: '#CC1A1A',
  G: '#2E8B57',
  Y: '#FFD700',
  O: '#FF8C00',
  B: '#1E90FF',
};

const CUBIE_FACES_DEF = [
  { axis: 'x', sign: 1, face: 'R', rotation: [0, Math.PI / 2, 0] },
  { axis: 'x', sign: -1, face: 'L', rotation: [0, -Math.PI / 2, 0] },
  { axis: 'y', sign: 1, face: 'U', rotation: [-Math.PI / 2, 0, 0] },
  { axis: 'y', sign: -1, face: 'D', rotation: [Math.PI / 2, 0, 0] },
  { axis: 'z', sign: 1, face: 'F', rotation: [0, 0, 0] },
  { axis: 'z', sign: -1, face: 'B', rotation: [0, Math.PI, 0] },
];

const SOLVED_STATE = {
  U: Array(9).fill('W'),
  R: Array(9).fill('R'),
  F: Array(9).fill('G'),
  D: Array(9).fill('Y'),
  L: Array(9).fill('O'),
  B: Array(9).fill('B'),
};

function getStickerIndex(face, gx, gy, gz) {
  switch (face) {
    case 'U': return (1 - gz) * 3 + (gx + 1);
    case 'D': return (gz + 1) * 3 + (gx + 1);
    case 'F': return (1 - gy) * 3 + (gx + 1);
    case 'B': return (1 - gy) * 3 + (1 - gx);
    case 'R': return (1 - gy) * 3 + (1 - gz);
    case 'L': return (1 - gy) * 3 + (gz + 1);
    default: return 0;
  }
}

// ─── Single cubie with dark body + sticker overlays ──────────────────────────
const HeroCubie = ({ gx, gy, gz }) => {
  const stickers = [];

  for (const def of CUBIE_FACES_DEF) {
    const isExposed =
      (def.axis === 'x' && gx === def.sign) ||
      (def.axis === 'y' && gy === def.sign) ||
      (def.axis === 'z' && gz === def.sign);
    if (!isExposed) continue;

    const stickerIndex = getStickerIndex(def.face, gx, gy, gz);
    const token = SOLVED_STATE[def.face]?.[stickerIndex];
    const color = TOKEN_HEX[token] || '#808080';

    const pos = [
      def.axis === 'x' ? def.sign * (CUBIE_SIZE / 2 + EPSILON) : 0,
      def.axis === 'y' ? def.sign * (CUBIE_SIZE / 2 + EPSILON) : 0,
      def.axis === 'z' ? def.sign * (CUBIE_SIZE / 2 + EPSILON) : 0,
    ];

    stickers.push(
      <mesh key={def.face} position={pos} rotation={def.rotation}>
        <planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} side={THREE.FrontSide} />
      </mesh>
    );
  }

  return (
    <group position={[gx * GAP, gy * GAP, gz * GAP]}>
      {/* Dark cubie body */}
      <mesh>
        <boxGeometry args={[CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE]} />
        <meshStandardMaterial color="#111111" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Sticker overlays */}
      {stickers}
    </group>
  );
};

// ─── Interactive hero cube with auto-rotation and drag ───────────────────────
const RubiksCube3D = () => {
  const groupRef = useRef();
  const [isDragging, setIsDragging] = useState(false);
  const baseRotation = useRef({ x: 0.5, y: -0.5 });

  // Build 27 cubies
  const cubies = useMemo(() => {
    const list = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          list.push(
            <HeroCubie key={`${x}-${y}-${z}`} gx={x} gy={y} gz={z} />
          );
        }
      }
    }
    return list;
  }, []);

  // Auto-rotation + mouse hover parallax
  useFrame(({ mouse }, delta) => {
    if (!groupRef.current || isDragging) return;

    // Auto-rotate
    baseRotation.current.y += delta * 0.3;
    baseRotation.current.x += delta * 0.15;

    // Mouse parallax — subtle tilt toward cursor
    const parallaxX = mouse.y * 0.3;
    const parallaxY = mouse.x * 0.3;

    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      baseRotation.current.x + parallaxX,
      0.05
    );
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      baseRotation.current.y + parallaxY,
      0.05
    );
  });

  return (
    <group
      ref={groupRef}
      rotation={[0.5, -0.5, 0]}
      onPointerDown={() => setIsDragging(true)}
      onPointerUp={() => setIsDragging(false)}
    >
      {cubies}
    </group>
  );
};

export default RubiksCube3D;
