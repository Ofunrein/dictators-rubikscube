/**
 * InteractiveCube.tsx — The 3D Rubik's Cube rendered with Three.js
 */

import React, { Component, ErrorInfo, ReactNode, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getCoordinateValues,
  getFaceIndexFromAddress,
  getFaceRowColFromAddress,
  getFaceSize,
  type CubeStateObj,
  type FaceName,
} from '../../cube/cubeModel.js';
import {
  TURN_DURATION_SECONDS,
  easeInOutCubic,
  getCubieLayout,
  parseMoveAnimation,
  rotateCubiePosition,
  type CubiePosition,
} from './simulatorAnimation';
import { TOKEN_HEX } from './simulatorConstants';
import { getStickerMove, type DragMoveCandidate, type ScreenBasis, type StickerPointerDownInfo } from './useCubeControls';

type Axis = 'x' | 'y' | 'z';

const AXIS_VECTORS: Record<Axis, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

const CUBIE_SIZE = 0.95;
const STICKER_SIZE = 0.85;
const GAP = 1.0;
const EPSILON = 0.02;
const CUBE_ROTATION: [number, number, number] = [0.2, 0.3, 0];

interface CubieFaceDef {
  axis: Axis;
  sign: number;
  face: FaceName;
  rotation: [number, number, number];
}

const CUBIE_FACES_DEF: CubieFaceDef[] = [
  { axis: 'x', sign: 1, face: 'R', rotation: [0, Math.PI / 2, 0] },
  { axis: 'x', sign: -1, face: 'L', rotation: [0, -Math.PI / 2, 0] },
  { axis: 'y', sign: 1, face: 'U', rotation: [-Math.PI / 2, 0, 0] },
  { axis: 'y', sign: -1, face: 'D', rotation: [Math.PI / 2, 0, 0] },
  { axis: 'z', sign: 1, face: 'F', rotation: [0, 0, 0] },
  { axis: 'z', sign: -1, face: 'B', rotation: [0, Math.PI, 0] },
];

interface CubieLayoutItem extends CubiePosition {
  key: string;
  position: [number, number, number];
}

function cloneCubieLayout(size: number): CubieLayoutItem[] {
  return getCubieLayout(size).map((cubie) => ({ ...cubie } as CubieLayoutItem));
}

function getVisibleFaceCoordinate(size: number, sign: number): number {
  const coords = getCoordinateValues(size);
  return sign > 0 ? coords[coords.length - 1] : coords[0];
}

function isCubieOnStickerFace(definition: CubieFaceDef, gx: number, gy: number, gz: number, cubeSize: number): boolean {
  const targetCoordinate = getVisibleFaceCoordinate(cubeSize, definition.sign);
  return (
    (definition.axis === 'x' && gx === targetCoordinate) ||
    (definition.axis === 'y' && gy === targetCoordinate) ||
    (definition.axis === 'z' && gz === targetCoordinate)
  );
}

function getStickerPosition(definition: CubieFaceDef): [number, number, number] {
  const stickerPosition: [number, number, number] = [0, 0, 0];
  const axisIndex = definition.axis === 'x' ? 0 : definition.axis === 'y' ? 1 : 2;
  stickerPosition[axisIndex] = definition.sign * (CUBIE_SIZE / 2 + EPSILON);
  return stickerPosition;
}

function projectWorldPointToScreen(
  point: THREE.Vector3,
  camera: THREE.Camera,
  viewportSize: { width: number; height: number },
): THREE.Vector2 {
  const projectedPoint = point.clone().project(camera);
  return new THREE.Vector2(
    (projectedPoint.x * 0.5 + 0.5) * viewportSize.width,
    (-projectedPoint.y * 0.5 + 0.5) * viewportSize.height,
  );
}

// ScreenBasis is imported from useCubeControls

function getStickerScreenBasis(
  face: FaceName,
  mesh: THREE.Object3D,
  camera: THREE.Camera,
  viewportSize: { width: number; height: number },
): ScreenBasis {
  const center = new THREE.Vector3();
  const worldQuaternion = new THREE.Quaternion();
  const worldRight = new THREE.Vector3(1, 0, 0);
  const worldUp = new THREE.Vector3(0, 1, 0);

  mesh.getWorldPosition(center);
  mesh.getWorldQuaternion(worldQuaternion);

  worldRight.applyQuaternion(worldQuaternion).multiplyScalar(STICKER_SIZE * 0.5);
  worldUp.applyQuaternion(worldQuaternion).multiplyScalar(STICKER_SIZE * 0.5);

  if (face === 'U' || face === 'D') {
    worldUp.multiplyScalar(-1);
  }

  const centerScreen = projectWorldPointToScreen(center, camera, viewportSize);
  const rightScreen = projectWorldPointToScreen(center.clone().add(worldRight), camera, viewportSize);
  const upScreen = projectWorldPointToScreen(center.clone().add(worldUp), camera, viewportSize);

  return {
    right: { x: rightScreen.x - centerScreen.x, y: rightScreen.y - centerScreen.y },
    up: { x: upScreen.x - centerScreen.x, y: upScreen.y - centerScreen.y },
  };
}

