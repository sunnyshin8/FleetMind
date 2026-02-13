"use client";

import { useMemo } from "react";
import * as THREE from "three";

// --- Reusable Mountain Primitives ---

function MountainPeak({ position, radius = 5, height = 8, color = "#5D6D7E", snowLine = 0.65 }: {
    position: [number, number, number]; radius?: number; height?: number; color?: string; snowLine?: number;
}) {
    return (
        <group position={position}>
            {/* Main rock body */}
            <mesh position={[0, height / 2, 0]} castShadow>
                <coneGeometry args={[radius, height, 6]} />
                <meshStandardMaterial color={color} roughness={0.95} flatShading />
            </mesh>
            {/* Snow cap */}
            <mesh position={[0, height * snowLine + height * (1 - snowLine) / 2, 0]} castShadow>
                <coneGeometry args={[radius * (1 - snowLine) * 1.05, height * (1 - snowLine), 6]} />
                <meshStandardMaterial color="#F0F4F8" roughness={0.7} flatShading />
            </mesh>
        </group>
    );
}

function PineTree({ position, height = 2.5, spread = 0.8 }: {
    position: [number, number, number]; height?: number; spread?: number;
}) {
    return (
        <group position={position}>
            {/* Trunk */}
            <mesh position={[0, 0.5, 0]} castShadow>
                <cylinderGeometry args={[0.06, 0.1, 1, 6]} />
                <meshStandardMaterial color="#5D3A1A" roughness={0.95} />
            </mesh>
            {/* Foliage layers */}
            <mesh position={[0, 1, 0]} castShadow>
                <coneGeometry args={[spread, height * 0.4, 6]} />
                <meshStandardMaterial color="#1B5E20" roughness={0.9} flatShading />
            </mesh>
            <mesh position={[0, 1.5, 0]} castShadow>
                <coneGeometry args={[spread * 0.75, height * 0.35, 6]} />
                <meshStandardMaterial color="#2E7D32" roughness={0.9} flatShading />
            </mesh>
            <mesh position={[0, 1.9, 0]} castShadow>
                <coneGeometry args={[spread * 0.5, height * 0.3, 6]} />
                <meshStandardMaterial color="#388E3C" roughness={0.9} flatShading />
            </mesh>
        </group>
    );
}

function Rock({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
    return (
        <mesh position={position} castShadow scale={scale}>
            <dodecahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial color="#78909C" roughness={0.95} flatShading />
        </mesh>
    );
}

function River({ points, width = 1.5 }: { points: [number, number, number][]; width?: number }) {
    return (
        <group>
            {points.map((pt, i) => {
                if (i === points.length - 1) return null;
                const next = points[i + 1];
                const dx = next[0] - pt[0];
                const dz = next[2] - pt[2];
                const length = Math.sqrt(dx * dx + dz * dz);
                const angle = Math.atan2(dx, dz);
                return (
                    <mesh key={i} position={[(pt[0] + next[0]) / 2, 0.02, (pt[2] + next[2]) / 2]} rotation={[-Math.PI / 2, 0, angle]}>
                        <planeGeometry args={[width, length + 0.3]} />
                        <meshStandardMaterial color="#2196F3" metalness={0.4} roughness={0.15} transparent opacity={0.75} />
                    </mesh>
                );
            })}
        </group>
    );
}

function Lake({ position, radius = 3 }: { position: [number, number, number]; radius?: number }) {
    return (
        <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[radius, 24]} />
            <meshStandardMaterial color="#1976D2" metalness={0.5} roughness={0.1} transparent opacity={0.8} />
        </mesh>
    );
}

function WoodenBridge({ position, rotation = 0, length = 3 }: { position: [number, number, number]; rotation?: number; length?: number }) {
    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {/* Planks */}
            {Array.from({ length: Math.floor(length / 0.3) }, (_, i) => (
                <mesh key={i} position={[0, 0.15, -length / 2 + i * 0.3 + 0.15]}>
                    <boxGeometry args={[1.8, 0.06, 0.25]} />
                    <meshStandardMaterial color="#6D4C41" roughness={0.9} />
                </mesh>
            ))}
            {/* Railings */}
            {[-0.85, 0.85].map((x, i) => (
                <group key={i}>
                    <mesh position={[x, 0.35, 0]}>
                        <boxGeometry args={[0.06, 0.06, length]} />
                        <meshStandardMaterial color="#5D4037" roughness={0.9} />
                    </mesh>
                    {/* Posts */}
                    {Array.from({ length: 4 }, (_, j) => (
                        <mesh key={j} position={[x, 0.25, -length / 2 + (j + 0.5) * (length / 4)]}>
                            <boxGeometry args={[0.06, 0.3, 0.06]} />
                            <meshStandardMaterial color="#4E342E" roughness={0.9} />
                        </mesh>
                    ))}
                </group>
            ))}
        </group>
    );
}

