extends RefCounted
## Vôlei: o cérebro do Amiguinho (o mesmo do navegador).
##   cerebro_novo: antes de cada toque ele imagina (simula) para onde a bola vai se ele se posicionar em vários lugares,
##   pulando ou não, e escolhe o melhor: mandar para o outro lado longe de você, levantar perto da rede para cortar, ou cortar.
##   Assertividade = chance de cada decisão sair certa (40% no nível mais fácil, 90% no mais difícil, e o humor do placar mexe).
##   cerebro_antigo: o cérebro de antes. No jogo de verdade ele não é usado (o lado esquerdo é você); ele joga no seu lugar
##   no teste automático, igual ao teste do navegador.

const F = preload("res://provas/volei/fisica.gd")
const W := F.W
const DT := F.DT
const VGY := F.VGY
const VNX := F.VNX
const VNT := F.VNT
const HOME := F.HOME
const VRB := F.VRB
const MARGIN := F.MARGIN
const PJUMP := F.PJUMP
const PGRAV := F.PGRAV

## true: as contas pesadas do Amiguinho rodam em paralelo nos núcleos do processador (o resultado é o mesmo).
## Ficou desligado: na máquina de teste (2 núcleos) em paralelo ficou mais lento que uma conta por vez.
const PARALELO := false

static func rand(a: float, b: float) -> float: return a + randf() * (b - a)
static func cl(v: float, a: float, b: float) -> float: return maxf(a, minf(b, v))

