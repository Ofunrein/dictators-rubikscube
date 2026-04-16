/**
 * InteractiveCube.jsx — The 3D Rubik's Cube rendered with Three.js
 *
 * This component is responsible for everything you SEE in the 3D viewport:
 *   - 27 cubies (the small cubes that make up a 3x3x3 Rubik's Cube)
 *   - Colored sticker planes on each exposed face of each cubie
 *   - Turn animations (rotating a layer 90 degrees with smooth easing)
 *   - Cubie position tracking (remembering where each cubie is after rotations)
 *   - Sticker click selection (for mouse+arrow-key controls)
 *
 * HOW ANIMATIONS WORK:
 *   1. SimulatorPage sets "activeMove" to something like "R"
 *   2. This component looks up the animation config (axis=x, layer=1, direction=-1)
 *   3. It creates a Three.js pivot group and attaches all cubies in that layer to it
 *   4. useFrame runs every frame (~60fps) and rotates the pivot a little more
 *   5. When the rotation reaches 90 degrees, it detaches the cubies, updates their
 *      positions in cubieLayout, and tells SimulatorPage the move is done
 *
 * KEY CONCEPT — cubieLayout vs cubeState:
 *   - cubeState = the LOGICAL state (which color is at each sticker position)
 *   - cubieLayout = the PHYSICAL positions of the 27 cubie meshes in 3D space
 *   Both must stay in sync. When a move animates, cubieLayout updates via
 *   rotateCubiePosition(). cubeState updates in SimulatorPage after the animation.
 *
 * Also exports:
 *   - SimulatorCanvasBoundary: error boundary that catches WebGL crashes
 *   - ResponsiveSceneCamera: adjusts camera for mobile/tablet/desktop viewports
 */

import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CUBIE_LAYOUT,
  TURN_DURATION_SECONDS,
  easeInOutCubic,
  parseMoveAnimation,
  rotateCubiePosition,
} from './simulatorAnimation';
import { TOKEN_HEX } from './simulatorConstants';

// Three.js unit vectors for each axis — used to tell the pivot which direction to rotate
const AXIS_VECTORS = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

// Rendering dimensions for each cubie (the small black boxes) and stickers (colored squares)
const CUBIE_SIZE = 0.95;    // how big each black box is
const STICKER_SIZE = 0.85;  // how big the colored square on each face is (slightly smaller than the box)
const GAP = 1.0;            // spacing between cubie centers in the 3D grid
const EPSILON = 0.02;       // tiny offset so stickers float just above the cubie surface (prevents z-fighting)
const CUBE_ROTATION = [0.4, -0.6, 0]; // initial camera-friendly tilt so you can see U, F, and R faces

// Defines the 6 possible sticker faces on a cubie.
// Each entry maps an axis direction to a cube face name and the rotation needed
// to orient the sticker plane correctly in 3D space.
const CUBIE_FACES_DEF = [
  { axis: 'x', sign: 1, face: 'R', rotation: [0, Math.PI / 2, 0] },
  { axis: 'x', sign: -1, face: 'L', rotation: [0, -Math.PI / 2, 0] },
  { axis: 'y', sign: 1, face: 'U', rotation: [-Math.PI / 2, 0, 0] },
  { axis: 'y', sign: -1, face: 'D', rotation: [Math.PI / 2, 0, 0] },
  { axis: 'z', sign: 1, face: 'F', rotation: [0, 0, 0] },
  { axis: 'z', sign: -1, face: 'B', rotation: [0, Math.PI, 0] },
];

// Makes a fresh copy of the default 27-cubie grid positions.
// Called on reset/scramble to put all cubies back to their canonical spots.
function cloneCubieLayout() {
  return CUBIE_LAYOUT.map((cubie) => ({ ...cubie }));
}

// Checks if a cubie at position (gx,gy,gz) has a visible sticker on the given face.
// For example, a cubie at gx=1 is on the right side of the cube, so it has an R sticker.
function isCubieOnStickerFace(definition, gx, gy, gz) {
  return (
    (definition.axis === 'x' && gx === definition.sign) ||
    (definition.axis === 'y' && gy === definition.sign) ||
    (definition.axis === 'z' && gz === definition.sign)
  );
}

// Calculates where a sticker plane should be positioned relative to its cubie.
// Stickers sit just barely above the cubie surface (EPSILON) so they render on top.
function getStickerPosition(definition) {
  const stickerPosition = [0, 0, 0];
  const axisIndex =
    definition.axis === 'x' ? 0 : definition.axis === 'y' ? 1 : 2;

  stickerPosition[axisIndex] = definition.sign * (CUBIE_SIZE / 2 + EPSILON);
  return stickerPosition;
}

