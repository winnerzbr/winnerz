extends RefCounted
## Vôlei de praia: a mesma física, a mesma IA e as mesmas regras da versão do navegador (porta direta do código JS).
## Unidades do mundo: quadra de 400 × 225; y cresce para baixo; a partida é atualizada em passos fixos de 1/60 s.

const W := 400.0
const H := 225.0
const DT := 1.0 / 60.0
const VGY := 203.0
const VNX := 200.0
const VNT := 131.0
const HOME := 88.0
const VRB := 11.5
const VWIN := 7
const VG := 360.0
const VMAX := 320.0
const VMIN := 150.0
const MOM_BASE := 0.9
const MOM_FAST := 0.9 * 1.2
const PJUMP := 300.0
const PGRAV := 780.0
const SHAPES := [{"dx": 0.0, "dy": -23.5, "r": 12.8, "pop": 205.0}, {"dx": 0.0, "dy": -7.5, "r": 9.6, "pop": 150.0}]
const MARGIN := 9.0
const DIVE := {"vx": 205.0, "vy": -75.0, "fric": 950.0, "rest": 0.18}
const SERVE := {"v0": 150.0, "v1": 400.0, "max": 0.8, "back": 22.0}
const NETR := 7.0
const SPEC := {"v": 760.0, "min": -40.0 * PI / 180.0, "max": 75.0 * PI / 180.0, "maxT": 3.0}
const CHAR_K := 1.07
const SPK := {"T": 0.2, "sx": 4.9 * 1.07, "sy": -18.6 * 1.07, "e": 0.25, "grip": 0.55, "vmax": 460.0, "ph0": -82.0, "chMax": 0.45, "Lmin": 17.0, "Lmax": 30.0}
const SPK_F := {"x": 30.0, "y": -40.0}
const SPKG := {"T": 0.22, "sx": 8.4 * 1.07, "sy": -33.2 * 1.07, "ph0": -110.0, "vmax": 380.0, "Lmin": 17.0, "Lmax": 28.0}

# eventos de som e de tela que o desenho consome a cada quadro
var events: Array = []
var shake = 0.0

var t = 0.0
var sc = [0, 0]
var P: Array = []
var b: Dictionary = {}
var state = "serve"
var st = 0.0
var server = 0
var next_server = 0
var touches = [0, 0]
var side = 0
var hits = 0
var cheer = 0.0
var mom = MOM_BASE
var mom_to = MOM_BASE
var mom_fx = null
var meter = [0.0, 0.0]
var gain = [{}, {}]
var special = null
var spec_fx = null
var fx: Array = []
var freeze = 0.0
var mood = 0.0
var moody = false
var held = true
var charge = 0.0
var charging = false
var ai_serve = {}
var toss_t = 9.0
var last_w = null
var ai: Dictionary = {}
var flash = 0.0
var flash_w = 0
var lvl = 0.45
var rallies = 0
var longest = 0
var cortadas = [0, 0]
var rapidas = [0, 0]
var dominadas = [0, 0]
var peixes = [0, 0]
var especiais = [0, 0]

func _init() -> void:
	reset_match()

func reset_match() -> void:
	t = 0.0; sc = [0, 0]; P = [new_p(HOME), new_p(W - HOME)]; state = "serve"; st = 0.0; server = 0; next_server = 0
	touches = [0, 0]; side = 0; cheer = 0.0; mom = MOM_BASE; mom_to = MOM_BASE; mom_fx = null; meter = [0.0, 0.0]
	special = null; spec_fx = null; fx = []; freeze = 0.0; mood = 0.0; last_w = null; flash = 0.0
	rallies = 0; longest = 0; cortadas = [0, 0]; rapidas = [0, 0]; dominadas = [0, 0]; peixes = [0, 0]; especiais = [0, 0]
	moody = randf() < 0.45 + 0.45 * lvl
	reset_serve(0)

func new_p(x: float) -> Dictionary:
	return {"x": x, "y": VGY, "vx": 0.0, "vy": 0.0, "g": true, "hitT": 0.0, "ph": 0.0, "sq": 0.0, "dv": null, "hitA": 0.0, "landT": 0.0,
		"sw": null, "ch": null, "swUsed": false, "swCd": 0.0, "spec": false, "hitF": false, "dvBuf": 0.0}

func new_ball(x: float, y: float) -> Dictionary:
	return {"x": x, "y": y, "vx": 0.0, "vy": 0.0, "spin": 0.0, "ang": 0.0, "fire": 0.0, "fireT": 0.0, "netHit": false}

func new_ai() -> Dictionary:
	return {"t": 0.0, "tx": 250.0, "mode": "wait", "blkRoll": -1, "blkOK": false, "spRoll": -1, "spOK": false, "setRoll": -1, "setOK": false,
		"fwd": false, "diveHit": -1, "diveOK": false, "pow": 0.6}

