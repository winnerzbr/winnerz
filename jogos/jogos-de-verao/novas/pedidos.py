"""Pedidos das provas novas (30/10/2026): prompts das pranchas (personagens e objetos) e dos cenários de cada prova nova.
Cada prova entra quando o jogo dela é feito. A página segue o formato do Moveset do Skate (cartões com Copiar e Feita)."""
import json, re, sys, pathlib
sys.path.insert(0, 'skate'); from moves import STYLE as STYLE0, KEEP, KEEPG
ROOT = pathlib.Path('.')
V = open('moveset_volei/index.html').read()
css = V[V.index('<link rel="preconnect"'):V.index('</style>') + 8]
RULES = re.search(r"  ia: `(.*?)`,\n  bl: `(.*?)`", V, re.S)
RULES_IA, RULES_BL = RULES.group(1), RULES.group(2)
STYLE = STYLE0.replace('(the painted beach)', '(the painted beach of the volleyball game)')

PIA = ('Attached: the MODEL SHEET (the only valid proportions) and the GUIDE GRID (draw on exactly this layout). In every frame the head has the size '
       'of the space between the CAP TOP and CHIN lines, and the body, arms and legs keep the model-sheet size, whatever the pose. Do not draw the guide '
       'lines, labels or numbers.\n\n')
PBL = ('Attached: the AMIGUINHO MODEL SHEET (the only valid proportions), the GUIDE GRID (draw on exactly this layout) and the approved AMIGUINHO '
       'STANDING sheet for size. Same amount of jelly in every frame. Do not draw the guide lines, labels or numbers.\n\n')
UP = 'Drawn UPRIGHT in every frame, even upside down in the dive: the game rotates the whole drawing. '

def tod(name, far, mid, extra_night_far, extra_night_mid, lights_far, lights_mid, day_cover=''):
    """os 4 horários de um cenário de 2 camadas (o dia é a base; manhã, entardecer e noite saem dele)"""
    return [
        dict(t=f'Fundo distante · manhã', sub='anexe: fundo distante · dia', txt=KEEP + 'EARLY MORNING: low golden sunlight from the left, light haze, long soft shadows, pale peach and lilac sky.'),
        dict(t=f'{mid} · manhã', sub=f'anexe: {mid.lower()} · dia', txt=KEEP + KEEPG + 'EARLY MORNING: low golden sunlight from the left, soft haze, long soft shadows, warm peach highlights.'),
        dict(t='Fundo distante · entardecer', sub='anexe: fundo distante · dia', txt=KEEP + 'SUNSET: orange, pink and purple sky with glowing clouds, the sun low near the horizon, warm backlight.'),
        dict(t=f'{mid} · entardecer', sub=f'anexe: {mid.lower()} · dia', txt=KEEP + KEEPG + 'SUNSET: warm orange backlight, pink rim light on the edges, long shadows.'),
        dict(t='Fundo distante · noite', sub='anexe: fundo distante · dia', txt=KEEP + 'NIGHT: deep night-blue sky with many small stars and a thin crescent moon, cool moonlight on the sea. ' + extra_night_far + ' Still readable, not black.'),
        dict(t=f'{mid} · noite', sub=f'anexe: {mid.lower()} · dia', txt=KEEP + KEEPG + 'NIGHT: cool night-blue light. ' + extra_night_mid + ' Darker but still readable, not black.'),
        dict(t='Luzes da noite · fundo distante', sub='anexe: fundo distante · noite', txt='Use the attached NIGHT image. Make an image of exactly the same size and framing that shows ONLY the lights, on a pure black background: ' + lights_far + ', each with a soft glow, in exactly the same positions as in the attached image. Everything else pure black. No text.'),
        dict(t=f'Luzes da noite · {mid.lower()}', sub=f'anexe: {mid.lower()} · noite', txt='Use the attached NIGHT image. Make an image of exactly the same size and framing that shows ONLY the lights, on a pure black background: ' + lights_mid + ', each with a soft glow, in exactly the same positions as in the attached image. Everything else pure black. No text.'),
    ]

