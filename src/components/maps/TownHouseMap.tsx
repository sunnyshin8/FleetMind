"use client";

// --- Reusable Town Primitives ---

function Building({ position, width = 3, height = 4, depth = 3, color = "#607D8B", rotation = 0 }: {
    position: [number, number, number]; width?: number; height?: number; depth?: number; color?: string; rotation?: number;
}) {
    const windowRows = Math.floor(height / 1.2);
    const windowCols = Math.floor(width / 1.2);

    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {/* Main structure */}
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
            {/* Roof / top accent */}
            <mesh position={[0, height + 0.1, 0]}>
                <boxGeometry args={[width + 0.2, 0.2, depth + 0.2]} />
                <meshStandardMaterial color="#455A64" roughness={0.7} metalness={0.2} />
            </mesh>
            {/* Windows - front face */}
            {Array.from({ length: windowRows }, (_, row) =>
                Array.from({ length: windowCols }, (_, col) => {
                    const x = -((windowCols - 1) * 0.9) / 2 + col * 0.9;
                    const y = 1 + row * 1.1;
                    return (
                        <mesh key={`w-${row}-${col}`} position={[x, y, depth / 2 + 0.01]}>
                            <boxGeometry args={[0.5, 0.6, 0.02]} />
                            <meshStandardMaterial
                                color="#87CEEB"
                                emissive="#FFF8DC"
                                emissiveIntensity={Math.random() > 0.4 ? 0.3 : 0}
                                metalness={0.4}
                                roughness={0.1}
                            />
                        </mesh>
                    );
                })
            )}
            {/* Door */}
            <mesh position={[0, 0.75, depth / 2 + 0.01]}>
                <boxGeometry args={[0.8, 1.5, 0.02]} />
                <meshStandardMaterial color="#3E2723" roughness={0.9} />
            </mesh>
        </group>
    );
}

function Road({ start, end, width = 3 }: { start: [number, number, number]; end: [number, number, number]; width?: number }) {
    const dx = end[0] - start[0];
    const dz = end[2] - start[2];
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    const cx = (start[0] + end[0]) / 2;
    const cz = (start[2] + end[2]) / 2;

    const dashes = Math.floor(length / 2);

    return (
        <group>
            {/* Asphalt */}
            <mesh position={[cx, 0.01, cz]} rotation={[-Math.PI / 2, 0, angle]}>
                <planeGeometry args={[width, length]} />
                <meshStandardMaterial color="#37474F" roughness={0.95} />
            </mesh>
            {/* Center dashes */}
            {Array.from({ length: dashes }, (_, i) => {
                const t = (i + 0.5) / dashes;
                return (
                    <mesh key={i} position={[
                        start[0] + dx * t,
                        0.02,
                        start[2] + dz * t
                    ]} rotation={[-Math.PI / 2, 0, angle]}>
                        <planeGeometry args={[0.1, 0.8]} />
                        <meshBasicMaterial color="#FFD54F" transparent opacity={0.8} />
                    </mesh>
                );
            })}
            {/* Sidewalks */}
            {[-1, 1].map((side, i) => (
                <mesh key={i} position={[
                    cx + Math.cos(angle) * (width / 2 + 0.4) * side,
                    0.04,
                    cz - Math.sin(angle) * (width / 2 + 0.4) * side
                ]} rotation={[-Math.PI / 2, 0, angle]}>
                    <planeGeometry args={[0.8, length]} />
                    <meshStandardMaterial color="#9E9E9E" roughness={0.9} />
                </mesh>
            ))}
        </group>
    );
}

function Lamppost({ position }: { position: [number, number, number] }) {
    return (
        <group position={position}>
            {/* Pole */}
            <mesh position={[0, 1.8, 0]} castShadow>
                <cylinderGeometry args={[0.04, 0.06, 3.6, 8]} />
                <meshStandardMaterial color="#37474F" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Arm */}
            <mesh position={[0.3, 3.5, 0]} castShadow>
                <boxGeometry args={[0.6, 0.04, 0.04]} />
                <meshStandardMaterial color="#37474F" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Lamp head */}
            <mesh position={[0.55, 3.4, 0]}>
                <boxGeometry args={[0.25, 0.15, 0.15]} />
                <meshStandardMaterial color="#FFF8E1" emissive="#FFC107" emissiveIntensity={0.8} />
            </mesh>
            {/* Light */}
            <pointLight position={[0.55, 3.2, 0]} intensity={3} distance={8} color="#FFC107" decay={2} />
        </group>
    );
}

function ParkBench({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {/* Seat */}
            <mesh position={[0, 0.35, 0]} castShadow>
                <boxGeometry args={[1.2, 0.06, 0.4]} />
                <meshStandardMaterial color="#5D4037" roughness={0.9} />
            </mesh>
            {/* Back */}
            <mesh position={[0, 0.6, -0.18]} castShadow>
                <boxGeometry args={[1.2, 0.5, 0.05]} />
                <meshStandardMaterial color="#5D4037" roughness={0.9} />
            </mesh>
            {/* Legs */}
            {[-0.5, 0.5].map((x, i) => (
                <mesh key={i} position={[x, 0.17, 0]} castShadow>
                    <boxGeometry args={[0.05, 0.35, 0.4]} />
                    <meshStandardMaterial color="#37474F" metalness={0.6} roughness={0.4} />
                </mesh>
            ))}
        </group>
    );
}

