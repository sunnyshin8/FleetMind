"use client";

import * as THREE from "three";

// --- Reusable Primitives ---

function Crate({ position, size = [1, 1, 1], color = "#8B6914" }: { position: [number, number, number]; size?: [number, number, number]; color?: string }) {
    return (
        <mesh position={position} castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
    );
}

function Pallet({ position }: { position: [number, number, number] }) {
    return (
        <group position={position}>
            {/* Pallet base slats */}
            {[-0.35, 0, 0.35].map((z, i) => (
                <mesh key={`slat-${i}`} position={[0, 0.05, z]} castShadow>
                    <boxGeometry args={[1.2, 0.1, 0.25]} />
                    <meshStandardMaterial color="#a0845c" roughness={0.9} />
                </mesh>
            ))}
            {/* Cross supports */}
            {[-0.4, 0, 0.4].map((x, i) => (
                <mesh key={`sup-${i}`} position={[x, 0.15, 0]} castShadow>
                    <boxGeometry args={[0.15, 0.1, 1]} />
                    <meshStandardMaterial color="#8B7355" roughness={0.9} />
                </mesh>
            ))}
        </group>
    );
}

function ShelfUnit({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
    const shelfColor = "#5a6a7a";
    const levels = [0.1, 1.2, 2.4, 3.6];

    return (
        <group position={position} rotation={rotation}>
            {/* Vertical posts */}
            {[[-1, 0, -0.4], [-1, 0, 0.4], [1, 0, -0.4], [1, 0, 0.4]].map((pos, i) => (
                <mesh key={`post-${i}`} position={[pos[0], 2.2, pos[2]]} castShadow>
                    <boxGeometry args={[0.08, 4.4, 0.08]} />
                    <meshStandardMaterial color="#3a4a5a" metalness={0.6} roughness={0.3} />
                </mesh>
            ))}
            {/* Shelf platforms */}
            {levels.map((y, i) => (
                <mesh key={`shelf-${i}`} position={[0, y, 0]} receiveShadow>
                    <boxGeometry args={[2.1, 0.06, 0.9]} />
                    <meshStandardMaterial color={shelfColor} metalness={0.4} roughness={0.5} />
                </mesh>
            ))}
            {/* Random crates on shelves */}
            <Crate position={[-0.5, 0.55, 0]} size={[0.6, 0.8, 0.5]} color="#c4883a" />
            <Crate position={[0.4, 0.45, 0]} size={[0.5, 0.7, 0.5]} color="#7a5c2e" />
            <Crate position={[-0.3, 1.65, 0.1]} size={[0.7, 0.8, 0.6]} color="#b87333" />
            <Crate position={[0.5, 1.55, -0.1]} size={[0.4, 0.6, 0.4]} color="#8B6914" />
            <Crate position={[0, 2.85, 0]} size={[0.8, 0.7, 0.5]} color="#a57e4e" />
        </group>
    );
}

function RollUpDoor({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
    return (
        <group position={position} rotation={rotation}>
            {/* Frame */}
            <mesh position={[0, 2, 0]}>
                <boxGeometry args={[3.2, 4, 0.15]} />
                <meshStandardMaterial color="#4a5568" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Door panels (horizontal slats) */}
            {Array.from({ length: 8 }, (_, i) => (
                <mesh key={i} position={[0, 0.25 + i * 0.5, 0.08]}>
                    <boxGeometry args={[2.8, 0.45, 0.05]} />
                    <meshStandardMaterial color={i % 2 === 0 ? "#718096" : "#a0aec0"} metalness={0.3} roughness={0.5} />
                </mesh>
            ))}
            {/* Warning stripes */}
            <mesh position={[-1.5, 0.15, 0.1]}>
                <boxGeometry args={[0.1, 0.3, 0.05]} />
                <meshStandardMaterial color="#ecc94b" emissive="#ecc94b" emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[1.5, 0.15, 0.1]}>
                <boxGeometry args={[0.1, 0.3, 0.05]} />
                <meshStandardMaterial color="#ecc94b" emissive="#ecc94b" emissiveIntensity={0.3} />
            </mesh>
        </group>
    );
}

function FloorMarking({ start, end, color = "#ecc94b" }: { start: [number, number, number]; end: [number, number, number]; color?: string }) {
    const dx = end[0] - start[0];
    const dz = end[2] - start[2];
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    const cx = (start[0] + end[0]) / 2;
    const cz = (start[2] + end[2]) / 2;

    return (
        <mesh position={[cx, 0.01, cz]} rotation={[-Math.PI / 2, 0, angle]}>
            <planeGeometry args={[0.12, length]} />
            <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
    );
}

