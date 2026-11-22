# AGENTS.md

Remotion + Three.js framework for fully procedural vertical (9:16, 1080x1920 @ 30 fps) "2D-in-3D" comic shorts. No external 3D model files — every set, texture, and character is code (Canvas2D textures on Three.js geometry). SFX/music is Python DSP.

## Commands
- Preview: `npm run studio` (http://localhost:3000). Entry is `src/index.ts`; compositions are registered in `src/Root.tsx`.
- Typecheck: `npx tsc --noEmit` (strict). No tests or lint exist — this is the only code gate.
- Render pipeline, in this order:
  1. `npm run render:stills` — hero stills for look-dev → `out/demo/stills/`
  2. `npm run render:previews` — ~3.5 s beat clips at 0.5 scale → `out/demo/previews/`
  3. `npm run render:audio` — Python; needs `numpy`, `scipy`, and `ffmpeg` on PATH → `public/saham_mix.wav`
  4. `npm run render:video` — full `DemoShort` MP4 → `out/demo/Demo_Video_Final.mp4`
  5. `npm run render:captions` — transparent WebM + green-screen MP4 + final mux

## Windows render environment (hardcoded in `scripts/*.mjs`)
- Chrome must exist at `C:/Program Files/Google/Chrome/Application/chrome.exe` (scripts pass it as `browserExecutable`).
- Chromium runs with `gl: "angle"`; TEMP is forced to `D:/remotion-tmp` (override with `REMOTION_TMP`).

## Two video projects, two roles
- `src/videos/demo/` — the rendered demo ("Perbedaan Saham vs Kripto"). All render scripts target **its** compositions and hardcode `out/demo/` outputs. To render a new project, copy scripts or point them at the new composition.
- `src/videos/template/` — clean blueprint for new videos. Copy it to `src/videos/<name>/`, then register the composition in `src/Root.tsx` (only demo comps are registered).
- Module roles are identical in every project: `Bridge.tsx` (Remotion↔Three entry + post stack), `story.ts` (shots/camera timeline), `build.ts` (procedural 3D sets), `toon.ts`/`cast.ts`/`cardshade.ts` (2D characters as billboards, `NOINK` layer), `world.ts`/`lights.ts`/`paint.ts` (environment), `ink.ts`/`lensblur.ts`/`grade.ts` (post FX).

## Timing is locked to audio — the big gotcha
- `story.ts` shot frames, `gen-audio.py` SFX event frames (`TOTAL_FRAMES = 2121`), and caption chunks are all locked to the same voice track (SRT + word-timing JSON in `voice/`).
- Any change to shot/beat frames means re-running `npm run render:audio` (and regenerating captions), or the mix desyncs. Lock picture timing before producing sound.
- `scripts/gen-chunks.py` reads `Suara original/Saham & crypto.json`, which no longer exists — the word JSON actually lives in `voice/`.

## Workflow & quality rules — see `GUIDELINES.md`
- Mandatory 3-phase flow with user approval between phases: stills (look-dev) → beat previews (motion) → full render. STOP and wait after each phase.
- The 4 golden rules every scene must satisfy: physical grounding (no floating/clipping), motivated lighting (light from real in-scene sources), physical character interaction with props, dynamic camera (never static; push-ins, kicks, cuts).
- `GUIDELINES.md` also mandates a model-selection policy (a stronger "Argon" model for 3D/visual code and preview renders; "Flash" for admin tasks and final render execution). Follow it or ask the user which model is active before writing visual code.

## `skill/` — reference material and pipeline
- `skill/SKILL.md` is the step-by-step pipeline for new shorts, including proven look constants; the finished bridge-short source lives in `skill/templates/bridge/`.
- `skill/references/` (STYLE_BIBLE, reports, contact sheets, frames) is **private study material from a reference channel**: never upload, publish, or share it; never copy its characters/scripts/shots; never name the channel in output.
- `skill/templates/audio/` holds the Python DSP modules that `scripts/gen-audio.py` imports (`dsp.py`, `sfx_gen.py`, `instruments.py`).
