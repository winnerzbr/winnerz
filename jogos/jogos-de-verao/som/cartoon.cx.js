// Sons em estilo desenho animado para os Jogos de Verão (02/11/2026, pedido do dono depois de recusar a sonoplastia realista).
// Família: apito de êmbolo (sobe e desce), "boing" de berimbau de boca, blocos de madeira, xilofone, "pop" de rolha, bolhas, buzina de palhaço.
// Nomes terminados em _1, _2... são variações (o jogo sorteia). Os que terminam em "_loop" repetem sem emenda.
// Feito com chirp: node ~/.game-tools/chirp/bin/chirp.js build cartoon.cx.js --no-preview

// ---------- peças que se repetem
const madeira = (f, v = 1, t = 0) => at(t,
  tone({ wave: "sine", freq: f, to: f * 0.82, dur: 0.035, env: [0.001, 0.03, 0, 0.04], vol: 0.8 * v }),
  tone({ wave: "triangle", freq: f * 2.7, dur: 0.02, env: [0.001, 0.015, 0, 0.015], vol: 0.25 * v }),
  noise({ color: "white", dur: 0.008, env: [0.0005, 0.006, 0, 0.004], filter: { type: "bp", cutoff: f * 3, q: 2 }, vol: 0.35 * v }));
const xilo = (nota, t = 0, v = 1, d = 0.16) => at(t,
  tone({ wave: "sine", freq: nota, dur: 0.02, env: [0.001, d, 0, d], vol: 0.7 * v }),
  tone({ wave: "sine", freq: nota, dur: 0.02, env: [0.001, 0.03, 0, 0.03], vol: 0.25 * v }),
  tone({ wave: "triangle", freq: nota * 4, dur: 0.01, env: [0.0005, 0.02, 0, 0.02], vol: 0.12 * v }));
const sino = (nota, t = 0, v = 1, d = 0.5) => at(t,
  tone({ wave: "fm", freq: nota, fm: { ratio: 2, index: 1.6, decay: 0.2 }, dur: 0.02, env: [0.001, d, 0, d], vol: 0.35 * v }));
const bolha = (f, t, v = 1) => at(t, tone({ wave: "sine", freq: f, to: f * 2.1, dur: 0.035, env: [0.002, 0.03, 0, 0.02], vol: 0.35 * v }));
const pop = (f = 520, v = 1, t = 0) => at(t,
  tone({ wave: "sine", freq: f, to: f * 2.4, slide: 0.025, dur: 0.03, env: [0.001, 0.03, 0, 0.03], vol: 0.8 * v }),
  noise({ color: "white", dur: 0.01, env: [0.0005, 0.008, 0, 0.006], filter: { type: "bp", cutoff: 2500, q: 1 }, vol: 0.4 * v }));
const fiu = (de, ate, d, v = 1, t = 0) => at(t,   // apito de êmbolo (slide whistle)
  tone({ wave: "sine", freq: de, to: ate, slide: d, curve: "lin", dur: d, env: [0.015, 0.02, 0.9, 0.04], vibrato: { rate: 7, depth: 0.25 }, vol: 0.55 * v }),
  noise({ color: "pink", dur: d, env: [0.015, 0.02, 0.6, 0.04], filter: { type: "bp", from: de * 1.5, to: ate * 1.5, q: 3 }, vol: 0.08 * v }));
const boing = (f, d, v = 1, t = 0, sobe = 1.6) => at(t,   // berimbau de boca
  tone({ wave: "fm", freq: f, to: f * sobe, slide: d * 0.6, fm: { ratio: 2, index: 2.2, decay: d }, dur: 0.02, env: [0.002, d, 0, d * 0.6], vibrato: { rate: 15, depth: 1.6 }, vol: 0.6 * v }),
  tone({ wave: "sine", freq: f * 0.5, to: f * 0.5 * sobe, slide: d * 0.6, dur: 0.02, env: [0.002, d * 0.7, 0, d * 0.4], vibrato: { rate: 15, depth: 1.6 }, vol: 0.3 * v }));
