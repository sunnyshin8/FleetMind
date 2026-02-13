import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const room = searchParams.get("room") || "default";
        const key = `fleet_state:${room}`;

        const data = await redis.get(key);
        if (data) {
            return NextResponse.json(JSON.parse(data)); // Returns { robots: [...] }
        }
        return NextResponse.json({ robots: [] });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch state" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { room = "default", updates } = body; // updates: Robot[] (partial list)
        const key = `fleet_state:${room}`;

        // Get current state
        const currentData = await redis.get(key);
        let currentRobots = currentData ? JSON.parse(currentData).robots : [];

        // Merge updates
        if (Array.isArray(updates)) {
            updates.forEach((updatedRobot: any) => {
                const idx = currentRobots.findIndex((r: any) => r.id === updatedRobot.id);
                if (idx >= 0) {
                    currentRobots[idx] = { ...currentRobots[idx], ...updatedRobot };
                } else {
                    currentRobots.push(updatedRobot);
                }
            });
        }

        // Save back
        await redis.set(key, JSON.stringify({ robots: currentRobots, timestamp: Date.now() }));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to save state" }, { status: 500 });
    }
}
