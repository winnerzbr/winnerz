// @ts-nocheck
/* IAmiguinho em 3D (WebGL puro, sem biblioteca).
   - Modelo: /modelos/iamiguinho.bin (formato IAM1), preparado a partir do .glb do dono (scripts em
     prototipos/iamiguinho-3d/preparo/): aba do boné pintada, pés separados, hélice nivelada, 16 ossos com pesos.
   - Cada vértice traz posição, normal, material (0 normal, 1 tela do rosto, 2 luz dos fones), cor e dois ossos.
   - As animações são calculadas aqui (parado, acenar, andar, comemorar, borda, dormir, tonto); a hélice gira no osso
     dela; o rosto é desenhado na tela pelo sombreador (olhos e boca de luz), pisca e muda de expressão.
   - "pix" (0..1) desmonta ele em quadradinhos (a entrada "pixels"). */
const VS = `attribute vec4 aP;attribute vec4 aN;attribute vec4 aC;attribute vec4 aB;
uniform mat4 uVP;uniform mat4 uBo[24];uniform vec4 uCS;uniform float uPix;uniform vec2 uRes;uniform float uT;uniform float uPt;
varying vec3 vN;varying vec3 vC;varying vec3 vR;varying float vM;varying vec3 vW;
void main(){vec3 r=aP.xyz*uCS.w+uCS.xyz;vec4 p=vec4(r,1.);float w=aB.z;
 mat4 m0=uBo[int(aB.x+.5)],m1=uBo[int(aB.y+.5)];
 vec4 q=m0*p*w+m1*p*(1.-w);vec3 n=normalize((m0*vec4(aN.xyz,0.)).xyz*w+(m1*vec4(aN.xyz,0.)).xyz*(1.-w));
 vR=r;vN=n;vC=aC.rgb;vM=aN.w*127.;vW=q.xyz;
 if(uPt>.5){vec3 h=fract(sin(vec3(dot(aP.xyz,vec3(12.9,78.2,37.7)),dot(aP.xyz,vec3(39.3,11.1,83.2)),dot(aP.xyz,vec3(73.2,52.2,9.4))))*43758.5);
  float k=clamp(uPix*1.35-h.z*.35,0.,1.);k=k*k;
  q.xyz+=vec3((h.x-.5)*.95,(h.y-.35)*.9+.12*sin(uT*3.+h.z*9.),(h.z-.5)*.3)*k;
  vec4 c=uVP*q;float s=mix(4.,7.,uPix)*uRes.y/300.;vec2 px=c.xy/c.w*uRes*.5;px=(floor(px/s)+.5)*s;c.xy=px/(uRes*.5)*c.w;gl_Position=c;gl_PointSize=s+.6;}
 else gl_Position=uVP*q;}`;
const FS = `precision highp float;varying vec3 vN;varying vec3 vC;varying vec3 vR;varying float vM;varying vec3 vW;
uniform vec3 uCam;uniform float uT;uniform float uPt;uniform vec4 uFa;uniform vec4 uFb;uniform float uAl;uniform sampler2D uFc;
void main(){vec3 n=normalize(vN);vec3 v=normalize(uCam-vW);
 if(uPt>.5){vec3 c=floor(vC*6.+.5)/6.;gl_FragColor=vec4(c*uAl,uAl);return;}
 vec3 L=normalize(vec3(.35,.75,.6));float nl=dot(n,L);float li=smoothstep(-.25,.55,nl);float nv=max(dot(n,v),0.);
 vec3 col=vC*(.60+.44*li)+vC*vec3(.10,.14,.26)*(1.-li)*.5;
 col+=pow(1.-nv,3.)*vec3(.25,.3,.4)*(.35+.65*li);
 vec3 h=normalize(L+v);col+=pow(max(dot(n,h),0.),40.)*.14;
 if(vM>1.5){col=vC*1.05+vec3(.1,.25,.3)*(.5+.5*sin(uT*2.));}
 else if(vM>.5){
  vec2 p=vec2(vR.x,vR.y-.606)-vec2(uFb.z,uFb.w);
  vec2 f=vec2(p.x/.47+.5,.5-p.y/.3357);vec4 tx=vec4(0.);
  if(f.x>0.&&f.x<1.&&f.y>0.&&f.y<1.)tx=texture2D(uFc,vec2((uFa.x+f.x)/6.,f.y));
  vec3 gls=vec3(.045,.085,.2)+pow(1.-nv,2.)*vec3(.12,.18,.3);
  gls+=smoothstep(.06,.0,abs(vR.x*.9-(vR.y-.612)*.6+.11))*.05*smoothstep(.2,.0,abs(vR.x));
  float scan=.94+.06*sin(vR.y*900.);
  col=gls+tx.rgb*tx.a*1.15*uFb.y*scan;col+=pow(max(dot(n,h),0.),90.)*.5;}
 gl_FragColor=vec4(col*uAl,uAl);}`;

