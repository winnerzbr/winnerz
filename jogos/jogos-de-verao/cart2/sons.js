/* ============================================================ sons de desenho (02/11/2026): os que o dono escolheu na página "Sons de Desenho"
   (1ª e 2ª rodadas em código e o pacote FilmCow). Ficam num arquivo só (musica/sons.mp3, feito por som/jogo_sons.py) e tocam pelo WebAudio:
   - FOL.play(nome, volume, velocidade, lado): um som (nomes com variações, como passo_areia, sorteiam uma);
   - FOL.loop(id, nome, volume, velocidade): som contínuo (motor, rodas, mar, vento, torcida...). Chamado a cada passo do jogo;
     quando o jogo para de chamar (pausa, fim da prova, troca de situação), ele some sozinho em 0,15 s.
   Os bipes viram os sons de desenho (FOL_TROCA por prova e FOL_GERAL para todas: largada, ponto, vitória, derrota...).
   Se o arquivo não carregar, tudo volta a ser como antes (bipes). O volume segue o dos efeitos nas opções. */
const FOL = (() => {
  const MAP = __FOLMAP__;
  let buf = null, req = false, bus = null; const loops = {};
  const ac = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); return actx; } catch (e) { return null; } };
  function load() {
    if (req) return; const a = ac(); if (!a) return; req = true;
    fetch('musica/sons.mp3?v=1').then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
      .then((b) => new Promise((res, rej) => a.decodeAudioData(b, res, rej))).then((d) => { buf = d; }).catch(() => { /* fica com os bipes */ });
  }
  const ok = () => { if (!buf || !soundOn || SFXV <= 0 || !actx) return false; if (actx.state === 'suspended') actx.resume().catch(() => {}); return true; };
  // o navegador só libera o som depois de um toque ou tecla: no primeiro, carrega e destrava
  for (const e of ['pointerdown', 'keydown', 'touchend']) addEventListener(e, () => { load(); if (actx && actx.state === 'suspended') actx.resume().catch(() => {}); }, { passive: true });
  function out() { if (!bus) { bus = actx.createGain(); bus.connect(actx.destination); } bus.gain.value = .85 * SFXV; return bus; }
  const VAR = {}; for (const k of Object.keys(MAP)) { const m = /^(.*)_(\d)$/.exec(k); if (m) (VAR[m[1]] = VAR[m[1]] || []).push(k); }
  const pick = (n) => (MAP[n] ? n : VAR[n] ? VAR[n][Math.floor(Math.random() * VAR[n].length)] : null);
  function play(n, vol = 1, rate = 1, pan = 0, quando = 0) {
    load(); if (!ok()) return false; const k = pick(n); if (!k) return false; const m = MAP[k];
    try {
      const s = actx.createBufferSource(), g = actx.createGain(); s.buffer = buf; s.playbackRate.value = rate * (1 + (Math.random() - .5) * .06); g.gain.value = vol; s.connect(g);
      if (pan && actx.createStereoPanner) { const p = actx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(out()); } else g.connect(out());
      s.start(actx.currentTime + quando, m[0], m[1] + .02);
    } catch (e) { return false; }
    return true;
  }
  function stopL(L, now) { try { L.g.gain.cancelScheduledValues(now); L.g.gain.setTargetAtTime(0, now, .06); L.s.stop(now + .45); } catch (e) { /* já parou */ } }
  function loop(id, n, vol, rate = 1) {
    load(); if (!ok()) return; const now = actx.currentTime; let L = loops[id];
    if (!L || L.n !== n) {
      if (L) stopL(L, now); const m = MAP[n]; if (!m) return;
      try { const s = actx.createBufferSource(), g = actx.createGain(); s.buffer = buf; s.loop = true; s.loopStart = m[0]; s.loopEnd = m[0] + m[1]; g.gain.value = 0; s.connect(g); g.connect(out()); s.start(0, m[0] + Math.random() * m[1] * .9); L = loops[id] = { n, s, g, seen: now }; } catch (e) { return; }
    }
    L.seen = now; L.g.gain.setTargetAtTime(Math.max(0, vol), now, .07); L.s.playbackRate.setTargetAtTime(clamp(rate, .3, 3), now, .09);
  }
  setInterval(() => { if (!actx) return; const now = actx.currentTime; out(); for (const id in loops) { const L = loops[id]; if (now - L.seen > .15 || !soundOn || SFXV <= 0) { stopL(L, now); delete loops[id]; } } }, 100);
  return { play, loop, load, ok, map: MAP };
})();
// os bipes de cada prova viram sons de desenho: nome, [nome, volume] ou uma função (devolve true se tocou; false deixa o bipe tocar também)
const FOL_GERAL = { start: 'contagem_vai', point: 'ponto', coin: 'pegou', big: 'tada', win: 'vitoria', over: 'wah_wah' };
const FOL_TROCA = {
  obstaculos: { jump: 'pulo', land: 'pouso', crash: 'tombo', start: () => FOL.play('apito', .8) },
  bmx: { jump: ['whoosh', .8], land: 'pouso', crash: 'tombo', whoosh: ['whoosh', .9], big: 'manobra' },
  halfpipe: { jump: 'ollie', land: 'pouso_skate', crash: 'tombo', whoosh: ['whoosh', .9], big: 'manobra', pump: () => true },
  patins: { jump: 'ollie', land: 'pouso_skate', crash: 'tombo', whoosh: ['whoosh', .9], big: 'manobra' },
  surfe: { jump: ['splash', .9], crash: () => (FOL.play('splash_grande'), FOL.play('bolhas', .6, 1, 0, .35), true), pump: ['splash', .6], whoosh: ['whoosh', .9], whiff: ['splash_grande', .8], big: 'manobra' },
  basquete: { jump: ['pulo_boing', .7], tick: 'aro', crash: 'tabela' },
  embaixadinha: { kick: 'toque', over: () => FOL.play('bola_areia') },
  futebol: { kick: 'chute', tick: 'trave', jump: ['pulo', .6], big: () => (FOL.play('rede'), FOL.play('palminhas', .9), true), over: () => FOL.play('rede') },
  volei: { kick: 'toque', jump: ['pulo', .5] },
  frisbee: { whoosh: 'disco_voo', land: 'bola_areia', tick: ['pegou', .8] },
  arco: { tick: 'corda_puxa', whoosh: 'corda_solta', land: ['bola_areia', .6], big: () => (FOL.play('balao_estoura'), FOL.play('tada', .7, 1, 0, .15), true) },
  duelo: { whoosh: 'whoosh', tick: ['splat', .5], crash: () => (FOL.play('splat'), FOL.play('estrelinhas', .7, 1, 0, .15), true), jump: ['pulo_boing', .6] },
  canoagem: { crash: () => (FOL.play('batida', .8), FOL.play('splash'), true) },
  natacao: { kick: 'bracada', jump: () => (FOL.play('mergulho'), FOL.play('bolhas', .6, 1, 0, .3), true), crash: ['splash', .9], start: () => FOL.play('apito', .8) },
  jetski: { jump: ['splash', .9], land: ['splash_grande', .7], crash: 'splash_grande', whiff: ['batida', .7], tick: 'contagem', start: () => (FOL.play('vrum', .9), FOL.play('contagem_vai')) },
  bugue: { crash: () => (FOL.play('batida'), FOL.play('estrelinhas', .6, 1, 0, .2), true), start: () => (FOL.play('vrum', .9), FOL.play('contagem_vai')) },
  teco: { jump: ['whoosh', .7], point: () => FOL.play(teco.done ? 'ponto' : 'balao_estoura'), crash: () => (FOL.play('splat'), FOL.play('estrelinhas', .8, 1, 0, .15), true), coin: 'pegou' },
};
for (const k of Object.keys(sfx)) {
  const o = sfx[k];
  sfx[k] = function (...a) {
    FOL.load();
    const id = typeof cur !== 'undefined' && cur && mode !== 'menu' ? cur.id : '', r = (FOL_TROCA[id] && FOL_TROCA[id][k]) || (mode !== 'menu' || k === 'win' || k === 'over' ? FOL_GERAL[k] : null);
    if (r && FOL.ok()) { const tocou = typeof r === 'function' ? r(...a) : Array.isArray(r) ? FOL.play(r[0], r[1]) : FOL.play(r); if (tocou) return; }
    return o.apply(this, a);
  };
}
// bipes que as provas novas tocam direto: silenciados enquanto o som de desenho daquele momento toca
let folMudo = 0;
beep = ((b) => (...a) => { if (folMudo > 0) return; return b(...a); })(beep);
const folSem = (f) => { folMudo++; try { return f(); } finally { folMudo--; } };
// ---------- a cada passo do jogo: sons contínuos e o que não tinha bipe (passos, quiques, motores...)
const FOLM = {};
const folN = (m, k, v) => { m[k] = Math.max((m[k] || 1) * .9995, v, 1e-6); return clamp(v / m[k], 0, 1); };
const FOL_PASSO = {
  obstaculos(ev, dt, I, m) {
    for (const r of ev.rs) {
      const k = Math.floor(r.ph * 2.93 / 4), key = 'p' + r.lane;
      if (m[key] !== undefined && k !== m[key] && r.air <= 0 && r.tropT <= 0 && r.v > .5 && ev.st !== 'pronto') {
        if (r.me) {
          const poca = r.obs.some((o) => o.k === 'poca' && r.x + OB.FR >= o.x && r.x <= o.x + OB_TIPO.poca.w);
          FOL.play(poca ? 'passo_poca' : ev.inFofa(r.x) ? 'passo_fofo' : 'passo_areia', .55 + r.v / 30, .95 + r.v / 60);
        } else if (Math.random() < .5) FOL.play('plof', .14, 1 + r.lane * .05, -.2);
      }
      m[key] = k;
    }
    if (ev.cheer > 2 && !(m.cheer > 2)) FOL.play('palminhas', .7); m.cheer = ev.cheer;
  },
  bmx(v, dt, I, m) {
    const sp = Math.hypot(v.vx || 0, v.vy || 0), n = folN(m, 'vmax', sp);
    if (v.crashT > 0) return;
    if (!v.air) { FOL.loop('roda', 'rodas_loop', .15 + .5 * n, .7 + .7 * n); if (!I.a && sp > 30) FOL.loop('cat', 'catraca_loop', .3 * n, .6 + .8 * n); }
    else if (!I.a) FOL.loop('cat', 'catraca_loop', .2 * n, .5 + .6 * n);
  },
  halfpipe(v, dt, I, m) { const n = folN(m, 'vmax', Math.abs(v.v || 0)); if (v.bailT > 0 || v.lip || v.air) return; FOL.loop('roda', 'rodas_loop', .12 + .55 * n, .7 + .6 * n); },
  patins(v, dt, I, m) { const n = folN(m, 'vmax', Math.abs(v.v || 0)); if (v.deadT > 0 || v.grind || v.air) return; FOL.loop('roda', 'rodas_loop', .2 + .45 * n, .8 + .5 * n); },
  surfe(v, dt, I, m) { if (v.fallT > 0) return; if (m.air && !v.air) FOL.play('splash', .7); m.air = v.air; },
  basquete(v, dt, I, m) {
    if (v.walk > 0 && v.cd <= 0 && !v.charging && v.shootT <= 0) { const k = Math.floor(v.t * 8 / Math.PI); if (k !== m.dri) { FOL.play('quique', .6); FOL.play('passo_tip', .35, 1, 0, .1); } m.dri = k; }
    m.vy = m.vy || new WeakMap();
    for (const b of v.balls) { const p = m.vy.get(b); if (p !== undefined && p > 60 && b.vy < 0 && b.y > VGY - 30) FOL.play('quique', clamp(p / 300, .25, 1)); m.vy.set(b, b.vy); }
    if (v.net > 0 && !(m.net > 0)) FOL.play('rede', .9); m.net = v.net;
    if (v.cheer > .9 && !(m.cheer > .9)) FOL.play('palminhas', .6); m.cheer = v.cheer;
  },
  futebol(v, dt, I, m) { const b = v.ball; if (!b) return; if (m.bvy !== undefined && m.bvy > 70 && b.vy < 0) FOL.play('bola_areia', clamp(m.bvy / 300, .2, .8)); m.bvy = b.vy; },
  volei(v, dt, I, m) { if (v.state !== m.st) { if (v.state === 'point') FOL.play('bola_areia', .9); if (v.cheer > .5) FOL.play('palminhas', .5); } m.st = v.state; },
  bocha(v, dt, I, m) {
    let rola = 0;
    for (const b of v.balls.concat(v.jack ? [v.jack] : [])) { if (!b) continue; if (b.mv && !b.fly) rola = Math.max(rola, Math.hypot(b.vx, b.vy)); }
    if (rola > 4) FOL.loop('rola', 'rolar_loop', clamp(rola / 80, .08, .6), .7 + clamp(rola / 150, 0, .6));
    m.fly = m.fly || new WeakMap();
    for (const b of v.balls.concat(v.jack ? [v.jack] : [])) { if (!b) continue; const f = !!b.fly; if (m.fly.get(b) && !f && b.alive !== false) FOL.play('bola_areia', .8); m.fly.set(b, f); }
    if (m.enc !== undefined && v.encostos > m.enc) FOL.play('encostou', .9); m.enc = v.encostos;
  },
  arco(v, dt, I, m) { const n = v.stuck.filter((s) => !s.chao).length; if (m.n !== undefined && n > m.n) FOL.play('flecha_alvo'); m.n = n; },
  duelo(v, dt, I, m) { if (v.P && v.P.shootT > 0) FOL.loop('jato', 'jato_loop', .5); if (v.A && v.A.shootT > 0) FOL.loop('jato2', 'jato_loop', .28, .92); },
  canoagem(v, dt, I, m) { if (m.ls !== undefined && v.lastStroke !== m.ls) FOL.play('remada', .8, 1, v.lastSide ? clamp(v.lastSide, -1, 1) * .4 : 0); m.ls = v.lastStroke; },
  jetski(v, dt, I, m) { const me = v.me; if (!me || me.fallT > 0) return; const n = folN(m, 'vmax', Math.abs(me.v || 0)); FOL.loop('motor', 'motor_jetski_loop', .3 + .35 * n, .7 + .8 * n); },
  bugue(v, dt, I, m) {
    const k = v.me; if (!k) return; const sp = Math.hypot(k.vx || 0, k.vy || 0), n = clamp(sp / BG.vmax, 0, 1.4);
    FOL.loop('motor', 'motor_bugue_loop', .35 + .3 * Math.min(1, n), .65 + .75 * n + (k.boost > 0 ? .15 : 0));
    if (k.drift && !m.drift && sp > 60) FOL.play('derrapada', .8); m.drift = !!k.drift;
    if (k.boost > 0 && !(m.boost > 0)) FOL.play('turbo', .9); m.boost = k.boost;
    if (m.z > 4 && !(k.z > 4)) FOL.play('pouso', .7); m.z = k.z || 0;
    let d = 1e9, perto = null; for (const o of v.K) if (o !== k) { const dd = Math.hypot(o.x - k.x, o.y - k.y); if (dd < d) { d = dd; perto = o; } }
    if (d < 220) FOL.loop('motor2', 'motor_bugue_loop', .18 * (1 - d / 220), .85);
    // buzina de palhaço ao passar alguém de perto (no máximo a cada 4 s)
    if (perto && d < 60) { const frente = (k.prog || 0) > (perto.prog || 0); if (m.atras === perto && frente && (m.bzT || 0) <= 0) { FOL.play('buzina', .7); m.bzT = 4; } m.atras = frente ? null : perto; }
    m.bzT = (m.bzT || 0) - dt;
  },
  teco(v, dt, I, m) { const p = v.me; if (!p) return; const n = folN(m, 'vmax', Math.hypot(p.vx || 0, p.vy || 0)); FOL.loop('motor', 'motor_aviao_loop', .3 + .3 * n, .75 + .6 * n); },
};
window.__folHook = (ev, dt, I) => { const f = FOL_PASSO[ev.id]; if (!f) return; try { f(ev, dt, I || {}, (FOLM[ev.id] = FOLM[ev.id] || {})); } catch (e) { /* som não pode travar o jogo */ } };
if (typeof pingue !== 'undefined') {
  const hit0 = pingue.hit, ev0 = pingue.event;
  pingue.hit = function (...a) { if (FOL.ok()) { FOL.play('ping_raquete', .9); return folSem(() => hit0.apply(this, a)); } return hit0.apply(this, a); };
  pingue.event = function (e, ...a) {
    if (FOL.ok() && e) {
      if (e.k === 'floor') FOL.play('ping_mesa', .45, .62);
      else if (e.k !== 'net') { FOL.play('ping_mesa', .8); return folSem(() => ev0.call(this, e, ...a)); }
    }
    return ev0.call(this, e, ...a);
  };
}
if (typeof bocha !== 'undefined') {
  const hf = bocha.hitFx, bd = bocha.board;
  bocha.hitFx = function (a, b, r) { if (FOL.ok()) { FOL.play('bocha_bate', clamp(.35 + (r || 0) / 150, .35, 1)); return folSem(() => hf.call(this, a, b, r)); } return hf.call(this, a, b, r); };
  bocha.board = function (b) { const sp = Math.hypot(b.vx, b.vy); if (FOL.ok()) { if (sp > 15) FOL.play('tabela', clamp(sp / 150, .2, .7)); return; } return bd.call(this, b); };
}