const puf = (v = 1, t = 0, cor = 900) => at(t,
  noise({ color: "pink", dur: 0.06, env: [0.003, 0.05, 0, 0.06], filter: { type: "lp", from: cor * 2, to: cor * 0.4 }, vol: 0.7 * v }),
  tone({ wave: "sine", freq: 260, to: 120, dur: 0.05, env: [0.001, 0.05, 0, 0.03], vol: 0.55 * v }));

// ---------- pés
[1046, 1175, 988, 1109].forEach((f, i) => sfx(`passo_tip_${i + 1}`, { vol: 0.42 }, madeira(f, 1), xilo(f * 1.5, 0.002, 0.25, 0.05)));
for (let i = 1; i <= 3; i++) sfx(`passo_areia_${i}`, { vol: 0.5 }, puf(0.9, 0, 700 + i * 120), tone({ wave: "sine", freq: 380 + i * 30, to: 300, dur: 0.03, env: [0.001, 0.03, 0, 0.02], vol: 0.25 }));
for (let i = 1; i <= 2; i++) sfx(`passo_fofo_${i}`, { vol: 0.5 },   // squish
  tone({ wave: "sine", freq: 210 + i * 25, to: 380 + i * 30, slide: 0.07, dur: 0.12, env: [0.004, 0.08, 0.3, 0.06], vibrato: { rate: 24, depth: 1.2 }, vol: 0.55 }),
  noise({ color: "pink", dur: 0.12, env: [0.006, 0.08, 0.2, 0.06], filter: { type: "bp", from: 600, to: 1800, q: 4 }, vol: 0.35 }));
for (let i = 1; i <= 2; i++) sfx(`passo_poca_${i}`, { vol: 0.45 },   // "ploc"
  tone({ wave: "sine", freq: 380 + i * 60, to: 1500 + i * 150, slide: 0.05, dur: 0.06, env: [0.001, 0.05, 0, 0.04], vol: 0.6 }),
  bolha(900 + i * 100, 0.05, 0.6), bolha(1250, 0.085, 0.4));
for (let i = 1; i <= 2; i++) sfx(`plof_${i}`, { vol: 0.4 },   // Amiguinho geleia
  tone({ wave: "sine", freq: 520 + i * 60, to: 210, slide: 0.09, dur: 0.12, env: [0.003, 0.1, 0, 0.06], vibrato: { rate: 19, depth: 1.5 }, vol: 0.6 }));

// ---------- corpo
sfx("pulo", { vol: 0.45 }, fiu(480, 1500, 0.22));
sfx("pulo_boing", { vol: 0.5 }, boing(160, 0.62));
sfx("pouso", { vol: 0.55 }, tone({ wave: "sine", freq: 190, to: 60, dur: 0.1, env: [0.001, 0.1, 0, 0.05], vol: 0.9 }), puf(0.7, 0, 600));
sfx("estrelinhas", { vol: 0.32 }, [2093, 2637, 3136, 2637, 3520, 3136].map((n, k) => sino(n, k * 0.07, 0.8 - k * 0.08, 0.35)));
sfx("bonk", { vol: 0.55 },
  tone({ wave: "sine", freq: 880, to: 440, dur: 0.06, env: [0.001, 0.07, 0, 0.06], vol: 0.6 }),
  tone({ wave: "triangle", freq: 210, to: 120, dur: 0.09, env: [0.001, 0.1, 0, 0.08], vol: 0.6 }),
  noise({ color: "white", dur: 0.012, env: [0.0005, 0.01, 0, 0.01], filter: { type: "bp", cutoff: 2200, q: 1.5 }, vol: 0.5 }));
sfx("tombo", { vol: 0.5 }, fiu(1500, 330, 0.42), at(0.42, play("bonk", { vol: 1 })), at(0.52, play("estrelinhas", { vol: 0.8 })));
sfx("whoosh", { vol: 0.4 },
  noise({ color: "pink", dur: 0.18, env: [0.03, 0.1, 0.3, 0.06], filter: { type: "bp", from: 700, to: 3200, q: 2.5 }, vol: 0.8 }),
  tone({ wave: "sine", freq: 900, to: 1900, dur: 0.16, env: [0.03, 0.1, 0.2, 0.05], vol: 0.12 }));
