"use client";

import { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import Robot, { RobotType } from "./Robot";
import WarehouseMap from "./maps/WarehouseMap";
import VillageMap from "./maps/VillageMap";
import TownHouseMap from "./maps/TownHouseMap";
import MountainsMap from "./maps/MountainsMap";
import * as THREE from "three";

export type MapType = "warehouse" | "village" | "townhouse" | "mountains";

interface RobotState {
    id: string;
    position: [number, number, number];
    color: string;
    battery?: number;
    robotType?: RobotType;
}

interface OrbData {
    id: string;
    position: [number, number, number];
    type: 'energy' | 'speed' | 'repair';
    value: number;
}

interface SimMapProps {
    robots: RobotState[];
    mapType: MapType;
    orbs?: OrbData[];
    chargingStation?: [number, number, number];
    selectedRobotId?: string;
}

// Map-specific lighting and atmosphere configurations
const MAP_CONFIG: Record<MapType, {
    bgColor: string;
    fogColor: string;
    fogNear: number;
    fogFar: number;
    ambientIntensity: number;
    ambientColor: string;
    sunColor: string;
    sunIntensity: number;
    sunPosition: [number, number, number];
}> = {
    warehouse: {
        bgColor: "#0f172a",
        fogColor: "#0f172a",
        fogNear: 30,
        fogFar: 80,
        ambientIntensity: 0.4,
        ambientColor: "#c0cfe0",
        sunColor: "#ffffff",
        sunIntensity: 0.5,
        sunPosition: [0, 10, 0],
    },
    village: {
        bgColor: "#87CEEB",
        fogColor: "#87CEEB",
        fogNear: 30,
        fogFar: 85,
        ambientIntensity: 0.7,
        ambientColor: "#FFF8E1",
        sunColor: "#FFF176",
        sunIntensity: 1.2,
        sunPosition: [-10, 15, 8],
    },
    townhouse: {
        bgColor: "#1a1a2e",
        fogColor: "#1a1a2e",
        fogNear: 25,
        fogFar: 75,
        ambientIntensity: 0.3,
        ambientColor: "#8090b0",
        sunColor: "#e0d0c0",
        sunIntensity: 0.4,
        sunPosition: [-5, 8, 5],
    },
    mountains: {
        bgColor: "#B3E5FC",
        fogColor: "#B3D4E8",
        fogNear: 25,
        fogFar: 90,
        ambientIntensity: 0.6,
        ambientColor: "#E3F2FD",
        sunColor: "#FFECB3",
        sunIntensity: 1.5,
        sunPosition: [-12, 20, 10],
    },
};

const ORB_COLORS: Record<string, string> = {
    energy: "#facc15",
    speed: "#22d3ee",
    repair: "#34d399",
};

// --- Floating collectible orb ---
function CollectibleOrb({ position, type }: { position: [number, number, number]; type: string }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);
    const color = ORB_COLORS[type] || "#ffffff";

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (meshRef.current) {
            meshRef.current.position.y = 1.2 + Math.sin(t * 3 + position[0]) * 0.3;
            meshRef.current.rotation.y += 0.03;
            meshRef.current.rotation.x = Math.sin(t * 2) * 0.2;
        }
        if (glowRef.current) {
            glowRef.current.position.y = 1.2 + Math.sin(t * 3 + position[0]) * 0.3;
            const pulse = 0.4 + Math.sin(t * 4) * 0.15;
            glowRef.current.scale.setScalar(pulse);
        }
    });

    return (
        <group position={[position[0], 0, position[2]]}>
            {/* Outer glow */}
            <mesh ref={glowRef} position={[0, 1.2, 0]}>
                <sphereGeometry args={[0.8, 16, 16]} />
                <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
            </mesh>
            {/* Core orb */}
            <mesh ref={meshRef} position={[0, 1.2, 0]}>
                <octahedronGeometry args={[0.3, 0]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.8}
                    roughness={0.2}
                    metalness={0.6}
                />
            </mesh>
            {/* Ground ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <ringGeometry args={[0.3, 0.5, 24]} />
                <meshBasicMaterial color={color} transparent opacity={0.2} depthWrite={false} />
            </mesh>
        </group>
    );
}

// --- Charging Station ---
function ChargingStation({ position }: { position: [number, number, number] }) {
    const beamRef = useRef<THREE.Mesh>(null);
    const baseRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (beamRef.current) {
            beamRef.current.scale.y = 1 + Math.sin(t * 2) * 0.3;
            (beamRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(t * 3) * 0.08;
        }
        if (baseRef.current) {
            baseRef.current.rotation.y += 0.01;
        }
    });

    return (
        <group position={position}>
            {/* Base platform */}
            <mesh ref={baseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                <cylinderGeometry args={[1.5, 1.5, 0.1, 32]} />
                <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Inner ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
                <ringGeometry args={[0.8, 1.2, 32]} />
                <meshBasicMaterial color="#4ade80" transparent opacity={0.5} depthWrite={false} />
            </mesh>
            {/* Beam of light */}
            <mesh ref={beamRef} position={[0, 3, 0]}>
                <cylinderGeometry args={[0.2, 1, 6, 16, 1, true]} />
                <meshBasicMaterial color="#4ade80" transparent opacity={0.15} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            {/* Top glow */}
            <mesh position={[0, 6, 0]}>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshBasicMaterial color="#22c55e" transparent opacity={0.3} depthWrite={false} />
            </mesh>
            {/* Ground glow */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <circleGeometry args={[2, 32]} />
                <meshBasicMaterial color="#22c55e" transparent opacity={0.08} depthWrite={false} />
            </mesh>
        </group>
    );
}

// --- Selection indicator ring around selected robot ---
function SelectionRing({ position }: { position: [number, number, number] }) {
    const ringRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (ringRef.current) {
            ringRef.current.rotation.z = state.clock.elapsedTime * 1.5;
            const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 4) * 0.15;
            ringRef.current.scale.setScalar(pulse);
        }
    });

    return (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.06, position[2]]}>
            <ringGeometry args={[0.9, 1.1, 32]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} depthWrite={false} />
        </mesh>
    );
}

