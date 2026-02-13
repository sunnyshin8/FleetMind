"use client";

import { useMemo } from "react";

// --- Reusable Village Primitives ---

function Cottage({ position, rotation = 0, roofColor = "#8B4513", wallColor = "#F5DEB3" }: {
    position: [number, number, number]; rotation?: number; roofColor?: string; wallColor?: string;
}) {
    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {/* Walls */}
            <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
                <boxGeometry args={[2, 1.6, 2.2]} />
                <meshStandardMaterial color={wallColor} roughness={0.9} />
            </mesh>
            {/* Roof - two angled planes */}
            <mesh position={[0, 1.9, 0]} castShadow>
                <coneGeometry args={[1.8, 1.2, 4]} />
                <meshStandardMaterial color={roofColor} roughness={0.8} />
            </mesh>
            {/* Door */}
            <mesh position={[0, 0.5, 1.11]}>
                <boxGeometry args={[0.5, 1, 0.05]} />
                <meshStandardMaterial color="#5D3A1A" roughness={0.85} />
            </mesh>
            {/* Windows */}
            {[-0.6, 0.6].map((x, i) => (
                <mesh key={i} position={[x, 1, 1.11]}>
                    <boxGeometry args={[0.35, 0.35, 0.05]} />
                    <meshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.15} metalness={0.3} roughness={0.2} />
                </mesh>
            ))}
            {/* Chimney */}
            <mesh position={[0.6, 2.3, -0.5]} castShadow>
                <boxGeometry args={[0.3, 0.7, 0.3]} />
                <meshStandardMaterial color="#8B7D6B" roughness={0.9} />
            </mesh>
        </group>
    );
}

function Tree({ position, trunkHeight = 1.5, crownRadius = 1.2, crownColor = "#228B22" }: {
    position: [number, number, number]; trunkHeight?: number; crownRadius?: number; crownColor?: string;
}) {
    return (
        <group position={position}>
            {/* Trunk */}
            <mesh position={[0, trunkHeight / 2, 0]} castShadow>
                <cylinderGeometry args={[0.12, 0.18, trunkHeight, 8]} />
                <meshStandardMaterial color="#5D3A1A" roughness={0.95} />
            </mesh>
            {/* Crown */}
            <mesh position={[0, trunkHeight + crownRadius * 0.5, 0]} castShadow>
                <sphereGeometry args={[crownRadius, 8, 6]} />
                <meshStandardMaterial color={crownColor} roughness={0.85} />
            </mesh>
        </group>
    );
}

function Fence({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
    const dx = end[0] - start[0];
    const dz = end[2] - start[2];
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    const cx = (start[0] + end[0]) / 2;
    const cz = (start[2] + end[2]) / 2;
    const posts = Math.floor(length / 1.5);

    return (
        <group>
            {/* Horizontal rail */}
            <mesh position={[cx, 0.45, cz]} rotation={[0, angle, 0]}>
                <boxGeometry args={[0.06, 0.06, length]} />
                <meshStandardMaterial color="#8B7355" roughness={0.9} />
            </mesh>
            <mesh position={[cx, 0.25, cz]} rotation={[0, angle, 0]}>
                <boxGeometry args={[0.06, 0.06, length]} />
                <meshStandardMaterial color="#8B7355" roughness={0.9} />
            </mesh>
            {/* Posts */}
            {Array.from({ length: posts + 1 }, (_, i) => {
                const t = i / posts;
                return (
                    <mesh key={i} position={[
                        start[0] + dx * t,
                        0.3,
                        start[2] + dz * t
                    ]} castShadow>
                        <boxGeometry args={[0.08, 0.6, 0.08]} />
                        <meshStandardMaterial color="#6B5B4B" roughness={0.9} />
                    </mesh>
                );
            })}
        </group>
    );
}

function DirtPath({ points }: { points: [number, number, number][] }) {
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
                    <mesh key={i} position={[(pt[0] + next[0]) / 2, 0.015, (pt[2] + next[2]) / 2]} rotation={[-Math.PI / 2, 0, angle]}>
                        <planeGeometry args={[1.2, length + 0.1]} />
                        <meshStandardMaterial color="#C4A46C" roughness={1} />
                    </mesh>
                );
            })}
        </group>
    );
}

