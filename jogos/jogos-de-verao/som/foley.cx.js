// Sonoplastia dos Jogos de Verão (02/11/2026). Sons feitos em código (chirp), juntados num arquivo só (som.py -> musica/foley.mp3).
// Nomes terminados em _1, _2... são variações do mesmo som (o jogo sorteia uma). Os que terminam em "_loop" repetem sem emenda.

// ---------- pés
const passoAreia = (i, f, v) => [
  noise({ color: "pink", dur: 0.05, env: [0.002, 0.04, 0.25, 0.06], filter: { type: "bp", cutoff: f, q: 0.9 }, vol: v, seed: 11 + i }),
  noise({ color: "white", freq: 9000 + i * 1300, dur: 0.07, env: [0.004, 0.05, 0.2, 0.05], filter: { type: "hp", cutoff: 2600 }, vol: v * 0.35, seed: 31 + i }),
  tone({ wave: "sine", freq: 95 - i * 6, to: 60, dur: 0.05, env: [0.001, 0.04, 0, 0.03], vol: v * 0.7 }),
];
for (let i = 1; i <= 4; i++) sfx(`passo_areia_${i}`, { vol: 0.55 }, passoAreia(i, 900 + i * 180, 0.8));
// areia fofa: mais funda e abafada
for (let i = 1; i <= 3; i++) sfx(`passo_fofo_${i}`, { vol: 0.55 },
  noise({ color: "brown", dur: 0.11, env: [0.006, 0.08, 0.3, 0.08], filter: { type: "lp", cutoff: 900 + i * 120 }, vol: 0.9, seed: 51 + i }),
  noise({ color: "pink", freq: 7000, dur: 0.12, env: [0.01, 0.08, 0.2, 0.06], filter: { type: "bp", cutoff: 2200, q: 0.7 }, vol: 0.25, seed: 61 + i }),
  tone({ wave: "sine", freq: 80, to: 50, dur: 0.07, env: [0.002, 0.06, 0, 0.04], vol: 0.6 }));
// pisando na água rasa (poça)
for (let i = 1; i <= 2; i++) sfx(`passo_agua_${i}`, { vol: 0.5 },
  noise({ color: "white", dur: 0.12, env: [0.003, 0.07, 0.2, 0.08], filter: { type: "bp", from: 1400, to: 3800, q: 1.2 }, vol: 0.6, seed: 71 + i }),
  tone({ wave: "sine", freq: 600 + i * 90, to: 1300, dur: 0.05, env: [0.002, 0.04, 0, 0.03], vol: 0.18 }),
  at(0.04, tone({ wave: "sine", freq: 900 + i * 70, to: 1700, dur: 0.04, env: [0.002, 0.03, 0, 0.02], vol: 0.12 })));
// chão firme (quadra, calçadão, deck)
for (let i = 1; i <= 3; i++) sfx(`passo_firme_${i}`, { vol: 0.45 },
  noise({ color: "pink", dur: 0.03, env: [0.001, 0.025, 0, 0.02], filter: { type: "bp", cutoff: 1800 + i * 300, q: 1.4 }, vol: 0.7, seed: 81 + i }),
  tone({ wave: "sine", freq: 130 - i * 10, to: 80, dur: 0.035, env: [0.001, 0.03, 0, 0.02], vol: 0.6 }));
// Amiguinho (geleia) pisando: um "plof" macio
for (let i = 1; i <= 2; i++) sfx(`plof_${i}`, { vol: 0.4 },
  tone({ wave: "sine", freq: 260 + i * 40, to: 140, dur: 0.06, env: [0.002, 0.05, 0, 0.04], vol: 0.6 }),
  noise({ color: "pink", dur: 0.04, env: [0.002, 0.03, 0, 0.03], filter: { type: "lp", cutoff: 1400 }, vol: 0.4, seed: 91 + i }));

// ---------- corpo: pulo, pouso, queda
sfx("pulo", { vol: 0.45 },
  noise({ color: "pink", dur: 0.16, env: [0.02, 0.1, 0.2, 0.08], filter: { type: "bp", from: 500, to: 1900, q: 0.8 }, vol: 0.6 }),
  passoAreia(2, 1100, 0.6));