func reset_serve(s: int) -> void:
	server = s; state = "serve"; st = 0.0; touches = [0, 0]; side = s; hits = 0
	P[0] = new_p(SERVE.back if s == 0 else HOME); P[1] = new_p(W - SERVE.back if s == 1 else W - HOME)
	gain = [{}, {}]
	b = new_ball(W - HOME if s == 1 else HOME, 100.0); mom = MOM_BASE; mom_to = MOM_BASE; ai = new_ai()
	held = true; charge = 0.0; charging = false; ai_serve = {"wait": randf_range(0.5, 1.1), "hold": randf_range(0.1, 0.35)}; hold_ball()

# ---------------------------------------------------------------- nível do adversário (0 = fácil, 1 = quase perfeito)
func lvl_cfg(L: float) -> Dictionary:
	L = clampf(L, 0.0, 1.08)
	return {"react": lerpf(0.36, 0.06, L), "err": lerpf(18.0, 1.2, L), "spd": lerpf(0.82, 1.18, L), "fwd": lerpf(0.12, 0.8, L), "block": lerpf(0.04, 0.85, L),
		"slip": 0.09 * pow(0.004 / 0.09, L), "iq": lerpf(0.2, 1.0, L), "dive": lerpf(0.05, 0.95, L), "spike": clampf((L - 0.05) / 0.95, 0.0, 1.0) * 0.95,
		"set": clampf((L - 0.3) / 0.7, 0.0, 1.0) * 0.8, "read": clampf((L - 0.2) / 0.8, 0.0, 1.0), "lvl": L}

func mood_l() -> float:
	return mood * (0.05 + 0.2 * lvl * lvl) if mood > 0 else mood * (0.14 - 0.08 * lvl)

func cfg_now() -> Dictionary:
	return lvl_cfg(lvl + mood_l())

func mood_step() -> void:
	if not moody: return
	var diff: int = sc[1] - sc[0]
	if diff <= -1 and randf() < 0.2 + 0.45 * lvl: mood = minf(1.0, mood + 0.5)
	elif diff >= 1 and randf() < 0.35 - 0.2 * lvl: mood = maxf(-1.0, mood - 0.5)
	elif diff == 0: mood *= 0.5

func hold_ball() -> void:
	var p: Dictionary = P[server]; var f = -1.0 if server == 1 else 1.0
	b.vx = 0.0; b.vy = 0.0; b.spin = 0.0
	b.x = p.x + f * (3.0 if server == 0 else 2.0); b.y = p.y - (64.0 if server == 0 else 46.0)

# ---------------------------------------------------------------- física da bola
static func ball_step(c: Dictionary, dt: float) -> void:
	c.vy += VG * dt
	var k = 0.045 * c.spin
	c.vx += -k * c.vy * dt; c.vy += k * c.vx * dt
	c.spin *= exp(-0.9 * dt); c.ang += c.spin * dt
	c.x += c.vx * dt; c.y += c.vy * dt
	if c.x < VRB: c.x = VRB; c.vx = absf(c.vx) * 0.8; c.spin *= -0.6
	if c.x > W - VRB: c.x = W - VRB; c.vx = -absf(c.vx) * 0.8; c.spin *= -0.6
	if c.y < -70.0: c.y = -70.0; c.vy = absf(c.vy) * 0.5
	if c.y > VNT and absf(c.x - VNX) < VRB + 2.0:
		var sg = -1.0 if c.x < VNX else 1.0
		c.x = VNX + sg * (VRB + 2.0); c.vx = sg * maxf(40.0, absf(c.vx) * 0.5); c.spin *= 0.5
	var dx: float = c.x - VNX; var dy: float = c.y - VNT; var d = sqrt(dx * dx + dy * dy)
	if d < VRB + 3.0 and d > 0.0:
		var nx = dx / d; var ny = dy / d
		c.x = VNX + nx * (VRB + 3.0); c.y = VNT + ny * (VRB + 3.0)
		var vn: float = c.vx * nx + c.vy * ny
		if vn < 0.0:
			c.vx -= 1.55 * vn * nx; c.vy -= 1.55 * vn * ny; c.spin += nx * 3.0; c.netHit = true

# ---------------------------------------------------------------- cortada: o braço gira em volta do ombro
static func swing_t(gnd: bool, pw: float = 0.6) -> float:
	return (SPKG.T if gnd else SPK.T) * (1.2 - 0.4 * pw)