# ---------------------------------------------------------------- cérebro antigo (o "brain" original)
static func cerebro_antigo(v, i: int, dt: float, A: Dictionary, cfg: Dictionary) -> Dictionary:
	var p: F.Jog = v.P[i]
	var b: F.Bola = v.b
	var home := W - HOME if i else HOME
	var behind := 1.0 if i else -1.0
	var toNet := -behind
	A.t = A.get("t", 0.0) - dt
	if A.t <= 0.0:
		A.t = cfg.react + rand(0.0, 0.07)
		var slip := 4.0 if randf() < cfg.slip else 1.0
		if v.state == "serve":
			A.tx = p.x if v.server == i else home; A.mode = "hit" if v.server == i else "wait"
		else:
			# mira o ponto em que a bola encontra o alto da cabeça e fica um pouco atrás dele
			var pr: Array = v.predict(VGY - 46.0)
			var mine: bool = pr[0] > VNX if i else pr[0] < VNX
			var cross = v.crossing() if ((b.x < VNX and b.vx > 0.0) if i else (b.x > VNX and b.vx < 0.0)) else null
			var atk: F.Jog = v.P[1 - i]
			var threat: bool = not mine and absf(b.x - VNX) < 70.0 and b.y < VNT - 6.0 and absf(atk.x - VNX) < 70.0 and (not atk.g or atk.ch != null or atk.sw != null)
			if threat and A.get("blkRoll", -1) != v.hits:
				A.blkRoll = v.hits; A.blkOK = randf() < cfg.block * cfg.get("read", 1.0)
			if not mine and ((threat and A.get("blkOK", false)) or (cross != null and cross > VNT - 52.0 and cross < VNT - 4.0 and randf() < cfg.block)):
				A.mode = "block"; A.tx = VNX + behind * (MARGIN + 2.0)
			elif mine:
				# no último toque, quem joga bem manda a bola de vez para o outro lado
				var last: bool = (v.touches[i] >= 2 or (v.hits == 0 and v.server == i)) and randf() < cfg.get("iq", 0.0)
				if A.get("spRoll", -1) != v.hits:
					A.spRoll = v.hits; A.spOK = randf() < cfg.get("spike", 0.0) and absf(pr[0] - VNX) < 52.0
				# levantada: no primeiro toque, quem joga bem sobe a bola perto da rede para cortar no segundo
				if A.get("setRoll", -1) != v.hits:
					A.setRoll = v.hits; A.setOK = v.touches[i] == 0 and not (v.hits == 0 and v.server == i) and absf(pr[0] - VNX) > 40.0 and randf() < cfg.get("set", 0.0)
				A.mode = "hit"
				var off: float
				if A.spOK: off = rand(13.0, 17.0) - 8.5 * cl((cfg.get("lvl", 0.45) - 0.3) / 0.6, 0.0, 1.0)
				elif last: off = rand(11.0, 15.0)
				else: off = rand(6.0, 11.0)
				A.tx = cl(pr[0] + behind * off + rand(-1.0, 1.0) * cfg.err * slip, VNX + MARGIN if i else 14.0, W - 14.0 if i else VNX - MARGIN)
				if last: A.fwd = true
				elif v.touches[i] >= 1 or randf() < 0.5: A.fwd = randf() < cfg.fwd
				else: A.fwd = false
				if A.setOK and not A.spOK:
					A.fwd = false; A.tx = cl(pr[0] + behind * rand(3.0, 6.0) + rand(-1.0, 1.0) * cfg.err * 0.5, VNX + MARGIN if i else 14.0, W - 14.0 if i else VNX - MARGIN)
				# saque: só precisa encostar de cabeça embaixo da bola
				if v.hits == 0 and v.server == i:
					A.fwd = false; A.spOK = false; A.tx = cl(pr[0] + behind * rand(1.0, 4.0), VNX + MARGIN if i else 14.0, W - 14.0 if i else VNX - MARGIN)
			else:
				A.mode = "wait"; A.tx = home + toNet * 20.0
	var dx: float = A.tx - p.x
	var bx := b.x - p.x
	var by := (p.y - 22.0) - b.y
	var l := dx < -3.0
	var r := dx > 3.0
	var u := false
	var fwd: bool = A.get("fwd", false)
	if A.get("mode", "") == "block":
		var atk2: F.Jog = v.P[1 - i]
		u = p.g and absf(p.x - A.tx) < 8.0 and ((absf(b.x - VNX) < 46.0 and b.y < VNT) or ((atk2.ch != null or atk2.sw != null) and absf(atk2.x - VNX) < 60.0 and absf(b.x - VNX) < 70.0))
	elif A.get("mode", "") == "hit":
		u = p.g and absf(bx) < 24.0 and by > 18.0 and by < 86.0 and (b.vy > -60.0 or v.state == "serve")
		if not p.g and fwd and absf(bx) < 40.0:
			l = i == 1; r = i == 0
	var empurra := fwd and not p.g and absf(bx) < 40.0
	var ax := 0.0
	if l or r:
		ax = cl(dx / 14.0, -1.0, 1.0) * (0.0 if empurra else 1.0) + ((-1.0 if i else 1.0) if empurra else 0.0)
	# peixinho quando a bola vai cair longe demais para chegar andando
	var d := false
	var dir := 0.0
	if A.get("mode", "") != "block" and p.g and p.dv == null and v.state == "rally" and b.vy > 30.0 and (b.x > VNX + 4.0 if i else b.x < VNX - 4.0):
		var tg := (VGY - VRB - b.y) / b.vy
		var dxb := b.x - p.x
		if tg < 0.32 and absf(dxb) > 128.0 * cfg.get("spd", 1.0) * tg + 8.0 and absf(dxb) < 72.0:
			if A.get("diveHit", -1) != v.hits:
				A.diveHit = v.hits; A.diveOK = randf() < cfg.get("dive", 0.0)
			if A.diveOK:
				d = true; dir = signf(dxb)
	# cortada: aperta quando a mão vai passar pela bola no meio do giro
	var sp := false
	if A.get("spOK", false) and A.get("mode", "") == "hit" and not p.g and p.sw == null and not p.swUsed and v.state == "rally" and absf(p.x - VNX) < 60.0 and (b.x > VNX - 30.0 if i else b.x < VNX + 30.0):
		var pw := 0.5 + 0.45 * cl(cfg.get("lvl", 0.45), 0.0, 1.0)
		var rs = v.spike_sim(i, pw) if v.touches[i] < 3 else null
		if rs != null and rs.good and rs.v > 250.0 and randf() > cfg.slip * 4.0:
			sp = true; A.pow = pw
	return {"l": l, "r": r, "u": u, "ax": ax, "d": d, "dir": dir, "sp": sp, "pow": A.get("pow", null)}

# ---------------------------------------------------------------- simulações do cérebro novo
## contato com a cabeça/corpo, igual ao do jogo (sem o tremidinho aleatório). Devolve -1 (não bateu), 0 ou 1 (batida para a frente)
static func ai_bounce(b: F.Bola, p: F.Jog, i: int) -> int:
	for S in F.SHAPES:
		var cx := p.x
		var cy: float = p.y + S.dy
		var dx := b.x - cx
		var dy := b.y - cy
		var d := sqrt(dx * dx + dy * dy)
		var R0: float = VRB + S.r
		if d >= R0 or d == 0.0:
			continue
		var nx := dx / d
		var ny := dy / d
		b.x = cx + nx * (R0 + 0.5); b.y = cy + ny * (R0 + 0.5)
		var rvx := b.vx - p.vx
		var rvy := b.vy - p.vy
		var vn := rvx * nx + rvy * ny
		if vn >= 0.0 and p.hitT > 0.0:
			continue
		var tx := -ny
		var ty := nx
		var vt := rvx * tx + rvy * ty
		var outN: float = -minf(0.0, vn) * 0.32 + S.pop
		var outT := vt * 0.55
		var ox := nx * outN + tx * outT + p.vx * 0.55
		var oy := ny * outN + ty * outT + minf(0.0, p.vy) * 0.35
		var sp := sqrt(ox * ox + oy * oy)
		var lim := cl(sp, F.VMIN, F.VMAX)
		ox *= lim / sp; oy *= lim / sp
		b.vx = ox; b.vy = oy; b.spin = cl(b.spin * 0.3 + vt * 0.03, -10.0, 10.0)
		var fwd: bool = not p.g and (p.vx > 20.0 if i == 0 else p.vx < -20.0)
		return 1 if fwd else 0
	return -1