sfx("pouso_areia", { vol: 0.6 },
  noise({ color: "brown", dur: 0.16, env: [0.002, 0.12, 0.2, 0.12], filter: { type: "lp", from: 2600, to: 400 }, vol: 0.9 }),
  noise({ color: "white", freq: 8000, dur: 0.2, env: [0.01, 0.15, 0.15, 0.1], filter: { type: "hp", cutoff: 3000 }, vol: 0.2 }),
  tone({ wave: "sine", freq: 90, to: 45, dur: 0.1, env: [0.001, 0.09, 0, 0.05], vol: 0.8 }));
sfx("queda_areia", { vol: 0.7 },
  tone({ wave: "sine", freq: 110, to: 40, dur: 0.18, env: [0.001, 0.15, 0, 0.1], vol: 0.9 }),
  noise({ color: "brown", dur: 0.3, env: [0.002, 0.2, 0.25, 0.25], filter: { type: "lp", from: 3000, to: 300 }, vol: 0.9 }),
  // areia espirrando: grãos
  [0.05, 0.09, 0.12, 0.17, 0.21, 0.26, 0.31].map((t, k) => at(t, noise({ color: "white", freq: 6000, dur: 0.03, env: [0.001, 0.025, 0, 0.02], filter: { type: "hp", cutoff: 3500 + k * 200 }, vol: 0.25 - k * 0.025, seed: 100 + k }))));
sfx("whoosh", { vol: 0.4 },
  noise({ color: "pink", dur: 0.26, env: [0.06, 0.12, 0.3, 0.1], filter: { type: "bp", from: 420, to: 2400, q: 1.1 }, vol: 0.8 }));
sfx("whoosh_grave", { base: "whoosh", pitch: -7 });

// ---------- rodas: skate, patins, bike
sfx("rodas_skate_loop", { dur: 2, loop: true, vol: 0.55 },
  noise({ color: "brown", dur: 2.1, env: [0, 0, 1, 0], filter: { type: "lp", cutoff: 520 }, vol: 0.8, tremolo: { rate: 6, depth: 0.15 } }),
  noise({ color: "pink", dur: 2.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 1500, q: 0.6 }, vol: 0.12 }),
  [0.0, 0.5, 1.0, 1.5].map((t) => at(t, noise({ color: "pink", dur: 0.02, env: [0.001, 0.015, 0, 0.01], filter: { type: "bp", cutoff: 900, q: 2 }, vol: 0.25 }))));
sfx("rodas_patins_loop", { dur: 2, loop: true, vol: 0.5 },
  noise({ color: "brown", dur: 2.1, env: [0, 0, 1, 0], filter: { type: "lp", cutoff: 900 }, vol: 0.7, tremolo: { rate: 9, depth: 0.2 } }),
  noise({ color: "pink", dur: 2.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 2600, q: 0.8 }, vol: 0.12 }),
  tone({ wave: "sine", freq: 180, dur: 2.1, env: [0, 0, 1, 0], vol: 0.05 }));
sfx("grind_loop", { dur: 1.5, loop: true, vol: 0.4 },
  noise({ color: "white", dur: 1.6, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 3200, q: 4 }, vol: 0.55, tremolo: { rate: 23, depth: 0.35 } }),
  tone({ wave: "saw", freq: 1180, dur: 1.6, env: [0, 0, 1, 0], vol: 0.05, vibrato: { rate: 7, depth: 0.3 }, filter: { type: "bp", cutoff: 2400, q: 2 } }),
  tone({ wave: "saw", freq: 1610, dur: 1.6, env: [0, 0, 1, 0], vol: 0.035, vibrato: { rate: 5, depth: 0.25 }, filter: { type: "bp", cutoff: 3000, q: 2 } }));
