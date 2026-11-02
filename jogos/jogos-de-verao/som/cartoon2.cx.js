// Sons de desenho, 2ª rodada (02/11/2026): os 12 que o dono marcou "Nenhuma serve" (nem o 1º feito em código nem o FilmCow).
// Três jeitos novos para cada um: n2_, n3_, n4_ + o nome do som. Mais macios que a 1ª rodada (sem onda quadrada crua nos motores).
// node ~/.game-tools/chirp/bin/chirp.js build cartoon2.cx.js --no-preview --out out_c2

let semente = 7;
const rnd = () => { semente = (semente * 16807) % 2147483647; return semente / 2147483647; };
const bolha = (f, t, v = 1) => at(t, tone({ wave: "sine", freq: f, to: f * 2.1, dur: 0.035, env: [0.002, 0.03, 0, 0.02], vol: 0.3 * v }));

// ---------- motores: "pó-pó-pó" de escapamento (batidinhas graves espaçadas) ou ronco filtrado macio
const pops = (n, dur, f0, f1, v = 1, cor = 700, jit = 0.15) => Array.from({ length: n }, (_, k) => {
  const t = (k / n) * dur + (k ? (rnd() - 0.5) * jit * dur / n : 0), a = v * (0.75 + rnd() * 0.25);
  return at(t,
    tone({ wave: "sine", freq: f0, to: f1, dur: 0.035, env: [0.001, 0.045, 0, 0.03], vol: 0.8 * a }),
    noise({ color: "brown", dur: 0.03, env: [0.001, 0.03, 0, 0.02], filter: { type: "lp", cutoff: cor }, vol: 0.45 * a, seed: 500 + k }));
});
sfx("n2_motor_bugue_loop", { dur: 1, loop: true, vol: 0.5 }, pops(12, 1, 95, 55), tone({ wave: "triangle", freq: 48, dur: 1.1, env: [0, 0, 1, 0], vol: 0.12 }));
sfx("n3_motor_bugue_loop", { dur: 1, loop: true, vol: 0.4 },
  tone({ wave: "saw", freq: 52, dur: 1.1, env: [0, 0, 1, 0], filter: { type: "lp", cutoff: 380, q: 3 }, tremolo: { rate: 18, depth: 0.35 }, vol: 0.7 }),
  tone({ wave: "triangle", freq: 104, dur: 1.1, env: [0, 0, 1, 0], tremolo: { rate: 18, depth: 0.3 }, vol: 0.2 }));
sfx("n4_motor_bugue_loop", { dur: 1, loop: true, vol: 0.42 }, pops(16, 1, 170, 110, 0.8, 1200),
  tone({ wave: "sine", freq: 520, dur: 1.1, env: [0, 0, 1, 0], vibrato: { rate: 6, depth: 0.2 }, vol: 0.05 }));

sfx("n2_motor_jetski_loop", { dur: 1, loop: true, vol: 0.38 },
  tone({ wave: "triangle", freq: 170, dur: 1.1, env: [0, 0, 1, 0], vibrato: { rate: 4, depth: 0.3 }, tremolo: { rate: 26, depth: 0.25 }, vol: 0.5 }),
  tone({ wave: "saw", freq: 340, dur: 1.1, env: [0, 0, 1, 0], filter: { type: "lp", cutoff: 1100 }, vibrato: { rate: 4, depth: 0.3 }, vol: 0.15 }),
  noise({ color: "pink", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 1800, q: 1 }, vol: 0.12 }));
sfx("n3_motor_jetski_loop", { dur: 1, loop: true, vol: 0.45 }, pops(20, 1, 150, 100, 0.8, 1000),
  noise({ color: "white", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 3000, q: 1 }, vol: 0.08 }));
sfx("n4_motor_jetski_loop", { dur: 1, loop: true, vol: 0.38 },
  tone({ wave: "fm", freq: 140, fm: { ratio: 1, index: 1.2 }, dur: 1.1, env: [0, 0, 1, 0], vibrato: { rate: 5, depth: 0.5 }, tremolo: { rate: 30, depth: 0.2 }, vol: 0.5 }),
  noise({ color: "pink", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 2200, q: 1 }, vol: 0.08 }));

