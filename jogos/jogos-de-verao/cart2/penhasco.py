"""Salto do penhasco (30/10/2026): o Salto do píer muda de lugar para a Falésia do Farol, com 5 alturas maiores.
As regras são as mesmas do píer (corrida, salto na beirada, cambalhotas, carpado, grupado, parafuso, entrada e jurados).
A falésia e o farol são desenhados pelo jogo (arte provisória até chegarem as pranchas do cenário)."""
def apply(s, sub1):
    s = sub1("const SL_H = [3, 5, 7.5, 10, 10], SL_BASE = [1, 1.2, 1.4, 1.6, 1.8];",
             "const SL_H = [6, 9, 12, 15, 18], SL_BASE = [1.1, 1.35, 1.6, 1.85, 2.1]; // falésia: cada salto mais alto (o último com vento)", s)
    s = sub1("id: 'salto', name: 'Salto do píer', tag: 'Píer · 5 saltos', wide: true, hi: true, dur: 0, med: [5000, 7800, 10500], ia: 3000, nota: 'a água tava mais dura que o normal',",
             "id: 'salto', name: 'Salto do penhasco', tag: 'Falésia do Farol · 5 saltos', wide: true, hi: true, dur: 0, med: [6500, 10000, 13500], ia: 3900, nota: 'o farol piscou bem na hora do meu salto',", s)
    s = sub1("desc: 'Corra, salte na beirada, gire e entre reto na água.',", "desc: 'Do alto da falésia: corra, salte na beirada, gire e entre reto no mar.',", s)
    s = sub1("bem na beirada do píer para saltar alto.`", "bem na beirada da falésia para saltar alto.`", s)
    s = sub1("failMsg(this.runoff ? 'Caiu do píer' : 'Barrigada');", "failMsg(this.runoff ? 'Caiu da falésia' : 'Barrigada');", s)
    s = sub1("    if (sReady('sl_obj')) this.drawPier(tt);\n", "    this.drawCliff(tt);\n", s)
    s = sub1("  drawBoat(tt) {\n", r'''  // falésia de pedra com o farol listrado em cima (desenhada pelo jogo; a beirada termina em SL_EDGE)
  drawCliff(tt) {
    const top = Math.round(this.sy(this.hpx())), sw = Math.round(this.sy(0)), E = SL_EDGE;
    // paredão: a beirada sai um pouco para a frente e a pedra entra para trás até a água
    const face = (y) => { const k = (y - top) / Math.max(1, sw - top); return E - 6 - 18 * k + Math.sin(y * .13) * 2.5 + Math.sin(y * .051 + 1) * 4; };
    ctx.save(); ctx.beginPath(); ctx.moveTo(-4, top); ctx.lineTo(E + 1, top); ctx.lineTo(E + 2, top + 3);
    for (let y = top + 4; y <= sw + 6; y += 3) ctx.lineTo(face(y), y);
    ctx.lineTo(-4, sw + 6); ctx.closePath();
    const g = ctx.createLinearGradient(0, top, 0, sw); g.addColorStop(0, '#b97a63'); g.addColorStop(.5, '#8c5751'); g.addColorStop(1, '#5c3a48');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = NAVY; ctx.stroke(); ctx.clip();
    // camadas da rocha (faixas levemente inclinadas) e rachaduras
    for (let y = top + 9, i = 0; y < sw; y += 11 + (i % 3) * 4, i++) {
      ctx.fillStyle = i % 2 ? 'rgba(60,30,50,.22)' : 'rgba(255,200,170,.13)'; ctx.beginPath(); ctx.moveTo(-4, y); ctx.lineTo(E, y - 3); ctx.lineTo(E, y + 2); ctx.lineTo(-4, y + 5); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(40,20,45,.45)'; ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) { const x = 12 + i * 14, y = top + 20 + ((i * 37) % Math.max(20, sw - top - 30)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y + 8); ctx.lineTo(x + 1, y + 15); ctx.stroke(); }
    // luz quente de fim de tarde batendo na quina
    const lg = ctx.createLinearGradient(E - 30, 0, E, 0); lg.addColorStop(0, 'rgba(255,190,120,0)'); lg.addColorStop(1, 'rgba(255,190,120,.28)'); ctx.fillStyle = lg; ctx.fillRect(E - 30, top, 32, sw - top);
    ctx.restore();
    // grama no alto e a beirada clara (onde se salta)
    ctx.fillStyle = '#5b8f3e'; ctx.fillRect(-4, top - 2, E + 2, 4); ctx.fillStyle = '#86b84f'; ctx.fillRect(-4, top - 2, E + 2, 1.5);
    for (let x = 2; x < E - 10; x += 7) { ctx.fillStyle = '#6fa346'; ctx.fillRect(x, top - 4 - (x % 3), 1.2, 3 + (x % 3)); }
    R(E - 16, top - 1, 17, 2, '#e9d3b0'); R(E - 16, top + 1, 17, 1, NAVY);
    // farol listrado (vermelho e branco) com a luz girando
    const fx = 22, fb = top - 2, fh = 62, wB = 15, wT = 10;
    for (let k = 0; k < 6; k++) {
      const y0 = fb - fh * k / 6, y1 = fb - fh * (k + 1) / 6, a0 = wB - (wB - wT) * k / 6, a1 = wB - (wB - wT) * (k + 1) / 6;
      ctx.fillStyle = k % 2 ? '#f4efe6' : '#d8433f'; ctx.beginPath(); ctx.moveTo(fx - a0 / 2, y0); ctx.lineTo(fx + a0 / 2, y0); ctx.lineTo(fx + a1 / 2, y1); ctx.lineTo(fx - a1 / 2, y1); ctx.fill();
    }
    ctx.fillStyle = 'rgba(30,20,60,.18)'; ctx.beginPath(); ctx.moveTo(fx + 1, fb); ctx.lineTo(fx + wB / 2, fb); ctx.lineTo(fx + wT / 2, fb - fh); ctx.lineTo(fx + 1, fb - fh); ctx.fill();
    ctx.strokeStyle = NAVY; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(fx - wB / 2, fb); ctx.lineTo(fx - wT / 2, fb - fh); ctx.lineTo(fx + wT / 2, fb - fh); ctx.lineTo(fx + wB / 2, fb); ctx.stroke();
    const ly = fb - fh - 7; R(fx - 7, fb - fh - 1, 14, 2, '#2b2f5e'); R(fx - 4, ly, 8, 6, '#fff3b0'); ctx.strokeRect(fx - 4, ly, 8, 6);
    ctx.fillStyle = '#d8433f'; ctx.beginPath(); ctx.moveTo(fx - 6, ly); ctx.lineTo(fx, ly - 6); ctx.lineTo(fx + 6, ly); ctx.fill(); ctx.stroke();
    const ang = tt * 1.6, glow = .25 + .25 * Math.max(0, Math.cos(ang));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,230,140,${glow})`; ctx.beginPath(); ctx.moveTo(fx, ly + 3); ctx.lineTo(fx + 70 * Math.cos(ang * .5), ly - 6); ctx.lineTo(fx + 70 * Math.cos(ang * .5), ly + 10); ctx.fill(); ctx.restore();
    // espuma batendo no pé da falésia
    for (let i = 0; i < 6; i++) { const x = face(sw) - 4 + i * 4 + Math.sin(tt * 2 + i) * 2; R(x, sw - 2 - (i % 2), 5, 2, 'rgba(255,255,255,.8)'); }
    // biruta no salto com vento
    if (this.wind && sReady('eb_obj')) {
      const f = SPR.eb_obj.fr.biruta1, dir = this.wind > 0 ? 1 : -1;
      ctx.save(); ctx.translate(half(E - 30), half(top)); ctx.scale(dir, 1); ctx.drawImage(sImg('eb_obj'), f.x, f.y, f.w, f.h, -4.5, -f.h / 2, f.w / 2, f.h / 2); ctx.restore();
    }
  },
  drawBoat(tt) {
''', s)
    s = sub1("FALA.intro.salto = [\n", "FALA.intro.salto = [\n  'Lá de cima do farol dá pra ver a costa toda. Lá de baixo dá pra ver o tamanho da barrigada kkkk',\n  'Cada salto é mais alto. No último ainda venta. Eu fechei o olho. Não recomendo.',\n", s)
    return s
