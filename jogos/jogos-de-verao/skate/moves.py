"""Moveset do Skate (half-pipe): pranchas pedidas ao ChatGPT, referências de pose (das poses antigas em 16 bits) e pedidos do cenário."""
# cada prancha: título, texto do pedido, e a referência de pose: lista de 8 (quadro antigo ou None) -> (sprite, animação, índice[, espelho])
S = lambda a, i: ('ia_sk', a, i)
G = lambda i: ('ia_giro', 'sk', i)
B = lambda i, m=False: ('shape', 'fr', i, m)

BOARD = ("The skateboard is always the one from the attached SKATEBOARD MODEL: same orange deck with black grip tape, "
         "white wheels and grey trucks, thick dark navy outline. ")

MOVES = [
 dict(n='Modelo do skate', use='Primeiro pedido: o skate sozinho, em várias vistas. Vira o anexo fixo de todas as outras pranchas.', prop=True, sheets=[
  dict(t='Folha de modelo do skate (não é 4x2)', ref=None, txt=
   "Sheet: SKATEBOARD MODEL SHEET for this game (not a 4x2 grid this time). One skateboard, drawn in the same hand-painted cartoon style "
   "and thick dark navy outline as the character: a short, chunky popsicle deck with both ends kicked up, ORANGE deck with BLACK grip tape "
   "on top, light grey trucks and four fat WHITE wheels. Show it 6 times in a row, same size: 1 side view (wheels down, nose to the right), "
   "2 three-quarter view from above, 3 top view (grip tape), 4 bottom view (orange, with the trucks), 5 end view (nose toward the camera), "
   "6 side view upside down (wheels up). Its length is 75% of the character's standing height (see the character MODEL SHEET). "
   "Flat pure green background (#00FF00), no text, no shadow."),
 ]),
 dict(n='Parado no skate', use='Em pé sobre o skate, deslizando devagar. Repete.', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('chao', 0), None, S('chao', 1), None, S('chao', 0), None, S('chao', 1), None], txt=
   "Sheet: STANDING ON THE SKATEBOARD, rolling slowly, loop of 8 frames. Side view facing RIGHT, both feet on the board across it "
   "(front foot over the front truck, back foot over the tail), knees a little bent, arms relaxed and slightly open for balance. "
   "Gentle breathing and a tiny bounce of the knees. The four WHEELS touch the GROUND line of the guide grid; the character's height "
   "from the board to the propeller top is the same as standing on the ground."),
 ]),
 dict(n='Impulso', use='Segurando para a frente: agacha e estica para ganhar embalo na descida.', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('chao', 0), None, S('chao', 2), None, S('chao', 3), None, S('chao', 2), None], txt=
   "Sheet: PUMPING ON THE SKATEBOARD, loop of 8 frames. Side view facing RIGHT on the board. 1: standing tall. 2: knees start to bend. "
   "3: crouching, arms forward. 4: deep crouch, chest low, arms reaching forward. 5: deepest crouch. 6: pushing up with the legs. "
   "7: almost tall, arms swinging back. 8: tall, flowing into frame 1. Wheels always on the GROUND line."),
 ]),
 dict(n='Freio', use='Segurando para trás: freia arrastando o pé.', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('chao', 0), None, None, S('chao', 4), None, None, None, S('chao', 4)], txt=
   "Sheet: BRAKING ON THE SKATEBOARD, 8 frames. Side view facing RIGHT. 1: standing on the board. 2: weight moves to the front foot. "
   "3: back foot lifts off the tail. 4: back foot touches the ground behind the board, body leaning back, arms forward for balance. "
   "5-8: holding the brake: back foot dragging on the ground, body leaning back, small shake of the arms (frames 5-8 loop)."),
 ]),
 dict(n='Desequilíbrio', use='Depois de um pouso meio torto: quase cai, braços girando.', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('chao', 0), S('chao', 5), None, None, S('chao', 0), S('chao', 5), None, None], txt=
   "Sheet: WOBBLING ON THE SKATEBOARD, loop of 8 frames. Side view facing RIGHT on the board. Almost falling: 1-2 body leans back, arms "
   "windmilling; 3-4 recovering; 5-6 body leans forward, arms windmilling the other way; 7-8 recovering, flowing into frame 1. "
   "Feet never leave the board; wheels on the GROUND line."),
 ]),
 dict(n='Saída da rampa', use='Chegando na borda: agacha e sobe com o skate colado nos pés.', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('chao', 3), None, None, None, None, None, None, S('ar', 0)], txt=
   "Sheet: TAKE-OFF (ollie up the ramp), 8 frames, side view facing RIGHT, drawn upright (the game turns it to follow the ramp). "
   "1: deep crouch on the board. 2: starting to spring up. 3: legs extending, back foot pops the tail. 4: whole body in the air, board "
   "stuck to the feet. 5: rising, knees coming up. 6: knees up, board under the feet. 7: tucked, arms open. 8: tucked, ready for tricks. "
   "From frame 4 on, the character is higher in the cell."),
 ]),
 dict(n='No ar', use='Voando sem manobra: sobe encolhido, abre e prepara o pouso.', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('ar', 0), None, None, S('ar', 0), None, None, None, S('ar', 5)], txt=
   "Sheet: IN THE AIR, NO TRICK, 8 frames, side view facing RIGHT, drawn upright, the board stuck to the feet. 1-2: knees tucked up, arms "
   "open. 3-4: floating at the top, relaxed. 5-6: legs start to extend down. 7-8: legs extended, ready to land, arms out for balance."),
 ]),
 dict(n='Pouso', use='As rodas tocam a rampa: amortece e volta a ficar em pé.', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('ar', 5), None, None, S('chao', 3), None, None, None, S('chao', 0)], txt=
   "Sheet: LANDING ON THE SKATEBOARD, 8 frames, side view facing RIGHT. 1: just above the ground, legs extended. 2: wheels touch the "
   "GROUND line. 3: knees bend to absorb. 4: deepest crouch, arms forward. 5: pushing up. 6-7: rising. 8: standing on the board, like the "
   "STANDING ON THE SKATEBOARD sheet."),
 ]),
 dict(n='Flip (corpo)', use='Kickflip, heelflip, varial, tre flip e impossible: o corpo pula e o skate gira solto embaixo (o skate vem das pranchas de skate girando).', sheets=[
  dict(t='Prancha única · 8 quadros · SEM o skate', ref=[S('ar', 0), None, None, S('ar', 4), None, None, None, S('ar', 5)], txt=
   "Sheet: FLIP TRICK BODY, 8 frames, side view facing RIGHT, drawn upright, WITHOUT THE SKATEBOARD (the game draws the spinning board "
   "under the feet). 1: tucked in the air. 2: front foot kicks forward and out. 3: both legs lifted high and open, knees bent, space "
   "under the feet. 4: highest tuck, looking down at the (invisible) board. 5: holding. 6: feet start to come down. 7: feet together, "
   "reaching down to catch the board. 8: legs extended, feet flat as if standing on a board."),
 ]),
 dict(n='Skate girando', use='O skate sozinho nas manobras de flip. O jogo junta com o corpo do flip.', prop=True, sheets=[
  dict(t='Parte 1 de 2 · kickflip (gira no comprimento) · quadros 1–8', ref=[B(0), B(1), B(2), B(4), B(3), B(4, True), B(2), B(1)], txt=
   "Sheet: SKATEBOARD KICKFLIP, 8 frames, the board ALONE (no character), " + "same board as the SKATEBOARD MODEL. The board spins one full turn around its LONG axis "
   "(nose to tail), seen from the side, nose to the right: 1 wheels down; 2 tilting, grip tape starts to show; 3 standing on its edge, "
   "grip tape facing us; 4 grip tape up (wheels up); 5 upside down; 6 on its other edge, orange bottom facing us; 7 tilting back; "
   "8 almost wheels down again, flowing into frame 1. Same size in every frame, centered in the cell."),
  dict(t='Parte 2 de 2 · shove-it (gira deitado) · quadros 9–16', ref=[B(0), B(5), B(6), B(5, True), B(0, True), B(5), B(6), B(5, True)], txt=
   "Sheet: SKATEBOARD SHOVE-IT, 8 frames, the board ALONE (no character), same board as the SKATEBOARD MODEL, wheels always DOWN. The "
   "board spins one full turn flat, around the vertical axis, seen from the side and a little from above: 9 side view, nose right; 10 "
   "three-quarter, nose coming toward us; 11 end view, nose toward us; 12 three-quarter, nose to the left; 13 side view, nose left; 14 "
   "three-quarter, tail toward us; 15 end view, tail toward us; 16 three-quarter, flowing into frame 9."),
 ]),
 dict(n='Pegada Indy', use='Manobra no ar: a mão de trás pega o skate entre os pés.', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('ar', 0), None, S('ar', 1), None, None, S('ar', 1), None, S('ar', 0)], txt=
   "Sheet: INDY GRAB, 8 frames, side view facing RIGHT, drawn upright, board on the feet. 1: tucked in the air. 2: knees up, back hand "
   "reaching down. 3: back hand grabs the toe side of the board between the feet. 4-6: holding the grab, body tucked, front arm out for "
   "style. 7: lets go. 8: tucked again, like frame 1."),
 ]),
 dict(n='Pegada de rabeta', use='Manobra no ar: pega a rabeta do skate (a ponta de trás).', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('ar', 0), None, S('ar', 2), None, None, S('ar', 2), None, S('ar', 0)], txt=
   "Sheet: TAIL GRAB, 8 frames, side view facing RIGHT, drawn upright. 1: tucked. 2: back hand reaches behind. 3: back hand grabs the "
   "TAIL of the board, the nose tilts up. 4-6: holding, front arm up for balance. 7: lets go. 8: tucked, like frame 1."),
 ]),
 dict(n='Pegada melão', use='Manobra no ar: a mão da frente pega o skate pelo lado do calcanhar.', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('ar', 0), None, S('ar', 3), None, None, S('ar', 3), None, S('ar', 0)], txt=
   "Sheet: MELON GRAB, 8 frames, side view facing RIGHT, drawn upright. 1: tucked. 2: front hand reaches down behind the front leg. "
   "3: front hand grabs the heel side of the board between the feet, board pulled up and tilted. 4-6: holding, back arm up and open. "
   "7: lets go. 8: tucked, like frame 1."),
 ]),
 dict(n='Superman', use='Botão ✕ no ar: solta os pés e voa esticado, segurando o skate.', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('ar', 0), None, S('ar2', 0), None, None, S('ar2', 0), None, S('ar', 0)], txt=
   "Sheet: SUPERMAN, 8 frames, side view facing RIGHT, drawn upright (the game turns it). 1: tucked on the board. 2: both hands grab the "
   "nose. 3: legs kick back off the board. 4-6: body stretched flat behind the board like flying, arms straight holding the board in "
   "front. 7: legs come back. 8: feet back on the board, tucked."),
 ]),
 dict(n='Cristo', use='Botão ○ no ar: braços abertos em cruz, em pé no skate.', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('ar', 0), None, S('ar2', 1), None, None, S('ar2', 1), None, S('ar', 0)], txt=
   "Sheet: CHRIST AIR, 8 frames, side view facing RIGHT, drawn upright. 1: tucked on the board. 2: one hand grabs the board and lifts it "
   "to the side, held vertically. 3: legs straighten down, other arm opens wide. 4-6: body straight like a cross, one arm wide open, the "
   "other holding the board vertical beside the body. 7: board comes back under the feet. 8: tucked."),
 ]),
 dict(n='Foguete', use='Botão □ no ar: pés na rabeta e o skate de pé, como um foguete.', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('ar', 0), None, S('ar2', 2), None, None, S('ar2', 2), None, S('ar', 0)], txt=
   "Sheet: ROCKET AIR, 8 frames, side view facing RIGHT, drawn upright. 1: tucked on the board. 2: both hands grab the nose. 3: the board "
   "turns vertical in front of the body, nose up. 4-6: both feet on the tail, body straight up, hands holding the nose like riding a "
   "rocket. 7: board comes back flat. 8: tucked."),
 ]),
 dict(n='Hélice', use='Botão △ no ar: a hélice do boné gira e ele fica pairando um instante.', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('ar2', 3), S('ar2', 4), S('ar2', 3), S('ar2', 4), S('ar2', 3), S('ar2', 4), S('ar2', 3), S('ar2', 4)], txt=
   "Sheet: PROPELLER HOVER, loop of 8 frames, side view facing RIGHT, drawn upright, standing on the board in the air, both arms up and "
   "happy. The propeller on the cap spins fast: draw the two blades in a different angle in each frame (0, 22, 45, 67, 90, 112, 135, "
   "157 degrees), with a light motion blur, so the 8 frames make one smooth spin. A gentle up-and-down float."),
 ]),
 dict(n='Giro no ar', use='Segurando ◀ ▶ no ar: ele gira no próprio eixo com o skate nos pés. 16 vistas para o giro ficar liso.', sheets=[
  dict(t='Parte 1 de 2 · de lado até de frente e o outro lado · quadros 1–8', ref=[G(0), None, G(1), None, G(2), None, G(3), None], txt=
   "Sheet: SPIN IN THE AIR, part 1 of 2, 8 frames: the character standing on the board in the air turns around his own vertical axis, "
   "22.5 degrees per frame. 1: side view facing RIGHT. 2: turning toward the camera. 3: three-quarter front. 4: almost front. 5: FRONT "
   "view (face screen toward us). 6: three-quarter front, turning left. 7: almost side. 8: side view facing LEFT. The board turns with "
   "him under the feet. Same height and same size in every frame."),
  dict(t='Parte 2 de 2 · de costas, voltando · quadros 9–16', ref=[G(4), None, G(5), None, G(6), None, G(7), None], txt=
   "Sheet: SPIN IN THE AIR, part 2 of 2, frames 9-16, continuing the same turn: 9: side view facing LEFT. 10: turning away from the "
   "camera. 11: three-quarter back. 12: almost back. 13: BACK view (cap and headphones, no face). 14: three-quarter back, turning right. "
   "15: almost side. 16: almost side facing RIGHT, flowing into frame 1. The board turns with him under the feet."),
 ]),
 dict(n='Manual na borda', use='Botão ✕ chegando na borda: equilibra só nas rodas de trás.', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('borda', 0)] * 8, txt=
   "Sheet: MANUAL ON THE LIP, loop of 8 frames, side view facing RIGHT. Balancing on the two back wheels with the nose up, weight on the "
   "back foot, arms open for balance, small balance corrections from frame to frame. The back wheels touch the GROUND line."),
 ]),
 dict(n='Parada de mão', use='Botão ○ na borda: apoia uma mão e fica de ponta-cabeça segurando o skate.', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('chao', 0), None, None, S('borda', 1), S('borda', 1), None, None, S('chao', 0)], txt=
   "Sheet: HANDPLANT, 8 frames, side view facing RIGHT. 1: riding up. 2: front hand reaches down to the ground, other hand grabs the board. "
   "3: legs and board go up. 4-5: upside down, standing on one straight arm, the other hand holding the board on the feet, legs up. "
   "6: coming down. 7: feet and board back down. 8: standing on the board. The planted hand touches the GROUND line."),
 ]),
 dict(n='Grind', use='Botão □ na borda: desliza com os eixos raspando no metal.', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('borda', 2)] * 8, txt=
   "Sheet: GRIND ON THE LIP, loop of 8 frames, side view facing RIGHT. Crouched on the board, the trucks scraping along the metal edge, "
   "arms out for balance, small shakes. Draw small bright SPARKS under the back truck that change in every frame. The trucks touch the "
   "GROUND line."),
 ]),
 dict(n='Stall', use='Botão △ na borda: para em cima da borda, de pose.', sheets=[
  dict(t='Prancha única · 8 quadros', ref=[S('borda', 3)] * 8, txt=
   "Sheet: STALL ON THE LIP, loop of 8 frames, side view facing RIGHT. Stopped on top of the edge with the board tilted, back wheels on "
   "the edge, standing proud, one fist on the hip, small breathing motion. The back truck touches the GROUND line."),
 ]),
 dict(n='Tombo', use='Pouso errado ou tempo demais na borda: cai, o skate voa e ele fica sentado tonto.', sheets=[
  dict(t='Parte 1 de 2 · caindo · quadros 1–8', ref=[S('ar', 5), None, S('borda', 4), None, S('borda', 4), None, None, S('borda', 5)], txt=
   "Sheet: BAIL, part 1 of 2: FALLING, 8 frames, side view facing RIGHT. 1: in the air, losing balance, arms up. 2: the board flies "
   "away behind him. 3: tumbling backwards, arms and legs open. 4: upside down in the air. 5: landing on the back on the sand. 6: rolling. "
   "7: rolling up. 8: sitting on the ground, dizzy. The board is NOT under him (it flies out of the frame in frames 2-3)."),
  dict(t='Parte 2 de 2 · sentado tonto · quadros 9–16 (repete)', ref=[S('borda', 5)] * 8, txt=
   "Sheet: BAIL, part 2 of 2: SITTING DIZZY, loop of 8 frames, side view facing RIGHT, continuing from the last frame of part 1. Sitting "
   "on the ground, legs out, the head wobbling in a small circle, the propeller drooping and slowly turning. The board lies on the "
   "ground behind him, upside down."),
 ]),
]

