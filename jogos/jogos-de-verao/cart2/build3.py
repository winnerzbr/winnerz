"""Jogos de Verão (versão de trabalho): o jogo inteiro em 16 bits, com o vôlei no estilo pintado.
Fonte: verao/index.html (o backup em 16 bits). Saída: jogos_verao/index.html."""
import pathlib
HERE = pathlib.Path(__file__).resolve().parent; ROOT = HERE.parent
s = (ROOT / 'verao' / 'index.html').read_text(encoding='utf-8')
def sub1(old, new, text):
    assert text.count(old) == 1, (old[:80], text.count(old)); return text.replace(old, new)
# vôlei: menus em HTML como as outras provas (a interface pintada vem depois)
s = sub1("const vuiOn = () => cur === volei && !seq;", "const vuiOn = () => false; // vôlei pintado: menus em HTML por enquanto", s)
# 30/10/2026: o dono tirou Salto de hélice, Corrida do isopor e Minigolfe (o minigolfe vai para o Arcade do IAmiguinho).
# O código delas continua no backup em 16 bits (verao/index.html); só saem da lista.
# 30/10/2026 · vôlei, ajustes pedidos pelo dono depois de jogar com a arte pintada:
# 1) partida normal até 7 e a final até 10 (torneio e Copa)
s = sub1("t1: { name: 'Amiguinho Rosa', tier: 'fácil', O: '#e86fa8', o: '#b24f80', lvl: .05, pts: 5 },", "t1: { name: 'Amiguinho Rosa', tier: 'fácil', O: '#e86fa8', o: '#b24f80', lvl: .05, pts: 7 },", s)
s = sub1("t2: { name: 'Amiguinho Laranja', tier: 'médio', O: '#f08a3c', o: '#b8602a', lvl: .45, pts: 5 },", "t2: { name: 'Amiguinho Laranja', tier: 'médio', O: '#f08a3c', o: '#b8602a', lvl: .45, pts: 7 },", s)
s = sub1("t3: { name: 'Amiguinho Roxo', tier: 'difícil', O: '#9a7cf0', o: '#6c52b8', lvl: .75, pts: 5 },", "t3: { name: 'Amiguinho Roxo', tier: 'difícil', O: '#9a7cf0', o: '#6c52b8', lvl: .75, pts: 7 },", s)
s = sub1("lvl: 1.02, pts: 7, crown: true },", "lvl: 1.02, pts: 10, crown: true },", s)
s = sub1("const COPA_PTS = { g0: 5, g1: 5, g2: 5, oitavas: 5, quartas: 7, semi: 7, final: 7 };", "const COPA_PTS = { g0: 7, g1: 7, g2: 7, oitavas: 7, quartas: 7, semi: 7, final: 10 };", s)
# 2) cortada carregada até o fim sai mais rápida (até +14% na carga máxima)
s = sub1("vm = K.vmax * (.8 + .3 * pow) * eff;", "vm = K.vmax * (.8 + .3 * pow + .6 * Math.max(0, pow - .75)) * eff;", s)
# 3) adversários fortes: a IA se posicionava longe demais da bola quando ia cortar e, se a cortada não saía,
#    a bola batia de lado na cabeça e ia reta para a rede (quase todos os pontos que o Amiguinho Dourado perdia).
#    Quanto mais forte, mais perto da bola ele se posiciona (simulação: erros por toque de 5,6% para 2,3%; cortadas por partida 3,8 → 7).
s = sub1("A.mode = 'hit'; A.tx = clamp(pr.x + behind * (A.spOK ? rand(13, 17) :", "A.mode = 'hit'; A.tx = clamp(pr.x + behind * (A.spOK ? rand(13, 17) - 8.5 * clamp(((cfg.lvl ?? .45) - .3) / .6, 0, 1) :", s)
# 4) dificuldade que se adapta ao placar: nos adversários fortes vale sempre (antes era sorteada a cada partida)
s = sub1("this.moody = !this.two && Math.random() < .45 + .45 * this.baseLvl();", "this.moody = !this.two && (this.baseLvl() >= .7 || Math.random() < .45 + .45 * this.baseLvl());", s)
# 30/10/2026 · vôlei: cérebro novo do Amiguinho (simula o toque antes, cortadas, saque com cortada, peixinho para o lado certo)
s = sub1("const EVENTS = [surfe,", (HERE / 'aivolei.js').read_text(encoding='utf-8') + "\nconst EVENTS = [surfe,", s)
# Os textos não dizem mais quantas provas são, porque o número vai mudar com as provas novas.
s = sub1("<p>Dezenove provas na orla com o IAmiguinho, do surfe ao vôlei de praia.", "<p>Provas na orla com o IAmiguinho, do surfe ao vôlei de praia.", s)
s = sub1("say('Boas-vindas à orla! Dezenove provas e sete por semana valendo pódio. Todas minhas, em teoria.');",
         "say('Boas-vindas à orla! Toda semana, sete provas valendo pódio. Todas minhas, em teoria.');", s)