function Forklift({ position }: { position: [number, number, number] }) {
    return (
        <group position={position}>
            {/* Body */}
            <mesh position={[0, 0.4, 0]} castShadow>
                <boxGeometry args={[0.8, 0.6, 1.2]} />
                <meshStandardMaterial color="#d69e2e" roughness={0.6} />
            </mesh>
            {/* Mast */}
            <mesh position={[0, 1, 0.55]} castShadow>
                <boxGeometry args={[0.6, 1.2, 0.08]} />
                <meshStandardMaterial color="#2d3748" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Forks */}
            {[-0.2, 0.2].map((x, i) => (
                <mesh key={i} position={[x, 0.12, 0.9]} castShadow>
                    <boxGeometry args={[0.08, 0.04, 0.7]} />
                    <meshStandardMaterial color="#4a5568" metalness={0.7} roughness={0.3} />
                </mesh>
            ))}
            {/* Wheels */}
            {[[-0.35, 0.12, -0.4], [0.35, 0.12, -0.4], [-0.25, 0.1, 0.3], [0.25, 0.1, 0.3]].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[0.12, 0.12, 0.1, 12]} />
                    <meshStandardMaterial color="#1a202c" roughness={0.9} />
                </mesh>
            ))}
        </group>
    );
}

function CeilingLight({ position }: { position: [number, number, number] }) {
    return (
        <group position={position}>
            <mesh>
                <boxGeometry args={[1.5, 0.08, 0.3]} />
                <meshStandardMaterial color="#e2e8f0" emissive="#ffffff" emissiveIntensity={0.5} />
            </mesh>
            <pointLight position={[0, -0.5, 0]} intensity={2} distance={12} color="#f7fafc" decay={2} />
        </group>
    );
}

// --- Main Warehouse Map ---

export default function WarehouseMap({ tileOffset }: { tileOffset?: [number, number, number] }) {
    return (
        <group position={tileOffset || [0, 0, 0]}>
            {/* Concrete Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[28, 28]} />
                <meshStandardMaterial color="#4a5568" roughness={0.95} metalness={0.05} />
            </mesh>

            {/* Shelf Rows - Left Aisle */}
            <ShelfUnit position={[-8, 0, -8]} />
            <ShelfUnit position={[-8, 0, -4]} />
            <ShelfUnit position={[-8, 0, 0]} />
            <ShelfUnit position={[-8, 0, 4]} />
            <ShelfUnit position={[-8, 0, 8]} />

            {/* Shelf Rows - Center-Left */}
            <ShelfUnit position={[-4, 0, -8]} />
            <ShelfUnit position={[-4, 0, -4]} />
            <ShelfUnit position={[-4, 0, 0]} />
            <ShelfUnit position={[-4, 0, 4]} />
            <ShelfUnit position={[-4, 0, 8]} />

            {/* Shelf Rows - Center-Right */}
            <ShelfUnit position={[4, 0, -8]} />
            <ShelfUnit position={[4, 0, -4]} />
            <ShelfUnit position={[4, 0, 0]} />
            <ShelfUnit position={[4, 0, 4]} />
            <ShelfUnit position={[4, 0, 8]} />

            {/* Shelf Rows - Right Aisle */}
            <ShelfUnit position={[8, 0, -8]} />
            <ShelfUnit position={[8, 0, -4]} />
            <ShelfUnit position={[8, 0, 0]} />
            <ShelfUnit position={[8, 0, 4]} />
            <ShelfUnit position={[8, 0, 8]} />

            {/* Loose pallets with crates in staging area */}
            <Pallet position={[0, 0, -10]} />
            <Crate position={[0, 0.6, -10]} size={[0.9, 0.8, 0.9]} color="#c4883a" />
            <Pallet position={[1.5, 0, -10]} />
            <Crate position={[1.5, 0.6, -10]} size={[0.8, 0.6, 0.8]} color="#7a5c2e" />
            <Pallet position={[-1.5, 0, -10]} />

            {/* Dock doors on back edge */}
            <RollUpDoor position={[-6, 0, -14]} />
            <RollUpDoor position={[0, 0, -14]} />
            <RollUpDoor position={[6, 0, -14]} />

            {/* Forklifts */}
            <Forklift position={[0, 0, 2]} />
            <Forklift position={[2, 0, 6]} />

            {/* Floor safety markings - aisles */}
            <FloorMarking start={[-6, 0, -13]} end={[-6, 0, 13]} />
            <FloorMarking start={[0, 0, -13]} end={[0, 0, 13]} />
            <FloorMarking start={[6, 0, -13]} end={[6, 0, 13]} />

            {/* Ceiling lights */}
            <CeilingLight position={[-6, 5.5, -6]} />
            <CeilingLight position={[-6, 5.5, 0]} />
            <CeilingLight position={[-6, 5.5, 6]} />
            <CeilingLight position={[0, 5.5, -6]} />
            <CeilingLight position={[0, 5.5, 0]} />
            <CeilingLight position={[0, 5.5, 6]} />
            <CeilingLight position={[6, 5.5, -6]} />
            <CeilingLight position={[6, 5.5, 0]} />
            <CeilingLight position={[6, 5.5, 6]} />

            {/* Hazard zone decal */}
            <mesh position={[0, 0.015, -12]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[4, 2]} />
                <meshBasicMaterial color="#e53e3e" transparent opacity={0.25} />
            </mesh>
        </group>
    );
}