static func ai_move(p: F.Jog, i: int, target: float, dt: float) -> void:
	var speeding := target != 0.0 and (p.vx == 0.0 or signf(target) == signf(p.vx)) and absf(target) > absf(p.vx)
	var acc := (1250.0 if speeding else 1900.0) if p.g else (760.0 if speeding else 520.0)
	var dv := target - p.vx
	p.vx += signf(dv) * minf(absf(dv), acc * dt)
	p.x += p.vx * dt
	var x0 := p.x
	p.x = cl(p.x, VNX + MARGIN, W - 12.0) if i else cl(p.x, 12.0, VNX - MARGIN)
	if p.x != x0: p.vx = 0.0
	if not p.g:
		p.vy += PGRAV * dt; p.y += p.vy * dt
		if p.y >= VGY:
			p.y = VGY; p.vy = 0.0; p.g = true

## o caminho da bola sem ninguém tocar (estado depois de 0, 1, 2... passos). As simulações abaixo usam este caminho
## em vez de refazer a mesma conta da bola a cada tentativa: o resultado é exatamente o mesmo, só fica mais rápido.
## Devolve [bolas, x, y, vx, vy].
static func trajetoria(v, n: int = 140) -> Array:
	var bolas := []
	var xs := PackedFloat64Array(); var ys := PackedFloat64Array(); var vxs := PackedFloat64Array(); var vys := PackedFloat64Array()
	var c: F.Bola = v.b.copia()
	var mom: float = v.mom
	for k in n + 1:
		if k > 0: F.ball_step(c, DT * mom)
		bolas.append(c.copia()); xs.append(c.x); ys.append(c.y); vxs.append(c.vx); vys.append(c.vy)
	return [bolas, xs, ys, vxs, vys]

## simula: andar até tx (g = sem pular, j = pula na hora, jf = pula e empurra para a rede) e ver o que a bola faz depois do toque.
## (a conta do andar, o ai_move, está escrita aqui dentro com variáveis soltas para ficar rápida; é a mesma)
static func ai_sim(v, i: int, tx: float, mode: String, spd: float, tr: Array = []) -> Dictionary:
	if tr.is_empty(): tr = trajetoria(v)
	return ai_sim_de(v.P[i], v.mom, i, tx, mode, spd, tr)