sfx("ollie", { vol: 0.55 },
  tone({ wave: "triangle", freq: 1900, to: 700, dur: 0.02, env: [0.001, 0.015, 0, 0.01], vol: 0.5 }),
  noise({ color: "pink", dur: 0.03, env: [0.001, 0.025, 0, 0.02], filter: { type: "bp", cutoff: 2600, q: 1.5 }, vol: 0.8 }),
  tone({ wave: "sine", freq: 160, to: 80, dur: 0.05, env: [0.001, 0.04, 0, 0.03], vol: 0.6 }));
sfx("pouso_skate", { vol: 0.6 },
  tone({ wave: "sine", freq: 120, to: 55, dur: 0.09, env: [0.001, 0.08, 0, 0.05], vol: 0.9 }),
  noise({ color: "pink", dur: 0.05, env: [0.001, 0.04, 0, 0.03], filter: { type: "bp", cutoff: 1700, q: 1.2 }, vol: 0.8 }),
  at(0.03, noise({ color: "pink", dur: 0.03, env: [0.001, 0.025, 0, 0.02], filter: { type: "bp", cutoff: 2300, q: 1.5 }, vol: 0.4 })));
sfx("queda_skate", { vol: 0.6 },
  tone({ wave: "sine", freq: 120, to: 45, dur: 0.15, env: [0.001, 0.12, 0, 0.08], vol: 0.9 }),
  noise({ color: "brown", dur: 0.2, env: [0.002, 0.15, 0.1, 0.1], filter: { type: "lp", cutoff: 1500 }, vol: 0.7 }),
  // o skate (ou o patins) batendo e rolando sozinho
  [0.12, 0.22, 0.29, 0.34].map((t, k) => at(t, noise({ color: "pink", dur: 0.025, env: [0.001, 0.02, 0, 0.015], filter: { type: "bp", cutoff: 1900 - k * 150, q: 1.5 }, vol: 0.5 - k * 0.09, seed: 120 + k }))));
// bike na terra
sfx("terra_loop", { dur: 2, loop: true, vol: 0.5 },
  noise({ color: "brown", dur: 2.1, env: [0, 0, 1, 0], filter: { type: "lp", cutoff: 700 }, vol: 0.8 }),
  noise({ color: "white", freq: 2600, dur: 2.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 1800, q: 0.7 }, vol: 0.12, tremolo: { rate: 13, depth: 0.5 } }));
sfx("catraca_loop", { dur: 0.48, loop: true, vol: 0.32 },
  [0, 0.06, 0.12, 0.18, 0.24, 0.30, 0.36, 0.42].map((t) => at(t,
    noise({ color: "white", dur: 0.008, env: [0.0005, 0.006, 0, 0.004], filter: { type: "hp", cutoff: 4500 }, vol: 0.7 }),
    tone({ wave: "triangle", freq: 3400, dur: 0.006, env: [0.0005, 0.005, 0, 0.003], vol: 0.25 }))));
sfx("pouso_terra", { vol: 0.65 },
  tone({ wave: "sine", freq: 100, to: 45, dur: 0.12, env: [0.001, 0.1, 0, 0.06], vol: 0.9 }),
  noise({ color: "brown", dur: 0.22, env: [0.002, 0.16, 0.2, 0.14], filter: { type: "lp", from: 2200, to: 350 }, vol: 0.9 }),
  // a mola do garfo
  tone({ wave: "triangle", freq: 420, to: 300, dur: 0.12, env: [0.003, 0.1, 0, 0.05], vol: 0.08 }));
sfx("queda_terra", { vol: 0.7 },
  tone({ wave: "sine", freq: 105, to: 40, dur: 0.2, env: [0.001, 0.16, 0, 0.1], vol: 0.9 }),
  noise({ color: "brown", dur: 0.4, env: [0.002, 0.25, 0.3, 0.3], filter: { type: "lp", from: 2600, to: 280 }, vol: 0.9 }),
  // a bike batendo (metal leve)
  at(0.08, tone({ wave: "fm", freq: 820, dur: 0.18, env: [0.001, 0.12, 0, 0.1], fm: { ratio: 3.5, index: 3, decay: 0.12 }, vol: 0.12 })),
  at(0.19, tone({ wave: "fm", freq: 640, dur: 0.12, env: [0.001, 0.08, 0, 0.08], fm: { ratio: 3.5, index: 2.5, decay: 0.1 }, vol: 0.08 })));
