  /* ============================================================ ARTE PINTADA (teste com as imagens geradas)
     Cada peça é uma imagem. Braços e pernas não giram duros: cada um é cortado em fatias finas que seguem
     uma curva (mangueira de borracha). O meio da peça estica e afina; as bolinhas das juntas ficam redondas.
     Unidades: 8 pixels guardados por unidade do mundo (C2 em assets.js). */
  const PXU = 8, IMG = {}, DARK = {};
  const C2 = window.C2 || {};
  const ready = (...ns) => ns.every((n) => { const a = C2[n]; if (!a) return false; if (!IMG[n]) { IMG[n] = new Image(); IMG[n].src = a.src; } return IMG[n].complete && IMG[n].naturalWidth > 0; });
  Object.keys(C2).forEach((n) => ready(n));
  const IA_P = ['braco', 'antebraco', 'coxa', 'canela', 'tronco', 'cabeca', 'cabeca_f', 'bone', 'bone_f', 'helice', 'mao', 'punho', 'aponta', 'sapato', 'sapato_f'];
  const BL_P = ['b_frente', 'b_34', 'b_lado', 'b_amassa', 'b_pulo', 'b_mao'];
  // versão escurecida (lado de trás do corpo)
  function dark(n) {
    if (DARK[n]) return DARK[n];
    const a = C2[n], c = document.createElement('canvas'); c.width = a.w; c.height = a.h; const g = c.getContext('2d');
    g.drawImage(IMG[n], 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(46,24,96,.30)'; g.fillRect(0, 0, a.w, a.h);
    return (DARK[n] = c);
  }
  // cor do time: gira o matiz do rosa original para a cor do adversário (feito uma vez por cor)
  const TINT = {};
  const hsv = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx / 255]; };
  const rgbOf = (h, s, v) => { const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c; let r, g, b; if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x]; return [(r + m) * 255, (g + m) * 255, (b + m) * 255]; };
  const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const PINK = hsv(...hexRGB('#e86fa8'));
  function tinted(n, col) {
    const key = n + col; if (TINT[key]) return TINT[key];
    const a = C2[n], c = document.createElement('canvas'); c.width = a.w; c.height = a.h; const g = c.getContext('2d'); g.drawImage(IMG[n], 0, 0);
    const T = hsv(...hexRGB(col));
    if (Math.abs(T[0] - PINK[0]) > 2 || Math.abs(T[1] - PINK[1]) > .03) {
      const d = g.getImageData(0, 0, a.w, a.h), px = d.data, ks = T[1] / PINK[1], kv = T[2] / PINK[2];
      for (let q = 0; q < px.length; q += 4) {
        if (!px[q + 3]) continue;
        const [h, s, v] = hsv(px[q], px[q + 1], px[q + 2]);
        if (s < .18 || (h > 40 && h < 270)) continue; // o visor azul-marinho e o contorno ficam
        const nh = ((T[0] + (h - PINK[0]) * .6) % 360 + 360) % 360, [r, gg, b] = rgbOf(nh, clamp(s * ks, 0, 1), clamp(v * (.55 + .45 * kv), 0, 1));
        px[q] = r; px[q + 1] = gg; px[q + 2] = b;
      }
      g.putImageData(d, 0, 0);
    }
    return (TINT[key] = c);
  }
  const norm = (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
  // peça rígida: o ponto 'pt' (pixels da imagem) vai para (x, y), girada por 'rot', escala sx/sy
  function piece(n, pt, x, y, rot = 0, sx = 1, sy = 1, im = IMG[n]) {
    const a = C2[n]; ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(sx / PXU, sy / PXU);
    ctx.drawImage(im, -pt[0], -pt[1], a.w, a.h); ctx.restore();
  }
  // peça mole: a imagem deitada (junta A → junta B) segue a curva P0 → Q → P1 (bezier quadrática)
  function hose(n, P0, Q, P1, wk = 1, im = IMG[n]) {
    const a = C2[n], ax = a.a[0], bx = a.b[0], cy = a.a[1], N = 18, pts = [], acc = [0];
    for (let k = 0; k <= N; k++) {
      const t = k / N, u = 1 - t; pts.push([u * u * P0[0] + 2 * u * t * Q[0] + t * t * P1[0], u * u * P0[1] + 2 * u * t * Q[1] + t * t * P1[1]]);
      if (k) acc.push(acc[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    }
    const Lc = acc[N], rest = (bx - ax) / PXU, ra = Math.min(a.ra / PXU, rest * .4), rb = Math.min(a.rb / PXU, rest * .4);
    const k = Math.max(.15, Lc - ra - rb) / Math.max(.15, rest - ra - rb); // quanto o meio esticou
    const map = (x) => { const u = (x - ax) / PXU; return u <= ra ? u * Math.min(1, Lc / rest) : u >= rest - rb ? Lc - (rest - u) * Math.min(1, Lc / rest) : ra * Math.min(1, Lc / rest) + (u - ra) * k; };
    const at = (d) => {
      if (d <= 0) { const t = norm(sub(pts[1], pts[0])); return [pts[0][0] + t[0] * d, pts[0][1] + t[1] * d, t]; }
      if (d >= Lc) { const t = norm(sub(pts[N], pts[N - 1])); return [pts[N][0] + t[0] * (d - Lc), pts[N][1] + t[1] * (d - Lc), t]; }
      let i = 1; while (acc[i] < d) i++;
      const f = (d - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1), t = norm(sub(pts[i], pts[i - 1]));
      return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f), t];
    };
    const thin = clamp(1 / Math.sqrt(k), .86, 1.12) * wk, S = 14;
    for (let q = 0; q < S; q++) {
      const u0 = a.w * q / S, u1 = a.w * (q + 1) / S, d0 = map(u0), d1 = map(u1), m = at((d0 + d1) / 2), t = m[2];
      const um = ((u0 + u1) / 2 - ax) / PXU, inMid = clamp(Math.min(um - ra * .5, rest - rb * .5 - um) / Math.max(.5, ra * .5), 0, 1);
      const ws = lerp(wk, thin, inMid), len = Math.abs(d1 - d0);
      ctx.save(); ctx.transform(t[0], t[1], -t[1], t[0], m[0], m[1]);
      ctx.drawImage(im, u0, 0, u1 - u0, a.h, -len / 2 - .07, -cy / PXU * ws, len + .14, a.h / PXU * ws);
      ctx.restore();
    }
    return at(Lc)[2]; // direção na ponta (para a mão / o pé)
  }
  // a curva que passa pelas três juntas (ombro, cotovelo, mão), dividida em duas no cotovelo
  // junta que só dobra para um lado (cotovelo e joelho nunca dobram ao contrário).
  // Olhando para a direita: cotovelo sg = -1 (o antebraço dobra para a frente/para cima), joelho sg = +1 (a canela dobra para trás).
  const crs = (a, b) => a[0] * b[1] - a[1] * b[0];
  function ik2(S, T, L1, L2, sg) {
    const d = sub(T, S), dl = len2(d) || .001, u = [d[0] / dl, d[1] / dl];
    let n = [-u[1], u[0]]; if (crs(n, d) * sg < 0) n = [-n[0], -n[1]]; // lado natural da dobra
    // cross((M + n·h) - S, T - (M + n·h)) = h·cross(n, d) → mesmo sinal de sg
    if (dl >= L1 + L2 - .01) { const over = dl - L1 - L2, M = [S[0] + d[0] * L1 / (L1 + L2), S[1] + d[1] * L1 / (L1 + L2)]; return [M[0] + n[0] * over * .26, M[1] + n[1] * over * .26]; }
    const a = clamp((L1 * L1 + dl * dl - L2 * L2) / (2 * dl), -L1, L1), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    return [S[0] + u[0] * a + n[0] * h, S[1] + u[1] * a + n[1] * h];
  }
  // a curva que passa pelas três juntas (ombro, cotovelo, mão), dividida em duas no cotovelo; nunca entorta para o lado errado
  function chain(S, E, H, sp, dt, sg, mx = 2) {
    const d = sub(H, S);
    let Q = [2 * E[0] - (S[0] + H[0]) / 2, 2 * E[1] - (S[1] + H[1]) / 2];
    if (sp) { // mola: a curva atrasa um pouco e chicoteia nos movimentos rápidos
      if (!sp.q) { sp.q = Q.slice(); sp.v = [0, 0]; }
      for (const c of [0, 1]) { sp.v[c] += ((Q[c] - sp.q[c]) * 520 - sp.v[c] * 26) * dt; sp.q[c] += sp.v[c] * dt; }
      const lag = sub(sp.q, Q), l = Math.hypot(lag[0], lag[1]);
      Q = l > mx ? [Q[0] + lag[0] / l * mx, Q[1] + lag[1] / l * mx] : sp.q.slice();
    }
    // se a curva passou para o lado errado da linha ombro→mão, volta para a reta
    const dl = len2(d) || .001, n = [-d[1] / dl, d[0] / dl], mid = [(S[0] + H[0]) / 2, (S[1] + H[1]) / 2];
    const side = crs(n, d) * sg > 0 ? 1 : -1, b = ((Q[0] - mid[0]) * n[0] + (Q[1] - mid[1]) * n[1]) * side;
    if (b < 0) Q = [Q[0] - n[0] * side * b, Q[1] - n[1] * side * b];
    const A1 = [(S[0] + Q[0]) / 2, (S[1] + Q[1]) / 2], B1 = [(Q[0] + H[0]) / 2, (Q[1] + H[1]) / 2], M = [(A1[0] + B1[0]) / 2, (A1[1] + B1[1]) / 2];
    return [[S, A1, M], [M, B1, H]];
  }

  /* ---------------------------------------------------------- IAmiguinho pintado */
  // pontos (pés no 0, olhando para a direita): tornozelo -6.6 · quadril (0,-14.8) · ombro (.2,-21.6) · pescoço -24.1
  const HIP = [0, -14.8], SHO = [.2, -21.6], LA = [3.9, 3.9], LL = [4.3, 4.3], ANK = -6.6;
  // rosto aceso na tela escura (com um brilho em volta)
  function glowFace(ex, x, y, k, kx) { ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.shadowColor = 'rgba(95,244,255,.9)'; ctx.shadowBlur = 7; faceExpr(ex, 0, 0, kx, '#7ff8ff'); ctx.restore(); }
  function drawIA2(v, p, i, tt, base) {
    const s = stOf('ia2' + i), dt = clamp(tt - s.tt, 0, .05); s.tt = tt;
    const P = poseOf(v, p, i, tt, s, dt);
    // virar: espelha rápido, com um achatado no meio (como nos desenhos)
    if (s.F === undefined) s.F = P.face; s.F += (P.face - s.F) * Math.min(1, dt * 14);
    const sg = Math.sign(s.F) || 1, fx = sg * Math.max(.6, Math.abs(s.F));
    // de frente para a câmera: comemorando e triste
    const front = P.anim === 'comemora' || P.anim === 'triste';
    s.pv = lerp(s.pv, P.spin, Math.min(1, dt * 4)); s.prop += s.pv * dt;
    const sq = p.sq || 0, sx = 1 - .11 * sq, sy = 1 + .15 * sq;
    const Mw = new DOMMatrix().translate(p.x + P.dx, p.y - P.lift).scale(CHAR_K * 1.3).translate(0, -18).rotate(P.rot / D).translate(0, 18).scale(sx * (front ? 1 : fx), sy);
    const Mt = Mw.translate(0, P.bob).translate(HIP[0], HIP[1]).rotate((front ? 0 : P.lean * sg) / D).translate(-HIP[0], -HIP[1]);
    const tr = C2.tronco, NECK = [HIP[0] + (tr.neck[0] - tr.hip[0]) / PXU, HIP[1] + (tr.neck[1] - tr.hip[1]) / PXU];
    const Mh = Mt.translate(0, P.headDy).translate(NECK[0], NECK[1]).rotate((front ? P.headTilt * .5 : P.headTilt * sg) / D).translate(-NECK[0], -NECK[1]);
    s.sp = s.sp || {};
    // ---- braços (lado: +1 o da câmera, -1 o de trás; de frente: direita/esquerda)
    const armOf = (A, IKT, isHit) => {
      const side = isHit ? 1 : -1;
      let S0 = front ? [side * 3.1, SHO[1] + .6] : [SHO[0] + (isHit ? .4 : -.5), SHO[1]], E, H, bend = front ? -side : -1;
      if (IKT) {
        let T;
        if (IKT === 'swing') { const H0 = swingPose(p, P.sf, p.sw.t, p.sw.gnd, p.sw.pow, p.sw.hit ? p.sw.L : v.b).pts[0]; T = toLocal(Mt, H0.x, H0.y); }
        else if (IKT === 'cock') T = [S0[0] - 6, S0[1] - 8];
        else if (IKT.L) T = front ? [side * 11.2, -33 + (IKT.L[1] + 25) * .9] : [IKT.L[0] * sg * .32, -31 + (IKT.L[1] + 25) * .9];
        else T = toLocal(Mt, IKT[0], IKT[1]);
        E = ik2(S0, T, LA[0], LA[1], bend); H = T;
      } else if (front) {
        // braços caídos do lado do corpo, cotovelo um pouco para fora
        const k = clamp(Math.sin(A.a), -.4, 1);
        E = [S0[0] + side * (.9 + Math.sin(A.b) * 2), S0[1] + LA[0] * .95]; H = [E[0] + side * (.3 + k), E[1] + LA[1] * .95];
      } else {
        const cb = Math.cos(A.b), a2 = A.a + A.e;
        E = [S0[0] + Math.sin(A.a) * cb * LA[0], S0[1] + Math.cos(A.a) * cb * LA[0]];
        H = [E[0] + Math.sin(a2) * cb * LA[1], E[1] + Math.cos(a2) * cb * LA[1]];
      }
      const hand = P.anim === 'comemora' ? (isHit ? 'aponta' : 'mao') : IKT || !['correndo', 'parado', 'triste'].includes(P.anim) ? 'mao' : 'punho';
      return { S: S0, E, H, hand, bend, side };
    };
    const drawArm = (ar, key, far) => {
      const [c1, c2] = chain(ar.S, ar.E, ar.H, s.sp[key] || (s.sp[key] = {}), dt, ar.bend, 1.8);
      hose('braco', c1[0], c1[1], c1[2], 1.3, far ? dark('braco') : IMG.braco);
      const dir = hose('antebraco', c2[0], c2[1], c2[2], 1.3, far ? dark('antebraco') : IMG.antebraco);
      const hn = ar.hand, h = C2[hn], ang = Math.atan2(dir[1], dir[0]) - h.ang;
      // mão aberta com o braço para trás: vira, para a palma não ficar de cabeça para baixo; de frente, a mão esquerda é o espelho da direita
      const flipH = hn === 'mao' ? (Math.cos(ang) < -.2 ? -1 : 1) : front && ar.side < 0 ? -1 : 1;
      piece(hn, h.wr, ar.H[0] - dir[0] * .4, ar.H[1] - dir[1] * .4, ang, hn === 'mao' ? 1 : flipH, hn === 'mao' ? flipH : 1, far ? dark(hn) : IMG[hn]);
    };
    // ---- pernas
    const legOf = (L, near) => {
      const hp = front ? [near ? 1.7 : -1.7, HIP[1]] : [HIP[0] + (near ? .4 : -.4), HIP[1]];
      const an = front ? [near ? 2.4 : -2.4, ANK - L.l * 1.1] : [L.f * 1.05 + (near ? .5 : -.5), ANK - L.l * 1.15];
      const kn = ik2(hp, an, LL[0], LL[1], front ? (near ? -1 : 1) : 1);
      return { hp, an, kn, L };
    };
    const drawLeg = (lg, key, far) => {
      const [c1, c2] = chain(lg.hp, lg.kn, lg.an, s.sp[key] || (s.sp[key] = {}), dt, front ? (key === 'ln' ? -1 : 1) : 1, .8);
      hose('coxa', c1[0], c1[1], c1[2], 1.25, far ? dark('coxa') : IMG.coxa);
      hose('canela', c2[0], c2[1], c2[2], 1.25, far ? dark('canela') : IMG.canela);
      const air = lg.an[1] < ANK - .4, rot = air && !front ? clamp(-lg.L.f * .05 + .15, -.5, .5) : 0, sn = front ? 'sapato_f' : 'sapato';
      piece(sn, C2[sn].ank, lg.an[0], lg.an[1] + .1, rot, 1, 1, far ? dark(sn) : IMG[sn]);
    };
    const near = legOf(P.legs[0], true), farL = legOf(P.legs[1], false);
    const hitA = armOf(P.hit, P.hitIK, true), offA = armOf(P.off, P.offIK, false);
    // cabeça, boné, hélice e o rosto na tela
    const drawHead = () => {
      ctx.setTransform(base.multiply(Mh));
      const hn = front ? 'cabeca_f' : 'cabeca', hc = C2[hn], hx = NECK[0] + .1, hy = NECK[1] + .9;
      piece(hn, hc.neck, hx, hy);
      const sc = [hx + (hc.scr[0] - hc.neck[0]) / PXU, hy + (hc.scr[1] - hc.neck[1]) / PXU];
      if (front) glowFace(P.ex, sc[0], sc[1] + .3, .5, 1); else glowFace(P.ex, sc[0] - .5, sc[1] + .3, .34, .62);
      const topY = hy + (hc.top[1] - hc.neck[1]) / PXU, headH = (hc.neck[1] - hc.top[1]) / PXU;
      const bn = C2[front ? 'bone_f' : 'bone'], capX = hx + (front ? 0 : .4), capY = topY + headH * .33, CK = .86;
      piece(front ? 'bone_f' : 'bone', bn.bot, capX, capY, 0, CK, CK);
      const top = [capX + (bn.top[0] - bn.bot[0]) / PXU * CK, capY + (bn.top[1] - bn.bot[1]) / PXU * CK];
      // hélice girando num plano deitado: as pás encolhem e esticam
      const pv = Math.abs(s.pv), hl = C2.helice, kx = Math.cos(s.prop);
      if (pv > 15) { ctx.save(); ctx.globalAlpha = .35; piece('helice', hl.stem, top[0], top[1] + .5, 0, 1, 1); ctx.globalAlpha = .55; piece('helice', hl.stem, top[0], top[1] + .5, 0, -.5, 1); ctx.restore(); }
      else piece('helice', hl.stem, top[0], top[1] + .5, 0, Math.abs(kx) < .12 ? .12 * Math.sign(kx || 1) : kx, 1);
    };
    ctx.save();
    if (front) {
      // de frente: pernas · tronco · braços · cabeça (as mãos lá no alto aparecem dos lados da cabeça)
      ctx.setTransform(base.multiply(Mw.translate(0, P.bob))); drawLeg(farL, 'lf', false); drawLeg(near, 'ln', false);
      ctx.setTransform(base.multiply(Mt)); piece('tronco', tr.hip, HIP[0], HIP[1]);
      drawArm(offA, 'off', false); drawArm(hitA, 'hit', false);
      drawHead();
    } else {
      // de lado: braço de trás · perna de trás · tronco · perna da frente · cabeça · braço da frente
      ctx.setTransform(base.multiply(Mt)); drawArm(offA, 'off', true);
      ctx.setTransform(base.multiply(Mw.translate(0, P.bob))); drawLeg(farL, 'lf', true);
      ctx.setTransform(base.multiply(Mt)); piece('tronco', tr.hip, HIP[0], HIP[1]);
      ctx.setTransform(base.multiply(Mw.translate(0, P.bob))); drawLeg(near, 'ln', false);
      drawHead(); ctx.setTransform(base.multiply(Mt)); drawArm(hitA, 'hit', false);
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------- Amiguinho pintado (gelatina) */
  // corpo fatiado na horizontal: cada faixa anda um pouco para o lado (balanço de gelatina)
  function jelly(im, a, foot, sk) {
    const S = 12;
    for (let q = 0; q < S; q++) {
      const v0 = a.h * q / S, v1 = a.h * (q + 1) / S, up = 1 - (v0 + v1) / 2 / a.h, off = sk * up * up;
      ctx.drawImage(im, 0, v0, a.w, v1 - v0, -foot[0] / PXU + off, (v0 - foot[1]) / PXU, a.w / PXU, (v1 - v0) / PXU + .08);
    }
  }
  function drawBlob2(v, p, i, tt, base) {
    const s = stOf('bl2' + i), dt = clamp(tt - s.tt, 0, .05); s.tt = tt;
    const P = poseOf(v, p, i, tt, s, dt), col = blobCols(v, i);
    if (s.F === undefined) s.F = P.face; s.F += (P.face - s.F) * Math.min(1, dt * 14);
    const sg = Math.sign(s.F) || 1, fx = sg * Math.max(.6, Math.abs(s.F));
    const dv = (p.vy - (s.vy || 0)); s.vy = p.vy; if (Math.abs(dv) > 60) s.jv += clamp(dv, -600, 600) * .004;
    s.jv += (-s.j * 260 - s.jv * 9) * dt; s.j += s.jv * dt;
    // balanço de lado (o topo atrasa quando ele acelera)
    const ax = (p.vx - (s.vx || 0)) / Math.max(dt, .001); s.vx = p.vx;
    s.wv = (s.wv || 0) + ((-(s.w || 0) * 180) - (s.wv || 0) * 7 - clamp(ax, -3000, 3000) * .0016 * sg) * dt; s.w = (s.w || 0) + s.wv * dt;
    const sq = (p.sq || 0) + s.j * .35;
    let sx = 1 - .16 * sq, sy = 1 + .2 * sq, bob = 0, rot = 0, view = 'b_34';
    if (P.anim === 'correndo') { const ph = p.ph || 0; bob = -Math.abs(Math.sin(ph)) * 2.2; rot = Math.sin(ph) * .09; sy *= 1 - .05 * Math.cos(2 * ph); sx *= 1 + .05 * Math.cos(2 * ph); view = 'b_lado'; }
    else if (P.anim === 'parado') { const b0 = Math.sin(tt * 3 + 2); sy *= 1 + .025 * b0; sx *= 1 - .02 * b0; }
    else if (P.anim === 'comemora') { bob = -Math.abs(Math.sin(tt * 7.5)) * 5; const k = Math.abs(Math.sin(tt * 7.5)); sy *= 1 + .1 * k - .08; sx *= 1 - .07 * k + .06; view = 'b_frente'; }
    else if (P.anim === 'triste') { sy *= .94; sx *= 1.04; view = 'b_frente'; }
    else if (P.anim === 'peixinho') { rot = P.rot * .3 * sg; view = 'b_lado'; }
    else if (P.anim === 'aterrissagem') view = 'b_amassa';
    else if (!p.g) view = 'b_pulo';
    const K = .9, a = C2[view], im = tinted(view, col.O);
    const Mw = new DOMMatrix().translate(p.x, p.y + bob).scale(CHAR_K * K).scale(fx, 1).rotate(rot / D).scale(sx, sy);
    const foot = a.foot, top = -(foot[1]) / PXU, vis = [(a.vis[0] - foot[0]) / PXU, (a.vis[1] - foot[1]) / PXU];
    const cy = top * .5;
    // mãos: soltas do lado do corpo; no golpe sai um braço de borracha
    const handOf = (A, IKT, isHit) => {
      let H;
      if (IKT === 'swing') { const H0 = swingPose(p, P.sf, p.sw.t, p.sw.gnd, p.sw.pow, p.sw.hit ? p.sw.L : v.b).pts[0]; H = toLocal(Mw, H0.x, H0.y); }
      else if (IKT === 'cock') H = [-6, -40];
      else if (IKT && IKT.L) H = [IKT.L[0] * sg * 1.1, IKT.L[1] - 8];
      else if (IKT) H = toLocal(Mw, IKT[0], IKT[1]);
      else { const ry = -13 - Math.sin(clamp(A.a, -1, 3)) * 9 - (A.b > 1.2 ? 12 : 0), fw = Math.sin(A.a) * 6; H = [(isHit ? 11 : -12.5) + fw * .6, ry]; }
      return { H, arm: !!IKT && !IKT.L, isHit };
    };
    const hh = handOf(P.hit, P.hitIK, true), ho = handOf(P.off, P.offIK, false);
    const drawHand = (h, far) => {
      if (h.arm) {
        const c = [0, cy], dir = sub(h.H, c), dl = len2(dir) || 1, root = [c[0] + dir[0] / dl * 11, c[1] + dir[1] / dl * 11];
        const mid = [(root[0] + h.H[0]) / 2 - 2, (root[1] + h.H[1]) / 2 + 2.5], wd = 3.6 * clamp(Math.sqrt(14 / Math.max(14, len2(sub(h.H, root)))), .65, 1);
        const pth = new Path2D(); pth.moveTo(root[0], root[1]); pth.quadraticCurveTo(mid[0], mid[1], h.H[0], h.H[1]);
        ctx.save(); ctx.lineCap = 'round';
        ctx.strokeStyle = '#341642'; ctx.lineWidth = wd + 1.1; ctx.stroke(pth);
        ctx.strokeStyle = mix(col.O, '#000000', .08); ctx.lineWidth = wd; ctx.stroke(pth);
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = wd * .25; ctx.translate(-.5, -.6); ctx.stroke(pth);
        ctx.restore();
      }
      const m = C2.b_mao; ctx.save(); if (far) ctx.globalAlpha = 1; piece('b_mao', m.c, h.H[0], h.H[1], 0, 1, 1, far ? dark2(col.O) : tinted('b_mao', col.O)); ctx.restore();
    };
    ctx.save();
    ctx.setTransform(base.multiply(Mw));
    if (!(hh.arm || P.anim === 'comemora')) drawHand(ho, true);
    // corpo de gelatina
    jelly(im, a, foot, s.j * 4 + (s.w || 0) * 9);
    // rosto no visor
    ctx.save(); ctx.translate(vis[0], vis[1] + .6); const kx = view === 'b_lado' ? .62 : view === 'b_frente' || view === 'b_amassa' ? 1 : .8; ctx.scale(.95, .95); faceExpr(P.ex, 0, 0, kx, C.eye); ctx.restore();
    if (hh.arm || P.anim === 'comemora') drawHand(ho, false);
    drawHand(hh, false);
    ctx.restore();
  }
  function dark2(col) { const k = 'dk' + col; if (DARK[k]) return DARK[k]; const t = tinted('b_mao', col), c = document.createElement('canvas'); c.width = t.width; c.height = t.height; const g = c.getContext('2d'); g.drawImage(t, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(46,24,96,.3)'; g.fillRect(0, 0, c.width, c.height); return (DARK[k] = c); }

  /* ---------------------------------------------------------- bola, areia levantando, cenário, rede e placar pintados */
  function drawBall2(x, y, r, ang, sc = 1) {
    const a = C2.bola, k = (r * 2) / (a.w / PXU) * 1.04 * sc;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(k / PXU, k / PXU); ctx.drawImage(IMG.bola, -a.c[0], -a.c[1]); ctx.restore();
  }
  const SPL = [];
  function splash(x, big) { SPL.push({ x, t: 0, n: big ? 'areia3' : Math.random() < .5 ? 'areia1' : 'areia2', s: big ? .55 : .7 }); }
  function drawSplashes(dt) {
    for (const e of SPL) e.t += dt;
    for (let k = SPL.length - 1; k >= 0; k--) if (SPL[k].t > .5) SPL.splice(k, 1);
    for (const e of SPL) {
      const a = C2[e.n], k = e.t / .5, sc = e.s * (.55 + .6 * ease(Math.min(1, k * 1.8)));
      ctx.save(); ctx.globalAlpha = clamp(1.6 - k * 1.6, 0, 1); ctx.translate(e.x, VGY + 2); ctx.scale(sc / PXU, sc * (1 - .25 * k) / PXU);
      ctx.drawImage(IMG[e.n], -a.c[0], -a.c[1]); ctx.restore();
    }
  }
  const HZ2 = 141;
  function scene2(v, tt) {
    const s = stOf('cam'), dt = clamp(tt - s.tt, 0, .05); s.tt = tt; s.j = s.j || W / 2; s.j = lerp(s.j, clamp(v.b.x, 40, W - 40), Math.min(1, dt * 1.5));
    const cam = s.j - W / 2;
    const lay = (n, k, wk) => { const w = W * wk, h = w * 9 / 16; ctx.drawImage(IMG[n], (W - w) / 2 - cam * k, HZ2 - .6376 * h, w, h); };
    lay('ceu', .015, 1.08); lay('mar', .035, 1.1);
    ctx.drawImage(IMG.areia, 0, 0, W, H);
    // torcida de Amiguinhos (o mesmo desenho, em várias cores)
    const cheer = v.cheer > 0;
    ctx.save(); ctx.translate(-cam * .05, 0);
    for (const row of [0, 1]) for (const c of CROWD) {
      if (c.row !== row) continue;
      const kk = c.row ? .4 : .34, y = c.row ? 172 : 165, hop = cheer ? Math.max(0, Math.sin(tt * 11 + c.ph)) * 5 : Math.max(0, Math.sin(tt * 2 + c.ph)) * .6;
      const a = C2.b_frente, im = tinted('b_frente', c.c), hz = c.row ? .12 : .24;
      ctx.save(); ctx.translate(c.x, y - hop); ctx.scale(kk / PXU, kk * (1 + (cheer ? .06 : .02) * Math.sin(tt * 11 + c.ph)) / PXU);
      ctx.drawImage(im, -a.foot[0], -a.foot[1]); void hz; ctx.restore();
      ctx.save(); ctx.translate(c.x + (a.vis[0] - a.foot[0]) / PXU * kk, y - hop + (a.vis[1] - a.foot[1]) / PXU * kk + .3); ctx.scale(kk * .9, kk * .9);
      faceExpr(cheer ? 2 : (v.mood || 0) < -.4 ? 4 : c.ex, 0, 0, 1, C.eye); ctx.restore();
    }
    ctx.restore();
    // névoa leve até a torcida (separa a quadra do fundo)
    const g = ctx.createLinearGradient(0, 120, 0, 182); g.addColorStop(0, 'rgba(255,190,170,0)'); g.addColorStop(.6, 'rgba(255,190,170,.14)'); g.addColorStop(1, 'rgba(255,190,170,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 120, W, 62);
    // fita da quadra na areia
    ctx.strokeStyle = 'rgba(255,248,230,.75)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(30, 190); ctx.lineTo(370, 190); ctx.stroke();
    ctx.lineWidth = 1.9; ctx.beginPath(); ctx.moveTo(12, 216); ctx.lineTo(388, 216); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(30, 190); ctx.lineTo(12, 216); ctx.moveTo(370, 190); ctx.lineTo(388, 216); ctx.stroke();
  }
  // poste de madeira: o topo com o nó, o nó de baixo na altura da corda e o resto esticado
  function post(x, top, bot, kw, im) {
    const a = C2.poste, w = a.w / PXU * kw, sc = kw, cx = a.cx[0] / PXU * kw;
    const seg = (y0, y1, dy, dh) => ctx.drawImage(im, 0, y0, a.w, y1 - y0, x - cx, dy, w, dh);
    const capH = 104 / PXU * sc, knH = 56 / PXU * sc, kn = VNT + 46 - knH / 2;
    seg(0, 104, top, capH); seg(104, 182, top + capH - .1, kn - top - capH + .2); seg(182, 238, kn, knH); seg(238, a.h, kn + knH - .1, bot - kn - knH + .1);
  }
  function net2() {
    const x0 = VNX, top = VNT, bot = VNT + 46, bx = x0 + 15, by = -9;
    post(bx, top - 13, VGY - 12, .5, dark('poste'));
    // malha e corda de cima: o desenho da rede, visto de lado (inclinado em perspectiva)
    const m = C2.malha, f = C2.faixa;
    ctx.save(); ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([15 / m.w, by / m.w, 0, 44 / m.h, x0, top + 2])));
    ctx.drawImage(IMG.malha, 0, 0); ctx.drawImage(IMG.malha, 0, 0); ctx.restore();
    ctx.save(); ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([15 / f.w, by / f.w, 0, 4.2 / f.h, x0, top - 1.6]))); ctx.drawImage(IMG.faixa, 0, 0); ctx.restore();
    ctx.save(); ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([15 / f.w, by / f.w, 0, 2.6 / f.h, x0, bot - 1]))); ctx.drawImage(IMG.faixa, 0, 0); ctx.restore();
    post(x0, top - 4, VGY + 3, .6, IMG.poste);
  }
  // placar de madeira pendurado no alto, com as plaquinhas mostrando os pontos
  function scoreboard2(v) {
    const a = C2.placar, Z = 1.4, w = a.w / PXU * Z, x = W / 2 - w / 2, y = 1, col = blobCols(v, 1);
    ctx.drawImage(IMG.placar, x, y, w, a.h / PXU * Z);
    const num = (c, sc, cl) => { textO(String(sc), x + c[0] / PXU * Z, y + c[1] / PXU * Z + 1, 17, cl, 3.2); };
    num(a.c1, v.sc[0], C.blue); num(a.c2, v.sc[1], col.O);
    // pontos para vencer: num círculo amarelo entre as plaquinhas
    const cx = W / 2, cyy = y + a.c1[1] / PXU * Z;
    ctx.fillStyle = C.yel; ctx.strokeStyle = NV; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cyy + 9, 3.6, 0, TAU); ctx.fill(); ctx.stroke();
    textO(String(v.target ? v.target() : 7), cx, cyy + 9.3, 4.2, NV, 0);
    if (v.state === 'rally' && v.touches) for (const side of [0, 1]) {
      const bx = x + (side ? a.c2[0] : a.c1[0]) / PXU * Z, by = y + a.h / PXU * Z + 3.2;
      for (let k = 0; k < 3; k++) { ctx.fillStyle = k < v.touches[side] ? C.yel : 'rgba(255,255,255,.4)'; ctx.strokeStyle = NV; ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(bx + (k - 1) * 5, by, 1.7, 0, TAU); ctx.fill(); ctx.stroke(); }
    }
  }
  const ART2 = () => ready(...IA_P, ...BL_P, 'bola', 'ceu', 'mar', 'areia', 'poste', 'malha', 'faixa', 'placar', 'areia1', 'areia2', 'areia3');