static func swing_pose(p: Dictionary, face: float, tt: float, gnd: bool, pw: float = 0.6, ball = null) -> Dictionary:
	var K: Dictionary = SPKG if gnd else SPK
	var T = swing_t(gnd, pw)
	var L = 22.0
	if ball is float or ball is int: L = float(ball)
	elif ball is Dictionary: L = clampf(Vector2(ball.x - (p.x + face * K.sx), ball.y - (p.y + K.sy)).length() - 1.0, K.Lmin, K.Lmax)
	var s = clampf(tt / T, 0.0, 1.0)
	var ph = (K.ph0 + 180.0 * (s - sin(TAU * s) / TAU)) * PI / 180.0
	var w = PI * (1.0 - cos(TAU * s)) / T
	var phd = ph * 180.0 / PI
	var eff = 1.0 if gnd else clampf(0.4 + 0.6 * (phd + 50.0) / 65.0, 0.4, 1.0)
	var sx: float = p.x + face * K.sx; var sy: float = p.y + K.sy; var vm: float = K.vmax * (0.8 + 0.3 * pw) * eff
	var hc = Vector2(sx + face * sin(ph) * L, sy - cos(ph) * L)
	var dxn = maxf(8.0, (VNX - hc.x) * face)
	var drop = 0.5 * VG * pow(dxn / maxf(260.0, vm), 2.0)
	var clear = atan2(VNT - VRB - 7.0 - drop - hc.y, dxn) * 180.0 / PI
	var th0 = -38.0 + 0.15 * phd if gnd else (22.0 + 0.55 * phd if phd < 0.0 else 22.0 + 0.15 * phd)
	var th = clampf(minf(th0, clear if dxn > 14.0 else 90.0), phd - (50.0 if gnd else 70.0), phd + 60.0) * PI / 180.0
	var ux = face * sin(th); var uy = -cos(th); var hw = 7.0
	var a1 = Vector2(sx + face * sin(ph) * L * 0.35, sy - cos(ph) * L * 0.35)
	var b1 = Vector2(sx + face * sin(ph) * L * 0.85, sy - cos(ph) * L * 0.85)
	var base = {"sx": sx, "sy": sy, "ph": ph, "w": w, "face": face, "L": L, "pvx": p.vx, "pvy": p.vy, "vmax": vm}
	var p0 = base.duplicate(); p0.merge({"a": Vector2(hc.x - ux * hw, hc.y - uy * hw), "b": Vector2(hc.x + ux * hw, hc.y + uy * hw), "k0": 1.0, "k1": 1.0, "r": 5.0, "hand": true, "x": hc.x, "y": hc.y, "eff": eff})
	var p1 = base.duplicate(); p1.merge({"a": a1, "b": b1, "k0": 0.35, "k1": 0.85, "r": 3.5, "hand": false, "x": b1.x, "y": b1.y, "eff": 1.0})
	return {"s": s, "ph": ph, "w": w, "pts": [p0, p1]}

static func spike_hit(c: Dictionary, Pt: Dictionary):
	var e: Vector2 = Pt.b - Pt.a; var l2 = e.length_squared()
	var u = clampf(((c.x - Pt.a.x) * e.x + (c.y - Pt.a.y) * e.y) / l2, 0.0, 1.0)
	var cx: float = Pt.a.x + e.x * u; var cy: float = Pt.a.y + e.y * u
	var dx: float = c.x - cx; var dy: float = c.y - cy; var d = sqrt(dx * dx + dy * dy); var R0: float = VRB + Pt.r
	if d >= R0 or d == 0.0: return null
	var nx = dx / d; var ny = dy / d; c.x = cx + nx * (R0 + 0.5); c.y = cy + ny * (R0 + 0.5)
	var kk: float = Pt.k0 + (Pt.k1 - Pt.k0) * u
	var pvx: float = Pt.pvx + Pt.face * cos(Pt.ph) * Pt.L * kk * Pt.w; var pvy: float = Pt.pvy + sin(Pt.ph) * Pt.L * kk * Pt.w
	var ux: float = c.vx - pvx; var uy: float = c.vy - pvy; var un = ux * nx + uy * ny
	if un >= 0.0: return null
	var tx = -ny; var ty = nx; var ut = ux * tx + uy * ty
	if Pt.hand and u > 0.04 and u < 0.96:
		var spd = -un * (1.0 + SPK.e) * 0.9
		c.vx = nx * spd + tx * ut * 0.15; c.vy = ny * spd + ty * ut * 0.15
	else:
		c.vx -= (1.0 + SPK.e) * un * nx + SPK.grip * ut * tx; c.vy -= (1.0 + SPK.e) * un * ny + SPK.grip * ut * ty
	c.spin = clampf(c.spin * 0.3 - ut * 0.04, -12.0, 12.0)
	var sp = Vector2(c.vx, c.vy).length()
	if sp > Pt.vmax: c.vx *= Pt.vmax / sp; c.vy *= Pt.vmax / sp
	return {"pow": clampf(-un / 420.0, 0.0, 1.0) * minf(1.0, kk) * Pt.eff, "hand": Pt.hand}

# ---------------------------------------------------------------- previsões usadas pela IA
func predict(yh: float, max_t: float = 3.0) -> Dictionary:
	if state == "serve": return {"x": b.x, "t": 0.0}
	var c = b.duplicate(); var tt = 0.0
	for k in range(int(max_t / DT)):
		ball_step(c, DT * mom); tt += DT
		if c.vy > 0.0 and c.y >= yh: return {"x": c.x, "t": tt}
	return {"x": c.x, "t": tt}