SCENE_PISTA = [
 dict(t='Rampa: madeira da pista', txt=
  "Seamless TILEABLE texture, square, for the riding surface of a half-pipe ramp in a 2D beach skate game: smooth painted plywood in "
  "warm cream tones with soft wood grain and a few scuffs from wheels, hand-painted cartoon style with soft brush strokes, evenly lit, "
  "no shadows, no objects, no text. It must repeat without visible seams on all four sides."),
 dict(t='Rampa: estrutura (lateral)', txt=
  "Seamless TILEABLE texture, square, for the side wall of a half-pipe ramp seen from the front in a 2D beach skate game: blue-violet "
  "painted wooden panels with diagonal support beams at 22 degrees, bolts, a little sea-salt wear, hand-painted cartoon style, soft "
  "light from the top left, no text. Must repeat without seams horizontally and vertically."),
 dict(t='Rampa: borda de metal, deck e grade', txt=
  "Game asset sheet on a flat pure green background (#00FF00), hand-painted cartoon style with a thick dark navy outline, side view: "
  "1 a long horizontal steel coping pipe (the metal edge on top of the ramp), shiny; 2 a flat wooden deck platform piece in cream wood "
  "with a dark edge, wide and thin; 3 a simple metal safety railing with posts. Each item separate, no text, no shadow."),
 dict(t='Chão: calçadão da praia', txt=
  "Seamless horizontally TILEABLE strip (wide, 4:1), the ground in front of a half-pipe at the beach: Portuguese-style wavy black and "
  "white stone pavement (calçadão) warmed by a sunset light, hand-painted cartoon style, slight perspective (top edge farther away), "
  "no people, no text."),
 dict(t='Céu alto (quando ele voa muito alto)', txt=
  "Tall vertical painted sky background (9:32), hand-painted cartoon style matching a warm beach sunset at the bottom: from the sunset "
  "pink and orange at the bottom, through violet, to a deep starry night blue at the top, with a few soft stylized clouds and small "
  "twinkling stars in the upper part. No horizon, no ground, no text. The bottom edge must match a sunset sky."),
]

