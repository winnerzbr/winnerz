  /* ============================================================ IAmiguinho INTEIRO
     Cada pose da folha é um desenho só. Por cima dele há uma malha de triângulos e, por dentro, ossos
     (tronco, cabeça, braços, mãos, pernas, pés). Quando um osso gira ou estica, a pintura em volta vai junto
     (sem emendas). Poses: tres4 (parado e toques), corre, corta (pulo e cortada), mergulho, frente.
     A malha é desenhada com WebGL numa tela pequena e depois colada na cena. */
  const PZ = window.C2P;
  const G3 = { ok: false, tried: false };
  const BIX = PZ ? Object.fromEntries(PZ.bones.map((b, k) => [b, k])) : {};
  function gl3() {
    if (G3.tried) return G3.ok; G3.tried = true;
    try {
      const c = document.createElement('canvas'); c.width = 640; c.height = 640;
      const gl = c.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
      if (!gl || !PZ) return false;
      const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p;attribute vec2 u;uniform vec4 bx;varying vec2 vu;void main(){vu=u;gl_Position=vec4((p.x-bx.x)/bx.z*2.0-1.0,1.0-(p.y-bx.y)/bx.w*2.0,0.0,1.0);}'));
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, 'precision mediump float;varying vec2 vu;uniform sampler2D tx;void main(){gl_FragColor=texture2D(tx,vu);}'));
      gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
      gl.useProgram(pr); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      Object.assign(G3, { c, gl, pr, aP: gl.getAttribLocation(pr, 'p'), aU: gl.getAttribLocation(pr, 'u'), uB: gl.getUniformLocation(pr, 'bx'), pose: {} });
      for (const [nm, q] of Object.entries(PZ.poses)) {
        const im = new Image(); im.src = q.src;
        const uv = new Float32Array(q.v.length); for (let k = 0; k < q.v.length; k += 2) { uv[k] = q.v[k] / q.w; uv[k + 1] = q.v[k + 1] / q.h; }
        const bu = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bu); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
        const bi = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bi); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(q.t), gl.STATIC_DRAW);
        const bp = gl.createBuffer(), pos = new Float32Array(q.v.length);
        G3.pose[nm] = { q, im, bu, bi, bp, pos, tex: null, n: q.t.length };
      }
      G3.ok = true;
    } catch (e) { G3.ok = false; }
    return G3.ok;
  }
  const poseReady = (nm) => { const P0 = G3.pose[nm]; if (!P0) return false; if (P0.tex) return true; if (!(P0.im.complete && P0.im.naturalWidth)) return false;
    const gl = G3.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, P0.im);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    P0.tex = t; return true; };
  const QIM = {};
  if (PZ && PZ.quadros) for (const [nm, q] of Object.entries(PZ.quadros)) { QIM[nm] = new Image(); QIM[nm].src = q.src2 || q.src; }
  const qReady = () => Object.values(QIM).every((im) => im.complete && im.naturalWidth > 0);
  const INTEIRO = () => gl3() && ['tres4', 'corre', 'corta', 'mergulho', 'frente'].every(poseReady) && qReady();
  // ponto de um quadro inteiro em unidades locais (pés no 0; no ar, o meio do corpo em -18)
  const QOFF = 23; // nos desenhos de 3/4, o corpo fica um pouco atrás da tela do rosto
  const qLocal = (fr, x, y) => { const q = PZ.quadros[fr], ax = q.ax - (fr === 'festa' ? 0 : QOFF); return [(x - ax) / PXU, (y - q.ay) / PXU + (q.air ? -18 : 0)]; };
  // bola segura no saque: na mão do desenho (a bola do jogo é maior, então sobe um pouco para ficar apoiada na mão)
  function heldIA(p, f) {
    const q = PZ.quadros.saque, K = CHAR_K * 1.22, [x, y] = qLocal('saque', q.ball[0], q.ball[1] + q.ball[2]);
    return { x: p.x + f * x * K, y: p.y + y * K - VRB };
  }
  // altura do quadril (unidades, pés no 0) em cada pose
  const HIPY = { tres4: null, corre: null, corta: -16, mergulho: -9, frente: null };
  const angOf = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const rotP = (p, c, a) => { const s = Math.sin(a), co = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * co - y * s, c[1] + x * s + y * co]; };
  const angLerp = (a, b, k) => { let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * k; };
  // monta o esqueleto atual: R = juntas de descanso (unidades), D = pedidos (giros, alvos de mão, mistura de pernas)
  function skeleton(R, D) {
    const Q = {}, put = (b, a, c) => { Q[b] = [a, c]; };
    const hip = [R.hip[0] + (D.dx || 0), R.hip[1] + (D.dy || 0)];
    const tA = angOf(R.hip, R.neck) + (D.t || 0), tL = len2(sub(R.neck, R.hip)) * (D.ts || 1);
    const neck = [hip[0] + Math.cos(tA) * tL, hip[1] + Math.sin(tA) * tL]; put('tronco', hip, neck);
    const tRot = (p) => { const r = rotP(p, R.hip, D.t || 0); return [r[0] + hip[0] - R.hip[0], r[1] + hip[1] - R.hip[1]]; };
    const hA = angOf(R.neck, R.top) + (D.t || 0) + (D.h || 0), hL = len2(sub(R.top, R.neck));
    put('cabeca', neck, [neck[0] + Math.cos(hA) * hL, neck[1] + Math.sin(hA) * hL]);
    const limb = (side, isArm) => {
      const n = isArm ? [`sh${side}`, `el${side}`, `wr${side}`, `hd${side}`] : [`hp${side}`, `kn${side}`, `an${side}`, `ft${side}`];
      const bn = isArm ? [`${side}_braco`, `${side}_ante`, `${side}_mao`] : [`${side}_coxa`, `${side}_canela`, `${side}_pe`];
      const o = (isArm ? D.arm : D.leg)[side] || {};
      // ângulos de descanso; "mix" leva o membro em direção aos ângulos do outro lado (troca de passada)
      const other = side === 'A' ? 'B' : 'A', no = n.map((x) => x.slice(0, 2) + other);
      let a1 = angOf(R[n[0]], R[n[1]]), a2 = angOf(R[n[1]], R[n[2]]), a3 = angOf(R[n[2]], R[n[3]]);
      if (o.mix) { a1 = angLerp(a1, angOf(R[no[0]], R[no[1]]), o.mix); a2 = angLerp(a2, angOf(R[no[1]], R[no[2]]), o.mix); a3 = angLerp(a3, angOf(R[no[2]], R[no[3]]), o.mix); }
      const L1 = len2(sub(R[n[1]], R[n[0]])), L2 = len2(sub(R[n[2]], R[n[1]])), L3 = len2(sub(R[n[3]], R[n[2]]));
      const S = isArm ? tRot(R[n[0]]) : [R[n[0]][0] + hip[0] - R.hip[0], R[n[0]][1] + hip[1] - R.hip[1]];
      const tw = isArm ? D.t || 0 : 0;
      let E, W;
      if (o.T) {
        // alcançar um ponto: dobra para o mesmo lado do desenho (nunca ao contrário)
        const restBend = Math.sign(crs(sub(R[n[1]], R[n[0]]), sub(R[n[2]], R[n[1]]))) || (isArm ? -1 : 1);
        E = ik2(S, o.T, L1, L2, restBend); W = o.T;
        // o desenho só aguenta girar até certo ponto sem rasgar: limita o giro em relação ao descanso
        const MX = o.max ?? 1.0, r1 = a1, r2 = a2, s1 = len2(sub(E, S)) / L1, s2 = len2(sub(W, E)) / L2;
        const c1 = r1 + clamp(angLerp(0, angOf(S, E) - r1, 1), -MX, MX), c2 = r2 + clamp(angLerp(0, angOf(E, W) - r2, 1), -MX * 1.2, MX * 1.2);
        E = [S[0] + Math.cos(c1) * L1 * s1, S[1] + Math.sin(c1) * L1 * s1]; W = [E[0] + Math.cos(c2) * L2 * s2, E[1] + Math.sin(c2) * L2 * s2];
        a3 = c2 + (a3 - a2) * (o.handK ?? 1) + (o.d3 || 0);
      } else {
        a1 += tw + (o.d1 || 0); a2 += tw + (o.d1 || 0) + (o.d2 || 0); a3 += tw + (o.d1 || 0) + (o.d2 || 0) + (o.d3 || 0);
        E = [S[0] + Math.cos(a1) * L1, S[1] + Math.sin(a1) * L1]; W = [E[0] + Math.cos(a2) * L2, E[1] + Math.sin(a2) * L2];
      }
      put(bn[0], S, E); put(bn[1], E, W); put(bn[2], W, [W[0] + Math.cos(a3) * L3, W[1] + Math.sin(a3) * L3]);
    };
    limb('A', true); limb('B', true); limb('A', false); limb('B', false);
    return Q;
  }
  // deforma a malha (cada vértice segue os seus ossos, com pesos) e desenha
  const BX = [-45, -64, 90, 90];
  function drawMesh(nm, R, Q) {
    const P0 = G3.pose[nm], q = P0.q, gl = G3.gl, B = PZ.bones, NB = B.length;
    const T = new Float32Array(NB * 8); // por osso: p0(2) u(2) q0(2) u'(2) e as escalas vão em S
    const S = new Float32Array(NB * 2);
    for (let k = 0; k < NB; k++) {
      const [a, b] = PZ.seg[B[k]], p0 = R[a], p1 = R[b], [q0, q1] = Q[B[k]];
      const L = len2(sub(p1, p0)) || .01, L2 = len2(sub(q1, q0)) || .01, st = L2 / L;
      T.set([p0[0], p0[1], (p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L, q0[0], q0[1], (q1[0] - q0[0]) / L2, (q1[1] - q0[1]) / L2], k * 8);
      S[k * 2] = st; S[k * 2 + 1] = k < 2 ? 1 : clamp(1 / Math.sqrt(st), .82, 1.12);
    }
    const v = q.v, bi = q.bi, bw = q.bw, pos = P0.pos, hx = R.hip0[0], hy = R.hip0[1];
    for (let i = 0, n = v.length / 2; i < n; i++) {
      const x = (v[i * 2] - q.j.hip[0]) / PXU + hx, y = (v[i * 2 + 1] - q.j.hip[1]) / PXU + hy;
      let ox = 0, oy = 0;
      for (let c = 0; c < 3; c++) {
        const w = bw[i * 3 + c]; if (w < .001) continue; const k = bi[i * 3 + c], o = k * 8;
        const dx = x - T[o], dy = y - T[o + 1], ux = T[o + 2], uy = T[o + 3], al = (dx * ux + dy * uy) * S[k * 2], ac = (-dx * uy + dy * ux) * S[k * 2 + 1];
        ox += w * (T[o + 4] + T[o + 6] * al - T[o + 7] * ac); oy += w * (T[o + 5] + T[o + 7] * al + T[o + 6] * ac);
      }
      pos[i * 2] = ox; pos[i * 2 + 1] = oy;
    }
    gl.viewport(0, 0, G3.c.width, G3.c.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform4f(G3.uB, BX[0], BX[1], BX[2], BX[3]);
    gl.bindBuffer(gl.ARRAY_BUFFER, P0.bp); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(G3.aP); gl.vertexAttribPointer(G3.aP, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, P0.bu); gl.enableVertexAttribArray(G3.aU); gl.vertexAttribPointer(G3.aU, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, P0.bi); gl.bindTexture(gl.TEXTURE_2D, P0.tex);
    gl.drawElements(gl.TRIANGLES, P0.n, gl.UNSIGNED_SHORT, 0);
    ctx.drawImage(G3.c, BX[0], BX[1], BX[2], BX[3]);
  }
  // juntas de descanso da pose, em unidades (quadril na altura certa, pés no 0)
  const restCache = {};
  function restOf(nm) {
    if (restCache[nm]) return restCache[nm];
    const q = PZ.poses[nm], hy = HIPY[nm] ?? -(q.sole - q.j.hip[1]) / PXU, R = { hip0: [0, hy] };
    for (const [k, p] of Object.entries(q.j)) R[k] = [(p[0] - q.j.hip[0]) / PXU, (p[1] - q.j.hip[1]) / PXU + hy];
    return (restCache[nm] = R);
  }
  function drawIA3(v, p, i, tt, base) {
    const s = stOf('ia3' + i), dt = clamp(tt - s.tt, 0, .05); s.tt = tt;
    const P = poseOf(v, p, i, tt, s, dt);
    if (s.F === undefined) s.F = P.face; s.F += (P.face - s.F) * Math.min(1, dt * 14);
    const sg = Math.sign(s.F) || 1, fx = sg * Math.max(.6, Math.abs(s.F));
    const sq = p.sq || 0, sx = 1 - .1 * sq, sy = 1 + .13 * sq, an = P.anim;
    // qual desenho e o que mexer nele
    let nm = 'tres4', D = { arm: {}, leg: {} }, rot = P.rot, bob = P.bob * .8;
    const front = an === 'comemora' || an === 'triste';
    if (an === 'correndo') {
      nm = 'corre'; const ph = p.ph || 0, k = (1 - Math.sin(ph)) / 2;
      // a passada: braços e pernas vão trocando de lugar (o desenho tem uma perna atrás e outra à frente)
      D.leg = { A: { mix: k * .38 }, B: { mix: k * .38 } }; D.arm = { A: { mix: k * .3 }, B: { mix: k * .3 } };
      D.dy = -Math.abs(Math.cos(ph)) * 1.2; D.t = Math.sin(ph * 2) * .03;
    } else if (an === 'peixinho') {
      const rest = p.dv && p.dv.rest !== undefined, k = rest ? clamp(1 - (p.dv.t - p.dv.rest) / DIVE.rest, 0, 1) : !p.g ? (P.anim && p.dv ? clamp(p.dv.t / .1, .2, 1) : 1) : 1;
      if (k > .45) { nm = 'mergulho'; rot = P.rot - P.face * 1.42; D.arm = { A: { d1: Math.sin(tt * 18) * .04 }, B: { d1: -Math.sin(tt * 18) * .04 } }; }
    } else if (front) {
      nm = 'frente';
      if (an === 'comemora') {
        const w = Math.sin(tt * 12);
        D.arm = { A: { T: [-12, -27 - 2.5 * w], handK: .4, max: .9 }, B: { T: [12, -27 + 2.5 * w], handK: .4, max: .9 } };
      } else { D.h = .18; D.t = 0; D.arm = { A: { d1: .1 }, B: { d1: -.1 } }; D.dy = .8; }
    } else if (!p.g && (an === 'pulo' || an === 'cortada' || an === 'cortechao')) {
      nm = 'corta'; const k = clamp(p.vy / 260, -1, 1);
      D.leg = { A: { d1: -.25 * k, d2: .2 * k }, B: { d1: .2 * k, d2: -.15 * k } };
      if (an === 'pulo') D.arm = { A: { d1: .25 + .2 * k }, B: { d1: -.15 * k } };
    }
    s.pv = lerp(s.pv, P.spin, Math.min(1, dt * 4));
    const Mw = new DOMMatrix().translate(p.x + P.dx, p.y - P.lift).scale(CHAR_K * 1.22).translate(0, -18).rotate(rot / D0).translate(0, 18).scale(sx * (front ? 1 : fx), sy).translate(0, bob);
    // quadros inteiros prontos (desenhados pose a pose): corrida, toque, manchete, saque, fim da cortada, pouso, comemoração
    let fr = null;
    if (an === 'correndo') fr = 'c' + (1 + Math.floor(((((p.ph || 0) / TAU) % 1) + 1) % 1 * 4));
    else if (an === 'toque') fr = 'toque';
    else if (an === 'batida') fr = 'manchete';
    else if (an === 'saque') fr = 'saque';
    else if (an === 'aterrissagem') fr = 'pouso';
    else if (an === 'comemora') fr = 'festa';
    else if ((an === 'cortada' || an === 'cortechao') && !p.g && p.sw && p.sw.t / swingT(p.sw.gnd, p.sw.pow) > .5) fr = 'corte2';
    if (fr) {
      const q = PZ.quadros[fr], fr2 = fr === 'festa', ph = p.ph || 0;
      const hop = fr2 ? Math.abs(Math.sin(tt * 7.5)) * 4 : 0, bb = an === 'correndo' ? -Math.abs(Math.cos(ph * 2)) * 1.1 : an === 'toque' || an === 'batida' ? Math.sin(Math.min(1, (p.hitA || 0) / .32) * Math.PI) * .8 : 0;
      const M2 = new DOMMatrix().translate(p.x + P.dx, p.y - P.lift - hop).scale(CHAR_K * 1.22).translate(0, -18).rotate(P.rot / D0).translate(0, 18).scale(sx * (fr2 ? 1 : fx), sy).translate(0, bb);
      const [x0, y0] = qLocal(fr, 0, 0);
      ctx.save(); ctx.setTransform(base.multiply(M2)); ctx.imageSmoothingEnabled = true;
      ctx.drawImage(QIM[fr], x0, y0, q.w / PXU, q.h / PXU);
      const [fxp, fyp] = qLocal(fr, q.scr[0], q.scr[1]);
      glowFace(P.ex, fxp, fyp + .2, q.scr[2] / PXU / 20 * 1.05, fr2 ? 1 : .86);
      ctx.restore();
      return;
    }
    const R = restOf(nm), toL = (x, y) => toLocal(Mw, x, y);
    // mãos que precisam alcançar alguma coisa (bola, saque, toque)
    const reach = (IKT, A) => {
      if (!IKT) return null;
      if (IKT === 'swing') { const H0 = swingPose(p, P.sf, p.sw.t, p.sw.gnd, p.sw.pow, p.sw.hit ? p.sw.L : v.b).pts[0]; return toL(H0.x, H0.y); }
      if (IKT === 'cock') return [R.shA[0] - 6, R.shA[1] - 8];
      if (IKT.L) return null;
      return toL(IKT[0], IKT[1]);
    };
    if (!front && nm !== 'mergulho') {
      const tA = reach(P.hitIK), tB = reach(P.offIK);
      if (tA) D.arm.A = { T: tA, handK: 0, d3: -.3 };
      if (tB) D.arm.B = { T: tB, handK: 0 };
      if (nm === 'tres4') {
        if (an === 'toque') { D.arm.A = { T: [R.shA[0] + 4, R.shA[1] - 14], handK: 0 }; D.arm.B = { T: [R.shB[0] + 4, R.shB[1] - 14], handK: 0 }; D.h = -.12; }
        else if (an === 'batida') { D.arm.A = { T: [R.shA[0] + 8, R.shA[1] + 6], handK: .5 }; D.arm.B = { T: [R.shB[0] + 7, R.shB[1] + 7], handK: .5 }; D.t = .12; }
        else if (an === 'parado') { const b0 = Math.sin(tt * 2.6 + i); D.ts = 1 + .02 * b0; D.arm.A = D.arm.A || { d1: .04 * b0 }; D.arm.B = D.arm.B || { d1: -.04 * b0 }; }
        else if (an === 'aterrissagem') { D.dy = 1.2; D.leg = { A: { d1: -.15, d2: .3 }, B: { d1: .15, d2: -.3 } }; }
        if (an === 'saque' || an === 'cortada' || an === 'cortechao') D.t = (P.lean || 0) * sg * .6;
      }
    }
    const Q = skeleton(R, D);
    ctx.save(); ctx.setTransform(base.multiply(Mw));
    drawMesh(nm, R, Q);
    // o rosto aceso na tela, girando junto com a cabeça
    const q = PZ.poses[nm], hd = Q.cabeca, rest0 = R.neck, restA = angOf(R.neck, R.top), curA = angOf(hd[0], hd[1]);
    const sc0 = [(q.scr[0] - q.j.hip[0]) / PXU + R.hip0[0], (q.scr[1] - q.j.hip[1]) / PXU + R.hip0[1]];
    const scP = rotP([sc0[0] - rest0[0] + hd[0][0], sc0[1] - rest0[1] + hd[0][1]], hd[0], curA - restA);
    ctx.translate(scP[0], scP[1]); ctx.rotate(curA - restA);
    const kw = q.scr[2] / PXU / 20, kx = nm === 'frente' ? 1 : .86;
    glowFace(P.ex, 0, .2, kw * 1.05, kx);
    ctx.restore();
  }
  const D0 = D;