func spike_sim(i: int, pw: float = 0.6):
	var p: Dictionary = P[i].duplicate(); var c = b.duplicate(); var face = -1.0 if i == 1 else 1.0; var g = mom
	var tt = DT
	while tt <= swing_t(false, pw):
		p.vy += PGRAV * DT; p.y += p.vy * DT; p.x += p.vx * DT
		if p.y >= VGY: return null
		ball_step(c, DT * g)
		if c.y + VRB >= VGY: return null
		for Pt in swing_pose(p, face, tt, false, pw, c).pts:
			if spike_hit(c, Pt) == null: continue
			var v = Vector2(c.vx, c.vy).length()
			for k in range(240):
				ball_step(c, DT)
				if c.y + VRB >= VGY: return {"good": (c.x < VNX) if i == 1 else (c.x > VNX), "v": v}
			return {"good": false, "v": v}
		tt += DT
	return null

func crossing():
	var c = b.duplicate()
	for k in range(90):
		var was: bool = c.x < VNX
		ball_step(c, DT * mom)
		if (c.x < VNX) != was: return c.y
		if c.y > VGY: return null
	return null

# ---------------------------------------------------------------- IA do Amiguinho
func brain(i: int, dt: float, A: Dictionary, cfg: Dictionary) -> Dictionary:
	var p: Dictionary = P[i]; var home = W - HOME if i == 1 else HOME; var behind = 1.0 if i == 1 else -1.0; var to_net = -behind
	A.t -= dt
	if A.t <= 0.0:
		A.t = cfg.react + randf_range(0.0, 0.07)
		var slip = 4.0 if randf() < cfg.slip else 1.0
		if state == "serve":
			A.tx = p.x if server == i else home; A.mode = "hit" if server == i else "wait"
		else:
			var pr = predict(VGY - 46.0); var mine: bool = pr.x > VNX if i == 1 else pr.x < VNX
			var cross = crossing() if ((b.x < VNX and b.vx > 0.0) if i == 1 else (b.x > VNX and b.vx < 0.0)) else null
			var atk: Dictionary = P[1 - i]
			var threat: bool = not mine and absf(b.x - VNX) < 70.0 and b.y < VNT - 6.0 and absf(atk.x - VNX) < 70.0 and (not atk.g or atk.ch != null or atk.sw != null)
			if threat and A.blkRoll != hits: A.blkRoll = hits; A.blkOK = randf() < cfg.block * cfg.read
			if not mine and ((threat and A.blkOK) or (cross != null and cross > VNT - 52.0 and cross < VNT - 4.0 and randf() < cfg.block)):
				A.mode = "block"; A.tx = VNX + behind * (MARGIN + 2.0)
			elif mine:
				var last: bool = (touches[i] >= 2 or (hits == 0 and server == i)) and randf() < cfg.iq
				if A.spRoll != hits: A.spRoll = hits; A.spOK = randf() < cfg.spike and absf(pr.x - VNX) < 52.0
				if A.setRoll != hits:
					A.setRoll = hits; A.setOK = touches[i] == 0 and not (hits == 0 and server == i) and absf(pr.x - VNX) > 40.0 and randf() < cfg.set
				var lo = VNX + MARGIN if i == 1 else 14.0; var hi = W - 14.0 if i == 1 else VNX - MARGIN
				var off = randf_range(13.0, 17.0) if A.spOK else (randf_range(11.0, 15.0) if last else randf_range(6.0, 11.0))
				A.mode = "hit"; A.tx = clampf(pr.x + behind * off + randf_range(-1.0, 1.0) * cfg.err * slip, lo, hi)
				A.fwd = true if last else ((randf() < cfg.fwd) if (touches[i] >= 1 or randf() < 0.5) else false)
				if A.setOK and not A.spOK:
					A.fwd = false; A.tx = clampf(pr.x + behind * randf_range(3.0, 6.0) + randf_range(-1.0, 1.0) * cfg.err * 0.5, lo, hi)
				if hits == 0 and server == i:
					A.fwd = false; A.spOK = false; A.tx = clampf(pr.x + behind * randf_range(1.0, 4.0), lo, hi)
			else:
				A.mode = "wait"; A.tx = home + to_net * 20.0
	var dx: float = A.tx - p.x; var bx: float = b.x - p.x; var by: float = (p.y - 22.0) - b.y
	var l = dx < -3.0; var r = dx > 3.0; var u = false
	if A.mode == "block":
		var atk2: Dictionary = P[1 - i]
		u = p.g and absf(p.x - A.tx) < 8.0 and ((absf(b.x - VNX) < 46.0 and b.y < VNT) or ((atk2.ch != null or atk2.sw != null) and absf(atk2.x - VNX) < 60.0 and absf(b.x - VNX) < 70.0))
	elif A.mode == "hit":
		u = p.g and absf(bx) < 24.0 and by > 18.0 and by < 86.0 and (b.vy > -60.0 or state == "serve")
		if not p.g and A.fwd and absf(bx) < 40.0: l = i == 1; r = i == 0
	var lean_in: bool = A.fwd and not p.g and absf(bx) < 40.0
	var ax = 0.0
	if l or r: ax = clampf(dx / 14.0, -1.0, 1.0) * (0.0 if lean_in else 1.0) + ((-1.0 if i == 1 else 1.0) if lean_in else 0.0)
	var d = false; var dir = 0.0
	if A.mode != "block" and p.g and p.dv == null and state == "rally" and b.vy > 30.0 and ((b.x > VNX + 4.0) if i == 1 else (b.x < VNX - 4.0)):
		var tg: float = (VGY - VRB - b.y) / b.vy; var dxb: float = b.x - p.x
		if tg < 0.32 and absf(dxb) > 128.0 * cfg.spd * tg + 8.0 and absf(dxb) < 72.0:
			if A.diveHit != hits: A.diveHit = hits; A.diveOK = randf() < cfg.dive
			if A.diveOK: d = true; dir = signf(dxb)
	var sp = false
	if A.spOK and A.mode == "hit" and not p.g and p.sw == null and not p.swUsed and state == "rally" and absf(p.x - VNX) < 60.0 and ((b.x > VNX - 30.0) if i == 1 else (b.x < VNX + 30.0)):
		var pw = 0.5 + 0.45 * clampf(cfg.lvl, 0.0, 1.0)
		var rr = spike_sim(i, pw) if touches[i] < 3 else null
		if rr != null and rr.good and rr.v > 250.0 and randf() > cfg.slip * 4.0: sp = true; A.pow = pw
	return {"l": l, "r": r, "u": u, "ax": ax, "has_ax": true, "d": d, "dir": dir, "sp": sp, "spH": false, "spcH": false, "pow": A.pow, "ai": true}