s = sub1("const EVENTS = [surfe, halfpipe, embaixadinha, patins, basquete, salto, planador, isopor, bmx, obstaculos, frisbee, arco, minigolfe, duelo, canoagem, futebol, natacao, jetski, volei];",
         "const EVENTS = [surfe, halfpipe, embaixadinha, patins, basquete, salto, bmx, obstaculos, frisbee, arco, duelo, canoagem, futebol, natacao, jetski, volei];", s)
# provas novas (30/10/2026): cada uma num arquivo ev_*.js, entra antes da lista de provas.
# O dono reprovou o Salto do penhasco e o Frescobol (as ideias e a jogabilidade): saíram, e o Salto do píer também saiu de vez.
NOVAS = ['ev_pingue.js', 'ev_bocha.js', 'ev_bugue.js']

s = sub1("const EVENTS = [surfe,", ''.join((HERE / f).read_text(encoding='utf-8') + '\n' for f in NOVAS) + "const EVENTS = [surfe,", s)
s = sub1("const EVENTS = [surfe, halfpipe, embaixadinha, patins, basquete, salto, bmx,", "const EVENTS = [surfe, halfpipe, embaixadinha, patins, basquete, pingue, bmx,", s)
s = sub1("futebol, natacao,", "futebol, bocha, natacao,", s)
s = sub1("jetski, volei];", "jetski, bugue, volei];", s)
s = sub1("const RANK = {\n", "const RANK = {\n  bugue: [['@rafa', 3000], ['@bia', 2200], ['@duda', 1600], ['@carol', 1100]],\n", s)
s = sub1("const RANK = {\n", "const RANK = {\n  bocha: [['@bia', 2100], ['@rafa', 1700], ['@carol', 900], ['@duda', 500]],\n", s)
s = sub1("const RANK = {\n", "const RANK = {\n  pingue: [['@rafa', 2300], ['@bia', 1800], ['@duda', 1100], ['@carol', 600]],\n", s)

# cabeçalho do menu das provas de placar: o do vôlei era fixo; as provas novas usam medShort e menu2
s = sub1("h = cur.two ? [['Modo', '2 jogadores'], ['Placar', 'até 7'], ['Toques', '3 por lado'], ['Pódio', 'não conta']] : [['Seu recorde', best[cur.id] ? nf(best[cur.id]) : '—'], ['Bronze', 'Perder por ≤2'], ['Prata', 'Vencer'], ['Ouro', 'Vencer por 4+']];",
         "h = cur.two ? (cur.menu2 || [['Modo', '2 jogadores'], ['Placar', 'até 7'], ['Toques', '3 por lado'], ['Pódio', 'não conta']]) : [['Seu recorde', best[cur.id] ? nf(best[cur.id]) : '—'], ...(cur.medShort || ['Perder por ≤2', 'Vencer', 'Vencer por 4+']).map((x, i) => [['Bronze', 'Prata', 'Ouro'][i], x])];", s)
# 2 jogadores no computador nas provas novas que têm (o mesmo botão do vôlei)
s = sub1("  if (seq || touch) volei.two = false;\n", "  if (seq || touch) { volei.two = false; for (const e of EVENTS) if (e.two2) e.two = false; }\n", s)
s = sub1("  setButtons(['Jogar', start], null);\n}\nfunction startDOM() {",
         "  if (!seq && cur.menuDOM && cur.menuDOM()) return; // provas novas com modos próprios (bugue: Corrida, Copa das Dunas e a pista)\n"
         "  setButtons(['Jogar', start], null);\n"
         "  if (cur.two2 && !seq && !touch) { const ev = cur, b2 = $('b-alt2'); b2.hidden = false; b2.textContent = `2 jogadores: ${ev.two ? 'ligado' : 'desligado'}`; b2.setAttribute('aria-pressed', String(ev.two)); actAlt2 = () => { ev.two = !ev.two; showTitle(); renderHud(); setTimeout(() => $('b-alt2').focus({ preventScroll: true }), 0); }; }\n"
         "}\nfunction startDOM() {", s)