function getStickerMoveScreenDelta(
  cubeGroup: THREE.Object3D | null,
  mesh: THREE.Object3D,
  move: string,
  cubeSize: number,
  camera: THREE.Camera,
  viewportSize: { width: number; height: number },
): { x: number; y: number } | null {
  const animationConfig = parseMoveAnimation(move, cubeSize);
  if (!animationConfig || !cubeGroup) return null;

  const cubeQuaternion = new THREE.Quaternion();
  cubeGroup.getWorldQuaternion(cubeQuaternion);

  const axisWorld = AXIS_VECTORS[animationConfig.axis as Axis]
    .clone()
    .applyQuaternion(cubeQuaternion)
    .normalize();

  const sceneDirection = animationConfig.axis === 'y' ? -animationConfig.direction : animationConfig.direction;

  const currentWorldPosition = new THREE.Vector3();
  mesh.getWorldPosition(currentWorldPosition);

  const rotatedWorldPosition = currentWorldPosition.clone().applyAxisAngle(axisWorld, sceneDirection * (Math.PI / 2));

  const currentScreen = projectWorldPointToScreen(currentWorldPosition, camera, viewportSize);
  const rotatedScreen = projectWorldPointToScreen(rotatedWorldPosition, camera, viewportSize);

  return { x: rotatedScreen.x - currentScreen.x, y: rotatedScreen.y - currentScreen.y };
}

function getStickerDragMoveCandidates(
  cubeGroup: THREE.Object3D | null,
  mesh: THREE.Object3D,
  face: FaceName,
  row: number,
  col: number,
  cubeSize: number,
  camera: THREE.Camera,
  viewportSize: { width: number; height: number },
): DragMoveCandidate[] {
  const seenMoves = new Set<string>();
  const candidateMoves: DragMoveCandidate[] = [];

  for (const arrowKey of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
    const move = getStickerMove(face, arrowKey, row, col, cubeSize);
    if (!move || seenMoves.has(move)) continue;

    const screenDelta = getStickerMoveScreenDelta(cubeGroup, mesh, move, cubeSize, camera, viewportSize);
    if (!screenDelta) continue;

    seenMoves.add(move);
    candidateMoves.push({
      dragAxis: arrowKey === 'ArrowUp' || arrowKey === 'ArrowDown' ? 'vertical' : 'horizontal',
      move,
      screenDelta,
    });
  }

  return candidateMoves;
}

interface StickerSelectionInfo {
  col: number;
  face: FaceName;
  index: number;
  row: number;
}

function getStickerSelectionInfo(face: FaceName, gx: number, gy: number, gz: number, cubeSize: number): StickerSelectionInfo {
  const index = getFaceIndexFromAddress(face, gx, gy, gz, cubeSize);
  const { row, col } = getFaceRowColFromAddress(face, gx, gy, gz, cubeSize);
  return { col, face, index, row };
}

interface AnimationConfig {
  axis: string;
  layer: number | 'all';
  direction: number;
}

function isCubieInAnimatedLayer(cubie: CubieLayoutItem, config: AnimationConfig): boolean {
  if (config.layer === 'all') return true;
  return (cubie as Record<string, unknown>)[config.axis] === config.layer;
}

function attachLayerToPivot(
  pivot: THREE.Object3D,
  cubieLayout: CubieLayoutItem[],
  cubieRefs: React.MutableRefObject<(THREE.Group | null)[]>,
  config: AnimationConfig,
): void {
  cubieLayout.forEach((cubie, index) => {
    if (!isCubieInAnimatedLayer(cubie, config)) return;
    const cubieGroup = cubieRefs.current[index];
    if (!cubieGroup) return;
    pivot.attach(cubieGroup);
  });
}

function syncCubieTransforms(
  cubieLayout: CubieLayoutItem[],
  cubieRefs: React.MutableRefObject<(THREE.Group | null)[]>,
): void {
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

interface SimulatorCanvasBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
  fallback?: ReactNode;
}

interface SimulatorCanvasBoundaryState {
  hasError: boolean;
}