sfx("derrapada", { vol: 0.45 },
  noise({ color: "pink", dur: 0.28, env: [0.01, 0.2, 0.3, 0.12], filter: { type: "bp", from: 2400, to: 900, q: 0.9 }, vol: 0.8 }));

// ---------- vento e ar
sfx("vento_loop", { dur: 3, loop: true, vol: 0.4 },
  noise({ color: "pink", dur: 3.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 700, q: 0.7 }, vol: 0.7, tremolo: { rate: 0.7, depth: 0.4 } }),
  noise({ color: "white", dur: 3.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 2200, q: 1.5 }, vol: 0.12, tremolo: { rate: 1.3, depth: 0.5 } }));

// ---------- água
sfx("mar_loop", { dur: 6, loop: true, vol: 0.5 },
  noise({ color: "pink", dur: 6.2, env: [0, 0, 1, 0], filter: { type: "lp", cutoff: 1100 }, vol: 0.7, tremolo: { rate: 0.34, depth: 0.55 } }),
  noise({ color: "white", dur: 6.2, env: [0, 0, 1, 0], filter: { type: "hp", cutoff: 4500 }, vol: 0.08, tremolo: { rate: 0.34, depth: 0.8 } }));
sfx("spray_loop", { dur: 2, loop: true, vol: 0.4 },
  noise({ color: "white", dur: 2.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 3600, q: 0.6 }, vol: 0.6, tremolo: { rate: 7, depth: 0.25 } }),
  noise({ color: "pink", dur: 2.1, env: [0, 0, 1, 0], filter: { type: "lp", cutoff: 700 }, vol: 0.35 }));
sfx("tubo_loop", { dur: 3, loop: true, vol: 0.5 },
  noise({ color: "brown", dur: 3.1, env: [0, 0, 1, 0], filter: { type: "lp", cutoff: 380 }, vol: 1, tremolo: { rate: 2.2, depth: 0.3 } }),
  noise({ color: "pink", dur: 3.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 1300, q: 0.7 }, vol: 0.25 }));
const bolhas = (n, t0, f0) => Array.from({ length: n }, (_, k) => at(t0 + k * 0.035 + (k % 3) * 0.012, tone({ wave: "sine", freq: f0 + (k * 137) % 500, to: f0 * 1.9 + (k * 97) % 400, dur: 0.03, env: [0.002, 0.025, 0, 0.02], vol: 0.1 })));
sfx("splash_p", { vol: 0.55 },
  noise({ color: "white", dur: 0.18, env: [0.003, 0.12, 0.2, 0.12], filter: { type: "bp", from: 3000, to: 1200, q: 0.8 }, vol: 0.8 }),
  bolhas(4, 0.03, 500));
sfx("splash_g", { vol: 0.7 },
  tone({ wave: "sine", freq: 90, to: 45, dur: 0.12, env: [0.002, 0.1, 0, 0.06], vol: 0.7 }),
  noise({ color: "white", dur: 0.5, env: [0.002, 0.25, 0.3, 0.35], filter: { type: "lp", from: 6000, to: 900 }, vol: 0.9 }),
  bolhas(9, 0.08, 380));
for (let i = 1; i <= 3; i++) sfx(`remada_${i}`, { vol: 0.45 },
  noise({ color: "pink", dur: 0.22, env: [0.03, 0.12, 0.3, 0.12], filter: { type: "bp", from: 900 + i * 150, to: 2600, q: 0.9 }, vol: 0.8, seed: 140 + i }),
  bolhas(3, 0.08, 520 + i * 60));
for (let i = 1; i <= 3; i++) sfx(`bracada_${i}`, { vol: 0.45 },
  noise({ color: "white", dur: 0.14, env: [0.004, 0.09, 0.2, 0.08], filter: { type: "bp", from: 2400 + i * 200, to: 1100, q: 0.9 }, vol: 0.8, seed: 150 + i }),
  bolhas(3, 0.04, 600 + i * 40));
