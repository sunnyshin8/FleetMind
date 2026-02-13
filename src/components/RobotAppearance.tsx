"use client";

import { useEffect, useState } from "react";
import { Activity, Shield, Zap, RefreshCw, Cpu, Cross, Scan } from "lucide-react";

export type RobotType = "vanguard" | "titan" | "spectre" | "gearhead" | "medic" | "sentinel";

interface RobotAppearanceProps {
    type: RobotType;
    color: string;
    battery: number;
}

export default function RobotAppearance({ type, color, battery }: RobotAppearanceProps) {
    const [scanPos, setScanPos] = useState(0);

    // Simple animation loop for scanning effects if needed
    // Most animations are done via CSS/Tailwind

    // --- VANGUARD (Futuristic) ---
    if (type === "vanguard") {
        return (
            <div className="relative w-24 h-24 flex items-center justify-center">
                {/* Spinning Rings */}
                <div className="absolute inset-0 border-4 border-blue-400/30 rounded-full animate-[spin_3s_linear_infinite]" />
                <div className="absolute inset-2 border-2 border-blue-400/50 rounded-full animate-[spin_2s_linear_infinite_reverse]" />
                <div className="absolute inset-4 border border-blue-400/80 rounded-full animate-pulse" />

                {/* Core */}
                <div className="relative z-10 w-12 h-12 bg-white rounded-full shadow-[0_0_20px_rgba(59,130,246,0.8)] flex items-center justify-center border-2 border-blue-200">
                    <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse" />
                </div>

                {/* Floating Particles */}
                <div className="absolute top-0 left-1/2 w-1 h-1 bg-blue-300 rounded-full animate-ping" />
                <div className="absolute bottom-2 right-2 w-1 h-1 bg-blue-300 rounded-full animate-[ping_1.5s_infinite]" />
            </div>
        );
    }

    // --- TITAN (Industrial) ---
    if (type === "titan") {
        return (
            <div className="relative w-20 h-24 bg-slate-800 rounded-lg border-2 border-slate-600 flex flex-col items-center shadow-2xl overflow-hidden">
                {/* Warning Light */}
                <div className="w-full h-4 bg-slate-900 relative overflow-hidden flex justify-center">
                    <div className="w-8 h-4 bg-orange-500 blur-sm animate-[pulse_0.5s_infinite]" />
                </div>

                {/* Main Body */}
                <div className="flex-1 w-full bg-yellow-500 p-2 flex flex-col items-center justify-evenly relative">
                    {/* Hazard Stripes */}
                    <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,black,black_10px,transparent_10px,transparent_20px)]" />

                    {/* Face Plate */}
                    <div className="w-14 h-8 bg-slate-900 rounded border border-yellow-700 relative z-10 flex items-center justify-center">
                        <div className="w-10 h-2 bg-red-600 rounded-full shadow-[0_0_10px_red]" />
                    </div>

                    {/* Pistons */}
                    <div className="flex w-full justify-between px-1 z-10">
                        <div className="w-3 h-6 bg-slate-400 rounded-sm animate-[bounce_1s_infinite]" />
                        <div className="w-3 h-6 bg-slate-400 rounded-sm animate-[bounce_1s_infinite_100ms]" />
                        <div className="w-3 h-6 bg-slate-400 rounded-sm animate-[bounce_1s_infinite_200ms]" />
                    </div>
                </div>

                {/* Tracks */}
                <div className="w-full h-4 bg-slate-700 border-t border-slate-600 flex space-x-1 overflow-hidden">
                    <div className="w-full h-full animate-[slide_1s_linear_infinite] bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,#475569_4px,#475569_8px)]" />
                </div>
            </div>
        );
    }

    // --- SPECTRE (Cyberpunk) ---
    if (type === "spectre") {
        return (
            <div className="relative w-20 h-20">
                {/* Glitch Container */}
                <div className="absolute inset-0 bg-purple-900/40 backdrop-blur-sm border border-purple-500/50 clip-path-polygon-[10%_0,100%_0,100%_80%,90%_100%,0_100%,0_20%] shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                    {/* Neon Eyes */}
                    <div className="absolute top-4 left-3 right-3 h-1 bg-fuchsia-500 shadow-[0_0_10px_#d946ef] animate-[pulse_0.2s_infinite]" />
                    <div className="absolute top-6 left-5 right-5 h-[1px] bg-fuchsia-400 opacity-50" />

                    {/* Data Lines */}
                    <div className="absolute bottom-2 left-2 text-[6px] font-mono text-purple-300 leading-none opacity-70">
                        <div className="animate-pulse">SYS.OK</div>
                        <div>ENC_ON</div>
                    </div>

                    {/* Glitch Overlay */}
                    <div className="absolute inset-0 bg-transparent animate-[pulse_0.1s_ease-in-out_infinite] opacity-10 mix-blend-overlay bg-gradient-to-t from-transparent via-white to-transparent" />
                </div>
            </div>
        );
    }

    // --- GEARHEAD (Steampunk) ---
    if (type === "gearhead") {
        return (
            <div className="relative w-24 h-24 flex items-center justify-center">
                {/* Main Cog */}
                <div className="absolute w-20 h-20 border-8 border-dashed border-amber-700 rounded-full animate-[spin_6s_linear_infinite] bg-amber-600/20" />
                <div className="absolute w-16 h-16 border-4 border-dotted border-amber-600 rounded-full animate-[spin_4s_linear_infinite_reverse]" />

                {/* Body */}
                <div className="relative z-10 w-12 h-14 bg-gradient-to-b from-amber-700 to-amber-900 rounded-md border border-amber-400 flex flex-col items-center pt-2 shadow-xl">
                    {/* Eye */}
                    <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-amber-400 flex items-center justify-center">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_8px_#facc15]" />
                    </div>
                </div>

                {/* Steam Puff */}
                <div className="absolute -top-4 -right-2 w-4 h-4 bg-white rounded-full opacity-0 animate-[ping_2s_infinite]" />
                <div className="absolute -top-6 -right-1 w-3 h-3 bg-white rounded-full opacity-0 animate-[ping_2s_infinite_500ms]" />
            </div>
        );
    }

    // --- MEDIC (Medical) ---
    if (type === "medic") {
        return (
            <div className="relative w-20 h-20 flex items-center justify-center">
                {/* Cross Background Pulse */}
                <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />

                {/* Main Body */}
                <div className="relative z-10 w-16 h-16 bg-white rounded-xl shadow-lg border-2 border-red-100 flex items-center justify-center">
                    {/* Red Cross */}
                    <div className="relative w-10 h-10">
                        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-3 bg-red-500 rounded-sm" />
                        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-3 bg-red-500 rounded-sm" />
                    </div>
                </div>

                {/* Floating Hearts/Pluses */}
                <div className="absolute -top-2 -right-2 text-red-500 animate-[bounce_1.5s_infinite]">+</div>
                <div className="absolute -bottom-1 -left-2 text-red-500 text-xs animate-[bounce_2s_infinite]">+</div>
            </div>
        );
    }

    // --- SENTINEL (Security) ---
    if (type === "sentinel") {
        return (
            <div className="relative w-20 h-24 bg-slate-900 rounded-xl border-2 border-slate-700 flex flex-col items-center shadow-2xl overflow-hidden">
                {/* Siren Lights */}
                <div className="w-full flex">
                    <div className="flex-1 h-2 bg-red-600 animate-[pulse_0.4s_infinite]" />
                    <div className="flex-1 h-2 bg-blue-600 animate-[pulse_0.4s_infinite_200ms]" />
                </div>

                {/* Visor Area */}
                <div className="w-full h-8 bg-black mt-2 relative overflow-hidden">
                    {/* Cylon Eye */}
                    <div className="absolute top-1 bottom-1 w-8 bg-red-600 blur-md rounded-full animate-[slideX_1.5s_ease-in-out_infinite_alternate]"
                        style={{ left: '0%' }}
                    />
                    <div className="absolute top-3 w-4 h-1 bg-white opacity-80 rounded-full animate-[slideX_1.5s_ease-in-out_infinite_alternate]" />
                </div>

                {/* Shield Badge */}
                <div className="mt-2 text-slate-400">
                    <Shield size={24} strokeWidth={1.5} />
                </div>
            </div>
        );
    }

    return null;
}
