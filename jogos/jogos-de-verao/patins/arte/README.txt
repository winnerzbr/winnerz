COSTA WINNERZ — ROLLER SKATING ASSET PACK

11 main PNG images plus 3 modular handrail PNGs.

01_obstacles_and_prizes.png — 1200 x 600
Character scale reference, broken sidewalk hole, four rolling-coconut rotation frames,
falling brown coconut, separate soft ground shadow, frescobol ball with motion lines,
bitten popsicle and coconut-water prize. Flat #00FF00 background.
The standing scale-reference character is 325 pixels tall.

02_yellow_handrail.png — 720 x 160
Three separate yellow grind-rail pieces. Individual ready-to-join parts and their
sheet regions are in handrail_parts/. Keep all parts at the same vertical origin;
join left_post, any number of bar_repeat tiles, then right_post, without gaps.
Flat #00FF00 background. Approximate rail height: 100 pixels.

Background panoramas — 3072 x 864, 32:9, horizontal repeat
03_background_day.png
05_background_morning.png
07_background_sunset.png
09_background_night.png
Lower 25% of each panorama is empty flat sand color for the sidewalk layer.

Mosaic sidewalk strips — 3072 x 512, 6:1, horizontal repeat
04_sidewalk_day.png
06_sidewalk_morning.png
08_sidewalk_sunset.png
10_sidewalk_night.png
Use the corresponding lighting version with each background. The sidewalk is
a separate ground layer and can be scaled vertically to the game's layout.

11_background_lights_only.png — 3072 x 864
Aligned to the night panorama: street lamps, kiosk lamps, moon and stars only,
with glows on pure black. Use as a light/emission mask; the night panorama already
contains illuminated lamps, so adding this layer increases their brightness.

All scenery variants retain their day-master alignment. Sky light sources change
with time of day. Opposite horizontal edge columns match on all tiled scenery.
No guide lines, text or logos are painted into the PNGs.

The prompts used to create the artwork are included in prompts/.
