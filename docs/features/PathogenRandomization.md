# Pathogen Randomization Algorithm

This document describes how randomized Avatar specs are generated for the Randomizer view and how they interact with the Pathogen Factory.

## Goals
- Produce visually coherent, varied avatars with a small set of parameters.
- Keep performance high by using pooled geometries/materials.
- Preserve the “hard‑edged” look for cylinder, capsule and prism shapes.

## Color Strategy
We use a small set of curated palettes that pair a body/spike hue with softer node/arc accents and a close emissive tint. This avoids clashing combinations while keeping variety high.

Each palette provides:
- baseColor and spikeColor (shared hue)
- nodeColor (bright accent)
- arcColor (lighter complement)
- emissive (slightly darker than base/spike)

A UI control in Randomizer lets you shuffle colors without changing geometry or behavior ("Shuffle Colors").

## Shape & Detail
- Base shapes are chosen from: icosahedron, sphere, triPrism, hexPrism, cylinder, capsule.
- For hard‑edged shapes (cylinder, capsule, triPrism, hexPrism), detail is forced to 0 in the spec and the factory enforces minimal segments:
  - cylinder: 6 radial segments
  - capsule: 2 cap segments, 6 radial segments (or a 6‑sided cylinder fallback)
  - prisms already use 3/6 sides
- Sphere and icosahedron can vary detail in [0,1,2].

## Spikes
Spike style influences count/length/thickness ranges:
- cone/inverted: spikeCount 20–64, length 0.32–0.58, radius 0.08–0.14
- disk: spikeCount 24–60, length 0.22–0.38, radius 0.10–0.16
- block: spikeCount 18–44, length 0.30–0.55, radius 0.09–0.14
- tentacle: spikeCount 14–36, length 0.50–0.75, radius 0.05–0.10

Spike base can be shifted inwards/outwards via spikeBaseShift ~ [-0.28, 0.32]. Spike pulsing is enabled by default with intensity 0.05–0.35.

## Nodes & Arcs
- nodeCount: 2–9
- node strobe mode: off | unified | alternating, with speed 4–12
- arcCount: 0–7

## Materials
- Core emissive intensity: 0.18–0.55
- Spike emissive intensity: 0.00–0.32 (spikeEmissive color matches spikeColor)
- Roughness/metalness are randomized within gentle ranges for core/spikes.

## Animation & Hitbox
- spin: 0.12–0.38
- roll: 0.00–0.28
- breathe: 0.006–0.020
- flickerSpeed: 6–10
- Optional animated hitbox: enabled 50% of the time, min 0.8–1.0, max 1.0–1.4, speed 0.4–2.0. When enabled, the current hitbox scale modulates the spike base distance for a subtle “pumping” effect.

## Quality & LOD
Quality is picked from low|med|high. In the factory, a lightweight LOD policy scales spike/arc counts and detail for low/medium quality to keep draw calls practical.

## Where It Lives
- Randomization logic: `src/pages/RandomizerMode.jsx` (function `randomSpec` + post‑processing effect)
- Hard‑edge enforcement and pooling: `src/characters/factory/PathogenFactory.tsx`

## Extending
- Add/adjust palettes to match your art direction.
- Per‑shape distributions (e.g., fewer spikes on long capsules) can be tuned in the post‑processing effect.
- If you introduce new spike styles or base shapes, add corresponding ranges to keep output balanced.