# Cenário do lugar (plano visual: Costa WinnerZ · Cidade · Skatepark do Viaduto · capa à noite · azul-noite, ciano, magenta)
STYLE = ("Hand-painted cartoon background in the same style as the attached STYLE REFERENCE (the painted beach): soft brush texture, "
         "clean saturated colors, soft shading, no outlines on background shapes. No text, no letters, no logos, no people, no characters.")
KEEP = ("Use the attached image. Keep the drawing, the framing and every object exactly in the same place and at the same size; "
        "do not add, move or remove anything. Change only the light and the sky colors. ")
KEEPG = "Keep the flat pure green background (#00FF00) exactly as it is. "
SCENE = [
 dict(t='Fundo distante · dia (versão base)', sub='anexe: referência de estilo', txt=
  "Far background layer for a 2D side-view skateboard game, SQUARE 1:1 (the camera rises when the skater flies high, so it needs a lot of sky). "
  "Place: the city district of a fictional sunny Brazilian coastal town called Costa WinnerZ. DAYTIME: strong white sunlight, clean bright blue sky. "
  "Composition: the top 55% is only sky, deeper blue toward the top, with a few soft summer clouds. From 55% to 85% of the height: a distant city "
  "skyline seen from the side, colorful low and mid-rise buildings in soft pastel tones with blue glass windows and a few magenta awnings, a green hill "
  "with small houses on the left, a thin strip of sea at the far right. Everything is far away: hazy, light and low in contrast. The bottom 15% is a "
  "plain, calm concrete plaza in the haze (it will be hidden behind the ramp). " + STYLE),
 dict(t='Meio-plano · dia (versão base)', sub='anexe: referência de estilo + fundo distante aprovado', txt=
  "Mid-ground layer, wide 16:9, on a flat pure green background (#00FF00) everywhere there is sky or empty space (it will be cut out and placed over "
  "the attached FAR LAYER, so match its light and perspective). Place: Skatepark do Viaduto, a skatepark beside and under an elevated concrete highway. "
  "DAYTIME. From left to right across the whole width: an elevated concrete viaduct seen from the side, its deck at about 30% of the height with a "
  "simple metal guardrail on top; 4 thick round concrete pillars down to the ground, covered with cheerful graffiti in cyan, magenta, yellow and white "
  "(abstract shapes, stars, waves, a smiling round face wearing a propeller cap); 3 tall street lamps; a chain-link fence along the back; small skate "
  "obstacles in the distance (a concrete ledge, a small quarter pipe, a bench). Ground line at 82% of the height; the bottom 25% is plain concrete "
  "(hidden behind the ramp). A little hazy and lower in contrast than a foreground, light from the top left. Do not use any green color in the drawing "
  "itself. " + STYLE),
 dict(t='Fundo distante · manhã', sub='anexe: fundo distante · dia', txt=KEEP +
  "EARLY MORNING: low golden sunlight from the left, light morning haze over the city, long soft shadows, pale peach and lilac sky with soft clouds."),
 dict(t='Meio-plano · manhã', sub='anexe: meio-plano · dia', txt=KEEP + KEEPG +
  "EARLY MORNING: low golden sunlight from the left, soft haze, long soft shadows, warm peach highlights on the concrete and on the graffiti."),
 dict(t='Fundo distante · entardecer', sub='anexe: fundo distante · dia', txt=KEEP +
  "SUNSET: orange, pink and purple sky with glowing clouds, the sun low behind the city, warm backlight with rim light on the building edges, "
  "the first windows lighting up."),
 dict(t='Meio-plano · entardecer', sub='anexe: meio-plano · dia', txt=KEEP + KEEPG +
  "SUNSET: warm orange backlight, pink rim light on the viaduct and the pillars, long shadows, the street lamps just turning on with a soft glow."),
 dict(t='Fundo distante · noite (capa)', sub='anexe: fundo distante · dia', txt=KEEP +
  "NIGHT: deep night-blue sky with many small stars and a thin crescent moon, cool blue moonlight on the city, many lit windows in warm white, "
  "a few cyan and magenta neon signs without letters. Still readable, not black."),
 dict(t='Meio-plano · noite (capa)', sub='anexe: meio-plano · dia', txt=KEEP + KEEPG +
  "NIGHT: cool night-blue light, the street lamps on with warm light pools on the concrete, the graffiti glowing softly in cyan and magenta, "
  "thin neon strips under the viaduct deck. Darker but still readable, not black."),
 dict(t='Luzes da noite · fundo distante', sub='anexe: fundo distante · noite', txt=
  "Use the attached NIGHT image. Make an image of exactly the same size and framing that shows ONLY the lights, on a pure black background: the lit "
  "windows, the neon signs, the moon and the brightest stars, each with a soft glow, in exactly the same positions as in the attached image. "
  "Everything else pure black. No text."),
 dict(t='Luzes da noite · meio-plano', sub='anexe: meio-plano · noite', txt=
  "Use the attached NIGHT image. Make an image of exactly the same size and framing that shows ONLY the lights, on a pure black background: the "
  "street lamp bulbs with their soft halos and light pools, the neon strips under the viaduct, the glowing parts of the graffiti in cyan and magenta, "
  "in exactly the same positions as in the attached image. Everything else pure black. No text."),
 dict(t='Chão do skatepark', sub='anexe: referência de estilo', txt=
  "Seamless horizontally TILEABLE strip (wide, 4:1), the floor in front of a half-pipe in a city skatepark: smooth blue-grey concrete seen slightly "
  "from above, with expansion joints, a faded yellow painted edge line near the top, a few soft wheel marks and two or three small faded stickers. "
  "Low detail and soft, so it never distracts from the skater; evenly lit, no text. It must repeat horizontally without any visible seam. " + STYLE),
]