# 31/10 · embaixadinha (pedidos do dono): rotação de bolas e física pelo peso de cada uma; sem a bola extra e sem as marcas
# das alturas de toque em volta do IAmiguinho.
# Rotação: séries 1 a 4 com a bola de futebol; da 5 em diante, de 4 em 4: praia (5, 9, 13...), bolinha de gude (6, 10, 14...),
# pingue-pongue (7, 11, 15...) e futebol (8, 12, 16...). A bola extra (duas ao mesmo tempo) saiu da rotação.
# Física: cada bola tem gravidade, resistência do ar (as leves chegam a uma velocidade máxima de queda), quanto o vento leva,
# quanto sobe e se espalha no toque, quanto a firula curva, quanto quica e rola no chão e se "dança" no ar.
# A sombra e o tempo do toque são calculados com a mesma física (resistência do ar incluída), então continuam certos.
s = sub1("const EB_NOVO = { 2: 'Série 2', 3: 'Vento!', 4: 'Gaivota!', 5: 'Bola de praia!', 6: 'Bola extra!' };",
         "const EB_NOVO = { 2: 'Série 2', 3: 'Vento!', 4: 'Gaivota!', 5: 'Bola de praia!', 6: 'Bolinha de gude!', 7: 'Bola de pingue-pongue!', 8: 'Bola de futebol!' };\n"
         "// bolas pelo peso: g = gravidade, ar = resistência do ar, vento, sobe e espalha no toque, curva da firula, quica e rola no chão,\n"
         "// giro (desenho), dança (desvio de lado a cada toque), r = raio\n"
         "const EB_BOLAS = {\n"
         "  futebol: { nome: 'futebol', g: 1, ar: 0, vento: 1, sobe: 1, espalha: 1, curva: 1, quica: .35, rola: .6, giro: 1, danca: 0, r: 8.5 },\n"
         "  praia: { nome: 'praia', g: .62, ar: 1.1, vento: 2.3, sobe: 1.05, espalha: 1.1, curva: .7, quica: .55, rola: .5, giro: .6, danca: 10, r: 12 },\n"
         "  pingue: { nome: 'pingue-pongue', g: .8, ar: .7, vento: 1.9, sobe: 1.05, espalha: 1, curva: 1.2, quica: .8, rola: .7, giro: 1.6, danca: 24, r: 4.6 },\n"
         "  gude: { nome: 'bolinha de gude', g: 1.3, ar: 0, vento: .2, sobe: .85, espalha: .75, curva: .4, quica: .15, rola: .85, giro: 2.2, danca: 0, r: 4.2 },\n"
         "};", s)
s = sub1("extra, praia: this.praiaNow() }; },", "extra, kind: this.kindNow() }; },", s)
s = sub1("  praiaNow() { return this.nivel >= 5 && (this.nivel - 5) % 4 === 0; },",
         "  kindNow() { return this.nivel < 5 ? 'futebol' : ['praia', 'gude', 'pingue', 'futebol'][(this.nivel - 5) % 4]; },\n"
         "  // tempo até a bola descer até a altura yT (com a resistência do ar das bolas leves)\n"
         "  tDown(b, yT) {\n"
         "    const g = this.gOf(b), k = EB_BOLAS[b.kind].ar, v0 = b.vy, y0 = b.y;\n"
         "    if (!k) return Math.max(0, (-v0 + Math.sqrt(Math.max(0, v0 * v0 + 2 * g * (yT - y0)))) / g);\n"
         "    const vt = g / k, Y = (t) => y0 + vt * t + (v0 - vt) * (1 - Math.exp(-k * t)) / k, ta = v0 < 0 ? Math.log((vt - v0) / vt) / k : 0;\n"
         "    if (Y(ta) >= yT) return ta;\n"
         "    let lo = ta, hi = ta + 1; while (Y(hi) < yT && hi < 30) hi *= 2;\n"
         "    for (let i = 0; i < 32; i++) { const m = (lo + hi) / 2; if (Y(m) < yT) lo = m; else hi = m; }\n"
         "    return (lo + hi) / 2;\n"
         "  },", s)
s = sub1("  gOf(b) { return this.cfg().g * (b.praia ? .58 : 1); },", "  gOf(b) { return this.cfg().g * EB_BOLAS[b.kind].g; },", s)
s = sub1("  axOf(b) { return this.wind * (b.praia ? 2.3 : 1) + b.cv; },", "  axOf(b) { return this.wind * EB_BOLAS[b.kind].vento + b.cv; },", s)
s = sub1("    const t = (-b.vy + Math.sqrt(Math.max(0, b.vy * b.vy + 2 * g * (yT - b.y)))) / g;\n    return clamp(b.x + b.vx * t + .5 * this.axOf(b) * t * t, 8, W - 8);",
         "    const t = this.tDown(b, yT);\n    return clamp(b.x + b.vx * t + .5 * this.axOf(b) * t * t, 8, W - 8);", s)
