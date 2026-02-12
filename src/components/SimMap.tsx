"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import Robot from "./Robot";

interface RobotState {
    id: string;
    position: [number, number, number];
    color: string;
    battery?: number;
}

interface SimMapProps {
    robots: RobotState[];
}

export default function SimMap({ robots }: SimMapProps) {
    return (
        <div className="h-full w-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700">
            <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
                {/* Lights */}
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <directionalLight position={[-5, 5, 5]} intensity={0.5} shadow-mapSize={[1024, 1024]} castShadow />

                {/* Controls */}
                <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />

                {/* Environment - Warehouse Floor */}
                <Grid
                    args={[30, 30]}
                    cellSize={1}
                    cellThickness={0.5}
                    cellColor="#475569"
                    sectionSize={5}
                    sectionThickness={1}
                    sectionColor="#94a3b8"
                    fadeDistance={30}
                    infiniteGrid
                />

                {/* Robot Agents */}
                {robots.map((robot) => (
                    <Robot key={robot.id} position={robot.position} color={robot.color} battery={robot.battery} />
                ))}

                {/* Simple floor plane for shadows if needed, but Grid handles visuals well */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
                    <planeGeometry args={[50, 50]} />
                    <meshBasicMaterial color="#0f172a" transparent opacity={0.8} />
                </mesh>

                <Environment preset="city" />
            </Canvas>
        </div>
    );
}