## a mesma simulação, com uma foto do personagem (não mexe na partida: pode rodar em paralelo)
static func ai_sim_de(P0: F.Jog, mom: float, i: int, tx: float, mode: String, spd: float, tr: Array) -> Dictionary:
	var xs: PackedFloat64Array = tr[1]
	var ys: PackedFloat64Array = tr[2]
	var vxs: PackedFloat64Array = tr[3]
	var vys: PackedFloat64Array = tr[4]
	var b: F.Bola = null   # só existe quando a bola sai do caminho guardado
	var bx0 := xs[0]
	var by0 := ys[0]
	var bvx := vxs[0]
	var bvy := vys[0]
	var k := 0
	var px := P0.x
	var py := P0.y
	var pvx := P0.vx
	var pvy := P0.vy
	var pg := P0.g
	var phitT := P0.hitT
	var toNet := -1.0 if i else 1.0
	var lo := VNX + MARGIN if i else 12.0
	var hi := W - 12.0 if i else VNX - MARGIN
	var hit := -1
	var t := 0.0
	var jf := mode == "jf"
	var pula := mode != "g"
	var r_cab := (VRB + 12.8) * (VRB + 12.8)
	var r_corpo := (VRB + 9.6) * (VRB + 9.6)
	while t < 1.7:
		var bx := bx0 - px
		var by := (py - 22.0) - by0
		var target := maxf(-1.0, minf(1.0, (tx - px) / 14.0)) * 128.0 * spd if absf(tx - px) > 3.0 else 0.0
		if jf and not pg and absf(bx) < 40.0: target = toNet * 128.0 * spd
		if pula and pg and absf(bx) < 24.0 and by > 18.0 and by < 86.0 and bvy > -60.0:
			pvy = -PJUMP; pg = false
		# ---- ai_move
		var speeding := target != 0.0 and (pvx == 0.0 or signf(target) == signf(pvx)) and absf(target) > absf(pvx)
		var acc := (1250.0 if speeding else 1900.0) if pg else (760.0 if speeding else 520.0)
		var dv := target - pvx
		pvx += signf(dv) * minf(absf(dv), acc * DT)
		px += pvx * DT
		var x0 := px
		px = maxf(lo, minf(hi, px))
		if px != x0: pvx = 0.0
		if not pg:
			pvy += PGRAV * DT; py += pvy * DT
			if py >= VGY:
				py = VGY; pvy = 0.0; pg = true
		# ----
		phitT -= DT
		k += 1
		if b != null:
			F.ball_step(b, DT * mom); bx0 = b.x; by0 = b.y; bvx = b.vx; bvy = b.vy
		else:
			bx0 = xs[k]; by0 = ys[k]; bvx = vxs[k]; bvy = vys[k]
		if by0 + VRB >= VGY:
			return {"hit": false, "score": (-30.0 if (bx0 > VNX if i else bx0 < VNX) else 0.0)}
		if not (bx0 > VNX if i else bx0 < VNX) and bvx * toNet > 0.0:
			return {"hit": false, "score": 0.0}
		var dx := bx0 - px
		var dy1 := by0 - (py - 23.5)
		var dy2 := by0 - (py - 7.5)
		if b != null or dx * dx + dy1 * dy1 < r_cab or dx * dx + dy2 * dy2 < r_corpo:
			if b == null: b = tr[0][k].copia()
			var p := F.Jog.new()
			p.x = px; p.y = py; p.vx = pvx; p.vy = pvy; p.g = pg; p.hitT = phitT
			hit = ai_bounce(b, p, i)
			bx0 = b.x; by0 = b.y; bvx = b.vx; bvy = b.vy
			if hit >= 0: break
		t += DT
	if hit < 0:
		return {"hit": false, "score": -8.0}
	if hit == 1: mom = F.MOM_FAST
	elif b.vy < -60.0 and mom > F.MOM_BASE: mom = F.MOM_BASE
	var V := F.voo(b, DT * mom, 3.0, i)
	var fim_meu: bool = b.x > VNX if i else b.x < VNX
	return {"hit": true, "cross": V[0] and not fim_meu, "land": b.x, "apex": V[1], "vc": V[2], "fast": hit == 1, "t": t + V[3], "tHit": t}

## pontua o resultado: passar longe de você vale mais; levantar alto perto da rede (para cortar) também
static func ai_score(v, i: int, r: Dictionary, n: int) -> float:
	if not r.hit: return r.score
	var opp: F.Jog = v.P[1 - i]
	var netD: float = absf(r.land - VNX)
	if r.cross:
		return 20.0 + minf(8.0, r.vc / 50.0) + minf(6.0, absf(r.land - opp.x) / 25.0) + (3.0 if r.fast else 0.0) + (2.0 if r.apex > VNT - 60.0 else 0.0)
	if n >= 3: return -25.0
	if r.apex < VNT - 22.0 and netD > 14.0 and netD < 85.0:
		return 12.0 + (2.0 if r.apex < VNT - 50.0 else 0.0) - absf(netD - 40.0) / 20.0  # levantada boa para cortar
	if r.t > 0.8: return 3.0 - netD / 50.0
	return -12.0

## a cortada a partir de um estado imaginado
## bolas/k0: o caminho guardado da bola e onde ela está agora nele (a bola segue o caminho até chegar perto do braço)
static func spike_from(i: int, p0: F.Jog, b0: F.Bola, pw: float, g: float, bolas: Array = [], k0: int = -1, reusa: bool = true):
	var p := p0.copia()
	var guia := k0 >= 0
	var b: F.Bola = b0 if guia else b0.copia()
	var kk := k0
	var face := -1.0 if i else 1.0
	var t := DT
	var T := F.swing_t(false, pw)
	while t <= T:
		p.vy += PGRAV * DT; p.y += p.vy * DT; p.x += p.vx * DT
		if p.y >= VGY: return null
		if guia:
			kk += 1; b = bolas[kk]
		else:
			F.ball_step(b, DT * g)
		if b.y + VRB >= VGY: return null
		if not F.braco_alcanca(b, p.x, p.y, face, false): t += DT; continue
		if guia:
			b = b.copia(); guia = false
		for P in F.swing_pose(p.x, p.y, p.vx, p.vy, face, t, false, pw, -1.0, b, reusa):
			if F.spike_hit(b, P).x < 0.0: continue
			var vel := sqrt(b.vx * b.vx + b.vy * b.vy)
			F.voo(b, DT, 1e9, i, 240)
			if b.y + VRB >= VGY:
				return {"good": (b.x < VNX if i else b.x > VNX), "v": vel, "land": b.x}
			return {"good": false, "v": vel}
		t += DT
	return null