s = sub1("const dy = Math.max(0, top - b.y), t = dy ? (-b.vy + Math.sqrt(Math.max(0, b.vy * b.vy + 2 * g * dy))) / g : 0;",
         "const dy = Math.max(0, top - b.y), t = dy ? this.tDown(b, top) : 0;", s)
s = sub1("const tc = (-b.vy + Math.sqrt(Math.max(0, b.vy * b.vy + 2 * g * Math.max(0, z.y - b.y)))) / g;",
         "const tc = z.y > b.y ? this.tDown(b, z.y) : 0;", s)
s = sub1("      b.vy += g * dt; b.vx += this.axOf(b) * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * (Math.abs(b.vx) / 12 + 5);",
         "      const BP = EB_BOLAS[b.kind]; b.vy += (g - BP.ar * b.vy) * dt; b.vx += this.axOf(b) * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * (Math.abs(b.vx) / 12 + 5) * BP.giro;", s)
# caiu: cada bola quica e rola do seu jeito
s = sub1("      for (const b of this.balls) { b.vy += 500 * dt; b.y += b.vy * dt; b.x += b.vx * dt; if (b.y > EBY - 4) { b.y = EBY - 4; b.vy = -b.vy * .3; b.vx *= .6; } }",
         "      for (const b of this.balls) { const BP = EB_BOLAS[b.kind]; b.vy += (500 * BP.g - BP.ar * b.vy) * dt; b.y += b.vy * dt; b.x += b.vx * dt; b.spin += dt * b.vx / 6; if (b.y > EBY - 4) { b.y = EBY - 4; b.vy = -b.vy * BP.quica; b.vx *= BP.rola; } }", s)