function Car({ position, color = "#D32F2F", rotation = 0 }: { position: [number, number, number]; color?: string; rotation?: number }) {
    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {/* Body */}
            <mesh position={[0, 0.35, 0]} castShadow>
                <boxGeometry args={[1.6, 0.5, 0.8]} />
                <meshStandardMaterial color={color} metalness={0.4} roughness={0.3} />
            </mesh>
            {/* Cabin */}
            <mesh position={[0.1, 0.7, 0]} castShadow>
                <boxGeometry args={[0.9, 0.4, 0.7]} />
                <meshStandardMaterial color="#455A64" metalness={0.5} roughness={0.2} />
            </mesh>
            {/* Wheels */}
            {[[-0.5, 0.15, -0.4], [-0.5, 0.15, 0.4], [0.5, 0.15, -0.4], [0.5, 0.15, 0.4]].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.15, 0.15, 0.08, 12]} />
                    <meshStandardMaterial color="#212121" roughness={0.9} />
                </mesh>
            ))}
        </group>
    );
}

function TrafficLight({ position }: { position: [number, number, number] }) {
    return (
        <group position={position}>
            <mesh position={[0, 1.5, 0]} castShadow>
                <cylinderGeometry args={[0.04, 0.04, 3, 8]} />
                <meshStandardMaterial color="#37474F" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[0, 2.8, 0]} castShadow>
                <boxGeometry args={[0.25, 0.7, 0.15]} />
                <meshStandardMaterial color="#212121" roughness={0.8} />
            </mesh>
            {/* Red */}
            <mesh position={[0, 3.0, 0.08]}>
                <sphereGeometry args={[0.07, 8, 8]} />
                <meshStandardMaterial color="#F44336" emissive="#F44336" emissiveIntensity={0.8} />
            </mesh>
            {/* Yellow */}
            <mesh position={[0, 2.8, 0.08]}>
                <sphereGeometry args={[0.07, 8, 8]} />
                <meshStandardMaterial color="#FFC107" emissive="#FFC107" emissiveIntensity={0.3} />
            </mesh>
            {/* Green */}
            <mesh position={[0, 2.6, 0.08]}>
                <sphereGeometry args={[0.07, 8, 8]} />
                <meshStandardMaterial color="#4CAF50" emissive="#4CAF50" emissiveIntensity={0.1} />
            </mesh>
        </group>
    );
}

// --- Main Town House Map ---

export default function TownHouseMap() {
    return (
        <group>
            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[50, 50]} />
                <meshStandardMaterial color="#4a5d4a" roughness={0.95} />
            </mesh>

            {/* Main Roads - cross intersection */}
            <Road start={[-20, 0, 0]} end={[20, 0, 0]} />
            <Road start={[0, 0, -20]} end={[0, 0, 20]} />

            {/* Intersection patch */}
            <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[3, 3]} />
                <meshStandardMaterial color="#37474F" roughness={0.95} />
            </mesh>

            {/* Buildings - NE quadrant */}
            <Building position={[5, 0, -5]} width={3} height={5} depth={3} color="#78909C" />
            <Building position={[10, 0, -5]} width={2.5} height={7} depth={2.5} color="#546E7A" />
            <Building position={[5, 0, -10]} width={4} height={3.5} depth={3} color="#8D6E63" />

            {/* Buildings - NW quadrant */}
            <Building position={[-5, 0, -5]} width={3.5} height={6} depth={3} color="#5D4037" rotation={0.1} />
            <Building position={[-10, 0, -5]} width={2.5} height={4} depth={3} color="#795548" />
            <Building position={[-5, 0, -10]} width={3} height={8} depth={2.5} color="#607D8B" />

            {/* Buildings - SE quadrant */}
            <Building position={[5, 0, 5]} width={3} height={4.5} depth={2.5} color="#6D4C41" rotation={-0.1} />
            <Building position={[10, 0, 6]} width={4} height={3} depth={3.5} color="#8D6E63" />

            {/* Buildings - SW quadrant */}
            <Building position={[-6, 0, 5]} width={3} height={5.5} depth={3} color="#455A64" />
            <Building position={[-10, 0, 7]} width={2.5} height={4} depth={2.5} color="#546E7A" />

            {/* Lampposts along roads */}
            <Lamppost position={[3, 0, 2]} />
            <Lamppost position={[8, 0, 2]} />
            <Lamppost position={[-3, 0, 2]} />
            <Lamppost position={[-8, 0, 2]} />
            <Lamppost position={[2, 0, 5]} />
            <Lamppost position={[2, 0, -5]} />

            {/* Traffic lights at intersection */}
            <TrafficLight position={[2, 0, -2]} />
            <TrafficLight position={[-2, 0, 2]} />

            {/* Parked cars */}
            <Car position={[4, 0, 1.8]} color="#D32F2F" rotation={Math.PI / 2} />
            <Car position={[7, 0, 1.8]} color="#1565C0" rotation={Math.PI / 2} />
            <Car position={[-5, 0, -1.8]} color="#2E7D32" rotation={-Math.PI / 2} />
            <Car position={[-9, 0, 1.8]} color="#F57F17" rotation={Math.PI / 2} />

            {/* Park benches */}
            <ParkBench position={[3, 0, 8]} rotation={0.2} />
            <ParkBench position={[-4, 0, 10]} rotation={-0.3} />

            {/* Small park area */}
            <mesh position={[-8, 0.02, 12]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[6, 4]} />
                <meshStandardMaterial color="#4CAF50" roughness={0.95} />
            </mesh>
        </group>
    );
}