## cortada: em que momento pular (e onde ficar) para a cortada dar certo, sem antes a bola bater na cabeça
## (o andar do ai_move está escrito aqui dentro com variáveis soltas, para ficar rápido; é a mesma conta)
static func ai_spike_plan(v, i: int, spd: float, pw: float, tr: Array = []):
	if tr.is_empty(): tr = trajetoria(v)
	var bolas: Array = tr[0]
	var xs: PackedFloat64Array = tr[1]
	var ys: PackedFloat64Array = tr[2]
	var vys: PackedFloat64Array = tr[4]
	var toNet := -1.0 if i else 1.0
	var behind := -toNet
	var best = null
	var P0: F.Jog = v.P[i]
	var mom: float = v.mom
	var lo := VNX + MARGIN if i else 12.0
	var hi := W - 12.0 if i else VNX - MARGIN
	# caminho da bola (sem ninguém tocar)
	var TR := PackedFloat64Array()
	var t0 := 0.0
	var kc := 0
	while t0 < 2.2:
		TR.append(xs[kc]); kc += 1
		if ys[kc] + VRB >= VGY: break
		t0 += DT
	var n := TR.size()
	var saque_meu: bool = v.server == i and v.hits == 0
	var tossT: float = v.tossT
	# pula o mais tarde possível: fica embaixo da bola e sobe na hora certa.
	# As três distâncias (24, 30 e 36) são contas independentes: rodam ao mesmo tempo nos núcleos do processador
	# e depois o resultado é juntado na mesma ordem do navegador (o mesmo resultado, mais rápido).
	var offs := [24.0, 30.0, 36.0]
	var res := [{}, {}, {}]
	var dados := [i, spd, pw, mom, lo, hi, n, saque_meu, tossT, P0.copia()]
	if PARALELO:
		var id := WorkerThreadPool.add_group_task(func(k: int) -> void: res[k]["ok"] = _plano_off(offs[k], dados, TR, bolas, xs, ys, vys, false), 3, -1, true, "volei: plano de cortada")
		WorkerThreadPool.wait_for_group_task_completion(id)
	else:
		for k in 3: res[k]["ok"] = _plano_off(offs[k], dados, TR, bolas, xs, ys, vys, true)
	for k in 3:
		var ok = res[k].get("ok")
		if ok != null and (best == null or ok.tj > best.tj + 1e-6): best = ok
	return best

