/**
 * InteractiveCube.jsx — The 3D Rubik's Cube rendered with Three.js
 *
 * This component is responsible for everything you SEE in the 3D viewport:
 *   - the visible cubies for the active cube size (2x2, 3x3, or 4x4)
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
 *   - cubieLayout = the PHYSICAL positions of the cubie meshes in 3D space
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
  getCoordinateValues,
  getFaceIndexFromAddress,
  getFaceRowColFromAddress,
  getFaceSize,
} from '../../cube/cubeModel.js';
import {
  TURN_DURATION_SECONDS,
  easeInOutCubic,
  getCubieLayout,
  parseMoveAnimation,
  rotateCubiePosition,
} from './simulatorAnimation';
import { TOKEN_HEX } from './simulatorConstants';
import { getStickerMove } from './useCubeControls';

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

// Makes a fresh copy of the default cubie grid positions for the current size.
// Called on reset/scramble to put all cubies back to their canonical spots.
function cloneCubieLayout(size) {
  return getCubieLayout(size).map((cubie) => ({ ...cubie }));
}

function getVisibleFaceCoordinate(size, sign) {
  const coords = getCoordinateValues(size);
  return sign > 0 ? coords[coords.length - 1] : coords[0];
}

// Checks if a cubie at position (gx,gy,gz) has a visible sticker on the given face.
// For example, a cubie at gx=1 is on the right side of the cube, so it has an R sticker.
function isCubieOnStickerFace(definition, gx, gy, gz, cubeSize) {
  const targetCoordinate = getVisibleFaceCoordinate(cubeSize, definition.sign);
  return (
    (definition.axis === 'x' && gx === targetCoordinate) ||
    (definition.axis === 'y' && gy === targetCoordinate) ||
    (definition.axis === 'z' && gz === targetCoordinate)
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

function projectWorldPointToScreen(point, camera, viewportSize) {
  const projectedPoint = point.clone().project(camera);

  return new THREE.Vector2(
    (projectedPoint.x * 0.5 + 0.5) * viewportSize.width,
    (-projectedPoint.y * 0.5 + 0.5) * viewportSize.height,
  );
}

function getStickerScreenBasis(face, mesh, camera, viewportSize) {
  const center = new THREE.Vector3();
  const worldQuaternion = new THREE.Quaternion();
  const worldRight = new THREE.Vector3(1, 0, 0);
  const worldUp = new THREE.Vector3(0, 1, 0);

  mesh.getWorldPosition(center);
  mesh.getWorldQuaternion(worldQuaternion);

  worldRight.applyQuaternion(worldQuaternion).multiplyScalar(STICKER_SIZE * 0.5);
  worldUp.applyQuaternion(worldQuaternion).multiplyScalar(STICKER_SIZE * 0.5);

  // U and D stickers are rendered with a plane-local "up" that is inverted
  // relative to the face row indexing used by getStickerMove().
  // Flip their projected vertical basis so swiping follows the visible layer
  // direction instead of turning the opposite way on the top/bottom faces.
  if (face === 'U' || face === 'D') {
    worldUp.multiplyScalar(-1);
  }

  const centerScreen = projectWorldPointToScreen(center, camera, viewportSize);
  const rightScreen = projectWorldPointToScreen(center.clone().add(worldRight), camera, viewportSize);
  const upScreen = projectWorldPointToScreen(center.clone().add(worldUp), camera, viewportSize);

  return {
    right: {
      x: rightScreen.x - centerScreen.x,
      y: rightScreen.y - centerScreen.y,
    },
    up: {
      x: upScreen.x - centerScreen.x,
      y: upScreen.y - centerScreen.y,
    },
  };
}

function getStickerMoveScreenDelta(cubeGroup, mesh, move, cubeSize, camera, viewportSize) {
  const animationConfig = parseMoveAnimation(move, cubeSize);
  if (!animationConfig || !cubeGroup) {
    return null;
  }

  const cubeQuaternion = new THREE.Quaternion();
  cubeGroup.getWorldQuaternion(cubeQuaternion);

  const axisWorld = AXIS_VECTORS[animationConfig.axis]
    .clone()
    .applyQuaternion(cubeQuaternion)
    .normalize();

  const sceneDirection =
    animationConfig.axis === 'y'
      ? -animationConfig.direction
      : animationConfig.direction;

  const currentWorldPosition = new THREE.Vector3();
  mesh.getWorldPosition(currentWorldPosition);

  const rotatedWorldPosition = currentWorldPosition
    .clone()
    .applyAxisAngle(axisWorld, sceneDirection * (Math.PI / 2));

  const currentScreen = projectWorldPointToScreen(currentWorldPosition, camera, viewportSize);
  const rotatedScreen = projectWorldPointToScreen(rotatedWorldPosition, camera, viewportSize);

  return {
    x: rotatedScreen.x - currentScreen.x,
    y: rotatedScreen.y - currentScreen.y,
  };
}

function getStickerDragMoveCandidates(cubeGroup, mesh, face, row, col, cubeSize, camera, viewportSize) {
  const seenMoves = new Set();
  const candidateMoves = [];

  for (const arrowKey of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
    const move = getStickerMove(face, arrowKey, row, col, cubeSize);
    if (!move || seenMoves.has(move)) {
      continue;
    }

    const screenDelta = getStickerMoveScreenDelta(cubeGroup, mesh, move, cubeSize, camera, viewportSize);
    if (!screenDelta) {
      continue;
    }

    seenMoves.add(move);
    candidateMoves.push({
      dragAxis: arrowKey === 'ArrowUp' || arrowKey === 'ArrowDown' ? 'vertical' : 'horizontal',
      move,
      screenDelta,
    });
  }

  return candidateMoves;
}

// Builds the info object sent to useCubeControls when a sticker is clicked.
// row/col are needed to look up which move an arrow key should trigger.
function getStickerSelectionInfo(face, gx, gy, gz, cubeSize) {
  const index = getFaceIndexFromAddress(face, gx, gy, gz, cubeSize);
  const { row, col } = getFaceRowColFromAddress(face, gx, gy, gz, cubeSize);
  return {
    col,
    face,
    index,
    row,
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
    cubieGroup.quaternion.identity();
    cubieGroup.scale.set(1, 1, 1);
    cubieGroup.updateMatrix();
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
      // Three cameras are mutable scene objects, so updating the live
      // PerspectiveCamera here is the intended way to apply responsive FOV.
      // eslint-disable-next-line react-hooks/immutability
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
function getStickerIndex(face, gx, gy, gz, cubeSize) {
  return getFaceIndexFromAddress(face, gx, gy, gz, cubeSize);
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
  const handlePointerOver = (event) => {
    event.stopPropagation();
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'grab';
    }
  };

  const handlePointerOut = (event) => {
    event.stopPropagation();
    if (typeof document !== 'undefined') {
      document.body.style.cursor = '';
    }
  };

  return (
    <group position={position} rotation={rotation}>
      <mesh
        onPointerDown={onPointerDown}
        onPointerOver={onPointerDown ? handlePointerOver : undefined}
        onPointerOut={onPointerDown ? handlePointerOut : undefined}
      >
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
  { cubeGroupRef, cubeSize, gx, gy, gz, cubeState, onStickerPointerDown, selectedSticker },
  ref,
) {
  const { camera, size } = useThree();
  const stickers = [];

  for (const definition of CUBIE_FACES_DEF) {
    if (!isCubieOnStickerFace(definition, gx, gy, gz, cubeSize)) continue;

    const stickerIndex = getStickerIndex(definition.face, gx, gy, gz, cubeSize);
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
        onPointerDown={onStickerPointerDown ? (event) => {
          const stickerSelection = getStickerSelectionInfo(definition.face, gx, gy, gz, cubeSize);
          const isPrimaryMouseButton = event.pointerType === 'mouse' ? event.button === 0 : true;
          if (!isPrimaryMouseButton) {
            return;
          }
          event.stopPropagation();
          onStickerPointerDown({
            ...stickerSelection,
            clientX: event.clientX,
            clientY: event.clientY,
            dragMoveCandidates: getStickerDragMoveCandidates(
              cubeGroupRef.current,
              event.object,
              definition.face,
              stickerSelection.row,
              stickerSelection.col,
              cubeSize,
              camera,
              size,
            ),
            faceScreenBasis: getStickerScreenBasis(definition.face, event.object, camera, size),
            pointerId: event.pointerId,
          });
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
  activeMoveId,
  turnDurationSeconds = TURN_DURATION_SECONDS,
  cubeState,
  onMoveComplete,
  onStickerPointerDown,
  selectedSticker,
}) {
  const groupRef = useRef();
  const cubieRefs = useRef([]);
  const pivotRef = useRef(null);
  const activeAnimationRef = useRef(null);
  const onMoveCompleteRef = useRef(onMoveComplete);
  const moveProcessedRef = useRef(null);
  const cubeSize = getFaceSize(cubeState) ?? 3;
  const [cubieLayout, setCubieLayout] = useState(() => cloneCubieLayout(cubeSize));

  useEffect(() => {
    onMoveCompleteRef.current = onMoveComplete;
  }, [onMoveComplete]);

  useEffect(() => {
    if (!activeMove || activeMoveId === null) {
      activeAnimationRef.current = null;
      moveProcessedRef.current = null;
      return;
    }

    // Guard: when an animation completes, setCubieLayout triggers a re-render
    // before React has processed the queue hook's state update that clears activeMove.
    // Without this check, the same move would get animated twice — once for real,
    // and once against already-rotated cubies, causing cubies to drift off-grid.
    if (moveProcessedRef.current === activeMoveId) return;

    const config = parseMoveAnimation(activeMove, cubeSize);
    if (!config) {
      moveProcessedRef.current = activeMoveId;
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
      moveId: activeMoveId,
      progress: 0,
    };
  }, [activeMove, activeMoveId, cubeSize, cubieLayout]);

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

    const finishedMove = animation.move;
    moveProcessedRef.current = animation.moveId;
    activeAnimationRef.current = null;

    // IMPORTANT: call the completion callback BEFORE setCubieLayout.
    // The callback updates cubeState (displayState) via the queue hook.
    // If we setCubieLayout first, React renders one frame where the cubies
    // are at their NEW positions but cubeState still has the OLD colors,
    // causing a visible color flash. By calling the callback first, React
    // batches both state updates into a single render.
    onMoveCompleteRef.current?.(finishedMove);
    setCubieLayout(nextLayout);
  });

  return (
    <group ref={groupRef} rotation={CUBE_ROTATION}>
      {cubieLayout.map((cubie, index) => (
        <StickerCubelet
          key={`${cubeSize}-${index}-${cubie.key}`}
          ref={(node) => {
            cubieRefs.current[index] = node;
          }}
          cubeGroupRef={groupRef}
          cubeSize={cubeSize}
          gx={cubie.x}
          gy={cubie.y}
          gz={cubie.z}
          cubeState={cubeState}
          onStickerPointerDown={onStickerPointerDown}
          selectedSticker={selectedSticker}
        />
      ))}
    </group>
  );
}