sfx("derrapada", { vol: 0.32 },   // "skrrrt" de desenho
  tone({ wave: "saw", freq: 1650, to: 1350, dur: 0.32, env: [0.005, 0.1, 0.7, 0.08], vibrato: { rate: 38, depth: 0.9 }, filter: { type: "bp", cutoff: 2600, q: 3 }, vol: 0.6 }),
  noise({ color: "white", dur: 0.32, env: [0.005, 0.1, 0.5, 0.08], filter: { type: "bp", cutoff: 3500, q: 2 }, tremolo: { rate: 38, depth: 0.5 }, vol: 0.25 }));

// ---------- rodas e manobras
sfx("rodas_loop", { dur: 1, loop: true, vol: 0.35 },   // "rrrrr" ronronando
  tone({ wave: "square", freq: 92, dur: 1.1, env: [0, 0, 1, 0], tremolo: { rate: 16, depth: 0.55 }, filter: { type: "lp", cutoff: 520 }, vol: 0.45 }),
  tone({ wave: "triangle", freq: 184, dur: 1.1, env: [0, 0, 1, 0], tremolo: { rate: 16, depth: 0.4 }, vol: 0.15 }));
sfx("grind_loop", { dur: 1, loop: true, vol: 0.28 },   // "zzzzt"
  tone({ wave: "saw", freq: 330, dur: 1.1, env: [0, 0, 1, 0], tremolo: { rate: 30, depth: 0.5 }, filter: { type: "bp", cutoff: 1800, q: 2 }, vibrato: { rate: 6, depth: 0.3 }, vol: 0.6 }),
  tone({ wave: "square", freq: 663, dur: 1.1, env: [0, 0, 1, 0], duty: 0.25, filter: { type: "lp", cutoff: 2600 }, vol: 0.12 }));
sfx("ollie", { vol: 0.55 }, pop(300, 1), madeira(700, 0.5, 0.01));
sfx("manobra", { vol: 0.35 }, tone({ wave: "triangle", freq: 800, to: 2400, slide: 0.18, dur: 0.18, env: [0.005, 0.1, 0.5, 0.08], vol: 0.6 }), [0, 1, 2].map((k) => sino(2637 * [1, 1.26, 1.5][k], 0.12 + k * 0.05, 0.6, 0.25)));
sfx("pouso_skate", { vol: 0.5 }, madeira(520, 1), madeira(430, 0.8, 0.045), tone({ wave: "sine", freq: 150, to: 70, dur: 0.06, env: [0.001, 0.06, 0, 0.04], vol: 0.6 }));
sfx("catraca_loop", { dur: 0.5, loop: true, vol: 0.35 }, [0, 1, 2, 3, 4, 5].map((k) => madeira(2200 + (k % 2) * 180, 0.6, k / 12)));

// ---------- água
sfx("splash", { vol: 0.5 },
  noise({ color: "white", dur: 0.18, env: [0.002, 0.12, 0.2, 0.1], filter: { type: "bp", from: 3200, to: 900, q: 1.2 }, vol: 0.55 }),
  tone({ wave: "sine", freq: 320, to: 1200, slide: 0.04, dur: 0.05, env: [0.001, 0.05, 0, 0.03], vol: 0.45 }),
  [0.07, 0.1, 0.14, 0.17, 0.22].map((t, k) => bolha(700 + k * 170, t, 0.8 - k * 0.1)));
sfx("splash_grande", { vol: 0.55 },
  noise({ color: "white", dur: 0.32, env: [0.002, 0.2, 0.3, 0.2], filter: { type: "bp", from: 2600, to: 500, q: 1 }, vol: 0.7 }),
  tone({ wave: "sine", freq: 220, to: 900, slide: 0.06, dur: 0.07, env: [0.001, 0.07, 0, 0.04], vol: 0.55 }),
  [0.1, 0.13, 0.17, 0.2, 0.25, 0.29, 0.34, 0.4].map((t, k) => bolha(520 + ((k * 230) % 900), t, 0.9 - k * 0.08)));