sfx("n2_motor_aviao_loop", { dur: 1, loop: true, vol: 0.45 },   // hélice "frrrr" (sopro batendo)
  noise({ color: "pink", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 350, q: 1 }, tremolo: { rate: 24, depth: 0.9 }, vol: 0.7 }),
  tone({ wave: "sine", freq: 100, dur: 1.1, env: [0, 0, 1, 0], tremolo: { rate: 24, depth: 0.6 }, vol: 0.3 }));
sfx("n3_motor_aviao_loop", { dur: 1, loop: true, vol: 0.45 }, pops(22, 1, 85, 60, 0.8, 600),
  noise({ color: "pink", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 600, q: 1 }, tremolo: { rate: 22, depth: 0.7 }, vol: 0.25 }));
sfx("n4_motor_aviao_loop", { dur: 1, loop: true, vol: 0.4 },
  tone({ wave: "triangle", freq: 120, dur: 1.1, env: [0, 0, 1, 0], tremolo: { rate: 32, depth: 0.6 }, vol: 0.55 }),
  tone({ wave: "saw", freq: 60, dur: 1.1, env: [0, 0, 1, 0], filter: { type: "lp", cutoff: 300 }, vol: 0.25 }));

// ---------- acelerada "vrum"
semente = 21;
sfx("n2_vrum", { vol: 0.5 }, (() => { const out = []; let t = 0, k = 0; while (t < 0.9) { const p = t / 0.9, f = 70 + 90 * p; out.push(at(t, tone({ wave: "sine", freq: f, to: f * 0.6, dur: 0.035, env: [0.001, 0.045, 0, 0.03], vol: 0.8 }), noise({ color: "brown", dur: 0.03, env: [0.001, 0.03, 0, 0.02], filter: { type: "lp", cutoff: 700 + 600 * p }, vol: 0.45, seed: 600 + k }))); t += 0.1 - 0.065 * p; k++; } return out; })());
sfx("n3_vrum", { vol: 0.42 },
  tone({ wave: "saw", freq: 50, to: 150, slide: 0.7, dur: 0.8, env: [0.02, 0.1, 0.9, 0.15], filter: { type: "lp", from: 300, to: 1500, q: 2 }, tremolo: { rate: 20, depth: 0.4 }, vol: 0.7 }),
  tone({ wave: "triangle", freq: 100, to: 300, slide: 0.7, dur: 0.8, env: [0.02, 0.1, 0.9, 0.15], vol: 0.15 }));
sfx("n4_vrum", { vol: 0.42 },   // "vrum-VRUUUM"
  at(0, tone({ wave: "saw", freq: 60, to: 110, slide: 0.18, dur: 0.22, env: [0.01, 0.05, 0.8, 0.06], filter: { type: "lp", from: 350, to: 900, q: 2 }, tremolo: { rate: 20, depth: 0.4 }, vol: 0.7 })),
  at(0.3, tone({ wave: "saw", freq: 60, to: 170, slide: 0.45, dur: 0.55, env: [0.01, 0.1, 0.85, 0.15], filter: { type: "lp", from: 350, to: 1600, q: 2 }, tremolo: { rate: 22, depth: 0.4 }, vol: 0.75 })));

// ---------- derrapada
sfx("n2_derrapada", { vol: 0.32 }, tone({ wave: "sine", freq: 1900, to: 1500, slide: 0.35, dur: 0.38, env: [0.008, 0.08, 0.8, 0.06], vibrato: { rate: 22, depth: 0.8 }, vol: 0.6 }),
  noise({ color: "white", dur: 0.38, env: [0.008, 0.08, 0.5, 0.06], filter: { type: "bp", cutoff: 2500, q: 3 }, vol: 0.12 }));
sfx("n3_derrapada", { vol: 0.35 }, noise({ color: "white", dur: 0.4, env: [0.01, 0.1, 0.7, 0.08], filter: { type: "bp", from: 3000, to: 2200, q: 10 }, tremolo: { rate: 30, depth: 0.4 }, vol: 0.9 }));
sfx("n4_derrapada", { vol: 0.32 }, [[0, 1800], [0.17, 1600]].map(([t, f]) => at(t,
  tone({ wave: "sine", freq: f, to: f * 0.85, dur: 0.12, env: [0.005, 0.04, 0.8, 0.04], vibrato: { rate: 24, depth: 0.9 }, vol: 0.6 }),
  noise({ color: "white", dur: 0.12, env: [0.005, 0.04, 0.5, 0.04], filter: { type: "bp", cutoff: f * 1.4, q: 3 }, vol: 0.12 }))));