function Campfire({ position }: { position: [number, number, number] }) {
    return (
        <group position={position}>
            {/* Stones around fire */}
            {Array.from({ length: 8 }, (_, i) => {
                const angle = (i / 8) * Math.PI * 2;
                return (
                    <mesh key={i} position={[Math.cos(angle) * 0.35, 0.08, Math.sin(angle) * 0.35]}>
                        <sphereGeometry args={[0.1, 6, 4]} />
                        <meshStandardMaterial color="#607D8B" roughness={0.95} flatShading />
                    </mesh>
                );
            })}
            {/* Logs */}
            <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.05, 0.05, 0.5, 6]} />
                <meshStandardMaterial color="#3E2723" roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.08, 0]} rotation={[0, Math.PI / 3, Math.PI / 2]}>
                <cylinderGeometry args={[0.05, 0.05, 0.5, 6]} />
                <meshStandardMaterial color="#4E342E" roughness={0.95} />
            </mesh>
            {/* Flame glow */}
            <mesh position={[0, 0.25, 0]}>
                <sphereGeometry args={[0.12, 6, 6]} />
                <meshStandardMaterial color="#FF6F00" emissive="#FF6F00" emissiveIntensity={2} transparent opacity={0.8} />
            </mesh>
            <pointLight position={[0, 0.4, 0]} intensity={3} distance={6} color="#FF8F00" decay={2} />
        </group>
    );
}

// --- Main Mountains Map ---

export default function MountainsMap() {
    return (
        <group>
            {/* Ground - alpine grass */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[60, 60]} />
                <meshStandardMaterial color="#4a6741" roughness={0.95} />
            </mesh>

            {/* Mountain peaks - background ring */}
            <MountainPeak position={[-15, 0, -18]} radius={6} height={12} color="#546E7A" snowLine={0.6} />
            <MountainPeak position={[0, 0, -22]} radius={8} height={16} color="#455A64" snowLine={0.55} />
            <MountainPeak position={[15, 0, -18]} radius={7} height={14} color="#5D6D7E" snowLine={0.6} />
            <MountainPeak position={[-20, 0, -10]} radius={5} height={10} color="#607D8B" snowLine={0.65} />
            <MountainPeak position={[20, 0, -12]} radius={5.5} height={11} color="#546E7A" snowLine={0.62} />

            {/* Smaller hills */}
            <MountainPeak position={[-10, 0, -8]} radius={3} height={4} color="#6D7B5A" snowLine={1} />
            <MountainPeak position={[10, 0, -6]} radius={2.5} height={3.5} color="#5D6D4E" snowLine={1} />
            <MountainPeak position={[-8, 0, 8]} radius={2} height={2.5} color="#6D7B5A" snowLine={1} />

            {/* Pine tree forest clusters */}
            {/* Cluster 1 - left side */}
            <PineTree position={[-5, 0, -4]} height={3} />
            <PineTree position={[-6, 0, -3]} height={2.5} spread={0.7} />
            <PineTree position={[-4.5, 0, -2.5]} height={2.8} />
            <PineTree position={[-7, 0, -5]} height={2} spread={0.6} />
            <PineTree position={[-5.5, 0, -5.5]} height={3.2} spread={0.9} />

            {/* Cluster 2 - right side */}
            <PineTree position={[6, 0, -3]} height={2.8} />
            <PineTree position={[7, 0, -4]} height={3} spread={0.85} />
            <PineTree position={[5.5, 0, -5]} height={2.5} />
            <PineTree position={[8, 0, -2]} height={2.2} spread={0.7} />

            {/* Cluster 3 - near lake */}
            <PineTree position={[2, 0, 5]} height={2.5} />
            <PineTree position={[3.5, 0, 6]} height={2.8} />
            <PineTree position={[-3, 0, 6]} height={3} spread={0.8} />
            <PineTree position={[-4, 0, 4.5]} height={2.3} />

            {/* Scattered trees */}
            <PineTree position={[-12, 0, 2]} height={2.5} />
            <PineTree position={[12, 0, 3]} height={2.8} />
            <PineTree position={[0, 0, 9]} height={2} />
            <PineTree position={[-8, 0, -9]} height={3.5} spread={1} />

            {/* Lake */}
            <Lake position={[0, 0.01, 4]} radius={2.5} />

            {/* River flowing from mountains to lake */}
            <River points={[
                [2, 0, -12],
                [1.5, 0, -8],
                [1, 0, -4],
                [0.5, 0, 0],
                [0, 0, 2],
            ]} width={1.2} />

            {/* River flowing out of lake */}
            <River points={[
                [-1, 0, 6],
                [-2, 0, 10],
                [-3, 0, 14],
            ]} width={1} />

            {/* Wooden bridge over river */}
            <WoodenBridge position={[1, 0, -2]} rotation={0.1} length={2.5} />

            {/* Rocks scattered */}
            <Rock position={[-2, 0.2, -6]} scale={1.2} />
            <Rock position={[3, 0.15, -7]} scale={0.8} />
            <Rock position={[-6, 0.1, 1]} scale={0.6} />
            <Rock position={[8, 0.2, 1]} scale={1} />
            <Rock position={[-3, 0.15, 9]} scale={0.7} />
            <Rock position={[5, 0.1, 8]} scale={0.5} />
            <Rock position={[0, 0.2, -9]} scale={1.3} />

            {/* Campfire with stones */}
            <Campfire position={[-1, 0, 8]} />
        </group>
    );
}