sfx("bolhas", { vol: 0.4 }, [0, 0.05, 0.08, 0.13, 0.17, 0.22, 0.25, 0.31].map((t, k) => bolha(600 + ((k * 317) % 800), t, 1 - k * 0.07)));
sfx("mergulho", { vol: 0.5 },   // "bloop"
  tone({ wave: "sine", freq: 820, to: 160, slide: 0.18, dur: 0.2, env: [0.002, 0.18, 0, 0.06], vibrato: { rate: 11, depth: 1 }, vol: 0.7 }),
  at(0.12, play("bolhas", { vol: 0.7 })));
for (let i = 1; i <= 2; i++) sfx(`remada_${i}`, { vol: 0.42 },   // "plac-ploc"
  tone({ wave: "sine", freq: 300 + i * 50, to: 1100 + i * 120, slide: 0.04, dur: 0.05, env: [0.001, 0.05, 0, 0.03], vol: 0.6 }),
  noise({ color: "white", dur: 0.08, env: [0.002, 0.06, 0, 0.05], filter: { type: "bp", from: 2400, to: 1200, q: 1.3 }, vol: 0.35 }),
  bolha(800 + i * 140, 0.06, 0.5));
for (let i = 1; i <= 2; i++) sfx(`bracada_${i}`, { vol: 0.38 },   // "splish"
  noise({ color: "white", dur: 0.09, env: [0.004, 0.07, 0, 0.05], filter: { type: "bp", from: 1800, to: 3600, q: 1.6 }, vol: 0.5 }),
  tone({ wave: "sine", freq: 600 + i * 80, to: 1500, slide: 0.05, dur: 0.05, env: [0.002, 0.05, 0, 0.03], vol: 0.35 }));
sfx("jato_loop", { dur: 0.6, loop: true, vol: 0.3 },   // pistola d'água: "pssshh" com bolhinhas
  noise({ color: "white", dur: 0.7, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 3000, q: 1.4 }, tremolo: { rate: 13, depth: 0.35 }, vol: 0.45 }),
  [0.05, 0.2, 0.33, 0.48].map((t, k) => bolha(1000 + k * 210, t, 0.5)));
sfx("splat", { vol: 0.5 },   // bexiga d'água acertando
  noise({ color: "pink", dur: 0.12, env: [0.001, 0.1, 0, 0.08], filter: { type: "lp", from: 4000, to: 600 }, vol: 0.8 }),
  tone({ wave: "sine", freq: 300, to: 90, dur: 0.08, env: [0.001, 0.08, 0, 0.05], vibrato: { rate: 25, depth: 2 }, vol: 0.6 }),
  [0.06, 0.1, 0.15].map((t, k) => bolha(1100 + k * 300, t, 0.5)));

// ---------- motores (o jogo muda a velocidade conforme a aceleração)
sfx("motor_bugue_loop", { dur: 1, loop: true, vol: 0.32 },   // "brrrum" de carrinho de desenho
  tone({ wave: "square", freq: 64, dur: 1.1, env: [0, 0, 1, 0], tremolo: { rate: 24, depth: 0.7 }, filter: { type: "lp", cutoff: 700 }, vol: 0.55 }),
  tone({ wave: "saw", freq: 128, dur: 1.1, env: [0, 0, 1, 0], tremolo: { rate: 24, depth: 0.6 }, filter: { type: "lp", cutoff: 1100 }, vol: 0.2 }));
sfx("motor_jetski_loop", { dur: 1, loop: true, vol: 0.28 },   // "nheeeem"
  tone({ wave: "saw", freq: 150, dur: 1.1, env: [0, 0, 1, 0], vibrato: { rate: 5, depth: 0.4 }, tremolo: { rate: 32, depth: 0.45 }, filter: { type: "bp", cutoff: 900, q: 1.4 }, vol: 0.55 }),
  noise({ color: "pink", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 2600, q: 1 }, vol: 0.1 }));
sfx("motor_aviao_loop", { dur: 1, loop: true, vol: 0.3 },   // hélice "brrrrrr"
  tone({ wave: "square", freq: 96, dur: 1.1, env: [0, 0, 1, 0], tremolo: { rate: 36, depth: 0.85 }, filter: { type: "lp", cutoff: 900 }, vol: 0.5 }),
  noise({ color: "brown", dur: 1.1, env: [0, 0, 1, 0], tremolo: { rate: 36, depth: 0.7 }, filter: { type: "lp", cutoff: 600 }, vol: 0.3 }));