sfx("rio_loop", { dur: 4, loop: true, vol: 0.45 },
  noise({ color: "pink", dur: 4.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 1500, q: 0.5 }, vol: 0.6, tremolo: { rate: 3.1, depth: 0.2 } }),
  Array.from({ length: 22 }, (_, k) => at((k * 0.183) % 4, tone({ wave: "sine", freq: 700 + (k * 211) % 900, to: 1400 + (k * 173) % 900, dur: 0.03, env: [0.002, 0.025, 0, 0.02], vol: 0.05 }))));
sfx("jato_loop", { dur: 1.2, loop: true, vol: 0.45 },
  noise({ color: "white", dur: 1.3, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 2600, q: 0.8 }, vol: 0.7, tremolo: { rate: 14, depth: 0.25 } }));
sfx("pingo", { vol: 0.35 }, tone({ wave: "sine", freq: 900, to: 1800, dur: 0.04, env: [0.002, 0.03, 0, 0.02], vol: 0.6 }), noise({ color: "white", dur: 0.03, env: [0.001, 0.02, 0, 0.02], filter: { type: "hp", cutoff: 3000 }, vol: 0.3 }));

// ---------- motores (o jogo muda a velocidade de reprodução com a velocidade)
sfx("motor_bugue_loop", { dur: 1, loop: true, vol: 0.4, fx: [drive({ amount: 1.8 })] },
  tone({ wave: "saw", freq: 55, dur: 1.1, env: [0, 0, 1, 0], vol: 0.4, tremolo: { rate: 27.5, depth: 0.5 }, filter: { type: "lp", cutoff: 700 } }),
  tone({ wave: "square", freq: 110, dur: 1.1, env: [0, 0, 1, 0], vol: 0.12, filter: { type: "lp", cutoff: 500 } }),
  noise({ color: "brown", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "lp", cutoff: 400 }, vol: 0.4, tremolo: { rate: 27.5, depth: 0.6 } }));
sfx("motor_jetski_loop", { dur: 1, loop: true, vol: 0.38, fx: [drive({ amount: 1.4 })] },
  tone({ wave: "saw", freq: 92, dur: 1.1, env: [0, 0, 1, 0], vol: 0.3, tremolo: { rate: 46, depth: 0.45 }, filter: { type: "lp", cutoff: 1300 } }),
  tone({ wave: "square", freq: 184, dur: 1.1, env: [0, 0, 1, 0], vol: 0.08, filter: { type: "bp", cutoff: 900, q: 1 } }),
  noise({ color: "pink", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 2500, q: 0.6 }, vol: 0.25 }));
sfx("motor_aviao_loop", { dur: 1, loop: true, vol: 0.38, fx: [drive({ amount: 1.3 })] },
  tone({ wave: "saw", freq: 70, dur: 1.1, env: [0, 0, 1, 0], vol: 0.3, tremolo: { rate: 35, depth: 0.4 }, filter: { type: "lp", cutoff: 900 } }),
  // a hélice cortando o ar
  noise({ color: "pink", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 1100, q: 0.7 }, vol: 0.45, tremolo: { rate: 18, depth: 0.75 } }));
sfx("batida", { vol: 0.6 },
  tone({ wave: "sine", freq: 95, to: 40, dur: 0.16, env: [0.001, 0.13, 0, 0.08], vol: 0.9 }),
  noise({ color: "brown", dur: 0.25, env: [0.001, 0.15, 0.2, 0.15], filter: { type: "lp", from: 3500, to: 400 }, vol: 0.9 }),
  at(0.02, tone({ wave: "fm", freq: 520, dur: 0.15, env: [0.001, 0.1, 0, 0.08], fm: { ratio: 2.7, index: 3, decay: 0.1 }, vol: 0.1 })));
sfx("turbo", { vol: 0.45 },
  noise({ color: "pink", dur: 0.45, env: [0.02, 0.2, 0.4, 0.2], filter: { type: "bp", from: 600, to: 3200, q: 1 }, vol: 0.7 }),
  tone({ wave: "saw", freq: 110, to: 260, dur: 0.4, env: [0.01, 0.2, 0.4, 0.15], vol: 0.08, filter: { type: "lp", cutoff: 1500 } }));

