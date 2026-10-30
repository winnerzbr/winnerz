  /* ============================================================ IAmiguinho por PRANCHAS DE MOVIMENTO
     Cada movimento é uma sequência de quadros inteiros desenhados (parado, corrida, pulo, pouso, toque,
     manchete, saque, cortada, peixinho, levantar, comemoração, tristeza, virada). O jogo escolhe o quadro
     pelo estado da física (fase da corrida, subida/descida do pulo, progresso do golpe...). */
  const MVD = window.MV, MVI = {};
  if (MVD) for (const [nm, q] of Object.entries(MVD.m)) { MVI[nm] = new Image(); MVI[nm].src = q.src; }
  const MVOK = () => !!MVD && Object.values(MVI).every((im) => im.complete && im.naturalWidth > 0);
  const MVK = CHAR_K * 1.24; // tamanho na quadra
  // desenha o quadro k do movimento nm, nas coordenadas locais (pés no 0, olhando para a direita)
  //   modo 'g': linha do chão da prancha nos pés · modo 'a': no ar (tela do rosto na altura de quando está de pé)
  function mvFrame(nm, k, mode, ex) {
    const M = MVD.m[nm], f = M.f[clamp(k | 0, 0, M.f.length - 1)], front = M.front || (nm === 'turn' && k >= 1 && k <= 3);
    const dx = front ? 0 : MVD.scrDX, x0 = (-f.c[0] + dx) / PXU, y0 = mode === 'a' ? (MVD.scrY - f.c[1]) / PXU : -f.g / PXU;
    ctx.drawImage(MVI[nm], f.x, 0, f.w, f.h, x0, y0, f.w / PXU, f.h / PXU);
    if (f.s) { // rosto aceso dentro da tela escura
      const sx0 = x0 + f.s[0] / PXU, sy0 = y0 + f.s[1] / PXU, sw = (f.s[2] - f.s[0]) / PXU, sh = (f.s[3] - f.s[1]) / PXU;
      if (sw > 3 && sh > 3) {
        ctx.save(); ctx.beginPath(); ctx.roundRect(sx0 + .3, sy0 + .3, sw - .6, sh - .6, Math.min(sw, sh) * .35); ctx.clip();
        const kk = Math.min(sw / 21, sh / 15);
        glowFace(ex, sx0 + sw * (front ? .5 : .54), sy0 + sh * .5, kk, front ? 1 : clamp(sw / sh * .8, .55, 1));
        ctx.restore();
      }
    }
  }
  const SPK_SEQ = [['spike1', 5], ['spike1', 6], ['spike1', 7], ['spike2', 0], ['spike2', 1], ['spike2', 2], ['spike2', 3]];
  const GND_SEQ = [['serve1', 5], ['serve1', 6], ['serve1', 7], ['serve2', 0], ['serve2', 1], ['serve2', 2], ['serve2', 3], ['serve2', 4]];
  function drawIA4(v, p, i, tt, base) {
    const s = stOf('ia4' + i), dt = clamp(tt - (s.tt ?? tt), 0, .05); s.tt = tt;
    const P = poseOf(v, p, i, tt, s, dt), an = P.anim;
    // tempos próprios: pouso, fim do golpe no chão, depois da cortada, virada
    if (s.air && p.g && !p.dv) s.lt = 0; s.air = !p.g; s.lt = (s.lt ?? 9) + dt;
    if (s.sw && !p.sw) { if (s.swg) s.rt = 0; else s.at = 0; } s.sw = !!p.sw; s.swg = p.sw ? p.sw.gnd : s.swg;
    s.rt = (s.rt ?? 9) + dt; s.at = (s.at ?? 9) + dt;
    if (s.face === undefined) s.face = P.face;
    if (P.face !== s.face) { if (p.g && (an === 'parado' || an === 'correndo')) { s.tn = 0; s.tnTo = P.face; } s.face = P.face; }
    s.tn = (s.tn ?? 9) + dt;
    let nm = 'idle', k = 0, mode = 'g', front = false, mir = P.face < 0, y = p.y;
    if (an === 'comemora') { nm = 'party'; k = Math.floor(tt * 9) % 8; front = true; }
    else if (an === 'triste') { nm = 'sad'; const q = (v.st || 0) * 8; k = q < 6 ? Math.floor(q) : 2 + Math.floor(tt * 3) % 4; front = true; }
    else if (an === 'peixinho' && p.dv) {
      const d = p.dv; mir = d.dir < 0; y = VGY;
      if (d.rest !== undefined) { nm = 'getup'; k = Math.min(5, Math.floor((d.t - d.rest) / DIVE.rest * 6)); }
      else if (!p.g) { nm = 'dive'; k = d.t < .07 ? 2 : p.vy < 0 ? 3 : 4; }
      else { nm = 'dive'; const sp = Math.abs(p.vx); k = sp > 120 ? 5 : sp > 25 ? 6 : 7; }
    } else if (an === 'saque') {
      nm = 'serve1';
      if (P.anim && v.held) k = v.charging ? 1 : 0;
      else { const q = clamp((v.tossT ?? 0) / .28, 0, 1); k = 2 + Math.min(2, Math.floor(q * 3)); }
    } else if (p.spec || p.ch) { if (p.g) { nm = 'serve1'; k = 6; } else { nm = 'spike1'; k = 5; mode = 'a'; } }
    else if (p.sw) {
      const q = clamp(p.sw.t / swingT(p.sw.gnd, p.sw.pow), 0, .999);
      if (p.sw.gnd) [nm, k] = GND_SEQ[Math.floor(q * GND_SEQ.length)];
      else { [nm, k] = SPK_SEQ[Math.floor(q * SPK_SEQ.length)]; mode = 'a'; }
    } else if (an === 'toque' || an === 'batida') {
      const q = clamp(1 - (p.hitA || 0) / .32, 0, .999); nm = an === 'toque' ? 'set' : 'bump'; k = 2 + Math.floor(q * 6);
      if (!p.g) mode = 'a';
    } else if (!p.g) {
      const q = clamp((p.vy + 300) / 600, 0, .999);
      if (s.at < .7) { nm = 'spike2'; k = 4 + Math.floor(q * 4); } else { nm = 'jump'; k = 3 + Math.floor(q * 5); }
      mode = 'a';
    } else if (s.tn < .2) { nm = 'turn'; k = Math.floor(s.tn / .2 * 6); mir = s.tnTo > 0; }
    else if (an === 'correndo') {
      nm = 'run'; k = Math.floor((((p.ph || 0) / TAU) % 1 + 1) % 1 * 8) % 8;
      if (p.vx * P.face < 0) k = 7 - k;
    } else if (s.lt < .3) { nm = 'land'; k = 1 + Math.floor(s.lt / .3 * 5); }
    else if (s.rt < .24) { nm = 'serve2'; k = 5 + Math.floor(s.rt / .24 * 3); }
    else { nm = 'idle'; k = Math.floor(tt * 7) % 8; }
    const sq = (p.sq || 0) * .5, sx = 1 - .1 * sq, sy = 1 + .13 * sq;
    const M = new DOMMatrix().translate(p.x + (an === 'peixinho' ? 0 : P.dx), y - (an === 'peixinho' ? 0 : P.lift)).scale(MVK).scale((mir && !front ? -1 : 1) * sx, sy);
    ctx.save(); ctx.setTransform(base.multiply(M)); ctx.imageSmoothingEnabled = true;
    mvFrame(nm, k, mode, P.ex);
    ctx.restore();
  }
  // bola segura no saque: na palma da mão aberta do desenho
  const heldOld = heldIA;
  heldIA = function (p, f) {
    if (!MVOK()) return heldOld(p, f);
    const v = volei, fr = MVD.m.serve1.f[v.charging ? 1 : 0], hd = fr.hd || [fr.w, fr.h * .5];
    const x = (hd[0] - fr.c[0] + MVD.scrDX) / PXU, yy = (hd[1] - fr.g) / PXU;
    return { x: p.x + f * x * MVK, y: p.y + yy * MVK - VRB + 1.5 };
  };
