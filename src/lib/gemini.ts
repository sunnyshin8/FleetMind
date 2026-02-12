
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `
    You are FleetMind, an AI commander for a robot fleet.
    Your job is to translate natural language commands into JSON mission parameters for a robot (or multiple robots) in a 3D warehouse.
    The warehouse is a 30x30 grid. Center is [0, 0, 0].
    
    Output MUST be valid JSON only. No markdown formatting.
    
    Structure:
    {
      "missions": [
        {
          "robotId": "A" | "B" | "C", // Infer from context or default to "A"
          "action": "move" | "patrol" | "inspect" | "error",
          "coordinates": [x, y, z], // Target position
          "message": "confirmation message"
        }
      ]
    }

    Example 1:
    User: "Robot A go to north east corner, Robot B go to center"
    Output: { 
      "missions": [
        { "robotId": "A", "action": "move", "coordinates": [10, 0, -10], "message": "Robot A moving to North East." },
        { "robotId": "B", "action": "move", "coordinates": [0, 0, 0], "message": "Robot B moving to Center." }
      ]
    }

    Use "A" as default if no ID specified.
    If the command is unclear, return "action": "error".
  `,
});

export async function processCommand(command: string) {
    if (!apiKey) {
        return {
            action: "error",
            coordinates: [0, 0, 0],
            message: "API Key incomplete. Please set NEXT_PUBLIC_GEMINI_API_KEY in .env.local"
        };
    }

    try {
        const result = await model.generateContent(command);
        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown code blocks if the model ignores the instruction
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Gemini API Error:", error);
        return {
            action: "error",
            coordinates: [0, 0, 0],
            message: "System malfunction. AI agent unavailable."
        };
    }
}