// ---------- bolas
sfx("quique_basquete", { vol: 0.6 },
  tone({ wave: "sine", freq: 150, to: 75, dur: 0.07, env: [0.001, 0.06, 0, 0.05], vol: 0.9 }),
  noise({ color: "pink", dur: 0.04, env: [0.001, 0.03, 0, 0.03], filter: { type: "bp", cutoff: 900, q: 1.2 }, vol: 0.6 }),
  tone({ wave: "sine", freq: 410, to: 360, dur: 0.06, env: [0.001, 0.05, 0, 0.03], vol: 0.08 }));
sfx("aro", { vol: 0.45 },
  tone({ wave: "fm", freq: 640, dur: 0.35, env: [0.001, 0.25, 0, 0.25], fm: { ratio: 3.5, index: 4, decay: 0.2 }, vol: 0.5 }),
  tone({ wave: "sine", freq: 1290, dur: 0.3, env: [0.001, 0.2, 0, 0.2], vol: 0.12 }),
  noise({ color: "pink", dur: 0.02, env: [0.001, 0.015, 0, 0.01], filter: { type: "hp", cutoff: 2000 }, vol: 0.4 }));
sfx("rede", { vol: 0.5 },
  noise({ color: "white", dur: 0.3, env: [0.01, 0.2, 0.2, 0.15], filter: { type: "hp", from: 6500, to: 2300 }, vol: 0.7 }),
  noise({ color: "pink", dur: 0.25, env: [0.02, 0.15, 0.2, 0.1], filter: { type: "bp", cutoff: 1800, q: 0.7 }, vol: 0.25 }));
sfx("tabela", { vol: 0.55 },
  tone({ wave: "sine", freq: 190, to: 120, dur: 0.07, env: [0.001, 0.06, 0, 0.05], vol: 0.8 }),
  noise({ color: "pink", dur: 0.06, env: [0.001, 0.05, 0, 0.04], filter: { type: "bp", cutoff: 1100, q: 1.3 }, vol: 0.7 }),
  tone({ wave: "triangle", freq: 640, dur: 0.06, env: [0.001, 0.05, 0, 0.04], vol: 0.06 }));
sfx("toque_bola", { vol: 0.55 }, // vôlei, embaixadinha (couro macio)
  tone({ wave: "sine", freq: 230, to: 120, dur: 0.06, env: [0.001, 0.05, 0, 0.04], vol: 0.9 }),
  noise({ color: "pink", dur: 0.04, env: [0.001, 0.03, 0, 0.03], filter: { type: "bp", cutoff: 1300, q: 1 }, vol: 0.7 }));
sfx("chute", { vol: 0.65 },
  tone({ wave: "sine", freq: 160, to: 60, dur: 0.09, env: [0.001, 0.08, 0, 0.05], vol: 1 }),
  noise({ color: "pink", dur: 0.05, env: [0.001, 0.04, 0, 0.03], filter: { type: "bp", cutoff: 1500, q: 0.9 }, vol: 0.9 }));
sfx("bola_areia", { vol: 0.5 },
  noise({ color: "brown", dur: 0.12, env: [0.002, 0.09, 0.1, 0.08], filter: { type: "lp", from: 1800, to: 400 }, vol: 0.9 }),
  tone({ wave: "sine", freq: 100, to: 55, dur: 0.07, env: [0.001, 0.06, 0, 0.04], vol: 0.6 }),
  [0.03, 0.06, 0.1].map((t, k) => at(t, noise({ color: "white", freq: 7000, dur: 0.02, env: [0.001, 0.015, 0, 0.01], filter: { type: "hp", cutoff: 3800 }, vol: 0.15, seed: 160 + k }))));