// ---------- rodinhas, corrimão, bocha rolando
const tic = (t, f, v) => at(t, tone({ wave: "sine", freq: f, to: f * 0.8, dur: 0.012, env: [0.0005, 0.012, 0, 0.01], vol: v }));
sfx("n2_rodas_loop", { dur: 1, loop: true, vol: 0.45 },
  noise({ color: "brown", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "lp", cutoff: 350 }, vol: 0.7 }),
  noise({ color: "pink", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 1200, q: 0.7 }, vol: 0.06 }),
  [0, 0.25, 0.5, 0.75].map((t) => tic(t, 900, 0.12)));
sfx("n3_rodas_loop", { dur: 1, loop: true, vol: 0.4 }, Array.from({ length: 8 }, (_, k) => tic(k / 8, k % 2 ? 1300 : 1100, 0.3)),
  noise({ color: "brown", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "lp", cutoff: 250 }, vol: 0.5 }));
sfx("n4_rodas_loop", { dur: 1, loop: true, vol: 0.4 }, noise({ color: "pink", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "lp", cutoff: 800 }, tremolo: { rate: 5, depth: 0.15 }, vol: 0.6 }));

sfx("n2_grind_loop", { dur: 1, loop: true, vol: 0.3 },
  noise({ color: "white", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 3800, q: 5 }, tremolo: { rate: 17, depth: 0.25 }, vol: 0.6 }),
  tone({ wave: "sine", freq: 2230, dur: 1.1, env: [0, 0, 1, 0], vol: 0.04 }), tone({ wave: "sine", freq: 3170, dur: 1.1, env: [0, 0, 1, 0], vol: 0.03 }));
sfx("n3_grind_loop", { dur: 1, loop: true, vol: 0.3 },
  tone({ wave: "square", freq: 98, dur: 1.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 1600, q: 2 }, tremolo: { rate: 38, depth: 0.3 }, vol: 0.35 }),
  noise({ color: "white", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 4000, q: 1.5 }, vol: 0.15 }));
sfx("n4_grind_loop", { dur: 1, loop: true, vol: 0.32 }, noise({ color: "pink", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 2400, q: 2 }, tremolo: { rate: 11, depth: 0.6 }, vol: 0.7 }));

semente = 33;
sfx("n2_rolar_loop", { dur: 1, loop: true, vol: 0.4 }, noise({ color: "brown", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "lp", cutoff: 300 }, vol: 0.8 }),
  Array.from({ length: 9 }, (_, k) => at(rnd() * 0.95, noise({ color: "white", dur: 0.01, env: [0.0005, 0.01, 0, 0.01], filter: { type: "hp", cutoff: 4000 }, vol: 0.05, seed: 700 + k }))));
sfx("n3_rolar_loop", { dur: 1, loop: true, vol: 0.38 }, tone({ wave: "triangle", freq: 70, dur: 1.1, env: [0, 0, 1, 0], tremolo: { rate: 9, depth: 0.35 }, vol: 0.5 }),
  noise({ color: "brown", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "lp", cutoff: 400 }, vol: 0.4 }));
sfx("n4_rolar_loop", { dur: 1, loop: true, vol: 0.38 }, noise({ color: "pink", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "lp", cutoff: 500 }, tremolo: { rate: 3, depth: 0.2 }, vol: 0.6 }));

// ---------- água: braçada e jato
for (let i = 1; i <= 2; i++) {
  sfx(`n2_bracada_${i}`, { vol: 0.42 }, noise({ color: "white", dur: 0.14, env: [0.003, 0.12, 0, 0.05], filter: { type: "bp", from: 3200, to: 1100, q: 1.2 }, vol: 0.6, seed: 800 + i }),
    tone({ wave: "sine", freq: 500 + i * 60, to: 1100, slide: 0.04, dur: 0.04, env: [0.002, 0.04, 0, 0.03], vol: 0.3 }));
  sfx(`n3_bracada_${i}`, { vol: 0.42 }, noise({ color: "white", dur: 0.006, env: [0.0005, 0.006, 0, 0.004], filter: { type: "bp", cutoff: 2500, q: 1 }, vol: 0.7, seed: 810 + i }),
    noise({ color: "white", dur: 0.18, env: [0.003, 0.15, 0, 0.06], filter: { type: "lp", from: 5000, to: 900 }, vol: 0.45, seed: 820 + i }));
  sfx(`n4_bracada_${i}`, { vol: 0.42 }, [0, 0.05].map((t, k) => at(t, noise({ color: "white", dur: 0.06, env: [0.002, 0.05, 0, 0.03], filter: { type: "bp", cutoff: 2200 - k * 400, q: 1.4 }, vol: 0.55 - k * 0.15, seed: 830 + i * 2 + k }))));
}
sfx("n2_jato_loop", { dur: 1, loop: true, vol: 0.32 }, noise({ color: "white", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 3500, q: 0.9 }, tremolo: { rate: 9, depth: 0.15 }, vol: 0.5 }),
  noise({ color: "pink", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 1500, q: 1 }, vol: 0.2 }));
