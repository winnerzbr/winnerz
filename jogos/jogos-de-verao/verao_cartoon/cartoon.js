/* ============================================================ VÔLEI EM DESENHO ANIMADO (versão de teste)
   Só a camada de desenho muda: física, controles, IA, placar e menus são os do jogo original.
   Tudo é vetor desenhado por código (contorno azul-marinho grosso por fora, linhas finas por dentro,
   cor chapada + uma sombra + um brilho). Unidades do mundo: 400 × 225; a tela tem 1280 × 720 (×3,2).
   Personagens montados por peças (rig): cada peça tem um ponto de giro; qualquer peça pode ser trocada
   por um desenho à mão (PNG) — ver CARTOON_ART no fim do arquivo. */
(() => {
  const NV = '#1b1f4f', D = Math.PI / 180;
  const OL = 1.05, IL = .42; // contorno de fora / linhas de dentro (unidades do mundo)
  const FONT = '"Fredoka", "Baloo 2", "Nunito", "Arial Rounded MT Bold", system-ui, sans-serif';
  const C = {
    cream: '#f4ead4', creamS: '#d9c6a0', white: '#fbfaf5', blue: '#2f74dc', blueS: '#1d4fa6', grey: '#aeb8c8', greyS: '#7d88a0',
    cyan: '#3cc8ec', cyanS: '#1f8fbf', cyanL: '#b4f6ff', scr: '#0f1830', eye: '#8ff5ff', red: '#ef5b5b', yel: '#ffd24a',
  };
  const SHA = 'rgba(64,36,120,.24)';

  /* ---------------------------------------------------------- peças: lista com transformação, desenhada em duas passadas */
  let PL = null;
  const TF = () => ctx.getTransform();
  function shape(path, fill, o = {}) { PL.push({ k: 's', m: TF(), path, fill, ...o }); }
  function limb(pts, w, fill, o = {}) {
    const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]);
    if (o.curve) p.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]); else for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    PL.push({ k: 'l', m: TF(), path: p, w, fill, ...o });
  }
  function detail(fn) { PL.push({ k: 'd', m: TF(), fn }); }
  // meia-lua de sombra: tudo da peça menos uma elipse deslocada para cima e para a esquerda (a luz vem de lá)
  function crescent(cx, cy, rx, ry, dx, dy) { const p = new Path2D(); p.rect(cx - rx * 3, cy - ry * 3, rx * 6, ry * 6); p.ellipse(cx - dx, cy - dy, rx, ry, 0, 0, TAU); return p; }
  const ell = (cx, cy, rx, ry, r = 0) => { const p = new Path2D(); p.ellipse(cx, cy, Math.max(.01, rx), Math.max(.01, ry), r, 0, TAU); return p; };
  const rr = (x, y, w, h, r) => { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; };
  function flush(list) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 1ª passada: o contorno grosso de fora (a silhueta inteira)
    ctx.strokeStyle = NV; ctx.fillStyle = NV;
    for (const q of list) {
      if (q.noOut || q.k === 'd') continue; ctx.setTransform(q.m);
      if (q.k === 'l') { ctx.lineWidth = q.w + 2 * OL; ctx.stroke(q.path); }
      else if (q.k === 's') { ctx.lineWidth = 2 * OL; ctx.stroke(q.path); ctx.fill(q.path); }
      else if (q.k === 'i') artOutline(q);
    }
    // 2ª passada: cores, sombra, brilho e as linhas finas de dentro
    for (const q of list) {
      ctx.setTransform(q.m);
      if (q.k === 'd') { q.fn(); continue; }
      if (q.k === 'i') { artDraw(q); continue; }
      if (q.k === 'l') { ctx.strokeStyle = NV; ctx.lineWidth = q.w + 2 * IL; ctx.stroke(q.path); ctx.strokeStyle = q.fill; ctx.lineWidth = q.w; ctx.stroke(q.path); continue; }
      ctx.fillStyle = q.fill; ctx.fill(q.path);
      if (q.after || q.cel || q.hi) {
        ctx.save(); ctx.clip(q.path);
        if (q.after) q.after();
        if (q.cel) { ctx.fillStyle = q.cel.c || SHA; ctx.fill(crescent(q.cel.cx, q.cel.cy, q.cel.rx, q.cel.ry, q.cel.dx, q.cel.dy), 'evenodd'); }
        if (q.hi) { ctx.fillStyle = q.hiC || 'rgba(255,255,255,.6)'; ctx.fill(q.hi); }
        ctx.restore();
      }
      if (!q.noIn) { ctx.strokeStyle = NV; ctx.lineWidth = IL; ctx.stroke(q.path); }
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------- troca de peças por desenho à mão */
  // CARTOON_ART[nome] = { src: 'cabeca.png', px: 10 (pixels do PNG por unidade), pivot: [x, y] em pixels do PNG }
  const ART = (window.CARTOON_ART = window.CARTOON_ART || {});
  function artReady(n) { const a = ART[n]; if (!a) return false; if (!a.img) { a.img = new Image(); a.img.src = a.src; } return a.img.complete && a.img.naturalWidth > 0; }
  // peça desenhada: no ponto de giro atual; para braço/perna, girada ao longo do segmento e esticada até o comprimento
  function artPart(n, x, y, rot = 0, len = 0) { if (!artReady(n)) return false; PL.push({ k: 'i', m: TF(), n, x, y, rot, len }); return true; }
  function artPlace(q) { const a = ART[q.n], s = 1 / (a.px || 10); ctx.translate(q.x, q.y); ctx.rotate(q.rot); if (q.len) ctx.scale(q.len / ((a.img.naturalWidth - a.pivot[0]) * s), 1); ctx.scale(s, s); ctx.translate(-a.pivot[0], -a.pivot[1]); }
  function artOutline() { /* o desenho à mão já traz o próprio contorno */ }
  function artDraw(q) { ctx.save(); artPlace(q); ctx.drawImage(ART[q.n].img, 0, 0); ctx.restore(); }

  /* ---------------------------------------------------------- utilidades */
  const ST = new Map();
  const stOf = (k) => { let s = ST.get(k); if (!s) { s = { th: null, tt: 0, prop: 0, pv: 0, j: 0, jv: 0, vy: 0, wave: 0 }; ST.set(k, s); } return s; };
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => k * k * (3 - 2 * k);
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const len2 = (a) => Math.hypot(a[0], a[1]);
  // braço de dois ossos: cotovelo dobra para o lado de "pref" (ou estica feito borracha, se o alvo está longe)
  function ik(S, T, L1, L2, pref) {
    const d = sub(T, S), dl = len2(d) || .001;
    if (dl >= L1 + L2 - .01) return [S[0] + d[0] * L1 / (L1 + L2), S[1] + d[1] * L1 / (L1 + L2)];
    const a = Math.acos(clamp((L1 * L1 + dl * dl - L2 * L2) / (2 * L1 * dl), -1, 1)), b = Math.atan2(d[1], d[0]);
    const e1 = [S[0] + Math.cos(b + a) * L1, S[1] + Math.sin(b + a) * L1], e2 = [S[0] + Math.cos(b - a) * L1, S[1] + Math.sin(b - a) * L1];
    return (e1[0] - S[0]) * pref[0] + (e1[1] - S[1]) * pref[1] > (e2[0] - S[0]) * pref[0] + (e2[1] - S[1]) * pref[1] ? e1 : e2;
  }
  const toLocal = (M, x, y) => { const q = M.inverse().transformPoint(new DOMPoint(x, y)); return [q.x, q.y]; };
  const setM = (base, M) => ctx.setTransform(base.multiply(M));

  /* ---------------------------------------------------------- rostos na tela preta (0 normal · 1 piscando · 2 feliz · 3 susto · 4 triste · 5 concentrado) */
  function faceExpr(ex, cx, cy, kx, col) {
    ctx.save(); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 1.25;
    const e0 = cx - 4.3 * kx, e1 = cx + 4.3 * kx, ey = cy - 1.5, my = cy + 2.6;
    const P = () => ctx.beginPath();
    if (ex === 1) { for (const x of [e0, e1]) { P(); ctx.moveTo(x - 1.7 * kx, ey + .5); ctx.lineTo(x + 1.7 * kx, ey + .5); ctx.stroke(); } P(); ctx.arc(cx, my - 1.6, 2.1, .25 * Math.PI, .75 * Math.PI); ctx.stroke(); }
    else if (ex === 2) {
      for (const x of [e0, e1]) { P(); ctx.arc(x, ey + 1.3, 1.9 * kx, 1.12 * Math.PI, 1.88 * Math.PI); ctx.stroke(); }
      P(); ctx.moveTo(cx - 3.2, my - 1.4); ctx.quadraticCurveTo(cx, my - 1.9, cx + 3.2, my - 1.4); ctx.quadraticCurveTo(cx + 2.6, my + 2.3, cx, my + 2.3); ctx.quadraticCurveTo(cx - 2.6, my + 2.3, cx - 3.2, my - 1.4); ctx.fill();
    } else if (ex === 3) {
      ctx.lineWidth = 1;
      for (const x of [e0, e1]) { P(); ctx.ellipse(x, ey, 2.1 * kx, 2.5, 0, 0, TAU); ctx.stroke(); P(); ctx.arc(x, ey + .2, .8, 0, TAU); ctx.fill(); }
      P(); ctx.ellipse(cx, my, 1.1, 1.4, 0, 0, TAU); ctx.stroke();
    } else if (ex === 4) {
      for (const [x, s] of [[e0, -1], [e1, 1]]) { P(); ctx.ellipse(x, ey + .7, 1.4 * kx, 1.6, 0, 0, TAU); ctx.fill(); P(); ctx.moveTo(x - 2 * kx, ey - 1.6 - s * .9); ctx.lineTo(x + 2 * kx, ey - 1.6 + s * .9); ctx.stroke(); }
      P(); ctx.arc(cx, my + 2.2, 2.2, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke();
    } else if (ex === 5) {
      for (const [x, s] of [[e0, 1], [e1, -1]]) { P(); ctx.moveTo(x - 1.7 * kx, ey - .6 - s * .7); ctx.lineTo(x + 1.7 * kx, ey - .6 + s * .7); ctx.lineTo(x + 1.7 * kx, ey + .8); ctx.ellipse(x, ey + .8, 1.7 * kx, 1.5, 0, 0, Math.PI); ctx.closePath(); ctx.fill(); }
      P(); ctx.moveTo(cx - 1.8, my - .2); ctx.lineTo(cx + 1.8, my - .2); ctx.stroke();
    } else { for (const x of [e0, e1]) { P(); ctx.ellipse(x, ey, 1.45 * kx, 2.3, 0, 0, TAU); ctx.fill(); } P(); ctx.arc(cx, my - 1.4, 2.1, .2 * Math.PI, .8 * Math.PI); ctx.stroke(); }
    ctx.restore();
  }

  /* ---------------------------------------------------------- pose a partir do estado do jogo (o mesmo mapa de animações do original) */
  // bola segurada no saque: na mão, na frente do corpo (a física guarda a bola em cima da cabeça; só o desenho muda até o lançamento)
  function heldPos(v, i) { const p = v.P[i], f = i ? -1 : 1; return { x: p.x + f * 15.5 * CHAR_K, y: p.y - (v.charging ? 24 : 18) * CHAR_K }; }
  function poseOf(v, p, i, tt, s, dt) {
    const [anim, fr, ex0, dpose] = vAnim(v, p, i, tt), sf = i ? -1 : 1, b = v.b;
    const face = p.dv ? p.dv.dir : sf;
    const P = {
      anim, ex: ex0, face, sf, th: face * .95, dx: 0, lean: 0, bob: 0, rot: 0, lift: 0, headTilt: 0, headDy: 0, spin: 2.4,
      hit: { a: .12, e: .35, b: .14 }, off: { a: -.08, e: .3, b: .14 },
      legs: [{ f: 0, l: 0, k: 0 }, { f: 0, l: 0, k: 0 }], hitIK: null, offIK: null, hitFront: false, twist: 0,
    };
    const breath = Math.sin(tt * 2.6 + i);
    if (anim === 'parado') {
      P.bob = breath * .35; P.hit.a = .14 + breath * .05; P.off.a = -.06 - breath * .05; P.headTilt = breath * .02 * face;
    } else if (anim === 'correndo') {
      const ph = p.ph || 0, sg = Math.sign(p.vx || 1) * face, sn = Math.sin(ph);
      P.legs[0] = { f: sn * 4.6 * sg, l: Math.max(0, Math.cos(ph)) * 3, k: 1.6 };
      P.legs[1] = { f: -sn * 4.6 * sg, l: Math.max(0, -Math.cos(ph)) * 3, k: 1.6 };
      P.hit = { a: -sn * .9 * sg + .1, e: 1.25, b: .2 }; P.off = { a: sn * .9 * sg + .1, e: 1.25, b: .2 };
      P.bob = -(1 - Math.abs(sn)) * 1.3 + .6; P.lean = .13 * Math.sign(p.vx); P.headTilt = -.04 * Math.sign(p.vx); P.spin = 9;
    } else if (anim === 'pulo') {
      const k = clamp(p.vy / 260, -1, 1); // -1 subindo · 1 caindo
      P.hit = { a: lerp(2.7, 2.1, (k + 1) / 2), e: .35, b: lerp(.25, .75, (k + 1) / 2) }; P.off = { a: lerp(2.5, 1.9, (k + 1) / 2), e: .4, b: lerp(.25, .75, (k + 1) / 2) };
      P.legs[0] = { f: 1.6, l: lerp(3.4, 1.2, (k + 1) / 2), k: 2.6 }; P.legs[1] = { f: -1.2, l: lerp(2.2, .4, (k + 1) / 2), k: 2 };
      P.spin = 18;
    } else if (anim === 'aterrissagem') {
      P.bob = 1.6; P.hit = { a: .7, e: .5, b: .7 }; P.off = { a: .5, e: .5, b: .7 }; P.legs[0] = { f: 1.5, l: 0, k: 2.4 }; P.legs[1] = { f: -1.5, l: 0, k: 2.4 }; P.spin = 6;
    } else if (anim === 'saque') {
      // a mão de trás segura a bola por baixo; carregando, o braço de bater vai para trás e para cima
      if (v.held && v.server === i) { const hp = heldPos(v, i); P.offIK = [hp.x - sf * 4.5, hp.y + 8.5]; }
      else P.off = { a: 2.9, e: .15, b: .1 };
      if (fr >= 1) { P.hitIK = 'cock'; P.lean = -.08 * face; P.twist = .5; }
      P.ex = fr === 1 ? 5 : ex0;
    } else if (anim === 'cortada' || anim === 'cortechao') {
      if (p.sw) { P.hitIK = 'swing'; const sw = swingT(p.sw.gnd, p.sw.pow), k = clamp(p.sw.t / sw, 0, 1); P.lean = face * lerp(-.2, .32, ease(k)); P.twist = lerp(.7, -.25, ease(k)); P.off = { a: lerp(2.2, .4, k), e: .4, b: .3 }; }
      else { P.hitIK = 'cock'; P.lean = -.18 * face; P.twist = .7; P.off = { a: 2.1, e: .5, b: .3 }; }
      if (!p.g) { P.legs[0] = { f: -2.5, l: 2.6, k: -2 }; P.legs[1] = { f: 1.5, l: 1, k: 2.4 }; }
      else { P.legs[0] = { f: 3, l: 0, k: 1.5 }; P.legs[1] = { f: -3, l: 0, k: 1.5 }; P.bob = 1; }
      P.spin = 16;
    } else if (anim === 'toque' || anim === 'batida') {
      const k = clamp(p.hitA / .32, 0, 1);
      if (anim === 'toque') { P.hit = { a: 2.75, e: .7, b: .15 }; P.off = { a: 2.75, e: .7, b: .15 }; P.headTilt = -.12 * face; P.legs[0].k = 1.5; P.bob = -.5 * k; }
      else { P.lean = .2 * face; P.hit = { a: -.9, e: .3, b: .35 }; P.off = { a: -.7, e: .3, b: .35 }; P.headTilt = .1 * face; }
      P.spin = 14;
    } else if (anim === 'peixinho') {
      // peixinho: o corpo deita para a frente, braços esticados, pernas para trás
      const rest = p.dv && p.dv.rest !== undefined;
      let k = !p.g ? (fr === 0 ? clamp(p.dv.t / .1, .2, 1) : 1) : 1;
      if (rest) k = clamp(1 - (p.dv.t - p.dv.rest) / DIVE.rest, 0, 1);
      P.rot = face * 1.42 * ease(k); P.dx = face * 4 * ease(k);
      P.hit = { a: lerp(.3, 2.95, k), e: .1, b: .08 }; P.off = { a: lerp(.2, 2.8, k), e: .15, b: .12 };
      P.legs[0] = { f: -2.5 * k, l: 1 * k, k: -1.5 * k }; P.legs[1] = { f: -4 * k, l: 2 * k, k: -1 * k };
      P.headTilt = -.25 * face * k; P.spin = 12;
    } else if (anim === 'comemora') {
      P.th = face * .12; const w = Math.sin(tt * 12), hop = Math.abs(Math.sin(tt * 7.5)); P.lift = hop * 5; P.bob = (1 - hop) * .8;
      P.hitIK = { L: [-face * 18.5, -25 - 3 * w] }; P.offIK = { L: [face * 18.5, -25 + 3 * w] };
      P.legs[0] = { f: .5, l: hop * 1.2, k: 1 }; P.legs[1] = { f: -.5, l: hop * 1.2, k: 1 };
      P.spin = 24; P.ex = 2;
    } else if (anim === 'triste') {
      P.th = face * .4; P.headDy = 1.6; P.headTilt = .18 * face; P.bob = .9; P.hit = { a: -.04, e: .05, b: .03 }; P.off = { a: -.04, e: .05, b: .03 }; P.spin = 0; P.ex = 4;
      P.legs[0].k = .8; P.legs[1].k = .8;
    }
    if (p.spec && !p.sw) { P.hitIK = 'cock'; P.twist = .7; }
    return P;
  }

  /* ---------------------------------------------------------- IAmiguinho (rig de peças) */
  // pontos de giro (unidades locais, pés no 0, olhando para a direita):
  //   quadril (0,-8.5) · ombros (±7.2, -15.5) · pescoço (0,-15) · centro da cabeça (0,-26) · topo do boné (0,-48) · hélice (0,-50.5)
  function drawIA(v, p, i, tt, base) {
    const s = stOf('ia' + i), dt = clamp(tt - s.tt, 0, .05); s.tt = tt;
    const P = poseOf(v, p, i, tt, s, dt);
    // virada de verdade: o ângulo do corpo anda até o alvo (passa pela frente quando troca de lado)
    if (s.th === null) s.th = P.th; s.th += (P.th - s.th) * Math.min(1, dt * 11);
    const th = s.th, sth = Math.sin(th), cth = Math.cos(th);
    s.pv = lerp(s.pv, P.spin, Math.min(1, dt * 4)); s.prop += s.pv * dt;
    const sq = p.sq || 0, sx = 1 - .11 * sq, sy = 1 + .15 * sq;
    const Mw = new DOMMatrix().translate(p.x + P.dx, p.y - P.lift).scale(CHAR_K).translate(0, -14).rotate(P.rot / D).translate(0, 14).scale(sx, sy);
    const Mt = Mw.translate(0, P.bob).translate(0, -8.5).rotate(P.lean / D).translate(0, 8.5);
    const Mh = Mt.translate(0, P.headDy).translate(0, -15).rotate(P.headTilt / D).translate(0, 15);
    // projeção "3D" simples: lado (lat), frente (fwd) e altura; a frente aponta para onde ele olha
    const tw = th + P.twist * P.face, stw = Math.sin(tw), ctw = Math.cos(tw);
    const pj = (lat, fwd, y, c = cth, sn = sth) => [lat * c + fwd * sn, y + (fwd * c - lat * sn) * .14];
    const dep = (lat, fwd, c = cth, sn = sth) => fwd * c - lat * sn;
    const groups = [];
    const latHit = -P.face; // o braço de bater é o do lado da câmera

    // pernas (no quadro do corpo amassado/esticado)
    [[-1, P.legs[0]], [1, P.legs[1]]].forEach(([lat, L], k) => {
      const lt = k === 0 ? latHit : -latHit, d = dep(lt * 4, L.f);
      groups.push({ z: -1.5 + d * .01, fn: () => {
        setM(base, Mw);
        const hip = pj(lt * 3.6, 0, -8.5 + P.bob), ft = pj(lt * 4, L.f, -2.4 - L.l), mid = [(hip[0] + ft[0]) / 2 + P.face * L.k * Math.abs(sth) + lt * cth * .3, (hip[1] + ft[1]) / 2];
        const tint = d < -.5;
        if (!artPart('perna', hip[0], hip[1], Math.atan2(ft[1] - hip[1], ft[0] - hip[0]), len2(sub(ft, hip)))) limb([hip, mid, ft], 3.3, tint ? C.creamS : C.cream, { curve: true });
        const shx = ft[0] + P.face * 1.1 * Math.abs(sth), rx = 2.9 + 1.7 * Math.abs(sth);
        if (!artPart('sapato', shx, ft[1] + .4, 0)) {
          const sh = new Path2D(); sh.ellipse(shx, ft[1] + .2, rx, 2.5, 0, Math.PI, TAU); sh.lineTo(shx + rx, ft[1] + 1.6); sh.lineTo(shx - rx, ft[1] + 1.6); sh.closePath();
          shape(sh, tint ? C.blueS : C.blue, { cel: { cx: shx, cy: ft[1], rx, ry: 2.5, dx: 1.2, dy: 1.6, c: C.blueS }, hi: ell(shx - rx * .35 + P.face * .8, ft[1] - 1.1, rx * .32, .55) });
          limb([[shx - rx + .4, ft[1] + 1.4], [shx + rx - .4, ft[1] + 1.4]], .9, C.white);
        }
      } });
    });
    // tronco
    groups.push({ z: 0, fn: () => {
      setM(base, Mt);
      if (!artPart('tronco', 0, -8.5)) shape(rr(-6.8, -18, 13.6, 11.2, 5.4), C.cream, { cel: { cx: 0, cy: -12.4, rx: 6.8, ry: 5.6, dx: 1.6, dy: 1.6, c: C.creamS } });
    } });
    // braços: ombro (bola cinza), braço, cotovelo (bola cinza), antebraço, pulseira azul, mão
    const arm = (lat, A, IKT, isHit) => {
      const sy0 = -15.6, d0 = dep(lat * 7.2, 0, ctw, stw);
      let S = pj(lat * 7.2, 0, sy0, ctw, stw), E, Hd;
      const L1 = 4.8, L2 = 4.8;
      if (IKT) {
        let T;
        if (IKT === 'swing') {
          const pose = swingPose(p, P.sf, p.sw.t, p.sw.gnd, p.sw.pow, p.sw.hit ? p.sw.L : v.b), H0 = pose.pts[0];
          T = toLocal(Mt, H0.x, H0.y);
          // no golpe o ombro vem para a frente: a raiz do braço fica perto do pivô da física
          const K = p.sw.gnd ? SPKG : SPK, piv = toLocal(Mt, p.x + P.sf * K.sx, p.y + K.sy);
          S = piv;
        } else if (IKT === 'cock') {
          const K = p.g ? SPKG : SPK, piv = toLocal(Mt, p.x + P.sf * K.sx, p.y + K.sy);
          S = piv; T = [S[0] - P.sf * 9, S[1] - 9];
        } else if (IKT.L) T = IKT.L; else T = toLocal(Mt, IKT[0], IKT[1]);
        E = ik(S, T, L1, L2, [-P.sf * .6, 1]); Hd = T;
      } else {
        const sl = Math.sign(lat), d1 = [sl * Math.sin(A.b), Math.sin(A.a) * Math.cos(A.b), Math.cos(A.a) * Math.cos(A.b)], a2 = A.a + A.e;
        const d2 = [sl * Math.sin(A.b), Math.sin(a2) * Math.cos(A.b), Math.cos(a2) * Math.cos(A.b)];
        const e3 = [lat * 7.2 + d1[0] * L1, d1[1] * L1, sy0 + d1[2] * L1], h3 = [e3[0] + d2[0] * L2, e3[1] + d2[1] * L2, e3[2] + d2[2] * L2];
        E = pj(e3[0], e3[1], e3[2], ctw, stw); Hd = pj(h3[0], h3[1], h3[2], ctw, stw);
      }
      const raised = Hd[1] < -16, side = Math.abs(d0) < 2.5;
      const swingArm = isHit && (IKT === 'swing' || IKT === 'cock'), inHead = Math.abs(Hd[0]) < 15.5 && Hd[1] > -50 && Hd[1] < -14;
      const front = Hd[0] * P.face > 9;
      const z = swingArm ? 1.8 : IKT && IKT.L ? .6 : isHit && IKT ? 2.6 : d0 < -2.5 ? -2 : side ? .6 : raised ? (front ? 2.6 : .6) : .7;
      const zH = swingArm && (IKT === 'swing' || !inHead) ? 2.7 : z;
      groups.push({ z, fn: () => {
        setM(base, Mt);
        const tint = d0 < -2.5 && !IKT, cA = tint ? C.creamS : C.cream, L = len2(sub(Hd, S)), wk = clamp(Math.sqrt(9.6 / Math.max(9.6, L)), .78, 1);
        const ang1 = Math.atan2(E[1] - S[1], E[0] - S[0]), ang2 = Math.atan2(Hd[1] - E[1], Hd[0] - E[0]);
        if (!artPart('braco', S[0], S[1], ang1, len2(sub(E, S)))) limb([S, E], 3.6 * wk, cA);
        if (!artPart('antebraco', E[0], E[1], ang2, len2(sub(Hd, E)))) limb([E, Hd], 3.3 * wk, cA);
        const W0 = [lerp(E[0], Hd[0], .66), lerp(E[1], Hd[1], .66)], W1 = [lerp(E[0], Hd[0], .8), lerp(E[1], Hd[1], .8)];
        limb([W0, W1], 4 * wk, tint ? C.blueS : C.blue);
        if (!artPart('cotovelo', E[0], E[1])) shape(ell(E[0], E[1], 1.85, 1.85), tint ? C.greyS : C.grey, { cel: { cx: E[0], cy: E[1], rx: 1.85, ry: 1.85, dx: .7, dy: .7, c: C.greyS } });
        if (!artPart('ombro', S[0], S[1])) shape(ell(S[0], S[1], 2, 2), tint ? C.greyS : C.grey, { cel: { cx: S[0], cy: S[1], rx: 2, ry: 2, dx: .8, dy: .8, c: C.greyS } });
      } });
      groups.push({ z: zH + .01, fn: () => {
        setM(base, Mt);
        const tint = d0 < -2.5 && !IKT, cA = tint ? C.creamS : C.cream, ang2 = Math.atan2(Hd[1] - E[1], Hd[0] - E[0]);
        // mão: luva redonda com o polegar para cima
        if (!artPart('mao', Hd[0], Hd[1], ang2)) {
          const ux = Math.cos(ang2), uy = Math.sin(ang2), hx = Hd[0] + ux * 1.2, hy = Hd[1] + uy * 1.2;
          const tx = hx - ux * .6 - uy * 2.1 * (lat < 0 ? 1 : -1), ty = hy - uy * .6 + ux * 2.1 * (lat < 0 ? 1 : -1);
          shape(ell(tx, ty, 1.2, 1.2), cA);
          shape(ell(hx, hy, 2.6, 2.4, ang2), cA, { cel: { cx: hx, cy: hy, rx: 2.6, ry: 2.4, dx: .9, dy: .9, c: C.creamS } });
        }
      } });
    };
    arm(latHit, P.hit, P.hitIK, true);
    arm(-latHit, P.off, P.offIK, false);
    // fones: concha do lado da câmera por cima da cabeça; a do outro lado por trás
    const cup = (lat) => {
      const fwd = -2.6, c = pj(lat * 15.4, fwd, -25.2), d = dep(lat * 15.4, fwd), rx = 1.7 + 3.6 * Math.abs(sth), near = d > 0;
      groups.push({ z: near ? 2.2 : 1.5, fn: () => {
        setM(base, Mh);
        if (artPart(near ? 'fone' : 'fone_tras', c[0], c[1])) return;
        if (near) limb([[c[0], c[1] - 4.4], [c[0] * .92, -36]], 1.7, C.cyanS);
        shape(ell(c[0], c[1], rx, 5.9), near ? C.cyan : C.cyanS, { cel: { cx: c[0], cy: c[1], rx, ry: 5.9, dx: 1, dy: 1.2, c: C.cyanS } });
        if (near && Math.abs(sth) > .25) shape(ell(c[0] + lat * -.2, c[1], rx * .5, 3.4), C.cyanL, { noOut: true });
      } });
    };
    cup(-1); cup(1);
    // cabeça + tela + boné + hélice
    groups.push({ z: 2, fn: () => {
      setM(base, Mh);
      if (!artPart('cabeca', 0, -15)) shape(rr(-15, -37.6, 30, 23.2, 8.4), C.cream, { cel: { cx: 0, cy: -26, rx: 15.5, ry: 12, dx: 2.4, dy: 2.2, c: C.creamS }, hi: ell(-9.6, -33.2, 3.4, 1.3, -.35) });
      const sw = 20 * (.8 + .2 * Math.abs(cth)), scx = 5.6 * sth;
      shape(rr(scx - sw / 2, -32.3, sw, 13.8, 4.6), C.scr, {
        noOut: true,
        after: () => {
          ctx.fillStyle = 'rgba(120,180,255,.10)'; ctx.beginPath(); ctx.moveTo(scx - sw / 2 + 2, -32.3); ctx.lineTo(scx - sw / 2 + 7, -32.3); ctx.lineTo(scx - sw / 2 + 2, -24); ctx.closePath(); ctx.fill();
          faceExpr(P.ex, scx + sth * .6, -25.2, .72 + .28 * Math.abs(cth), C.eye);
        },
      });
      // boné de gomos: os gomos giram com a cabeça (dá para ver a virada pelo boné)
      const cy = -36.4, rx = 14.7, ry = 11.4, br = 2.1;
      if (!artPart('bone', 0, cy)) {
        const dome = new Path2D(); dome.ellipse(0, cy, rx, ry, 0, Math.PI, TAU); dome.ellipse(0, cy, rx, br, 0, 0, Math.PI); dome.closePath();
        shape(dome, C.white, {
          after: () => {
            ctx.fillStyle = C.blue;
            const mer = (a, t) => [rx * Math.sin(a) * Math.cos(t), cy + br * Math.cos(a) * Math.cos(t) - ry * Math.sin(t)];
            for (let k = 0; k < 6; k += 2) {
              const a0 = ((((k * 60 - 30) * D + th) % TAU) + TAU + Math.PI) % TAU - Math.PI;
              for (const off of [0, -TAU]) {
                const lo = Math.max(a0 + off, -Math.PI / 2), hi = Math.min(a0 + off + 60 * D, Math.PI / 2); if (lo >= hi) continue;
                ctx.beginPath();
                for (let q = 0; q <= 8; q++) { const pt = mer(lo, q / 8 * Math.PI / 2); q ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]); }
                for (let q = 8; q >= 0; q--) { const pt = mer(hi, q / 8 * Math.PI / 2); ctx.lineTo(pt[0], pt[1]); }
                for (let q = 1; q <= 8; q++) { const a = hi - (hi - lo) * q / 8, pt = mer(a, 0); ctx.lineTo(pt[0], pt[1]); }
                ctx.closePath(); ctx.fill();
              }
            }
            ctx.strokeStyle = NV; ctx.lineWidth = IL * .8;
            for (let k = 0; k < 6; k++) { const a = ((((k * 60 - 30) * D + th) % TAU) + TAU + Math.PI) % TAU - Math.PI; if (Math.abs(a) > Math.PI / 2) continue; ctx.beginPath(); for (let q = 0; q <= 8; q++) { const pt = mer(a, q / 8 * Math.PI / 2); q ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]); } ctx.stroke(); }
          },
          cel: { cx: 0, cy: cy - 3, rx: rx + .5, ry: ry, dx: 2.6, dy: 1.5 }, hi: ell(-6.5, cy - 7.6, 3.2, 1.2, -.5),
        });
        // aba: meia-lua num plano deitado, projetada com o giro da cabeça
        const pts = [], N = 12, A0 = 62 * D;
        for (let q = 0; q <= N; q++) { const u = -A0 + 2 * A0 * q / N; pts.push(pj(rx * Math.sin(u) * .98, rx * Math.cos(u) * .98, cy + 1)); }
        for (let q = N; q >= 0; q--) { const u = -A0 + 2 * A0 * q / N; pts.push(pj((rx + 1.2) * Math.sin(u), rx * Math.cos(u) + 8.6 * Math.pow(Math.cos(u), .6), cy + 1)); }
        const brim = (dy) => { const pa = new Path2D(); pts.forEach((q, n) => (n ? pa.lineTo(q[0], q[1] + dy) : pa.moveTo(q[0], q[1] + dy))); pa.closePath(); return pa; };
        shape(brim(1.1), C.blueS); shape(brim(0), C.blue);
      }
      // hélice: haste, duas pás girando no plano deitado (rápido vira um borrão)
      const top = cy - ry, pv = Math.abs(s.pv);
      limb([[0, top + .5], [0, top - 2.6]], 1.2, C.greyS);
      if (!artPart('helice', 0, top - 3)) {
        if (pv > 15) shape(ell(0, top - 3, 7.4, 1.5), 'rgba(255,240,200,.55)', { noOut: true });
        for (let k = 0; k < 2; k++) {
          const a = s.prop + k * Math.PI, tip = pj(Math.cos(a) * 7.2, Math.sin(a) * 7.2, top - 3);
          shape(ell(tip[0] / 2, tip[1] - .1 + (top - 3 - tip[1]) * .5, Math.abs(tip[0]) / 2 + 1.1, 1.25), k ? C.yel : C.red, pv > 15 ? { noOut: true } : {});
        }
        shape(ell(0, top - 3, 1.2, 1.1), C.blue);
      }
    } });
    groups.sort((a, b) => a.z - b.z);
    PL = []; groups.forEach((g) => g.fn()); ctx.setTransform(base); flush(PL); PL = null;
  }

  /* ---------------------------------------------------------- Amiguinho (bolha com visor): amassa, estica e balança */
  function blobCols(v, i) {
    if (v.two) return { O: '#e86fa8', o: '#b24f80', crown: false };
    const o = v.opp(), t = o.team || {};
    return { O: o.O || t.O || '#e86fa8', o: o.o || t.o || '#b24f80', crown: !!o.crown };
  }
  function blobPath() {
    const bp = new Path2D(); bp.moveTo(0, -35); bp.bezierCurveTo(10.5, -35, 17.2, -27, 17.2, -16.5); bp.bezierCurveTo(17.2, -6, 11.5, -1.6, 0, -1.6);
    bp.bezierCurveTo(-11.5, -1.6, -17.2, -6, -17.2, -16.5); bp.bezierCurveTo(-17.2, -27, -10.5, -35, 0, -35); bp.closePath(); return bp;
  }
  const BLOB = blobPath();
  function drawBlob(v, p, i, tt, base) {
    const s = stOf('bl' + i), dt = clamp(tt - s.tt, 0, .05); s.tt = tt;
    const P = poseOf(v, p, i, tt, s, dt), col = blobCols(v, i);
    if (s.th === null) s.th = P.th; s.th += (P.th - s.th) * Math.min(1, dt * 11);
    const th = s.th, sth = Math.sin(th), cth = Math.cos(th);
    // gelatina: mola que leva um tranco quando a velocidade vertical muda de repente
    const dv = (p.vy - s.vy); s.vy = p.vy; if (Math.abs(dv) > 60) s.jv += clamp(dv, -600, 600) * .004;
    s.jv += (-s.j * 260 - s.jv * 9) * dt; s.j += s.jv * dt;
    const sq = (p.sq || 0) + s.j * .35;
    let sx = 1 - .16 * sq, sy = 1 + .2 * sq, bob = 0, rot = 0, lean = 0;
    if (P.anim === 'correndo') { const ph = p.ph || 0; bob = -Math.abs(Math.sin(ph)) * 2.2; lean = .1 * Math.sign(p.vx); sy *= 1 - .05 * Math.cos(2 * ph); sx *= 1 + .05 * Math.cos(2 * ph); }
    else if (P.anim === 'parado') { const b0 = Math.sin(tt * 3 + 2); sy *= 1 + .025 * b0; sx *= 1 - .02 * b0; }
    else if (P.anim === 'comemora') { bob = -Math.abs(Math.sin(tt * 7.5)) * 5; const k = Math.abs(Math.sin(tt * 7.5)); sy *= 1 + .1 * k - .08; sx *= 1 - .07 * k + .06; }
    else if (P.anim === 'triste') { sy *= .9; sx *= 1.07; }
    else if (P.anim === 'peixinho') { rot = P.rot * .26; bob = 0; sy *= .9; sx *= 1.1; }
    const Mw = new DOMMatrix().translate(p.x, p.y + bob - (P.anim === 'peixinho' ? P.lift * .2 : 0)).scale(CHAR_K).rotate((rot + lean) / D).scale(sx, sy);
    const pj = (lat, fwd, y) => [lat * cth + fwd * sth, y + (fwd * cth - lat * sth) * .14], dep = (lat, fwd) => fwd * cth - lat * sth;
    PL = [];
    const groups = [];
    // pés
    [0, 1].forEach((k) => {
      const lat = k ? 1 : -1, L = P.legs[k], f = pj(lat * 7.5, L.f * .8, -1.6 - L.l * .8), d = dep(lat * 7.5, L.f);
      groups.push({ z: d < 0 ? -2 : -1, fn: () => { setM(base, Mw); const rx = 3.4 + 1.4 * Math.abs(sth); shape(ell(f[0] + P.face * .8 * Math.abs(sth), f[1], rx, 2.3), d < -1 ? mix(col.o, '#000000', .18) : col.o, { cel: { cx: f[0], cy: f[1], rx, ry: 2.3, dx: .8, dy: .9 } }); } });
    });
    // corpo
    groups.push({ z: 0, fn: () => {
      setM(base, Mw);
      if (artPart('bolha', 0, 0)) return;
      shape(BLOB, col.O, { cel: { cx: 0, cy: -18.3, rx: 17.2, ry: 16.7, dx: 3.2, dy: 3.4, c: col.o }, hi: ell(-8.4, -27.6, 3.6, 1.9, -.6) });
      const vw = 22 * (.84 + .16 * Math.abs(cth)), vx = 6.6 * sth;
      shape(rr(vx - vw / 2, -25.4, vw, 12.6, 5.2), C.scr, { noOut: true, after: () => faceExpr(P.ex, vx + sth * .5, -18.9, .75 + .25 * Math.abs(cth), C.eye) });
      if (col.crown) {
        const cx = 2 * sth, c = new Path2D(); c.moveTo(cx - 6.5, -33.8); c.lineTo(cx - 7.4, -41); c.lineTo(cx - 3.4, -37.6); c.lineTo(cx, -43); c.lineTo(cx + 3.4, -37.6); c.lineTo(cx + 7.4, -41); c.lineTo(cx + 6.5, -33.8); c.closePath();
        shape(c, C.yel, { cel: { cx, cy: -37, rx: 7.4, ry: 5, dx: 1.6, dy: 1.6, c: '#d99b22' } });
        shape(ell(cx, -36.3, 1.2, 1.2), C.red); shape(ell(cx - 4.3, -35.6, .8, .8), C.cyan); shape(ell(cx + 4.3, -35.6, .8, .8), C.cyan);
      }
    } });
    // mãozinhas soltas (sem braço) — no golpe, um braço de borracha sai do corpo até a mão
    const hand = (latS, A, IKT, isHit) => {
      let H;
      if (IKT === 'swing') { const pose = swingPose(p, P.sf, p.sw.t, p.sw.gnd, p.sw.pow, p.sw.hit ? p.sw.L : v.b), H0 = pose.pts[0]; H = toLocal(Mw, H0.x, H0.y); }
      else if (IKT === 'cock') H = [-P.sf * 9 + 4 * P.sf, -38];
      else if (IKT && IKT.L) H = [IKT.L[0] * 1.15, IKT.L[1] - 6];
      else if (IKT) H = toLocal(Mw, IKT[0], IKT[1]);
      else { const ry = -14 - Math.sin(clamp(A.a, -1, 3)) * 9 - (A.b > 1.2 ? 12 : 0), fw = Math.sin(A.a) * 7; H = [latS * 21.5 + fw * sth, ry]; }
      const d = H[0] * sth, z = isHit && IKT && !IKT.L ? 3 : dep(latS * 19, 0) < -4 && !(IKT && IKT.L) ? -2.5 : 1;
      groups.push({ z, fn: () => {
        setM(base, Mw);
        const cA = z < 0 ? col.o : col.O;
        if (IKT && !IKT.L) {
          const c = [0, -18.3], dir = sub(H, c), dl = len2(dir) || 1, root = [c[0] + dir[0] / dl * 13, c[1] + dir[1] / dl * 13];
          const mid = [(root[0] + H[0]) / 2 - P.sf * 1.5, (root[1] + H[1]) / 2 + 2];
          limb([root, mid, H], 3.4 * clamp(Math.sqrt(14 / Math.max(14, len2(sub(H, root)))), .7, 1), cA, { curve: true });
        }
        shape(ell(H[0], H[1], 2.9, 2.7), cA, { cel: { cx: H[0], cy: H[1], rx: 2.9, ry: 2.7, dx: 1, dy: 1, c: col.o } });
        void d;
      } });
    };
    const latHit = -P.face;
    hand(latHit, P.hit, P.hitIK, true);
    hand(-latHit, P.off, P.offIK, false);
    groups.sort((a, b) => a.z - b.z); groups.forEach((g) => g.fn());
    ctx.setTransform(base); flush(PL); PL = null;
  }

  /* ---------------------------------------------------------- bola de praia vetorial (gomos giram com a bola) */
  const BALLC = ['#ef5b5b', '#fbfaf5', '#3f86e8', '#fbfaf5', '#ffcf3f', '#fbfaf5'];
  function drawBall(x, y, r, ang, sc = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.fillStyle = NV; ctx.beginPath(); ctx.arc(0, 0, r + OL, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
    const px = -r * .18, py = -r * .14;
    for (let k = 0; k < 6; k++) { ctx.fillStyle = BALLC[k]; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, r * 2.2, ang + k * TAU / 6, ang + (k + 1) * TAU / 6); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = NV; ctx.lineWidth = IL * .9;
    for (let k = 0; k < 6; k++) { const a = ang + k * TAU / 6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * r * 2.2, py + Math.sin(a) * r * 2.2); ctx.stroke(); }
    ctx.fillStyle = SHA; ctx.fill(crescent(0, 0, r, r, r * .3, r * .3), 'evenodd');
    ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(px, py, r * .2, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-r * .48, -r * .5, r * .2, r * .11, -.75, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ---------------------------------------------------------- cenário: praia ao entardecer em camadas planas */
  const HZ = 117, SHORE = 156; // horizonte e beira d'água
  const CLOUDS = [{ x: 60, y: 30, s: 1.1, sp: 2.2 }, { x: 205, y: 18, s: .8, sp: 1.6 }, { x: 330, y: 44, s: 1.25, sp: 2.8 }, { x: 140, y: 62, s: .7, sp: 3.4 }];
  const CROWD = [];
  { const cols = ['#9a7cf0', '#f08a3c', '#5cc7a0', '#e86fa8', '#ffcf3f', '#5aa0f0', '#f07070', '#b0d060'];
    let n = 0; for (const row of [0, 1]) for (let x = row ? 38 : 24; x < 380; x += row ? 27 : 23) { if (x > 168 && x < 232) continue; CROWD.push({ x: x + Math.sin(n * 7.3) * 4, row, c: cols[(n * 5 + row) % cols.length], ph: n * 1.37, ex: n % 5 === 0 ? 2 : n % 7 === 0 ? 1 : 0, up: n % 3 === 0 }); n++; } }
  function cloud(x, y, s, cA, cB) {
    const p = new Path2D(); const bumps = [[-18, 0, 9], [-6, -6, 12], [8, -4, 10], [19, 1, 7.5]];
    for (const [bx, by, r] of bumps) { p.moveTo(x + (bx + r) * s, y + by * s); p.arc(x + bx * s, y + by * s, r * s, 0, TAU); }
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, y + 5 * s); ctx.clip();
    ctx.strokeStyle = cB; ctx.lineWidth = 1.6; ctx.stroke(p); ctx.fillStyle = cA; ctx.fill(p);
    ctx.fillStyle = cB; ctx.fillRect(x - 26 * s, y + 2.4 * s, 52 * s, 3 * s);
    ctx.restore();
    ctx.strokeStyle = cB; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 25 * s, y + 5 * s); ctx.lineTo(x + 26 * s, y + 5 * s); ctx.stroke();
  }
  function palm(x, y, h, lean, s, tt, far) {
    const lw = far ? .7 : 1, n = far ? '#5a3f78' : NV, top = [x + lean * h, y - h];
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // tronco curvo em gomos
    const tr = (w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * h * .15, y - h * .55, top[0], top[1]); ctx.stroke(); };
    tr(5.6 * s + 2 * lw, n); tr(5.6 * s, far ? '#a77c8a' : '#c08a52');
    ctx.strokeStyle = far ? '#8f6a80' : '#93653a'; ctx.lineWidth = .7;
    for (let k = 1; k < 9; k++) { const t = k / 9, bx = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * (x + lean * h * .15) + t * t * top[0], by = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y - h * .55) + t * t * top[1]; ctx.beginPath(); ctx.moveTo(bx - 2.6 * s, by + .6); ctx.quadraticCurveTo(bx, by - .8, bx + 2.6 * s, by + .6); ctx.stroke(); }
    // folhas
    const sway = Math.sin(tt * 1.3 + x) * .05;
    const leaf = (a, L, c) => {
      const p = new Path2D(), ca = Math.cos(a), sa = Math.sin(a), tip = [top[0] + ca * L, top[1] + sa * L + L * .25], mid = [top[0] + ca * L * .5, top[1] + sa * L * .5 - L * .12];
      const nx = -sa, ny = ca, w = L * .16;
      p.moveTo(top[0], top[1]); p.quadraticCurveTo(mid[0] + nx * w * 1.4, mid[1] + ny * w * 1.4, tip[0], tip[1]); p.quadraticCurveTo(mid[0] - nx * w * .4, mid[1] - ny * w * .4, top[0], top[1]); p.closePath();
      ctx.strokeStyle = n; ctx.lineWidth = 2 * lw; ctx.stroke(p); ctx.fillStyle = c; ctx.fill(p);
      ctx.strokeStyle = far ? 'rgba(60,40,90,.35)' : 'rgba(20,60,40,.45)'; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.quadraticCurveTo(mid[0] + nx * w * .5, mid[1] + ny * w * .5, tip[0], tip[1]); ctx.stroke();
    };
    const g1 = far ? '#6f8f84' : '#2f9a64', g2 = far ? '#5d7a78' : '#237a52';
    [[-2.7, 30, g2], [-.4, 30, g2], [-2.1, 34, g1], [-1, 34, g1], [-3.1, 26, g1], [.1, 26, g1], [-1.57, 22, g2]].forEach(([a, L, c]) => leaf(a + sway + lean * .3, L * s, c));
    ctx.fillStyle = far ? '#7a5a68' : '#7a4b2a'; ctx.strokeStyle = n; ctx.lineWidth = .8;
    for (const [dx, dy] of [[-2, 2.5], [1.8, 2.8], [0, 4]]) { ctx.beginPath(); ctx.arc(top[0] + dx * s, top[1] + dy * s, 1.9 * s, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  function crowdBlob(c, tt, cheer, mood) {
    const k = c.row ? .44 : .38, y = c.row ? 170 : 163, hz = c.row ? .22 : .36, colO = mix(c.c, '#f3c8c0', hz), colS = mix(mix(c.c, '#2a1d5a', .3), '#f3c8c0', hz);
    const hop = cheer ? Math.max(0, Math.sin(tt * 11 + c.ph)) * 5 : Math.max(0, Math.sin(tt * 2 + c.ph)) * .6;
    ctx.save(); ctx.translate(c.x, y - hop); ctx.scale(k, k * (1 + (cheer ? .06 : .02) * Math.sin(tt * 11 + c.ph)));
    ctx.lineJoin = 'round'; const n = mix(NV, '#f3c8c0', hz * .8);
    if (cheer || c.up) { const w = Math.sin(tt * (cheer ? 14 : 3) + c.ph) * 2.5; for (const sx of [-1, 1]) { ctx.fillStyle = colO; ctx.strokeStyle = n; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(sx * (19 + w * sx), -36 - (cheer ? 6 : 0), 3.6, 0, TAU); ctx.fill(); ctx.stroke(); } }
    ctx.strokeStyle = n; ctx.lineWidth = 4.4; ctx.stroke(BLOB); ctx.fillStyle = colO; ctx.fill(BLOB);
    ctx.save(); ctx.clip(BLOB); ctx.fillStyle = colS; ctx.fill(crescent(0, -18.3, 17.2, 16.7, 3.4, 3.4), 'evenodd'); ctx.restore();
    ctx.fillStyle = mix(C.scr, '#f3c8c0', hz * .6); ctx.beginPath(); ctx.roundRect(-11, -25, 22, 12, 5); ctx.fill();
    faceExpr(cheer ? 2 : mood < -.4 ? 4 : c.ex, 0, -18.6, 1, mix(C.eye, '#ffffff', .2));
    ctx.restore();
  }
  function scene(v, tt) {
    const s = stOf('cam'), dt = clamp(tt - s.tt, 0, .05); s.tt = tt; s.j = s.j || W / 2; s.j = lerp(s.j, clamp(v.b.x, 40, W - 40), Math.min(1, dt * 1.5));
    const cam = s.j - W / 2, par = (k) => -cam * k;
    // céu em faixas chapadas com bordas onduladas
    const SKY = ['#3d3a8e', '#5e47a0', '#8d55a8', '#c9679f', '#ef8a8c', '#f8b184'];
    ctx.fillStyle = SKY[0]; ctx.fillRect(0, 0, W, HZ);
    SKY.slice(1).forEach((c, k) => { const y0 = 10 + k * 19; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, HZ); for (let x = 0; x <= W; x += 10) ctx.lineTo(x, y0 + Math.sin(x * .02 + k * 1.7) * 2.2); ctx.lineTo(W, HZ); ctx.closePath(); ctx.fill(); });
    // sol baixo, metade atrás do mar
    const sx = 300 + par(.02);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, HZ); ctx.clip();
    ctx.fillStyle = '#ffd98c'; ctx.beginPath(); ctx.arc(sx, HZ - 4, 30, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff0bf'; ctx.beginPath(); ctx.arc(sx, HZ - 4, 22, 0, TAU); ctx.fill();
    ctx.restore();
    // nuvens desenhadas (andam devagar, cada uma numa velocidade)
    CLOUDS.forEach((c, k) => { const x = ((c.x + tt * c.sp + par(.03 + k * .006)) % (W + 120) + W + 120) % (W + 120) - 60; cloud(x, c.y, c.s, k % 2 ? '#ffd3c4' : '#ffe2cf', k % 2 ? '#d58aa6' : '#d895a6'); });
    // ilha lá longe
    ctx.save(); ctx.translate(par(.04), 0);
    ctx.fillStyle = '#8a5d9a'; ctx.strokeStyle = '#6d4784'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(18, HZ); ctx.quadraticCurveTo(42, HZ - 15, 70, HZ - 13); ctx.quadraticCurveTo(96, HZ - 22, 122, HZ - 8); ctx.quadraticCurveTo(140, HZ - 4, 152, HZ); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a06fa8'; ctx.beginPath(); ctx.moveTo(30, HZ); ctx.quadraticCurveTo(52, HZ - 11, 72, HZ - 10); ctx.quadraticCurveTo(66, HZ - 4, 60, HZ); ctx.closePath(); ctx.fill();
    palm(92, HZ - 18, 14, .25, .32, tt, true); palm(102, HZ - 19, 11, -.2, .26, tt, true);
    ctx.restore();
    // mar: faixas, ondinhas desenhadas e o reflexo do sol
    ctx.fillStyle = '#4b5fb8'; ctx.fillRect(0, HZ, W, SHORE - HZ);
    ctx.fillStyle = '#4f7cc8'; ctx.fillRect(0, HZ + 12, W, SHORE - HZ - 12);
    ctx.fillStyle = '#4fa2cf'; ctx.fillRect(0, HZ + 26, W, SHORE - HZ - 26);
    ctx.fillStyle = '#3a4a9e'; ctx.fillRect(0, HZ, W, 1.2);
    for (let k = 0; k < 7; k++) { const yy = HZ + 4 + k * 5, w = 26 - k * 2.6 + Math.sin(tt * 3 + k) * 2, a = .7 - k * .07; ctx.fillStyle = `rgba(255,226,160,${a})`; ctx.beginPath(); ctx.roundRect(sx - w / 2 + Math.sin(tt * 2 + k * 2) * 2, yy, w, 1.4, .7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = .8; ctx.lineCap = 'round';
    for (let k = 0; k < 16; k++) { const row = k % 4, yy = HZ + 7 + row * 9, x = ((k * 61 + tt * (6 + row * 3) + par(.05 + row * .01)) % (W + 40) + W + 40) % (W + 40) - 20, w = 4 + row * 1.6; ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.quadraticCurveTo(x - w / 2, yy - 1.4, x, yy); ctx.quadraticCurveTo(x + w / 2, yy - 1.4, x + w, yy); ctx.stroke(); }
    // espuma na beira (vai e volta)
    const wash = Math.sin(tt * .9) * 2.4;
    ctx.fillStyle = '#9fe0e8'; ctx.beginPath(); ctx.moveTo(0, SHORE - 4); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, SHORE - 3 + wash * .4 + Math.sin(x * .06 + tt * 1.4) * 1.3); ctx.lineTo(W, SHORE + 3); ctx.lineTo(0, SHORE + 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0, SHORE); for (let x = 0; x <= W; x += 6) ctx.lineTo(x, SHORE - 1 + wash + Math.sin(x * .09 + tt * 1.8) * 1.4); ctx.lineTo(W, SHORE + 2 + wash); ctx.lineTo(0, SHORE + 2 + wash); ctx.closePath(); ctx.fill();
    // areia: faixa molhada, areia seca, uma duna e sombra suave perto da câmera
    ctx.fillStyle = '#e9b98a'; ctx.fillRect(0, SHORE + 1 + wash, W, H);
    ctx.fillStyle = '#f5cf98'; ctx.beginPath(); ctx.moveTo(0, SHORE + 7); for (let x = 0; x <= W; x += 10) ctx.lineTo(x, SHORE + 6 + Math.sin(x * .03) * 1.5); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#efc189'; ctx.beginPath(); ctx.moveTo(0, 188); ctx.quadraticCurveTo(90, 180, 200, 186); ctx.quadraticCurveTo(310, 192, 400, 183); ctx.lineTo(400, 225); ctx.lineTo(0, 225); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e4ad78'; ctx.beginPath(); ctx.moveTo(0, 213); ctx.quadraticCurveTo(120, 208, 220, 214); ctx.quadraticCurveTo(320, 219, 400, 211); ctx.lineTo(400, 225); ctx.lineTo(0, 225); ctx.closePath(); ctx.fill();
    // marquinhas na areia (conchas e pegadas), sempre nos mesmos lugares
    ctx.fillStyle = 'rgba(190,120,80,.35)';
    for (let k = 0; k < 22; k++) { const x = (k * 97.3) % W, y = 175 + ((k * 37) % 46); if (Math.abs(y - VGY) < 4) continue; ctx.beginPath(); ctx.ellipse(x, y, 1.6, .6, 0, 0, TAU); ctx.fill(); }
    for (const [x, y, c] of [[64, 214, '#ffd1dc'], [318, 216, '#fff2cf'], [140, 179, '#ffe3c4']]) { ctx.fillStyle = c; ctx.strokeStyle = '#b8786a'; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(x - 2.4, y); ctx.quadraticCurveTo(x, y - 3.4, x + 2.4, y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    // coqueiros no meio do caminho (mais perto: mexem mais com a câmera)
    palm(14 + par(.07), 172, 108, .24, 1, tt, false);
    palm(386 + par(.07), 172, 96, -.28, .92, tt, false);
    // torcida de Amiguinhos atrás da quadra
    const cheer = v.cheer > 0;
    ctx.save(); ctx.translate(par(.055), 0);
    for (const c of CROWD) if (!c.row) crowdBlob(c, tt, cheer, v.mood || 0);
    for (const c of CROWD) if (c.row) crowdBlob(c, tt, cheer, v.mood || 0);
    ctx.restore();
    // linhas da quadra (fita azul na areia)
    ctx.strokeStyle = 'rgba(47,116,220,.75)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(30, 190); ctx.lineTo(370, 190); ctx.stroke();
    ctx.lineWidth = 1.9; ctx.beginPath(); ctx.moveTo(12, 216); ctx.lineTo(388, 216); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(30, 190); ctx.lineTo(12, 216); ctx.moveTo(370, 190); ctx.lineTo(388, 216); ctx.stroke();
  }
  function net() {
    // rede vista de leve na diagonal: faixa de malha entre o poste de trás e o da frente
    const x0 = VNX, top = VNT, bot = VNT + 46, w = 1, back = [x0 + 15, top - 9];
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // poste de trás
    ctx.strokeStyle = NV; ctx.lineWidth = 3.4 + 2 * OL * .8; ctx.beginPath(); ctx.moveTo(back[0], back[1] - 3); ctx.lineTo(back[0], VGY - 13); ctx.stroke();
    ctx.strokeStyle = '#cfc6d8'; ctx.lineWidth = 3.4; ctx.stroke();
    // malha
    const quad = new Path2D(); quad.moveTo(x0 - w / 2, top); quad.lineTo(back[0] + w / 2 - 4, back[1]); quad.lineTo(back[0] + w / 2 - 4, back[1] + 46); quad.lineTo(x0 - w / 2, bot); quad.closePath();
    ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fill(quad);
    ctx.save(); ctx.clip(quad); ctx.strokeStyle = 'rgba(27,31,79,.7)'; ctx.lineWidth = .6;
    for (let k = 0; k <= 5; k++) { const u = k / 5; ctx.beginPath(); ctx.moveTo(x0 + u * 14, top - u * 9 - 2); ctx.lineTo(x0 + u * 14, bot - u * 9 + 2); ctx.stroke(); }
    for (let k = 1; k <= 12; k++) { const yy = k * 46 / 12; ctx.beginPath(); ctx.moveTo(x0, top + yy); ctx.lineTo(x0 + 14, top - 9 + yy); ctx.stroke(); }
    ctx.restore();
    // fita de cima (branca) e corda de baixo
    ctx.strokeStyle = NV; ctx.lineWidth = 3.2 + 2 * OL; ctx.beginPath(); ctx.moveTo(x0 - w / 2, top); ctx.lineTo(back[0] + w / 2 - 4, back[1]); ctx.stroke();
    ctx.strokeStyle = C.white; ctx.lineWidth = 3.2; ctx.stroke();
    ctx.strokeStyle = NV; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0 - w / 2, bot); ctx.lineTo(back[0] + w / 2 - 4, back[1] + 46); ctx.stroke();
    // poste da frente (listras vermelhas)
    const pole = new Path2D(); pole.roundRect(x0 - 1.9, top - 4, 3.8, VGY + 3 - (top - 4), 1.9);
    ctx.lineWidth = 2 * OL; ctx.strokeStyle = NV; ctx.stroke(pole); ctx.fillStyle = C.white; ctx.fill(pole);
    ctx.save(); ctx.clip(pole); ctx.fillStyle = C.red; for (let y = top + 2; y < VGY; y += 10) ctx.fillRect(x0 - 3, y, 6, 4.4);
    ctx.fillStyle = SHA; ctx.fillRect(x0 + .5, top - 5, 3, VGY); ctx.restore();
    ctx.lineWidth = IL; ctx.stroke(pole);
    ctx.restore();
  }
  function shadowE(x, y, rx, ry, a) { ctx.fillStyle = `rgba(150,72,48,${a})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); }

  /* ---------------------------------------------------------- placar desenhado */
  function scoreboard(v) {
    const n = v.names ? v.names() : ['IAmiguinho', 'Amiguinho'], col = blobCols(v, 1), y = 5, h = 19, w = 46, cx = W / 2;
    ctx.save(); ctx.lineJoin = 'round';
    const pill = (x, c, sc, nm, al) => {
      ctx.fillStyle = NV; ctx.beginPath(); ctx.roundRect(x - OL, y - OL, w + 2 * OL, h + 2 * OL + 1.2, 7); ctx.fill();
      ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.roundRect(x + 2, y + 1.6, w - 4, 3, 1.5); ctx.fill();
      ctx.font = `700 14px ${FONT}`; ctx.textBaseline = 'middle'; ctx.textAlign = al ? 'right' : 'left';
      ctx.lineWidth = 2.4; ctx.strokeStyle = NV; ctx.fillStyle = '#ffffff';
      const tx = al ? x + w - 5 : x + 5; ctx.strokeText(String(sc), tx, y + h / 2 + 1); ctx.fillText(String(sc), tx, y + h / 2 + 1);
      ctx.font = `700 5px ${FONT}`; ctx.textAlign = al ? 'left' : 'right'; ctx.lineWidth = 1.4;
      const nm2 = nm.replace('Amiguinho ', '').toUpperCase(), lx = al ? x + 4.5 : x + w - 4.5; ctx.strokeText(nm2, lx, y + h / 2 + .8); ctx.fillText(nm2, lx, y + h / 2 + .8);
    };
    pill(cx - w - 3, C.blue, v.sc[0], n[0], false); pill(cx + 3, col.O, v.sc[1], n[1], true);
    ctx.fillStyle = C.yel; ctx.strokeStyle = NV; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, y + h / 2, 4.6, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = NV; ctx.font = `700 4.6px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(String(v.target ? v.target() : 7), cx, y + h / 2 + .4);
    // toques: três bolinhas embaixo de quem está com a bola
    if (v.state === 'rally' && v.touches) for (const side of [0, 1]) {
      const bx = side ? cx + 3 + w / 2 : cx - 3 - w / 2;
      for (let k = 0; k < 3; k++) { ctx.fillStyle = k < v.touches[side] ? C.yel : 'rgba(255,255,255,.35)'; ctx.strokeStyle = NV; ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(bx + (k - 1) * 5, y + h + 5.2, 1.7, 0, TAU); ctx.fill(); ctx.stroke(); }
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------- desenho principal do vôlei */
  volei.draw = function (tt) {
    const base = ctx.getTransform();
    ctx.imageSmoothingEnabled = true;
    scene(this, tt);
    const b = this.b, o = this.opp();
    let bv = { x: b.x, y: b.y };
    if (this.state === 'serve' && this.held) { bv = heldPos(this, this.server); this._hold = bv; }
    else if (this.state === 'rally' && this.hits === 0 && this._hold && (this.tossT ?? 9) < .16) { const k = ease(this.tossT / .16); bv = { x: lerp(this._hold.x, b.x, k), y: lerp(this._hold.y, b.y, k) }; }
    // sombras (diminuem com a altura)
    { const hb = Math.max(0, VGY - (bv.y + VRB)), k = clamp(1 - hb / 170, .2, 1); shadowE(bv.x, VGY + 1, 3 + 10 * k, 1 + 1.7 * k, .1 + .3 * k); }
    this.P.forEach((p, i) => { const k = clamp(1 - (VGY - p.y) / 90, .35, 1); shadowE(p.x, VGY + 1, (i ? 15 : 12) * k, 2.4, .32 * k); });
    if (this.flash) this.flash = Math.max(0, this.flash - 1 / 60);
    for (const f of this.fx || []) { ctx.fillStyle = `rgba(214,150,92,${1 - f.t / .55})`; ctx.beginPath(); ctx.arc(f.x, f.y, 1.1, 0, TAU); ctx.fill(); }
    if (b.fire > 0) {
      b.trail = b.trail || []; b.trail.unshift({ x: b.x, y: b.y }); if (b.trail.length > 14) b.trail.pop();
      b.trail.forEach((q, k) => { ctx.globalAlpha = (1 - k / 14) * Math.min(1, b.fire) * .85; ctx.fillStyle = k < 4 ? '#ffffff' : k < 8 ? '#7ff0ff' : '#ff9a2a'; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(2, VRB - k * .6), 0, TAU); ctx.fill(); });
      ctx.globalAlpha = 1;
    } else if (b.trail) b.trail = null;
    net();
    // rastro do braço na cortada: um borrão em leque por onde a mão passou
    this.P.forEach((p, i) => {
      if (!p.sw) return; const face = i ? -1 : 1, pts = [];
      for (let k = 0; k < 7; k++) { const t2 = p.sw.t - k * .013; if (t2 < SPK.T * .15) break; pts.push(swingPose(p, face, t2, p.sw.gnd, p.sw.pow, p.sw.hit ? p.sw.L : this.b).pts[0]); }
      if (pts.length > 1) { ctx.save(); ctx.lineCap = 'round'; for (let k = 1; k < pts.length; k++) { ctx.globalAlpha = .55 * (1 - k / pts.length); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5 * (1 - k / pts.length) + 1; ctx.beginPath(); ctx.moveTo(pts[k - 1].x, pts[k - 1].y); ctx.lineTo(pts[k].x, pts[k].y); ctx.stroke(); } ctx.restore(); }
    });
    this.P.forEach((p, i) => { if (i === 0) drawIA(this, p, i, tt, base); else drawBlob(this, p, i, tt, base); });
    ctx.setTransform(base);
    drawBall(bv.x, bv.y, VRB, b.ang, this.state === 'serve' && this.held ? Math.max(1, (this.ballR + 1.2) / VRB) : 1);
    // bola fora da tela, lá no alto: setinha mostrando onde ela está
    if (b.y + VRB < 0) {
      const k = clamp(1 + (b.y + VRB) / 160, .45, 1), x = clamp(b.x, 8, W - 8), s2 = 3 + 2.5 * k;
      ctx.save(); ctx.globalAlpha = .6 + .4 * k; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x + s2, 2 + s2 * 1.3); ctx.lineTo(x - s2, 2 + s2 * 1.3); ctx.closePath();
      ctx.lineWidth = 2 * OL; ctx.strokeStyle = NV; ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
    }
    scoreboard(this);
    // especial: tudo para, a tela escurece e aparece a seta de mira saindo da bola
    if (this.special) {
      const S = this.special, f = S.i ? -1 : 1;
      ctx.fillStyle = 'rgba(20,18,70,.45)'; ctx.fillRect(0, 0, W, H);
      if (S.from && S.t < .5) { ctx.globalAlpha = (1 - S.t / .5) * .8; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + S.t * 9, r = 6 + S.t * 40; ctx.fillStyle = '#7ff0ff'; ctx.beginPath(); ctx.arc(S.from.x + Math.cos(a) * r, S.from.y - 20 + Math.sin(a) * r, 1.6, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
      drawBall(b.x, b.y, VRB, b.ang);
      const ca = Math.cos(S.ang) * f, sa = Math.sin(S.ang), L0 = VRB + 4, L1 = VRB + 46, pl = .5 + .5 * Math.sin(tt * 10);
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = NV; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(b.x + ca * L0, b.y + sa * L0); ctx.lineTo(b.x + ca * L1, b.y + sa * L1); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.lineDashOffset = -tt * 20; ctx.stroke(); ctx.setLineDash([]);
      const hx = b.x + ca * (L1 + 6), hy = b.y + sa * (L1 + 6), nx = -sa, ny = ca;
      ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(hx + ca * 2, hy + sa * 2); ctx.lineTo(hx - ca * 9 + nx * 6.5, hy - sa * 9 + ny * 6.5); ctx.lineTo(hx - ca * 9 - nx * 6.5, hy - sa * 9 - ny * 6.5); ctx.closePath();
      ctx.lineWidth = 2 * OL; ctx.strokeStyle = NV; ctx.stroke(); ctx.fillStyle = `rgb(${200 + 55 * pl | 0},245,255)`; ctx.fill();
      ctx.globalAlpha = .4 + .4 * pl; ctx.strokeStyle = '#7ff0ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(b.x, b.y, VRB + 3 + pl * 2, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    // especial: clarão, ondas de choque e faíscas
    if (this.specFx) {
      const F = this.specFx; F.t += 1 / 60;
      if (F.t < .22) { ctx.fillStyle = `rgba(255,255,240,${.75 * (1 - F.t / .22)})`; ctx.fillRect(0, 0, W, H); }
      ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) { const tk = F.t - k * .07; if (tk <= 0 || tk > .5) continue; ctx.globalAlpha = 1 - tk / .5; ctx.strokeStyle = k === 1 ? '#7ff0ff' : '#ffffff'; ctx.beginPath(); ctx.arc(F.x, F.y, 8 + tk * 160, 0, TAU); ctx.stroke(); }
      if (F.t < .35) for (let k = 0; k < 10; k++) { const a = F.ang + (k - 4.5) * .08, l0 = 14 + F.t * 120, l1 = l0 + 26; ctx.globalAlpha = (1 - F.t / .35) * .8; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(F.x - Math.cos(a) * F.f * l0, F.y - Math.sin(a) * l0); ctx.lineTo(F.x - Math.cos(a) * F.f * l1, F.y - Math.sin(a) * l1); ctx.stroke(); }
      for (const q of F.sparks) { q.x += q.vx / 60; q.y += q.vy / 60; q.vy += 300 / 60; q.vx *= .97; ctx.globalAlpha = Math.max(0, 1 - F.t / .7); ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, 1.2, 0, TAU); ctx.fill(); }
      ctx.restore(); if (F.t > .75) this.specFx = null;
    }
  };

  /* ---------------------------------------------------------- textos que sobem e avisos, com letra lisa e contorno */
  const textO = (s, x, y, size, fill, lw = 2.2) => { ctx.font = `700 ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; if (lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = NV; ctx.strokeText(s, x, y); } ctx.fillStyle = fill; ctx.fillText(s, x, y); };
  drawPops = function () {
    ctx.save();
    for (const p of pops) {
      const str = String(p.s).toUpperCase(), size = p.big ? 10 : 7.5;
      ctx.font = `700 ${size}px ${FONT}`; const w = ctx.measureText(str).width, x = clamp(p.x, w / 2 + 6, W - w / 2 - 6);
      const pop0 = p.t < .12 ? .6 + .4 * ease(p.t / .12) + .15 * Math.sin(p.t / .12 * Math.PI) : 1, y = p.y - ease(Math.min(1, p.t * 1.4)) * 16 - 7;
      ctx.globalAlpha = p.t > .75 ? 1 - (p.t - .75) / .25 : 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(pop0, pop0);
      if (p.big) { ctx.fillStyle = NV; ctx.beginPath(); ctx.roundRect(-w / 2 - 6, -8, w + 12, 16, 8); ctx.fill(); }
      textO(str, 0, .5, size, p.c, p.big ? 1.6 : 2.2);
      ctx.restore();
    }
    ctx.restore();
  };
  drawBanner = function () {
    if (!banner) return;
    const str = banner.s.toUpperCase(), y = (cur.bannerY ?? 84) + 12, k = banner.t < .16 ? ease(banner.t / .16) : 1;
    ctx.save(); ctx.font = `700 9px ${FONT}`; const w = Math.min(W - 16, ctx.measureText(str).width + 26);
    ctx.translate(W / 2, y); ctx.scale(k, k); ctx.rotate(-.015);
    ctx.fillStyle = NV; ctx.beginPath(); ctx.roundRect(-w / 2 - 1.5, -11.5, w + 3, 24.5, 11); ctx.fill();
    ctx.fillStyle = '#2b2f72'; ctx.beginPath(); ctx.roundRect(-w / 2, -10, w, 20, 10); ctx.fill();
    ctx.strokeStyle = banner.c; ctx.lineWidth = .9; ctx.beginPath(); ctx.roundRect(-w / 2 + 2.2, -7.8, w - 4.4, 15.6, 8); ctx.stroke();
    textO(str, 0, .6, 9, banner.c, 0);
    ctx.restore();
  };
})();
