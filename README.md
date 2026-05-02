# Black Hole Render

A cinematic, procedural Three.js black hole render with adaptive quality profiles for desktop and mobile. The scene uses layered shader geometry, screen-space lensing, bloom, particles, orbiting bodies, and a compact viewer control surface.

## Run

```sh
bun install
bun run dev
```

Open the local Vite URL, usually `http://127.0.0.1:5173/`.

## Build And Verify

```sh
bun run build
bun run test:smoke
```

`bun run check` runs both build and smoke tests.

## Controls

- Preset: switch between Minimal, Cinematic, and High Energy looks.
- Clean: disables the pixel/posterization pass for higher-fidelity stills.
- Reset: returns the camera and animation framing to the cinematic default.
- Export: saves the current viewport as a PNG using asynchronous canvas export.

Add `?debug=1` to the URL to lazy-load the detailed shader control panel.

## Quality Targets

- Desktop cinematic: full-resolution quality capped at `devicePixelRatio <= 2`.
- Mobile cinematic: reduced geometry and particles, capped at `devicePixelRatio <= 1.35`.
- Performance mobile: lower geometry, particles, and postprocessing for high-density narrow screens.

The app pauses rendering when the page is hidden, observes container resizes, and shows a WebGL fallback if hardware acceleration is unavailable.
