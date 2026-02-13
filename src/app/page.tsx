"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Send, Map as MapIcon, Terminal, Activity, Mic, ChevronDown, Bot } from "lucide-react";
import { QLearningAgent } from "@/lib/q-learning";
import { RobotType, ROBOT_CATALOG } from "@/components/Robot";
import { cleanVoiceCommand } from "@/lib/nlp";
import type { MapType } from "@/components/SimMap";

// Dynamic import — Three.js Canvas cannot render during SSR
const SimMap = dynamic(() => import("@/components/SimMap"), { ssr: false });

const MAP_OPTIONS: { value: MapType; label: string; icon: string }[] = [
    { value: "warehouse", label: "WAREHOUSE", icon: "🏭" },
    { value: "village", label: "VILLAGE", icon: "🏡" },
    { value: "townhouse", label: "TOWN HOUSE", icon: "🏘️" },
    { value: "mountains", label: "MOUNTAINS", icon: "🏔️" },
];



interface Message {
    role: "user" | "bot";
    text: string;
}

export interface RobotState {
    id: string;
    position: [number, number, number];
    color: string;
    battery: number;
    robotType: RobotType;
}

// Map boundary for wrapping — robots wrap around when they cross this threshold
const MAP_BOUNDARY = 14;
const MOVE_STEP = 0.8;
const SPRINT_MULTIPLIER = 2.2;
const COLLECTION_RADIUS = 2.0;
const CHARGE_RADIUS = 2.5;
const CHARGING_STATION: [number, number, number] = [10, 0, 10];

interface Orb {
    id: string;
    position: [number, number, number];
    type: 'energy' | 'speed' | 'repair';
    value: number;
}