sfx("n3_jato_loop", { dur: 1, loop: true, vol: 0.35 }, Array.from({ length: 10 }, (_, k) => at(k / 10, noise({ color: "white", dur: 0.07, env: [0.004, 0.05, 0.3, 0.02], filter: { type: "bp", cutoff: 3500, q: 1.2 }, vol: 0.6, seed: 900 + k }))));
sfx("n4_jato_loop", { dur: 1, loop: true, vol: 0.32 }, noise({ color: "white", dur: 1.1, env: [0, 0, 1, 0], filter: { type: "bp", cutoff: 2000, q: 1.5 }, tremolo: { rate: 13, depth: 0.3 }, vol: 0.5 }),
  [0.1, 0.42, 0.7].map((t, k) => bolha(500 + k * 140, t, 0.6)));

// ---------- balão murchando
sfx("n2_balao_murcha", { vol: 0.4 }, tone({ wave: "saw", freq: 320, to: 140, slide: 0.9, dur: 0.9, env: [0.01, 0.1, 0.8, 0.1], vibrato: { rate: 17, depth: 2.5 }, tremolo: { rate: 17, depth: 0.5 }, filter: { type: "lp", cutoff: 1600 }, vol: 0.6 }));
sfx("n3_balao_murcha", { vol: 0.35 }, tone({ wave: "sine", freq: 1000, to: 280, slide: 1.0, dur: 1.0, env: [0.02, 0.1, 0.85, 0.12], vibrato: { rate: 11, depth: 3 }, vol: 0.6 }));
sfx("n4_balao_murcha", { vol: 0.4 }, noise({ color: "pink", dur: 0.9, env: [0.01, 0.1, 0.8, 0.1], filter: { type: "bp", from: 1800, to: 600, q: 3 }, tremolo: { rate: 28, depth: 0.9 }, vol: 0.9 }));

// ---------- palminhas: cada palma = 3 estalinhos colados (as mãos não batem num ponto só)
semente = 55;
const palma = (t, k, v = 1) => { const f = 1000 + rnd() * 700; return [0, 0.006, 0.013].map((d, j) => at(t + d, noise({ color: "white", dur: 0.01, env: [0.0005, j === 2 ? 0.06 : 0.01, 0, j === 2 ? 0.05 : 0.008], filter: { type: "bp", cutoff: f, q: 1.2 }, vol: v * (j === 2 ? 0.9 : 0.6), seed: 1000 + k * 3 + j }))); };
const plateia = (gente, dur, porPessoa, sobe) => { const out = []; let k = 0; for (let g = 0; g < gente; g++) { let t = rnd() * 0.12; const passo = dur / porPessoa; for (let c = 0; c < porPessoa; c++) { const p = t / dur; out.push(palma(t, k++, (sobe ? 0.5 + 0.5 * Math.min(1, p * 3) : 1) * (1 - 0.6 * p) * (0.6 + 0.4 * rnd()))); t += passo * (0.85 + rnd() * 0.3); } } return out; };
sfx("n2_palminhas", { vol: 0.45, fx: [reverb({ size: 0.3, mix: 0.15 })] }, plateia(4, 1.2, 9, true));
sfx("n3_palminhas", { vol: 0.45, fx: [reverb({ size: 0.3, mix: 0.12 })] }, [0, 0.22, 0.44].map((t, i) => [0, 0.012, 0.025].map((d, j) => palma(t + d + rnd() * 0.01, i * 3 + j, 1 - j * 0.2))));
sfx("n4_palminhas", { vol: 0.42, fx: [reverb({ size: 0.4, mix: 0.18 })] }, plateia(8, 1.6, 11, true));
