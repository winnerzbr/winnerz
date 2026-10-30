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
  let FB = null;
  function frameB(an, k, ex, mirror, col) {
    const A = MB.a[an], f = A.f[clamp(k | 0, 0, A.f.length - 1)];
    ctx.save(); ctx.scale(SB5 * (mirror ? -1 : 1), SB5);
    ctx.drawImage(tintImg(an, col), f.x, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    if (f.s && f.sz) {
      if (!FB) FB = document.createElement('canvas');
      const w = Math.ceil(f.w), h = Math.ceil(f.h);
      if (FB.width < w || FB.height < h) { FB.width = Math.max(FB.width, w); FB.height = Math.max(FB.height, h); }
      const g = FB.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, FB.width, FB.height);
      const cx = (f.s[0] + f.s[2]) / 2, cy = (f.s[1] + f.s[3]) / 2;
      const save = ctx; ctx = g; try { g.save(); g.translate(cx, cy); g.rotate(f.r || 0); glowFace(ex, 0, 0, Math.min(f.sz[0] / 24, f.sz[1] / 12), .85); g.restore(); } finally { ctx = save; }
      g.globalCompositeOperation = 'destination-in'; g.drawImage(MBK[an], f.x, 0, f.w, f.h, 0, 0, f.w, f.h); g.globalCompositeOperation = 'source-over';
      ctx.drawImage(FB, 0, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    }
    ctx.restore();
  }
  function drawBlob5(v, p, i, tt, base) {
    const s = stOf('bl5' + i), dt = clamp(tt - (s.tt ?? tt), 0, .05); s.tt = tt;
    const P = poseOf(v, p, i, tt, s, dt), an0 = P.anim, sf = i ? -1 : 1, sp = Math.abs(p.vx);
    const busy = !p.g || p.dv || p.sw || p.ch || p.spec || p.hitA > 0 || p.landT > 0 || an0 === 'comemora' || an0 === 'triste' || an0 === 'saque';
    if (busy) { s.used = false; return drawBlob2(v, p, i, tt, base); }
    let an, k;
    if (sp > 8) { an = 'run'; k = Math.floor((((p.ph || 0) / (2 * TAU)) % 1 + 1) % 1 * 16) % 16; if (p.vx * sf < 0) k = 15 - k; }
    else if (v.state === 'rally') { an = 'ready'; k = Math.floor(tt * 8) % 8; }
    else { an = 'idle'; k = Math.floor(tt * 7) % 16; }
    const col = blobCols(v, i).O, face = P.face, mir = face < 0;
    ctx.save(); ctx.setTransform(base.multiply(new DOMMatrix().translate(p.x, p.y)));
    frameB(an, k, P.ex, mir, col);
    ctx.restore();
  }
