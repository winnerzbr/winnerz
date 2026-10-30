import json, re, sys
sys.path.insert(0, 'skate'); from moves import MOVES, SCENE, SCENE_PISTA, COMBOS
V = open('moveset_volei/index.html').read()
css = V[V.index('<link rel="preconnect"'):V.index('</style>') + 8].replace('</style>', '.aps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px }\n@media (max-width: 520px) { .aps { grid-template-columns: 1fr 1fr } }\na.ap { display: grid; gap: 4px; text-decoration: none; color: var(--mut); font: 500 12px var(--f-mono) }\na.ap img { width: 100%; height: auto; border-radius: 8px; border: 1px solid var(--line); display: block }\na.ap:hover span { color: var(--ink) }\n</style>')
rules_ia = re.search(r"  ia: `(.*?)`,\n  bl:", V, re.S).group(1)
rules = rules_ia.replace("Reply \"ok\" and wait for my first sheet request.", """SKATEBOARD RULES (this game is a skateboard half-pipe):
- The skateboard is always the SAME board, from the attached SKATEBOARD MODEL: orange deck, black grip tape, grey trucks, four white wheels, same thick dark navy outline. Its length is 75% of the character's standing height and it never changes size.
- Draw every frame UPRIGHT, as on flat ground, even in the air and on the ramp edge: the game rotates the whole drawing to follow the ramp and the flight. Do not draw the ramp.
- On the board, the four WHEELS touch the GROUND line of the guide grid (not the feet). The character keeps exactly the same size as in the model sheet, so standing on the board the propeller goes a little above the PROPELLER TOP line: that is correct.
- Feet stand across the board, front foot over the front truck and back foot over the tail. When the prompt says "board stuck to the feet", the board stays under the shoes as if glued.
- Never draw ramps, ground, sparks or effects unless the prompt asks for them.
Reply "ok" and wait for my first sheet request.""").replace("no ball, ", "")
# Pedidos: o modelo do skate é anexado em todo pedido depois que for aprovado; as pranchas só do skate não levam a ficha do personagem
for i, m in enumerate(MOVES):
    for j, s in enumerate(m['sheets']):
        pose = s['ref'] is not None
        if i == 0:
            pre = 'Attached: the character MODEL SHEET, only to know the size (the board length is 75% of his standing height). Draw only the board.\n\n'
        elif m.get('prop'):
            pre = ('Attached: the SKATEBOARD MODEL (draw exactly this board, same size in every frame) and the GUIDE GRID (use only its 4x2 cell layout; there is no character in this sheet). '
                   + ('Also attached: the POSE REFERENCE (gray sheet): copy the angle of the board in each frame from the frame in the same position (1 = top left, 8 = bottom right). ' if pose else '')
                   + 'Do not draw the guide lines, labels or numbers.\n\n')
        else:
            pre = ('Attached: the MODEL SHEET (the only valid proportions), the GUIDE GRID (draw on exactly this layout), the SKATEBOARD MODEL (the only valid board)'
                   + ('' if (i, j) == (1, 0) else ', plus the approved STANDING ON THE SKATEBOARD sheet for size') + '. '
                   + ('Also attached: the POSE REFERENCE (gray sheet, an old low-resolution version). Copy the pose of each frame from the frame in the same position of the gray sheet (1 = top left, 8 = bottom right): which arm and leg are forward, how they bend and where the hands are; blank cells are in-betweens. Do NOT copy its sizes or proportions, and if the board is missing there, still draw the board as this prompt says. ' if pose else '')
                   + 'In every frame the head has the size of the space between the CAP TOP and CHIN lines, and the body, arms and legs keep the model-sheet size, whatever the pose. Do not draw the guide lines, labels or numbers.\n\n')
        s['full'] = pre + s['txt']
        s['img'] = f'pose/sk_{i}_{j}.jpg' if pose else None