# toque: subida pelo peso (com resistência do ar, a velocidade de saída é achada para chegar na altura certa), espalha, curva e dança
_a = s.index("  launch(b, z, fir, saque = false) {"); _b = s.index("  miss() {", _a)
s = s[:_a] + """  launch(b, z, fir, saque = false) {
    const C = this.cfg(), BP = EB_BOLAS[b.kind], g = this.gOf(b), k = BP.ar;
    const h = saque ? 70 : (z.sobe + (fir ? 38 : 0) + rand(-6, 6)) * BP.sobe;
    let U = Math.sqrt(2 * g * h);
    if (k > 0) { let lo = U, hi = U * 4; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, hm = m / k - g / (k * k) * Math.log(1 + k * m / g); if (hm < h) lo = m; else hi = m; } U = (lo + hi) / 2; }
    const spread = saque ? 0 : (C.spread * (this.lastPerfect ? .6 : 1) + (fir ? 30 : 0)) * BP.espalha;
    let tx = this.px + (Math.random() < .5 ? -1 : 1) * rand(spread * .35, spread);
    if (tx < 40 || tx > W - 40) tx = this.px - (tx - this.px);
    tx = clamp(tx, 40, W - 40);
    b.serve = 0; b.cv = fir ? (Math.random() < .5 ? -1 : 1) * rand(40, 70) * BP.curva : 0;
    if (BP.danca && !saque) b.cv += rand(-BP.danca, BP.danca);
    b.vy = -U; const t = Math.max(.2, this.tDown(b, EB_ZONAS[1].y)), ax = this.axOf(b);
    b.vx = (tx - b.x - .5 * ax * t * t) / t;
    b.firula = !!fir;
  },
""" + s[_b:]
# série nova: a bola troca de tipo (com um puf de areia); a bola extra saiu
_a = s.index("    // bola de praia nas séries 5, 9, 13...; bola extra nas séries 6, 10, 14...\n"); _b = s.index("      this.balls.push(e);\n    }\n", _a) + len("      this.balls.push(e);\n    }\n")
s = s[:_a] + """    // a bola troca de tipo conforme a série (com um puf de areia)
    const kind = this.kindNow();
    for (const b of this.balls) if (b.kind !== kind) { b.kind = kind; for (let k = 0; k < 8; k++) this.sand.push({ x: b.x + rand(-6, 6), y: b.y + rand(-6, 6), v: rand(-40, 40), t: 1.5 }); }
""" + s[_b:]
# desenho de 16 bits (reserva): praia pelo tipo; pingue-pongue e gude desenhados pelo jogo
s = sub1("    if (b.praia) nm = 'p' + (((Math.floor(b.spin * .6) % 3) + 3) % 3);", "    if (b.kind === 'pingue' || b.kind === 'gude') { ebBolinha(b, tt); return; }\n    if (b.kind === 'praia') nm = 'p' + (((Math.floor(b.spin * .6) % 3) + 3) % 3);", s)
s = sub1("const embaixadinha = {", """// bolinhas desenhadas pelo jogo: pingue-pongue (sem a folha pintada) e gude (vidro com um redemoinho de cor; provisória)
function ebBolinha(b, tt) {
  const r = EB_BOLAS[b.kind].r; ctx.save(); ctx.translate(b.x, b.y);
  if (b.kind === 'gude') {
    const g = ctx.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r); g.addColorStop(0, '#f4fdff'); g.addColorStop(.45, '#8fd8f2'); g.addColorStop(1, '#2f7fb4');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * .92, 0, TAU); ctx.clip(); ctx.rotate(b.spin * .8);
    ctx.strokeStyle = 'rgba(255,120,40,.9)'; ctx.lineWidth = r * .32; ctx.beginPath(); ctx.moveTo(-r, r * .2); ctx.bezierCurveTo(-r * .3, -r * .8, r * .3, r * .8, r, -r * .2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,80,.85)'; ctx.lineWidth = r * .14; ctx.beginPath(); ctx.moveTo(-r, r * .45); ctx.bezierCurveTo(-r * .2, -r * .4, r * .4, r, r, r * .05); ctx.stroke(); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.ellipse(-r * .38, -r * .42, r * .26, r * .16, -.6, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(160,170,200,.45)'; ctx.beginPath(); ctx.arc(1, 1.2, r * .78, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-.6, -.7, r * .72, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,150,60,.85)'; ctx.lineWidth = .7; ctx.beginPath(); ctx.ellipse(0, 0, r * .85, r * .3, b.spin * .5, 0, TAU); ctx.stroke();
  }
  ctx.strokeStyle = '#1b1f4f'; ctx.lineWidth = .9; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); ctx.restore();
  if (b.firula && Math.floor(tt * 14) % 2) R(Math.round(b.x) + r + 1, Math.round(b.y) - r - 2, 2, 2, '#ffffff');
}
const embaixadinha = {""", s)
# sem as marcas das três alturas em volta do IAmiguinho
_a = s.index("    // marcas discretas das três alturas, só quando uma bola está chegando\n"); _b = s.index("    // IAmiguinho: 0 parado · 1 chute (pé)", _a)
s = s[:_a] + s[_b:]
# 31/10 · embaixadinha pintada: o IAmiguinho das pranchas novas (mveb.py -> mveb.js, desenho em ebp.js), desenhada em alta (3,2×, liso)
# no desenho pintado a coxa levantada fica mais baixa que no de 16 bits: a altura do toque de coxa desce de 25 para 22
s = sub1("  { k: 'coxa', nome: 'Coxa', y: EBY - 25,", "  { k: 'coxa', nome: 'Coxa', y: EBY - 22,", s)
s = sub1("  id: 'embaixadinha', name: 'Embaixadinha', tag: 'Areia · 3 bolas', wide: true, hi: true, dur: 0,", "  id: 'embaixadinha', name: 'Embaixadinha', tag: 'Areia · 3 bolas', wide: true, hi: true, paint: true, dur: 0,", s)
# vôlei desenhado em 1280 × 720, liso
s = sub1("  const hi = mode !== 'podium' && (cur === volei || !!cur.hi); // vôlei e provas com a arte gerada: desenho em dobro\n"
         "  if (cv.width !== (hi ? W * 2 : W) || cv.height !== (hi ? H * 2 : H)) { cv.width = hi ? W * 2 : W; cv.height = hi ? H * 2 : H; ctx.imageSmoothingEnabled = false; requestAnimationFrame(fitFs); }\n"
         "  ctx.save(); if (hi) ctx.scale(2, 2);",
         "  const skp = mode !== 'podium' && cur === halfpipe && !!window.__SKOK && window.__SKOK(); // half-pipe pintado: 4× (os desenhos de 16 bits que restam ficam com pixels inteiros)\n"
         "  const hi = mode !== 'podium' && (cur === volei || !!cur.hi), HK = mode !== 'podium' && (cur === volei || !!cur.paint) ? 3.2 : skp ? 4 : 2;\n"
         "  if (cv.width !== (hi ? Math.round(W * HK) : W) || cv.height !== (hi ? Math.round(H * HK) : H)) { cv.width = hi ? Math.round(W * HK) : W; cv.height = hi ? Math.round(H * HK) : H; ctx.imageSmoothingEnabled = HK !== 2 && !skp; cv.style.imageRendering = HK !== 2 ? 'auto' : ''; requestAnimationFrame(fitFs); }\n"
         "  ctx.save(); if (hi) ctx.scale(HK, HK);", s)
# half-pipe: segurar o botão (ou a direção) da manobra a mantém; ela só termina quando solta.
# Vale para pegadas e manobras dos botões; os flips giram o skate e terminam sozinhos. Pousar segurando derruba.
s = sub1("    if (this.trick) {\n      this.trick.t += dt;\n",
         "    if (this.trick) {\n"
         "      const tk = this.trick, H0 = tk.d * .5;\n"
         "      if (tk.t >= H0 && hpHeld(tk, I, dir)) { tk.t = H0; tk.hold = (tk.hold || 0) + dt; } else this.trick.t += dt;\n", s)
