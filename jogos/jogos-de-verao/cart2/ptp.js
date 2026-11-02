  /* ============================================================ Patins pintado: cenário, obstáculos, prêmios e corrimão (01/11/2026)
     O pacote do dono (ptcen.py -> window.PTC) entra no lugar do desenho de 16 bits quando carrega. A física não muda.
     Calçadão das Ondas nos 4 horários pelo relógio (perto da troca mistura os dois): a orla em panorama que repete (anda devagar)
     e a faixa do calçadão (anda junto com você); de noite, as luzes dos postes e dos quiosques por cima. O IAmiguinho continua
     o de 16 bits até as pranchas dele chegarem. */
  const PTC = window.PTC, PTI = {};
  const ptImg = (k, src) => { if (!src) return null; let im = PTI[k]; if (!im) { im = PTI[k] = new Image(); im.src = src; } return im.complete && im.naturalWidth ? im : null; };
  const PTOK = () => !!PTC && !!ptImg('atl', PTC.atl) && ['esq', 'meio', 'dir'].every((k) => ptImg('r_' + k, PTC.rail[k].src));
  window.__PTOK = PTOK;
  const PT_HORAS = [['noite', 5, 'manha'], ['manha', 10, 'dia'], ['dia', 16, 'tarde'], ['tarde', 19, 'noite']];
  function ptPesos() {
    const d = new Date(), h = window.__skHora != null ? window.__skHora : d.getHours() + d.getMinutes() / 60;
    for (const [a, b, c] of PT_HORAS) if (Math.abs(h - b) < .5) { const t = h - b + .5; return [[a, 1 - t], [c, t]]; }
    return [[h >= 5 && h < 10 ? 'manha' : h >= 10 && h < 16 ? 'dia' : h >= 16 && h < 19 ? 'tarde' : 'noite', 1]];
  }
  // peça do atlas com a âncora no meio; w e h (opcionais) esticam
  function ptPart(name, cx, cy, w, h, rot = 0) {
    const f = PTC.p[name], u = 1 / PTC.u, im = ptImg('atl', PTC.atl), ww = w ?? f.w * u, hh = h ?? f.h * u;
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(cx, cy); if (rot) ctx.rotate(rot); ctx.drawImage(im, f.x, 0, f.w, f.h, -ww / 2, -hh / 2, ww, hh); ctx.restore();
  }
  const PT_FW = 800, PT_CW = 342, PT_CY = 168; // orla (32:9 na altura da tela) e calçadão (6:1 com 57 de altura), em unidades
  // 01/11 (pedido do dono): os postes ficam nas pontas da física (o deslize começa na curva da barra). Nas peças, o poste da esquerda
  // fica no pixel 20 e o da direita no 162; antes o desenho começava uns 17 antes do corrimão de verdade e encostar na ponta era tombo.
  // Corrimão curto: as duas pontas se encontram no meio, sem a peça do meio.
  function ptRail(x, w) {
    const R0 = PTC.rail, k = (PT_RH + 4) / (R0.chao - R0.top), top = PGY - PT_RH - 4 - R0.top * k, hh = R0.esq.h * k;
    const we = R0.esq.w * k, wm = R0.meio.w * k, wd = R0.dir.w * k, x0 = x - 2 - 20 * k, x1 = x + w + 2 + (R0.dir.w - 162) * k;
    const eR = x0 + we, dL = x1 - wd, mid = dL > eR ? null : (eR + dL) / 2;
    const e = ptImg('r_esq', R0.esq.src), m = ptImg('r_meio', R0.meio.src), d = ptImg('r_dir', R0.dir.src);
    ctx.save(); ctx.imageSmoothingEnabled = true;
    if (mid == null) for (let xx = eR - .5; xx < dL + .5; xx += wm - .5) { const ww = Math.min(wm, dL + .5 - xx); ctx.drawImage(m, 0, 0, R0.meio.w * ww / wm, R0.meio.h, xx, top, ww, hh); }
    ctx.save(); ctx.beginPath(); ctx.rect(x0 - 1, top - 1, (mid ?? eR) - x0 + 1, hh + 2); ctx.clip(); ctx.drawImage(e, x0, top, we, hh); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(mid ?? dL, top - 1, x1 - (mid ?? dL) + 1, hh + 2); ctx.clip(); ctx.drawImage(d, dL, top, wd, hh); ctx.restore();
    ctx.restore();
  }
  // 01/11 (pedido do dono): os Amiguinhos da pista pintados (o Amiguinho do vôlei, na cor de cada um, virado para você).
  // Pisado: amassa e cai de cara no chão (o peixinho do vôlei, quadros 1 a 12), com estrelinhas, e some devagar.
  const AM_PTCOR = { am_rosa: '#e86fa8', am_laranja: '#f08a3c', am_roxo: '#9a7cf0', am_dourado: '#e8c25a' }, PT_BOTK = .72; // 01/11: maiores (eram 52%), a caixa de colisão acompanha (PT_BOT)
  function ptBot(v, o, x, tt) {
    const MB = window.MVB; if (!MB || !MB.a.idle || !MB.a.dive || !window.__fr || !window.__fr.bl || !window.__blCor) return false;
    const old = window.__blCor(AM_PTCOR[AM_PT[Math.floor(o.x) % AM_PT.length]]);
    try {
      ctx.save(); ctx.translate(x + 8, PGY + 1);
      if (!o.pis) { ctx.scale(PT_BOTK, PT_BOTK); window.__fr.bl('idle', Math.floor(tt * 8 + o.x) % 16, 'g', 0, true); }
      else {
        const e = v.t - o.pisT;
        ctx.globalAlpha = clamp((2.2 - e) / .5, 0, 1);
        if (e < .12) { ctx.scale(PT_BOTK * 1.3, PT_BOTK * .55); window.__fr.bl('idle', 0, 'g', 4, true); } // amassou
        else { ctx.scale(PT_BOTK, PT_BOTK); window.__fr.bl('dive', Math.min(11, Math.floor((e - .12) * 18)), 'g', 4, false); }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      if (o.pis) { const e = v.t - o.pisT; if (e > .3 && e < 2) for (let i = 0; i < 3; i++) { const a = tt * 5 + i * TAU / 3; R(x + 13 + Math.cos(a) * 9, PGY - 17 + Math.sin(a) * 3, 1.8, 1.8, '#ffd04a'); } }
    } catch (err) { ctx.restore(); window.__blCor(old); return false; }
    window.__blCor(old); return true;
  }
  /* ---------- IAmiguinho pintado no patins (mvpt.py -> window.MVPT, 12 animações do pacote do dono)
     Andando: a passada (pelo caminho andado). Agachado: desce (1-4) e fica embaixo (5-8). No ar: o salto (o quadro segue a subida
     e a descida); segurando ▼, a pegada no patins; Aviãozinho, Tesoura e Mortal seguem o andamento da manobra (no Mortal o jogo gira
     o desenho uma volta para trás); girando, as 8 vistas. No corrimão: Soul, Royale ou Agachado (o padrão é o Soul). Tombo final: a queda. */
  const MPT = window.MVPT, PTJ = {};
  if (MPT) { PTJ.im = new Image(); PTJ.im.src = MPT.src; PTJ.mk = new Image(); PTJ.mk.src = MPT.mask; }
  const PTIOK = () => !!MPT && PTJ.im.complete && PTJ.im.naturalWidth > 0 && PTJ.mk.complete && PTJ.mk.naturalWidth > 0;
  window.__PTIOK = PTIOK;
  const PTK5 = MPT ? 50 / MPT.a.passada.f[0].ay : 1; // em pé nos patins, da roda à hélice = 50 (o de 16 bits tinha 48,5)
  let FTPT = null;
  (window.__fr = window.__fr || {})['pt'] = framePt;
  function framePt(an, k, ex, sx = 1) {
    const A = MPT.a[an], n = A.f.length, f = A.f[((k | 0) % n + n) % n], y0 = A.y || 0;
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.scale(PTK5 * sx, PTK5);
    ctx.drawImage(PTJ.im, f.x, y0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    if (f.s && f.sz) {
      if (!FTPT) FTPT = document.createElement('canvas');
      const w = Math.ceil(f.w), h = Math.ceil(f.h);
      if (FTPT.width < w || FTPT.height < h) { FTPT.width = Math.max(FTPT.width, w); FTPT.height = Math.max(FTPT.height, h); }
      const g = FTPT.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, FTPT.width, FTPT.height);
      const cx = f.s[4] ?? (f.s[0] + f.s[2]) / 2, cy = f.s[5] ?? (f.s[1] + f.s[3]) / 2;
      const L1 = f.s[6] || f.sz[0], L2 = f.s[7] || f.sz[1], fk = L2 / 14.5, fkx = clamp(.62 * L1 / (11.6 * fk), .5, 1.3);
      const save = ctx; ctx = g; try { g.save(); g.translate(cx, cy); g.rotate(f.r || 0); glowFace(ex, 0, L2 * .03, fk, fkx); g.restore(); } finally { ctx = save; }
      g.globalCompositeOperation = 'destination-in'; g.drawImage(PTJ.mk, f.x, y0, f.w, f.h, 0, 0, f.w, f.h); g.globalCompositeOperation = 'source-over';
      ctx.drawImage(FTPT, 0, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    }
    ctx.restore();
  }
  const PTST = { cr0: -9, wasCr: false };
  function ptIA(ev, tt) {
    if (ev.deadT > 0) { const k = clamp((1.6 - ev.deadT) / 1.2, 0, .999); ctx.save(); ctx.translate(PPX, PGY + 1); framePt('queda', Math.floor(k * 8), k < .5 ? 3 : 4); ctx.restore(); return; }
    if (ev.inv > 0 && Math.floor(tt * 16) % 2) return;
    const fy = PGY - ev.y, ex = ev.inv > 0 ? 3 : 2;
    if (ev.air) { ctx.globalAlpha = .4; ptPart('sombra', PPX, PGY + 1, 16, 4); ctx.globalAlpha = 1; }
    if (ev.crouch && !PTST.wasCr) PTST.cr0 = tt; PTST.wasCr = !!ev.crouch;
    ctx.save(); ctx.translate(PPX, fy + 1);
    if (ev.air) {
      const tr = ev.trick, c = Math.cos(ev.rot), gv = ((Math.round((ev.rot / TAU) * 8) % 8) + 8) % 8;
      let an, k, ang = 0;
      if (tr) { const pr = Math.min(1, tr.t / tr.d); an = { aviao: 'aviao', tesoura: 'tesoura', mortal: 'flip' }[tr.k] || 'salto'; k = Math.min(7, Math.floor(pr * 8)); if (tr.k === 'mortal') ang = -TAU * pr; }
      else if (ev.grab) { an = 'grab'; k = Math.min(4, Math.floor(ev.grabT / .2 * 4)); }
      else { an = 'salto'; const v = ev.vy; k = v > 200 ? 2 : v > 90 ? 3 : v > -60 ? 4 : v > -180 ? 5 : 6; }
      if (ang) { ctx.translate(0, -22); ctx.rotate(ang); ctx.translate(0, 22); }
      if (ev.spinning && (!tr || tr.k !== 'mortal')) {
        // giro: as 8 vistas; com manobra ou pegada, perto de lado a pose da manobra (achatando), de frente e de costas as vistas do giro
        if ((tr || ev.grab) && Math.abs(c) >= .75) framePt(an, k, ex, (c < 0 ? -1 : 1) * Math.max(.85, Math.abs(c)));
        else framePt('giro', gv, ex);
      } else framePt(an, k, ex);
    } else if (ev.grind) {
      const an = { soul: 'soul', royale: 'royale', agachado: 'baixo' }[ev.gStyle] || 'soul'; framePt(an, Math.floor(tt * 9) % 8, 2);
    } else if (ev.crouch) { const e = tt - PTST.cr0; framePt('agacha', e < .2 ? Math.floor(e / .2 * 4) : 4 + Math.floor(tt * 6) % 4, ev.inv > 0 ? 3 : 0); }
    else framePt('passada', Math.floor(ev.d / 9) % 8, ev.inv > 0 ? 3 : 0);
    ctx.restore();
  }
  // o IAmiguinho de 16 bits (enquanto as pranchas pintadas não carregam)
  function ptIA16(tt) {
    const ok = true, spr2 = (nm, cx, by, w, h) => ptPart(nm, cx, by - (h ?? 4) / 2, w, h);
  if (!sReady('ia_pt', 'rostos')) return;
  const look = { lx: 1, ly: 0 };
  if (this.deadT > 0) { const k = 1.6 - this.deadT; vSprite('ia_pt', 'man', k < .5 ? 4 : 5, { x: PPX, y: PGY + 1 }, 1, k < .5 ? 3 : 4, look, false, tt); return; }
  if (this.inv > 0 && Math.floor(tt * 16) % 2) return;
  const fy = PGY - this.y;
  if (this.air) { ctx.globalAlpha = .4; ok && spr2('sombra', PPX, PGY + 2, 16, 4); ctx.globalAlpha = 1; }
  if (this.air && this.trick) {
    // manobra no ar: o giro (se tiver) aparece como o corpo virando; o mortal dá uma volta para trás
    const tr = this.trick, pr = Math.min(1, tr.t / tr.d), cr = Math.cos(this.rot);
    ctx.save(); ctx.translate(PPX, fy - 22);
    if (tr.k === 'mortal') {
      if (this.spinning) ctx.scale((cr < 0 ? -1 : 1) * Math.max(.85, Math.abs(cr)), 1); // mortal girando: só um leve achatado
      const a = -TAU * pr;
      if (pr < .15) vSprite('ia_pt', 'base', 5, { x: 0, y: 23 }, 1, 2, look, false, tt, a);
      else if (pr < .72) { ctx.rotate(a + Math.PI); this.ptFlip(tt); }
      else { ctx.rotate(-(1 - pr) / .28 * .9); vSprite('ia_pt', 'man2', 3, { x: 0, y: 0 }, 1, 2, look, false, tt); }
    } else {
      const fi = tr.k === 'aviao' ? 0 : 1, pose = () => vSprite('ia_pt', 'man2', fi, { x: 0, y: 23 }, 1, 2, look, false, tt);
      if (this.spinning) ptCombo(fi ? 'pt_tesoura' : 'pt_aviao', 'pt', this.rot / TAU, pose, 1, 2, tt, 23, look); else pose();
    }
    ctx.restore(); return;
  }
  if (this.air && this.spinning && this.grab) {
    // agarrando o patins no meio do giro
    ctx.save(); ctx.translate(PPX, fy - 22);
    ptCombo('pt_agarra', 'pt', this.rot / TAU, () => vSprite('ia_pt', 'man', 2, { x: 0, y: 23 }, 1, 2, look, false, tt), 1, 2, tt, 23, look);
    ctx.restore(); return;
  }
  let anim = 'base', f = Math.floor(this.d / 16) % 4, face = 1, expr = 0, key = 'ia_pt';
  if (this.grind) { anim = this.gStyle ? 'man2' : 'man'; f = this.gStyle ? Object.values(PT_GRIND).find((g) => g.k === this.gStyle).f : 3; expr = 2; }
  else if (this.air && this.spinning) {
    // giro: de lado → de frente → de lado (espelhado) → de costas
    if (sReady('ia_giro')) { key = 'ia_giro'; anim = 'pt'; f = ((Math.round((this.rot / TAU) * 8) % 8) + 8) % 8; expr = 2; } // as 8 vistas em volta dele
    else { const q = Math.floor((this.rot / TAU) * 4) % 4; anim = q % 2 ? 'man' : 'base'; f = q === 1 ? 0 : q === 3 ? 1 : 5; face = q === 2 ? -1 : 1; expr = 2; }
  } else if (this.air && this.grab) { anim = 'man'; f = 2; expr = 2; }
  else if (this.air) f = 5;
  else if (this.crouch) f = 4;
  if (this.inv > 0) expr = 3;
  vSprite(key, anim, f, { x: PPX, y: fy + 1 }, face, expr, look, false, tt);
  }
  if (typeof patins !== 'undefined') {
    const draw16p = patins.draw;
    patins.__ia16 = ptIA16;
    patins.draw = function (tt) {
      if (!PTOK()) return draw16p.call(this, tt);
      const d = this.d, P = ptPesos().filter(([, w]) => w > .001), night = P.reduce((a, [v, w]) => a + (v === 'noite' ? w : v === 'tarde' ? w * .25 : 0), 0);
      ctx.save(); ctx.imageSmoothingEnabled = true;
      // orla: anda a 40% (repete a cada 800); luzes da noite junto
      const of = ((d * .4) % PT_FW + PT_FW) % PT_FW;
      for (const [v, w] of P) { const im = ptImg('f_' + v, PTC.f[v]); if (!im) continue; ctx.globalAlpha = w; for (let x = -of; x < W; x += PT_FW) ctx.drawImage(im, x, 0, PT_FW + .6, H); }
      const lf = night > .01 && ptImg('lf', PTC.lf);
      if (lf) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.4 + .08 * Math.sin(tt * 1.9)); for (let x = -of; x < W; x += PT_FW) ctx.drawImage(lf, x, 0, PT_FW + .6, H); ctx.globalCompositeOperation = 'source-over'; }
      // calçadão: anda junto com você
      const oc = ((d % PT_CW) + PT_CW) % PT_CW;
      for (const [v, w] of P) { const im = ptImg('c_' + v, PTC.c[v]); if (!im) continue; ctx.globalAlpha = w; for (let x = -oc; x < W; x += PT_CW) ctx.drawImage(im, x, PT_CY, PT_CW + .6, H - PT_CY); }
      ctx.globalAlpha = 1; ctx.restore();
      artVignette(PGY - 40);
      const ok = true, spr2 = (nm, cx, by, w, h) => ptPart(nm, cx, by - (h ?? 4) / 2, w, h);
      for (const o of this.obs) {
        const x = o.x - d; if (x < -170 || x > W + 60) continue;
        if (o.k === 'buraco') ptPart('buraco', x + o.w / 2, PGY + 1, o.w + 16, 18);
        else if (o.k === 'coco') ptPart('coco' + (((Math.floor(o.r / (TAU / 4)) % 4) + 4) % 4), x + 6, PGY - 8, 17, 17 * PTC.p.coco0.h / PTC.p.coco0.w);
        else if (o.k === 'queda') {
          const k = clamp(1 - o.h / 150, .2, 1); ctx.globalAlpha = .35 + .5 * k; ptPart('sombra', x + 6, PGY + 1, 8 + 12 * k, 4); ctx.globalAlpha = 1;
          ptPart('queda', x + 6, PGY - o.h - 8);
        } else if (o.k === 'bot') {
          if (!ptBot(this, o, x, tt) && sReady('am_rosa') && !o.pis) vSprite(AM_PT[Math.floor(o.x) % AM_PT.length], 'parado', Math.floor(tt * 3 + o.x) % 4, { x: x + 8, y: PGY + 1 }, -1, 0, { lx: -1, ly: 0 }, false, tt, 0, 0, .55);
        } else if (o.k === 'bola') {
          if (!o.hit) { ctx.globalAlpha = .45; ptPart('sombra', x + 4, PGY + 1, 10, 3); ctx.globalAlpha = 1; ptPart('bola', x + 8, o.y + 6); }
        } else if (o.k === 'corrimao') {
          ctx.globalAlpha = .4; ptPart('sombra', x + o.w / 2, PGY + 1, o.w + 6, 4); ctx.globalAlpha = 1; ptRail(x, o.w);
        } else if (!o.got) {
          const bob = Math.sin(tt * 4 + o.x) * 2;
          if (o.alto) { // item alto: brilho dourado em volta (só com o impulso ou do corrimão)
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x + 4, o.y + 6 + bob, 1, x + 4, o.y + 6 + bob, 14);
            g.addColorStop(0, `rgba(255,214,90,${.5 + .2 * Math.sin(tt * 6 + o.x)})`); g.addColorStop(1, 'rgba(255,214,90,0)'); ctx.fillStyle = g; ctx.fillRect(x - 10, o.y - 8 + bob, 28, 28);
            for (let i = 0; i < 3; i++) { const a = tt * 3 + i * TAU / 3; ctx.fillStyle = '#fff3b0'; ctx.fillRect(x + 4 + Math.cos(a) * 11, o.y + 6 + bob + Math.sin(a) * 11, 1.6, 1.6); }
            ctx.restore();
          }
          ptPart(o.k === 'picole' ? 'picole' : 'agua', x + 4, o.y + 6 + bob);
        }
      }
      for (const s of this.sparks) R(s.x, s.y, 1.5, 1.5, s.t < .15 ? '#ffffff' : '#ffd04a');
      // impulso carregado (agachado 0,25 s): halo azul pulsando embaixo dos patins
      this.ptCarregado = !this.air && !this.grind && this.crouch && this.carga >= PT_CARGA;
      if (this.ptCarregado) { ctx.save(); const pu = .55 + .2 * Math.sin(tt * 18); ctx.fillStyle = `rgba(95,212,255,${pu})`; ctx.beginPath(); ctx.ellipse(PPX, PGY, 15, 3.6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = `rgba(255,255,255,${pu})`; ctx.beginPath(); ctx.ellipse(PPX, PGY, 8, 1.8, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      if (!PTIOK()) { this.__ia16(tt); return; }
      ptIA(this, tt);
      // impulso carregado: faíscas subindo dos patins (por cima do desenho)
      if (this.ptCarregado) {
        ctx.save();
        for (let i = 0; i < 6; i++) { const k = (tt * 2.4 + i / 6) % 1; ctx.globalAlpha = 1 - k * k; ctx.fillStyle = i % 2 ? '#5fd4ff' : '#ffffff'; ctx.fillRect(PPX - 12 + i * 4.6, PGY - 4 - k * 20, 2, 4); }
        ctx.restore();
      }
    };
  }
