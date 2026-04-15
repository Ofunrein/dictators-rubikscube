import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const AXIS_VECTORS = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

const CUBIE_SIZE = 0.95;
const STICKER_SIZE = 0.85;
const GAP = 1.0;
const EPSILON = 0.02;
const CUBE_ROTATION = [0.4, -0.6, 0];

const CUBIE_FACES_DEF = [
  { axis: 'x', sign: 1, face: 'R', rotation: [0, Math.PI / 2, 0] },
  { axis: 'x', sign: -1, face: 'L', rotation: [0, -Math.PI / 2, 0] },
  { axis: 'y', sign: 1, face: 'U', rotation: [-Math.PI / 2, 0, 0] },
  { axis: 'y', sign: -1, face: 'D', rotation: [Math.PI / 2, 0, 0] },
  { axis: 'z', sign: 1, face: 'F', rotation: [0, 0, 0] },
  { axis: 'z', sign: -1, face: 'B', rotation: [0, Math.PI, 0] },
];

function cloneCubieLayout() {
  return CUBIE_LAYOUT.map((cubie) => ({ ...cubie }));
}

function isCubieOnStickerFace(definition, gx, gy, gz) {
  return (
    (definition.axis === 'x' && gx === definition.sign) ||
    (definition.axis === 'y' && gy === definition.sign) ||
    (definition.axis === 'z' && gz === definition.sign)
  );
}

function getStickerPosition(definition) {
  const stickerPosition = [0, 0, 0];
  const axisIndex =
    definition.axis === 'x' ? 0 : definition.axis === 'y' ? 1 : 2;

  stickerPosition[axisIndex] = definition.sign * (CUBIE_SIZE / 2 + EPSILON);
  return stickerPosition;
}

function getStickerSelectionInfo(face, stickerIndex) {
  return {
    col: stickerIndex % 3,
    face,
    index: stickerIndex,
    row: Math.floor(stickerIndex / 3),
  };
}

function isCubieInAnimatedLayer(cubie, config) {
  return cubie[config.axis] === config.layer;
}

function attachLayerToPivot(pivot, cubieLayout, cubieRefs, config) {
  cubieLayout.forEach((cubie, index) => {
    if (!isCubieInAnimatedLayer(cubie, config)) return;

    const cubieGroup = cubieRefs.current[index];
    if (!cubieGroup) return;
    pivot.attach(cubieGroup);
  });
}

function syncCubieTransforms(cubieLayout, cubieRefs) {
  cubieLayout.forEach((cubie, index) => {
    const cubieGroup = cubieRefs.current[index];
    if (!cubieGroup) return;

    cubieGroup.position.set(cubie.x * GAP, cubie.y * GAP, cubie.z * GAP);
    cubieGroup.rotation.set(0, 0, 0);
  });
}

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

export function ResponsiveSceneCamera({ position, fov }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(...position);
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }, [camera, fov, position]);

  return null;
}

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

function resolveStickerColor(value) {
  if (typeof value === 'string') {
    const token = value.trim().toUpperCase();
    if (TOKEN_HEX[token]) return TOKEN_HEX[token];
  }

  return '#808080';
}

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
  cubeState,
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

  useEffect(() => {
    setCubieLayout(cloneCubieLayout());
  }, [cubeState]);

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

    animation.progress = Math.min(1, animation.progress + delta / TURN_DURATION_SECONDS);
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