sfx("trave", { vol: 0.5 },
  tone({ wave: "fm", freq: 880, dur: 0.5, env: [0.001, 0.3, 0, 0.35], fm: { ratio: 3.2, index: 4, decay: 0.25 }, vol: 0.5 }),
  tone({ wave: "sine", freq: 1760, dur: 0.4, env: [0.001, 0.25, 0, 0.2], vol: 0.1 }));
sfx("ping_mesa", { vol: 0.5 },
  tone({ wave: "sine", freq: 2400, to: 2000, dur: 0.03, env: [0.0005, 0.025, 0, 0.02], vol: 0.6 }),
  noise({ color: "white", dur: 0.015, env: [0.0005, 0.01, 0, 0.01], filter: { type: "hp", cutoff: 3000 }, vol: 0.4 }),
  tone({ wave: "sine", freq: 380, dur: 0.05, env: [0.001, 0.04, 0, 0.03], vol: 0.15 }));
sfx("ping_raquete", { vol: 0.55 },
  tone({ wave: "sine", freq: 1250, to: 1050, dur: 0.035, env: [0.0005, 0.03, 0, 0.02], vol: 0.6 }),
  noise({ color: "pink", dur: 0.02, env: [0.0005, 0.015, 0, 0.01], filter: { type: "bp", cutoff: 2500, q: 1.2 }, vol: 0.5 }),
  tone({ wave: "sine", freq: 260, dur: 0.04, env: [0.001, 0.03, 0, 0.03], vol: 0.2 }));
sfx("bocha_bate", { vol: 0.5 },
  tone({ wave: "sine", freq: 2100, to: 1900, dur: 0.05, env: [0.0005, 0.04, 0, 0.03], vol: 0.5 }),
  tone({ wave: "sine", freq: 3300, dur: 0.03, env: [0.0005, 0.025, 0, 0.02], vol: 0.2 }),
  noise({ color: "white", dur: 0.015, env: [0.0005, 0.01, 0, 0.01], filter: { type: "hp", cutoff: 2500 }, vol: 0.5 }));
sfx("rolar_loop", { dur: 2, loop: true, vol: 0.4 },
  noise({ color: "brown", dur: 2.1, env: [0, 0, 1, 0], filter: { type: "lp", cutoff: 450 }, vol: 0.8, tremolo: { rate: 5, depth: 0.25 } }),
  noise({ color: "white", freq: 3000, dur: 2.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 2600, q: 0.8 }, vol: 0.08, tremolo: { rate: 11, depth: 0.6 } }));

// ---------- arco, frisbee
sfx("corda_puxa", { vol: 0.35 },
  noise({ color: "pink", dur: 0.35, env: [0.05, 0.2, 0.4, 0.1], filter: { type: "bp", cutoff: 1800, q: 3 }, vol: 0.5 }),
  tone({ wave: "triangle", freq: 140, to: 190, dur: 0.35, env: [0.05, 0.2, 0.3, 0.1], vol: 0.08 }));
sfx("corda_solta", { vol: 0.55 },
  tone({ wave: "triangle", freq: 196, to: 150, dur: 0.25, env: [0.001, 0.18, 0, 0.12], vol: 0.6, vibrato: { rate: 18, depth: 0.4 } }),
  noise({ color: "pink", dur: 0.03, env: [0.001, 0.025, 0, 0.02], filter: { type: "bp", cutoff: 1400, q: 1 }, vol: 0.7 }),
  noise({ color: "pink", dur: 0.18, env: [0.01, 0.1, 0.2, 0.08], filter: { type: "bp", from: 1200, to: 3000, q: 1.2 }, vol: 0.3 }));
sfx("flecha_alvo", { vol: 0.6 },
  tone({ wave: "sine", freq: 260, to: 150, dur: 0.07, env: [0.001, 0.06, 0, 0.04], vol: 0.8 }),
  noise({ color: "pink", dur: 0.04, env: [0.0005, 0.03, 0, 0.03], filter: { type: "bp", cutoff: 1800, q: 1.2 }, vol: 0.8 }),
  // a flecha balançando
  tone({ wave: "triangle", freq: 95, dur: 0.25, env: [0.001, 0.2, 0, 0.1], vol: 0.12, tremolo: { rate: 32, depth: 0.9 } }));