data = [dict(n=m['n'], use=m['use'], sheets=[dict(t=s['t'], full=s['full'], img=s['img']) for s in m['sheets']]) for m in MOVES]
html = '''<title>Moveset do Skate</title>
<meta name="claude:viewport-fit-sides" content="cover">
''' + css + '''

<div class="wrap">
  <header>
    <span class="k">WinnerZ · IAmiguinho Jogos de Verão · estilo pintado</span>
    <h1>Moveset do Skate</h1>
    <p>O half-pipe do IAmiguinho no estilo pintado, do mesmo jeito que foi feito no vôlei: ficha de modelo, grade-guia e referência de pose em cinza em cada pedido. São 26 pedidos de pranchas (o modelo do skate e 25 pranchas de 8 quadros) e, no fim, o cenário do Skatepark do Viaduto.</p>
  </header>

  <div class="bar">
    <span class="k">IAmiguinho</span>
    <div class="prog"><span id="pg"></span><span class="meter"><i id="pm"></i></span></div>
  </div>

  <div class="tips">
    <b>Como pedir</b>
    <ol>
      <li>Abra uma conversa nova. Mande a ficha de modelo e a grade-guia (logo abaixo) junto com as regras do passo 1.</li>
      <li>Comece pelo <b>modelo do skate</b>. Quando ele ficar bom, ele vira o terceiro anexo fixo: ficha, grade e modelo do skate em todo pedido.</li>
      <li>Depois faça o <b>Parado no skate</b>. Aprovado, anexe ele também em todos os pedidos seguintes, como referência de tamanho.</li>
      <li>Anexe a referência de pose em cinza de cada cartão. Ela vem do jogo antigo em 16 bits: serve só para a pose, os tamanhos vêm da ficha e da grade. Quadros em branco são intermediários que o ChatGPT completa.</li>
      <li>Desenhos sempre em pé, mesmo no ar e na borda: o jogo gira a figura para acompanhar a rampa e o voo.</li>
      <li>Se um quadro sair errado, use a edição do próprio ChatGPT só naquele quadro, como no vôlei. Me mande as pranchas como forem saindo.</li>
    </ol>
  </div>

  <main id="main" style="display:grid;gap:26px"></main>
</div>

<script>
const RULES = ''' + json.dumps(rules, ensure_ascii=False) + ''';
const MOVES = ''' + json.dumps(data, ensure_ascii=False) + ''';
const SCENE = ''' + json.dumps(SCENE, ensure_ascii=False) + ''';
const PISTA = ''' + json.dumps(SCENE_PISTA, ensure_ascii=False) + ''';
const COMBOS = ''' + json.dumps(COMBOS, ensure_ascii=False) + ''';
const TOTAL = MOVES.reduce((a, m) => a + m.sheets.length, 0) + SCENE.length + PISTA.length + COMBOS.length;
const KEY = 'moveset-skate-feitas';
let done = {};
try { done = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { done = {}; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {} };
function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function card(k, title, sub, text, extra) {
  const isDone = !!done[k];
  return `<div class="card${isDone ? ' done' : ''}" data-k="${k}"><div class="top"><div class="t"><b><span class="who" aria-hidden="true"></span>${esc(title)}</b><span>${esc(sub)}</span></div><div class="acts">${k === 'rules' ? '' : `<label class="chk"><input type="checkbox" ${isDone ? 'checked' : ''}>Feita</label>`}<button class="cp" type="button">Copiar</button></div></div><pre>${esc(text)}</pre>${extra || ''}</div>`;
}
const ap0 = (f, t) => `<a class="ap"><img src="aprovadas/${f}.jpg" alt="${t}" loading="lazy"><span>${t}</span></a>`;
function render() {
  let h = `<section><h2>Passo 1 · regras <small>mandar uma vez, com a ficha e a grade</small></h2><p>As mesmas regras do vôlei, mais as regras do skate. Cole isto junto com a ficha de modelo e a grade-guia, e só depois peça as pranchas.</p>${card('rules', 'Regras das pranchas · skate', 'cole primeiro', RULES)}</section>`;
  h += `<section><h2>Anexos fixos <small>ficha de modelo e grade-guia</small></h2><p>As mesmas do vôlei (ficha_iamiguinho.png e grade_iamiguinho.png). Depois que o modelo do skate for aprovado, ele entra junto nos anexos fixos.</p><div class="aps">${ap0('modelo_do_skate', 'Modelo do skate (aprovado)')}${ap0('aprovada_parado_no_skate', 'Parado no skate (aprovado)')}</div><div class="thumbs"><img src="ficha/ficha_iamiguinho.png" alt="Ficha de modelo do IAmiguinho com as quatro vistas e as linhas de proporção"><img src="ficha/grade_iamiguinho.png" alt="Grade-guia em 4 por 2 quadros com as linhas de proporção"></div></section>`;
  let n = 0;
  MOVES.forEach((m, i) => {
    h += `<section><h2>${esc(m.n)} <small>${i === 0 ? 'uma imagem' : m.sheets.length * 8 + ' quadros · ' + m.sheets.length + (m.sheets.length > 1 ? ' pranchas' : ' prancha')}</small></h2><p>${esc(m.use)}</p>`;
    m.sheets.forEach((s, j) => {
      n++;
      const pimg = s.img ? `<figure class="pose"><img src="${s.img}" alt="Referência de pose desta prancha, feita com os desenhos antigos em cinza" loading="lazy"><figcaption>Referência de pose (anexe junto): toque e segure a imagem para salvar</figcaption></figure>` : '';
      h += card(i + '-' + j, `${n}. ${m.n}`, s.t, s.full, pimg);
    });
    h += '</section>';
  });
  h += `<section><h2>Manobras combinadas com giro <small>${COMBOS.length} pranchas</small></h2><p>Segurando a manobra e girando (◀ ou ▶) por meia volta ou mais, ela vira uma manobra nova, com nome próprio e mais pontos. Cada uma tem uma prancha: a pose da manobra parada, vista de 8 lados enquanto ele gira. Anexe a prancha aprovada da manobra e as duas do giro no ar, além da ficha, da grade e do modelo do skate. Já funcionam no jogo; até a prancha chegar, o giro mostra as vistas do giro normal.</p>`;
  const ap = (f, t) => `<a class="ap"><img src="aprovadas/${f}.jpg" alt="${esc(t)}" loading="lazy"><span>${esc(t)}</span></a>`;
  COMBOS.forEach((c, j) => { h += card('cb-' + j, `G${j + 1}. ${c.n}`, c.btn, c.txt, `<figure class="pose"><figcaption>Anexe junto (os arquivos também estão na conversa com o Claude):</figcaption><div class="aps">${ap('aprovada_' + c.img, 'Prancha aprovada da manobra')}${ap('aprovada_giro_parte1', 'Giro no ar · parte 1')}${ap('aprovada_giro_parte2', 'Giro no ar · parte 2')}</div><figcaption>e também a ficha, a grade e o modelo do skate (em Anexos fixos).</figcaption></figure>`); });
  h += '</section>';
  h += `<section><h2>Cenário · Skatepark do Viaduto <small>${SCENE.length} pedidos</small></h2><p>O lugar do Half-pipe na Costa WinnerZ (bairro Cidade): concreto ao lado e embaixo de um viaduto, grafites e postes, em azul-noite, ciano e magenta. Como diz o plano visual, o cenário existe nos 4 horários e o jogo mostra o do relógio de quem joga; a capa é a da noite. Comece pelas duas versões do dia: as outras saem delas, com o mesmo desenho e só outra luz. A rampa, a pista, o deck e o corrimão continuam os que você já fez.</p><p>Anexe a referência de estilo (estilo_cenario.jpg, a praia pintada) nos pedidos que pedem; nos de outro horário, anexe só a versão indicada no cartão.</p><div class="thumbs"><img src="ficha/estilo_cenario.jpg" alt="Referência de estilo: a praia pintada do vôlei"></div>`;
  SCENE.forEach((s, j) => { h += card('vd-' + j, `V${j + 1}. ${s.t}`, s.sub, s.txt); });
  h += '</section>';
  h += `<section><h2>Peças da pista <small>já entregues</small></h2><p>Já estão no jogo. O calçadão fica para as provas da orla; no skatepark entra o chão de concreto acima.</p>`;
  PISTA.forEach((s, j) => { h += card('cen-' + j, `C${j + 1}. ${s.t}`, 'entregue', s.txt); });
  h += '</section>';
  document.getElementById('main').innerHTML = h;
  prog();
}
function prog() {
  const c = Object.keys(done).filter((k) => k !== 'rules').length;
  document.getElementById('pg').textContent = `${c} de ${TOTAL} feitas`;
  document.getElementById('pm').style.width = (c / TOTAL * 100) + '%';
}
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
open('skate_moveset/index.html', 'w').write(html)
print(sum(len(m['sheets']) for m in MOVES), len(html))
