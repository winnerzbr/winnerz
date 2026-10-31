  /* ============================================================ IAmiguinho: moveset completo (pranchas aprovadas)
     Cada animação é uma sequência de desenhos inteiros. O quadro mostrado sai do estado da física:
     fase do passo, subida e descida do pulo, progresso do golpe (com o quadro de contato marcado),
     tempo do saque, deslize do peixinho. O rosto aceso é desenhado só dentro da tela escura de cada quadro. */
  const M5 = window.MV5, M5I = {}, M5K = {};
  if (M5) for (const [nm, a] of Object.entries(M5.a)) { M5I[nm] = new Image(); M5I[nm].src = a.src; M5K[nm] = new Image(); M5K[nm].src = a.mask; if (a.msrc) { M5I[nm + '~m'] = new Image(); M5I[nm + '~m'].src = a.msrc; M5K[nm + '~m'] = new Image(); M5K[nm + '~m'].src = a.mmask; } }
  const MV5OK = () => !!M5 && Object.keys(M5I).every((n) => M5I[n].complete && M5I[n].naturalWidth > 0 && M5K[n].complete && M5K[n].naturalWidth > 0);
  const S5 = 56 / 325 / (M5 ? M5.q : .5); // unidades do mundo por pixel guardado (em pé: ~56 unidades)
  // quadros de contato (índice na sequência) e trechos de cada movimento
  const C5 = { set: 7, bump: 7, spike: 10, gnd: 8, serveHit: 27 };
  let LOOK = [0, 0]; // para onde o rosto olha dentro do visor (-1 a 1), definido a cada quadro
  let FT = null; // tela temporária para o rosto
  (window.__fr = window.__fr || {})['ia'] = frame5; // usado só pelos testes de rosto
  // quadros do meio: quando a animação avança um quadro, mostra primeiro o desenho intermediário (feito na montagem)
  // durante metade do tempo do quadro. O movimento fica com o dobro de desenhos e para de tremer.
  function midK(s, an, k, tt, A) {
    const m = s.mk || (s.mk = { an: '', k: -1, t: 0, d: .125, from: -1 }), n = A.f.length;
    if (an !== m.an) { m.an = an; m.k = k; m.t = tt; m.from = -1; }
    else if (k !== m.k) { const fwd = ((k - m.k) % n + n) % n === 1; if (fwd) { m.d = clamp(tt - m.t, .03, .3); m.from = m.k; } else m.from = -1; m.t = tt; m.k = k; }
    return m.from >= 0 && A.m && A.m[m.from] && tt - m.t < m.d * .5 ? m.from + .5 : k;
  }
  function frame5(an, k, mode, ex, mirror) {
    const A = M5.a[an], n = A.f.length, half = k % 1 !== 0 && A.m && A.m[k | 0], key = half ? an + '~m' : an, f = half || A.f[clamp(k | 0, 0, n - 1)];
    const ay = mode === 'a' && f.s ? (f.s[1] + f.s[3]) / 2 + M5.scrh : f.ay;
    ctx.save(); ctx.scale(S5 * (mirror ? -1 : 1), S5);
    ctx.drawImage(M5I[key], f.x, 0, f.w, f.h, -f.ax, -ay, f.w, f.h);
    // rosto: desenhado numa tela à parte e recortado pela máscara da tela escura do quadro
    if (f.s && f.sz) {
      if (!FT) { FT = document.createElement('canvas'); }
      const w = Math.ceil(f.w), h = Math.ceil(f.h);
      if (FT.width < w || FT.height < h) { FT.width = Math.max(FT.width, w); FT.height = Math.max(FT.height, h); }
      const g = FT.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, FT.width, FT.height);
      // rosto no centro da tela visível, girado e achatado conforme a elipse da tela em cada quadro
      const front = A.front || (an === 'turn' && k >= 2 && k <= 4), cx = f.s[4] ?? (f.s[0] + f.s[2]) / 2, cy = f.s[5] ?? (f.s[1] + f.s[3]) / 2;
      const L1 = f.s[6] || f.sz[0], L2 = f.s[7] || f.sz[1], fk = L2 / 14.5, fkx = clamp(.62 * L1 / (11.6 * fk), .5, 1.3);
      // o rosto gira junto com a tela (inclinação medida em cada quadro)
      const save = ctx; ctx = g; try { g.save(); g.translate(cx, cy); g.rotate(f.r || 0); glowFace(ex, LOOK[0] * L1 * .12, L2 * .03 + LOOK[1] * L2 * .13, fk, fkx); g.restore(); } finally { ctx = save; }
      g.globalCompositeOperation = 'destination-in'; g.drawImage(M5K[key], f.x, 0, f.w, f.h, 0, 0, f.w, f.h); g.globalCompositeOperation = 'source-over';
      ctx.drawImage(FT, 0, 0, f.w, f.h, -f.ax, -ay, f.w, f.h);
    }
    ctx.restore();
  }
  // tempo até a bola chegar à cabeça (para começar o toque/manchete antes do contato)
  function eta5(v, p) {
    const b = v.b, hx = p.x, hy = p.y - 40 * CHAR_K, dx = b.x - hx, dy = b.y - hy, d = Math.hypot(dx, dy);
    const cl = -(dx * b.vx + dy * b.vy) / Math.max(1, d); // velocidade de aproximação
    if (v.state !== 'rally' || cl <= 30) return 9;
    return Math.max(0, d - VRB - 10) / cl;
  }
  // estado de locomoção com folga: velocidade suavizada, e cada estado fica pelo menos um instante
  function locoOf5(s, p, face, dt) {
    s.fvx = s.fvx ?? p.vx; s.fvx += (p.vx - s.fvx) * Math.min(1, dt * 9);
    const fs = Math.abs(s.fvx), fa = (fs - (s.fsp ?? fs)) / Math.max(dt, .001); s.fsp = fs;
    s.fac = (s.fac ?? 0) + (fa - (s.fac ?? 0)) * Math.min(1, dt * 8);
    const moving = s.L && s.L !== 'stand' ? fs > 6 && Math.abs(p.vx) > 2 : fs > 20; // parou de verdade: já começa a frear
    let c = 'stand';
    if (moving) c = s.fvx * face < -12 || (s.L === 'back' && s.fvx * face < 0) ? 'back' : s.fac > 260 && fs < 95 ? 'ssA' : s.fac < -260 && fs < 105 && s.L !== 'stand' ? 'ssD' : 'run';
    // sair do parado para a corrida passa pelo arrancar; da corrida para o parado, pelo frear (desenhos feitos para isso)
    if (s.L === 'stand' && c === 'run') c = 'ssA';
    if ((s.L === 'run' || s.L === 'ssA') && c === 'stand') c = 'ssD';
    s.Lt = (s.Lt ?? 9) + dt;
    const hold = c === 'ssD' && s.L === 'run' ? 0 : s.L === 'ssA' ? (c === 'ssD' ? .1 : .22) : s.L === 'ssD' ? .26 : s.L === 'stand' ? .05 : .16; // parar é na hora // sair do parado é rápido (senão desliza parado)
    if (!s.L || (c !== s.L && s.Lt >= hold)) { s.L = c; s.Lt = 0; }
    return s.L;
  }
  function drawIA5(v, p, i, tt, base) {
    const s = stOf('ia5' + i), dt = clamp(tt - (s.tt ?? tt), 0, .05); s.tt = tt;
    const P = poseOf(v, p, i, tt, s, dt), an0 = P.anim, sf = i ? -1 : 1;
    // relógios próprios: pouso, fim do golpe, levantar do peixinho, virada
    if (s.air && p.g && !p.dv) s.lt = 0; s.air = !p.g; s.lt = (s.lt ?? 9) + dt;
    if (s.sw && !p.sw) { if (s.swg) s.rt = 0; else s.at = 0; } s.sw = !!p.sw; s.swg = p.sw ? p.sw.gnd : s.swg; s.srv = p.sw ? s.srv : s.srv;
    s.rt = (s.rt ?? 9) + dt; s.at = (s.at ?? 9) + dt;
    if (s.dv && !p.dv) s.gu = 0; s.dv = !!p.dv; s.gu = (s.gu ?? 9) + dt;
    if (p.sw && p.sw.hit && s.hitT0 === undefined) s.hitT0 = 0; if (!p.sw) s.hitT0 = undefined; else if (s.hitT0 !== undefined) s.hitT0 += dt;
    if (p.hitA > 0 && !s.ha) s.hk = v.b.y < p.y - 36 * CHAR_K ? 'set' : 'bump'; s.ha = p.hitA > 0;
    const face = P.face; if (s.face === undefined) s.face = face;
    if (face !== s.face) { if (p.g && !p.dv) { s.tn = 0; s.tnTo = face; } s.face = face; } s.tn = (s.tn ?? 9) + dt;
    const sp = Math.abs(p.vx), acc = (sp - (s.sp ?? sp)) / Math.max(dt, .001); s.sp = sp;
    const LOC = locoOf5(s, p, face, dt);
    let an = 'idle', k = 0, mode = p.g ? 'g' : 'a', mir = face !== sf ? sf > 0 : sf < 0, y = p.y, x = p.x;
    if ((an0 === 'comemora' || an0 === 'triste') && !p.g) { an = 'jump'; k = p.vy < 0 ? 4 + Math.floor(clamp((p.vy + PJUMP) / PJUMP, 0, .999) * 8) : 12 + Math.min(3, Math.floor(p.vy / 90)); }
    else if (an0 === 'comemora') { an = 'party'; k = Math.floor(tt * 10) % 16; mir = false; }
    else if (an0 === 'triste') { an = 'sad'; const q = (v.st || 0) * 9; k = q < 8 ? Math.floor(q) : 8 + Math.floor(tt * 6) % 8; mir = false; }
    else if (p.spec) { an = 'spec'; k = Math.floor(tt * 12) % 8; }
    else if (p.dv) {
      const d = p.dv; an = 'dive'; mir = d.dir < 0; mode = 'g'; y = VGY;
      if (d.rest !== undefined) k = 24 + Math.min(3, Math.floor((d.t - d.rest) / DIVE.rest * 4)); // levantar: deitado até ajoelhado
      else if (!p.g) k = d.t < .1 ? 3 + Math.floor(d.t / .1 * 5) : 8 + clamp(Math.floor((p.vy + 80) / 160 * 4), 0, 3);
      else { const tg = s.dg = (s.dg ?? 0) + dt; k = tg < .14 ? 12 + Math.floor(tg / .14 * 4) : 16 + clamp(Math.floor((1 - sp / 150) * 8), 0, 7); }
      if (p.g === false) s.dg = 0;
    } else if (s.gu < .3 && p.g && sp < 40) { an = 'dive'; k = 28 + Math.min(3, Math.floor(s.gu / .3 * 4)); } // levantar: de joelhos até em pé
    else if ((an0 === 'saque' || (v.state === 'rally' && v.hits === 0 && (v.tossT ?? 9) < .42 && p.g && !p.ch && !p.sw)) && v.server === i) {
      an = 'serve';
      if (v.held) k = v.charging ? 8 + Math.min(7, Math.floor(clamp((v.charge || 0) / SERVE.max, 0, 1) * 6) + (Math.floor(tt * 14) % 2)) : Math.floor(tt * 8) % 8;
      else { const q = v.tossT ?? 0; k = q < .2 ? 16 + Math.min(3, Math.floor(q / .2 * 4)) : 19 - Math.min(3, Math.floor((q - .2) / .22 * 4)); } // lança (braço sobe) e o braço volta; depois, espera
    } else if (p.ch) {
      // armando o braço (segurando o botão)
      const q = clamp(p.ch.t / SPK.chMax, 0, 1);
      if (p.g) { const srv = v.hits === 0 && v.server === i && v.state === 'rally'; an = srv ? 'serve' : 'gnd'; k = srv ? 21 + Math.min(2, Math.floor(q * 3)) : 2 + Math.min(2, Math.floor(q * 3)); s.srv = srv; }
      else { an = 'spike'; k = 2 + Math.min(3, Math.floor(q * 4)); }
    } else if (p.sw) {
      const T = swingT(p.sw.gnd, p.sw.pow), q = clamp(p.sw.t / T, 0, .999);
      if (p.sw.gnd) {
        const srv = s.srv && v.hits <= 1; an = srv ? 'serve' : 'gnd';
        const c = srv ? C5.serveHit : C5.gnd, a0 = srv ? 23 : 5;
        if (s.hitT0 !== undefined) k = c + Math.floor(s.hitT0 / .04);
        else k = q < .5 ? a0 + Math.floor(q / .5 * (c - a0)) : c + Math.floor((q - .5) / .5 * 4);
        k = Math.min(k, srv ? 39 : 15);
      } else {
        an = 'spike';
        if (s.hitT0 !== undefined) k = C5.spike + Math.floor(s.hitT0 / .035);
        else k = q < .45 ? 6 + Math.floor(q / .45 * (C5.spike - 6)) : C5.spike + Math.floor((q - .45) / .55 * 3);
        k = Math.min(k, 23);
      }
    } else if (p.hitA > 0 || (p.g && eta5(v, p) < .2 && (i ? v.b.x > VNX : v.b.x < VNX))) {
      // toque / manchete: a preparação começa antes da bola chegar; o quadro de contato bate com o toque
      if (p.hitA > 0) { an = s.hk || 'set'; k = C5[an] + Math.floor((.32 - p.hitA) / .32 * 8.99); }
      else { const e = eta5(v, p); an = v.b.y < p.y - 36 * CHAR_K ? 'set' : 'bump'; k = 2 + Math.floor((1 - e / .2) * 5); }
      k = Math.min(k, 15);
    } else if (!p.g) {
      if (s.at < .6) { an = 'spike'; k = 16 + Math.min(7, Math.floor(s.at / .6 * 8)); }
      else { an = 'jump'; k = p.vy < 0 ? 4 + Math.floor(clamp((p.vy + PJUMP) / PJUMP, 0, .999) * 8) : 12 + Math.min(3, Math.floor(p.vy / 90)); }
    } else if (s.tn < .3) { an = 'turn'; const q = Math.min(7, Math.floor(s.tn / .3 * 8)); k = s.tnTo === sf ? 7 - q : q; mir = sf < 0; }
    else if (s.lt < .3 && sp < 60) { an = 'jump'; k = 16 + Math.min(7, Math.floor(s.lt / .3 * 8)); }
    else if (s.rt < .3 && sp < 60) { an = s.srv ? 'serve' : 'gnd'; k = s.srv ? 32 + Math.min(7, Math.floor(s.rt / .3 * 8)) : 12 + Math.min(3, Math.floor(s.rt / .3 * 4)); }
    else if (LOC !== 'stand') {
      // andar, arrancar, frear e recuar: decididos pela velocidade suavizada e mantidos por um instante mínimo
      // (antes, pequenas correções de posição trocavam de desenho a cada quadro e ele parecia tremer)
      const L = s.L, fs = Math.abs(s.fvx);
      if (L === 'back') { an = 'back'; k = Math.floor((((p.ph || 0) / TAU) % 1 + 1) % 1 * 8) % 8; }
      else if (L === 'ssA') { an = 'ss'; k = Math.min(3, Math.floor(clamp(s.Lt / .22, 0, .999) * 4)); }
      else if (L === 'ssD') { an = 'ss'; k = 4 + Math.min(3, Math.floor(clamp(s.Lt / .26, 0, .999) * 4)); }
      else { an = 'run'; k = Math.floor((((p.ph || 0) / (2 * TAU)) % 1 + 1) % 1 * 16) % 16; }
      void fs;
    } else if (v.state === 'rally') {
      // espera olhando para a bola: a cabeça sobe ou desce conforme a altura da bola (com folga para não ficar trocando)
      an = 'ready'; k = Math.floor(tt * 8) % 8;
      if (M5.a.readyU && M5.a.readyD) {
        const b = v.b, dx = b.x - p.x, dy = b.y - (p.y - 42 * CHAR_K), d = Math.hypot(dx, dy) || 1, el = -dy / d;
        const was = s.rv || 0, up = el > (was === 1 ? .45 : .6), down = dy > 0 && el < (was === -1 ? -.25 : -.4) && d < 150;
        s.rv = up ? 1 : down ? -1 : (was === 1 && el > .3) || (was === -1 && el < -.1) ? was : 0;
        // a cabeça sobe e desce aos poucos: passa pelos dois desenhos do meio (1/3 e 2/3) em vez de pular direto
        s.lv = s.lv ?? 0; s.lv += clamp(s.rv - s.lv, -dt * 4.5, dt * 4.5);
        const q = Math.round(Math.abs(s.lv) * 3), dirn = s.lv > 0 ? 'readyU' : 'readyD';
        if (q >= 3) an = dirn; else if (q > 0 && M5.a[dirn + '_' + q]) an = dirn + '_' + q;
      }
    }
    else { an = 'idle'; k = Math.floor(tt * 8) % 16; }
    if (!/^ready/.test(an)) s.lv = 0;
    if (an === 'turn' || an === 'party' || an === 'sad') { /* espelho já decidido */ }
    s.last = an; if (an === 'serve') s.sk = k;
    // armando no chão e andando: pranchas próprias (para a frente: quadros 0-7; para trás: 8-15)
    if (an === 'gnd' && p.ch && p.g && sp > 8) { const backw = p.vx * face < 0; an = 'gndw'; k = (backw ? 8 : 0) + Math.floor((((p.ph || 0) / TAU) % 1 + 1) % 1 * 8) % 8; }
    ctx.save(); ctx.setTransform(base.multiply(new DOMMatrix().translate(x, y)));
    { // olha para a bola durante o rali (o rosto anda dentro do visor, suave)
      const b = v.b, live = (v.state === 'rally' || v.state === 'serve') && !['party', 'sad', 'dive', 'turn'].includes(an);
      let lx = 0, ly = 0;
      if (live) { const hx = p.x, hy = y - 42 * CHAR_K, dx = b.x - hx, dy = b.y - hy, d = Math.hypot(dx, dy) || 1, k2 = clamp(d / 60, 0, 1); lx = dx / d * k2 * (mir ? -1 : 1); ly = clamp(dy / d * k2, -1, .6) * (/^ready[UD]/.test(an) ? .35 : 1); }
      s.lk = s.lk || [0, 0]; const a = Math.min(1, dt * 10); s.lk[0] += (lx - s.lk[0]) * a; s.lk[1] += (ly - s.lk[1]) * a; LOOK = s.lk;
    }
    frame5(an, midK(s, an, k, tt, M5.a[an]), mode, P.ex, mir);
    ctx.restore();
  }
  // bola segura no saque: em cima da palma aberta do desenho
  function held5(p, f) {
    const v = volei, A = M5.a.serve, fr = A.f[clamp(stOf('ia50').sk ?? (v.charging ? 9 : 0), 0, 15)], hd = fr.hd || [fr.w * .9, fr.h * .5];
    return { x: p.x + f * (hd[0] - fr.ax) * S5, y: p.y + (hd[1] - fr.ay) * S5 - VRB + 1 };
  }
