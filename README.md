# FleetMind: AI-Powered Robot Fleet Orchestration

Build a web-based "Mission Control" for operating robot fleets using natural language. Instead of writing code or manually steering robots, operators simply type commands like "Inspect the warehouse for obstacles" or "Patrol the perimeter."

## Tech Stack

-   **Frontend/Sim**: Next.js, Tailwind CSS, React Three Fiber (Visualizer).
-   **AI Logic**: Google Gemini 1.5 Pro (via API).
-   **Backend/State**: Next.js API Routes (Serverless).
-   **Infrastructure**: Vultr (Deployment).

## Setup

1.  Clone the repository.
2.  Run `npm install`.
3.  Create a `.env.local` file with `NEXT_PUBLIC_GEMINI_API_KEY=your_key_here`.
4.  Run `npm run dev` to start the development server.

## Features

-   **Natural Language Command**: Control robots with plain English.
-   **3D Digital Twin**: Visualize robot movements in a simulated warehouse environment.
-   **Mission Orchestration**: Convert high-level intents into precise coordinate-based missions.
