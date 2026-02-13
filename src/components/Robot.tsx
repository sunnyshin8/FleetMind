"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { Billboard, Text } from "@react-three/drei";

export type RobotType = "ironhog" | "siegebreaker" | "ion_cannon" | "warplate" | "titan" | "juggernaut";

export const ROBOT_CATALOG: Record<RobotType, { name: string; icon: string; color: string }> = {
    ironhog: { name: "Ironhog", icon: "🐗", color: "#b45309" },
    siegebreaker: { name: "Siegebreaker", icon: "⚔️", color: "#78716c" },
    ion_cannon: { name: "Ion Cannon", icon: "🔫", color: "#3b82f6" },
    warplate: { name: "Warplate", icon: "🛡️", color: "#4b5563" },
    titan: { name: "Titan MK-II", icon: "🤖", color: "#d97706" },
    juggernaut: { name: "Juggernaut", icon: "💀", color: "#6b7280" },
};

interface RobotProps {
    id?: string;
    position: [number, number, number];
    color?: string;
    battery?: number;
    robotType?: RobotType;
}

// --- Safe texture loader hook (no crash on missing files) ---
function useRobotTexture(robotType: RobotType): THREE.Texture | null {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        let disposed = false;
        const loader = new THREE.TextureLoader();
        loader.load(
            `/robots/${robotType}.png`,
            (tex) => {
                if (!disposed) {
                    tex.minFilter = THREE.LinearFilter;
                    tex.magFilter = THREE.LinearFilter;
                    tex.colorSpace = THREE.SRGBColorSpace;
                    setTexture(tex);
                }
            },
            undefined,
            () => { if (!disposed) setTexture(null); }
        );
        return () => { disposed = true; };
    }, [robotType]);

    return texture;
}

// --- The billboard sprite robot (loads PNG texture) ---
function SpriteRobot({ robotType, battery = 100 }: { robotType: RobotType; battery: number }) {
    const catalog = ROBOT_CATALOG[robotType];
    const texture = useRobotTexture(robotType);
    const meshRef = useRef<THREE.Mesh>(null);

    // Gentle bobbing
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.y = 1.5 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
        }
    });

    // If texture is null, it means loading failed or it's not yet loaded.
    if (!texture) {
        return null;
    }

    return (
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
            <mesh ref={meshRef} position={[0, 1.5, 0]}>
                <planeGeometry args={[2.4, 2.4]} />
                <meshBasicMaterial
                    map={texture}
                    transparent
                    alphaTest={0.05}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>

            {/* Name Tag */}
            <Text
                position={[0, 0.15, 0]}
                fontSize={0.2}
                color="#e2e8f0"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.025}
                outlineColor="#0f172a"
            >
                {catalog.name}
            </Text>

            {/* Battery Bar */}
            <group position={[0, 2.9, 0]}>
                <mesh>
                    <planeGeometry args={[1.2, 0.1]} />
                    <meshBasicMaterial color="#1e293b" transparent opacity={0.8} />
                </mesh>
                <mesh position={[-0.6 + (battery / 100) * 0.6, 0, 0.001]}>
                    <planeGeometry args={[(battery / 100) * 1.2, 0.1]} />
                    <meshBasicMaterial color={battery < 20 ? "#ef4444" : "#22c55e"} />
                </mesh>
            </group>
        </Billboard>
    );
}

// --- Placeholder shown while PNG is loading or missing ---
function PlaceholderRobot({ robotType, battery = 100 }: { robotType: RobotType; battery: number }) {
    const catalog = ROBOT_CATALOG[robotType];
    const meshRef = useRef<THREE.Mesh>(null);

    // Spin animation for placeholder
    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 1.5;
        }
    });

    return (
        <group>
            {/* Holographic placeholder body */}
            <mesh ref={meshRef} position={[0, 1, 0]}>
                <octahedronGeometry args={[0.7, 0]} />
                <meshStandardMaterial
                    color={catalog.color}
                    emissive={catalog.color}
                    emissiveIntensity={0.3}
                    wireframe
                    transparent
                    opacity={0.8}
                />
            </mesh>

            {/* Inner core glow */}
            <mesh position={[0, 1, 0]}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshBasicMaterial color={catalog.color} transparent opacity={0.5} />
            </mesh>

            {/* Name Tag */}
            <Billboard follow>
                <Text
                    position={[0, 2.0, 0]}
                    fontSize={0.2}
                    color="#e2e8f0"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.025}
                    outlineColor="#0f172a"
                >
                    {catalog.name}
                </Text>
                <Text
                    position={[0, 1.7, 0]}
                    fontSize={0.12}
                    color="#f59e0b"
                    anchorX="center"
                    anchorY="middle"
                >
                    ⚠ Add PNG to /robots/
                </Text>
            </Billboard>
        </group>
    );
}

export default function Robot({ position, color = "hotpink", battery = 100, robotType = "ironhog" }: RobotProps) {
    const groupRef = useRef<THREE.Group>(null);
    const catalog = ROBOT_CATALOG[robotType];

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.position.lerp(new THREE.Vector3(...position), delta * 5);
        }
    });

    return (
        <group ref={groupRef} position={position}>
            {/* Ground shadow */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <circleGeometry args={[0.6, 24]} />
                <meshBasicMaterial color={catalog.color} transparent opacity={0.25} depthWrite={false} />
            </mesh>

            {/* Glow ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
                <ringGeometry args={[0.5, 0.7, 24]} />
                <meshBasicMaterial color={catalog.color} transparent opacity={0.15} depthWrite={false} />
            </mesh>

            {/* Sprite robot — shows if PNG loaded, otherwise null */}
            <SpriteRobot robotType={robotType} battery={battery} />
            {/* Placeholder always exists as base — SpriteRobot overlays it when texture loads */}
            <PlaceholderRobot robotType={robotType} battery={battery} />
        </group>
    );
}