GAMES = [
 dict(id='penhasco', n='Salto do penhasco', lugar='Falésia do Farol: penhasco alto com farol listrado e mar fundo lá embaixo. Capa: tarde de vento, céu limpo (azul vivo, branco e vermelho).',
  nota='No jogo agora: as regras do Salto do píer, com 5 saltos de 6 a 18 m. A falésia e o farol são provisórios, desenhados pelo jogo; o IAmiguinho ainda usa os desenhos antigos do salto.',
  groups=[
   dict(h='IAmiguinho saltando', who='ia', p='De lado, olhando para a direita. Todos os desenhos em pé: o jogo gira a figura para fazer as cambalhotas e a entrada na água.', cards=[
    dict(t='Corrida e salto na beirada', sub='8 quadros', txt=PIA + 'Sheet: RUN-UP AND TAKE-OFF from a cliff edge, 8 frames, side view facing RIGHT. 1-4: last running steps, arms pumping (feet on the GROUND line). 5: last step, crouching, arms swinging back. 6: pushing off, arms swinging forward and up. 7: leaving the ground, body stretched, arms high. 8: in the air, body straight, arms up, a little higher in the cell. Do not draw the cliff.'),
    dict(t='Corpo reto no ar', sub='8 quadros · repete', txt=PIA + 'Sheet: STRAIGHT BODY IN THE AIR, loop of 8 frames, side view facing RIGHT. ' + UP + 'Body and legs straight and together, toes pointed, arms straight up above the head. Tiny movement only: the arms open a little (frames 3-5) and close again, flowing into frame 1. Centered in the cell, no ground.'),
    dict(t='Carpado (fechando e aberto)', sub='8 quadros', txt=PIA + 'Sheet: PIKE POSITION, 8 frames, side view facing RIGHT. ' + UP + '1: body straight, arms up. 2-3: folding at the hips, legs straight. 4: PIKE: legs straight and together, folded against the chest at the hips, hands holding the shins. 5-8: holding the pike (tiny breathing movement). Centered in the cell, no ground.'),
    dict(t='Grupado (fechando e aberto)', sub='8 quadros', txt=PIA + 'Sheet: TUCK POSITION, 8 frames, side view facing RIGHT. ' + UP + '1: body straight, arms up. 2-3: knees coming up to the chest. 4: TUCK: knees tight against the chest, hands holding the shins, a compact ball. 5-8: holding the tuck (tiny breathing movement). Centered in the cell, no ground.'),
    dict(t='Parafuso (8 vistas)', sub='8 quadros', txt=PIA + 'Sheet: TWIST, 8 frames. ' + UP + 'The body is straight, arms crossed on the chest, and turns around its own vertical axis 45 degrees per frame: 1 side view facing RIGHT; 2 three-quarter toward the camera; 3 FRONT view; 4 three-quarter front turning left; 5 side view facing LEFT; 6 three-quarter back; 7 BACK view (cap and headphones, no face); 8 three-quarter back, almost facing right again. The pose never changes, only the view angle. Same size in every frame, centered.'),
    dict(t='Entrada na água (agulha)', sub='8 quadros', txt=PIA + 'Sheet: HEAD-FIRST ENTRY, 8 frames, side view facing RIGHT. ' + UP + 'The game turns this drawing upside down. 1-2: body straight, arms going up. 3-8: perfect needle: arms straight above the head, hands joined flat, head between the arms, body and legs straight, toes pointed, tiny tension wobble only. Centered in the cell, no water.'),
    dict(t='Barrigada', sub='8 quadros', txt=PIA + 'Sheet: BELLY FLOP, 8 frames, side view facing RIGHT. ' + UP + '1-2: falling flat and horizontal, arms and legs spread, worried. 3: impact, body flat. 4: arms and legs flapping up, hurt. 5-8: floating flat, arms and legs limp, dizzy. Drawn as if lying on the GROUND line from frame 3 on. No water and no splash drawn.'),
    dict(t='Saindo da água', sub='8 quadros', txt=PIA + 'Sheet: COMING UP OUT OF THE WATER, 8 frames, side view facing RIGHT. The bottom 45% of each cell is hidden by water in the game: draw the whole character, the game cuts it. 1: only the propeller visible above the WATER line (the GROUND line of the guide). 2-3: the head comes up. 4: up to the chest, shaking the head. 5-6: one arm waving to the judges. 7-8: both arms up, happy. No water drawn.'),
   ]),
   dict(h='Objetos', who='obj', p='Peças do lugar, em fundo verde, para o jogo montar a cena.', cards=[
    dict(t='Falésia com o farol', sub='anexe: referência de estilo', txt='Game prop, TALL 9:16, on a flat pure green background (#00FF00). Side view of a tall sea cliff that fills the whole height: the RIGHT edge of the cliff top is a clean, slightly overhanging lip of light rock (the diving edge), at about 12% from the top of the image; the rock face goes straight down from the lip to the bottom of the image, in warm sandstone layers with cracks and a few small plants. On the flat grassy top, near the LEFT side, a classic lighthouse with RED and WHITE stripes, a black lantern room with a yellow light and a red roof. Thick dark navy outline on the cliff and the lighthouse. ' + STYLE.replace('No text, no letters, no logos, no people, no characters.', 'Do not use any green color in the drawing itself. No text.')),
    dict(t='Barco dos jurados', sub='anexe: ficha do Amiguinho', txt='Game prop, wide 16:9, on a flat pure green background (#00FF00). A small wooden fishing boat seen from the side (bow to the LEFT), white with a red stripe, and FIVE Amiguinhos (round jelly blobs from the attached MODEL SHEET, without arms or legs, floating hands) sitting in a row inside it, in pink, orange, purple, gold and pink, each holding up a blank white score card with nothing written on it. Thick dark navy outline. Hand-painted cartoon style. No water drawn, no text.'),
   ]),
   dict(h='Cenário · Falésia do Farol', who='cen', p='Fundo em duas camadas: o céu e o mar ao longe, e a falésia por cima (pedida acima, como objeto). Quadrado, porque a câmera sobe junto com os saltos.', cards=[
    dict(t='Fundo distante · dia (versão base)', sub='anexe: referência de estilo', txt='Far background layer for a 2D side-view cliff-diving game, SQUARE 1:1 (the camera rises with the dive, so it needs a lot of sky). Place: open sea beside a high coastal cliff in a fictional sunny Brazilian coastal town called Costa WinnerZ. WINDY AFTERNOON, clean sky: the top 60% is bright blue sky with a few fast thin clouds; from 60% down: the open sea, deep blue and turquoise, small white caps, two small rocky islets on the horizon at the right, a distant green coastline on the far left. The sea goes down to the bottom of the image (the game draws the near water on top). Hazy and low in contrast. ' + STYLE),
   ] + [c for c in tod('penhasco', 'Fundo distante', 'Falésia', 'The lighthouse beam crosses the sky.', 'The lighthouse lantern is lit, warm yellow.', 'the moon, the brightest stars and their reflection on the sea', 'the lighthouse lantern and its beam') if not c['t'].startswith('Fundo distante · ') or True]),
  ]),
 dict(id='frescobol', n='Frescobol', lugar='Praia Lotada: domingo, guarda-sóis até o horizonte, jogo na beira d\'água. Capa: manhã de domingo (cores de guarda-sol sobre areia quente).',
  nota='No jogo agora: os personagens são os desenhos pintados do vôlei (espera, corrida e cortada no chão) com uma raquete desenhada pelo jogo. A praia é provisória.',
  groups=[
   dict(h='Modelo da raquete', who='obj', p='Primeiro pedido: a raquete e a bolinha sozinhas. Vira anexo fixo de todas as pranchas do frescobol.', cards=[
    dict(t='Folha de modelo da raquete e da bolinha', sub='não é 4x2', txt='Sheet: FRESCOBOL PADDLE MODEL SHEET for this game (not a 4x2 grid). A Brazilian beach paddle drawn in the same hand-painted cartoon style and thick dark navy outline as the character: a solid WOOD paddle, round-oval head, short handle wrapped with BLUE tape, warm honey wood color with a light grain. Show it 5 times in a row, same size: 1 front (flat face), 2 side (thin edge), 3 three-quarter, 4 held tilted 45 degrees, 5 back. Then, small on the right, the ball: a small bright YELLOW-ORANGE rubber ball, about 1/5 of the paddle head. The paddle is 45% of the character\'s standing height (see the MODEL SHEET). Flat pure green background (#00FF00), no text, no shadow.'),
   ]),
   dict(h='IAmiguinho com a raquete', who='ia', p='De lado, olhando para a direita, raquete na mão da frente (a do lado do público). Anexe sempre a folha da raquete aprovada.', cards=[
    dict(t='Espera com a raquete', sub='8 quadros · repete', txt=PIA + 'Also attached: the approved PADDLE MODEL (the only valid paddle, same size in every frame). Sheet: READY STANCE WITH A FRESCOBOL PADDLE, loop of 8 frames, side view facing RIGHT. Knees bent, body leaning slightly forward, the paddle held in the front hand in front of the chest, face of the paddle toward the right, the other hand open for balance. Small bounce on the balls of the feet: 1 ready, 2-4 down, 5-7 up, 8 flowing into frame 1.'),
    dict(t='Corrida com a raquete · parte 1', sub='quadros 1-8', txt=PIA + 'Also attached: the approved PADDLE MODEL. Sheet: SHORT RUN WITH A PADDLE, part 1 of 2 (frames 1-8) = one step, side view facing RIGHT, the paddle held in front of the chest the whole time (it barely moves). 1: right foot lands in front. 2: weight on it. 3: passing. 4: left foot swings forward. 5: push off. 6: in the air, left foot forward. 7: highest. 8: left foot about to land.'),
    dict(t='Corrida com a raquete · parte 2', sub='quadros 9-16', txt=PIA + 'Also attached: the approved PADDLE MODEL and the approved RUN part 1. Sheet: SHORT RUN WITH A PADDLE, part 2 of 2 (frames 9-16): the same as part 1 with feet and arms swapped, frame 16 flowing into part 1 frame 1. The paddle stays in front of the chest.'),
    dict(t='Rebatida · parte 1 (armando e contato)', sub='quadros 1-8 · contato no 8', txt=PIA + 'Also attached: the approved PADDLE MODEL. Sheet: FOREHAND HIT, part 1 of 2 (frames 1-8), side view facing RIGHT. 1: ready, paddle in front. 2-3: paddle swings back behind the body at shoulder height. 4: fully wound up, weight on the back foot. 5: swinging forward. 6: paddle at the side of the body. 7: paddle in front of the chest, almost flat. 8: CONTACT: arm extended forward at chest height, the paddle face flat and vertical facing right, as if a ball touches it.'),
    dict(t='Rebatida · parte 2 (depois do contato)', sub='quadros 9-16', txt=PIA + 'Also attached: the approved PADDLE MODEL and the approved FOREHAND HIT part 1. Sheet: FOREHAND HIT, part 2 of 2 (frames 9-16). 9: paddle continues forward and up. 10-11: follow-through, paddle across the body. 12-14: paddle comes back. 15-16: back to the ready stance with the paddle in front of the chest.'),
    dict(t='Pancada', sub='8 quadros · contato no 5', txt=PIA + 'Also attached: the approved PADDLE MODEL. Sheet: POWER SMASH WITH A PADDLE, 8 frames, side view facing RIGHT. 1: ready. 2: paddle pulled far back and high, body twisting. 3: maximum wind-up, determined. 4: whipping forward fast. 5: CONTACT: arm fully extended in front at chest height, paddle face flat facing right, body leaning into the hit. 6: big follow-through across the body. 7: recovering. 8: ready stance.'),
   ]),
   dict(h='Amiguinho com a raquete', who='bl', p='O parceiro. De lado, olhando para a direita (o jogo espelha). A raquete fica na mão flutuante da frente.', cards=[
    dict(t='Espera com a raquete', sub='8 quadros · repete', txt=PBL + 'Also attached: the approved PADDLE MODEL. Sheet: READY STANCE WITH A FRESCOBOL PADDLE, loop of 8 frames, side view facing RIGHT. The front floating hand holds the paddle in front of the body, paddle face toward the right; body leaning slightly forward and squashed a little. Jelly bounce: 1 ready, 2-4 squashing, 5-7 stretching, 8 flowing into frame 1.'),
    dict(t='Corrida com a raquete', sub='8 quadros · repete', txt=PBL + 'Also attached: the approved PADDLE MODEL. Sheet: BOUNCY RUN WITH A PADDLE, loop of 8 frames, side view facing RIGHT, the paddle held in front of the body the whole time. 1: foot lands, squash. 2: deepest squash. 3: stretching. 4: passing. 5: push off, tall. 6: in the air. 7: highest. 8: about to land, flowing into frame 1.'),
    dict(t='Rebatida · parte 1 (armando e contato)', sub='quadros 1-8 · contato no 8', txt=PBL + 'Also attached: the approved PADDLE MODEL. Sheet: FOREHAND HIT, part 1 of 2 (frames 1-8), side view facing RIGHT. 1: ready. 2-3: the paddle hand swings back behind the body, body twisting. 4: fully wound up, squashed. 5: swinging forward, stretching. 6: paddle beside the body. 7: paddle in front. 8: CONTACT: paddle in front of the body at visor height, face flat and vertical facing right.'),
    dict(t='Rebatida · parte 2 (depois do contato)', sub='quadros 9-16', txt=PBL + 'Also attached: the approved PADDLE MODEL and the approved FOREHAND HIT part 1. Sheet: FOREHAND HIT, part 2 of 2 (frames 9-16). 9: paddle continues forward and up. 10-11: follow-through, jelly wobble. 12-14: paddle comes back. 15-16: back to the ready stance.'),
    dict(t='Pancada', sub='8 quadros · contato no 5', txt=PBL + 'Also attached: the approved PADDLE MODEL. Sheet: POWER SMASH WITH A PADDLE, 8 frames, side view facing RIGHT. 1: ready. 2: paddle far back and high, body stretched back like a bow. 3: maximum wind-up. 4: whipping forward. 5: CONTACT: paddle in front of the body, face flat facing right, body stretched toward it. 6: big follow-through, squash. 7: wobble. 8: ready.'),
   ]),
   dict(h='Cenário · Praia Lotada', who='cen', p='Fundo em duas camadas, 16:9, como no vôlei. O jogo acontece na areia molhada, perto da água.', cards=[
    dict(t='Fundo distante · dia (versão base)', sub='anexe: referência de estilo', txt='Far background layer for a 2D side-view beach game, wide 16:9. Place: a crowded Brazilian beach on a Sunday in a fictional sunny coastal town called Costa WinnerZ. SUNDAY MORNING, bright: the top half is clear blue sky with a few soft clouds; a calm turquoise sea with small waves across the whole width at about 50% of the height, a few sailboats and a buoy far away, a green headland with a few houses on the right. Below the sea: a thin strip of dry sand with hundreds of tiny colorful beach umbrellas all the way to the horizon. The bottom 30% is plain warm sand (the game draws the play area on top). Hazy and low in contrast. ' + STYLE),
    dict(t='Meio-plano · dia (versão base)', sub='anexe: referência de estilo + fundo distante aprovado', txt='Mid-ground layer, wide 16:9, on a flat pure green background (#00FF00) everywhere there is sky, sea or empty space (it will be placed over the attached FAR LAYER, so match its light and perspective). Place: the crowded part of the beach behind the players. SUNDAY MORNING. From left to right, at 55-75% of the height: a row of big colorful beach umbrellas (red, yellow, blue, white, green, orange, purple, some striped), beach towels in bright patterns, two coolers, a bucket and spade, a sand castle, a beach chair, a little kiosk cart selling coconuts on the right; small round jelly blob creatures (Amiguinhos, in many colors, without arms or legs) relaxing under some umbrellas. Ground line at 78% of the height; the bottom 22% is empty (green). Do not use any green color in the drawing itself. ' + STYLE.replace('no people, no characters.', 'no people other than the small blob creatures.')),
   ] + tod('frescobol', 'Fundo distante', 'Meio-plano', 'A few lights on the headland houses.', 'Small string lights on the kiosk and lanterns on some umbrellas, warm.', 'the moon, the stars and the lit windows on the headland', 'the string lights of the kiosk and the lanterns')),
  ]),
]