s = sub1("    const hover = this.trick && this.trick.k === 'helice' && !this.hoverUsed;\n    this.airT += dt;",
         "    const hover = this.trick && this.trick.k === 'helice' && !this.hoverUsed && (this.hovT || 0) < .6; // segurar mantém a pose, não o voo\n    if (hover) this.hovT = (this.hovT || 0) + dt;\n    this.airT += dt;", s)
s = sub1("hoverUsed: false, air: true,", "hoverUsed: false, hovT: 0, air: true,", s)
s = sub1("const hpKey = (x, y) =>",
         "// a manobra continua enquanto o botão (ou a direção) que a começou estiver apertado\n"
         "function hpHeld(tk, I, dir) {\n"
         "  if (tk.k === 'body' || tk.k === 'helice') return !!I[tk.key.replace('btn_', '')];\n"
         "  if (tk.k === 'grab') return tk.key === 'u' ? dir.y < 0 && (!dir.x || !!halfpipe.spin) : tk.key === 'd' ? dir.y > 0 && (!dir.x || !!halfpipe.spin) : dir.y < 0 && dir.x < 0;\n"
         "  return false;\n"
         "}\n"
         "const hpKey = (x, y) =>", s)
# manobras combinadas: manobra segurada + giro = manobra nova, com nome e desenho próprios
s = sub1("const hpKey = (x, y) =>",
         "const HP_CB = { btn_a: { nome: 'Superman Giratório', an: 'cb_super' }, btn_b: { nome: 'Cristo Giratório', an: 'cb_cristo' }, btn_c: { nome: 'Foguete Espiral', an: 'cb_foguete' },\n"
         "  btn_e: { nome: 'Helicóptero', an: 'cb_helice' }, u: { nome: 'Indy Giratória', an: 'cb_indy' }, d: { nome: 'Rabeta Giratória', an: 'cb_rabeta' } };\n"
         "const hpKey = (x, y) =>", s)
s = sub1("hoverUsed: false, hovT: 0, air: true,", "hoverUsed: false, hovT: 0, cbKey: null, cbRot: 0, gSpin: false, air: true,", s)
# segurando ↑ ou ↓ (pegada), apertar ◀ ou ▶ começa o giro sem soltar a pegada; soltar ◀/▶ para o giro
s = sub1("      if (this.spin) {\n        // girando: ↑ ou ↓ faz a pegada junto com o giro (combinada)\n",
         "      if (!this.spin && tp.done && dir.x && this.trick && (this.trick.key === 'u' || this.trick.key === 'd') && hpHeld(this.trick, I, { x: 0, y: dir.y })) {\n"
         "        this.spin = dir.x; this.snapTo = null; this.combined = true; this.gSpin = true;\n"
         "      } else if (this.spin && this.gSpin && !dir.x) {\n"
         "        this.snapTo = this.spin > 0 ? Math.ceil(this.rot / 180 - 1e-6) * 180 : Math.floor(this.rot / 180 + 1e-6) * 180; this.spin = 0; this.gSpin = false;\n"
         "      } else if (this.spin) {\n"
         "        // girando: ↑ ou ↓ faz a pegada junto com o giro (combinada)\n", s)
s = sub1("      this.tap = null; this.spin = 0;\n", "      this.tap = null; this.spin = 0; this.gSpin = false;\n", s)
# quanto ele girou com a manobra combinável ligada
s = sub1("    if (this.spin) this.rot += this.spin * HP_SPINV * dt;\n",
         "    const rot0 = this.rot;\n    if (this.spin) this.rot += this.spin * HP_SPINV * dt;\n", s)
s = sub1("    if (this.trick) {\n      const tk = this.trick, H0",
         "    if (this.trick && HP_CB[this.trick.key] && this.rot !== rot0) { if (this.cbKey !== this.trick.key) { this.cbKey = this.trick.key; this.cbRot = 0; } this.cbRot += Math.abs(this.rot - rot0); }\n"
         "    if (this.trick) {\n      const tk = this.trick, H0", s)
