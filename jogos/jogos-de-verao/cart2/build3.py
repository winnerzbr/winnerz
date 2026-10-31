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
NOVAS = ['ev_pingue.js', 'ev_bocha.js']
s = sub1("const EVENTS = [surfe,", ''.join((HERE / f).read_text(encoding='utf-8') + '\n' for f in NOVAS) + "const EVENTS = [surfe,", s)
s = sub1("const EVENTS = [surfe, halfpipe, embaixadinha, patins, basquete, salto, bmx,", "const EVENTS = [surfe, halfpipe, embaixadinha, patins, basquete, pingue, bmx,", s)
s = sub1("futebol, natacao,", "futebol, bocha, natacao,", s)
s = sub1("const RANK = {\n", "const RANK = {\n  bocha: [['@vovo', 2100], ['@lu', 1700], ['@nina', 900], ['@caio', 500]],\n", s)
s = sub1("const RANK = {\n", "const RANK = {\n  pingue: [['@rafa', 2300], ['@bia', 1800], ['@duda', 1100], ['@carol', 600]],\n", s)

# cabeçalho do menu das provas de placar: o do vôlei era fixo; as provas novas usam medShort e menu2
s = sub1("h = cur.two ? [['Modo', '2 jogadores'], ['Placar', 'até 7'], ['Toques', '3 por lado'], ['Pódio', 'não conta']] : [['Seu recorde', best[cur.id] ? nf(best[cur.id]) : '—'], ['Bronze', 'Perder por ≤2'], ['Prata', 'Vencer'], ['Ouro', 'Vencer por 4+']];",
         "h = cur.two ? (cur.menu2 || [['Modo', '2 jogadores'], ['Placar', 'até 7'], ['Toques', '3 por lado'], ['Pódio', 'não conta']]) : [['Seu recorde', best[cur.id] ? nf(best[cur.id]) : '—'], ...(cur.medShort || ['Perder por ≤2', 'Vencer', 'Vencer por 4+']).map((x, i) => [['Bronze', 'Prata', 'Ouro'][i], x])];", s)
# 2 jogadores no computador nas provas novas que têm (o mesmo botão do vôlei)
s = sub1("  if (seq || touch) volei.two = false;\n", "  if (seq || touch) { volei.two = false; for (const e of EVENTS) if (e.two2) e.two = false; }\n", s)
s = sub1("  setButtons(['Jogar', start], null);\n}\nfunction startDOM() {",
         "  setButtons(['Jogar', start], null);\n"
         "  if (cur.two2 && !seq && !touch) { const ev = cur, b2 = $('b-alt2'); b2.hidden = false; b2.textContent = `2 jogadores: ${ev.two ? 'ligado' : 'desligado'}`; b2.setAttribute('aria-pressed', String(ev.two)); actAlt2 = () => { ev.two = !ev.two; showTitle(); renderHud(); setTimeout(() => $('b-alt2').focus({ preventScroll: true }), 0); }; }\n"
         "}\nfunction startDOM() {", s)
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
pint = (HERE / 'pintado.js').read_text(encoding='utf-8') + '\n' + (HERE / 'anim5.js').read_text(encoding='utf-8') + '\n' + (HERE / 'animb2.js').read_text(encoding='utf-8') + '\n' + (HERE / 'skp.js').read_text(encoding='utf-8')
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
# textos e avisos com letra arredondada só no vôlei; as outras provas seguem com os de 16 bits
js = sub1("  drawPops = function () {", "  const pops16 = drawPops, banner16 = drawBanner;\n  drawPops = function () {\n    if (cur !== volei) return pops16.apply(this, arguments);", js)
js = sub1("  drawBanner = function () {\n    if (!banner) return;", "  drawBanner = function () {\n    if (cur !== volei) return banner16.apply(this, arguments);\n    if (!banner) return;", js)
JS = (HERE / 'assets.js').read_text() + '\n' + (HERE / 'mv5.js').read_text() + '\n' + (HERE / 'mvb.js').read_text() + '\n' + (HERE / 'mvsk.js').read_text() + '\n' + (HERE / 'skscene.js').read_text() + '\n' + (HERE / 'skvd.js').read_text() + '\n' + js
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