func ai_serve_shot(cfg: Dictionary) -> void:
	var L: float = cfg.lvl; var P0: Dictionary = P[0]
	var tx = clampf((randf_range(0.14, 0.38) * VNX if P0.x > VNX * 0.53 else randf_range(0.6, 0.84) * VNX) + randf_range(-1.0, 1.0) * cfg.err * 2.5, 16.0, VNX - 14.0)
	var T = 1.05 - 0.45 * L + randf_range(0.0, 0.15)
	while T < 2.6:
		var vx: float = (tx - b.x) / T; var vy: float = (VGY - VRB - b.y - 0.5 * VG * T * T) / T
		var tn: float = (VNX - b.x) / vx; var yn: float = b.y + vy * tn + 0.5 * VG * tn * tn
		if yn < VNT - VRB - 4.0 and Vector2(vx, vy).length() < 430.0:
			b.vx = vx; b.vy = vy; b.spin = 0.0; mom = MOM_BASE; mom_to = MOM_BASE; return
		T += 0.04

func add_meter(i: int, v: float, src: String = "") -> void:
	if src != "":
		if gain[i].has(src): return
		gain[i][src] = true
	if i == 0:
		var was: float = meter[i]; meter[i] = minf(1.0, meter[i] + v)
		if was < 1.0 and meter[i] >= 1.0: events.append("barra")

func sand(x: float, dir: float, n: int) -> void:
	for k in range(n):
		fx.append({"x": x + randf_range(-6.0, 6.0), "y": VGY - 1.0, "vx": -dir * randf_range(15.0, 75.0) + randf_range(-15.0, 15.0), "vy": -randf_range(40.0, 115.0), "t": 0.0})

# ---------------------------------------------------------------- saque e especial
func serve_step(dt: float, c: Dictionary) -> void:
	var i = server; var p: Dictionary = P[i]
	var hold: bool = c.spH; var rel = false
	if i == 1:
		ai_serve.wait -= dt; hold = ai_serve.wait <= 0.0 and ai_serve.wait > -ai_serve.hold
	if hold and p.g:
		if not charging: charging = true; charge = 0.0
		charge = minf(SERVE.max, charge + dt)
	elif charging: rel = true
	if not rel and st > 9.0: rel = true; charge = 0.15
	if rel:
		var k = charge / SERVE.max; var f = -1.0 if i == 1 else 1.0
		b.vy = -(SERVE.v0 + (SERVE.v1 - SERVE.v0) * k); b.vx = f * (22.0 + 14.0 * k); held = false; charging = false; state = "rally"; toss_t = 0.0
		p.swCd = 0.25; p.swUsed = false
		if i == 0: events.append("saque")
		if i == 1: ai.spRoll = -1