s = sub1("    const comb = this.combined && deg >= 180 && list.length > 1;\n",
         "    let comb = this.combined && deg >= 180 && list.length > 1;\n"
         "    // manobra segurada durante meia volta ou mais: vira a combinada (nome próprio, vale a manobra × 1,5 + o giro, × 1,3)\n"
         "    if (this.cbKey && this.cbRot >= 150 && deg >= 180) {\n"
         "      const T = HP_AIR[this.cbKey] || HP_BTN[this.cbKey.replace('btn_', '')], C = HP_CB[this.cbKey], i = list.findIndex((t) => t.nome === T.nome);\n"
         "      if (i >= 0) { list.splice(i, 1); const j = list.findIndex((t) => t.nome === String(deg)); if (j >= 0) list.splice(j, 1);\n"
         "        list.unshift({ nome: C.nome, show: `${C.nome} ${deg}`, v: T.v * 1.5 + HP_SPIN[Math.min(HP_SPIN.length - 1, k)] }); comb = true; }\n"
         "    }\n", s)
s = sub1("trick: null, queued: null, doneTr: [], spin: 0, rot: 0, snapTo: null, tap: null });", "trick: null, queued: null, doneTr: [], spin: 0, rot: 0, snapTo: null, tap: null, cbKey: null, cbRot: 0, gSpin: false });", s)
# 30/10/2026 · skate, pedido do dono: pousar estava fácil demais e segurar a manobra passa a valer mais.
# Pouso: cai se o giro estiver mais de 35° fora (antes 45°) ou faltar mais de 20% da manobra (antes 30%);
# desequilibra acima de 10° (antes 15°) ou faltando mais de 4% (antes 6%).
s = sub1("    if (err > 45 || trLeft > .3) { this.bail(trLeft > .3 ? 'Caiu no meio da manobra' : 'Pousou torto'); return; }\n    const sketchy = err > 15 || trLeft > .06;",
         "    if (err > 35 || trLeft > .2) { this.bail(trLeft > .2 ? 'Caiu no meio da manobra' : 'Pousou torto'); return; }\n    const sketchy = err > 10 || trLeft > .04;", s)
# Bônus por segurar: +60% da manobra por segundo segurado, até dobrar o valor. O nome mostra quanto tempo segurou.
s = sub1("const hpKey = (x, y) =>",
         "function hpDone(tk) {\n"
         "  const h = tk.hold || 0;\n"
         "  return h > .2 ? { nome: tk.nome, show: `${tk.nome} (${h.toFixed(1).replace('.', ',')} s)`, v: tk.v * (1 + Math.min(1, h * .6)) } : { nome: tk.nome, v: tk.v };\n"
         "}\n"
         "const hpKey = (x, y) =>", s)
s = sub1("if (this.trick.k === 'helice') this.hoverUsed = true; this.doneTr.push({ nome: this.trick.nome, v: this.trick.v });",
         "if (this.trick.k === 'helice') this.hoverUsed = true; this.doneTr.push(hpDone(this.trick));", s)
s = sub1("    if (this.trick) this.doneTr.push({ nome: this.trick.nome, v: this.trick.v });\n", "    if (this.trick) this.doneTr.push(hpDone(this.trick));\n", s)
# na combinada, o tempo segurado também conta
s = sub1("      if (i >= 0) { list.splice(i, 1); const j", "      if (i >= 0) { const Ti = list.splice(i, 1)[0]; const j", s)
s = sub1("v: T.v * 1.5 + HP_SPIN[", "v: Ti.v * 1.5 + HP_SPIN[", s)
js = (ROOT / 'verao_cartoon' / 'cartoon.js').read_text(encoding='utf-8')
pint = (HERE / 'pintado.js').read_text(encoding='utf-8') + '\n' + (HERE / 'anim5.js').read_text(encoding='utf-8') + '\n' + (HERE / 'animb2.js').read_text(encoding='utf-8') + '\n' + (HERE / 'skp.js').read_text(encoding='utf-8') + '\n' + (HERE / 'ebp.js').read_text(encoding='utf-8')
js = sub1("  /* ---------------------------------------------------------- desenho principal do vôlei */", pint + "\n  /* ---------------------------------------------------------- desenho principal do vôlei */", js)
js = sub1("function heldPos(v, i) { const p = v.P[i], f = i ? -1 : 1; return { x: p.x + f * 15.5 * CHAR_K, y: p.y - (v.charging ? 24 : 18) * CHAR_K }; }",
          "function heldPos(v, i) { const p = v.P[i], f = i ? -1 : 1; if (i === 0 && ART2() && MV5OK()) return held5(p, f); if (i === 1 && ART2() && MVBOK()) return heldB5(p, f); return { x: p.x + f * 15.5 * CHAR_K, y: p.y - (v.charging ? 24 : 18) * CHAR_K }; }", js)