## uma das distâncias do plano de cortada (tudo o que ela usa vem nos argumentos; não mexe na partida)
static func _plano_off(off: float, dados: Array, TR: PackedFloat64Array, bolas: Array, xs: PackedFloat64Array, ys: PackedFloat64Array, vys: PackedFloat64Array, reusa: bool):
	var i: int = dados[0]
	var spd: float = dados[1]
	var pw: float = dados[2]
	var mom: float = dados[3]
	var lo: float = dados[4]
	var hi: float = dados[5]
	var n: int = dados[6]
	var saque_meu: bool = dados[7]
	var tossT: float = dados[8]
	var P0: F.Jog = dados[9]
	var toNet := -1.0 if i else 1.0
	var behind := -toNet
	var raio_cab2 := (VRB + 12.8 + 2.0) * (VRB + 12.8 + 2.0)
	var fx: float = toNet * F.SPK_F.x
	var fy: float = F.SPK_F.y
	var tj := 1.3
	while tj >= -1e-6:
		if not P0.g and tj > 1e-6:
			tj -= 0.05; continue
		var px := P0.x
		var py := P0.y
		var pvx := P0.vx
		var pvy := P0.vy
		var pg := P0.g
		var kb := 0
		var ok = null
		var jx: float = TR[clampi(int(F.jsround((tj + 0.28) / DT)), 0, n - 1)] + behind * off
		var t := 0.0
		while t < tj + 0.75:
			var tx: float = jx if pg else xs[kb] + behind * off
			var target := maxf(-1.0, minf(1.0, (tx - px) / 10.0)) * 128.0 * spd if absf(tx - px) > 2.0 else 0.0
			if pg and t >= tj:
				pvy = -PJUMP; pg = false
			# ---- ai_move
			var speeding := target != 0.0 and (pvx == 0.0 or signf(target) == signf(pvx)) and absf(target) > absf(pvx)
			var acc := (1250.0 if speeding else 1900.0) if pg else (760.0 if speeding else 520.0)
			var dv := target - pvx
			pvx += signf(dv) * minf(absf(dv), acc * DT)
			px += pvx * DT
			var x0 := px
			px = maxf(lo, minf(hi, px))
			if px != x0: pvx = 0.0
			if not pg:
				pvy += PGRAV * DT; py += pvy * DT
				if py >= VGY:
					py = VGY; pvy = 0.0; pg = true
			# ----
			kb += 1
			var bx := xs[kb]
			var by := ys[kb]
			if by + VRB >= VGY or not ((bx + toNet * 6.0) > VNX if i else (bx + toNet * 6.0) < VNX): break
			var tossing: bool = saque_meu and vys[kb] < 0.0 and tossT + t < 0.6  # a bola do saque subindo não encosta em quem sacou
			var hx := bx - px
			var hy := by - (py - 23.5)
			if not tossing and hx * hx + hy * hy < raio_cab2: break  # bateria a cabeça antes
			if not pg:
				var ex := bx - (px + fx)
				var ey := by - (py + fy)
				if sqrt(ex * ex + ey * ey) < 24.0:
					var p := F.Jog.new()
					p.x = px; p.y = py; p.vx = pvx; p.vy = pvy; p.g = pg
					var r = spike_from(i, p, bolas[kb], pw, mom, bolas, kb, reusa)
					if r != null and r.good and r.v > 250.0:
						ok = {"tj": tj, "off": off, "tHit": t, "v": r.v, "land": r.land, "jx": jx}
						break
			t += DT
		if ok != null: return ok
		tj -= 0.05
	return null

# ---------------------------------------------------------------- cérebro novo do Amiguinho (30/10/2026)
static func acc_now(v) -> float:
	var base := 0.40 + 0.50 * cl(v.base_lvl(), 0.0, 1.0)
	var m: float = v.mood if v.moody else 0.0
	return cl(base + (0.05 * m if m > 0.0 else 0.11 * m * (0.6 + 0.4 * base)), 0.3, 0.96)