sfx("vrum", { vol: 0.4 },
  tone({ wave: "square", freq: 60, to: 210, slide: 0.45, dur: 0.5, env: [0.01, 0.1, 0.8, 0.12], tremolo: { rate: 26, depth: 0.7 }, filter: { type: "lp", cutoff: 1300 }, vol: 0.6 }));
sfx("turbo", { vol: 0.35 }, fiu(600, 2600, 0.35, 1), [0, 1, 2, 3].map((k) => sino([2093, 2637, 3136, 4186][k], 0.25 + k * 0.045, 0.55, 0.25)));
sfx("buzina", { vol: 0.42 },   // "fon-fon" de palhaço
  [0, 0.2].map((t) => at(t,
    tone({ wave: "saw", freq: 349, to: 330, dur: 0.14, env: [0.006, 0.04, 0.8, 0.04], vibrato: { rate: 30, depth: 0.25 }, filter: { type: "bp", cutoff: 1100, q: 1.2 }, vol: 0.55 }),
    tone({ wave: "saw", freq: 440, to: 415, dur: 0.14, env: [0.006, 0.04, 0.8, 0.04], vibrato: { rate: 30, depth: 0.25 }, filter: { type: "bp", cutoff: 1300, q: 1.2 }, vol: 0.4 }))));
sfx("batida", { vol: 0.5 },   // "crash-bonk-boing"
  noise({ color: "white", dur: 0.12, env: [0.001, 0.1, 0, 0.1], filter: { type: "bp", from: 3000, to: 900, q: 0.8 }, vol: 0.6 }),
  play("bonk", { vol: 1 }), boing(120, 0.38, 0.8, 0.08, 1.4));

// ---------- bolas
for (let i = 1; i <= 2; i++) sfx(`quique_${i}`, { vol: 0.5 },   // basquete "dum"
  tone({ wave: "sine", freq: 150 + i * 15, to: 210 + i * 15, slide: 0.03, dur: 0.07, env: [0.001, 0.08, 0, 0.05], vol: 0.85 }),
  tone({ wave: "triangle", freq: 420 + i * 40, to: 300, dur: 0.03, env: [0.001, 0.03, 0, 0.02], vol: 0.2 }));
sfx("aro", { vol: 0.4 },   // "dlonnng"
  tone({ wave: "fm", freq: 659, fm: { ratio: 2.76, index: 3.5, decay: 0.3 }, dur: 0.02, env: [0.001, 0.55, 0, 0.5], vibrato: { rate: 9, depth: 0.5 }, vol: 0.5 }),
  tone({ wave: "sine", freq: 1318, dur: 0.02, env: [0.001, 0.3, 0, 0.3], vol: 0.12 }));
sfx("rede", { vol: 0.4 },   // "chuá"
  noise({ color: "white", dur: 0.22, env: [0.01, 0.15, 0.2, 0.1], filter: { type: "bp", from: 4200, to: 1500, q: 2 }, vol: 0.6 }),
  tone({ wave: "sine", freq: 1500, to: 700, dur: 0.18, env: [0.01, 0.15, 0, 0.06], vol: 0.12 }));
sfx("tabela", { vol: 0.5 }, madeira(330, 1.2), tone({ wave: "sine", freq: 140, to: 100, dur: 0.07, env: [0.001, 0.07, 0, 0.05], vol: 0.5 }));
for (let i = 1; i <= 2; i++) sfx(`toque_${i}`, { vol: 0.5 },   // vôlei e embaixadinha "pom"
  tone({ wave: "sine", freq: 280 + i * 30, to: 190, dur: 0.06, env: [0.001, 0.07, 0, 0.05], vol: 0.85 }),
  pop(600 + i * 80, 0.35));
