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
 dict(id='pingue', n='Pingue-pongue', lugar='Quiosque do Coqueiral: mesa de pingue-pongue na areia, ao lado de um quiosque de palha, coqueiros e varal de lampadinhas. Capa: noite (céu azul-escuro, luzes quentes).',
  nota='No jogo agora: anda livre, prepara a raquete antes da bola chegar e tem 4 golpes (rebater, cortada, efeito e toque curto), mais o balão lá de trás. Os personagens usam os desenhos do vôlei (espera, corrida, recuo, golpe no chão e andando agachado) com uma raquete desenhada pelo jogo. O quiosque, os coqueiros e a mesa são provisórios, desenhados pelo jogo.',
  groups=[
   dict(h='Modelo da raquete', who='obj', p='Primeiro pedido: a raquete e a bolinha sozinhas. Vira anexo fixo de todas as pranchas do pingue-pongue.', cards=[
    dict(t='Folha de modelo da raquete e da bolinha', sub='não é 4x2', txt='Sheet: TABLE TENNIS PADDLE MODEL SHEET for this game (not a 4x2 grid). A table tennis paddle drawn in the same hand-painted cartoon style and thick dark navy outline as the character: a round head with a RED rubber face on one side and a BLACK rubber face on the other, a thin wooden edge, a short light-wood handle. Show it 5 times in a row, same size: 1 red face, 2 side (thin edge), 3 three-quarter, 4 tilted 45 degrees, 5 black face. Then, small on the right, the ball: a small WHITE ball, about 1/4 of the paddle head. The paddle is 30% of the character\'s standing height (see the MODEL SHEET). Flat pure green background (#00FF00), no text, no shadow.'),
   ]),
   dict(h='IAmiguinho com a raquete', who='ia', p='De lado, olhando para a direita (para a mesa), raquete na mão da frente. Anexe sempre a folha da raquete aprovada. A mesa não aparece: o jogo desenha.', cards=[
    dict(t='Espera com a raquete', sub='8 quadros · repete', txt=PIA + 'Also attached: the approved PADDLE MODEL (the only valid paddle, same size in every frame). Sheet: TABLE TENNIS READY STANCE, loop of 8 frames, side view facing RIGHT. Knees bent, body leaning forward, the paddle held in the front hand at waist height in front of the body, red face toward the right, the other hand open for balance. Small bounce on the balls of the feet: 1 ready, 2-4 down, 5-7 up, 8 flowing into frame 1.'),
    dict(t='Passinhos com a raquete', sub='8 quadros · repete', txt=PIA + 'Also attached: the approved PADDLE MODEL. Sheet: QUICK SIDE SHUFFLE WITH A PADDLE, loop of 8 frames, side view facing RIGHT: small fast steps forward and back along the table, knees bent the whole time, the paddle stays in front of the waist (it barely moves). 1: feet apart. 2: back foot slides toward the front foot. 3: feet close. 4: front foot steps out. 5-8: the same again, frame 8 flowing into frame 1.'),
    dict(t='Rebatida', sub='8 quadros · contato no 4', txt=PIA + 'Also attached: the approved PADDLE MODEL. Sheet: FOREHAND TOPSPIN HIT, 8 frames, side view facing RIGHT. 1: ready. 2: paddle low and back, beside the back knee, body turned a little. 3: swinging forward and up. 4: CONTACT: arm forward at chest height, the paddle in front of the body, red face toward the right and tilted slightly down. 5: follow-through up, paddle near the forehead. 6-7: coming back down. 8: ready stance.'),
    dict(t='Cortada', sub='8 quadros · contato no 4', txt=PIA + 'Also attached: the approved PADDLE MODEL. Sheet: TABLE TENNIS SMASH, 8 frames, side view facing RIGHT. 1: ready. 2: paddle raised high above the shoulder, body stretched up, eyes on the ball, determined. 3: whipping down and forward fast. 4: CONTACT: arm fully extended in front at head height, paddle face flat facing right and down, body leaning into the hit, a little jump (both feet slightly off the GROUND line). 5: big follow-through down across the body, landing. 6-7: recovering. 8: ready stance.'),
    dict(t='Bola com efeito', sub='8 quadros · contato no 4', txt=PIA + 'Also attached: the approved PADDLE MODEL. Sheet: BACKSPIN CHOP, soft short hit, 8 frames, side view facing RIGHT. 1: ready. 2: paddle raised to shoulder height, face OPEN (tilted up). 3: slicing down and forward, slowly, body low. 4: CONTACT: paddle in front of the body at table height, face open upward, cutting under the ball, focused face. 5: paddle finishes low in front, gentle. 6-7: coming back. 8: ready stance.'),
    dict(t='Saque', sub='8 quadros · contato no 6', txt=PIA + 'Also attached: the approved PADDLE MODEL. Sheet: TABLE TENNIS SERVE, 8 frames, side view facing RIGHT. 1: standing, the free hand flat with the ball on the palm, paddle low behind. 2: tossing the ball straight up (draw the ball above the hand). 3: hand comes down, eyes up on the ball (draw the ball higher). 4: paddle pulled back. 5: swinging forward low. 6: CONTACT: paddle in front at waist height, red face toward the right. 7: short follow-through. 8: ready stance. Draw the white ball only in frames 1-3.'),
    dict(t='Andando com a raquete preparada', sub='8 quadros · repete', txt=PIA + 'Also attached: the approved PADDLE MODEL. Sheet: WALKING WITH THE PADDLE PULLED BACK, ready to hit, loop of 8 frames, side view facing RIGHT. Knees bent, body low, eyes forward, the paddle held back beside the hip (wound up), the other arm forward for balance. Small quick steps forward: 1 right foot forward, 2 weight on it, 3 passing, 4 left foot forward, 5-8 the same with feet swapped, frame 8 flowing into frame 1. The paddle stays back the whole time.'),
    dict(t='Balão (defesa lá atrás)', sub='8 quadros · contato no 5', txt=PIA + 'Also attached: the approved PADDLE MODEL. Sheet: DEFENSIVE LOB far from the table, 8 frames, side view facing RIGHT. 1: running back, looking up. 2: stopping, knees deep, the paddle very low near the ground behind. 3-4: lifting the paddle from low to high. 5: CONTACT: paddle in front at knee height, face open upward, lifting the ball high. 6: follow-through high above the head. 7: stepping forward again. 8: ready stance.'),
   ]),
   dict(h='Amiguinho com a raquete', who='bl', p='O adversário. De lado, olhando para a direita (o jogo espelha). A raquete fica na mão flutuante da frente.', cards=[
    dict(t='Espera com a raquete', sub='8 quadros · repete', txt=PBL + 'Also attached: the approved PADDLE MODEL. Sheet: TABLE TENNIS READY STANCE, loop of 8 frames, side view facing RIGHT. The front floating hand holds the paddle in front of the body at the middle height, red face toward the right; body leaning slightly forward and squashed a little. Jelly bounce: 1 ready, 2-4 squashing, 5-7 stretching, 8 flowing into frame 1.'),
    dict(t='Passinhos com a raquete', sub='8 quadros · repete', txt=PBL + 'Also attached: the approved PADDLE MODEL. Sheet: QUICK SIDE HOPS WITH A PADDLE, loop of 8 frames, side view facing RIGHT: small fast jelly hops forward and back along the table, the paddle stays in front of the body. 1: squash. 2: push off. 3: small hop. 4: land, squash. 5-8: the same again, frame 8 flowing into frame 1.'),
    dict(t='Rebatida', sub='8 quadros · contato no 4', txt=PBL + 'Also attached: the approved PADDLE MODEL. Sheet: FOREHAND TOPSPIN HIT, 8 frames, side view facing RIGHT. 1: ready. 2: the paddle hand goes low and back, body twisting and squashing. 3: swinging forward and up, stretching. 4: CONTACT: paddle in front of the body at visor height, red face toward the right. 5: follow-through up. 6-7: jelly wobble, paddle coming back. 8: ready.'),
    dict(t='Cortada', sub='8 quadros · contato no 4', txt=PBL + 'Also attached: the approved PADDLE MODEL. Sheet: TABLE TENNIS SMASH, 8 frames, side view facing RIGHT. 1: ready. 2: paddle raised high above the body, body stretched tall like a bow. 3: whipping down. 4: CONTACT: paddle in front, above the visor, face flat facing right and down, body leaning in, a small hop off the GROUND line. 5: big follow-through down, landing squash. 6-7: wobble. 8: ready.'),
    dict(t='Bola com efeito', sub='8 quadros · contato no 4', txt=PBL + 'Also attached: the approved PADDLE MODEL. Sheet: BACKSPIN CHOP, soft short hit, 8 frames, side view facing RIGHT. 1: ready. 2: paddle raised, face OPEN (tilted up). 3: slicing down and forward, body low and squashed. 4: CONTACT: paddle in front of the body at low height, face open upward. 5: paddle finishes low in front. 6-7: coming back. 8: ready.'),
    dict(t='Saque', sub='8 quadros · contato no 6', txt=PBL + 'Also attached: the approved PADDLE MODEL. Sheet: TABLE TENNIS SERVE, 8 frames, side view facing RIGHT. 1: the back floating hand holds the white ball flat, paddle low behind. 2: tossing the ball up (draw it above the hand). 3: watching it go up (draw it higher). 4: paddle pulled back, squash. 5: swinging forward. 6: CONTACT: paddle in front at the middle height. 7: follow-through. 8: ready. Draw the ball only in frames 1-3.'),
    dict(t='Andando com a raquete preparada', sub='8 quadros · repete', txt=PBL + 'Also attached: the approved PADDLE MODEL. Sheet: HOPPING WITH THE PADDLE PULLED BACK, ready to hit, loop of 8 frames, side view facing RIGHT. Body low and squashed, the paddle hand held back beside the body (wound up), small quick jelly hops forward: 1 squash, 2 push off, 3 small hop, 4 land, 5-8 the same again, frame 8 flowing into frame 1.'),
    dict(t='Balão (defesa lá atrás)', sub='8 quadros · contato no 5', txt=PBL + 'Also attached: the approved PADDLE MODEL. Sheet: DEFENSIVE LOB far from the table, 8 frames, side view facing RIGHT. 1: hopping back, visor looking up. 2: deep squash, the paddle very low behind. 3-4: stretching up, paddle rising. 5: CONTACT: paddle in front at low height, face open upward. 6: follow-through high. 7: wobble. 8: ready.'),
   ]),
   dict(h='Objetos', who='obj', p='Peças do lugar, em fundo verde, para o jogo montar a cena.', cards=[
    dict(t='Mesa de pingue-pongue de lado', sub='anexe: referência de estilo + ficha do IAmiguinho', txt='Game prop, wide 16:9, on a flat pure green background (#00FF00). A table tennis table seen EXACTLY from the side (no perspective): a thin dark teal tabletop with a white edge line, across the middle of the image; the NET in the exact center, a low white mesh with a white top band and two small posts; four simple dark navy metal legs with small feet. The tabletop is as high as the CHEST of the IAmiguinho in the attached MODEL SHEET and fills 80% of the image width. A little sand on the feet. Thick dark navy outline. Do not use any green color in the drawing itself. ' + STYLE.replace('No text, no letters, no logos, no people, no characters.', 'No text, no people, no characters.')),
   ]),
   dict(h='Cenário · Quiosque do Coqueiral', who='cen', p='Fundo em duas camadas, 16:9, como no vôlei. A capa é a noite: peça o dia primeiro (é a base dos outros horários), mas o jogo abre à noite.', cards=[
    dict(t='Fundo distante · dia (versão base)', sub='anexe: referência de estilo', txt='Far background layer for a 2D side-view beach game, wide 16:9. Place: a quiet beach with coconut trees in a fictional sunny Brazilian coastal town called Costa WinnerZ. AFTERNOON, bright: the top half is clear blue sky with a few soft clouds; a calm turquoise sea across the whole width at about 48% of the height, small waves, a fishing boat and a jangada (raft with a triangular sail) far away, a low green point with coconut trees on the left. The bottom 35% is plain warm sand (the game draws the play area on top). Hazy and low in contrast. ' + STYLE),
    dict(t='Meio-plano · dia (versão base)', sub='anexe: referência de estilo + fundo distante aprovado', txt='Mid-ground layer, wide 16:9, on a flat pure green background (#00FF00) everywhere there is sky, sea or empty space (it will be placed over the attached FAR LAYER, so match its light and perspective). Place: a small beach kiosk with a thatched straw roof, in the CENTER, with a wooden counter, a few stools, coconuts piled on the counter, a small blackboard with no writing; tall coconut trees on the far left and on the right, leaning; a string of small round light bulbs hanging in two soft curves across the whole width at about 30% of the height (bulbs OFF in the day); two small round jelly blob creatures (Amiguinhos, without arms or legs) sitting at the counter drinking from coconuts. Ground line at 80% of the height; the bottom 20% is empty (green). Do not use any green color in the drawing itself. ' + STYLE.replace('no people, no characters.', 'no people other than the small blob creatures.')),
   ] + tod('pingue', 'Fundo distante', 'Meio-plano', 'A few lights of the fishing boats on the sea.', 'The string light bulbs are ON, warm yellow, orange, pink and light blue; a warm lamp inside the kiosk.', 'the moon, the stars and the lights of the fishing boats', 'the string light bulbs and the kiosk lamp')),
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
