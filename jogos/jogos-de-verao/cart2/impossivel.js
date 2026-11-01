/* ============================================================ Vôlei: dificuldade "impossível" (01/11/2026, pedido do dono)
   A dificuldade vai de 0 (bem fácil) até VOLEI_IMP. No valor máximo o Amiguinho não erra:
   - decide sempre certo, reage na hora, anda mais rápido e não tem dia ruim (sem humor);
   - todo toque dele que não iria cair do seu lado vira uma bola certa para o seu lado, longe de você (no 2º toque, no máximo);
   - se mesmo assim a bola for cair do lado dele, ele chega nela no último instante e devolve.
   Resultado: só ele marca ponto. Serve de teto para ajustar a dificuldade nos campeonatos. */
const VOLEI_IMP = 1.2;
{
  const L0 = (o) => (o && o.lvl != null ? o.lvl : .45);
  volei.impossivel = function () { return !this.two && L0(this.opp()) >= VOLEI_IMP - 1e-9; };
  const accNow0 = volei.accNow, moodL0 = volei.moodL, cfgNow0 = volei.cfgNow, touch0 = volei.touch;
  volei.accNow = function () { return this.impossivel() ? 1 : accNow0.call(this); };
  volei.moodL = function () { return this.impossivel() ? 0 : moodL0.call(this); };
  volei.cfgNow = function () {
    if (!this.impossivel()) return cfgNow0.call(this);
    return { ...lvlCfg(1.08), lvl: 1.08, react: .03, spd: 1.7, slip: 0, block: 1, dive: 1 };
  };
  // onde a bola cai a partir de agora, se ninguém tocar: 0 = do seu lado, 1 = do lado dele
  volei.impCai = function (b0) {
    const c = { ...b0 }; for (let t = 0; t < 5; t += DT) { ballStep(c, DT); if (c.y + VRB >= VGY) return c.x < VNX ? 0 : 1; }
    return 1;
  };
  // uma bola certa para o seu lado: por cima da rede e longe de onde você está
  volei.impBola = function (b) {
    const P0 = this.P[0];
    for (let tent = 0; tent < 3; tent++) {
      const far = P0.x > VNX * .45 ? rand(.08, .28) * VNX : rand(.58, .8) * VNX, tx = clamp(far, 18, VNX - 16);
      for (let T = .7; T < 3; T += .03) {
        const vx = (tx - b.x) / T, vy = (VGY - VRB - b.y - .5 * VG * T * T) / T, tn = (VNX - b.x) / vx, yn = b.y + vy * tn + .5 * VG * tn * tn;
        if (tn > 0 && yn < VNT - VRB - 6 && Math.hypot(vx, vy) < 560) {
          const sv = { x: b.x, y: b.y, vx: b.vx, vy: b.vy, spin: b.spin };
          b.vx = vx; b.vy = vy; b.spin = 0;
          if (this.impCai(b) === 0) { this.mom = this.momTo = MOM_BASE; return true; }
          Object.assign(b, sv);
        }
      }
    }
    // último recurso: alta e por cima da rede
    b.vx = -Math.max(120, (b.x - VNX * .5) / 1.6); b.vy = -330; b.spin = 0; this.mom = this.momTo = MOM_BASE; return false;
  };
  // toque dele: se a bola não for cair do seu lado, ela é corrigida (no 2º toque ou quando ia cair do lado dele)
  volei.touch = function (i) {
    touch0.call(this, i);
    if (i !== 1 || !this.impossivel() || this.state !== 'rally') return;
    const b = this.b; if (this.impCai(b) === 0) return;
    if (this.touches[1] >= 2 || b.vy > 0 || b.y > VGY - 70) this.impBola(b);
  };
  // a bola ia cair do lado dele: ele chega no último instante e devolve
  const ballStep0 = ballStep;
  ballStep = function (b, dt) {
    ballStep0(b, dt);
    if (b !== volei.b || volei.state !== 'rally' || !volei.impossivel()) return;
    if (b.x > VNX && b.vy > 0 && b.y + VRB >= VGY - 4) {
      b.x = Math.max(b.x, VNX + 34); b.y = VGY - VRB - 8; // colada na rede não dá para passar por cima: ele pega um pouco antes
      const p = volei.P[1]; p.x = clamp(b.x + 6, VNX + MARGIN, W - 12); p.vx = 0; p.hitA = .32; p.hitT = .18;
      volei.impBola(b);
      volei.touches = [0, 1]; volei.hits++; volei.saves1 = (volei.saves1 || 0) + 1;
      beep(300, .05, 'square', .03, 80);
    }
  };
  // rede de segurança final: um ponto seu contra o impossível vira uma defesa dele
  // (pega os casos em que a bola encosta nele já rente ao chão, ou no 4º toque)
  const point0 = volei.point;
  volei.point = function (w, why) {
    if (w === 0 && this.state === 'rally' && this.impossivel()) {
      const b = this.b; b.x = Math.max(b.x, VNX + 34); b.y = VGY - VRB - 8;
      const p = this.P[1]; p.x = clamp(b.x + 6, VNX + MARGIN, W - 12); p.vx = 0; p.hitA = .32; p.hitT = .18;
      this.impBola(b); this.touches = [0, 1]; this.saves1 = (this.saves1 || 0) + 1; return;
    }
    return point0.call(this, w, why);
  };
  const tierOf0 = tierOf;
  tierOf = (L) => (L >= VOLEI_IMP - 1e-9 ? 'impossível' : tierOf0(L));
}
