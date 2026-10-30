  /* ============================================================ Half-pipe pintado (skate do IAmiguinho)
     As pranchas pintadas entram no lugar dos desenhos de 16 bits conforme ficam prontas; o que ainda não tem
     prancha nova (giro, foguete, hélice, manobras na borda, tombo) continua em 16 bits, com pixels nítidos.
     O jogo gira o desenho em pé para acompanhar a rampa e o voo, como antes. */
  const MS = window.MVSK, MSI = {}, MSK = {};
  if (MS) {
    for (const [nm, a] of Object.entries(MS.a)) { MSI[nm] = new Image(); MSI[nm].src = a.src; MSK[nm] = new Image(); MSK[nm].src = a.mask; }
    if (MS.bsrc) { MSI.__b = new Image(); MSI.__b.src = MS.bsrc; }
  }
  const SKOK = () => !!MS && Object.keys(MSI).every((n) => MSI[n].complete && MSI[n].naturalWidth > 0) && Object.keys(MSK).every((n) => MSK[n].complete && MSK[n].naturalWidth > 0);
  window.__SKOK = SKOK;
  const SKS = 50.5 / 177; // unidades do half-pipe por pixel guardado: em pé no skate, da roda à hélice, igual ao desenho antigo
  const SKST = { lastAir: -9, mode: '', t0: 0, pf: 0, tt: 0 };
  let FTS = null;
  (window.__fr = window.__fr || {})['sk'] = frameSk; // usado só pelos testes
  function frameSk(an, k, ex, mirror) {
    const A = MS.a[an], n = A.f.length, f = A.f[((k | 0) % n + n) % n];
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.scale(SKS * (mirror ? -1 : 1), SKS);
    ctx.drawImage(MSI[an], f.x, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    // rosto aceso só dentro da tela escura do quadro (o mesmo do vôlei)
    if (f.s && f.sz) {
      if (!FTS) FTS = document.createElement('canvas');
      const w = Math.ceil(f.w), h = Math.ceil(f.h);
      if (FTS.width < w || FTS.height < h) { FTS.width = Math.max(FTS.width, w); FTS.height = Math.max(FTS.height, h); }
      const g = FTS.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, FTS.width, FTS.height);
      const cx = f.s[4] ?? (f.s[0] + f.s[2]) / 2, cy = f.s[5] ?? (f.s[1] + f.s[3]) / 2;
      const L1 = f.s[6] || f.sz[0], L2 = f.s[7] || f.sz[1], fk = L2 / 14.5, fkx = clamp(.62 * L1 / (11.6 * fk), .5, 1.3);
      const save = ctx; ctx = g; try { g.save(); g.translate(cx, cy); g.rotate((f.r || 0) + (f.inv ? Math.PI : 0)); glowFace(ex, 0, L2 * .03, fk, fkx); g.restore(); } finally { ctx = save; }
      g.globalCompositeOperation = 'destination-in'; g.drawImage(MSK[an], f.x, 0, f.w, f.h, 0, 0, f.w, f.h); g.globalCompositeOperation = 'source-over';
      ctx.drawImage(FTS, 0, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    }
    ctx.restore();
  }
  // skate solto (flips): centro do desenho na origem
  function boardSk(set, i, rot) {
    const L = MS.boards[set], f = L[((i | 0) % L.length + L.length) % L.length];
    ctx.save(); ctx.imageSmoothingEnabled = true; if (rot) ctx.rotate(rot); ctx.scale(SKS, SKS);
    ctx.drawImage(MSI.__b, f.x, 0, f.w, f.h, -f.w / 2, -f.h / 2, f.w, f.h); ctx.restore();
  }
  const BSIDE = () => MS.boards.kf[0].h * SKS; // altura do skate de lado (com as rodas), em unidades
  // no chão: qual prancha e qual quadro, a partir do estado do half-pipe
  function skGround(h, tt) {
    const dt = clamp(tt - SKST.tt, 0, .05); SKST.tt = tt;
    if (tt < SKST.lastAir) SKST.lastAir = -9; // relógio recomeçou (partida nova): não está pousando
    const sl = tt - SKST.lastAir;
    const mode = h.wob > 0 ? 'wob' : h.braking ? 'brake' : sl < .34 ? 'land' : h.pumping ? 'pump' : 'idle';
    if (mode !== SKST.mode) { SKST.mode = mode; SKST.t0 = tt; if (mode === 'pump') SKST.pf = 0; }
    const e = tt - SKST.t0;
    if (mode === 'wob') return ['wob', Math.floor(tt * 12) % 8];
    if (mode === 'brake') return ['brake', e < .22 ? Math.floor(e / .22 * 4) : 4 + Math.floor(tt * 10) % 4];
    if (mode === 'land') return ['land', 1 + Math.min(6, Math.floor(sl / .34 * 7))];
    if (mode === 'pump') {
      // agacha no fundo plano (quadros até o 5) e estica subindo a parede (6 a 8); sempre para a frente no ciclo
      const tgt = Math.abs(h.s) < HPF * .6 ? 4 : 0, cur8 = Math.floor(SKST.pf) % 8;
      if (cur8 !== tgt) SKST.pf = (SKST.pf + dt * 16) % 8;
      return ['pump', Math.floor(SKST.pf) % 8];
    }
    return ['idle', Math.floor(tt * 8) % 8];
  }
  const vSprite16 = vSprite;
  vSprite = function (key, anim, f, p, face, expr, look, crown, tt) {
    if (typeof halfpipe === 'undefined' || cur !== halfpipe || !SKOK()) return vSprite16.apply(this, arguments);
    if (key === 'ia_sk' && anim === 'chao') {
      const [an, k] = skGround(halfpipe, tt || 0);
      ctx.save(); ctx.translate(p.x, p.y); frameSk(an, k, expr || 0, face < 0); ctx.restore(); return;
    }
    // desenho antigo: pixels nítidos (sem suavizar), a não ser que ele mesmo peça (giro no plano)
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    try { return vSprite16.apply(this, arguments); } finally { ctx.imageSmoothingEnabled = sm; }
  };
  // no ar: saída da rampa, voo, pouso preparado e as manobras com prancha pintada
  if (typeof halfpipe !== 'undefined') {
    const air16 = halfpipe.drawAir;
    const BODY = { a: 'super', b: 'cristo', c: 'foguete', e: 'helice' }, GRAB = { u: 'indy', d: 'rabeta', ul: 'melao' };
    halfpipe.drawAir = function (tt) {
      if (!SKOK()) return air16.call(this, tt);
      if (mode === 'play') SKST.lastAir = tt; // a demonstração do menu (e as miniaturas) não contam como pulo
      const sd = this.side, xw = HPX + sd * (HPF + HPR) - sd, fy = HPY - HPR - this.ah, tr = this.trick, pr = tr ? Math.min(1, tr.t / tr.d) : 1, k = tr && tr.k, key = tr && tr.key;
      const c = Math.cos(this.rot * Math.PI / 180), sc = Math.abs(c) < .18 ? (c < 0 ? -.18 : .18) : c;
      const face = sd * this.stance < 0 ? -1 : 1, expr = this.doneTr.length || (tr && pr > .5) ? 2 : 0;
      const m180 = ((this.rot % 180) + 180) % 180;
      const spin = m180 > 12 && m180 < 168;
      const q8 = tr && tr.hold > 0 && tr.t >= tr.d * .5 - 1e-6 ? [3, 4, 5, 4][Math.floor(tr.hold * 8) % 4] : Math.min(7, Math.floor(pr * 8));
      let an, fr, board = null;
      if (k === 'helice') { an = 'helice'; fr = Math.floor(tt * 24) % 8; } // a hélice do boné girando rápido enquanto ele paira
      else if (k === 'body') { an = BODY[key.replace('btn_', '')] || 'super'; fr = q8; }
      else if (k === 'grab') { an = GRAB[key] || 'indy'; fr = q8; }
      else if (tr) {
        an = 'flip'; fr = q8;
        const up = Math.sin(pr * Math.PI) * 7;
        if (k === 'flip') board = ['kf', [0, 1, 2, 3, 4, 5, 6, 7, 0][Math.min(8, Math.floor(pr * 9))], 0, up, key === 'l'];
        else if (k === 'tre') { const i = Math.min(8, Math.floor(pr * 9)); board = [i % 2 ? 'sv' : 'kf', i % 8, 0, up, false]; }
        else if (k === 'varial') board = ['sv', Math.min(8, Math.floor(pr * 9)) % 8, 0, up, false];
        else board = ['kf', 0, pr * TAU, up * .6, false]; // impossible: o skate dá a volta em pé
      } else {
        const left = this.airDur - this.airT;
        if (this.airT < .28) { an = 'takeoff'; fr = 3 + Math.min(4, Math.floor(this.airT / .28 * 5)); }
        else if (left < .36) { an = 'air'; fr = 4 + Math.min(3, Math.floor((1 - left / .36) * 4)); }
        else { an = 'air'; fr = Math.min(3, Math.floor((this.airT - .28) * 10)); }
      }
      ctx.save(); ctx.translate(xw, fy); ctx.rotate(-sd * Math.PI / 2);
      // girando: as 16 vistas em volta dele (de lado, de frente, de costas). Com manobra no meio do giro, a pose da manobra
      // aparece quando ele está quase de lado (achatada só um pouco) e as vistas do giro no resto da volta
      // manobra combinada (segurada + giro): prancha própria, 8 vistas em volta dele com a pose da manobra
      const cb = tr && typeof HP_CB !== 'undefined' && HP_CB[key], cba = cb && MS.a[cb.an];
      if (spin && cba) { frameSk(cb.an, ((Math.round(this.rot / 45) % 8) + 8) % 8, expr, face < 0); ctx.restore(); return; }
      if (spin && (!tr || Math.abs(c) < .75)) {
        // 14 vistas diferentes: parte 1 inteira (lado → frente → outro lado) e o meio da parte 2 (as costas);
        // o primeiro e o último quadro da parte 2 repetem os lados da parte 1
        const v = ((Math.round(this.rot / (360 / 14)) % 14) + 14) % 14;
        frameSk(v < 8 ? 'giro1' : 'giro2', v < 8 ? v : v - 7, expr, face < 0); ctx.restore(); return;
      }
      ctx.scale(spin ? (c < 0 ? -1 : 1) * Math.max(.85, Math.abs(c)) : sc, 1);
      if (board) {
        const bh = BSIDE();
        ctx.save(); ctx.scale(face * (board[4] ? -1 : 1), 1); ctx.translate(0, -bh / 2 - board[3]); boardSk(board[0], board[1], board[2]); ctx.restore();
        ctx.translate(0, -bh * .72); // o corpo do flip fica na altura de quem está em cima do skate
      }
      frameSk(an, fr, expr, face < 0);
      ctx.restore();
    };
    // na borda: manual, parada de mão, grind e stall; a barra de tempo continua a mesma
    const lip16 = halfpipe.drawLip, LIPA = { manual: 'manual', plant: 'plant', grind: 'grind', stall: 'stall' };
    halfpipe.drawLip = function (tt) {
      if (!SKOK()) return lip16.call(this, tt);
      SKST.lastAir = -9;
      const L = this.lip, sg = L.side, x = HPX + sg * (HPF + HPR), y = HPY - HPR - 3, k = HP_LIP[L.k].k, r = L.t / L.T;
      let fr;
      if (k === 'plant') fr = L.t < .3 ? Math.min(2, Math.floor(L.t / .3 * 3)) : 3 + Math.floor(tt * 4) % 2; // sobe, fica de ponta-cabeça
      else if (k === 'grind') fr = Math.floor(tt * 14) % 8;
      else if (k === 'manual') fr = Math.floor(tt * 8) % 8;
      else fr = Math.floor(tt * 6) % 8;
      ctx.save(); ctx.translate(x, y + 2); frameSk(LIPA[k], fr, 5, -sg < 0); ctx.restore();
      if (prompting()) {
        const bw = 34, bx = Math.round(x - sg * 30 - bw / 2), by = y - 66;
        R(bx - 1, by - 1, bw + 2, 6, NAVY); R(bx, by, bw, 4, '#2b3442');
        R(bx + Math.round(bw * .7), by, Math.round(bw * .18), 4, '#2f7a4c'); R(bx + Math.round(bw * .88), by, bw - Math.round(bw * .88), 4, '#5fe08a');
        R(bx, by, Math.round(bw * Math.min(1, r)), 4, r >= .88 && Math.floor(tt * 16) % 2 ? '#ffffff' : 'rgba(255,255,255,.85)');
      }
    };
    // tombo: cai rolando do lado em que estava (as poses já giram no desenho) e fica sentado, tonto
    const bail16 = halfpipe.drawBail;
    halfpipe.drawBail = function (tt) {
      if (!SKOK()) return bail16.call(this, tt);
      SKST.lastAir = -9;
      const k = 1.4 - this.bailT, b = this.bail0 || { side: this.side, x0: HPX + this.side * 140, y0: HPY - HPR, x1: HPX + this.side * 94, y1: HPY }, sd = b.side;
      if (k < .55) {
        const t = k / .55, x = b.x0 + (b.x1 - b.x0) * t, y = b.y0 + (b.y1 - b.y0) * t * t - 18 * Math.sin(t * Math.PI);
        ctx.save(); ctx.translate(x, y); frameSk('bail', Math.min(7, Math.floor(t * 8)), 3, -sd < 0); ctx.restore();
      } else { ctx.save(); ctx.translate(b.x1, HPY + 1); frameSk('dizzy', Math.floor(tt * 7) % 8, 4, -sd < 0); ctx.restore(); }
    };
  }
  /* ------------------------------------------------------------ cenário pintado do half-pipe
     Praia do vôlei pintado ao fundo; céu alto com estrelas quando a câmera sobe; rampa com a parede de madeira azul,
     pista de compensado, deck, corrimão e borda de metal; calçadão de pedras na frente; Amiguinhos pintados torcendo. */
  const SC = window.SKSC, SCI = {}, PAT = {};
  if (SC) for (const [n, src] of Object.entries(SC)) { SCI[n] = new Image(); SCI[n].src = src; }
  const SCOK = () => !!SC && Object.values(SCI).every((im) => im.complete && im.naturalWidth > 0) && ready('ceu', 'mar', 'areia', 'b_frente');
  // textura repetida com o tamanho do ladrilho em unidades do jogo
  function pat(n, u, ox = 0, oy = 0) {
    const p = PAT[n] || (PAT[n] = ctx.createPattern(SCI[n], 'repeat')), im = SCI[n], k = u / im.naturalWidth;
    p.setTransform(new DOMMatrix([k, 0, 0, k, ox, oy])); return p;
  }
  const DECK_COLS = ['#f08a3c', '#e86fa8', '#9a7cf0', '#ffcf3f'];
  /* ------------------------------------------------------------ Skatepark do Viaduto (Costa WinnerZ), nos 4 horários
     O horário vem do relógio de quem joga: manhã 5h-10h, dia 10h-16h, entardecer 16h-19h, noite 19h-5h; meia hora antes e
     depois de cada troca as duas versões se misturam. Só as imagens do horário em uso são baixadas. À noite as luzes
     (janelas, neon, postes) ficam numa camada própria que pulsa de leve. Rampa e chão recebem a cor da luz do horário. */
  const VDS = window.SKVD, VDI = {};
  const vdImg = (k, src) => { if (!VDI[k]) { VDI[k] = new Image(); VDI[k].src = src; } const im = VDI[k]; return im.complete && im.naturalWidth > 0 ? im : null; };
  const HORAS = [['noite', 5, 'manha'], ['manha', 10, 'dia'], ['dia', 16, 'tarde'], ['tarde', 19, 'noite']];
  function skHora() {
    if (window.__skHora != null) return window.__skHora; // usado só pelos testes
    const d = new Date(); return d.getHours() + d.getMinutes() / 60;
  }
  // pesos de cada versão agora (no máximo duas ao mesmo tempo)
  function skPesos() {
    const h = skHora();
    for (const [a, b, c] of HORAS) if (Math.abs(h - b) < .5) { const t = (h - b + .5); return [[a, 1 - t], [c, t]]; }
    const v = h >= 5 && h < 10 ? 'manha' : h >= 10 && h < 16 ? 'dia' : h >= 16 && h < 19 ? 'tarde' : 'noite';
    return [[v, 1]];
  }
  const LUZH = { manha: [255, 228, 204], dia: [255, 255, 255], tarde: [255, 192, 160], noite: [96, 108, 190] };
  const HAZE = { manha: [255, 214, 196], dia: [214, 232, 255], tarde: [255, 160, 130], noite: [40, 52, 130] };
  const mixc = (P, T, k = 1) => { const c = [0, 0, 0]; for (const [v, w] of P) for (let i = 0; i < 3; i++) c[i] += T[v][i] * w; return c.map((x) => Math.round(255 + (x - 255) * k)); };
  const hexrgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  let SKP = null; // pesos do quadro atual (para a cor da luz na rampa)
  // fundo distante + névoa + meio-plano; devolve false enquanto as imagens do horário não chegaram
  function skBack(cam, tt) {
    if (!VDS) return false;
    let P = skPesos().filter(([, w]) => w > .001).map(([v, w]) => [v, w, vdImg('f_' + v, VDS.f[v]), vdImg('m_' + v, VDS.m[v])]);
    const ok = P.filter((p) => p[2] && p[3]); if (!ok.length) return false;
    if (ok.length < P.length) { P = ok; P[0][1] = 1; }
    SKP = P.map(([v, w]) => [v, w]);
    const night = P.reduce((a, [v, w]) => a + (v === 'noite' ? w : v === 'tarde' ? w * .35 : 0), 0);
    const byF = cam * .3, byM = cam * .7, FW = W, FY = byF + 185 - FW * (1035 / 1254);
    // céu acima do desenho (só aparece quando ele voa muito alto)
    const top = mixc(P, Object.fromEntries(P.map(([v]) => [v, hexrgb(VDS.top[v])])));
    ctx.fillStyle = `rgb(${top})`; ctx.fillRect(0, 0, W, Math.max(0, FY + 2));
    for (const [, w, f] of P) { ctx.globalAlpha = w; ctx.drawImage(f, 0, FY, FW, FW); }
    ctx.globalAlpha = 1;
    if (night > .01) { const lf = vdImg('lf', VDS.lf); if (lf) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.32 + .1 * Math.sin(tt * 1.7)); ctx.drawImage(lf, 0, FY, FW, FW); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; } }
    // névoa entre a cidade e o viaduto, na cor do horário
    { const c = mixc(P, HAZE), g = ctx.createLinearGradient(0, byM + 90, 0, byM + 190); g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(.6, `rgba(${c},.28)`); g.addColorStop(1, `rgba(${c},.12)`); ctx.fillStyle = g; ctx.fillRect(0, byM + 90, W, 100); }
    const MY = byM + 190 - W * 9 / 16 * (725 / 941);
    for (const [, w, , m] of P) { ctx.globalAlpha = w; ctx.drawImage(m, 0, MY, W, W * 9 / 16); }
    ctx.globalAlpha = 1;
    if (night > .01) { const lm = vdImg('lm', VDS.lm); if (lm) {
      // neon e postes: pulsam devagar, com uma tremidinha de vez em quando
      const fl = Math.sin(tt * 2.3) * .06 + (Math.sin(tt * 37) > .985 ? -.12 : 0);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.max(0, night * (.42 + fl)); ctx.drawImage(lm, 0, MY, W, W * 9 / 16); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; } }
    return true;
  }
  // cor da luz do horário por cima da rampa, do deck e do chão (multiplicar: branco = não muda)
  function skTint(path, k = 1) {
    if (!SKP) return; const c = mixc(SKP, LUZH, k); if (c[0] > 252 && c[1] > 252 && c[2] > 252) return;
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(${c})`;
    if (path) { path(); ctx.fill(); } else ctx.fillRect(-10, -400, W + 20, H + 800);
    ctx.restore();
  }
  if (typeof halfpipe !== 'undefined') {
    const draw16 = halfpipe.draw;
    halfpipe.draw = function (tt) {
      if (!SKOK() || !SCOK()) return draw16.call(this, tt);
      const L0 = HPX - HPF - HPR, L1 = HPX + HPF + HPR, TOP = HPY - HPR;
      const cam = this.cam || 0, by = Math.round(cam * .3 * 4) / 4;
      ctx.save(); ctx.imageSmoothingEnabled = true;
      // fundo: o Skatepark do Viaduto no horário de quem joga; enquanto ele carrega, a praia pintada
      SKP = null; const VDOK = skBack(cam, tt);
      if (!VDOK) {
      const sw = W * 1.08, sh = sw * 9 / 16, sy = by + 141 - .6376 * sh;
      ctx.fillStyle = '#121a4a'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(IMG.ceu, (W - sw) / 2, sy, sw, sh);
      // a parte de baixo do céu alto vai sumindo por cima do céu do vôlei (sem emenda)
      if (sy > -2) { const a = SCI.alto, ah = W * a.naturalHeight / a.naturalWidth, fade = ah * 140 / 880; ctx.drawImage(a, 0, sy + fade + 4 - ah, W, ah); }
      { const mw = W * 1.1, mh = mw * 9 / 16; ctx.drawImage(IMG.mar, (W - mw) / 2, by + 141 - .6376 * mh, mw, mh); }
      ctx.drawImage(IMG.areia, 0, by, W, H);
      artHaze(by + H * .6, by + H * .9, by);
      }
      artVignette(H * .6);
      ctx.translate(0, Math.round(cam * 2) / 2);
      const surf = (x) => { const dx = Math.abs(x - HPX); if (dx <= HPF) return HPY; const u = Math.min(HPR, dx - HPF); return HPY - (HPR - Math.sqrt(HPR * HPR - u * u)); };
      // parede da rampa: madeira azul com as travessas, mais escura embaixo
      ctx.save(); ctx.beginPath(); ctx.moveTo(0, TOP - 4); ctx.lineTo(L0, TOP - 4);
      for (let x = L0; x <= L1; x += .5) ctx.lineTo(x, surf(x) - 4);
      ctx.lineTo(W, TOP - 4); ctx.lineTo(W, HPGB); ctx.lineTo(0, HPGB); ctx.closePath();
      ctx.fillStyle = pat('lado', 120, 0, TOP); ctx.fill(); ctx.clip();
      { const g = ctx.createLinearGradient(0, TOP, 0, HPGB); g.addColorStop(0, 'rgba(20,16,70,0)'); g.addColorStop(1, 'rgba(20,16,70,.42)'); ctx.fillStyle = g; ctx.fillRect(0, TOP - 6, W, HPGB - TOP + 6); }
      ctx.restore();
      // pista de compensado por onde as rodas passam (mesma linha de antes), com brilho em cima e sombra embaixo
      const band = (o0, o1) => { ctx.beginPath(); for (let x = L0; x <= L1; x += .5) ctx.lineTo(x, surf(x) + o0); for (let x = L1; x >= L0; x -= .5) ctx.lineTo(x, surf(x) + o1); ctx.closePath(); };
      band(-3.2, 1.2); ctx.fillStyle = pat('pista', 70); ctx.fill();
      band(1.2, 3); ctx.fillStyle = 'rgba(150,104,70,.55)'; ctx.fill();
      ctx.lineJoin = 'round';
      ctx.beginPath(); for (let x = L0; x <= L1; x += .5) ctx.lineTo(x, surf(x) - 3); ctx.strokeStyle = 'rgba(255,250,236,.9)'; ctx.lineWidth = .6; ctx.stroke();
      ctx.beginPath(); for (let x = L0; x <= L1; x += .5) ctx.lineTo(x, surf(x) + 3.2); ctx.strokeStyle = NAVY; ctx.lineWidth = .9; ctx.stroke();
      // decks dos dois lados: compensado com a borda azul; corrimão na ponta de fora
      const dk = SCI.deck, dh = 15, pxu = dk.naturalHeight / dh;
      for (const sg of [-1, 1]) {
        const ex = HPX + sg * (HPF + HPR), x0 = sg < 0 ? 0 : ex, w = sg < 0 ? ex : W - ex, sw2 = w * pxu;
        ctx.drawImage(dk, sg < 0 ? dk.naturalWidth - sw2 : 0, 0, sw2, dk.naturalHeight, x0, TOP + 1.2 - dh, w, dh);
        const rl = SCI.rail, rh = 24, rpx = rl.naturalHeight / rh, rw = Math.min(w + 4, rl.naturalWidth / rpx);
        ctx.save(); ctx.translate(sg < 0 ? 1 : W - 1, 0); ctx.scale(-sg, 1);
        ctx.drawImage(rl, 0, 0, rw * rpx, rl.naturalHeight, 0, TOP - 7 - rh, rw, rh); ctx.restore();
        // borda de metal (vista de ponta)
        const g = ctx.createRadialGradient(ex - 1.2, TOP - 3.4, .3, ex, TOP - 2, 4);
        g.addColorStop(0, '#ffffff'); g.addColorStop(.35, '#c9d2e6'); g.addColorStop(1, '#6d7c9e');
        ctx.beginPath(); ctx.arc(ex, TOP - 2, 3.6, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = .8; ctx.stroke();
      }
      // Amiguinhos torcendo nos decks (os mesmos da torcida do vôlei)
      { const cheer = this.cheer > 0, a = C2.b_frente, kk = .44;
        [[10, 0], [26, 1], [W - 26, 2], [W - 10, 3]].forEach(([x, i]) => {
          const y = TOP - 4, ph = i * 1.9, hop = cheer ? Math.max(0, Math.sin(tt * 11 + ph)) * 5 : Math.max(0, Math.sin(tt * 2 + ph)) * .6;
          ctx.save(); ctx.translate(x, y - hop); ctx.scale(kk / PXU, kk * (1 + (cheer ? .06 : .02) * Math.sin(tt * 11 + ph)) / PXU);
          ctx.drawImage(tinted('b_frente', DECK_COLS[i]), -a.foot[0], -a.foot[1]); ctx.restore();
          ctx.save(); ctx.translate(x + (a.vis[0] - a.foot[0]) / PXU * kk, y - hop + (a.vis[1] - a.foot[1]) / PXU * kk + .3); ctx.scale(kk * .9, kk * .9);
          faceExpr(cheer ? 2 : i === 1 ? 1 : 0, 0, 0, 1, C.eye); ctx.restore();
        });
      }
      // calçadão de pedras no pé da rampa
      const ch = VDOK && vdImg('chao', VDS.chao);
      { const cl = ch || SCI.calc; ctx.drawImage(cl, 0, 0, cl.naturalWidth, cl.naturalWidth * (H - HPGB + 6) / W, 0, HPGB, W, H - HPGB + 6);
        const g = ctx.createLinearGradient(0, HPGB, 0, H); g.addColorStop(0, 'rgba(40,20,70,.35)'); g.addColorStop(1, 'rgba(40,20,70,0)'); ctx.fillStyle = g; ctx.fillRect(0, HPGB, W, H - HPGB + 6);
        ctx.fillStyle = NAVY; ctx.fillRect(0, HPGB - .5, W, 1); }
      // luz do horário na rampa, nos decks (com os Amiguinhos) e no chão
      skTint(() => { ctx.beginPath(); ctx.moveTo(0, TOP - 34); ctx.lineTo(L0 + 4, TOP - 34); ctx.lineTo(L0 + 4, TOP - 4); for (let x = L0; x <= L1; x += 1) ctx.lineTo(x, surf(x) + 4); ctx.lineTo(L1 - 4, TOP - 4); ctx.lineTo(L1 - 4, TOP - 34); ctx.lineTo(W, TOP - 34); ctx.lineTo(W, H + 10); ctx.lineTo(0, H + 10); ctx.closePath(); });
      for (const f of this.lipFx) { ctx.fillStyle = f.t < .15 ? '#fff3b0' : '#ffb020'; ctx.beginPath(); ctx.arc(f.x, f.y, .9, 0, TAU); ctx.fill(); }
      ctx.restore(); ctx.save(); ctx.translate(0, Math.round(cam * 2) / 2);
      if (sReady('ia_sk', 'shape', 'rostos')) {
        const p = hpPos(this.s);
        if (this.bailT > 0) this.drawBail(tt);
        else if (this.lip) this.drawLip(tt);
        else if (this.air) this.drawAir(tt);
        else {
          const mv = Math.sign(this.v) || this.face, wob = this.wob > 0 ? Math.sin(tt * 34) * .16 * (this.wob / .7) : 0;
          ctx.save(); ctx.translate(p.x, HPY - p.h); ctx.rotate(p.ang + wob);
          vSprite('ia_sk', 'chao', 0, { x: 0, y: 1 }, mv * this.stance < 0 ? -1 : 1, this.wob > 0 ? 3 : 0, { lx: 0, ly: 0 }, false, tt);
          if (this.braking && Math.abs(this.v) > 30) { ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let k = 0; k < 4; k++) ctx.fillRect(-mv * (14 + k * 4), -1 - (k % 2), 2, .8); }
          ctx.restore();
        }
      }
      ctx.restore();
      // o IAmiguinho também pega um pouco da cor da luz (de leve, sem perder o contorno)
      ctx.save(); ctx.translate(0, Math.round(cam * 2) / 2); skTint(null, .22); ctx.restore();
    };
  }