data = []
for g in GAMES:
    data.append(dict(id=g['id'], n=g['n'], lugar=g['lugar'], nota=g['nota'], groups=[dict(h=x['h'], who=x['who'], p=x['p'], cards=x['cards']) for x in g['groups']]))
TOTAL = sum(len(x['cards']) for g in GAMES for x in g['groups'])
html = '''<title>Pedidos das provas novas</title>
<meta name="claude:viewport-fit-sides" content="cover">
''' + css + '''

<div class="wrap">
  <header>
    <span class="k">WinnerZ · IAmiguinho Jogos de Verão · estilo pintado</span>
    <h1>Pedidos das provas novas</h1>
    <p>As provas novas já estão jogáveis com arte provisória. Aqui ficam os pedidos das pranchas e dos cenários de cada uma, do mesmo jeito do vôlei e do skate: ficha de modelo e grade-guia em cada pedido de personagem. A página cresce a cada prova nova.</p>
  </header>
  <div class="bar"><span class="k">Provas novas</span><div class="prog"><span id="pg"></span><span class="meter"><i id="pm"></i></span></div></div>
  <div class="tips"><b>Como pedir</b><ol>
    <li>Personagens: use a mesma conversa (ou uma nova) com as regras do vôlei. As regras estão no passo 1 de cada personagem logo abaixo.</li>
    <li>Objetos que aparecem em várias pranchas (como a raquete) vêm primeiro: aprovados, viram anexo fixo dos pedidos seguintes.</li>
    <li>Cenários: primeiro a versão do dia; os outros horários saem dela, anexando a imagem aprovada.</li>
    <li>Me mande as imagens como forem saindo.</li>
  </ol></div>
  <main id="main" style="display:grid;gap:26px"></main>
</div>
<script>
const GAMES = ''' + json.dumps(data, ensure_ascii=False) + ''';
const RULES = { ia: ''' + json.dumps(RULES_IA, ensure_ascii=False) + ''', bl: ''' + json.dumps(RULES_BL, ensure_ascii=False) + ''' };
const TOTAL = ''' + str(TOTAL) + ''';
const KEY = 'pedidos-provas-novas-feitas';
let done = {};
try { done = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { done = {}; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {} };
function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function card(k, title, sub, text) {
  const isDone = !!done[k];
  return `<div class="card${isDone ? ' done' : ''}" data-k="${k}"><div class="top"><div class="t"><b>${esc(title)}</b><span>${esc(sub)}</span></div><div class="acts"><label class="chk"><input type="checkbox"${isDone ? ' checked' : ''}> Feita</label><button class="cp" type="button">Copiar</button></div></div><pre>${esc(text)}</pre></div>`;
}
function render() {
  let h = '';
  GAMES.forEach((g) => {
    h += `<section><h2>${esc(g.n)}</h2><p>${esc(g.lugar)}</p><p>${esc(g.nota)}</p></section>`;
    let n = 0;
    g.groups.forEach((x, gi) => {
      h += `<section><h2>${esc(x.h)} <small>${x.cards.length} ${x.cards.length > 1 ? 'pedidos' : 'pedido'}</small></h2><p>${esc(x.p)}</p>`;
      if ((x.who === 'ia' || x.who === 'bl') && !g.groups.slice(0, gi).some((y) => y.who === x.who)) h += card(`${g.id}-regras-${x.who}`, `Passo 1 · regras do ${x.who === 'ia' ? 'IAmiguinho' : 'Amiguinho'}`, 'mandar uma vez, com a ficha e a grade', RULES[x.who]);
      x.cards.forEach((c) => { n++; h += card(`${g.id}-${gi}-${n}`, `${n}. ${c.t}`, c.sub, c.txt); });
      h += '</section>';
    });
  });
  document.getElementById('main').innerHTML = h; prog();
}
function prog() { const c = Object.keys(done).filter((k) => !k.includes('-regras-')).length; document.getElementById('pg').textContent = `${c} de ${TOTAL} feitos`; document.getElementById('pm').style.width = (c / TOTAL * 100) + '%'; }
document.getElementById('main').addEventListener('click', async (e) => {
  const b = e.target.closest('button.cp'); if (!b) return;
  const pre = b.closest('.card').querySelector('pre');
  try { await navigator.clipboard.writeText(pre.textContent); b.textContent = 'Copiado'; b.classList.add('ok'); }
  catch (err) { const r = document.createRange(); r.selectNodeContents(pre); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); b.textContent = 'Selecionado'; }
  setTimeout(() => { b.textContent = 'Copiar'; b.classList.remove('ok'); }, 1600);
});
document.getElementById('main').addEventListener('change', (e) => {
  if (!e.target.matches('label.chk input')) return;
  const c = e.target.closest('.card'), k = c.dataset.k;
  if (e.target.checked) done[k] = 1; else delete done[k];
  c.classList.toggle('done', e.target.checked); save(); prog();
});
render();
</script>
'''
out = ROOT / 'novas_pedidos'; out.mkdir(exist_ok=True)
(out / 'index.html').write_text(html, encoding='utf-8')
print(TOTAL, 'pedidos', len(html) // 1024, 'KB')
