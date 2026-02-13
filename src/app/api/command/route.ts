import { NextResponse } from "next/server";
import { processCommandLangGraph } from "@/lib/langgraph";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { command } = body;

        if (!command || typeof command !== "string") {
            return NextResponse.json(
                { action: "error", message: "No command provided." },
                { status: 400 }
            );
        }

        const result = await processCommandLangGraph(command);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Command processing error:", error);
        return NextResponse.json(
            { action: "error", message: "Failed to process command." },
            { status: 500 }
        );
    }
}
