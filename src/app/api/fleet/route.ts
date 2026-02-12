import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET() {
    try {
        const data = await redis.get("fleet_state");
        if (data) {
            return NextResponse.json(JSON.parse(data));
        }
        return NextResponse.json({ robots: [] });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch state" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { robots } = body;
        await redis.set("fleet_state", JSON.stringify(robots));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to save state" }, { status: 500 });
    }
}