export class SimulatorCanvasBoundary extends Component<SimulatorCanvasBoundaryProps, SimulatorCanvasBoundaryState> {
  constructor(props: SimulatorCanvasBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): SimulatorCanvasBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

interface ResponsiveSceneCameraProps {
  position: [number, number, number] | number[];
  fov: number;
}

export function ResponsiveSceneCamera({ position, fov }: ResponsiveSceneCameraProps): null {
  const { camera } = useThree();
  const [x, y, z] = position;

  useEffect(() => {
    camera.position.set(x, y, z);
    if ('fov' in camera) {
      // eslint-disable-next-line react-hooks/immutability
      (camera as THREE.PerspectiveCamera).fov = fov;
    }
    camera.updateProjectionMatrix();
  }, [camera, fov, x, y, z]);

  return null;
}

function getStickerIndex(face: FaceName, gx: number, gy: number, gz: number, cubeSize: number): number {
  return getFaceIndexFromAddress(face, gx, gy, gz, cubeSize);
}

function resolveStickerColor(value: unknown): string {
  if (typeof value === 'string') {
    const token = value.trim().toUpperCase();
    if (TOKEN_HEX[token as keyof typeof TOKEN_HEX]) return TOKEN_HEX[token as keyof typeof TOKEN_HEX];
  }
  return '#808080';
}

interface StickerProps {
  color: string;
  position: [number, number, number];
  rotation: [number, number, number];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPointerDown?: (event: any) => void;
  isSelected: boolean;
}

function Sticker({ color, position, rotation, onPointerDown, isSelected }: StickerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePointerOver = (event: any) => {
    event.stopPropagation();
    if (typeof document !== 'undefined') document.body.style.cursor = 'grab';
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePointerOut = (event: any) => {
    event.stopPropagation();
    if (typeof document !== 'undefined') document.body.style.cursor = '';
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
          <meshBasicMaterial color="#ff69b4" transparent opacity={0.5} side={THREE.FrontSide} depthTest={false} />
        </mesh>
      )}
    </group>
  );
}

interface StickerCubeletProps {
  cubeGroupRef: React.MutableRefObject<THREE.Group | null>;
  cubeSize: number;
  gx: number;
  gy: number;
  gz: number;
  cubeState: CubeStateObj;
  onStickerPointerDown?: (info: StickerPointerDownInfo) => void;
  selectedSticker?: { face: FaceName; index: number } | null;
}

const StickerCubelet = React.forwardRef<THREE.Group, StickerCubeletProps>(function StickerCubelet(
  { cubeGroupRef, cubeSize, gx, gy, gz, cubeState, onStickerPointerDown, selectedSticker },
  ref,
) {
  const { camera, size } = useThree();
  const stickers: ReactNode[] = [];

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
          if (!isPrimaryMouseButton) return;
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

interface InteractiveCubeProps {
  activeMove: string | null;
  activeMoveId: number | null;
  turnDurationSeconds?: number;
  cubeState: CubeStateObj;
  onMoveComplete: (move: string) => void;
  onStickerPointerDown?: (info: StickerPointerDownInfo) => void;
  selectedSticker?: { face: FaceName; index: number } | null;
}

interface ActiveAnimation {
  config: AnimationConfig;
  move: string;
  moveId: number;
  progress: number;
}

export function InteractiveCube({
  activeMove,
  activeMoveId,
  turnDurationSeconds = TURN_DURATION_SECONDS,
  cubeState,
  onMoveComplete,
  onStickerPointerDown,
  selectedSticker,
}: InteractiveCubeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const cubieRefs = useRef<(THREE.Group | null)[]>([]);
  const pivotRef = useRef<THREE.Group | null>(null);
  const activeAnimationRef = useRef<ActiveAnimation | null>(null);
  const onMoveCompleteRef = useRef(onMoveComplete);
  const moveProcessedRef = useRef<number | null>(null);
  const cubeSize = getFaceSize(cubeState) ?? 3;
  const [cubieLayout, setCubieLayout] = useState<CubieLayoutItem[]>(() => cloneCubieLayout(cubeSize));

  useEffect(() => {
    onMoveCompleteRef.current = onMoveComplete;
  }, [onMoveComplete]);

  useEffect(() => {
    if (!activeMove || activeMoveId === null) {
      activeAnimationRef.current = null;
      moveProcessedRef.current = null;
      return;
    }

    if (moveProcessedRef.current === activeMoveId) return;

    const config = parseMoveAnimation(activeMove, cubeSize);
    if (!config) {
      moveProcessedRef.current = activeMoveId;
      onMoveCompleteRef.current?.(activeMove);
      return;
    }

    const pivot = new THREE.Group();
    if (groupRef.current) groupRef.current.add(pivot);
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
    if (animation.config.axis === 'y') direction *= -1;

    const totalAngle = direction * (Math.PI / 2);
    const axisVector = AXIS_VECTORS[animation.config.axis as Axis];
    if (!pivotRef.current) return;
    pivotRef.current.setRotationFromAxisAngle(axisVector, totalAngle * easedProgress);

    if (animation.progress < 1) return;

    pivotRef.current.setRotationFromAxisAngle(axisVector, totalAngle);
    if (groupRef.current) attachLayerToPivot(groupRef.current, cubieLayout, cubieRefs, animation.config);

    groupRef.current.remove(pivotRef.current);
    pivotRef.current = null;

    const effectiveDirection =
      animation.config.axis === 'y' ? -animation.config.direction : animation.config.direction;

    const nextLayout = cubieLayout.map((cubie) => (
      isCubieInAnimatedLayer(cubie, animation.config)
        ? { ...rotateCubiePosition(cubie, animation.config.axis as Axis, effectiveDirection), key: cubie.key, position: cubie.position } as CubieLayoutItem
        : cubie
    ));
    syncCubieTransforms(nextLayout, cubieRefs);

    const finishedMove = animation.move;
    moveProcessedRef.current = animation.moveId;
    activeAnimationRef.current = null;

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