js = sub1("    scene(this, tt);\n", "    const A2 = ART2(); (A2 ? scene2 : scene)(this, tt);\n", js)
js = sub1("    net();\n", "    (A2 ? net2 : net)();\n", js)
js = sub1("    this.P.forEach((p, i) => { if (i === 0) drawIA(this, p, i, tt, base); else drawBlob(this, p, i, tt, base); });",
          """    this.P.forEach((p, i) => { if (i === 0 && !this.two) (A2 && MV5OK() ? drawIA5 : A2 ? drawIA2 : drawIA)(this, p, i, tt, base); else if (i === 0) (A2 && MV5OK() ? drawIA5 : drawIA)(this, p, i, tt, base); else (A2 && MVBOK() ? drawBlob5 : A2 ? drawBlob2 : drawBlob)(this, p, i, tt, base); });
    if (A2) {
      const st = stOf('spl'), dts = clamp(tt - (st.tt || tt), 0, .05); st.tt = tt; st.g = st.g || [true, true];
      this.P.forEach((p, i) => { if (p.g && !st.g[i]) splash(p.x + (p.dv ? p.dv.dir * 6 : 0), !!p.dv); st.g[i] = p.g; });
      const onG = b.y + VRB >= VGY - 1; if (onG && !st.bg) splash(b.x, true); st.bg = onG;
      drawSplashes(dts);
    }""", js)
js = sub1("    drawBall(bv.x, bv.y, VRB, b.ang, ", "    (A2 ? drawBall2 : drawBall)(bv.x, bv.y, VRB, b.ang, ", js)
js = sub1("      drawBall(b.x, b.y, VRB, b.ang);\n", "      (A2 ? drawBall2 : drawBall)(b.x, b.y, VRB, b.ang);\n", js)
js = sub1("    scoreboard(this);\n", "    (A2 ? scoreboard2 : scoreboard)(this);\n", js)
# 31/10 (pedido do dono): o placar escondia a bola quando ela passava na altura dele; agora o placar vem antes e a bola fica na frente
js = sub1("    (A2 ? scoreboard2 : scoreboard)(this);\n", "", js)
js = sub1("    ctx.setTransform(base);\n    (A2 ? drawBall2 : drawBall)(bv.x, bv.y, VRB, b.ang, ", "    ctx.setTransform(base);\n    (A2 ? scoreboard2 : scoreboard)(this);\n    (A2 ? drawBall2 : drawBall)(bv.x, bv.y, VRB, b.ang, ", js)
# 31/10 (pedido do dono): a bola do saque do Amiguinho encolhia ao ser jogada para cima. Na mão, ela era desenhada do tamanho da bola
# do desenho antigo de 16 bits (17% maior); no estilo pintado ela fica sempre do mesmo tamanho
js = sub1("b.ang, this.state === 'serve' && this.held ? Math.max(1, (this.ballR + 1.2) / VRB) : 1);", "b.ang, this.state === 'serve' && this.held && !A2 ? Math.max(1, (this.ballR + 1.2) / VRB) : 1);", js)
# textos e avisos com letra arredondada só no vôlei; as outras provas seguem com os de 16 bits
js = sub1("  drawPops = function () {", "  const pops16 = drawPops, banner16 = drawBanner;\n  drawPops = function () {\n    if (cur !== volei) return pops16.apply(this, arguments);", js)
js = sub1("  drawBanner = function () {\n    if (!banner) return;", "  drawBanner = function () {\n    if (cur !== volei) return banner16.apply(this, arguments);\n    if (!banner) return;", js)
JS = (HERE / 'assets.js').read_text() + '\n' + (HERE / 'mv5.js').read_text() + '\n' + (HERE / 'mvb.js').read_text() + '\n' + (HERE / 'mvsk.js').read_text() + '\n' + (HERE / 'mveb.js').read_text() + '\n' + (HERE / 'ebcen.js').read_text() + '\n' + (HERE / 'skscene.js').read_text() + '\n' + (HERE / 'skvd.js').read_text() + '\n' + js
# as imagens pintadas vão como arquivos ao lado da página (img/*.webp), não embutidas: a página fica leve
import re, base64, hashlib, shutil
IMG = ROOT / 'jogos_verao' / 'img'
shutil.rmtree(IMG, ignore_errors=True); IMG.mkdir(parents=True)
def _out(m):
    data = base64.b64decode(m.group(2)); name = hashlib.md5(data).hexdigest()[:12] + '.' + m.group(1)
    (IMG / name).write_bytes(data); return 'img/' + name
JS = re.sub(r'data:image/(webp|png);base64,([A-Za-z0-9+/=]+)', _out, JS)
print('imagens', len(list(IMG.iterdir())), sum(f.stat().st_size for f in IMG.iterdir()) // 1024, 'KB')
idx = s.rfind('</script>')
s = s[:idx + 9] + "\n<script>\n" + JS + "\n</script>" + s[idx + 9:]
(ROOT / 'jogos_verao' / 'index.html').write_text(s, encoding='utf-8')
print('ok', len(s) // 1024, 'KB')
