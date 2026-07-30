# Rubik Phaser

A browser-based 3D-style Rubik's Cube game implemented with Phaser 3 and TypeScript.

This repository contains a working implementation of the cube model, renderer, input controller, and a Phaser-based UI overlay. The implementation focuses on keeping the cube model separate from rendering and input, making core game logic easy to test and iterate on.

Highlights

- Fully implemented sticker-based CubeModel with move application, scramble generation, solved detection and move history (src/models/CubeModel.ts)
- 3D-style renderer using Phaser Graphics with perspective projection and painter's-order face rendering (src/rendering/CubeRenderer.ts)
- Input controller that supports mouse/touch drag-to-rotate, taps, and keyboard shortcuts for moves (src/input/CubeInputController.ts)
- Phaser scenes: BootScene, GameScene (orchestrator), and UIScene (overlay with controls and move grid)
- UI controls for Scramble, Reset and Undo, move grid buttons, and keyboard shortcuts
- Hosted at: https://ilusoft.github.io/rubik-phaser/

Quickstart (dev)

1. Install dependencies
   npm install

2. Start development server
   npm run dev

3. Open the app in the browser (Vite default: http://localhost:5173)

Build

- npm run build — compiles TypeScript and produces a production bundle via Vite
- npm run preview — preview the built bundle locally with Vite

Requirements

- Node.js (16+ recommended)
- npm

Project structure (implemented files)

- src/
  - main.ts — application bootstrap (instantiates Phaser.Game)
  - game.ts — optional game-level helpers
  - scenes/
    - BootScene.ts — assets / config loader
    - GameScene.ts — creates model, renderer, input controller and coordinates moves
    - UIScene.ts — overlay UI: controls, move grid, move counter and status
  - models/
    - CubeModel.ts — sticker-based cube state, moves, scramble, solved detection
    - MoveNotation.ts — move definitions, parsing and allowed moves (including M/E/S middle moves)
  - rendering/
    - CubeRenderer.ts — projects a cube to 2D, draws stickers, edges and animates moves
    - FaceMesh.ts — (supporting renderer utilities)
    - CubeMaterials.ts— color / material helpers
  - input/
    - CubeInputController.ts — pointer + keyboard handling, emits move events
  - ui/
    - ControlPanel.ts — (UI helpers for custom overlays)
    - StatusOverlay.ts — (auxiliary status components)
  - utils/
    - scramble.ts — helper to generate scramble sequences (used by CubeModel)
    - math.ts
    - dom.ts

Core architecture and responsibilities

- CubeModel (src/models/CubeModel.ts)
  - Maintains the canonical sticker representation (54 entries, 6 faces × 9 stickers)
  - Exposes applyMove(move: string), applyMoves(sequence: string[]), reset(), isSolved(), generateScramble()
  - Records move history as moves are applied

- CubeRenderer (src/rendering/CubeRenderer.ts)
  - Uses Phaser Graphics primitives to draw faces and stickers with a perspective projection
  - Computes visible faces and renders them in painter order so depth looks correct
  - Draws per-sticker fills and borders, and a configurable edge projection mode
  - Exposes animateMove(move, onComplete) that plays a short tween and calls back when done
  - Keeps its view of the sticker colors in sync by accepting model state (renderFromModel)

- GameScene (src/scenes/GameScene.ts)
  - Orchestrator that owns CubeModel and CubeRenderer instances
  - Receives move events from CubeInputController or UIScene and executes moves
  - Ensures animations do not overlap (locks while animating)
  - Provides convenience methods: scramble(), reset(), undo(), getMoveHistory()
  - Emits events used by UIScene: move-executed, scramble-executed, reset, undo, cube-solved

- CubeInputController (src/input/CubeInputController.ts)
  - Handles pointerdown/move/up to rotate the cube view and detect taps
  - Registers keyboard listeners for move keys (U/D/L/R/F/B and M/E/S and their primes)
  - Emits "move" events when a keyboard or UI action maps to a cube move. Drag-to-turn gestures are scaffolded and can be extended.

- UIScene (src/scenes/UIScene.ts)
  - Renders a control panel containing: Scramble, Reset, Undo, a 3×3 grid of move buttons, move counter, and status text
  - Listens to GameScene events and updates the UI (move count, solved message, move history preview)

Notable implementation details

- Move notation supports standard face moves and middle layer moves: U, D, L, R, F, B, M, E, S and modifiers (', 2)
- Scramble generation avoids consecutive moves on the same face and avoids redundant opposite-face sequences
- Rendering: the CubeRenderer computes a 3D cube corner set, rotates by user-controlled rotX/rotY, projects to 2D, determines visible faces and draws only those faces (with optional projection lines for debugging)
- Animations: animateMove currently uses a short scale tween to provide visual feedback while the model state is updated immediately — this keeps logic simple while anims run
- Input: keyboard supports Shift for prime moves (e.g., Shift+U -> U') and plain key for clockwise; pointer drag rotates the whole cube. Tap-to-turn is scaffolded in the controller (handleTap placeholder).

How the pieces communicate

- GameScene registers the CubeInputController and listens to its "move" events. It calls cubeModel.applyMove(move), then cubeRenderer.animateMove(move, onComplete) and finally re-renders from the model when the animation completes.
- UIScene is launched alongside GameScene and listens to GameScene events. Its buttons call GameScene.scramble(), reset(), undo(), or executeMove(move) directly.

Running and extending the project

- To add new UI controls, update src/scenes/UIScene.ts or create new UI components under src/ui
- To extend input gesture recognition, implement tap/drag-to-turn logic inside src/input/CubeInputController.ts (handleTap currently empty)
- To change rendering style (shading, outlines, sticker inset), modify src/rendering/CubeRenderer.ts
- To add solver support or remote APIs, keep logic in CubeModel so it's testable and renderer-agnostic

Development notes

- The project uses Vite for development and TypeScript for type-safety. The package.json scripts are:
  - dev — start Vite dev server
  - build — compile TypeScript and run vite build
  - preview — preview the production bundle

- The implemented code favors clarity and testability: CubeModel contains pure state and deterministic operations; renderer and input are side-effecting UI layers.

Known TODOs / Next improvements

- Implement tap-to-turn gesture detection and face selection in CubeInputController.handleTap
- Add smoother face-rotation animations that rotate only the affected stickers (current implementation uses a visual tween while the model state is committed immediately)
- Add unit tests for CubeModel permutations and scramble generator
- Add optional sound effects and accessibility improvements (ARIA labels for UI controls)

Contributing

- Open issues or PRs describing the change
- Keep model changes backward-compatible where possible

License

- (Add license information here)

If you'd like, the README can be further extended with API examples, screenshots, or developer notes (tooling versions, editor configs).