func special_step(dt: float, c: Dictionary) -> void:
	var S: Dictionary = special; var p: Dictionary = P[S.i]; var f = -1.0 if S.i == 1 else 1.0; S.t += dt
	var ax: float = c.get("ax", 0.0); var ay: float = c.get("ay", 0.0)
	if Vector2(ax, ay).length() > 0.35 and c.get("has_ay", false): S.ang = clampf(atan2(ay, ax * f), SPEC.min, SPEC.max)
	else: S.ang = clampf(S.ang + ((1.0 if c.get("ad", false) else 0.0) - (1.0 if c.get("au", false) else 0.0)) * 1.6 * dt, SPEC.min, SPEC.max)
	if (not c.spcH and S.t > 0.15) or S.t > SPEC.maxT:
		b.vx = cos(S.ang) * SPEC.v * f; b.vy = sin(S.ang) * SPEC.v; b.spin = f * 6.0
		special = null; meter[S.i] = 0.0; mom = MOM_BASE; mom_to = MOM_BASE; freeze = 0.16; shake = 0.45; b.fire = 1.6; b.fireT = 0.0
		p.sw = {"t": SPK.T * 0.5, "hit": true, "pow": 1.0, "gnd": p.g, "hp": 1.0, "L": 22.0, "perfect": false}; p.hitT = 0.18; p.hitA = 0.3
		events.append("especial")
		var sparks = []
		for k in range(28):
			var a = S.ang + randf_range(-1.4, 1.4) + (PI if f < 0.0 else 0.0); var v = randf_range(80.0, 260.0)
			sparks.append({"x": b.x, "y": b.y, "vx": cos(a) * v, "vy": sin(a) * v, "c": [Color("#ffffff"), Color("#7ff0ff"), Color("#ffe27a"), Color("#ff9a2a")].pick_random()})
		spec_fx = {"x": b.x, "y": b.y, "t": 0.0, "ang": S.ang, "f": f, "sparks": sparks}
		touch(S.i)

