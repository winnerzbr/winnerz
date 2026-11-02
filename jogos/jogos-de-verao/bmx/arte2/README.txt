COSTA WINNERZ — BMX ENVIRONMENT PACK

21 main PNG assets, plus separate props and ten effect frames.
Artwork generated with the built-in imagegen tool. The complete prompt set is included in prompts/.

MAIN ASSETS
01 / 06 / 08 / 10 — Dirt interior: day / morning / sunset / night, 1024 x 1024. Repeat horizontally and vertically.
02 / 07 / 09 / 11 — Trail top edge: same four times, 2048 x 256. Repeat horizontally. The navy trail surface is at y48; the packed sand band is 64 pixels deep. Warp this strip along the trail curve. The plain bottom color is matched to the corresponding dirt tile's average color.
03 — Kicker lip, 1024 x 768. Side view, nose right, flat left/bottom cuts for joining to the trail.
04 — Track props atlas, 2048 x 1536. Blank distance sign, orange start gate, two waving flag frames, hay bale, three tires, two cones, rope fence.
05 — Dust effects atlas, 2048 x 1152. Four columns and three rows of 512 x 384 cells. Top row: four landing-cloud frames. Middle row: three dirt-clod frames. Bottom row: three skid-puff frames. The fourth cell in each lower row is empty. Local ground baseline y330.
12 / 14 / 16 / 18 — Extended dunes: day / morning / sunset / night, 2100 x 700 (3:1). Repeat horizontally. Source dunes and objects stay at the top; the painted hillside extends downward.
13 / 15 / 17 / 19 — Extended far background: same four times, 2048 x 768 (32:12). Repeat horizontally. The source landscape stays bottom-anchored; added sky extends upward.
20 — Dunes lantern light layer, 2100 x 700, black background, aligned with 18.
21 — Far-background sea-reflection and bright-star light layer, 2048 x 768, black background, aligned with 19.

SEPARATE PIECES
effect_frames/: ten PNG cells with the same dimensions and baseline as atlas 05. See effect_frames.json for atlas coordinates.
track_prop_parts/: individual high-resolution props. The two flag canvases and poles align for animation. rope_fence_repeat.png is the repeating fence section.
game_scale_props/: smaller ready-to-place copies, using a roughly 325px standing IAmiguinho as the scale reference. The gate retains extra height for rider clearance. See game_scale_props.json for dimensions and scale factors. These are also suitable starting sizes if the game applies its own camera scale.
track_props_regions.json: source atlas rectangles use [left, top, right, bottom], with right/bottom exclusive.

COMPOSITING
Use #00FF00 as the color key for the trail edge, dunes, props and effects. Dirt and far-background images are opaque scenery. Use additive or screen blending for the black light layers at exactly the matching night image's size and offset. Do not stretch lighting layers independently.
The day/morning/sunset/night families share geometry and registration. Lighting is transferred onto the common artwork; requested celestial lights are retained in the sky. Opposing tile edges are matched and repeat previews have been checked.
