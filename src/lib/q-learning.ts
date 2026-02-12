export class QLearningAgent {
    qTable: Map<string, number[]>;
    learningRate: number;
    discountFactor: number;
    epsilon: number;

    constructor() {
        this.qTable = new Map();
        this.learningRate = 0.1;
        this.discountFactor = 0.9;
        this.epsilon = 0.1; // Exploration rate
    }

    // State: "BatteryLevel_DistanceToCharger"
    // Battery: 0-10 (0-100%)
    // Distance: 0 (Close), 1 (Medium), 2 (Far)
    getStateKey(battery: number, position: [number, number, number], chargerPos: [number, number, number]): string {
        const dist = Math.sqrt(Math.pow(position[0] - chargerPos[0], 2) + Math.pow(position[2] - chargerPos[2], 2));

        const batLevel = Math.floor(battery / 10); // 0-10
        let distLevel = 2;
        if (dist < 2) distLevel = 0;
        else if (dist < 10) distLevel = 1;

        return `${batLevel}_${distLevel}`;
    }

    getActions(): string[] {
        return ["WANDER", "GO_CHARGE"];
    }

    // Epsilon-Greedy Policy
    chooseAction(stateKey: string): string {
        if (!this.qTable.has(stateKey)) {
            this.qTable.set(stateKey, [0, 0]); // Init [WANDER, CHARGE]
        }

        if (Math.random() < this.epsilon) {
            return this.getActions()[Math.floor(Math.random() * 2)];
        }

        const qValues = this.qTable.get(stateKey)!;
        return qValues[0] > qValues[1] ? "WANDER" : "GO_CHARGE";
    }

    learn(state: string, action: string, reward: number, nextState: string) {
        if (!this.qTable.has(state)) this.qTable.set(state, [0, 0]);
        if (!this.qTable.has(nextState)) this.qTable.set(nextState, [0, 0]);

        const qValues = this.qTable.get(state)!;
        const nextQValues = this.qTable.get(nextState)!;

        const actionIdx = action === "WANDER" ? 0 : 1;
        const maxNextQ = Math.max(...nextQValues);

        // Q(s,a) = Q(s,a) + alpha * (reward + gamma * max(Q(s',a')) - Q(s,a))
        qValues[actionIdx] = qValues[actionIdx] + this.learningRate * (reward + this.discountFactor * maxNextQ - qValues[actionIdx]);

        this.qTable.set(state, qValues);
    }
}