sfx("chute", { vol: 0.55 },   // "PAF!"
  noise({ color: "white", dur: 0.03, env: [0.001, 0.03, 0, 0.03], filter: { type: "bp", cutoff: 1800, q: 0.9 }, vol: 0.8 }),
  tone({ wave: "sine", freq: 200, to: 70, dur: 0.08, env: [0.001, 0.08, 0, 0.05], vol: 0.9 }),
  at(0.03, play("whoosh", { vol: 0.6, pitch: 3 })));
sfx("trave", { vol: 0.42 },   // "doinnnng" tremendo
  tone({ wave: "fm", freq: 392, fm: { ratio: 1.41, index: 2.5, decay: 0.4 }, dur: 0.02, env: [0.001, 0.8, 0, 0.6], vibrato: { rate: 13, depth: 1.4 }, vol: 0.55 }),
  tone({ wave: "sine", freq: 196, dur: 0.02, env: [0.001, 0.5, 0, 0.4], vibrato: { rate: 13, depth: 1.4 }, vol: 0.3 }));
sfx("bola_areia", { vol: 0.45 }, puf(1, 0, 650));
sfx("ping_mesa", { vol: 0.45 }, madeira(1760, 1));
sfx("ping_raquete", { vol: 0.45 }, madeira(1175, 1), pop(900, 0.3));
for (let i = 1; i <= 2; i++) sfx(`bocha_bate_${i}`, { vol: 0.5 }, madeira(980 + i * 90, 1.2), madeira(760 + i * 60, 0.5, 0.03));
sfx("rolar_loop", { dur: 1, loop: true, vol: 0.28 },   // bocha rolando "rrrr" macio
  tone({ wave: "triangle", freq: 120, dur: 1.1, env: [0, 0, 1, 0], tremolo: { rate: 18, depth: 0.6 }, filter: { type: "lp", cutoff: 500 }, vol: 0.5 }),
  noise({ color: "brown", dur: 1.1, env: [0, 0, 1, 0], tremolo: { rate: 18, depth: 0.5 }, filter: { type: "lp", cutoff: 700 }, vol: 0.25 }));

// ---------- arco, frisbee, balões
sfx("corda_puxa", { vol: 0.32 },   // "nhééééc" esticando
  tone({ wave: "saw", freq: 180, to: 330, slide: 0.5, curve: "lin", dur: 0.5, env: [0.03, 0.1, 0.7, 0.05], vibrato: { rate: 22, depth: 0.5 }, filter: { type: "bp", cutoff: 1300, q: 3 }, vol: 0.5 }));
sfx("corda_solta", { vol: 0.45 },   // "tuoing!"
  boing(196, 0.45, 1, 0, 1.25), fiu(900, 1700, 0.12, 0.4, 0.02));
sfx("flecha_alvo", { vol: 0.5 },   // "tchoc" e a flecha tremendo "oing-oing"
  madeira(420, 1.4), tone({ wave: "sine", freq: 130, to: 80, dur: 0.06, env: [0.001, 0.06, 0, 0.04], vol: 0.6 }),
  at(0.03, tone({ wave: "triangle", freq: 330, dur: 0.02, env: [0.002, 0.5, 0, 0.3], vibrato: { rate: 17, depth: 2.2 }, vol: 0.4 })));
sfx("balao_estoura", { vol: 0.55 },   // "POP!"
  noise({ color: "white", dur: 0.04, env: [0.0005, 0.04, 0, 0.05], filter: { type: "hp", cutoff: 700 }, vol: 0.9 }),
  tone({ wave: "sine", freq: 900, to: 200, dur: 0.05, env: [0.001, 0.05, 0, 0.03], vol: 0.5 }),
  at(0.05, play("estrelinhas", { vol: 0.35, pitch: 5 })));
sfx("balao_murcha", { vol: 0.35 },   // "fffrrrrt" voando embora
  tone({ wave: "saw", freq: 520, to: 260, slide: 0.6, dur: 0.6, env: [0.01, 0.1, 0.7, 0.08], vibrato: { rate: 26, depth: 3 }, filter: { type: "bp", cutoff: 1400, q: 2 }, vol: 0.5 }),
  noise({ color: "pink", dur: 0.6, env: [0.01, 0.1, 0.5, 0.08], tremolo: { rate: 26, depth: 0.6 }, filter: { type: "bp", cutoff: 2000, q: 1.5 }, vol: 0.2 }));
