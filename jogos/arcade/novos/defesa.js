/* ============================================================ jogo: Defesa da Live */
// Trolls invadem o chat da live, da direita para a esquerda, em 5 faixas. À esquerda fica o sofá da câmera:
// cada troll que chega lá tira uma vida (3 vidas). Você coloca defensores na grade (5 faixas × 8 colunas)
// pagando com pontos do canal: moedinhas que caem do alto e que a Inscrição gera. Pega a moeda tocando nela,
// passando o mouse ou parando o cursor em cima.
// Defensores: Inscrição (gera pontos), Mod (atira emotes), Escudo de bloqueio (parede com muita vida),
// Timeout (congela os trolls da faixa de tempos em tempos) e Banimento (martelo de uso único que explode 3×3).
// Trolls: Spammer (comum), CAPS LOCK (rápido), Copypasta gigante (tanque) e Pulador (pula a primeira defesa).
// O IAmiguinho é o moderador-chefe: fica no alto comentando e, de vez em quando, dá um ban errado num defensor
// (ele para de funcionar por 3 s; só isso).
// Progressão: ondas numeradas, cada uma com mais trolls, mais vida e mais rápidos; tipos novos estreiam nas ondas 3, 5 e 7.
// Placar: ondas sobrevividas × 100000 + pontos (trolls banidos e bônus de onda) como desempate; o ranking mostra as ondas.
// Controles: mouse/toque (carta, depois a célula; tocar ou passar nas moedas) · teclado e controle: setas movem o cursor,
// Q/E ou LB/RB trocam a carta (1 a 5 também), Espaço/Enter/A colocam; o cursor parado coleta as moedas.
Music.define('defesa', {
  bpm: 136,
  lead: bars('G5 - . Bb5 . D6 - . C6 . Bb5 . A5 - G5 .', 'F5 - . A5 . C6 - . Bb5 - A5 . F5 - - .', 'Eb5 - . G5 . Bb5 - . D6 . C6 . Bb5 . G5 .', 'D5 . F#5 . A5 . D6 - - . C6 . A5 . F#5 .'),
  arp: bars(x4('G4 Bb4 D5 Bb4'), x4('F4 A4 C5 A4'), x4('Eb4 G4 Bb4 G4'), x4('D4 F#4 A4 F#4')),
  bass: bars('G2 . G3 . G2 . . G2 . G2 G3 . G2 . D3 .', 'F2 . F3 . F2 . . F2 . F2 F3 . F2 . C3 .', 'Eb2 . Eb3 . Eb2 . . Eb2 . Eb2 Eb3 . Eb2 . Bb2 .', 'D2 . D3 . D2 . . D2 . D2 D3 . D2 . A2 .'),
  drums: 'k h . h s . h . k . k h s h . h',
  mix: { arp: .6, lead: .85 },
});
const DF_GX = 44, DF_GY = 54, DF_CW = 34, DF_CH = 46, DF_COLS = 8, DF_ROWS = 5, DF_BY = 302, DF_KX = 58, DF_KW = 50, DF_KG = 52, DF_PONTO = 100000;
const dfCx = (c) => DF_GX + c * DF_CW + DF_CW / 2;
const dfLy = (r) => DF_GY + r * DF_CH;
// o placar guarda ondas × 100000 + pontos (desempate); na tela aparecem só as ondas
const dfFmt = (s) => String(Math.floor(s / DF_PONTO));
// sprites (pixel)
const DF_SINO = ['....YY....', '...YYYY...', '..YXYYYY..', '..YXYYYY..', '.YXYYYYYY.', '.YYYYYYYY.', '.YYYYYYYy.', 'YYYYYYYYyy', 'yyyyyyyyyy', '....yy....'];
const DF_ESCUDO = ['.SSSSSSSSSS.', 'SSBBBBBBBBSS', 'SBBBBBBBBBBS', 'SBBBRRRRBBBS', 'SBBRRBBRRBBS', 'SBRRBBBRRRBS', 'SBRBBBRRBRBS', 'SBRBBRRBBRBS', 'SBRBRRBBBRBS', 'SBBRRBBBRRBS', 'SBBBRRRRBBBS', '.SBBBBBBBBS.', '..SSBBBBSS..', '....SSSS....'];
const DF_RELOGIO = ['....SSSS....', '.....SS.....', '..TTTTTTTT..', '.TTWWWWWWTT.', 'TTWWWWWWWWTT', 'TWWWWWWWWWWT', 'TWWWWWWWWWWT', 'TWWWWWWWWWWT', 'TWWWWWWWWWWT', 'TTWWWWWWWWTT', '.TTWWWWWWTT.', '..TTTTTTTT..'];
const DF_MARTELO = ['.SSSSSSSSS.', 'SRRRRRRRRRS', 'SRRXRRRRRRS', 'SRRRRRRRRRS', '.SSSSSSSSS.', '....SyS....', '....yyy....', '....yyy....', '....yyy....', '....yyy....', '....yyy....', '....SSS....'];
const DF_MOEDA = ['..YYYY..', '.YXXYYY.', 'YXYYYYyY', 'YXYYYYyY', 'YYYYYYyY', 'YYYYYyyY', '.YyyyyY.', '..YYYY..'];
const DF_SOFA = ['..PPPPPPPPPPPP..', '.PppppppppppppP.', '.PppppppppppppP.', 'PPPPPPPPPPPPPPPP', 'PpPppppppppppPpP', 'PpPPPPPPPPPPPPpP', 'PPPPPPPPPPPPPPPP', '.KK..........KK.'];
const DF_CORACAO = ['RR.RR', 'RRRRR', 'RRRRR', '.RRR.', '..R..'];
const DF_SORRI = ['.YYY.', 'YKYKY', 'YYYYY', 'YKKKY', '.YYY.'];
const DF_EMOTES = [[DF_SORRI, null], [DF_CORACAO, null]];
// Amiguinhos trolls: o mesmo corpo do BOT, com sorrisinho de troll; o CAPS LOCK grita
const DF_T_RI = ['..OOOO..', '.OOOOOO.', 'OODDDDOO', 'ODEDDEDO', 'ODDDDDDO', 'ODEEEEDO', 'oOOOOOOo', '.o....o.', '.o....o.'];
const DF_T_GRITA = ['..OOOO..', '.OOOOOO.', 'OODDDDOO', 'ODEDDEDO', 'ODDEEDDO', 'ODDEEDDO', 'oOOOOOOo', '.o....o.', '.o....o.'];
const DF_T_ANDA = ['..OOOO..', '.OOOOOO.', 'OODDDDOO', 'ODEDDEDO', 'ODDDDDDO', 'ODEEEEDO', 'oOOOOOOo', '..o..o..', '.o....o.'];
const DF_PAL = { ...PAL, Y: '#ffd04a', y: '#c99a2a', X: '#fff6c8', R: '#e8443a', S: '#cfd8e2', s: '#7e8a97', B: '#3a6fd8', T: '#5fc7ef', W: '#eef6ff', K: '#07050c', P: '#7a4fd0', p: '#54339c' };
const DF_PAL_EMO = [{ ...DF_PAL }, { ...DF_PAL, R: '#ff6fb0' }];
const DF_CINZA = new Proxy({}, { get: (o, k) => ({ D: '#1a1d24', E: '#5d6875', '.': null }[k] || '#6b7480') });
const DF_BRANCO = new Proxy({}, { get: () => '#ffffff' });
const DF_GELO = { ...PAL, O: '#bfefff', o: '#7fb8d8', D: '#16344a', E: '#ffffff' };
const DF_MOD_PAL = { ...PAL, O: '#3fbf6a', o: '#23804a', E: '#d8ffe6' };
const DF_CARTAS = [
  { id: 'sino', nome: 'Inscrição', custo: 50, cd: 5, cd0: 0, hp: 90 },
  { id: 'mod', nome: 'Mod', custo: 100, cd: 5, cd0: 0, hp: 120 },
  { id: 'escudo', nome: 'Escudo de bloqueio', custo: 50, cd: 16, cd0: 6, hp: 1100 },
  { id: 'timeout', nome: 'Timeout', custo: 75, cd: 12, cd0: 6, hp: 100 },
  { id: 'ban', nome: 'Banimento', custo: 150, cd: 20, cd0: 14 },
];
const DF_TROLL = {
  spam: { hp: 100, v: 13, dps: 28, pts: 10, O: '#e86fa8', o: '#b24f80', fr: 9, nome: 'Spammer' },
  caps: { hp: 75, v: 28, dps: 28, pts: 15, O: '#ff6a3d', o: '#b8401d', fr: 9, nome: 'CAPS LOCK' },
  copy: { hp: 520, v: 8.5, dps: 45, pts: 40, O: '#9a7bff', o: '#6a4fc0', fr: 15, nome: 'Copypasta gigante' },
  pula: { hp: 110, v: 18, dps: 28, pts: 20, O: '#ffb84a', o: '#c07a1c', fr: 9, nome: 'Pulador' },
};
for (const k of Object.keys(DF_TROLL)) DF_TROLL[k].pal = { ...PAL, O: DF_TROLL[k].O, o: DF_TROLL[k].o };
const DF_ESTREIA = { 2: 'caps', 4: 'copy', 6: 'pula' };
// cada onda: mais trolls, mais perto um do outro, com mais vida; o fim da onda vem num estouro
function dfOnda(n) {
  const tot = Math.round(2 + n * 2.2 + Math.max(0, n - 7) * 1.5), gap = n === 1 ? 5 : n === 2 ? 3.4 : Math.max(.7, 3.2 - n * .25);
  const peso = { spam: 10, caps: n >= 2 ? 2 + n * .6 : 0, copy: n >= 4 ? 1.2 + (n - 4) * .55 : 0, pula: n >= 6 ? 1.6 + (n - 6) * .5 : 0 };
  const soma = Object.values(peso).reduce((a, b) => a + b, 0), out = [];
  let at = 1.2;
  for (let i = 0; i < tot; i++) {
    let r = Math.random() * soma, tipo = 'spam';
    for (const [k, w] of Object.entries(peso)) { r -= w; if (r <= 0) { tipo = k; break; } }
    if (i === 1 && DF_ESTREIA[n]) tipo = DF_ESTREIA[n];
    out.push({ tipo, at });
    const par = n >= 4 && Math.random() < .1 + n * .025;
    at += par ? .25 : gap * (i >= tot * .72 ? .45 : rand(.8, 1.25));
  }
  return out;
}
// o IAmiguinho comenta
const DF_DIZ = {
  onda: ['Chat aberto. Que comece a baixaria.', 'Lá vem mais troll. Adoro audiência.', 'Mais uma onda. Eu modero, você sofre.', 'Segura o chat aí que eu tô ocupado. Olhando.', 'Os trolls voltaram. Eu avisei. Na minha cabeça.'],
  vazou: ['Um troll sentou no sofá. Pelo menos tá confortável.', 'Chegou na câmera. Não clipa isso não.', 'Vazou um troll. Eu vi, só não quis agir.', 'Isso aí vai virar meme kkkk', 'Troll no sofá. Vou cobrar aluguel.'],
  erro: ['Banido por precaução.', 'Esse mod tava quieto demais. Suspeito.', 'Ops. Quer dizer: decisão estratégica.', 'Martelo escorregou. Com estilo, mas escorregou.', 'Ban preventivo. Tendência do momento.'],
  volta: ['Desbanido. Não precisa agradecer.', 'Pronto, voltou. Eu sou justo.', 'Revisei o caso. Fui genial de novo.', 'Pode voltar. Passou no meu teste.'],
  banzao: ['Isso que é moderação! Aprendeu comigo.', 'BANIDOS. Lindo de ver hahaha', 'Que martelada. Quase tão boa quanto as minhas.'],
  limpa: ['Onda limpa. Os créditos são meus, claro.', 'Sobreviveu. Eu sabia, fui eu que te treinei.', 'GG. Agora finge que foi fácil.', 'Chat limpinho. Vou tirar um print.'],
  caps: 'CAPS LOCK chegando. Protege os ouvidos.',
  copy: 'Copypasta gigante. Ninguém lê, todo mundo sofre.',
  pula: 'Esse aí pula defesa. Tipo eu pulando tutorial lol',
  fim: 'A live caiu. Mas o clipe ficou ótimo kkkk',
};
// mouse passando por cima da tela (coleta moedas e mostra a célula)
const DF_HOVER = { on: false, x: 0, y: 0, mov: false };
sw.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const p = toLogical(e); Object.assign(DF_HOVER, { on: true, x: p.x, y: p.y, mov: true }); });
sw.addEventListener('pointerleave', () => { DF_HOVER.on = false; });
const dfJogo = {
  id: 'defesa', name: 'Defesa da Live', tag: 'Defesa · 5 faixas do chat', unit: 'ondas', ia: 6 * DF_PONTO + 1530, bestKey: '.v1', fmt: dfFmt,
  desc: 'Defenda o chat da live dos trolls, onda por onda.',
  how: 'Trolls invadem o chat pela direita: pegue as moedas de pontos do canal e escolha uma carta para pôr na grade Mods que atiram emotes, Escudos, Timeouts que congelam, Banimentos que explodem e Inscrições que geram pontos. Se três trolls chegarem no sofá, a live cai.',
  ctl: [['Mouse', 'carta, depois a célula', 'pc'], ['Setas', 'mover o cursor', 'pc'], ['Q E', 'trocar carta', 'pc'], ['Espaço', 'colocar', 'pc'], ['LB RB', 'trocar carta', 'pc'], ['✕ / A', 'colocar', 'pc'],
    ['Toque', 'na carta, depois na célula', 'touch'], ['Tocar nas moedas', 'pegar pontos', 'touch']],
  pad: null,
  rank: [['@carol', 11 * DF_PONTO + 4630], ['@duda', 9 * DF_PONTO + 3240], ['@bia', 7 * DF_PONTO + 2150], ['@rafa', 4 * DF_PONTO + 720]],
  nota: 'o martelo de ban estava com lag',
  falas: ['Eu sou moderador-chefe. O cargo veio com martelo e eu não li o manual kkkk', 'Troll de CAPS LOCK corre mais. Grita mais também. Igual o chat quando a live atrasa.', 'Copypasta gigante aguenta muito emote na cara. Ninguém lê até o fim, nem os emotes.', 'Às vezes eu dou ban num mod sem querer. Chamo isso de teste de lealdade hahaha'],
  init() {
    Object.assign(this, {
      t: 0, score: 0, ondas: 0, pontos: 0, banidos: 0, vidas: 3, pc: 200, sel: 1, onda: 0, fase: 'pausa', pausaT: 7, fila: [], ot: 0, ultR: -1,
      grid: Array.from({ length: DF_ROWS }, () => Array(DF_COLS).fill(null)),
      defs: [], trolls: [], tiros: [], moedas: [], fx: [], pops: [], raios: [], bans: [], voos: [],
      cd: DF_CARTAS.map((k) => k.cd0), cur: { c: 1, r: 2 }, rep: 0, dir: '', ceuT: 3, iaT: rand(22, 32), fala: null, msg: null, flash: [0, 0, 0, 0, 0], fimT: 0, nega: [0, 0, 0, 0, 0], escolhaT: 0,
      aviso: { lines: [['A LIVE COMEÇOU', F_BIG, '#ffffff'], ['Os trolls já estão digitando…', F_SM, '#c3c9cf']], t: 0, d: 2.4 },
    });
    DF_HOVER.mov = false;
  },
  demo() {
    const pon = (id, c, r) => { const k = DF_CARTAS.find((x) => x.id === id), d = { id, c, r, hp: k.hp, max: k.hp, tm: 3, ban: 0, hit: 0, ph: c + r, pop: 0 }; this.grid[r][c] = d; this.defs.push(d); };
    pon('sino', 0, 0); pon('sino', 0, 2); pon('sino', 0, 4); pon('mod', 1, 1); pon('mod', 2, 2); pon('mod', 1, 3); pon('mod', 1, 0); pon('escudo', 4, 2); pon('timeout', 2, 4);
    const tr = (tipo, r, x) => { const T = DF_TROLL[tipo]; this.trolls.push({ tipo, r, x, hp: T.hp, max: T.hp, v: T.v, dps: T.dps, fr: T.fr, frio: 0, hit: 0, jump: null, alt: 0, pogo: tipo === 'pula', ph: x, come: false }); };
    tr('spam', 1, 236); tr('caps', 3, 272); tr('copy', 2, 230); tr('spam', 0, 296); tr('pula', 4, 262);
    this.tiros.push({ x: 140, y: dfLy(1) + 24, r: 1, k: 0 }, { x: 186, y: dfLy(2) + 24, r: 2, k: 1 }, { x: 128, y: dfLy(0) + 24, r: 0, k: 1 });
    this.moedas.push({ x: 176, y: dfLy(3) + 22, ty: dfLy(3) + 22, vy: 0, kind: 'ceu', vida: 8, t: 0, voa: null }, { x: 26, y: dfLy(0) + 34, ty: dfLy(0) + 34, vy: 0, kind: 'gen', vida: 8, t: 0, voa: null });
    this.moedas[1].x = dfCx(0) + 8;
    this.cur = { c: 3, r: 3 }; this.pc = 175; this.onda = 4; this.ondas = 3; this.fase = 'onda'; this.aviso = null;
    this.fala = { s: 'Banido por precaução.', t: .5 };
  },
  // ---------------------------------------------------------------- ações
  escolher(i) { if (i === this.sel) return; this.sel = i; this.escolhaT = 0; beep(560, .03, 'square', .02); },
  trocar(d) { this.escolher((this.sel + d + DF_CARTAS.length) % DF_CARTAS.length); },
  mover(dx, dy) { this.cur.c = clamp(this.cur.c + dx, 0, DF_COLS - 1); this.cur.r = clamp(this.cur.r + dy, 0, DF_ROWS - 1); },
  negar(s) { this.msg = { s, t: 0 }; this.nega[this.sel] = .35; beep(160, .07, 'square', .03); },
  diz(s) { this.fala = { s: Array.isArray(s) ? pick(s) : s, t: 0 }; },
  colocar(c, r) {
    if (this.fase === 'fim') return;
    const k = DF_CARTAS[this.sel];
    if (this.cd[this.sel] > 0) return this.negar(`${k.nome}: recarregando`);
    if (this.pc < k.custo) return this.negar(`Faltam ${k.custo - this.pc} pontos do canal`);
    if (k.id === 'ban') this.bans.push({ c, r, t: 0, ok: false });
    else {
      if (this.grid[r][c]) return this.negar('Essa célula já tem defesa');
      const d = { id: k.id, c, r, hp: k.hp, max: k.hp, tm: k.id === 'sino' ? 4 : .35, ban: 0, hit: 0, ph: rand(0, 6), pop: .25 };
      this.grid[r][c] = d; this.defs.push(d);
      for (let i = 0; i < 8; i++) this.fx.push({ x: dfCx(c), y: dfLy(r) + 30, vx: rand(-60, 60), vy: rand(-90, -20), t: 0, life: .45, c: '#e8ebee' });
    }
    this.pc -= k.custo; this.cd[this.sel] = k.cd;
    beep(520, .06, 'triangle', .04, 260);
  },
  moeda(x, y, ty, kind) { this.moedas.push({ x, y, ty, vy: kind === 'ceu' ? 34 : -95, vx: kind === 'ceu' ? 0 : rand(-22, 22), kind, vida: kind === 'ceu' ? 9 : 10, t: 0, voa: null }); },
  pegar(m) { m.voa = { t: 0, x0: m.x, y0: m.y }; this.pc += 25; sfx.coin(); },
  pegarPerto(x, y, R) { let n = 0; for (const m of this.moedas) if (!m.voa && Math.hypot(m.x - x, m.y - y) < R) { this.pegar(m); n++; } return n > 0; },
  nasce(o) {
    const T = DF_TROLL[o.tipo], n = this.onda, k = 1 + .18 * (n - 1) + Math.max(0, n - 4) * .1;
    const faixas = n === 1 ? [2] : n === 2 ? [1, 2, 3] : [0, 1, 2, 3, 4];
    let r = pick(faixas); if (r === this.ultR && faixas.length > 1 && Math.random() < .7) r = pick(faixas);
    this.ultR = r;
    const hp = Math.round(T.hp * k);
    this.trolls.push({ tipo: o.tipo, r, x: W + 14, hp, max: hp, v: T.v * Math.min(1.5, 1 + .04 * (n - 1)), dps: T.dps * (1 + .03 * (n - 1)), fr: T.fr, frio: 0, hit: 0, jump: null, alt: 0, pogo: o.tipo === 'pula', ph: rand(0, 6), come: false });
  },
  novaOnda() {
    this.onda++; this.fila = dfOnda(this.onda); this.ot = 0; this.fase = 'onda';
    const novo = DF_ESTREIA[this.onda], lines = [[`ONDA ${this.onda}`, F_BIG, '#ffffff']];
    if (novo) lines.push([`Troll novo: ${DF_TROLL[novo].nome}`, F_SM, '#ffd2a8']);
    this.aviso = { lines, t: 0, d: 1.7 };
    this.diz(novo ? DF_DIZ[novo] : DF_DIZ.onda);
    sfx.start();
  },
  fimOnda() {
    this.ondas = this.onda; const bonus = 25 * this.onda; this.pontos += bonus;
    this.fase = 'pausa'; this.pausaT = 4.5;
    this.aviso = { lines: [[`ONDA ${this.onda} SOBREVIVIDA`, F_BIG, '#8fd3ae'], [`+${bonus} pontos`, F_SM, '#ffffff']], t: 0, d: 1.9 };
    if (Math.random() < .6) this.diz(DF_DIZ.limpa);
    sfx.big();
  },
  matar(tr) {
    const T = DF_TROLL[tr.tipo]; this.trolls.splice(this.trolls.indexOf(tr), 1);
    this.pontos += T.pts; this.banidos++;
    const y = dfLy(tr.r) + 26 - tr.alt;
    for (let i = 0; i < 10; i++) this.fx.push({ x: tr.x, y, vx: rand(-80, 80), vy: rand(-120, -10), t: 0, life: .55, c: i % 2 ? T.O : T.o });
    this.pops.push({ x: tr.x, y: y - 14, t: 0, txt: `+${T.pts}`, c: '#ffffff' });
    beep(300, .08, 'square', .03, -150);
  },
  vazar(tr) {
    this.trolls.splice(this.trolls.indexOf(tr), 1);
    this.vidas--; this.flash[tr.r] = 1; shake = .35; sfx.hit();
    for (const o of this.trolls) if (o.r === tr.r && !o.jump) { o.x = Math.min(W + 20, o.x + 46); o.frio = Math.max(o.frio, .5); }
    this.pops.push({ x: 24, y: dfLy(tr.r) + 16, t: 0, txt: 'VAZOU!', c: '#ff8a8a' });
    if (this.vidas <= 0) {
      this.fase = 'fim'; this.fimT = 0; this.vidas = 0; sfx.over();
      this.aviso = { lines: [['A LIVE CAIU', F_BIG, '#ff8a8a'], [`${this.ondas} ${this.ondas === 1 ? 'onda sobrevivida' : 'ondas sobrevividas'}`, F_SM, '#ffffff']], t: 0, d: 99 };
      this.diz(DF_DIZ.fim);
    } else this.diz(DF_DIZ.vazou);
  },
  bloqueio(tr) {
    for (let c = DF_COLS - 1; c >= 0; c--) {
      const d = this.grid[tr.r][c]; if (!d) continue;
      const L = DF_GX + c * DF_CW, R = L + DF_CW;
      if (tr.x - tr.fr <= R - 4 && tr.x >= L + 4) return d;
    }
    return null;
  },
  tirar(d) {
    this.grid[d.r][d.c] = null; this.defs.splice(this.defs.indexOf(d), 1);
    for (let i = 0; i < 9; i++) this.fx.push({ x: dfCx(d.c), y: dfLy(d.r) + 28, vx: rand(-70, 70), vy: rand(-110, -20), t: 0, life: .5, c: '#9aa7b4' });
    beep(200, .12, 'sawtooth', .035, -120);
  },
  temTroll(r, x) { return this.trolls.some((o) => o.r === r && o.x > x - 4 && o.x < W + 2); },
  // ---------------------------------------------------------------- laço
  entrada(dt) {
    if (pressedAny('KeyQ', 'PadLB', 'PadLT')) this.trocar(-1);
    if (pressedAny('KeyE', 'PadRB', 'PadRT', 'PadY')) this.trocar(1);
    for (let i = 0; i < DF_CARTAS.length; i++) if (pressedAny(`Digit${i + 1}`, `Numpad${i + 1}`)) this.escolher(i);
    const dx = inp.ax > .5 ? 1 : inp.ax < -.5 ? -1 : 0, dy = inp.ay > .5 ? 1 : inp.ay < -.5 ? -1 : 0, d = `${dx},${dy}`;
    // toque rápido na seta conta mesmo se soltar antes do próximo quadro; segurar repete
    const px = (pressedAny('ArrowRight', 'KeyD') ? 1 : 0) - (pressedAny('ArrowLeft', 'KeyA') ? 1 : 0), py = (pressedAny('ArrowDown', 'KeyS') ? 1 : 0) - (pressedAny('ArrowUp', 'KeyW') ? 1 : 0);
    if (px || py) { this.mover(px, py); this.rep = .28; this.dir = d; }
    else if (dx || dy) {
      if (d !== this.dir) { this.mover(dx, dy); this.rep = .28; } else { this.rep -= dt; if (this.rep <= 0) { this.mover(dx, dy); this.rep = .1; } }
      this.dir = d;
    } else this.dir = '';
    if (pressedAny('Space', 'Enter', 'NumpadEnter')) this.colocar(this.cur.c, this.cur.r);
    if (inp.tap) {
      const { x, y } = inp.tap;
      if (y >= DF_BY - 8) { const i = Math.floor((x - DF_KX) / DF_KG); if (x >= DF_KX && i >= 0 && i < DF_CARTAS.length) this.escolher(i); }
      else if (!this.pegarPerto(x, y, 17)) {
        const c = Math.floor((x - DF_GX) / DF_CW), r = Math.floor((y - DF_GY) / DF_CH);
        if (c >= 0 && c < DF_COLS && r >= 0 && r < DF_ROWS) { this.cur = { c, r }; this.colocar(c, r); }
      }
    }
    if (inp.drag) this.pegarPerto(inp.drag.x, inp.drag.y, 15);
    if (DF_HOVER.on) {
      this.pegarPerto(DF_HOVER.x, DF_HOVER.y, 13);
      if (DF_HOVER.mov) {
        DF_HOVER.mov = false;
        const c = Math.floor((DF_HOVER.x - DF_GX) / DF_CW), r = Math.floor((DF_HOVER.y - DF_GY) / DF_CH);
        if (c >= 0 && c < DF_COLS && r >= 0 && r < DF_ROWS) this.cur = { c, r };
      }
    }
    // o cursor parado em cima pega as moedas da célula
    const L = DF_GX + this.cur.c * DF_CW, T = dfLy(this.cur.r);
    for (const m of this.moedas) if (!m.voa && m.x > L - 3 && m.x < L + DF_CW + 3 && m.y > T - 3 && m.y < T + DF_CH + 3) this.pegar(m);
  },
  update(dt) {
    this.t += dt; this.escolhaT += dt;
    for (const p of this.pops) p.t += dt; this.pops = this.pops.filter((p) => p.t < .9);
    for (const f of this.fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 300 * dt; } this.fx = this.fx.filter((f) => f.t < f.life);
    for (const rr of this.raios) rr.t += dt; this.raios = this.raios.filter((rr) => rr.t < .45);
    for (let r = 0; r < DF_ROWS; r++) { this.flash[r] = Math.max(0, this.flash[r] - dt * 1.5); }
    for (let i = 0; i < this.nega.length; i++) this.nega[i] = Math.max(0, this.nega[i] - dt);
    if (this.aviso) { this.aviso.t += dt; if (this.aviso.t > this.aviso.d) this.aviso = null; }
    if (this.fala) { this.fala.t += dt; if (this.fala.t > 3) this.fala = null; }
    if (this.msg) { this.msg.t += dt; if (this.msg.t > 1.3) this.msg = null; }
    this.moverMoedas(dt);
    if (this.fase === 'fim') { this.fimT += dt; return this.fimT > 2.8; }
    this.entrada(dt);
    for (let i = 0; i < this.cd.length; i++) this.cd[i] = Math.max(0, this.cd[i] - dt);
    // moedas do alto
    this.ceuT -= dt;
    if (this.ceuT <= 0) { this.ceuT = rand(4.5, 6); const r = Math.floor(rand(0, DF_ROWS)); this.moeda(Math.round(rand(DF_GX + 12, DF_GX + DF_COLS * DF_CW - 12)), DF_GY - 6, dfLy(r) + rand(16, 34), 'ceu'); }
    // fases: pausa entre ondas e onda
    if (this.fase === 'pausa') { this.pausaT -= dt; if (this.pausaT <= 0) this.novaOnda(); }
    else if (this.fase === 'onda') {
      this.ot += dt;
      while (this.fila.length && this.fila[0].at <= this.ot) this.nasce(this.fila.shift());
      if (!this.fila.length && !this.trolls.length) this.fimOnda();
    }
    // defensores
    for (const d of this.defs) {
      d.hit = Math.max(0, d.hit - dt); d.pop = Math.max(0, d.pop - dt);
      if (d.ban > 0) { d.ban -= dt; if (d.ban <= 0 && Math.random() < .6) this.diz(DF_DIZ.volta); continue; }
      const x = dfCx(d.c), y = dfLy(d.r);
      if (d.id === 'sino') {
        d.tm -= dt;
        if (d.tm <= 0) { d.tm = rand(7, 8.5); this.moeda(x + rand(-6, 6), y + 22, y + rand(30, 38), 'gen'); beep(1240, .05, 'triangle', .02); }
      } else if (d.id === 'mod') {
        d.tm -= dt;
        if (d.tm <= 0 && this.temTroll(d.r, x)) { d.tm = 1.45; this.tiros.push({ x: x + 10, y: y + 26, r: d.r, k: Math.random() < .5 ? 0 : 1 }); d.pop = .12; if (this.t - (this.somTiro || 0) > .15) { this.somTiro = this.t; beep(880, .025, 'square', .012); } }
      } else if (d.id === 'timeout') {
        d.tm -= dt;
        if (d.tm <= 0 && this.temTroll(d.r, x)) {
          d.tm = 9; this.raios.push({ r: d.r, x0: x, t: 0 });
          for (const o of this.trolls) if (o.r === d.r && o.x > x - 4 && o.x < W + 4) o.frio = Math.max(o.frio, o.tipo === 'copy' ? 2.2 : 3.2);
          beep(1200, .18, 'triangle', .035, -700);
        }
      }
    }
    // emotes voando
    for (const b of this.tiros) {
      b.x += 170 * dt;
      const alvo = this.trolls.find((o) => o.r === b.r && !o.jump && Math.abs(o.x - b.x) < 9);
      if (alvo) { b.x = 999; alvo.hp -= 20; alvo.hit = .05; if (alvo.hp <= 0) this.matar(alvo); }
    }
    this.tiros = this.tiros.filter((b) => b.x < W + 8);
    // trolls
    for (const tr of [...this.trolls]) {
      tr.hit = Math.max(0, tr.hit - dt); tr.come = false;
      if (tr.jump) {
        const j = tr.jump; j.t += dt; const k = Math.min(1, j.t / .6);
        tr.x = j.x0 + (j.x1 - j.x0) * k; tr.alt = Math.sin(Math.PI * k) * 30;
        if (k >= 1) { tr.jump = null; tr.alt = 0; tr.pogo = false; tr.v *= .7; beep(240, .05, 'square', .02); }
        continue;
      }
      if (tr.frio > 0) { tr.frio -= dt; continue; }
      const d = this.bloqueio(tr);
      if (d) {
        if (tr.pogo) { tr.jump = { x0: tr.x, x1: DF_GX + d.c * DF_CW - 12, t: 0 }; beep(620, .12, 'square', .03, 500); continue; }
        tr.come = true; d.hp -= tr.dps * dt; d.hit = .1;
        if (d.hp <= 0) this.tirar(d);
      } else tr.x -= tr.v * dt;
      if (tr.x < DF_GX - 6) { this.vazar(tr); if (this.fase === 'fim') break; }
    }
    // martelos de banimento
    for (const b of this.bans) {
      b.t += dt;
      if (!b.ok && b.t >= .42) {
        b.ok = true; let n = 0;
        const x0 = DF_GX + (b.c - 1) * DF_CW - 6, x1 = DF_GX + (b.c + 2) * DF_CW + 6;
        for (const o of [...this.trolls]) if (Math.abs(o.r - b.r) <= 1 && o.x >= x0 && o.x <= x1) { o.hp -= 1000; o.hit = .1; n++; if (o.hp <= 0) this.matar(o); }
        shake = .4; beep(120, .4, 'sawtooth', .07, -60); setTimeout(() => beep(90, .3, 'square', .05, -40), 60);
        for (let i = 0; i < 22; i++) this.fx.push({ x: dfCx(b.c), y: dfLy(b.r) + 30, vx: rand(-170, 170), vy: rand(-200, -20), t: 0, life: .7, c: i % 3 ? '#e8443a' : '#ffd04a' });
        this.pops.push({ x: dfCx(b.c), y: dfLy(b.r) + 8, t: 0, txt: 'BANIDO!', c: '#ffd04a' });
        if (n >= 3) this.diz(DF_DIZ.banzao);
      }
    }
    this.bans = this.bans.filter((b) => b.t < .9);
    // o IAmiguinho, moderador-chefe, às vezes bane quem não devia (só visual: o defensor para por 3 s)
    if (this.fase === 'onda' && this.onda >= 2) {
      this.iaT -= dt;
      if (this.iaT <= 0) {
        this.iaT = rand(26, 40);
        const alvos = this.defs.filter((d) => d.id !== 'escudo' && d.ban <= 0);
        if (alvos.length >= 3) { const d = pick(alvos); this.voos.push({ d, t: 0 }); this.diz(DF_DIZ.erro); beep(700, .2, 'square', .03, -400); }
      }
    }
    for (const v of this.voos) {
      v.t += dt;
      if (v.t >= .6 && !v.ok) { v.ok = true; if (this.defs.includes(v.d)) { v.d.ban = 3; this.pops.push({ x: dfCx(v.d.c), y: dfLy(v.d.r) + 8, t: 0, txt: 'BAN?!', c: '#ff8aa3' }); beep(150, .2, 'square', .04, -60); } }
    }
    this.voos = this.voos.filter((v) => !v.ok);
    this.score = this.ondas * DF_PONTO + Math.min(DF_PONTO - 1, this.pontos);
    return false;
  },
  moverMoedas(dt) {
    for (const m of this.moedas) {
      m.t += dt;
      if (m.voa) { m.voa.t += dt * 2.6; const k = Math.min(1, m.voa.t); m.x = m.voa.x0 + (28 - m.voa.x0) * k * k; m.y = m.voa.y0 + (320 - m.voa.y0) * k * k; continue; }
      if (m.kind === 'ceu') { if (m.y < m.ty) m.y = Math.min(m.ty, m.y + m.vy * dt); else m.vida -= dt; }
      else if (m.vy !== 0 || m.y < m.ty) { m.vy += 300 * dt; m.x += m.vx * dt; m.y += m.vy * dt; if (m.vy > 0 && m.y >= m.ty) { m.y = m.ty; m.vy = 0; } }
      else m.vida -= dt;
    }
    this.moedas = this.moedas.filter((m) => (m.voa ? m.voa.t < 1 : m.vida > 0));
  },
  // ---------------------------------------------------------------- desenho
  drawDef(d, t, alpha = 1) {
    const x = Math.round(dfCx(d.c) + (d.hit > 0 ? (Math.floor(t * 40) % 2 ? 1 : -1) : 0)), top = dfLy(d.r);
    const cinza = d.ban > 0;
    ctx.globalAlpha = alpha;
    if (d.id === 'sino') {
      const sw2 = d.tm < .45 ? (Math.floor(t * 20) % 2 ? 1 : -1) : 0, by = top + 14 + Math.round(Math.sin(t * 2 + d.ph));
      sprO(DF_SINO, x - 10 + sw2, by, 2, cinza ? DF_CINZA : DF_PAL);
      if (!cinza) { ctx.fillStyle = '#07050c'; ctx.fillRect(x + 5, by - 3, 7, 7); ctx.fillStyle = '#e8443a'; ctx.fillRect(x + 6, by - 2, 5, 5); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 8, by - 1, 1, 3); }
    } else if (d.id === 'mod') {
      const by = top + 17 + (d.pop > 0 ? -1 : 0);
      sprO(BOT, x - 12, by, 3, cinza ? DF_CINZA : DF_MOD_PAL);
      // fone de moderação
      ctx.fillStyle = '#07050c'; ctx.fillRect(x - 14, by - 2, 28, 3); ctx.fillRect(x - 15, by + 2, 5, 9); ctx.fillRect(x + 10, by + 2, 5, 9);
      ctx.fillStyle = cinza ? '#6b7480' : '#ffd04a'; ctx.fillRect(x - 13, by - 1, 26, 1); ctx.fillRect(x - 14, by + 3, 3, 7); ctx.fillRect(x + 11, by + 3, 3, 7);
      ctx.fillStyle = cinza ? '#6b7480' : '#e8ebee'; ctx.fillRect(x + 14, by + 8, 4, 2);
    } else if (d.id === 'escudo') {
      sprO(DF_ESCUDO, x - 12, top + 10, 2, cinza ? DF_CINZA : DF_PAL);
      const k = d.hp / d.max; ctx.fillStyle = '#07050c';
      if (k < .66) { ctx.fillRect(x - 6, top + 14, 2, 6); ctx.fillRect(x - 4, top + 20, 2, 4); ctx.fillRect(x - 2, top + 24, 2, 3); }
      if (k < .33) { ctx.fillRect(x + 4, top + 12, 2, 8); ctx.fillRect(x + 6, top + 20, 2, 5); ctx.fillRect(x + 2, top + 28, 2, 6); }
    } else if (d.id === 'timeout') {
      const by = top + 13;
      sprO(DF_RELOGIO, x - 12, by, 2, cinza ? DF_CINZA : DF_PAL);
      const a = Math.floor(t * 2 + d.ph) % 8, hx = [0, 1, 1, 1, 0, -1, -1, -1][a], hy = [-1, -1, 0, 1, 1, 1, 0, -1][a];
      ctx.fillStyle = '#07050c'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 1 + hx * i * 2, by + 13 + hy * i * 2, 2, 2);
      ctx.fillStyle = '#e8443a'; ctx.fillRect(x - 1, by + 13, 2, 2);
      if (!cinza && d.tm > 0 && d.tm < 1.2 && Math.floor(t * 8) % 2) { ctx.fillStyle = '#7fdcff'; ctx.fillRect(x + 12, by + 2, 2, 2); }
    }
    if (cinza) {
      ctx.fillStyle = '#07050c'; ctx.fillRect(x - 9, top + 2, 18, 11); ctx.fillStyle = '#e8443a'; ctx.fillRect(x - 8, top + 3, 16, 9);
      ctx.font = '800 8px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText('BAN', x, top + 11); ctx.textAlign = 'left';
    } else if (d.hp < d.max && alpha === 1) {
      ctx.fillStyle = '#07050c'; ctx.fillRect(x - 10, top + 4, 20, 4); ctx.fillStyle = '#2b3442'; ctx.fillRect(x - 9, top + 5, 18, 2);
      ctx.fillStyle = d.hp / d.max > .4 ? '#8fd3ae' : '#ff8a8a'; ctx.fillRect(x - 9, top + 5, Math.max(1, Math.round(18 * d.hp / d.max)), 2);
    }
    ctx.globalAlpha = 1;
  },
  drawTroll(o, t) {
    const T = DF_TROLL[o.tipo], x = Math.round(o.x), top = dfLy(o.r), feet = top + DF_CH - 4 - Math.round(o.alt);
    const pal = o.hit > 0 && Math.floor(t * 30) % 2 ? DF_BRANCO : o.frio > 0 ? DF_GELO : T.pal;
    const passo = o.frio <= 0 && !o.come && Math.floor(t * 6 + o.ph) % 2;
    const bob = o.come ? (Math.floor(t * 10) % 2) : passo ? -1 : 0;
    let sy = feet - 27 + bob;
    if (o.tipo === 'pula' && o.pogo) {
      sy -= 6 + (o.frio > 0 ? 0 : Math.abs(Math.round(Math.sin(t * 9 + o.ph) * 3)));
      ctx.fillStyle = '#07050c'; ctx.fillRect(x - 3, sy + 24, 6, feet - sy - 22); ctx.fillStyle = '#c3c9cf';
      for (let yy = sy + 26; yy < feet; yy += 3) ctx.fillRect(x - 2, yy, 4, 1);
    }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 10, top + DF_CH - 4, 20, 2);
    if (o.tipo === 'caps' && o.frio <= 0) { ctx.fillStyle = 'rgba(255,138,90,.55)'; for (let i = 0; i < 3; i++) ctx.fillRect(x + 14 + ((i * 5 + Math.floor(t * 30)) % 6), sy + 6 + i * 6, 6, 1); }
    sprO(o.tipo === 'caps' ? DF_T_GRITA : passo ? DF_T_ANDA : DF_T_RI, x - 12, sy, 3, pal);
    if (o.tipo === 'copy') {
      // a copypasta gigante: um textão que vai rasgando
      const px = x - 22, py = sy - 12, ph = 36, k = o.hp / o.max;
      ctx.fillStyle = '#07050c'; ctx.fillRect(px - 1, py - 1, 18, ph + 2);
      ctx.fillStyle = o.frio > 0 ? '#d8f4ff' : '#efe6d2'; ctx.fillRect(px, py, 16, ph);
      ctx.fillStyle = o.frio > 0 ? '#7fb8d8' : '#9a8f78';
      const linhas = Math.max(1, Math.ceil(k * 10));
      for (let i = 0; i < linhas; i++) ctx.fillRect(px + 2, py + 3 + i * 3, i % 3 === 2 ? 8 : 12, 1);
      if (k < .5) { ctx.fillStyle = '#07050c'; ctx.fillRect(px + 10, py + ph - 8, 6, 8); ctx.fillRect(px + 13, py + ph - 12, 3, 4); }
    } else {
      // balão de chat do troll
      const bx = x - 6, by = sy - 11;
      ctx.fillStyle = '#07050c'; ctx.fillRect(bx - 1, by - 1, 20, 9); ctx.fillRect(bx + 1, by + 8, 3, 2);
      ctx.fillStyle = o.tipo === 'caps' ? '#ff6a3d' : '#f2f4f6'; ctx.fillRect(bx, by, 18, 7); ctx.fillRect(bx + 2, by + 7, 1, 1);
      ctx.fillStyle = o.tipo === 'caps' ? '#ffffff' : '#5d6875';
      if (o.tipo === 'caps') { for (let i = 0; i < 3; i++) { ctx.fillRect(bx + 3 + i * 5, by + 1, 2, 3); ctx.fillRect(bx + 3 + i * 5, by + 5, 2, 1); } }
      else { const s = Math.floor(t * 3 + o.ph) % 3; ctx.fillRect(bx + 2, by + 3, 5 + s, 1); ctx.fillRect(bx + 9 + s, by + 3, 6 - s, 1); }
    }
    if (o.frio > 0) { ctx.fillStyle = 'rgba(127,220,255,.18)'; ctx.fillRect(x - 15, sy - 2, 30, feet - sy + 2); ctx.fillStyle = '#ffffff'; const s = Math.floor(t * 6) % 3; ctx.fillRect(x - 12 + s * 9, sy + 2 + s * 5, 2, 2); }
    if (o.hp < o.max) { ctx.fillStyle = '#07050c'; ctx.fillRect(x - 9, feet + 1, 18, 3); ctx.fillStyle = '#ff6a6a'; ctx.fillRect(x - 8, feet + 2, Math.max(1, Math.round(16 * o.hp / o.max)), 1); }
  },
  draw(t = this.t) {
    // fundo e topo (o HUD fica em cima)
    ctx.fillStyle = '#07080d'; ctx.fillRect(0, 0, W, H);
    let g = ctx.createLinearGradient(0, 0, 0, DF_GY); g.addColorStop(0, '#120c22'); g.addColorStop(1, '#0b0d16'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, DF_GY);
    ctx.fillStyle = 'rgba(183,156,255,.06)'; for (let y = 2; y < DF_GY; y += 4) ctx.fillRect(0, y, W, 1);
    // faixas do chat
    const COR = ['#7fdcff', '#ffd04a', '#8fd3ae', '#e86fa8', '#b79cff'];
    for (let r = 0; r < DF_ROWS; r++) {
      const y = dfLy(r);
      ctx.fillStyle = r % 2 ? '#0c0f19' : '#10131e'; ctx.fillRect(DF_GX, y, W - DF_GX, DF_CH);
      ctx.fillStyle = 'rgba(232,235,238,.06)'; ctx.fillRect(DF_GX, y, W - DF_GX, 1);
      // mensagens fantasmas do chat, ao fundo
      ctx.globalAlpha = .13; ctx.fillStyle = COR[r]; ctx.fillRect(DF_GX + 4, y + 5, 14, 2);
      ctx.fillStyle = '#c3c9cf'; for (let i = 0, xx = DF_GX + 22; i < 6; i++) { const w = 10 + ((r * 7 + i * 13) % 22); ctx.fillRect(xx, y + 5, w, 2); xx += w + 4; }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(232,235,238,.05)'; for (let c = 1; c < DF_COLS; c++) for (let yy = y + 3; yy < y + DF_CH - 2; yy += 6) ctx.fillRect(DF_GX + c * DF_CW, yy, 1, 2);
      if (this.flash && this.flash[r] > 0) { ctx.fillStyle = `rgba(232,68,58,${(this.flash[r] * .35).toFixed(3)})`; ctx.fillRect(0, y, W, DF_CH); }
    }
    ctx.fillStyle = 'rgba(232,235,238,.06)'; ctx.fillRect(DF_GX, DF_GY + DF_ROWS * DF_CH, W - DF_GX, 1);
    // a câmera da live, com o sofá em cada faixa
    ctx.fillStyle = '#150e24'; ctx.fillRect(0, DF_GY, DF_GX - 2, DF_ROWS * DF_CH); ctx.fillStyle = '#2b1d48'; ctx.fillRect(DF_GX - 3, DF_GY, 2, DF_ROWS * DF_CH);
    for (let r = 0; r < DF_ROWS; r++) {
      const y = dfLy(r), perto = this.trolls && this.trolls.some((o) => o.r === r && o.x < DF_GX + DF_CW * 1.6);
      ctx.fillStyle = 'rgba(255,214,140,.05)'; ctx.fillRect(4, y + 6, DF_GX - 10, DF_CH - 10);
      sprO(DF_SOFA, 5, y + 24, 2, DF_PAL);
      if (perto && Math.floor(t * 6) % 2) { ctx.fillStyle = 'rgba(232,68,58,.28)'; ctx.fillRect(0, y + 1, DF_GX - 3, DF_CH - 1); }
    }
    // selo de ao vivo e vidas
    // (fica à direita, embaixo do texto do HUD, que no celular ocupa o canto esquerdo inteiro)
    ctx.font = '800 8px Archivo, sans-serif'; const lw = Math.ceil(ctx.measureText('AO VIVO').width) + 14, px = W - 44 - lw;
    ctx.fillStyle = '#07050c'; ctx.fillRect(px - 1, DF_GY - 13, lw + 2, 11); ctx.fillStyle = '#e8443a'; ctx.fillRect(px, DF_GY - 12, lw, 9);
    ctx.fillStyle = Math.floor(t * 1.5) % 2 ? '#ffffff' : '#ffb0aa'; ctx.fillRect(px + 3, DF_GY - 9, 3, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillText('AO VIVO', px + 8, DF_GY - 5);
    for (let i = 0; i < 3; i++) sprO(DF_CORACAO, W - 38 + i * 12, DF_GY - 13, 2, i < (this.vidas ?? 3) ? DF_PAL : { R: '#3a3f4c' });
    // cursor (embaixo das coisas)
    const cu = this.cur, k = DF_CARTAS[this.sel];
    if (cu) {
      const L = DF_GX + cu.c * DF_CW, T = dfLy(cu.r);
      ctx.fillStyle = 'rgba(232,235,238,.07)'; ctx.fillRect(L + 1, T + 1, DF_CW - 1, DF_CH - 1);
      if (k.id === 'ban') { ctx.strokeStyle = 'rgba(232,68,58,.5)'; ctx.lineWidth = 1; ctx.strokeRect(L - DF_CW + .5, Math.max(DF_GY, T - DF_CH) + .5, DF_CW * 3 - 1, Math.min(DF_GY + DF_ROWS * DF_CH, T + 2 * DF_CH) - Math.max(DF_GY, T - DF_CH) - 1); }
    }
    // defensores
    for (const d of this.defs || []) this.drawDef(d, t);
    if (cu && k.id !== 'ban' && !this.grid[cu.r][cu.c] && this.pc >= k.custo && this.cd[this.sel] <= 0) this.drawDef({ id: k.id, c: cu.c, r: cu.r, hp: 1, max: 1, tm: 5, ban: 0, hit: 0, ph: 0 }, t, .35);
    // raios de timeout
    for (const rr of this.raios || []) { const a = 1 - rr.t / .45, y = dfLy(rr.r) + 18; ctx.fillStyle = `rgba(127,220,255,${(a * .45).toFixed(3)})`; ctx.fillRect(Math.round(rr.x0), y, W - Math.round(rr.x0), 14); ctx.fillStyle = `rgba(255,255,255,${(a * .8).toFixed(3)})`; ctx.fillRect(Math.round(rr.x0), y + 6, W - Math.round(rr.x0), 2); }
    // trolls (de cima para baixo)
    const tro = [...(this.trolls || [])].sort((a, b) => a.r - b.r || b.x - a.x);
    for (const o of tro) this.drawTroll(o, t);
    // emotes
    for (const b of this.tiros || []) { const [rows] = DF_EMOTES[b.k]; sprO(rows, Math.round(b.x) - 5, Math.round(b.y) - 5 + (Math.floor(b.x / 12) % 2), 2, DF_PAL_EMO[b.k]); }
    // martelos de banimento
    for (const b of this.bans || []) {
      const cx = dfCx(b.c), T = dfLy(b.r);
      if (b.t < .42) { const kk = b.t / .42, y = Math.round(T - 46 + kk * kk * 50); sprO(DF_MARTELO, cx - 11, y, 2, DF_PAL); }
      else {
        const kk = (b.t - .42) / .48, a = 1 - kk;
        ctx.strokeStyle = `rgba(255,208,74,${a.toFixed(3)})`; ctx.lineWidth = 3;
        const rw = 20 + kk * DF_CW * 1.6, rh = 14 + kk * DF_CH * 1.3; ctx.strokeRect(Math.round(cx - rw), Math.round(T + 28 - rh), Math.round(rw * 2), Math.round(rh * 2));
        if (kk < .5) sprO(DF_MARTELO, cx - 11, T + 4, 2, DF_PAL);
      }
    }
    // moedas de pontos do canal
    for (const m of this.moedas || []) {
      if (!m.voa && m.vida < 2 && Math.floor(t * 10) % 2) continue;
      const bob = m.voa || m.y < m.ty || m.vy ? 0 : Math.round(Math.sin(t * 4 + m.x) * 1.5);
      sprO(DF_MOEDA, Math.round(m.x) - 8, Math.round(m.y) - 8 + bob, 2, DF_PAL);
    }
    // faíscas e textos
    for (const f of this.fx || []) { ctx.globalAlpha = 1 - f.t / f.life; ctx.fillStyle = f.c; ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2); }
    ctx.globalAlpha = 1; ctx.textAlign = 'center';
    for (const p of this.pops || []) { ctx.globalAlpha = 1 - p.t / .9; ctx.font = '800 12px Archivo, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = '#07050c'; const y = Math.round(p.y - p.t * 22); ctx.strokeText(p.txt, p.x, y); ctx.fillStyle = p.c; ctx.fillText(p.txt, p.x, y); }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
    // o martelo do IAmiguinho voando (ban errado)
    for (const v of this.voos || []) { const kk = Math.min(1, v.t / .6), tx = dfCx(v.d.c), ty = dfLy(v.d.r) + 10; const x = 160 + (tx - 160) * kk, y = 34 + (ty - 34) * kk - Math.sin(Math.PI * kk) * 30; spr(DF_MARTELO, Math.round(x) - 5, Math.round(y) - 6, 1, Math.floor(t * 14) % 2, DF_PAL); }
    // o IAmiguinho, moderador-chefe, na mesinha do alto
    ctx.fillStyle = '#07050c'; ctx.fillRect(134, 41, 52, 9); ctx.fillStyle = '#1e2638'; ctx.fillRect(135, 42, 50, 7); ctx.fillStyle = '#3fbf6a'; ctx.fillRect(138, 44, 3, 3); ctx.fillStyle = '#7fdcff'; ctx.fillRect(176, 44, 6, 3);
    drawIA(146, 9, 2, t, { flip: (this.voos && this.voos.length) ? false : Math.floor(t / 4) % 2 === 1, fast: !!(this.voos && this.voos.length) });
    if (this.fala) {
      ctx.font = F_SM; const lines = wrapLines(this.fala.s, 190), w = Math.max(...lines.map((s) => ctx.measureText(s).width)) + 14, h = lines.length * 13 + 7;
      const bx = Math.round(clamp(160 - w / 2, 4, W - 4 - w)), by = 52;
      ctx.globalAlpha = Math.min(1, (3 - this.fala.t) * 4);
      ctx.fillStyle = '#07050c'; ctx.fillRect(bx - 1, by - 1, Math.round(w) + 2, h + 2); ctx.fillRect(155, by - 5, 10, 5);
      ctx.fillStyle = '#f2f4f6'; ctx.fillRect(bx, by, Math.round(w), h); ctx.fillRect(157, by - 3, 6, 3);
      ctx.fillStyle = '#0b0d10'; lines.forEach((s, i) => ctx.fillText(s, bx + 7, by + 12 + i * 13));
      ctx.globalAlpha = 1;
    }
    // barra das cartas
    ctx.fillStyle = '#0a0c12'; ctx.fillRect(0, DF_GY + DF_ROWS * DF_CH + 1, W, H); ctx.fillStyle = 'rgba(232,235,238,.1)'; ctx.fillRect(0, DF_BY - 16, W, 1);
    ctx.font = F_SM;
    if (this.msg) { ctx.fillStyle = '#ff8a8a'; ctx.fillText(this.msg.s, DF_KX, DF_BY - 5); }
    else { ctx.fillStyle = '#e8ebee'; ctx.fillText(k.nome.toUpperCase(), DF_KX, DF_BY - 5); }
    ctx.fillStyle = '#161b26'; ctx.fillRect(2, DF_BY, 52, 54);
    sprO(DF_MOEDA, 20, DF_BY + 7, 2, DF_PAL);
    ctx.textAlign = 'center'; ctx.font = F_MID; ctx.fillStyle = '#ffd04a'; ctx.fillText(String(this.pc ?? 0), 28, DF_BY + 44); ctx.textAlign = 'left';
    DF_CARTAS.forEach((c, i) => {
      const sel = i === this.sel, x = DF_KX + i * DF_KG + (this.nega[i] > 0 ? (Math.floor(t * 40) % 2 ? 1 : -1) : 0), y = DF_BY - (sel ? 3 : 0), pode = this.pc >= c.custo;
      ctx.fillStyle = sel ? '#f2f4f6' : '#07050c'; ctx.fillRect(x - 1, y - 1, DF_KW + 2, 56);
      ctx.fillStyle = sel ? '#232b3b' : '#161b26'; ctx.fillRect(x + (sel ? 1 : 0), y + (sel ? 1 : 0), DF_KW - (sel ? 2 : 0), 54 - (sel ? 2 : 0));
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, DF_KW, 40); ctx.clip();
      const cx = x + DF_KW / 2;
      if (c.id === 'sino') sprO(DF_SINO, cx - 10, y + 9, 2, DF_PAL);
      else if (c.id === 'mod') sprO(BOT, cx - 12, y + 10, 3, DF_MOD_PAL);
      else if (c.id === 'escudo') sprO(DF_ESCUDO, cx - 12, y + 6, 2, DF_PAL);
      else if (c.id === 'timeout') sprO(DF_RELOGIO, cx - 12, y + 8, 2, DF_PAL);
      else sprO(DF_MARTELO, cx - 11, y + 7, 2, DF_PAL);
      ctx.restore();
      if (!pode || this.cd[i] > 0) { ctx.fillStyle = 'rgba(7,8,13,.6)'; ctx.fillRect(x, y, DF_KW, 54); }
      if (this.cd[i] > 0) { const kk = this.cd[i] / c.cd; ctx.fillStyle = 'rgba(7,8,13,.6)'; ctx.fillRect(x, y, DF_KW, Math.round(54 * Math.min(1, kk))); }
      ctx.textAlign = 'center'; ctx.font = '700 11px "IBM Plex Mono", monospace'; ctx.fillStyle = pode ? '#ffd04a' : '#ff8a8a'; ctx.fillText(String(c.custo), cx, y + 50);
      ctx.fillStyle = sel ? '#ffffff' : '#5e666f'; ctx.font = '600 8px "IBM Plex Mono", monospace'; ctx.fillText(String(i + 1), x + 6, y + 9); ctx.textAlign = 'left';
    });
    if (state !== 'play') return;
    if (this.aviso && this.aviso.t < this.aviso.d) banner(this.aviso.lines, 170);
  },
  hud() {
    const r = this.fase === 'pausa' ? `Onda ${this.onda + 1} em ${Math.ceil(this.pausaT)} s` : this.fase === 'fim' ? 'A live caiu' : `Onda ${this.onda} · ${this.vidas} ${this.vidas === 1 ? 'vida' : 'vidas'}`;
    return [`Ondas · ${this.pontos} pts`, this.ondas, r];
  },
  overText() { return `Sobreviveu a ${this.ondas} ${this.ondas === 1 ? 'onda' : 'ondas'} e baniu ${this.banidos} trolls. Desempate: ${this.pontos} pontos.`; },
};
ARCADE_NOVOS.push(dfJogo);
