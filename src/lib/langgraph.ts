import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { z } from "zod";

// 1. Define State using Annotation (modern API)
const AgentStateAnnotation = Annotation.Root({
    input: Annotation<string>(),
    missions: Annotation<any[] | undefined>(),
    error: Annotation<string | undefined>(),
});

type AgentState = typeof AgentStateAnnotation.State;

// 2. Define Model (lazy — only created when actually called)
const getModel = () => {
    return new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash",
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    });
};

// 3. Define Nodes

// Node: Planner (Generates JSON)
async function plannerNode(state: AgentState): Promise<Partial<AgentState>> {
    const systemPrompt = `
    You are FleetMind Commander.
    Translate the user command into a JSON object with a "missions" array.
    
    Warehouse Grid: 30x30, Center [0,0,0].
    
    Output JSON ONLY:
    {
      "missions": [
        { "robotId": "A", "action": "move"|"patrol", "coordinates": [x, 0, z], "message": "..." }
      ]
    }
    `;

    try {
        const result = await getModel().invoke([
            ["system", systemPrompt],
            ["human", state.input]
        ]);

        const text = result.content.toString();
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanText);

        return { missions: parsed.missions };
    } catch (e) {
        return { error: "Failed to parse mission plan." };
    }
}

// Node: Validator (Checks Plan Safety)
async function validatorNode(state: AgentState): Promise<Partial<AgentState>> {
    const missions = state.missions;
    if (!missions || missions.length === 0) {
        return { error: "No missions generated." };
    }

    // specific validation logic
    const validatedMissions = missions.map((m: any) => {
        // Clamp coordinates to grid [-15, 15]
        if (m.coordinates) {
            m.coordinates[0] = Math.max(-15, Math.min(15, m.coordinates[0]));
            m.coordinates[2] = Math.max(-15, Math.min(15, m.coordinates[2]));
        }
        return m;
    });

    return { missions: validatedMissions };
}

// 4. Define Graph
const workflow = new StateGraph(AgentStateAnnotation)
    .addNode("planner", plannerNode)
    .addNode("validator", validatorNode)
    .addEdge(START, "planner")
    .addEdge("planner", "validator")
    .addEdge("validator", END);

export const app = workflow.compile();

export async function processCommandLangGraph(input: string): Promise<{ action?: string, message?: string, missions?: any[] }> {
    const result = await app.invoke({ input }) as unknown as AgentState;
    if (result.error) {
        return { action: "error", message: result.error };
    }
    return { missions: result.missions || [] };
}