// Builds the info object sent to useCubeControls when a sticker is clicked.
// row/col are needed to look up which move an arrow key should trigger.
function getStickerSelectionInfo(face, stickerIndex) {
  return {
    col: stickerIndex % 3,
    face,
    index: stickerIndex,
    row: Math.floor(stickerIndex / 3),
  };
}

// Checks if a cubie belongs to the layer being animated.
// For a normal move like R (layer=1, axis=x), this checks cubie.x === 1.
// For whole-cube rotations (layer='all'), every cubie is included.
function isCubieInAnimatedLayer(cubie, config) {
  if (config.layer === 'all') {
    return true;
  }
  return cubie[config.axis] === config.layer;
}

// Grabs all cubies in the animated layer and parents them under the pivot group.
// Three.js will then rotate the entire pivot (and all attached cubies) as one unit.
function attachLayerToPivot(pivot, cubieLayout, cubieRefs, config) {
  cubieLayout.forEach((cubie, index) => {
    if (!isCubieInAnimatedLayer(cubie, config)) return;

    const cubieGroup = cubieRefs.current[index];
    if (!cubieGroup) return;
    pivot.attach(cubieGroup);
  });
}

// After an animation finishes, snap all cubie meshes to their updated grid positions.
// This prevents visual drift from floating-point animation math.
function syncCubieTransforms(cubieLayout, cubieRefs) {
  cubieLayout.forEach((cubie, index) => {
    const cubieGroup = cubieRefs.current[index];
    if (!cubieGroup) return;

    cubieGroup.position.set(cubie.x * GAP, cubie.y * GAP, cubie.z * GAP);
    cubieGroup.rotation.set(0, 0, 0);
  });
}

// Error boundary — wraps the <Canvas> so if WebGL crashes, we catch it
// and show the fallback panel instead of a blank white screen.
export class SimulatorCanvasBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }

    return this.props.children;
  }
}

// Adjusts the Three.js camera when the viewport changes (mobile vs tablet vs desktop).
// Without this the cube would look too small on phones or too zoomed on wide monitors.
export function ResponsiveSceneCamera({ position, fov }) {
  const { camera } = useThree();
  const [x, y, z] = position;

  useEffect(() => {
    // Only push camera updates when the responsive profile actually changes.
    // This keeps manual camera movement from getting snapped back mid-animation.
    camera.position.set(x, y, z);
    if ('fov' in camera) {
      camera.fov = fov;
    }
    camera.updateProjectionMatrix();
  }, [camera, fov, x, y, z]);

  return null;
}

// Maps a cubie's 3D grid position (gx, gy, gz) to a flat sticker index (0-8)
// for a given face. This is how we know which color token to look up in cubeState.
// Each face has its own mapping because the grid axes map to row/col differently
// depending on which direction you're looking at the cube from.
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

// Turns a sticker token like "W" into a hex color like "#FFFFFF".
// Falls back to gray if the token is unknown (shouldn't happen in normal use).
function resolveStickerColor(value) {
  if (typeof value === 'string') {
    const token = value.trim().toUpperCase();
    if (TOKEN_HEX[token]) return TOKEN_HEX[token];
  }

  return '#808080';
}

// A single colored square on one face of a cubie.
// When selected (mouse+keyboard mode), it gets a pink highlight overlay.
function Sticker({ color, position, rotation, onPointerDown, isSelected }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh onPointerDown={onPointerDown}>
        <planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
        <meshBasicMaterial color={color} side={THREE.FrontSide} />
      </mesh>
      {isSelected && (
        <mesh renderOrder={1}>
          <planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
          <meshBasicMaterial
            color="#ff69b4"
            transparent
            opacity={0.5}
            side={THREE.FrontSide}
            depthTest={false}
          />
        </mesh>
      )}
    </group>
  );
}