# Manobras combinadas: manobra segurada + giro no ar (uma prancha cada, 8 vistas em volta dele)
CB_VIEWS = ("The whole character with the board turns around his own vertical axis (the line from the board to the propeller), "
            "45 degrees per frame, exactly like the attached approved SPIN IN THE AIR sheets: 1 side view facing RIGHT; 2 three-quarter, "
            "turning toward the camera; 3 FRONT view (face screen toward us); 4 three-quarter front, turning left; 5 side view facing LEFT; "
            "6 three-quarter back; 7 BACK view (cap and headphones, no face); 8 three-quarter back, almost facing right again, flowing into frame 1. "
            "The POSE NEVER CHANGES from frame to frame: only the view angle changes. Same size in every frame, centered in the cell, drawn upright "
            "(the game turns it).")
COMBOS = [
 dict(n='Superman Giratório', img='superman', btn='segurar ✕ + ◀ ou ▶', sheet='SUPERMAN', pose='the SUPERMAN pose from frames 4-6 of the approved SUPERMAN sheet: body stretched flat behind the board, both arms straight holding the board in front, legs together behind'),
 dict(n='Cristo Giratório', img='cristo', btn='segurar ○ + ◀ ou ▶', sheet='CHRIST AIR', pose='the CHRIST AIR pose from frames 4-6 of the approved CHRIST AIR sheet: body straight, one arm wide open, the other hand holding the board vertical beside the body'),
 dict(n='Foguete Espiral', img='foguete', btn='segurar □ + ◀ ou ▶', sheet='ROCKET AIR', pose='the ROCKET AIR pose from frames 4-6 of the approved ROCKET AIR sheet: the board vertical in front of the body, nose up, both feet on the tail, both hands holding the nose'),
 dict(n='Helicóptero', img='helice', btn='segurar △ + ◀ ou ▶', sheet='PROPELLER HOVER', pose='the PROPELLER HOVER pose of the approved PROPELLER HOVER sheet: standing on the board, both arms up and happy; the propeller blades are a fast blurred spinning disc in every frame'),
 dict(n='Indy Giratória', img='indy', btn='segurar ↑ + ◀ ou ▶', sheet='INDY GRAB', pose='the INDY GRAB pose from frames 4-6 of the approved INDY GRAB sheet: knees up, back hand grabbing the toe side of the board between the feet, front arm out'),
 dict(n='Rabeta Giratória', img='rabeta', btn='segurar ↓ + ◀ ou ▶', sheet='TAIL GRAB', pose='the TAIL GRAB pose from frames 4-6 of the approved TAIL GRAB sheet: back hand holding the tail of the board, nose tilted up, front arm up'),
]
for c in COMBOS:
    c['txt'] = (f"Attached: the MODEL SHEET, the GUIDE GRID, the SKATEBOARD MODEL, the approved {c['sheet']} sheet and the two approved SPIN IN THE AIR sheets. "
                "In every frame the head has the size of the space between the CAP TOP and CHIN lines. Do not draw the guide lines, labels or numbers.\n\n"
                f"Sheet: {c['sheet']} + SPIN (combined trick), 8 frames. The character keeps {c['pose']}, and spins: " + CB_VIEWS)