function spawnOrb(): Orb {
    const types: Orb['type'][] = ['energy', 'speed', 'repair'];
    const type = types[Math.floor(Math.random() * types.length)];
    return {
        id: `orb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        position: [
            (Math.random() - 0.5) * MAP_BOUNDARY * 1.6,
            0,
            (Math.random() - 0.5) * MAP_BOUNDARY * 1.6,
        ],
        type,
        value: type === 'energy' ? 25 : type === 'speed' ? 10 : 15,
    };
}

// Synthesized collect sound — ascending chime using Web Audio API
function playCollectSound(combo: number = 1) {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = ctx.currentTime;

        // Base pitch rises with combo
        const baseFreq = 520 + combo * 80;

        // Note 1 — short ping
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(baseFreq, now);
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc1.connect(gain1).connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.15);

        // Note 2 — higher follow-up
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(baseFreq * 1.5, now + 0.08);
        gain2.gain.setValueAtTime(0.14, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc2.connect(gain2).connect(ctx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.25);

        // Cleanup
        setTimeout(() => ctx.close(), 300);
    } catch (_) { /* audio not supported */ }
}

// No wrapping — infinite map, camera follows the robot
function wrapPosition(pos: [number, number, number]): [number, number, number] {
    return pos;
}

export default function Home() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: "bot", text: "FleetMind initialized. Waiting for commands..." },
    ]);
    const [robots, setRobots] = useState<RobotState[]>([
        { id: "A", position: [0, 0, 0], color: "hotpink", battery: 100, robotType: "ironhog" },
        { id: "B", position: [-5, 0, 5], color: "cyan", battery: 100, robotType: "titan" }
    ]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [liveMode, setLiveMode] = useState(false);
    const [currentMap, setCurrentMap] = useState<MapType>("warehouse");
    const [selectedRobotId, setSelectedRobotId] = useState<string>("A");
    const [showRules, setShowRules] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [roomCode, setRoomCode] = useState<string>('');
    const [linkCopied, setLinkCopied] = useState(false);
    const [score, setScore] = useState(0);
    const [orbs, setOrbs] = useState<Orb[]>(() => Array.from({ length: 5 }, spawnOrb));
    const [sprinting, setSprinting] = useState(false);
    const [comboTimer, setComboTimer] = useState(0);
    const [comboMultiplier, setComboMultiplier] = useState(1);

    // Read room code from URL on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const room = params.get('room');
        if (room) {
            setRoomCode(room.toUpperCase());
            setMessages(prev => [...prev, { role: 'bot', text: `🔗 Joined room ${room.toUpperCase()}! You're connected.` }]);
        }
    }, []);

    const generateInviteLink = () => {
        const code = roomCode || Math.random().toString(36).substring(2, 8).toUpperCase();
        setRoomCode(code);
        setLinkCopied(false);
        setShowInvite(true);
    };

    const copyInviteLink = () => {
        const url = `${window.location.origin}?room=${roomCode}`;
        navigator.clipboard.writeText(url).then(() => {
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 3000);
        });
    };

    const [trainingMode, setTrainingMode] = useState(false);
    const agentRef = useRef(new QLearningAgent());
    const trainingIter = useRef(0);

    // Q-Learning Training Loop
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (trainingMode) {
            interval = setInterval(() => {
                trainingIter.current += 1;
                setRobots(prev => prev.map(r => {
                    if (r.id !== "A") return r; // Only train Robot A

                    // 1. Current State
                    const state = agentRef.current.getStateKey(r.battery, r.position, [10, 0, 10]); // Charger at 10,0,10

                    // 2. Choose Action
                    const action = agentRef.current.chooseAction(state);

                    // 3. Execute Action
                    let newPos = [...r.position] as [number, number, number];
                    let newBattery = r.battery;
                    let reward = 1; // Survival reward

                    if (action === "WANDER") {
                        newPos[0] += (Math.random() - 0.5) * 5;
                        newPos[2] += (Math.random() - 0.5) * 5;
                        newBattery -= 5;
                    } else if (action === "GO_CHARGE") {
                        // Move towards charger [10, 0, 10]
                        newPos[0] += (10 - newPos[0]) * 0.2;
                        newPos[2] += (10 - newPos[2]) * 0.2;
                        newBattery -= 2;
                    }

                    // 4. Check Outcome
                    const distToCharger = Math.sqrt(Math.pow(newPos[0] - 10, 2) + Math.pow(newPos[2] - 10, 2));
                    let reset = false;

                    if (distToCharger < 2) {
                        reward = 100;
                        newBattery = 100;
                        setMessages(prev => [...prev.slice(-4), { role: "bot", text: `Ep ${trainingIter.current}: CHARGED! (+100)` }]);
                        // Teleport away to keep training
                        newPos = [0, 0, 0];
                    } else if (newBattery <= 0) {
                        reward = -100;
                        newBattery = 100;
                        reset = true;
                        setMessages(prev => [...prev.slice(-4), { role: "bot", text: `Ep ${trainingIter.current}: DIED. (-100)` }]);
                        newPos = [0, 0, 0];
                    }

                    // 5. Learn
                    const nextState = agentRef.current.getStateKey(newBattery, newPos, [10, 0, 10]);
                    agentRef.current.learn(state, action, reward, nextState);


                    return { ...r, position: newPos, battery: newBattery };
                }));
            }, 50); // Fast forward
        }
        return () => clearInterval(interval);
    }, [trainingMode]);

    // Orb Spawning — new orbs appear every 3 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setOrbs(prev => {
                if (prev.length >= 12) return prev; // Max 12 orbs on map
                return [...prev, spawnOrb()];
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Combo timer decay
    useEffect(() => {
        if (comboTimer > 0) {
            const t = setTimeout(() => {
                setComboTimer(prev => prev - 1);
                if (comboTimer <= 1) setComboMultiplier(1);
            }, 1000);
            return () => clearTimeout(t);
        }
    }, [comboTimer]);

    // Orb Collection + Charging Station proximity check
    useEffect(() => {
        if (trainingMode) return;
        const interval = setInterval(() => {
            setRobots(prevRobots => {
                let collected = false;
                let scoreGain = 0;
                const newRobots = prevRobots.map(r => {
                    // Charging station check
                    const distToStation = Math.sqrt(
                        Math.pow(r.position[0] - CHARGING_STATION[0], 2) +
                        Math.pow(r.position[2] - CHARGING_STATION[2], 2)
                    );
                    let newBattery = r.battery;
                    if (distToStation < CHARGE_RADIUS && r.battery < 100) {
                        newBattery = Math.min(100, r.battery + 2); // Recharge 2% per tick
                    }
                    return { ...r, battery: newBattery };
                });

                // Check orb collection
                setOrbs(prevOrbs => {
                    const remaining = prevOrbs.filter(orb => {
                        const isCollected = newRobots.some(r => {
                            const dist = Math.sqrt(
                                Math.pow(r.position[0] - orb.position[0], 2) +
                                Math.pow(r.position[2] - orb.position[2], 2)
                            );
                            return dist < COLLECTION_RADIUS;
                        });
                        if (isCollected) {
                            collected = true;
                            scoreGain += orb.value;
                        }
                        return !isCollected;
                    });
                    return remaining;
                });

                if (collected) {
                    playCollectSound(comboMultiplier);
                    setComboMultiplier(prev => Math.min(prev + 1, 5));
                    setComboTimer(4);
                    setScore(prev => prev + scoreGain * comboMultiplier);
                    setMessages(prev => [...prev.slice(-6), {
                        role: "bot",
                        text: `⚡ +${scoreGain * comboMultiplier} points! (x${comboMultiplier} combo)`
                    }]);
                }

                return newRobots;
            });
        }, 200);
        return () => clearInterval(interval);
    }, [trainingMode, comboMultiplier]);

    // --- Multiplayer Sync Helper ---
    const lastSyncTime = useRef(0);
    const syncMyRobot = useCallback((robot: RobotState) => {
        if (!roomCode || trainingMode) return;
        const now = Date.now();
        if (now - lastSyncTime.current > 100) { // Max 10 syncs/sec
            lastSyncTime.current = now;
            fetch('/api/fleet', {
                method: 'POST',
                body: JSON.stringify({ room: roomCode, updates: [robot] })
            }).catch(e => console.error(e));
        }
    }, [roomCode, trainingMode]);

    // Keyboard Controls: WASD / Arrow Keys to move selected robot
    const handleKeyboardMove = useCallback((e: KeyboardEvent) => {
        // Don't move if user is typing in the input field
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        if (trainingMode) return;

        // Number keys to select robots
        if (e.key === '1') { setSelectedRobotId('A'); return; }
        if (e.key === '2') { setSelectedRobotId('B'); return; }

        const isSprinting = e.shiftKey;
        const step = isSprinting ? MOVE_STEP * SPRINT_MULTIPLIER : MOVE_STEP;
        const batteryDrain = isSprinting ? 0.8 : 0.3;

        let dx = 0, dz = 0;
        switch (e.key) {
            case 'w': case 'W': case 'ArrowUp': dz = -step; break;
            case 's': case 'S': case 'ArrowDown': dz = step; break;
            case 'a': case 'A': case 'ArrowLeft': dx = -step; break;
            case 'd': case 'D': case 'ArrowRight': dx = step; break;
            case 'Tab':
                e.preventDefault();
                setRobots(prev => {
                    const currentIdx = prev.findIndex(r => r.id === selectedRobotId);
                    const nextIdx = (currentIdx + 1) % prev.length;
                    setSelectedRobotId(prev[nextIdx].id);
                    return prev;
                });
                return;
            default: return;
        }
        e.preventDefault();

        setRobots(prev => prev.map(r => {
            if (r.id !== selectedRobotId) return r;
            if (r.battery <= 0) return r; // Dead robots can't move!
            const newPos: [number, number, number] = [
                r.position[0] + dx,
                r.position[1],
                r.position[2] + dz
            ];
            const updatedRobot = {
                ...r,
                battery: Math.max(0, r.battery - batteryDrain)
            };
            // Sync my movement
            syncMyRobot(updatedRobot);
            return updatedRobot;
        }));
    }, [selectedRobotId, trainingMode, roomCode, syncMyRobot]);

    // Sprint key tracking
    useEffect(() => {
        const down = (e: KeyboardEvent) => { if (e.key === 'Shift') setSprinting(true); };
        const up = (e: KeyboardEvent) => { if (e.key === 'Shift') setSprinting(false); };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyboardMove);
        return () => window.removeEventListener('keydown', handleKeyboardMove);
    }, [handleKeyboardMove]);

    // Mock Telemetry Data Stream
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (liveMode && !trainingMode) { // Disable live mode if training
            interval = setInterval(() => {
                setRobots(prev => prev.map(r => {
                    const newPos: [number, number, number] = [
                        r.position[0] + (Math.random() - 0.5) * 0.5,
                        r.position[1],
                        r.position[2] + (Math.random() - 0.5) * 0.5
                    ];
                    return {
                        ...r,
                        position: wrapPosition(newPos),
                        battery: Math.max(0, r.battery - 0.1)
                    };
                }));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [liveMode, trainingMode]);

    // Redis State Sync — Multiplayer Polling
    useEffect(() => {
        if (!roomCode || trainingMode) return;

        // Load initial state immediately on join
        const fetchState = async () => {
            try {
                const res = await fetch(`/api/fleet?room=${roomCode}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.robots && Array.isArray(data.robots)) {
                        setRobots(prev => {
                            const newRobots = [...prev];
                            data.robots.forEach((remoteRobot: RobotState) => {
                                // Only update robots we are NOT controlling
                                if (remoteRobot.id !== selectedRobotId) {
                                    const idx = newRobots.findIndex(r => r.id === remoteRobot.id);
                                    if (idx >= 0) {
                                        newRobots[idx] = { ...newRobots[idx], ...remoteRobot };
                                    } else {
                                        newRobots.push(remoteRobot);
                                    }
                                }
                            });
                            return newRobots;
                        });
                    }
                }
            } catch (e) {
                console.error("Sync error", e);
            }
        };

        fetchState();
        const interval = setInterval(fetchState, 500); // Poll every 500ms
        return () => clearInterval(interval);
    }, [roomCode, trainingMode, selectedRobotId]);

    const startListening = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                const cleaned = cleanVoiceCommand(transcript);
                setInput(cleaned);
            };

            recognition.start();
        } else {
            alert("Voice control not supported in this browser.");
        }
    };

    const handleCommand = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { role: "user", text: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsProcessing(true);

        try {
            // Call the server-side API route (LangGraph runs server-side only)
            const res = await fetch("/api/command", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command: input }),
            });
            const response = await res.json();

            if (response.action === "error" || !response.missions || !Array.isArray(response.missions)) {
                setMessages(prev => [...prev, { role: "bot", text: response.message || "Unknown error." }]);
            } else {
                // Process each mission in the list
                response.missions.forEach((mission: any) => {
                    setMessages(prev => [...prev, { role: "bot", text: typeof mission.message === 'string' ? mission.message : "Executing mission..." }]);

                    if (mission.action === "move" || mission.action === "inspect" || mission.action === "patrol") {
                        if (mission.coordinates) {
                            setRobots(prevRobots => {
                                const targetRobot = prevRobots.find(r => r.id === mission.robotId);
                                if (!targetRobot) return prevRobots;

                                // 1. Battery Check
                                if (targetRobot.battery < 10) {
                                    setMessages(prev => [...prev, { role: "bot", text: `ALERT: Robot ${targetRobot.id} battery critical (${targetRobot.battery.toFixed(1)}%). Cannot execute.` }]);
                                    return prevRobots;
                                }

                                // 2. Collision Check (Simple Distance)
                                const collision = prevRobots.some(r =>
                                    r.id !== mission.robotId &&
                                    Math.sqrt(
                                        Math.pow(r.position[0] - mission.coordinates[0], 2) +
                                        Math.pow(r.position[2] - mission.coordinates[2], 2)
                                    ) < 2.0 // 2 units safety distance
                                );

                                if (collision) {
                                    setMessages(prev => [...prev, { role: "bot", text: `ALERT: Collision path detected for Robot ${targetRobot.id}. Aborting.` }]);
                                    return prevRobots;
                                }

                                return prevRobots.map(r => {
                                    if (r.id === mission.robotId) {
                                        return {
                                            ...r,
                                            position: mission.coordinates,
                                            battery: r.battery - 5 // Drain battery on move
                                        };
                                    }
                                    return r;
                                });
                            });
                        }
                    }
                });
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: "bot", text: "Failed to connect to FleetMind Core." }]);
        }
        setIsProcessing(false);
    };

    return (
        <>
            <main className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
                {/* LEFT PANEL: Apple Liquid Glass Command Center */}
                <div
                    className="w-1/3 flex flex-col relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(145deg, #0c1445 0%, #1a1040 25%, #0d2137 50%, #141233 75%, #0a1628 100%)',
                    }}
                >
                    {/* Vivid Liquid Glass Background Layer */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'radial-gradient(ellipse at 30% 20%, rgba(56,152,236,0.25) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.2) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.08) 0%, transparent 70%)',
                            animation: 'glass-glow 6s ease-in-out infinite',
                        }}
                    />
                    {/* Glass refraction highlight */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, rgba(255,255,255,0.03) 60%, transparent 100%)',
                        }}
                    />

                    {/* Header */}
                    <div
                        className="p-5 flex items-center space-x-3 relative z-10"
                        style={{
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        <div
                            className="p-2.5 rounded-2xl"
                            style={{
                                background: 'linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(139,92,246,0.2) 100%)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                boxShadow: '0 0 20px rgba(59,130,246,0.2), inset 0 0 0 1px rgba(255,255,255,0.1)',
                            }}
                        >
                            <Terminal className="w-5 h-5 text-blue-300" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight" style={{ color: 'rgba(255,255,255,0.95)' }}>FleetMind</h1>
                            <p className="text-[10px] font-mono" style={{ color: 'rgba(148,180,220,0.7)' }}>COMMAND CENTER</p>
                        </div>
                        <button
                            onClick={() => setLiveMode(!liveMode)}
                            className={`ml-auto px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider transition-all ${liveMode ? 'animate-pulse' : ''}`}
                            style={liveMode ? {
                                background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))',
                                border: '1px solid rgba(239,68,68,0.4)',
                                boxShadow: '0 0 20px rgba(239,68,68,0.2)',
                                color: '#f87171',
                            } : {
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(200,210,230,0.8)',
                            }}
                        >
                            {liveMode ? "● LIVE" : "SIM"}
                        </button>
                        <button
                            onClick={() => setTrainingMode(!trainingMode)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider transition-all ${trainingMode ? 'animate-pulse' : ''}`}
                            style={trainingMode ? {
                                background: 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(52,211,153,0.1))',
                                border: '1px solid rgba(52,211,153,0.4)',
                                boxShadow: '0 0 20px rgba(52,211,153,0.2)',
                                color: '#34d399',
                            } : {
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(200,210,230,0.8)',
                            }}
                        >
                            {trainingMode ? "● RL" : "TRAIN"}
                        </button>
                        <button
                            onClick={() => setShowRules(true)}
                            className="px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider transition-all"
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(200,210,230,0.8)',
                            }}
                        >
                            RULES
                        </button>
                        <button
                            onClick={generateInviteLink}
                            className="px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider transition-all"
                            style={{
                                background: roomCode
                                    ? 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(139,92,246,0.1))'
                                    : 'rgba(255,255,255,0.06)',
                                border: roomCode
                                    ? '1px solid rgba(168,85,247,0.4)'
                                    : '1px solid rgba(255,255,255,0.1)',
                                color: roomCode ? '#c084fc' : 'rgba(200,210,230,0.8)',
                                boxShadow: roomCode ? '0 0 12px rgba(168,85,247,0.15)' : 'none',
                            }}
                        >
                            {roomCode ? `🔗 ${roomCode}` : 'INVITE'}
                        </button>
                    </div>

                    {/* Fleet Status — Robot Cards with Images */}
                    <div className="relative z-10 p-4 pb-2">
                        <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'rgba(130,170,220,0.6)' }}>FLEET STATUS</p>
                        <div className="grid grid-cols-2 gap-2.5">
                            {robots.map((robot) => {
                                const catalog = ROBOT_CATALOG[robot.robotType] || ROBOT_CATALOG.ironhog;
                                return (
                                    <div
                                        key={robot.id}
                                        className="rounded-2xl p-3 relative overflow-hidden cursor-pointer transition-all"
                                        onClick={() => setSelectedRobotId(robot.id)}
                                        style={{
                                            background: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%)',
                                            border: selectedRobotId === robot.id
                                                ? '2px solid rgba(59,130,246,0.7)'
                                                : '1px solid rgba(255,255,255,0.12)',
                                            backdropFilter: 'blur(16px)',
                                            boxShadow: selectedRobotId === robot.id
                                                ? '0 0 20px rgba(59,130,246,0.3), 0 8px 32px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(59,130,246,0.15)'
                                                : '0 8px 32px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.06)',
                                            transform: selectedRobotId === robot.id ? 'scale(1.02)' : 'scale(1)',
                                        }}
                                    >
                                        {/* Glass refraction effect on card */}
                                        <div
                                            className="absolute inset-0 pointer-events-none rounded-2xl"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)',
                                            }}
                                        />
                                        <div className="flex items-center space-x-2.5 relative z-10">
                                            {/* Robot PNG Image */}
                                            <div
                                                className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
                                                style={{
                                                    background: 'linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    animation: 'float-pulse 3s ease-in-out infinite',
                                                }}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={`/robots/${robot.robotType}.png`}
                                                    alt={catalog.name}
                                                    className="w-full h-full object-cover"
                                                    style={{ imageRendering: 'auto' }}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-bold truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>
                                                    {catalog.name}
                                                </p>
                                                <p className="text-[9px] font-mono" style={{ color: 'rgba(130,170,220,0.6)' }}>
                                                    UNIT {robot.id}
                                                </p>
                                                {/* Battery Bar */}
                                                <div className="mt-1.5 w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${robot.battery}%`,
                                                            background: robot.battery < 20
                                                                ? 'linear-gradient(90deg, #ef4444, #f87171)'
                                                                : 'linear-gradient(90deg, #22c55e, #4ade80)',
                                                            boxShadow: robot.battery < 20
                                                                ? '0 0 8px rgba(239,68,68,0.4)'
                                                                : '0 0 8px rgba(34,197,94,0.3)',
                                                            animation: robot.battery < 20 ? 'battery-pulse 1s ease-in-out infinite' : 'none',
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-[8px] mt-0.5 font-mono" style={{ color: 'rgba(148,180,220,0.5)' }}>
                                                    {robot.battery.toFixed(0)}% • [{robot.position[0].toFixed(1)}, {robot.position[2].toFixed(1)}]
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Chat / Log area */}
                    <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-3 relative z-10">
                        <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: 'rgba(130,170,220,0.6)' }}>MISSION LOG</p>
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[85%] rounded-2xl p-3 px-4 text-[13px] ${msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"}`}
                                    style={msg.role === "user" ? {
                                        background: 'linear-gradient(135deg, rgba(59,130,246,0.5) 0%, rgba(99,102,241,0.4) 50%, rgba(139,92,246,0.35) 100%)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        boxShadow: '0 4px 20px rgba(59,130,246,0.25), inset 0 0 0 1px rgba(255,255,255,0.08)',
                                        backdropFilter: 'blur(16px)',
                                        color: 'rgba(255,255,255,0.95)',
                                    } : {
                                        background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,0.05)',
                                        backdropFilter: 'blur(12px)',
                                        color: 'rgba(220,230,245,0.9)',
                                    }}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="flex justify-start">
                                <div
                                    className="rounded-2xl p-3 px-4 flex items-center space-x-2"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(59,130,246,0.08) 100%)',
                                        border: '1px solid rgba(59,130,246,0.15)',
                                        backdropFilter: 'blur(8px)',
                                    }}
                                >
                                    <Activity className="w-4 h-4 text-blue-400 animate-spin" />
                                    <span className="text-xs" style={{ color: 'rgba(180,200,230,0.7)' }}>Processing...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div
                        className="p-4 relative z-10"
                        style={{
                            background: 'linear-gradient(0deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        <div className="relative flex items-center">
                            <button
                                onClick={startListening}
                                className={`mr-2 p-2.5 rounded-xl transition-all ${isListening ? 'animate-pulse' : ''}`}
                                style={isListening ? {
                                    background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))',
                                    border: '1px solid rgba(239,68,68,0.4)',
                                    boxShadow: '0 0 20px rgba(239,68,68,0.2)',
                                    color: '#fff',
                                } : {
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'rgba(150,170,200,0.7)',
                                }}
                            >
                                <Mic className="w-5 h-5" />
                            </button>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleCommand()}
                                placeholder="Enter mission parameters..."
                                className="w-full rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none"
                                style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.9)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)';
                                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12), 0 0 24px rgba(59,130,246,0.1)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            />
                            <button
                                onClick={handleCommand}
                                disabled={isProcessing}
                                className="absolute right-2 p-2 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(59,130,246,0.6) 0%, rgba(99,102,241,0.5) 100%)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    boxShadow: '0 4px 16px rgba(59,130,246,0.3), inset 0 0 0 1px rgba(255,255,255,0.08)',
                                    transition: 'all 0.25s ease',
                                }}
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[10px] mt-2 text-center" style={{ color: 'rgba(130,170,220,0.4)' }}>
                            System Status: <span style={{ color: 'rgba(52,211,153,0.7)' }}>● ONLINE</span> • Latency: 12ms
                        </p>
                    </div>
                </div>

                {/* RIGHT PANEL: 3D SIM */}
                <div className="flex-1 relative bg-slate-950">
                    <div className="absolute top-4 right-4 z-10 flex items-center space-x-3">
                        {/* Robot Selector Dropdowns */}
                        {robots.map((robot) => (
                            <div key={robot.id} className="relative">
                                <select
                                    value={robot.robotType || "ironhog"}
                                    onChange={(e) => {
                                        setRobots(prev => prev.map(r =>
                                            r.id === robot.id ? { ...r, robotType: e.target.value as RobotType } : r
                                        ));
                                    }}
                                    className="appearance-none bg-slate-900/90 backdrop-blur-md text-slate-200 text-xs font-bold tracking-wider px-4 py-2.5 pr-8 rounded-lg border border-slate-600 hover:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer transition-all shadow-lg"
                                >
                                    {Object.entries(ROBOT_CATALOG).map(([key, val]) => (
                                        <option key={key} value={key}>
                                            {val.icon}  {val.name} ({robot.id})
                                        </option>
                                    ))}
                                </select>
                                <Bot className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400 pointer-events-none" />
                            </div>
                        ))}

                        {/* Map Selector Dropdown */}
                        <div className="relative">
                            <select
                                value={currentMap}
                                onChange={(e) => setCurrentMap(e.target.value as MapType)}
                                className="appearance-none bg-slate-900/90 backdrop-blur-md text-slate-200 text-xs font-bold tracking-wider px-4 py-2.5 pr-8 rounded-lg border border-slate-600 hover:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer transition-all shadow-lg"
                            >
                                {MAP_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.icon}  {opt.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="bg-slate-900/80 backdrop-blur p-2 px-3 rounded-lg border border-slate-700 text-xs text-slate-400 shadow-lg flex items-center space-x-2">
                            <MapIcon className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{MAP_OPTIONS.find(m => m.value === currentMap)?.label}_ZONE_A</span>
                        </div>
                    </div>
                    <div className="h-full w-full p-4 relative">
                        <SimMap robots={robots} mapType={currentMap} orbs={orbs} chargingStation={CHARGING_STATION} selectedRobotId={selectedRobotId} />

                        {/* Score + Controls HUD overlay */}
                        <div className="absolute top-8 left-8 z-20 flex flex-col gap-2 pointer-events-none select-none">
                            {/* Score */}
                            <div
                                className="px-4 py-2 rounded-xl"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5))',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                                }}
                            >
                                <p className="text-[9px] font-bold tracking-widest text-amber-400/80">SCORE</p>
                                <p className="text-2xl font-black text-white tabular-nums">{score.toLocaleString()}</p>
                                {comboMultiplier > 1 && (
                                    <p className="text-[10px] font-bold text-orange-400 animate-pulse">x{comboMultiplier} COMBO!</p>
                                )}
                            </div>

                            {/* Selected Robot */}
                            <div
                                className="px-3 py-2 rounded-xl"
                                style={{
                                    background: 'rgba(0,0,0,0.5)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(59,130,246,0.3)',
                                }}
                            >
                                <p className="text-[9px] font-bold tracking-widest text-blue-400/80">CONTROLLING</p>
                                <p className="text-sm font-bold text-white">
                                    {ROBOT_CATALOG[robots.find(r => r.id === selectedRobotId)?.robotType || 'ironhog']?.icon}{' '}
                                    {ROBOT_CATALOG[robots.find(r => r.id === selectedRobotId)?.robotType || 'ironhog']?.name}
                                    <span className="text-blue-400 ml-1">({selectedRobotId})</span>
                                </p>
                                {sprinting && <p className="text-[10px] font-bold text-yellow-400">⚡ SPRINT</p>}
                            </div>
                        </div>

                        {/* Controls hint — bottom right */}
                        <div
                            className="absolute bottom-8 right-8 z-20 px-3 py-2 rounded-xl pointer-events-none select-none"
                            style={{
                                background: 'rgba(0,0,0,0.5)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <div className="flex gap-3 text-[9px] font-mono text-slate-400">
                                <span><kbd className="px-1 py-0.5 bg-slate-700/80 rounded text-[8px]">WASD</kbd> Move</span>
                                <span><kbd className="px-1 py-0.5 bg-slate-700/80 rounded text-[8px]">Shift</kbd> Sprint</span>
                                <span><kbd className="px-1 py-0.5 bg-slate-700/80 rounded text-[8px]">1</kbd><kbd className="px-1 py-0.5 bg-slate-700/80 rounded text-[8px] ml-0.5">2</kbd> Select</span>
                                <span><kbd className="px-1 py-0.5 bg-slate-700/80 rounded text-[8px]">Tab</kbd> Cycle</span>
                            </div>
                        </div>

                        {/* Orb count indicator */}
                        <div
                            className="absolute top-8 right-8 z-20 px-3 py-2 rounded-xl pointer-events-none select-none"
                            style={{
                                background: 'rgba(0,0,0,0.5)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <p className="text-[9px] font-bold tracking-widest text-green-400/80">ORBS</p>
                            <p className="text-lg font-black text-white">✨ {orbs.length}</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Rules Modal Overlay */}
            {showRules && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
                    onClick={() => setShowRules(false)}
                >
                    <div
                        className="max-w-lg w-full mx-4 rounded-3xl p-6 relative"
                        style={{
                            background: 'linear-gradient(145deg, rgba(15,23,42,0.95) 0%, rgba(20,18,51,0.95) 100%)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)',
                            backdropFilter: 'blur(40px)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold mb-4" style={{ color: 'rgba(255,255,255,0.95)' }}>🎮 Controls & Rules</h2>

                        <div className="space-y-4 text-sm" style={{ color: 'rgba(200,215,240,0.85)' }}>
                            <div>
                                <h3 className="font-bold text-blue-300 mb-1">🕹️ Movement</h3>
                                <p><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs font-mono">W</kbd> <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs font-mono">A</kbd> <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs font-mono">S</kbd> <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs font-mono">D</kbd> or Arrow keys to move the selected robot</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-purple-300 mb-1">🔄 Switch Robot</h3>
                                <p><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs font-mono">Tab</kbd> to cycle between robots, or click a robot card in the Fleet Status panel</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-green-300 mb-1">🌍 Map Wrapping</h3>
                                <p>The world wraps around! If your robot goes past the edge, it reappears on the opposite side — like infinite terrain.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-amber-300 mb-1">🔋 Battery</h3>
                                <p>Moving drains battery. When it hits 0%, the robot stops. In SIM/LIVE mode, use voice commands to manage the fleet.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-red-300 mb-1">🧠 Q-Learning</h3>
                                <p>Toggle <strong>TRAIN</strong> mode to watch Robot A learn to navigate to the charging station using reinforcement learning.</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowRules(false)}
                            className="mt-5 w-full py-2.5 rounded-xl text-sm font-bold"
                            style={{
                                background: 'linear-gradient(135deg, rgba(59,130,246,0.5) 0%, rgba(99,102,241,0.4) 100%)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: 'rgba(255,255,255,0.95)',
                                boxShadow: '0 4px 16px rgba(59,130,246,0.25)',
                            }}
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {showInvite && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
                    onClick={() => setShowInvite(false)}
                >
                    <div
                        className="max-w-md w-full mx-4 rounded-3xl p-6 relative"
                        style={{
                            background: 'linear-gradient(145deg, rgba(15,23,42,0.95) 0%, rgba(30,15,60,0.95) 100%)',
                            border: '1px solid rgba(168,85,247,0.25)',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(168,85,247,0.1), inset 0 0 0 1px rgba(255,255,255,0.08)',
                            backdropFilter: 'blur(40px)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold mb-1" style={{ color: 'rgba(255,255,255,0.95)' }}>🔗 Invite Friends</h2>
                        <p className="text-xs mb-5" style={{ color: 'rgba(180,160,220,0.7)' }}>Share this link so friends can join your FleetMind session</p>

                        {/* Room Code Display */}
                        <div
                            className="text-center py-4 rounded-2xl mb-4"
                            style={{
                                background: 'rgba(168,85,247,0.08)',
                                border: '1px solid rgba(168,85,247,0.2)',
                            }}
                        >
                            <p className="text-[9px] font-bold tracking-[0.3em] text-purple-400/70 mb-1">ROOM CODE</p>
                            <p className="text-3xl font-black tracking-[0.2em] text-white font-mono">{roomCode}</p>
                        </div>

                        {/* Shareable Link */}
                        <div
                            className="flex items-center gap-2 p-3 rounded-xl mb-4"
                            style={{
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <input
                                type="text"
                                readOnly
                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}?room=${roomCode}`}
                                className="flex-1 bg-transparent text-xs text-slate-300 font-mono outline-none"
                            />
                            <button
                                onClick={copyInviteLink}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all"
                                style={{
                                    background: linkCopied
                                        ? 'linear-gradient(135deg, rgba(34,197,94,0.4), rgba(34,197,94,0.2))'
                                        : 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(139,92,246,0.3))',
                                    border: linkCopied
                                        ? '1px solid rgba(34,197,94,0.5)'
                                        : '1px solid rgba(168,85,247,0.4)',
                                    color: linkCopied ? '#4ade80' : '#c084fc',
                                }}
                            >
                                {linkCopied ? '✓ COPIED' : 'COPY'}
                            </button>
                        </div>

                        <div className="space-y-2 text-xs" style={{ color: 'rgba(200,215,240,0.6)' }}>
                            <p>📱 Send this link to a friend — they'll join your room instantly</p>
                            <p>🤖 Each player controls one robot in the fleet</p>
                            <p>⚡ Collect orbs together for higher combo scores!</p>
                        </div>

                        <button
                            onClick={() => setShowInvite(false)}
                            className="mt-5 w-full py-2.5 rounded-xl text-sm font-bold"
                            style={{
                                background: 'linear-gradient(135deg, rgba(168,85,247,0.4) 0%, rgba(139,92,246,0.3) 100%)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: 'rgba(255,255,255,0.95)',
                                boxShadow: '0 4px 16px rgba(168,85,247,0.2)',
                            }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