sfx("balao_estoura", { vol: 0.6 },
  noise({ color: "white", dur: 0.06, env: [0.0005, 0.04, 0, 0.04], filter: { type: "hp", cutoff: 900 }, vol: 1 }),
  tone({ wave: "sine", freq: 300, to: 90, dur: 0.05, env: [0.0005, 0.04, 0, 0.03], vol: 0.5 }));
sfx("disco_voo_loop", { dur: 1.2, loop: true, vol: 0.35 },
  noise({ color: "pink", dur: 1.3, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 900, q: 1.5 }, vol: 0.6, tremolo: { rate: 10, depth: 0.5 } }));
sfx("pegou", { vol: 0.55 }, // disco nas mãos
  noise({ color: "pink", dur: 0.04, env: [0.0005, 0.03, 0, 0.03], filter: { type: "bp", cutoff: 1700, q: 1 }, vol: 0.9 }),
  tone({ wave: "sine", freq: 340, to: 220, dur: 0.05, env: [0.001, 0.04, 0, 0.03], vol: 0.4 }));

// ---------- torcida e apito
sfx("torcida_loop", { dur: 4, loop: true, vol: 0.35 },
  noise({ color: "pink", dur: 4.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 650, q: 1.6 }, vol: 0.6, tremolo: { rate: 0.9, depth: 0.25 } }),
  noise({ color: "pink", dur: 4.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 1250, q: 2 }, vol: 0.35, tremolo: { rate: 1.3, depth: 0.3 } }),
  noise({ color: "pink", dur: 4.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 2400, q: 2.5 }, vol: 0.15, tremolo: { rate: 1.7, depth: 0.35 } }));
sfx("torcida_festa", { vol: 0.5 },
  noise({ color: "pink", dur: 1.6, env: [0.08, 0.5, 0.6, 0.6], filter: { type: "bp", cutoff: 900, q: 1.3 }, vol: 0.8, tremolo: { rate: 2.3, depth: 0.2 } }),
  noise({ color: "pink", dur: 1.6, env: [0.08, 0.5, 0.6, 0.6], filter: { type: "bp", cutoff: 1900, q: 1.8 }, vol: 0.45, tremolo: { rate: 3.1, depth: 0.25 } }),
  // palmas
  Array.from({ length: 26 }, (_, k) => at(0.1 + ((k * 0.0613) % 1.5), noise({ color: "white", dur: 0.012, env: [0.0005, 0.01, 0, 0.012], filter: { type: "bp", cutoff: 1500 + (k * 337) % 1400, q: 1.2 }, vol: 0.35, seed: 200 + k }))));
sfx("torcida_ooh", { vol: 0.45 },
  noise({ color: "pink", dur: 0.9, env: [0.08, 0.3, 0.6, 0.35], filter: { type: "bp", from: 900, to: 450, q: 2.2 }, vol: 0.9 }),
  noise({ color: "pink", dur: 0.9, env: [0.08, 0.3, 0.6, 0.35], filter: { type: "bp", from: 1700, to: 1000, q: 3 }, vol: 0.35 }));
sfx("apito", { vol: 0.35 },
  tone({ wave: "sine", freq: 2900, dur: 0.38, env: [0.01, 0.05, 0.9, 0.06], vol: 0.6, tremolo: { rate: 38, depth: 0.5 } }),
  noise({ color: "white", dur: 0.38, env: [0.01, 0.05, 0.9, 0.06], filter: { type: "bp", cutoff: 2900, q: 6 }, vol: 0.3 }));
sfx("gaivota", { vol: 0.25 },
  tone({ wave: "fm", freq: 1500, to: 1150, dur: 0.22, env: [0.01, 0.12, 0.4, 0.06], fm: { ratio: 1.5, index: 1.5 }, vol: 0.4 }),
  at(0.25, tone({ wave: "fm", freq: 1600, to: 1050, dur: 0.18, env: [0.01, 0.1, 0.4, 0.06], fm: { ratio: 1.5, index: 1.5 }, vol: 0.32 })));
