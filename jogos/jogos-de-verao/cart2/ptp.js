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
  function ptRail(x, w) {
    const R0 = PTC.rail, k = (PT_RH + 4) / (R0.chao - R0.top), top = PGY - PT_RH - 4 - R0.top * k, hh = R0.esq.h * k;
    const we = R0.esq.w * k, wm = R0.meio.w * k, wd = R0.dir.w * k, x0 = x - we * .35, x1 = x + w + wd * .35;
    const e = ptImg('r_esq', R0.esq.src), m = ptImg('r_meio', R0.meio.src), d = ptImg('r_dir', R0.dir.src);
    ctx.save(); ctx.imageSmoothingEnabled = true;
    for (let xx = x0 + we - .5; xx < x1 - wd; xx += wm - .5) { const ww = Math.min(wm, x1 - wd - xx + .5); ctx.drawImage(m, 0, 0, R0.meio.w * ww / wm, R0.meio.h, xx, top, ww, hh); }
    ctx.drawImage(e, x0, top, we, hh); ctx.drawImage(d, x1 - wd, top, wd, hh); ctx.restore();
  }
  if (typeof patins !== 'undefined') {
    const draw16p = patins.draw;
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
          if (sReady('am_rosa')) vSprite(AM_PT[Math.floor(o.x) % AM_PT.length], 'parado', Math.floor(tt * 3 + o.x) % 4, { x: x + 8, y: PGY + 1 }, -1, 0, { lx: -1, ly: 0 }, false, tt, 0, 0, .55);
        } else if (o.k === 'bola') {
          if (!o.hit) { ctx.globalAlpha = .45; ptPart('sombra', x + 4, PGY + 1, 10, 3); ctx.globalAlpha = 1; ptPart('bola', x + 8, o.y + 6); }
        } else if (o.k === 'corrimao') {
          ctx.globalAlpha = .4; ptPart('sombra', x + o.w / 2, PGY + 1, o.w + 6, 4); ctx.globalAlpha = 1; ptRail(x, o.w);
        } else if (!o.got) {
          const bob = Math.sin(tt * 4 + o.x) * 2;
          ptPart(o.k === 'picole' ? 'picole' : 'agua', x + 4, o.y + 6 + bob);
        }
      }
      for (const s of this.sparks) R(s.x, s.y, 1.5, 1.5, s.t < .15 ? '#ffffff' : '#ffd04a');
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
    };
  }