sfx("disco_voo", { vol: 0.35 }, tone({ wave: "sine", freq: 1400, to: 900, slide: 0.7, dur: 0.7, env: [0.05, 0.1, 0.8, 0.15], vibrato: { rate: 5, depth: 0.6 }, vol: 0.5 }),
  noise({ color: "pink", dur: 0.7, env: [0.05, 0.1, 0.6, 0.15], filter: { type: "bp", from: 2400, to: 1600, q: 4 }, vol: 0.12 }));
sfx("pegou", { vol: 0.38 }, xilo(1568, 0), xilo(2093, 0.06), sino(3136, 0.1, 0.5, 0.3));

// ---------- placar, festa e torcida
sfx("apito", { vol: 0.32 },   // "priiiii" de juiz
  tone({ wave: "sine", freq: 2550, dur: 0.45, env: [0.01, 0.05, 0.85, 0.05], tremolo: { rate: 34, depth: 0.7 }, vibrato: { rate: 34, depth: 0.3 }, vol: 0.6 }),
  noise({ color: "white", dur: 0.45, env: [0.01, 0.05, 0.6, 0.05], filter: { type: "bp", cutoff: 2550, q: 6 }, tremolo: { rate: 34, depth: 0.6 }, vol: 0.12 }));
sfx("ponto", { vol: 0.35 }, xilo(1568, 0, 1), xilo(2349, 0.07, 1, 0.25));
sfx("encostou", { vol: 0.35 }, sino(2637, 0, 0.8, 0.35), sino(3520, 0.06, 0.6, 0.35));
sfx("tada", { vol: 0.38 }, [523, 659, 784, 1047].map((n, k) => xilo(n, k * 0.075, 1, k === 3 ? 0.4 : 0.16)), sino(2093, 0.3, 0.7, 0.6));
sfx("vitoria", { vol: 0.34 },   // fanfarra de kazoo
  [[523, 0, 0.11], [523, 0.13, 0.08], [523, 0.23, 0.08], [698, 0.33, 0.45]].map(([n, t, d]) => at(t,
    tone({ wave: "saw", freq: n, dur: d, env: [0.01, 0.04, 0.85, 0.06], vibrato: { rate: 6, depth: 0.25, delay: 0.1 }, filter: { type: "bp", cutoff: 1500, q: 1.5 }, vol: 0.5 }),
    tone({ wave: "square", freq: n * 1.5, dur: d, duty: 0.25, env: [0.01, 0.04, 0.7, 0.06], filter: { type: "lp", cutoff: 2600 }, vol: 0.12 }))),
  sino(2093, 0.33, 0.6, 0.6));
sfx("wah_wah", { vol: 0.36 },   // trombone triste "uá-uá-uá-uáááá"
  [[294, 0, 0.32], [277, 0.36, 0.32], [262, 0.72, 0.32], [247, 1.08, 0.9]].map(([n, t, d], k) => at(t,
    tone({ wave: "saw", freq: n, dur: d, env: [0.03, 0.08, 0.8, 0.1], vibrato: k === 3 ? { rate: 6, depth: 0.45, delay: 0.25 } : undefined, filter: { type: "lp", from: 500, to: 1500, q: 4 }, vol: 0.55 }))));
sfx("palminhas", { vol: 0.32 },
  [0, 0.07, 0.12, 0.2, 0.24, 0.31, 0.37, 0.43, 0.5, 0.55, 0.62, 0.7, 0.76, 0.85].map((t, k) => at(t,
    noise({ color: "white", dur: 0.012, env: [0.0005, 0.012, 0, 0.02], filter: { type: "bp", cutoff: 1300 + ((k * 370) % 900), q: 1.4 }, vol: 0.7 - k * 0.03, seed: 300 + k }))));
sfx("contagem", { vol: 0.35 }, xilo(784, 0, 1, 0.14));
sfx("contagem_vai", { vol: 0.38 }, xilo(1568, 0, 1, 0.3), sino(3136, 0, 0.5, 0.4));