# ---------------------------------------------------------------- passo da partida (devolve true quando ela acaba)
func update(dt: float, c0: Dictionary) -> bool:
	t += dt; cheer = maxf(0.0, cheer - dt); shake = maxf(0.0, shake - dt)
	for f in fx:
		f.t += dt; f.vy += 420.0 * dt; f.x += f.vx * dt; f.y = minf(VGY, f.y + f.vy * dt)
	fx = fx.filter(func(f): return f.t < 0.55)
	if freeze > 0.0: freeze -= dt; return false
	toss_t += dt
	if state == "over": st += dt; return st > 1.8
	if state == "point":
		st += dt
		if st > 1.3:
			if maxi(sc[0], sc[1]) >= VWIN: state = "over"; st = 0.0
			else: reset_serve(next_server)
		return false
	var cfg = cfg_now()
	var c1 = brain(1, dt, ai, cfg)
	var C = [c0, c1]
	if special != null: special_step(dt, C[special.i]); return false
	if state == "serve" and held: serve_step(dt, C[server])
	for i in range(2):
		var c: Dictionary = C[i]; var p: Dictionary = P[i]; p.spec = false
		if p.dv != null:
			p.dv.t += dt; p.hitT -= dt; p.hitA = maxf(0.0, p.hitA - dt)
			if not p.g:
				p.vy += PGRAV * dt; p.y += p.vy * dt
				if p.y >= VGY:
					p.y = VGY; p.vy = 0.0; p.g = true; p.sq = -0.6; sand(p.x, p.dv.dir, 9)
					if i == 0: events.append("pouso_peixe")
			else:
				p.vx -= signf(p.vx) * minf(absf(p.vx), DIVE.fric * dt)
				if absf(p.vx) > 40.0 and randf() < 0.6: sand(p.x - p.dv.dir * 6.0, p.dv.dir, 1)
			p.x += p.vx * dt; var x1: float = p.x
			p.x = clampf(p.x, VNX + MARGIN, W - 12.0) if i == 1 else clampf(p.x, 12.0, VNX - MARGIN)
			if p.x != x1: p.vx = 0.0
			if p.g and absf(p.vx) < 1.0 and p.dv.rest == null: p.dv.rest = p.dv.t
			if p.dv.rest != null and p.dv.t - p.dv.rest > DIVE.rest: p.dv = null; p.landT = 0.1
			continue
		if p.g: p.swUsed = false
		p.swCd = maxf(0.0, p.swCd - dt)
		var serving = state == "serve" and held
		if c.sp and not serving and p.sw == null and p.ch == null and p.swCd <= 0.0 and (p.g or not p.swUsed) and state != "point":
			p.ch = {"t": 0.0}
			if not p.g: p.swUsed = true
		if p.ch != null:
			if c.spH and state != "point": p.ch.t = minf(SPK.chMax, p.ch.t + dt)
			else:
				var pw: float = c.pow if c.get("pow") != null else clampf(0.35 + 0.65 * p.ch.t / SPK.chMax, 0.35, 1.0)
				p.sw = {"t": 0.0, "hit": false, "gnd": p.g, "pow": pw, "hp": 0.0, "L": 22.0, "perfect": false}; p.ch = null
				if i == 0: events.append("giro")
		if c.spcH and meter[i] >= 1.0 and state == "rally" and p.dv == null and ((b.x > VNX + NETR) if i == 1 else (b.x < VNX - NETR)):
			var f = -1.0 if i == 1 else 1.0; var from = Vector2(p.x, p.y)
			b.x = VNX - f * 30.0; b.y = VNT - 46.0; b.vx = 0.0; b.vy = 0.0; b.spin = 0.0
			p.x = b.x - f * SPK_F.x; p.y = b.y - SPK_F.y; p.vx = 0.0; p.vy = 0.0; p.g = false; p.sw = null; p.ch = null; p.dv = null; p.swUsed = true
			special = {"i": i, "ang": 26.0 * PI / 180.0, "t": 0.0, "from": from}; p.spec = true; especiais[i] += 1
			events.append("mira"); return false
		if p.sw != null:
			p.sw.t += dt
			if p.sw.t > swing_t(p.sw.gnd, p.sw.pow): p.sw = null; p.swCd = 0.12
		p.dvBuf = maxf(0.0, p.dvBuf - dt)
		if c.d: p.dvBuf = 0.14
		if p.dvBuf > 0.0 and p.g and state != "point" and not (serving and i == server):
			p.dvBuf = 0.0
			var hx = signf(roundf(c.ax * 3.0)) if c.get("has_ax", false) else (1.0 if c.r else 0.0) - (1.0 if c.l else 0.0)
			var land: float = predict(VGY - 10.0).x if state == "rally" else b.x
			var dir: float = c.get("dir", 0.0)
			if dir == 0.0: dir = hx
			if dir == 0.0: dir = signf(land - p.x)
			if dir == 0.0: dir = -1.0 if i == 1 else 1.0
			var need = false
			if state == "rally" and b.vy > 0.0:
				var pr = predict(VGY - VRB - 2.0); need = absf(pr.x - p.x) > 128.0 * pr.t + 12.0
			p.dv = {"t": 0.0, "dir": dir, "need": need, "rest": null}; p.vx = dir * DIVE.vx; p.vy = DIVE.vy; p.g = false; p.sq = 0.5; p.landT = 0.0
			if i == 0: events.append("peixinho")
			continue
		var up: bool = c.u and not (serving and i == server)
		var ax = clampf(c.ax, -1.0, 1.0) if c.get("has_ax", false) else (1.0 if c.r else 0.0) - (1.0 if c.l else 0.0)
		var target = ax * 128.0 * (cfg.spd if i == 1 else 1.0)
		var speeding = target != 0.0 and (p.vx == 0.0 or signf(target) == signf(p.vx)) and absf(target) > absf(p.vx)
		var acc = (1250.0 if speeding else 1900.0) if p.g else (760.0 if speeding else 520.0)
		var dvx: float = target - p.vx
		p.vx += signf(dvx) * minf(absf(dvx), acc * dt)
		p.x += p.vx * dt
		var x0: float = p.x
		p.x = clampf(p.x, VNX + MARGIN, W - 12.0) if i == 1 else clampf(p.x, 12.0, VNX - MARGIN)
		if serving and i == server: p.x = W - SERVE.back if i == 1 else SERVE.back
		if p.x != x0: p.vx = 0.0
		if up and p.g:
			p.vy = -PJUMP; p.g = false; p.sq = 1.0
			if i == 0: events.append("pulo")
		if not p.g:
			p.vy += PGRAV * dt; p.y += p.vy * dt
			if p.y >= VGY: p.y = VGY; p.vy = 0.0; p.g = true; p.sq = -1.0; p.landT = 0.16
		p.ph += absf(p.vx) * dt * 0.11 if p.g else 0.0
		p.sq *= exp(-dt * 9.0)
		p.hitT -= dt; p.hitA = maxf(0.0, p.hitA - dt); p.landT = maxf(0.0, p.landT - dt)
	mom += (mom_to - mom) * minf(1.0, dt * 5.0)
	if mom_fx != null:
		mom_fx.t += dt
		if mom_fx.t > 0.8: mom_fx = null
	if state == "serve":
		st += dt
		if held: hold_ball(); return false
	if state == "rally": ball_step(b, dt * mom)
	if b.fire > 0.0: b.fireT += dt; b.fire = maxf(0.0, b.fire - dt)
	# contato com os personagens: cabeça e corpo, cada um um círculo; braço da cortada
	for i in range(2):
		var p: Dictionary = P[i]
		if i == server and hits == 0 and b.vy < 0.0 and toss_t < 0.6: continue
		if p.sw != null and not p.sw.hit and ((b.x > VNX - NETR) if i == 1 else (b.x < VNX + NETR)):
			var face = -1.0 if i == 1 else 1.0; var pose = swing_pose(p, face, p.sw.t, p.sw.gnd, p.sw.pow, b); var hit = false
			for Pt in pose.pts:
				var hr = spike_hit(b, Pt)
				if hr == null: continue
				mom = MOM_BASE; mom_to = MOM_BASE; p.sw.hit = true; p.sw.hp = hr.pow; p.sw.L = Pt.L; hit = true
				cortadas[i] += 1
				var ang = atan2(b.vy, b.vx * (-1.0 if i == 1 else 1.0))
				if hr.hand and hr.pow > 0.75 and ang > 0.08 and ang < 0.8: add_meter(i, 0.25, "corte"); p.sw.perfect = true
				if p.sw.hp > 0.55:
					freeze = 0.05
					if i == 0: shake = 0.12
					events.append("corte_forte")
				else: events.append("corte")
				p.hitT = 0.18; p.hitA = 0.25; p.hitF = false
				touch(i)
				if state != "rally" and state != "serve": return false
				break
			if hit: continue
		if p.sw != null and p.sw.hit and p.sw.t < 0.25: continue
		var arm_up: bool = p.sw != null and not p.sw.hit and b.y < p.y + (SPKG.sy if p.g else SPK.sy) + 4.0
		var shapes: Array = SHAPES
		var diving: bool = p.dv != null and p.dv.rest == null
		if diving:
			shapes = [{"dx": p.dv.dir * 17.0, "dy": -6.0, "r": 8.0, "pop": 0.0, "dive": true}, {"dx": p.dv.dir * 5.0, "dy": -7.0, "r": 12.0, "pop": 0.0, "dive": true}, {"dx": -p.dv.dir * 10.0, "dy": -5.0, "r": 8.0, "pop": 0.0, "dive": true}]
		elif arm_up: shapes = [SHAPES[1]]
		for S in shapes:
			var cx: float = p.x + S.dx; var cy: float = p.y + S.dy; var dx: float = b.x - cx; var dy: float = b.y - cy
			var d = sqrt(dx * dx + dy * dy); var R0: float = VRB + S.r
			if d >= R0 or d == 0.0: continue
			var nx = dx / d; var ny = dy / d
			b.x = cx + nx * (R0 + 0.5); b.y = cy + ny * (R0 + 0.5)
			var rvx: float = b.vx - p.vx; var rvy: float = b.vy - p.vy; var vn = rvx * nx + rvy * ny
			if vn >= 0.0 and p.hitT > 0.0: continue
			if S.has("dive"):
				if b.y > VGY - 45.0 and p.dv.need: add_meter(i, 0.15, "peixe")
				b.vx = clampf(((W - VNX * 0.47) if i == 1 else VNX * 0.47) - b.x, -70.0 / 0.7, 70.0 / 0.7) * 0.7 + (-12.0 if i == 1 else 12.0)
				b.vy = -randf_range(255.0, 285.0); b.spin *= 0.2
				mom_to = MOM_BASE; freeze = 0.07; peixes[i] += 1; sand(b.x, p.dv.dir, 6)
				if i == 0: events.append("salvou")
			else:
				var tx = -ny; var ty = nx; var vt = rvx * tx + rvy * ty
				var out_n: float = -minf(0.0, vn) * 0.32 + S.pop; var out_t = vt * 0.55
				var ox: float = nx * out_n + tx * out_t + p.vx * 0.55; var oy: float = ny * out_n + ty * out_t + minf(0.0, p.vy) * 0.35
				var jit = randf_range(-0.07, 0.07); var cs = cos(jit); var sn = sin(jit)
				var ox2 = ox * cs - oy * sn; var oy2 = ox * sn + oy * cs
				var spd = Vector2(ox2, oy2).length(); var lim = clampf(spd, VMIN, VMAX)
				b.vx = ox2 * lim / spd; b.vy = oy2 * lim / spd; b.spin = clampf(b.spin * 0.3 + vt * 0.03, -10.0, 10.0)
			if p.hitT <= 0.0:
				p.hitT = 0.18
				if i == 1 and hits == 0 and server == 1: ai_serve_shot(cfg)
				var forward: bool = p.dv == null and not p.g and (p.vx > 20.0 if i == 0 else p.vx < -20.0)
				p.hitA = 0.32; p.hitF = forward
				if forward:
					mom = MOM_FAST; mom_to = MOM_FAST; rapidas[i] += 1; mom_fx = {"k": "BOLA RÁPIDA", "t": 0.0, "c": Color("#ffd24a")}
					if i == 0: events.append("rapida")
				elif b.vy < -60.0 and mom_to > MOM_BASE:
					mom_to = MOM_BASE; dominadas[i] += 1; mom_fx = {"k": "DOMINOU", "t": 0.0, "c": Color("#5cd68a")}
				touch(i)
				if state != "rally" and state != "serve": return false
			break
	b.netHit = false
	var sd = 0 if b.x < VNX else 1
	if sd != side: side = sd; touches = [0, 0]
	if b.y + VRB >= VGY:
		var lost = 0 if b.x < VNX else 1
		point(1 - lost)
	return false

func touch(i: int) -> void:
	if b.fire > 0.0 and b.fireT > 0.05: b.fire = 0.0
	if state == "serve": state = "rally"
	touches[i] += 1; touches[1 - i] = 0; hits += 1; longest = maxi(longest, hits)
	events.append("toque" if i == 0 else "toque_dele")
	if touches[i] > 3: point(1 - i)

func point(w: int) -> void:
	sc[w] += 1; last_w = w; state = "point"; st = 0.0; mood_step(); add_meter(w, 0.2); special = null; next_server = 1 - w; rallies += 1
	b.vx = 0.0; b.vy = 0.0; b.spin = 0.0; b.y = minf(b.y, VGY - VRB)
	flash = 1.0; flash_w = w
	if w == 0: cheer = 1.4; events.append("ponto")
	else: events.append("levou")
