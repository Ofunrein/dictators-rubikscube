import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';

const RubiksCube3D = () => {
    const groupRef = useRef();
    const { viewport } = useThree();
    const [hovered, setHovered] = useState(false);

    // Create 27 cubelets
    const cubelets = [];
    const offset = 1.05; // Spacing between cubelets

    // Palette mapping
    const colors = {
        front: '#CC1A1A',  // Dictator Red
        back: '#FF6B35',   // Orange accent
        left: '#FFFFFF',   // White
        right: '#FFD700',  // Gold
        top: '#2E8B57',    // Green
        bottom: '#1E90FF', // Blue
        internal: '#0D0D0D' // Void Black gap/internal color
    };

    const getMaterialArray = (x, y, z) => {
        // Array order: right, left, top, bottom, front, back
        return [
            new THREE.MeshStandardMaterial({ color: x === 1 ? colors.right : colors.internal, roughness: 0.2, metalness: 0.8 }),
            new THREE.MeshStandardMaterial({ color: x === -1 ? colors.left : colors.internal, roughness: 0.2, metalness: 0.8 }),
            new THREE.MeshStandardMaterial({ color: y === 1 ? colors.top : colors.internal, roughness: 0.2, metalness: 0.8 }),
            new THREE.MeshStandardMaterial({ color: y === -1 ? colors.bottom : colors.internal, roughness: 0.2, metalness: 0.8 }),
            new THREE.MeshStandardMaterial({ color: z === 1 ? colors.front : colors.internal, roughness: 0.2, metalness: 0.8 }),
            new THREE.MeshStandardMaterial({ color: z === -1 ? colors.back : colors.internal, roughness: 0.2, metalness: 0.8 }),
        ];
    };

    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                cubelets.push(
                    <mesh
                        key={`${x}-${y}-${z}`}
                        position={[x * offset, y * offset, z * offset]}
                        material={getMaterialArray(x, y, z)}
                        castShadow
                        receiveShadow
                    >
                        <boxGeometry args={[1, 1, 1]} />
                        <Edges scale={1.0} threshold={15} color="#1A1A1A" />
                    </mesh>
                );
            }
        }
    }

    // Animation logic
    useFrame(({ mouse }) => {
        if (!groupRef.current) return;

        // Auto rotation
        const rotSpeed = hovered ? 0.006 : 0.003;
        groupRef.current.rotation.y += rotSpeed;
        groupRef.current.rotation.x += rotSpeed * 0.5;

        // Mouse parallax (lerp towards mouse position mapped to angles)
        const targetX = (mouse.y * viewport.height) / 10;
        const targetY = (mouse.x * viewport.width) / 10;

        // Smooth lerp
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX + groupRef.current.rotation.x, 0.05);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY + groupRef.current.rotation.y, 0.05);

        // Hover scale pulse
        const targetScale = hovered ? 1.05 : 1;
        groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    });

    return (
        <group
            ref={groupRef}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            rotation={[0.5, -0.5, 0]} // Initial isometric-ish tilt
        >
            {cubelets}
        </group>
    );
};

export default RubiksCube3D;
