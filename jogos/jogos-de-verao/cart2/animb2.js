  /* ============================================================ Amiguinho: pranchas aprovadas (parado, espera, corrida)
     Os movimentos que ainda não têm prancha usam o desenho antigo da bolha. Cor do adversário trocada no desenho. */
  const MB = window.MVB, MBI = {}, MBK = {}, MBT = {};
  if (MB) for (const [nm, a] of Object.entries(MB.a)) { MBI[nm] = new Image(); MBI[nm].src = a.src; MBK[nm] = new Image(); MBK[nm].src = a.mask; }
  const MVBOK = () => !!MB && Object.keys(MBI).every((n) => MBI[n].complete && MBI[n].naturalWidth > 0 && MBK[n].complete && MBK[n].naturalWidth > 0);
  const SB5 = 34.8 / 152; // mesma altura da bolha antiga na quadra
  function tintImg(nm, col) {
    const key = nm + col; if (MBT[key]) return MBT[key];
    const im = MBI[nm], c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const T = hsv(...hexRGB(col));
    if (Math.abs(T[0] - PINK[0]) > 2 || Math.abs(T[1] - PINK[1]) > .03) {
      const d = g.getImageData(0, 0, c.width, c.height), px = d.data, ks = T[1] / PINK[1], kv = T[2] / PINK[2];
      for (let q = 0; q < px.length; q += 4) {
        if (!px[q + 3]) continue;
        const [h, s, v] = hsv(px[q], px[q + 1], px[q + 2]);
        if (s < .18 || (h > 40 && h < 270)) continue;
        const nh = ((T[0] + (h - PINK[0]) * .6) % 360 + 360) % 360, [r, gg, b] = rgbOf(nh, clamp(s * ks, 0, 1), clamp(v * (.55 + .45 * kv), 0, 1));
        px[q] = r; px[q + 1] = gg; px[q + 2] = b;
      }
      g.putImageData(d, 0, 0);
    }
    return (MBT[key] = c);
  }
  let BCOL = '#e86fa8';
  let LOOKB = [0, 0]; // para onde o rosto olha dentro do visor (-1 a 1), definido a cada quadro
  let FB = null; // tela temporária para o rosto
  (window.__fr = window.__fr || {})['bl'] = frameB5; // usado só pelos testes de rosto
  function frameB5(an, k, mode, ex, mirror) {
    const A = MB.a[an], n = A.f.length, f = A.f[clamp(k | 0, 0, n - 1)];
    const ay = mode === 'a' && f.s ? (f.s[1] + f.s[3]) / 2 + MB.scrh : f.ay;
    ctx.save(); ctx.scale(SB5 * (mirror ? -1 : 1), SB5);
    ctx.drawImage(tintImg(an, BCOL), f.x, 0, f.w, f.h, -f.ax, -ay, f.w, f.h);
    // rosto: desenhado numa tela à parte e recortado pela máscara da tela escura do quadro
    if (f.s && f.sz) {
      if (!FB) { FB = document.createElement('canvas'); }
      const w = Math.ceil(f.w), h = Math.ceil(f.h);
      if (FB.width < w || FB.height < h) { FB.width = Math.max(FB.width, w); FB.height = Math.max(FB.height, h); }
      const g = FB.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, FB.width, FB.height);
      // rosto no centro da tela visível, girado e achatado conforme a elipse da tela em cada quadro
      const front = A.front || (an === 'turn' && k >= 2 && k <= 4), cx = f.s[4] ?? (f.s[0] + f.s[2]) / 2, cy = f.s[5] ?? (f.s[1] + f.s[3]) / 2;
      const L1 = f.s[6] || f.sz[0], L2 = f.s[7] || f.sz[1], fk = L2 / 14, fkx = clamp(.62 * L1 / (11.6 * fk), .5, 1.3);
      // o rosto gira junto com a tela (inclinação medida em cada quadro)
      const save = ctx; ctx = g; try { g.save(); g.translate(cx, cy); g.rotate(f.r || 0); glowFace(ex, LOOKB[0] * L1 * .12, L2 * .03 + LOOKB[1] * L2 * .13, fk, fkx); g.restore(); } finally { ctx = save; }
      g.globalCompositeOperation = 'destination-in'; g.drawImage(MBK[an], f.x, 0, f.w, f.h, 0, 0, f.w, f.h); g.globalCompositeOperation = 'source-over';
      ctx.drawImage(FB, 0, 0, f.w, f.h, -f.ax, -ay, f.w, f.h);
    }
    ctx.restore();
  }
  function drawBlob5(v, p, i, tt, base) {
    BCOL = blobCols(v, i).O; const s = stOf('bl5' + i), dt = clamp(tt - (s.tt ?? tt), 0, .05); s.tt = tt;
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
    let an = 'idle', k = 0, mode = p.g ? 'g' : 'a', mir = face !== sf ? sf > 0 : sf < 0, y = p.y, x = p.x;
    if ((an0 === 'comemora' || an0 === 'triste') && !p.g) { an = 'jump'; k = p.vy < 0 ? 4 + Math.floor(clamp((p.vy + PJUMP) / PJUMP, 0, .999) * 8) : 12 + Math.min(3, Math.floor(p.vy / 90)); }
    else if (an0 === 'comemora') { an = 'party'; k = Math.floor(tt * 10) % 16; mir = false; }
    else if (an0 === 'triste') { an = 'sad'; const q = (v.st || 0) * 9; k = q < 8 ? Math.floor(q) : 8 + Math.floor(tt * 6) % 8; mir = false; }
    else if (p.spec) { an = 'spec'; k = Math.floor(tt * 12) % 8; }
    else if (p.dv) {
      const d = p.dv; an = 'dive'; mir = d.dir < 0; mode = 'g'; y = VGY;
      if (d.rest !== undefined) k = 24 + Math.min(5, Math.floor((d.t - d.rest) / .3 * 6));
      else if (!p.g) k = d.t < .1 ? 3 + Math.floor(d.t / .1 * 5) : 8 + clamp(Math.floor((p.vy + 80) / 160 * 4), 0, 3);
      else { const tg = s.dg = (s.dg ?? 0) + dt; k = tg < .14 ? 12 + Math.floor(tg / .14 * 4) : 16 + clamp(Math.floor((1 - sp / 150) * 8), 0, 7); }
      if (p.g === false) s.dg = 0;
    } else if (s.gu < .3 && p.g && sp < 40) { an = 'dive'; k = 27 + Math.min(2, Math.floor(s.gu / .3 * 3)); }
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
    else if (sp > 8) {
      const backw = p.vx * face < 0;
      if (backw) { an = 'back'; k = Math.floor((((p.ph || 0) / TAU) % 1 + 1) % 1 * 8) % 8; }
      else if (acc > 200 && sp < 100) { an = 'ss'; k = Math.min(3, Math.floor(sp / 100 * 4)); }
      else if (acc < -200 && sp < 110) { an = 'ss'; k = 4 + Math.min(3, Math.floor((1 - sp / 110) * 4)); }
      else { an = 'run'; k = Math.floor((((p.ph || 0) / (2 * TAU)) % 1 + 1) % 1 * 16) % 16; }
    } else if (v.state === 'rally') { an = 'ready'; k = Math.floor(tt * 8) % 8; }
    else { an = 'idle'; k = Math.floor(tt * 8) % 16; }
    if (an === 'turn' || an === 'party' || an === 'sad') { /* espelho já decidido */ }
    s.last = an; if (an === 'serve') s.sk = k;
    // armando no chão e andando: por enquanto o desenho armado quica no ritmo do passo (até chegarem as pranchas próprias)
    if (an === 'gnd' && p.ch && p.g && sp > 8) { const ph = p.ph || 0; y -= Math.abs(Math.sin(ph)) * 1.6; k = 2 + (Math.floor(ph / Math.PI) % 3); }
    ctx.save(); ctx.setTransform(base.multiply(new DOMMatrix().translate(x, y)));
    { // olha para a bola durante o rali (o rosto anda dentro do visor, suave)
      const b = v.b, live = (v.state === 'rally' || v.state === 'serve') && !['party', 'sad', 'dive', 'turn'].includes(an);
      let lx = 0, ly = 0;
      if (live) { const hx = p.x, hy = y - 42 * CHAR_K, dx = b.x - hx, dy = b.y - hy, d = Math.hypot(dx, dy) || 1, k2 = clamp(d / 60, 0, 1); lx = dx / d * k2 * (mir ? -1 : 1); ly = clamp(dy / d * k2, -1, .6); }
      s.lk = s.lk || [0, 0]; const a = Math.min(1, dt * 10); s.lk[0] += (lx - s.lk[0]) * a; s.lk[1] += (ly - s.lk[1]) * a; LOOKB = s.lk;
    }
    frameB5(an, k, mode, P.ex, mir);
    ctx.restore();
  }
  // bola segura no saque: em cima da palma aberta do desenho
  function heldB5(p, f) {
    const v = volei, A = MB.a.serve, fr = A.f[clamp(stOf('bl51').sk ?? (v.charging ? 9 : 0), 0, 15)], hd = fr.hd || [fr.w * .9, fr.h * .5];
    return { x: p.x + f * (hd[0] - fr.ax) * SB5, y: p.y + (hd[1] - fr.ay) * SB5 - VRB + 1 };
  }
