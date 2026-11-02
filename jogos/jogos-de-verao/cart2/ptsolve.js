  /* ============================================================ Patins: sempre tem saída (01/11/2026, pedido do dono)
     "Nenhum obstáculo, ou combinação deles, pode tornar impossível não tomar dano." Cada padrão novo de obstáculos é conferido por um
     jogador que decide a cada 0,1 s (busca por todas as escolhas: nada, abaixar ou pular, sem manobras e sem o impulso) junto com os
     obstáculos que já estão vindo. Se não houver saída, o padrão novo chega um pouco depois (0,15 s por vez, até 2,4 s); se ainda
     assim não houver, ele é tirado. As regras aqui são as mesmas do patins (colisões, corrimão, pisão no Amiguinho, velocidade). */
  const PTS_DT = 1 / 60; let PTS_PASSO = 6; // decide a cada 0,1 s (tempo de reação de gente, não de máquina)
  function ptTrilha(P, obs, nMax) {
    // onde cada obstáculo está em cada quadro (não depende do jogador) e a posição e a velocidade do jogador
    let v = P.v, t = P.t, d = P.d; const D = [], X = obs.map(() => []), Hh = obs.map(() => []), K = obs.map(() => []);
    const st = obs.map((o) => ({ k: o.k, x: o.x, h: o.h || 0, vh: o.vh || 0, wait: o.wait || 0, v0: o.v0 }));
    const perigo = obs.map((o) => !!PT_TOMBO[o.k] && !o.hit && !o.pis && !o.clean);
    let fim = nMax;
    for (let f = 0; f < nMax; f++) {
      t += PTS_DT; const vm = Math.min(226, 112 + t * 1.9); v = v < vm ? Math.min(vm, v + PTS_DT * (v < 100 ? 60 : 8)) : vm; d += v * PTS_DT; D.push(d);
      for (let i = 0; i < st.length; i++) {
        const s = st[i], kv = s.v0 ? v / s.v0 : 1;
        if (s.k === 'coco') s.x -= 38 * kv * PTS_DT;
        if (s.k === 'bola') s.x -= 75 * kv * PTS_DT;
        if (s.k === 'queda') { if (s.wait > 0) s.wait -= PTS_DT; else { s.h -= s.vh * PTS_DT; s.vh += 260 * PTS_DT; if (s.h <= 0) { s.k = 'coco'; s.h = 0; } } }
        X[i].push(s.x); Hh[i].push(s.h); K[i].push(s.k);
      }
      if (fim === nMax && obs.every((o, i) => !perigo[i] || X[i][f] + (o.w || 12) < d + PPX - 7 - 2)) fim = Math.min(nMax, f + 4);
      if (f >= fim) break;
    }
    return { D, X, Hh, K, fim, perigo };
  }
  // procura um caminho sem tombo; devolve a primeira escolha (null se não houver)
  function ptBusca(P, obs, nMax = 480) {
    if (P.deadT > 0) return { a: 0 };
    const T = ptTrilha(P, obs, nMax), memo = new Map(), invF = Math.ceil((P.inv || 0) / PTS_DT);
    const gi0 = P.grind ? obs.indexOf(P.grind) : -1;
    let pis0 = 0; obs.forEach((o, i) => { if (o.pis && i < 30) pis0 |= 1 << i; });
    function passo(s, f, inp) {
      const px = T.D[f] + PPX;
      if (s.gi >= 0) { const o = obs[s.gi]; if (inp.pula) { s.gi = -1; s.air = true; s.vy = PT_JV; } else if (px > T.X[s.gi][f] + o.w - 2) { s.gi = -1; s.air = true; s.vy = 0; } }
      else if (!s.air) { s.cr = inp.d; if (inp.pula) { s.air = true; s.vy = PT_JV; s.cr = false; } }
      if (s.air) {
        const py = s.y; s.y += s.vy * PTS_DT; s.vy -= PT_G * PTS_DT;
        if (s.vy < 0 && py >= PT_RH - 1 && s.y <= PT_RH) {
          const j = obs.findIndex((q, i) => T.K[i][f] === 'corrimao' && !q.hit && px > T.X[i][f] - 4 && px < T.X[i][f] + q.w - 4);
          if (j >= 0) { s.gi = j; s.air = false; s.vy = 0; s.y = PT_RH; }
        }
        if (s.air && s.y <= 0) { s.y = 0; s.air = false; s.vy = 0; }
      }
      const fh = s.y, bodyH = s.cr && !s.air ? 30 : 44, px0 = px - 7, px1 = px + 7;
      for (let i = 0; i < obs.length; i++) {
        const o = obs[i]; if (o.hit || o.got || !T.perigo[i]) continue;
        const k = T.K[i][f], x = T.X[i][f]; let hit = false;
        if (k === 'buraco') hit = !s.air && s.gi < 0 && px > x + 4 && px < x + o.w - 4;
        else if (k === 'coco') hit = px1 > x + 2 && px0 < x + 11 && fh < 11;
        else if (k === 'queda') { const h = T.Hh[i][f]; hit = px1 > x + 1 && px0 < x + 10 && h < fh + bodyH && h + 13 > fh; }
        else if (k === 'bot') {
          if (s.pis & (1 << i)) continue; const enc = px1 > x + PT_BOT.x0 && px0 < x + PT_BOT.x1;
          if (enc && s.air && s.vy <= 40 && fh >= PT_BOT.p0 && fh < PT_BOT.p1) { s.pis |= 1 << i; s.vy = PT_JV * .8; s.y = Math.max(s.y, PT_BOT.cab); continue; }
          hit = enc && fh < PT_BOT.cab;
        } else if (k === 'bola') hit = px1 > x && px0 < x + 6 && fh + bodyH > 39 && fh < 48;
        else if (k === 'corrimao') {
          if (s.air && s.gi !== i && fh < PT_RH && fh >= PT_RH - 14 && px > x - 4 && px < x + 30) { if (s.vy <= 0) { s.gi = i; s.air = false; s.vy = 0; s.y = PT_RH; } continue; }
          hit = s.gi !== i && px > x && px < x + o.w && fh < PT_RH && fh + bodyH > PT_RH - 6;
        }
        if (hit && f >= invF) return false;
      }
      return true;
    }
    const OP_CHAO = [{ pula: false, d: false }, { pula: false, d: true }, { pula: true, d: false }], OP_TRILHO = [{ pula: false, d: false }, { pula: true, d: false }], OP_AR = [{ pula: false, d: false }];
    function dfs(f, s) {
      if (f >= T.fim) return true;
      const key = f + '|' + Math.round(s.y * 4) + '|' + Math.round(s.vy) + '|' + (s.air ? 1 : 0) + (s.cr ? 1 : 0) + '|' + s.gi + '|' + s.pis;
      if (memo.has(key)) return memo.get(key);
      memo.set(key, false);
      const ops = s.gi >= 0 ? OP_TRILHO : s.air ? OP_AR : OP_CHAO;
      for (let a = 0; a < ops.length; a++) {
        const n = { ...s }; let ok = true;
        for (let q = 0; q < PTS_PASSO && ok && f + q < T.fim; q++) ok = passo(n, f + q, q === 0 ? ops[a] : { pula: false, d: ops[a].d });
        if (ok && dfs(f + PTS_PASSO, n)) { memo.set(key, true); if (f === 0) achou = a; return true; }
      }
      return false;
    }
    let achou = -1;
    const s0 = { y: P.y, vy: P.vy, air: P.air, cr: P.crouch, gi: gi0, pis: pis0 };
    if (!dfs(0, s0)) return null;
    const ops = s0.gi >= 0 ? OP_TRILHO : s0.air ? OP_AR : OP_CHAO; return { a: achou, op: ops[Math.max(0, achou)] };
  }
  window.__ptBusca = ptBusca; window.__ptPasso = (n) => { PTS_PASSO = n; };
  // confere os obstáculos novos (os do fim da lista, a partir de n0): atrasa até haver saída, ou tira o padrão
  function ptConfere(P, n0) {
    const velhos = P.obs.slice(0, n0), novos = P.obs.slice(n0);
    if (!novos.some((o) => PT_TOMBO[o.k])) return 0;
    // se já não houver saída por causa do que veio antes (ex.: no meio de um tombo), confere só o padrão novo
    const base = ptBusca(P, velhos) ? velhos : [];
    let atraso = 0;
    while (!ptBusca(P, base.concat(novos))) {
      if (atraso >= 2.4) { P.obs = velhos; P.nextArr = P.t + .6; P.ptTirados = (P.ptTirados || 0) + 1; return -1; }
      const a = .15; atraso += a; P.nextArr += a;
      for (const o of novos) { o.x += (P.v + (o.k === 'bola' ? 75 : o.k === 'coco' ? 38 : 0) * (o.v0 ? P.v / o.v0 : 1)) * a; if (o.k === 'queda') o.wait = (o.wait || 0) + a; }
    }
    if (atraso > 0) P.ptAtrasos = (P.ptAtrasos || 0) + 1;
    return atraso;
  }
  window.__ptConfere = ptConfere;
  // espaço entre as coisas paradas no chão (01/11, pedido do dono: Amiguinhos colados e itens muito perto). Extensão de cada uma,
  // como aparece na tela; entre o padrão novo e o que já está na pista, pelo menos PT_ESPACO de chão livre.
  const PT_ESPACO = 34;
  function ptExt(o) {
    if (o.k === 'bot') return [o.x - 6, o.x + 22];
    if (o.k === 'buraco') return [o.x - 6, o.x + o.w + 6];
    if (o.k === 'corrimao') return [o.x - 8, o.x + o.w + 8];
    if ((o.k === 'picole' || o.k === 'agua') && !o.alto && o.y > PGY - 40) return [o.x - 2, o.x + 12];
    return null;
  }
  function ptAnda(P, novos, a) { for (const o of novos) { o.x += (P.v + (o.k === 'bola' ? 75 : o.k === 'coco' ? 38 : 0) * (o.v0 ? P.v / o.v0 : 1)) * a; if (o.k === 'queda') o.wait = (o.wait || 0) + a; } P.nextArr += a; }
  function ptEspaca(P, n0) {
    const velhos = P.obs.slice(0, n0), novos = P.obs.slice(n0); let falta = 0;
    for (const n of novos) { const a = ptExt(n); if (!a) continue; for (const o of velhos) { const b = ptExt(o); if (!b) continue; if (a[0] < b[1] + PT_ESPACO && a[1] > b[0] - PT_ESPACO) falta = Math.max(falta, b[1] + PT_ESPACO - a[0]); } }
    if (falta > 0) { ptAnda(P, novos, falta / P.v); P.ptEspacados = (P.ptEspacados || 0) + 1; }
  }
  // itens altos (01/11, pedido do dono): acima do alcance do pulo comum; dá para pegar com o impulso ou pulando de cima do corrimão.
  // Picolé ou água de coco a 128 do chão (o pulo comum alcança até uns 95; o impulso, 125; do corrimão, 133). Valem 3×.
  const PT_ALTO = 128;
  function ptAltos(P, n0) {
    const novos = P.obs.slice(n0), px = P.d + PPX, v = P.v; if (!novos.length) return;
    // em cima do corrimão do padrão novo
    const rail = novos.find((o) => o.k === 'corrimao');
    if (rail && Math.random() < .45) { P.obs.push({ k: Math.random() < .5 ? 'picole' : 'agua', x: rail.x + rail.w * rand(.45, .7), y: PGY - PT_ALTO, alto: true, v0: v }); return; }
    // no espaço livre depois do padrão: o picolé do chão que já estaria ali sobe, ou entra um novo
    let fim = 0; for (const o of novos) if (PT_TOMBO[o.k]) { const sp = o.k === 'bola' ? 75 : o.k === 'coco' ? 38 : 0; fim = Math.max(fim, (o.x + (o.w || 12) - px) / (v + sp)); }
    const livre = (P.nextArr - P.t) - fim; if (livre < 1.05 || Math.random() > .4) return;
    const x = px + v * (fim + livre * .5), chao = novos.find((o) => (o.k === 'picole' || o.k === 'agua') && !o.alto && Math.abs(o.x - x) < 70);
    if (chao) { chao.alto = true; chao.y = PGY - PT_ALTO; chao.x = x; } else P.obs.push({ k: Math.random() < .5 ? 'picole' : 'agua', x, y: PGY - PT_ALTO, alto: true, v0: v });
  }
  if (typeof patins !== 'undefined') {
    const spawn0 = patins.spawn;
    patins.spawn = function () {
      const n0 = this.obs.length; spawn0.call(this);
      if (!window.__ptSemEspacar) ptEspaca(this, n0);
      if (!window.__ptSemConferir) ptConfere(this, n0);
      if (this.obs.length > n0) ptAltos(this, n0);
    };
  }