// One physical cubie in the 3x3x3 grid. It's a dark box with colored sticker
// planes on its exposed faces. gx/gy/gz are grid coordinates (-1, 0, or 1).
// Only faces on the outside of the cube get stickers (a cubie at x=0 has no R or L sticker).
const StickerCubelet = React.forwardRef(function StickerCubelet(
  { gx, gy, gz, cubeState, onStickerSelect, selectedSticker },
  ref,
) {
  const stickers = [];

  for (const definition of CUBIE_FACES_DEF) {
    if (!isCubieOnStickerFace(definition, gx, gy, gz)) continue;

    const stickerIndex = getStickerIndex(definition.face, gx, gy, gz);
    const tokenValue = cubeState[definition.face]?.[stickerIndex];
    const color = resolveStickerColor(tokenValue);
    const stickerPosition = getStickerPosition(definition);

    const isSelected =
      selectedSticker?.face === definition.face &&
      selectedSticker?.index === stickerIndex;

    stickers.push(
      <Sticker
        key={definition.face}
        color={color}
        position={stickerPosition}
        rotation={definition.rotation}
        isSelected={isSelected}
        onPointerDown={onStickerSelect ? (event) => {
          event.stopPropagation();
          onStickerSelect(getStickerSelectionInfo(definition.face, stickerIndex));
        } : undefined}
      />,
    );
  }

  return (
    <group ref={ref} position={[gx * GAP, gy * GAP, gz * GAP]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE]} />
        <meshStandardMaterial color="#111111" roughness={0.8} />
      </mesh>
      {stickers}
    </group>
  );
});

export function InteractiveCube({
  activeMove,
  turnDurationSeconds = TURN_DURATION_SECONDS,
  cubeState,
  layoutResetKey,
  onMoveComplete,
  onStickerSelect,
  selectedSticker,
}) {
  const groupRef = useRef();
  const cubieRefs = useRef([]);
  const pivotRef = useRef(null);
  const activeAnimationRef = useRef(null);
  const onMoveCompleteRef = useRef(onMoveComplete);
  const [cubieLayout, setCubieLayout] = useState(cloneCubieLayout);

  useEffect(() => {
    onMoveCompleteRef.current = onMoveComplete;
  }, [onMoveComplete]);

  // Only reset the 3D layout when explicitly triggered (scramble / reset / solve-snap).
  // Do NOT reset on every cubeState change — that overwrites correctly rotated positions.
  useEffect(() => {
    const canonical = cloneCubieLayout();
    setCubieLayout(canonical);
    syncCubieTransforms(canonical, cubieRefs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutResetKey]);

  useEffect(() => {
    if (!activeMove) {
      activeAnimationRef.current = null;
      return;
    }

    const config = parseMoveAnimation(activeMove);
    if (!config) {
      onMoveCompleteRef.current?.(activeMove);
      return;
    }

    const pivot = new THREE.Group();
    groupRef.current.add(pivot);
    pivotRef.current = pivot;
    attachLayerToPivot(pivot, cubieLayout, cubieRefs, config);

    activeAnimationRef.current = {
      config,
      move: activeMove,
      progress: 0,
    };
  }, [activeMove, cubieLayout]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const animation = activeAnimationRef.current;
    if (!animation?.config) return;

    animation.progress = Math.min(1, animation.progress + delta / turnDurationSeconds);
    const easedProgress = easeInOutCubic(animation.progress);

    let direction = animation.config.direction;
    if (animation.config.axis === 'y') {
      direction *= -1;
    }

    const totalAngle = direction * (Math.PI / 2);
    const axisVector = AXIS_VECTORS[animation.config.axis];
    pivotRef.current.setRotationFromAxisAngle(axisVector, totalAngle * easedProgress);

    if (animation.progress < 1) return;

    pivotRef.current.setRotationFromAxisAngle(axisVector, totalAngle);
    attachLayerToPivot(groupRef.current, cubieLayout, cubieRefs, animation.config);

    groupRef.current.remove(pivotRef.current);
    pivotRef.current = null;

    const effectiveDirection =
      animation.config.axis === 'y'
        ? -animation.config.direction
        : animation.config.direction;

    const nextLayout = cubieLayout.map((cubie) => (
      isCubieInAnimatedLayer(cubie, animation.config)
        ? rotateCubiePosition(cubie, animation.config.axis, effectiveDirection)
        : cubie
    ));
    syncCubieTransforms(nextLayout, cubieRefs);

    setCubieLayout(nextLayout);

    const finishedMove = animation.move;
    activeAnimationRef.current = null;
    onMoveCompleteRef.current?.(finishedMove);
  });

  return (
    <group ref={groupRef} rotation={CUBE_ROTATION}>
      {cubieLayout.map((cubie, index) => (
        <StickerCubelet
          key={`${index}-${cubie.x}-${cubie.y}-${cubie.z}`}
          ref={(node) => {
            cubieRefs.current[index] = node;
          }}
          gx={cubie.x}
          gy={cubie.y}
          gz={cubie.z}
          cubeState={cubeState}
          onStickerSelect={onStickerSelect}
          selectedSticker={selectedSticker}
        />
      ))}
    </group>
  );
}
