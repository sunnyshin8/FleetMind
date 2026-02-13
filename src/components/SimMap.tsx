"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import Robot, { RobotType } from "./Robot";
import WarehouseMap from "./maps/WarehouseMap";
import VillageMap from "./maps/VillageMap";
import TownHouseMap from "./maps/TownHouseMap";
import MountainsMap from "./maps/MountainsMap";

export type MapType = "warehouse" | "village" | "townhouse" | "mountains";

interface RobotState {
    id: string;
    position: [number, number, number];
    color: string;
    battery?: number;
    robotType?: RobotType;
}

interface SimMapProps {
    robots: RobotState[];
    mapType: MapType;
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
        fogNear: 25,
        fogFar: 45,
        ambientIntensity: 0.4,
        ambientColor: "#c0cfe0",
        sunColor: "#ffffff",
        sunIntensity: 0.5,
        sunPosition: [0, 10, 0],
    },
    village: {
        bgColor: "#87CEEB",
        fogColor: "#87CEEB",
        fogNear: 25,
        fogFar: 50,
        ambientIntensity: 0.7,
        ambientColor: "#FFF8E1",
        sunColor: "#FFF176",
        sunIntensity: 1.2,
        sunPosition: [-10, 15, 8],
    },
    townhouse: {
        bgColor: "#1a1a2e",
        fogColor: "#1a1a2e",
        fogNear: 20,
        fogFar: 45,
        ambientIntensity: 0.3,
        ambientColor: "#8090b0",
        sunColor: "#e0d0c0",
        sunIntensity: 0.4,
        sunPosition: [-5, 8, 5],
    },
    mountains: {
        bgColor: "#B3E5FC",
        fogColor: "#B3D4E8",
        fogNear: 20,
        fogFar: 55,
        ambientIntensity: 0.6,
        ambientColor: "#E3F2FD",
        sunColor: "#FFECB3",
        sunIntensity: 1.5,
        sunPosition: [-12, 20, 10],
    },
};

function SceneContent({ robots, mapType }: { robots: RobotState[]; mapType: MapType }) {
    const config = MAP_CONFIG[mapType];

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
                maxDistance={35}
            />

            {/* Base grid — always visible for robot tracking */}
            <Grid
                args={[30, 30]}
                cellSize={2}
                cellThickness={0.3}
                cellColor={mapType === "village" || mapType === "mountains" ? "#55885530" : "#47556930"}
                sectionSize={10}
                sectionThickness={0.5}
                sectionColor={mapType === "village" || mapType === "mountains" ? "#77aa7740" : "#94a3b840"}
                fadeDistance={30}
                position={[0, 0.005, 0]}
                infiniteGrid
            />

            {/* Map environment */}
            {mapType === "warehouse" && <WarehouseMap />}
            {mapType === "village" && <VillageMap />}
            {mapType === "townhouse" && <TownHouseMap />}
            {mapType === "mountains" && <MountainsMap />}

            {/* Robot Agents — always on top of map */}
            {robots.map((robot) => (
                <Robot key={robot.id} id={robot.id} position={robot.position} color={robot.color} battery={robot.battery} robotType={robot.robotType} />
            ))}
        </>
    );
}

export default function SimMap({ robots, mapType }: SimMapProps) {
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
                    <SceneContent robots={robots} mapType={mapType} />
                </Suspense>
            </Canvas>
        </div>
    );
}
