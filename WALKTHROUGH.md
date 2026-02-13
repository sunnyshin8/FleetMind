# Gameplay Enhancements — Walkthrough

## What Changed

### `page.tsx` — Game Logic
- **Collectible Orbs**: 3 types (energy/speed/repair) spawn every 3s, max 12 on map. Collected on proximity (radius 2.0)
- **Score + Combos**: Each orb gives points. Collect multiple within 4s for combo multiplier (up to x5)
- **Charging Station** at `[10, 0, 10]` — robots recharge 2%/tick when standing on it
- **Sprint** (hold `Shift`): 2.2x speed, 0.8% battery drain per move instead of 0.3%
- **Number Keys**: Press `1` or `2` to instantly select Robot A or B
- **Dead Battery Lock**: Robots with 0% battery can't move
- **HUD Overlays**: Score counter, controlling-robot indicator, orb count, controls hint

### `SimMap.tsx` — 3D Visuals
- **CollectibleOrb**: Floating spinning octahedrons with outer glow sphere and ground ring, color-coded by type
- **ChargingStation**: Green glowing platform with animated beam of light and top glow sphere
- **SelectionRing**: Pulsing blue ring under the currently selected robot

## Verification

![Gameplay with floating orbs, score HUD, controlling indicator, charging station, and controls hint bar](docs/assets/gameplay_final_1770993232448.png)

- ✅ SCORE display with combo system
- ✅ CONTROLLING shows selected robot name + icon
- ✅ ORBS ✨ 12 counter
- ✅ Controls HUD: WASD Move, Shift Sprint, 1/2 Select, Tab Cycle
- ✅ Floating octahedron orbs (yellow, cyan, green) with glow effects
- ✅ Green charging station with animated beam
- ✅ Blue selection ring under selected robot
- ✅ Both robots movable via 1/2 keys + WASD
- ✅ No compile errors

### Infinite Map & Social Features
- **Infinite Tiling**: Map automatically tiles in a 3x3 grid around the robot. Walls removed for seamless movement.
- **Camera Follow**: Camera smoothly lerps to track the selected robot.
- **Invite System**: Shareable room links (`?room=CODE`) to join specific sessions.

![Infinite warehouse map tiling with robot far from origin](docs/assets/infinite_tiling_verification_1770996135722.png)
![Invite modal with room code](docs/assets/invite_modal_verification_1770994225140.png)

### Multiplayer Syncing
- **Room-Based Backend**: API uses `?room=CODE` to isolate game sessions in Redis.
- **State Merging**: Backend merges partial updates from different players so concurrent moves don't conflict.
- **Real-Time Polling**: Clients poll typically every 500ms to fetch remote robot positions while pushing their own updates instantly.