// --- Camera Tracker: smoothly follows the selected robot ---
function CameraTracker({ target }: { target: [number, number, number] }) {
    const { camera } = useThree();
    const offset = useRef(new THREE.Vector3(12, 10, 12));
    const targetVec = useRef(new THREE.Vector3(target[0], 0, target[2]));
    const initialized = useRef(false);

    useFrame(() => {
        const tx = target[0];
        const tz = target[2];
        const dest = new THREE.Vector3(tx, 0, tz);

        // Smoothly lerp the look-at target
        targetVec.current.lerp(dest, 0.045);

        if (!initialized.current) {
            targetVec.current.set(tx, 0, tz);
            camera.position.set(tx + offset.current.x, offset.current.y, tz + offset.current.z);
            initialized.current = true;
        }

        // Move camera to follow, keeping its relative offset
        const desiredPos = new THREE.Vector3(
            targetVec.current.x + offset.current.x,
            offset.current.y,
            targetVec.current.z + offset.current.z
        );
        camera.position.lerp(desiredPos, 0.045);
        camera.lookAt(targetVec.current);
    });

    return null;
}

function SceneContent({ robots, mapType, orbs, chargingStation, selectedRobotId }: {
    robots: RobotState[];
    mapType: MapType;
    orbs?: OrbData[];
    chargingStation?: [number, number, number];
    selectedRobotId?: string;
}) {
    const config = MAP_CONFIG[mapType];

    const selectedRobot = robots.find(r => r.id === selectedRobotId);

    return (
        <>
            {/* Scene-wide lighting */}
            <ambientLight intensity={config.ambientIntensity} color={config.ambientColor} />
            <directionalLight
                position={config.sunPosition}
                intensity={config.sunIntensity}
                color={config.sunColor}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-far={50}
                shadow-camera-left={-20}
                shadow-camera-right={20}
                shadow-camera-top={20}
                shadow-camera-bottom={-20}
            />
            <hemisphereLight args={["#b1e1ff", "#3a5f3a", 0.3]} />

            {/* Camera Controls */}
            <OrbitControls
                makeDefault
                minPolarAngle={0.2}
                maxPolarAngle={Math.PI / 2.1}
                enableDamping
                dampingFactor={0.05}
                minDistance={5}
                maxDistance={50}
            />

            {/* Camera auto-follows selected robot */}
            {selectedRobot && <CameraTracker target={selectedRobot.position} />}

            {/* Base grid — always visible for robot tracking */}
            <Grid
                args={[30, 30]}
                cellSize={2}
                cellThickness={0.3}
                cellColor={mapType === "village" || mapType === "mountains" ? "#558855" : "#475569"}
                sectionSize={10}
                sectionThickness={0.5}
                sectionColor={mapType === "village" || mapType === "mountains" ? "#77aa77" : "#94a3b8"}
                fadeDistance={50}
                position={[0, 0.005, 0]}
                infiniteGrid
            />

            {/* Map environment — 3x3 tiled grid for infinite looping */}
            {(() => {
                const TILE_SIZE = 28;
                // Compute which tile the selected robot is on
                const rx = selectedRobot ? selectedRobot.position[0] : 0;
                const rz = selectedRobot ? selectedRobot.position[2] : 0;
                const baseTileX = Math.round(rx / TILE_SIZE) * TILE_SIZE;
                const baseTileZ = Math.round(rz / TILE_SIZE) * TILE_SIZE;

                const tiles: [number, number, number][] = [];
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dz = -1; dz <= 1; dz++) {
                        tiles.push([baseTileX + dx * TILE_SIZE, 0, baseTileZ + dz * TILE_SIZE]);
                    }
                }

                const MapComponent = mapType === "warehouse" ? WarehouseMap
                    : mapType === "village" ? VillageMap
                        : mapType === "townhouse" ? TownHouseMap
                            : MountainsMap;

                return tiles.map((offset, i) => (
                    <MapComponent key={`tile-${i}-${offset[0]}-${offset[2]}`} tileOffset={offset} />
                ));
            })()}

            {/* Charging Station */}
            {chargingStation && <ChargingStation position={chargingStation} />}

            {/* Collectible Orbs */}
            {orbs?.map(orb => (
                <CollectibleOrb key={orb.id} position={orb.position} type={orb.type} />
            ))}

            {/* Selection Ring on selected robot */}
            {selectedRobot && <SelectionRing position={selectedRobot.position} />}

            {/* Robot Agents — always on top of map */}
            {robots.map((robot) => (
                <Robot key={robot.id} id={robot.id} position={robot.position} color={robot.color} battery={robot.battery} robotType={robot.robotType} />
            ))}
        </>
    );
}

export default function SimMap({ robots, mapType, orbs, chargingStation, selectedRobotId }: SimMapProps) {
    const config = MAP_CONFIG[mapType];

    return (
        <div className="h-full w-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700">
            <Canvas
                key={mapType}
                camera={{ position: [12, 10, 12], fov: 50 }}
                shadows
                gl={{
                    antialias: true,
                    alpha: false,
                    powerPreference: "default",
                    failIfMajorPerformanceCaveat: false,
                }}
                onCreated={({ gl }) => {
                    gl.setClearColor(config.bgColor);
                }}
                style={{ background: config.bgColor }}
                flat
            >
                <color attach="background" args={[config.bgColor]} />
                <fog attach="fog" args={[config.fogColor, config.fogNear, config.fogFar]} />
                <Suspense fallback={null}>
                    <SceneContent robots={robots} mapType={mapType} orbs={orbs} chargingStation={chargingStation} selectedRobotId={selectedRobotId} />
                </Suspense>
            </Canvas>
        </div>
    );
}