static func cerebro_novo(v, i: int, dt: float, A: Dictionary, cfg: Dictionary) -> Dictionary:
	var p: F.Jog = v.P[i]
	var b: F.Bola = v.b
	var home := W - HOME if i else HOME
	var behind := 1.0 if i else -1.0
	var toNet := -behind
	var acc := acc_now(v)
	var spd: float = cfg.get("spd", 1.0)
	var kl := cl((acc - 0.4) / 0.5, 0.0, 1.0)
	# um sorteio por lance: esta jogada sai certa ou não
	var ev := "%d:%d" % [v.rallies, v.hits]
	if A.get("ev", "") != ev:
		A.ev = ev; A.good = randf() < acc
		A.read = rand(-1.0, 1.0) * lerpf(6.0, 1.0, kl) if A.good else rand(-1.0, 1.0) * lerpf(42.0, 16.0, kl)
		A.bias = rand(-1.0, 1.0) * lerpf(26.0, 10.0, kl); A.spUse = randf() < pow(acc, 2.5); A.diveOK = randf() < acc; A.plan = null; A.t = 0.0
	var out := {"l": false, "r": false, "u": false, "ax": 0.0, "d": false, "dir": 0.0, "sp": false, "pow": 0.5 + 0.45 * cl(acc, 0.0, 1.0)}
	var steer := func(tx: float, k: float) -> void:
		var ddx := tx - p.x
		if absf(ddx) > A.get("dz", 5.0):
			out.ax = cl(ddx / k, -1.0, 1.0); out.l = ddx < 0.0; out.r = ddx > 0.0
	# ---------- saque dele
	if v.server == i and v.hits == 0 and (v.state == "serve" or (v.state == "rally" and v.tossT < 2.5)):
		if A.get("srvFor", -1) != v.rallies:
			A.srvFor = v.rallies; A.srvSpike = randf() < cl((acc - 0.5) * 1.6, 0.0, 0.75)
			if v.held: v.aiServe.hold = rand(0.5, 0.62) if A.srvSpike else rand(0.1, 0.35)
		if v.held: return out
		if A.srvSpike:
			A.t -= dt
			if A.plan == null or A.t <= 0.0:
				A.t = 0.08
				var spl = ai_spike_plan(v, i, spd, out.pow) if p.g else null
				if spl != null: A.plan = {"k": "sp", "jt": spl.tj, "off": spl.off, "jx": spl.jx, "t0": v.t}
				elif A.plan == null or p.g: A.plan = {"k": "srv"}
			if A.plan.k == "sp":
				steer.call(A.plan.jx if p.g else b.x + behind * A.plan.off, 10.0)
				if p.g and v.t - A.plan.t0 >= A.plan.jt - 1e-6: out.u = true
				if not p.g and p.sw == null and not p.swUsed:
					var r = v.spike_sim(i, out.pow)
					if r != null and r.good and r.v > 250.0: out.sp = true
				if not p.g or A.plan.jt < 0.6: return out
		# saque de toque: fica embaixo da bola (o lugar onde ela cai do outro lado é escolhido no toque)
		var prs: Array = v.predict(VGY - 46.0)
		steer.call(prs[0] + behind * rand(1.0, 3.0), 14.0)
		out.u = p.g and absf(b.x - p.x) < 24.0 and (p.y - 22.0) - b.y > 18.0 and (p.y - 22.0) - b.y < 86.0 and b.vy > -60.0
		return out
	if v.state == "serve":
		steer.call(home, 14.0); return out
	# ---------- rali
	var pr: Array = v.predict(VGY - 46.0)
	var x0: float = pr[0] + A.read
	var mine: bool = x0 > VNX if i else x0 < VNX
	# sem pressa (bola ainda longe de chegar), só anda se a diferença for grande
	A.dz = 4.0 if pr[1] < 0.45 else 11.0
	# peixinho: a bola vai cair longe demais para chegar andando → mergulha para o lado em que ela VAI cair
	if p.g and p.dv == null and b.vy > 30.0 and (b.x > VNX if i else b.x < VNX) and mine:
		var land: Array = v.predict(VGY - VRB - 2.0)
		var lx: float = land[0] + A.read * 0.5
		var dist := lx - p.x
		if land[1] < 0.34 and absf(dist) > 128.0 * spd * land[1] + 8.0 and absf(dist) < 80.0:
			if A.diveOK:
				out.d = true; out.dir = signf(dist); return out
	if not mine:
		# bloqueio: lê o ataque perto da rede
		var atk: F.Jog = v.P[1 - i]
		var threat: bool = absf(b.x - VNX) < 70.0 and b.y < VNT - 6.0 and absf(atk.x - VNX) < 70.0 and (not atk.g or atk.ch != null or atk.sw != null)
		if threat and A.get("blkRoll", -1) != v.hits:
			A.blkRoll = v.hits; A.blkOK = randf() < cfg.block * (0.6 + 0.4 * acc)
		if threat and A.get("blkOK", false):
			var txb := VNX + behind * (MARGIN + 2.0)
			steer.call(txb, 14.0)
			out.u = p.g and absf(p.x - txb) < 8.0 and ((absf(b.x - VNX) < 46.0 and b.y < VNT) or ((atk.ch != null or atk.sw != null) and absf(atk.x - VNX) < 60.0 and absf(b.x - VNX) < 70.0))
			return out
		# espera: quem é bom já se coloca no meio da quadra, um pouco mais para trás quando você está perto da rede
		var deep := 12.0 if absf(atk.x - VNX) < 80.0 else 0.0
		steer.call(home + toNet * lerpf(30.0, 14.0, kl) + behind * deep, 14.0)
		return out
	# a bola é dele: escolhe a jogada (refaz a conta de tempos em tempos, com o atraso de reação do nível)
	A.t -= dt
	if A.plan == null or A.t <= 0.0:
		A.t = cfg.react * 0.6 + rand(0.0, 0.04)
		var n: int = v.touches[i] + 1
		var cands := []
		var tr := trajetoria(v)
		var spl = ai_spike_plan(v, i, spd, out.pow, tr) if (n <= 3 and A.spUse and p.g) else null
		# as 33 tentativas (11 lugares × 3 jeitos) são independentes: rodam em paralelo; a lista fica na ordem do navegador
		var OFFS := [-14.0, -10.0, -6.0, -3.0, 0.0, 3.0, 6.0, 10.0, 14.0, 18.0, 22.0]
		var MODES := ["g", "j", "jf"]
		var Pf: F.Jog = p.copia()
		var mom: float = v.mom
		var rs := []
		for q in OFFS.size() * 3: rs.append({})
		var tenta := func(q: int) -> void:
			var tx := cl(x0 + behind * OFFS[q / 3], VNX + MARGIN if i else 14.0, W - 14.0 if i else VNX - MARGIN)
			rs[q]["tx"] = tx; rs[q]["r"] = ai_sim_de(Pf, mom, i, tx, MODES[q % 3], spd, tr)
		if PARALELO:
			var id := WorkerThreadPool.add_group_task(tenta, rs.size(), -1, true, "volei: tentativas")
			WorkerThreadPool.wait_for_group_task_completion(id)
		else:
			for q in rs.size(): tenta.call(q)
		for q in rs.size():
			cands.append({"k": MODES[q % 3], "tx": rs[q].tx, "s": ai_score(v, i, rs[q].r, n)})
		# ordena do melhor para o pior (estável, como o sort do navegador)
		var idx := range(cands.size())
		idx.sort_custom(func(a, c): return cands[a].s > cands[c].s or (cands[a].s == cands[c].s and a < c))
		var ord := []
		for q in idx: ord.append(cands[q])
		cands = ord
		var pk: Dictionary = cands[0]
		if spl != null and cands[0].s < 34.0:
			pk = {"k": "sp", "jt": spl.tj, "off": spl.off, "jx": spl.jx, "t0": v.t, "s": 30.0}
		if not A.good:
			# jogada errada: posição torta e escolha pior (às vezes nem pula)
			var bad: Dictionary = cands[mini(cands.size() - 1, 5 + int(floor(randf() * 16.0)))]
			pk = {"k": "g" if randf() < 0.5 else bad.k, "tx": cl(bad.tx + A.bias, VNX + MARGIN if i else 14.0, W - 14.0 if i else VNX - MARGIN), "s": bad.s}
		# já no ar com a cortada combinada: não troca de ideia no meio do pulo; e não fica mudando de lugar por pouca coisa
		var old = A.plan
		if old != null and old.k == "sp" and not p.g:
			pass
		elif old != null and old.k == pk.k and old.has("tx") and pk.has("tx") and absf(old.tx - pk.tx) < 9.0 and pk.s < old.get("s", -99.0) + 4.0:
			old.s = pk.s
		else:
			A.plan = pk
	var P: Dictionary = A.plan
	if P.k == "sp":
		steer.call(P.jx if (p.g and P.has("jx")) else b.x + behind * P.get("off", 30.0), 10.0)
		if p.g and v.t - P.t0 >= P.jt - 1e-6: out.u = true
	else:
		if not A.has("stx") or absf(A.stx - P.tx) > 60.0: A.stx = P.tx
		else: A.stx = A.stx + (P.tx - A.stx) * minf(1.0, dt * 8.0)
		steer.call(A.stx, 14.0)
		var bx := b.x - p.x
		var by := (p.y - 22.0) - b.y
		if P.k != "g": out.u = p.g and absf(bx) < 24.0 and by > 18.0 and by < 86.0 and b.vy > -60.0
		if P.k == "jf" and not p.g and absf(bx) < 40.0:
			out.ax = toNet; out.l = toNet < 0.0; out.r = toNet > 0.0
	# no ar: se dá para cortar (e ele decidiu usar a cortada neste lance), corta
	if not p.g and p.sw == null and not p.swUsed and v.touches[i] < 3 and (P.k == "sp" or A.spUse) and absf(p.x - VNX) < 120.0:
		var r2 = v.spike_sim(i, out.pow)
		if r2 != null and r2.good and r2.v > 250.0: out.sp = true
	return out

## saque de toque: quem joga bem manda a bola rápida e longe de você
static func ai_serve_shot(v, b: F.Bola) -> void:
	var acc := acc_now(v)
	var P0: F.Jog = v.P[0]
	var good := randf() < acc
	var far := rand(0.08, 0.3) * VNX if P0.x > VNX * 0.42 else rand(0.55, 0.75) * VNX
	var tx := cl((far if good else rand(0.2, 0.8) * VNX) + rand(-1.0, 1.0) * (6.0 if good else 26.0), 16.0, VNX - 14.0)
	var T := 1.05 - 0.5 * cl((acc - 0.4) / 0.5, 0.0, 1.0) + rand(0.0, 0.1)
	while T < 2.6:
		var vx := (tx - b.x) / T
		var vy := (VGY - VRB - b.y - 0.5 * F.VG * T * T) / T
		var tn := (VNX - b.x) / vx
		var yn := b.y + vy * tn + 0.5 * F.VG * tn * tn
		if yn < VNT - VRB - 4.0 and sqrt(vx * vx + vy * vy) < 430.0:
			b.vx = vx; b.vy = vy; b.spin = 0.0; v.mom = F.MOM_BASE; v.momTo = F.MOM_BASE
			return
		T += 0.04