function Well({ position }: { position: [number, number, number] }) {
    return (
        <group position={position}>
            {/* Stone cylinder */}
            <mesh position={[0, 0.4, 0]} castShadow>
                <cylinderGeometry args={[0.6, 0.65, 0.8, 12]} />
                <meshStandardMaterial color="#8B8682" roughness={0.95} />
            </mesh>
            {/* Water */}
            <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.5, 0.5, 0.05, 12]} />
                <meshStandardMaterial color="#4682B4" metalness={0.3} roughness={0.2} />
            </mesh>
            {/* Roof posts */}
            {[-0.45, 0.45].map((x, i) => (
                <mesh key={i} position={[x, 1, 0]} castShadow>
                    <boxGeometry args={[0.08, 1.4, 0.08]} />
                    <meshStandardMaterial color="#5D3A1A" roughness={0.9} />
                </mesh>
            ))}
            {/* Roof */}
            <mesh position={[0, 1.65, 0]} castShadow>
                <coneGeometry args={[0.8, 0.5, 4]} />
                <meshStandardMaterial color="#8B4513" roughness={0.85} />
            </mesh>
        </group>
    );
}

function HayBale({ position }: { position: [number, number, number] }) {
    return (
        <mesh position={position} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 0.5, 12]} />
            <meshStandardMaterial color="#DAA520" roughness={1} />
        </mesh>
    );
}

// --- Main Village Map ---

export default function VillageMap({ tileOffset }: { tileOffset?: [number, number, number] }) {
    return (
        <group position={tileOffset || [0, 0, 0]}>
            {/* Grass ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[28, 28]} />
                <meshStandardMaterial color="#3a7d44" roughness={0.95} />
            </mesh>

            {/* Cottages scattered around */}
            <Cottage position={[-7, 0, -5]} rotation={0.3} roofColor="#8B4513" wallColor="#F5DEB3" />
            <Cottage position={[-3, 0, -8]} rotation={-0.2} roofColor="#A0522D" wallColor="#FAEBD7" />
            <Cottage position={[5, 0, -6]} rotation={0.5} roofColor="#6B3A2A" wallColor="#FFE4C4" />
            <Cottage position={[8, 0, -2]} rotation={Math.PI * 0.3} roofColor="#8B6914" wallColor="#F5DEB3" />
            <Cottage position={[-6, 0, 5]} rotation={-0.4} roofColor="#8B4513" wallColor="#FFDEAD" />
            <Cottage position={[3, 0, 7]} rotation={0.8} roofColor="#A0522D" wallColor="#F5DEB3" />

            {/* Village well at center */}
            <Well position={[0, 0, 0]} />

            {/* Trees scattered */}
            <Tree position={[-10, 0, -10]} crownColor="#2E8B57" />
            <Tree position={[-12, 0, -3]} crownColor="#228B22" crownRadius={1.5} />
            <Tree position={[-11, 0, 4]} crownColor="#3CB371" />
            <Tree position={[-9, 0, 9]} crownColor="#2E8B57" crownRadius={1.0} />
            <Tree position={[10, 0, -9]} crownColor="#228B22" crownRadius={1.3} />
            <Tree position={[12, 0, 2]} crownColor="#3CB371" crownRadius={1.1} />
            <Tree position={[11, 0, 8]} crownColor="#2E8B57" />
            <Tree position={[0, 0, -12]} crownColor="#228B22" crownRadius={1.4} />
            <Tree position={[6, 0, 12]} crownColor="#3CB371" crownRadius={0.9} />
            <Tree position={[-4, 0, 11]} crownColor="#2E8B57" crownRadius={1.2} />

            {/* Dirt paths connecting cottages to center */}
            <DirtPath points={[[-7, 0, -5], [-3, 0, -2], [0, 0, 0]]} />
            <DirtPath points={[[5, 0, -6], [2, 0, -3], [0, 0, 0]]} />
            <DirtPath points={[[-6, 0, 5], [-2, 0, 2], [0, 0, 0]]} />
            <DirtPath points={[[3, 0, 7], [1, 0, 3], [0, 0, 0]]} />

            {/* Fences around some cottages */}
            <Fence start={[-9.5, 0, -3.5]} end={[-4.5, 0, -3.5]} />
            <Fence start={[-9.5, 0, -6.5]} end={[-9.5, 0, -3.5]} />
            <Fence start={[3.5, 0, -4.5]} end={[7, 0, -4.5]} />

            {/* Hay bales near barn area */}
            <HayBale position={[8, 0.4, 5]} />
            <HayBale position={[8.8, 0.4, 5.3]} />
            <HayBale position={[8.4, 0.8, 5.1]} />
            <HayBale position={[-8, 0.4, 8]} />
        </group>
    );
}
