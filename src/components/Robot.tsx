"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

interface RobotProps {
    position: [number, number, number];
    color?: string;
    battery?: number; // 0-100
}

export default function Robot({ position, color = "hotpink", battery = 100 }: RobotProps) {
    const meshRef = useRef<THREE.Group>(null);

    // Smooth intepolation to target position
    useFrame((state, delta) => {
        if (meshRef.current) {
            // Simple lerp for visual smoothness
            meshRef.current.position.lerp(new THREE.Vector3(...position), delta * 5);
        }
    });

    return (
        <group ref={meshRef} position={position}>
            {/* Battery Bar */}
            <group position={[0, 1.5, 0]}>
                <mesh position={[-0.5 + (battery / 100) / 2, 0, 0]}>
                    <boxGeometry args={[battery / 100, 0.1, 0.1]} />
                    <meshBasicMaterial color={battery < 20 ? "red" : "green"} />
                </mesh>
            </group>

            {/* Body */}
            <mesh position={[0, 0.5, 0]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Head / Direction Indicator */}
            <mesh position={[0, 1, 0.3]}>
                <boxGeometry args={[0.5, 0.2, 0.2]} />
                <meshStandardMaterial color="black" />
            </mesh>
        </group>
    );
}
