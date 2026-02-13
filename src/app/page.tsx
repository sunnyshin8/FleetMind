"use client";

import { useState, useEffect, useRef } from "react";
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

export default function Home() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: "bot", text: "FleetMind initialized. Waiting for commands..." },
    ]);
    const [robots, setRobots] = useState([
        { id: "A", position: [0, 0, 0] as [number, number, number], color: "hotpink", battery: 100, robotType: "ironhog" as RobotType },
        { id: "B", position: [-5, 0, 5] as [number, number, number], color: "cyan", battery: 100, robotType: "titan" as RobotType }
    ]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [liveMode, setLiveMode] = useState(false);
    const [currentMap, setCurrentMap] = useState<MapType>("warehouse");

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

    // Mock Telemetry Data Stream
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (liveMode && !trainingMode) { // Disable live mode if training
            interval = setInterval(() => {
                setRobots(prev => prev.map(r => ({
                    ...r,
                    position: [
                        r.position[0] + (Math.random() - 0.5) * 0.5,
                        r.position[1],
                        r.position[2] + (Math.random() - 0.5) * 0.5
                    ],
                    battery: Math.max(0, r.battery - 0.1)
                })));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [liveMode, trainingMode]);

    // Redis State Sync
    useEffect(() => {
        // Load initial state
        fetch("/api/fleet")
            .then(res => res.json())
            .then(data => {
                if (data.robots && data.robots.length > 0) {
                    setRobots(data.robots);
                    setMessages(prev => [...prev, { role: "bot", text: "Restored fleet state from Redis." }]);
                }
            })
            .catch(err => console.error("Failed to load state", err));
    }, []);

    // Save state on change (debounced ideally, but simple here)
    useEffect(() => {
        if (robots.length > 0) {
            const timeout = setTimeout(() => {
                fetch("/api/fleet", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ robots })
                }).catch(err => console.error("Failed to save state", err));
            }, 1000); // Save every 1s
            return () => clearTimeout(timeout);
        }
    }, [robots]);

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
        <main className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
            {/* LEFT PANEL: Command Center */}
            <div className="w-1/3 flex flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-md">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Terminal className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white">FleetMind</h1>
                        <p className="text-xs text-slate-400 font-mono">OPERATOR: ADMIN_01</p>
                    </div>
                    <button
                        onClick={() => setLiveMode(!liveMode)}
                        className={`ml-auto px-3 py-1 rounded text-xs font-bold transition-all ${liveMode ? "bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse" : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"}`}
                    >
                        {liveMode ? "LIVE: ON" : "SIM"}
                    </button>
                    <button
                        onClick={() => setTrainingMode(!trainingMode)}
                        className={`ml-2 px-3 py-1 rounded text-xs font-bold transition-all ${trainingMode ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 animate-pulse" : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"}`}
                    >
                        {trainingMode ? "TRAINING..." : "TRAIN RL"}
                    </button>
                </div>

                {/* Chat / Log area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] rounded-xl p-3 px-4 text-sm shadow-md ${msg.role === "user"
                                ? "bg-indigo-600 text-white rounded-br-none"
                                : "bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700"
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isProcessing && (
                        <div className="flex justify-start">
                            <div className="bg-slate-800/50 rounded-xl p-3 px-4 flex items-center space-x-2">
                                <Activity className="w-4 h-4 text-indigo-400 animate-spin" />
                                <span className="text-xs text-slate-400">Processing...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <div className="relative flex items-center">
                        <button
                            onClick={startListening}
                            className={`mr-2 p-2 rounded-lg transition-colors ${isListening ? "bg-red-500 animate-pulse text-white" : "text-slate-400 hover:text-white"}`}
                        >
                            <Mic className="w-5 h-5" />
                        </button>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCommand()}
                            placeholder="Enter mission parameters..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm shadow-inner"
                        />
                        <button
                            onClick={handleCommand}
                            disabled={isProcessing}
                            className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 text-center">
                        System Status: <span className="text-emerald-400">ONLINE</span> • Latency: 12ms
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
                <div className="h-full w-full p-4">
                    <SimMap robots={robots} mapType={currentMap} />
                </div>
            </div>
        </main>
    );
}