/* ---- contas de 3×3 e 4×4 ---- */
const I3 = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];
const mul3 = (a, b) => { const o = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]; return o; };
const tr3 = (a) => [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]];
const rx = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
const ry = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
const rz = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
const nrm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
/** Rotação que leva a direção a até a direção b (as duas com tamanho 1). */
function aim(a, b) {
  const v = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  if (c < -0.9999) return rz(Math.PI);
  const k = 1 / (1 + c);
  return [v[0] * v[0] * k + c, v[0] * v[1] * k - v[2], v[0] * v[2] * k + v[1], v[1] * v[0] * k + v[2], v[1] * v[1] * k + c, v[1] * v[2] * k - v[0], v[2] * v[0] * k - v[1], v[2] * v[1] * k + v[0], v[2] * v[2] * k + c];
}
const rax = (ax, t) => { const [x, y, z] = nrm(ax), c = Math.cos(t), s = Math.sin(t), k = 1 - c; return [c + x * x * k, x * y * k - z * s, x * z * k + y * s, y * x * k + z * s, c + y * y * k, y * z * k - x * s, z * x * k - y * s, z * y * k + x * s, c + z * z * k]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const MAO_AX = [0.6348, -0.7403, 0.2212], MAO_LA = [0.7517, 0.658, 0.0451], MAO_PALMA = [-0.1789, 0.1377, 0.9742]; // mão esquerda dele em repouso: direção dos dedos, eixo dos nós, palma
const AD = nrm([0.59, -0.77, 0.24]); // direção do braço em repouso (lado esquerdo dele, x > 0)
const lado = (v, s) => [v[0] * s, v[1], v[2]];
const ease = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const mixv = (a, b, t) => nrm([mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]);

/* Ossos: 0 quadril, 1 peito, 2 cabeça, 3 hélice, 4-6 braço E (braço, antebraço, mão), 7-9 braço D, 10-12 perna E, 13-15 perna D. */
/** Põe um braço: direção do braço e do antebraço (no espaço do corpo). s = 1 esquerdo dele (à direita na tela), -1 direito. */
function braco(P, s, up, fore, mao) {
  const i = s > 0 ? 4 : 7, rest = lado(AD, s);
  const Ru = aim(rest, nrm(lado(up, s))), Rf = aim(rest, nrm(lado(fore || up, s)));
  P[i] = Ru; P[i + 1] = mul3(tr3(Ru), Rf);
  if (mao && mao.dedo) { // mão virada no espaço do corpo: para onde apontam os dedos e a palma
    const base = (a, p) => { const c = nrm(cross(a, p)), p2 = cross(c, a); return [a[0], p2[0], c[0], a[1], p2[1], c[1], a[2], p2[2], c[2]]; };
    const R = mul3(base(nrm(lado(mao.dedo, s)), nrm(lado(mao.palma, s))), tr3(base(nrm(lado(MAO_AX, s)), nrm(lado(MAO_PALMA, s)))));
    P[i + 2] = mul3(tr3(Rf), R);
  } else if (mao) P[i + 2] = mao;
}
/** Fecha os dedos (0 aberto, perto de 1,3 fechado) e o polegar de uma mão. */
function dedos(P, s, fecha, polegar) {
  const i = s > 0 ? 16 : 19, la = lado(MAO_LA, s);
  P[i] = rax(la, -s * fecha); P[i + 1] = rax(la, -s * fecha * 0.9); P[i + 2] = rax(lado(MAO_AX, s), s * (polegar == null ? fecha * 0.5 : polegar));
}

/** Braço solto ao lado do corpo: palma virada para a perna, dedos meio fechados (a mão não fica espalmada). */
function neutra(P, s, up, fore) { braco(P, s, up, fore, { dedo: fore, palma: [-1, 0.1, 0.35] }); dedos(P, s, 0.6, 0.35); }

/** As animações: cada uma devolve a pose no tempo t (segundos desde que começou). */
const ANIM = {
  parado(t, P) {
    P.y = Math.sin(t * 1.8) * 0.004;
    P[1] = rx(Math.sin(t * 1.8) * 0.02);
    P[2] = mul3(rz(Math.sin(t * 0.9) * 0.05), ry(Math.sin(t * 0.55) * 0.12));
    for (const s of [1, -1]) neutra(P, s, [0.5 + Math.sin(t * 1.8 + s) * 0.03, -0.84, 0.16], [0.4, -0.84, 0.36]);
  },
  acenar(t, P) {
    ANIM.parado(t, P);
    const k = ease(t / 0.35);
    P[2] = mul3(rz(0.1 * k + Math.sin(t * 0.9) * 0.04), ry(0.08));
    braco(P, 1, mixv([0.55, -0.8, 0.2], [0.82, 0.38, 0.6], k), mixv([0.5, -0.8, 0.34], [0.34 + Math.sin(t * 9) * 0.38, 0.9, 0.5], k), { dedo: [0.15 + Math.sin(t * 9 + 0.5) * 0.5, 1, 0.2], palma: [0, -0.15, 1] });
    P[1] = rz(-0.05 * k); dedos(P, 1, 0.04, -0.15);
  },
  andar(t, P) {
    const w = t * 9, a = Math.sin(w);
    P.y = Math.abs(Math.cos(w)) * 0.014 - 0.006;
    P[0] = rz(Math.cos(w) * 0.03); P[1] = mul3(ry(-a * 0.12), rx(0.06));
    P[2] = mul3(ry(a * 0.08), rz(Math.cos(w) * 0.03));
    P[10] = rx(-a * 0.62); P[11] = rx(Math.max(0, -Math.cos(w)) * 0.9 + 0.08); P[12] = rx(Math.max(0, Math.sin(w + 0.6)) * -0.3);
    P[13] = rx(a * 0.62); P[14] = rx(Math.max(0, Math.cos(w)) * 0.9 + 0.08); P[15] = rx(Math.max(0, -Math.sin(w + 0.6)) * -0.3);
    for (const s of [1, -1]) { const f = [0.4, -0.7, 0.35 + s * a * 0.6]; braco(P, s, [0.42, -0.86, 0.1 + s * a * 0.5], f, { dedo: f, palma: [-1, 0, 0.2] }); dedos(P, s, 1.05, 0.7); }
  },
  comemorar(t, P) {
    const j = Math.abs(Math.sin(t * 5.2)), k = ease(t / 0.3);
    P.y = j * 0.05 * k; P[0] = rz(Math.sin(t * 5.2) * 0.05);
    P[2] = mul3(rx(-0.12 * k), rz(Math.sin(t * 5.2) * 0.08));
    for (const s of [1, -1]) { const f = mixv([0.5, -0.8, 0.34], [0.6 + Math.sin(t * 10.4 + s) * 0.2, 0.8, 0.45], k); braco(P, s, mixv([0.55, -0.8, 0.2], [0.85, 0.36, 0.55], k), f, { dedo: f, palma: [-0.3, 0, 1] }); dedos(P, s, 0.2 + 1.0 * k, 0.8 * k); }
    const d = (1 - j) * 0.5 * k;
    P[10] = rz(0.12 * k); P[13] = rz(-0.12 * k); P[11] = rx(d); P[14] = rx(d); P[10] = mul3(P[10], rx(-d * 0.5)); P[13] = mul3(P[13], rx(-d * 0.5));
  },
  /* Segurando a borda de baixo: as mãos chegam primeiro, depois ele sobe até o peito e fica espiando. */
  borda(t, P) {
    const maos = 1, sobe = ease(t / 0.8), fol = Math.sin(Math.max(0, t - 0.8) * 2.1);
    const over = t < 1.1 ? Math.sin(Math.max(0, t - 0.45) / 0.65 * Math.PI) * 0.035 : 0;
    P.y = mix(-0.66, 0, sobe) + over + fol * 0.008;
    // As mãos ficam na altura da borda: quanto mais baixo o corpo, mais para cima apontam os braços.
    const alvo = 0.475 - P.y - 0.452, sn = Math.max(-0.95, Math.min(0.95, alvo / 0.2));
    const up = [0.36, sn, Math.sqrt(Math.max(0.05, 1 - sn * sn - 0.13))];
    // mãos em cima da borda, palma para baixo, dedos fechados por cima dela
    for (const s of [1, -1]) { braco(P, s, up, [0.12, up[1] - 0.05, up[2] + 0.3], { dedo: [-0.05, -0.25, 1], palma: [0, -1, -0.2] }); dedos(P, s, 1.05, 0.5); }
    P[2] = mul3(rx(0.1 * sobe + fol * 0.02), mul3(rz(Math.sin(t * 0.8) * 0.06 * sobe), ry(Math.sin(t * 0.6) * 0.16 * sobe)));
    P[1] = rx(0.12);
  },
  dormir(t, P) {
    P[2] = mul3(rx(0.28 + Math.sin(t * 1.1) * 0.04), rz(0.12)); P[1] = rx(0.1 + Math.sin(t * 1.1) * 0.02);
    for (const s of [1, -1]) neutra(P, s, [0.4, -0.9, 0.15], [0.35, -0.9, 0.25]);
    P.hel = 0.12;
  },
  tonto(t, P) {
    ANIM.parado(t, P);
    P[2] = mul3(rz(Math.sin(t * 6) * 0.22), rx(Math.cos(t * 6) * 0.14)); P[0] = rz(Math.sin(t * 6 + 1) * 0.06);
    P.hel = 0.25;
  },
};
/* Rosto: os rostos dos jogos (folha rostos_ia.png do Jogos de Verão, uma fileira em /modelos/iamiguinho-rostos.png).
   Colunas: 0 normal, 1 olhos fechados (piscar, sono), 2 feliz, 3 surpreso, 4 sem jeito, 5 decidido. */
const ROSTO = {
  normal: 0, 'sorriso-confiante': 0, pensando: 0, curioso: 3, feliz: 2, comemorando: 2, orgulhoso: 2, piscando: 2,
  surpreso: 3, 'sem-jeito': 4, tonto: 4, perdido: 4, sonolento: 1, decidido: 5,
};

let modeloP = null;
function carregar() {
  if (modeloP) return modeloP;
  modeloP = fetch('/modelos/iamiguinho.bin').then((r) => { if (!r.ok) throw new Error('modelo'); return r.arrayBuffer(); }).then((b) => {
    const dv = new DataView(b); if (dv.getUint32(0, true) !== 0x314d4149) throw new Error('formato');
    const nV = dv.getUint32(4, true), nI = dv.getUint32(8, true), nB = dv.getUint32(12, true);
    const cs = new Float32Array(b, 16, 4); let o = 32;
    const joints = new Float32Array(b.slice(o, o + nB * 12)); o += nB * 12;
    const parent = new Int8Array(b.slice(o, o + nB)); o += nB; o = (o + 3) & ~3;
    const pos = new Int16Array(b, o, nV * 4); o += nV * 8;
    const nor = new Int8Array(b, o, nV * 4); o += nV * 4;
    const col = new Uint8Array(b, o, nV * 4); o += nV * 4;
    const bon = new Uint8Array(b, o, nV * 4); o += nV * 4;
    const idx = nV > 65535 ? new Uint32Array(b, o, nI) : new Uint16Array(b.slice(o, o + nI * 2));
    return { nV, nI, nB, cs, joints, parent, pos, nor, col, bon, idx };
  });
  modeloP.catch(() => { modeloP = null; });
  return modeloP;
}

/**
 * Liga o IAmiguinho a um canvas. estado() é chamado a cada quadro e devolve o que ele faz agora:
 * { anim, t0 (segundos em que a animação começou; sem ele, conta do início), rosto, yaw, pix, vista: [yMin, yMax], parado }.
 */
export function mountIAmiguinho(canvas, estado, onReady, onFail) {
  let vivo = true, raf = 0, gl = null, visivel = true;
  const fail = () => { if (vivo && onFail) onFail(); };
  try { gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true }); } catch { /* sem WebGL */ }
  if (!gl) { fail(); return () => {}; }
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x) || 'shader'); return x; };
  let pr; const U = {};
  try {
    pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr) || 'link');
  } catch (e) { console.warn('IAmiguinho 3D:', e); fail(); return () => {}; }
  for (const n of ['uVP', 'uBo', 'uCS', 'uPix', 'uRes', 'uT', 'uPt', 'uCam', 'uFa', 'uFb', 'uAl', 'uFc']) U[n] = gl.getUniformLocation(pr, n);
  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((e) => { visivel = e[0].isIntersecting; }) : null;
  io?.observe(canvas);
  const perdeu = (e) => { e.preventDefault(); cancelAnimationFrame(raf); fail(); };
  canvas.addEventListener('webglcontextlost', perdeu);

  carregar().then((m) => {
    if (!vivo) return;
    const buf = (data, loc, size, type, norm, stride) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); const l = gl.getAttribLocation(pr, loc); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, type, norm, stride, 0); };
    gl.useProgram(pr);
    buf(m.pos, 'aP', 4, gl.SHORT, true, 8); buf(m.nor, 'aN', 4, gl.BYTE, true, 4); buf(m.col, 'aC', 4, gl.UNSIGNED_BYTE, true, 4);
    // ossos: índices inteiros (sem normalizar) e peso 0..1
    const bf = new Float32Array(m.nV * 4); for (let i = 0; i < m.nV; i++) { bf[i * 4] = m.bon[i * 4]; bf[i * 4 + 1] = m.bon[i * 4 + 1]; bf[i * 4 + 2] = m.bon[i * 4 + 2] / 255; }
    buf(bf, 'aB', 4, gl.FLOAT, false, 16);
    if (m.nV > 65535 && !gl.getExtension('OES_element_index_uint')) { fail(); return; }
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
    const IT = m.nV > 65535 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    gl.uniform4f(U.uCS, m.cs[0], m.cs[1], m.cs[2], m.cs[3]);
    // folha de rostos (até carregar, a tela fica apagada)
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    const im = new Image(); im.onload = () => { if (!vivo) return; gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); };
    im.src = '/modelos/iamiguinho-rostos.png'; gl.uniform1i(U.uFc, 0);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const bones = new Float32Array(24 * 16), W = new Array(24);
    const t00 = performance.now() / 1000; let hel = 0, last = t00, pisca = 2 + Math.random() * 3, olhar = [0, 0], olharAlvo = [0, 0], olharEm = 0, pronto = false;
    const frame = () => {
      if (!vivo) return;
      raf = requestAnimationFrame(frame);
      if (!visivel || document.hidden) return;
      const now = performance.now() / 1000, dt = Math.min(0.05, now - last); last = now;
      const E = estado(now - t00, dt) || {};
      const dpr = Math.min(2, window.devicePixelRatio || 1), cw = Math.max(1, Math.round(canvas.clientWidth * dpr)), ch = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      const t = E.parado ? 0.9 : now - t00 - (E.t0 || 0);
      const P = { y: 0, hel: 1 }; (ANIM[E.anim] || ANIM.parado)(t, P);
      hel += dt * 17 * (E.parado ? 0 : P.hel) * (E.helice == null ? 1 : E.helice);
      P[3] = ry(hel);
      // ossos -> matrizes
      const yaw = E.yaw || 0;
      for (let i = 0; i < m.nB; i++) {
        const R = i === 0 ? mul3(ry(yaw), P[0] || I3()) : (P[i] || I3()), jx = m.joints[i * 3], jy = m.joints[i * 3 + 1], jz = m.joints[i * 3 + 2];
        // L = T(j) R T(-j)
        const L = [R[0], R[1], R[2], jx - (R[0] * jx + R[1] * jy + R[2] * jz), R[3], R[4], R[5], jy - (R[3] * jx + R[4] * jy + R[5] * jz), R[6], R[7], R[8], jz - (R[6] * jx + R[7] * jy + R[8] * jz)];
        if (i === 0) { L[7] += P.y; W[0] = L; } else {
          const A = W[m.parent[i]], o = new Array(12);
          for (let r = 0; r < 3; r++) { for (let c = 0; c < 3; c++) o[r * 4 + c] = A[r * 4] * L[c] + A[r * 4 + 1] * L[4 + c] + A[r * 4 + 2] * L[8 + c]; o[r * 4 + 3] = A[r * 4] * L[3] + A[r * 4 + 1] * L[7] + A[r * 4 + 2] * L[11] + A[r * 4 + 3]; }
          W[i] = o;
        }
        const M = W[i], k = i * 16; // em colunas
        bones[k] = M[0]; bones[k + 1] = M[4]; bones[k + 2] = M[8]; bones[k + 3] = 0; bones[k + 4] = M[1]; bones[k + 5] = M[5]; bones[k + 6] = M[9]; bones[k + 7] = 0;
        bones[k + 8] = M[2]; bones[k + 9] = M[6]; bones[k + 10] = M[10]; bones[k + 11] = 0; bones[k + 12] = M[3]; bones[k + 13] = M[7]; bones[k + 14] = M[11]; bones[k + 15] = 1;
      }
      // câmera: enquadra a faixa de altura pedida
      const vista = E.vista || [-0.03, 1.03], yc = (vista[0] + vista[1]) / 2, hh = (vista[1] - vista[0]) / 2, D = 4.2, asp = cw / ch;
      const nn = 1, ff = 10, ex = E.camX || 0;
      const eye = [ex, yc + 0.35, D], fw = nrm([-eye[0], yc - eye[1], -eye[2]]), rt = nrm([-fw[2], 0, fw[0]]), up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
      const dist = Math.hypot(eye[0], eye[1] - yc, eye[2]), fx = dist / hh;
      const V = [rt[0], rt[1], rt[2], -(rt[0] * eye[0] + rt[1] * eye[1] + rt[2] * eye[2]), up[0], up[1], up[2], -(up[0] * eye[0] + up[1] * eye[1] + up[2] * eye[2]), -fw[0], -fw[1], -fw[2], fw[0] * eye[0] + fw[1] * eye[1] + fw[2] * eye[2]];
      const pj = [fx / asp, fx, (ff + nn) / (nn - ff), (2 * ff * nn) / (nn - ff)];
      const VP = new Float32Array(16); // colunas
      for (let c = 0; c < 4; c++) { VP[c * 4] = pj[0] * V[c]; VP[c * 4 + 1] = pj[1] * V[4 + c]; VP[c * 4 + 2] = pj[2] * V[8 + c] + (c === 3 ? pj[3] : 0); VP[c * 4 + 3] = -V[8 + c]; }
      gl.viewport(0, 0, cw, ch); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(U.uVP, false, VP); gl.uniformMatrix4fv(U.uBo, false, bones);
      gl.uniform2f(U.uRes, cw, ch); gl.uniform1f(U.uT, now - t00); gl.uniform3f(U.uCam, eye[0], eye[1], eye[2]);
      // rosto
      let rs = ROSTO[E.rosto] ?? 0;
      pisca -= dt; let bl = 1; if (pisca < 0.14) bl = Math.abs(pisca - 0.07) / 0.07; if (pisca < 0) pisca = 2.2 + Math.random() * 3.5;
      if (now > olharEm) { olharEm = now + 1.6 + Math.random() * 2.8; olharAlvo = Math.random() < 0.45 ? [0, 0] : [(Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.016]; }
      olhar[0] += (olharAlvo[0] - olhar[0]) * Math.min(1, dt * 7); olhar[1] += (olharAlvo[1] - olhar[1]) * Math.min(1, dt * 7);
      if (E.parado) { bl = 1; olhar = [0, 0]; }
      if (bl < 0.55 && rs === 0) rs = 1;
      gl.uniform4f(U.uFa, rs, 0, 0, 0); gl.uniform4f(U.uFb, bl, E.tela == null ? 1 : E.tela, olhar[0], olhar[1]);
      const pix = Math.max(0, Math.min(1, E.pix || 0));
      gl.uniform1f(U.uPix, pix);
      if (pix > 0.001) {
        // quadradinhos; perto do fim, o corpo aparece por baixo
        const a = 1 - ease((pix - 0.02) / 0.16);
        if (a > 0.01) { gl.uniform1f(U.uPt, 0); gl.uniform1f(U.uAl, a); gl.drawElements(gl.TRIANGLES, m.nI, IT, 0); }
        gl.uniform1f(U.uPt, 1); gl.uniform1f(U.uAl, Math.min(1, pix * 9) * (1 - ease((pix - 0.9) / 0.1))); gl.drawArrays(gl.POINTS, 0, m.nV);
      } else { gl.uniform1f(U.uPt, 0); gl.uniform1f(U.uAl, 1); gl.drawElements(gl.TRIANGLES, m.nI, IT, 0); }
      if (!pronto) { pronto = true; onReady && onReady(); }
    };
    raf = requestAnimationFrame(frame);
  }).catch((e) => { console.warn('IAmiguinho 3D:', e); fail(); });
  return () => { vivo = false; cancelAnimationFrame(raf); io?.disconnect(); canvas.removeEventListener('webglcontextlost', perdeu); try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* nada */ } };
}
export const ANIMACOES = Object.keys(ANIM);
