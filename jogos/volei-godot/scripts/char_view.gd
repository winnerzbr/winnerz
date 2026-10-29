extends Node2D
## Desenha um personagem com as pranchas pintadas: escolhe a animação e o quadro a partir do estado da física
## (porta do drawIA5 / drawBlob5 do navegador). O rosto é desenhado pelo shader, dentro do visor.

const VO = preload("res://scripts/volei.gd")
const C5 = {"set": 7, "bump": 7, "spike": 10, "gnd": 8, "serveHit": 27}

var who = "ia"
var idx = 0
var meta: Dictionary = {}
var tex = {}
var mask = {}
var S = 1.0
var fk_div = 14.5
var s = {}   # relógios próprios desta personagem
var V = null
var tt = 0.0
var mat: ShaderMaterial

func setup(w: String, i: int, face_tex: Texture2D) -> void:
	who = w; idx = i
	meta = JSON.parse_string(FileAccess.get_file_as_string("res://art/%s.json" % w))
	for an in meta.a.keys():
		tex[an] = load("res://art/%s/%s.webp" % [w, an])
		mask[an] = load("res://art/%s/%s_mask.png" % [w, an])
	S = 56.0 / 325.0 / meta.q if w == "ia" else 34.8 / 152.0
	fk_div = 14.5 if w == "ia" else 14.0
	mat = ShaderMaterial.new(); mat.shader = load("res://shaders/personagem.gdshader")
	mat.set_shader_parameter("face_tex", face_tex)
	material = mat

func reset() -> void:
	s = {}

func g(k: String, d = 9.0):
	return s.get(k, d)

# animação "do jogo" (comemora, triste, saque…) e expressão do rosto
func v_anim(p: Dictionary, i: int) -> Array:
	var stt: String = V.state
	var win = (0 if V.sc[0] > V.sc[1] else 1) if stt == "over" else V.last_w
	if (stt == "point" or stt == "over") and win != null:
		if win == i: return ["comemora", 2]
		return ["triste", 4]
	if p.spec: return ["cortada", 5]
	if stt == "serve" and V.held and V.server == i: return ["saque", 5 if V.charging else 0]
	if stt == "rally" and V.server == i and V.toss_t < 0.28 and V.hits == 0: return ["saque", 0]
	if p.dv != null: return ["peixinho", 2 if p.hitA > 0.0 else (0 if p.dv.rest != null else 5)]
	if p.ch != null: return ["corte", 5]
	if p.sw != null: return ["corte", 2 if p.sw.hit else 5]
	var ex = 0
	if p.hitA > 0.0: ex = 2
	elif not p.g: ex = 5
	if ex == 0 and i == 1 and absf(V.mood) >= 0.5 and fmod(tt + 1.7, 3.6) >= 0.12: ex = 5 if V.mood > 0 else 4
	if ex == 0:
		var b: Dictionary = V.b; var mine: bool = b.x < VO.VNX if i == 0 else b.x > VO.VNX
		if V.state == "rally" and mine and b.vy > 0.0 and b.y > VO.VGY - 55.0 and absf(b.x - p.x) > 34.0: ex = 3
		elif fmod(tt + i * 1.7, 3.6) < 0.12: ex = 1
	return ["", ex]

func eta5(p: Dictionary) -> float:
	var b: Dictionary = V.b; var hx: float = p.x; var hy: float = p.y - 40.0 * VO.CHAR_K
	var dx: float = b.x - hx; var dy: float = b.y - hy; var d = sqrt(dx * dx + dy * dy)
	var cl: float = -(dx * b.vx + dy * b.vy) / maxf(1.0, d)
	if V.state != "rally" or cl <= 30.0: return 9.0
	return maxf(0.0, d - VO.VRB - 10.0) / cl

func pick(dt: float) -> Dictionary:
	var p: Dictionary = V.P[idx]; var i = idx; var sf = -1.0 if i == 1 else 1.0
	var va = v_anim(p, i); var an0: String = va[0]; var ex: int = va[1]
	var face: float = p.dv.dir if p.dv != null else sf
	if g("air", false) and p.g and p.dv == null: s["lt"] = 0.0
	s["air"] = not p.g; s["lt"] = g("lt") + dt
	if g("sw", false) and p.sw == null:
		if g("swg", false): s["rt"] = 0.0
		else: s["at"] = 0.0
	s["sw"] = p.sw != null
	if p.sw != null: s["swg"] = p.sw.gnd
	s["rt"] = g("rt") + dt; s["at"] = g("at") + dt
	if g("dv", false) and p.dv == null: s["gu"] = 0.0
	s["dv"] = p.dv != null; s["gu"] = g("gu") + dt
	if p.sw != null and p.sw.hit and not s.has("hitT0"): s["hitT0"] = 0.0
	if p.sw == null: s.erase("hitT0")
	elif s.has("hitT0"): s["hitT0"] += dt
	if p.hitA > 0.0 and not g("ha", false): s["hk"] = "set" if V.b.y < p.y - 36.0 * VO.CHAR_K else "bump"
	s["ha"] = p.hitA > 0.0
	if not s.has("face"): s["face"] = face
	if face != s["face"]:
		if p.g and p.dv == null: s["tn"] = 0.0; s["tnTo"] = face
		s["face"] = face
	s["tn"] = g("tn") + dt
	var sp: float = absf(p.vx); var acc: float = (sp - g("sp", sp)) / maxf(dt, 0.001); s["sp"] = sp
	var an = "idle"; var k = 0; var mode = "g" if p.g else "a"; var mir: bool = (sf > 0.0) if face != sf else (sf < 0.0)
	var y: float = p.y; var x: float = p.x
	if (an0 == "comemora" or an0 == "triste") and not p.g:
		an = "jump"; k = (4 + int(clampf((p.vy + VO.PJUMP) / VO.PJUMP, 0.0, 0.999) * 8.0)) if p.vy < 0.0 else 12 + mini(3, int(p.vy / 90.0))
	elif an0 == "comemora": an = "party"; k = int(tt * 10.0) % 16; mir = false
	elif an0 == "triste":
		an = "sad"; var q: float = V.st * 9.0; k = int(q) if q < 8.0 else 8 + int(tt * 6.0) % 8; mir = false
	elif p.spec: an = "spec"; k = int(tt * 12.0) % 8
	elif p.dv != null:
		var dd: Dictionary = p.dv; an = "dive"; mir = dd.dir < 0.0; mode = "g"; y = VO.VGY
		if dd.rest != null: k = 24 + mini(5, int((dd.t - dd.rest) / 0.3 * 6.0))
		elif not p.g: k = (3 + int(dd.t / 0.1 * 5.0)) if dd.t < 0.1 else 8 + clampi(int((p.vy + 80.0) / 160.0 * 4.0), 0, 3)
		else:
			s["dg"] = g("dg", 0.0) + dt; var tg: float = s["dg"]
			k = (12 + int(tg / 0.14 * 4.0)) if tg < 0.14 else 16 + clampi(int((1.0 - sp / 150.0) * 8.0), 0, 7)
		if not p.g: s["dg"] = 0.0
	elif g("gu") < 0.3 and p.g and sp < 40.0: an = "dive"; k = 27 + mini(2, int(g("gu") / 0.3 * 3.0))
	elif an0 == "saque" and V.server == i:
		an = "serve"
		if V.held: k = (8 + mini(7, int(clampf(V.charge / VO.SERVE.max, 0.0, 1.0) * 6.0) + int(tt * 14.0) % 2)) if V.charging else int(tt * 8.0) % 8
		else: k = 16 + mini(7, int(clampf(V.toss_t / 0.3, 0.0, 1.0) * 7.99))
	elif p.ch != null:
		var q2 = clampf(p.ch.t / VO.SPK.chMax, 0.0, 1.0)
		if p.g:
			var srv: bool = V.hits == 0 and V.server == i and V.state == "rally"
			an = "serve" if srv else "gnd"; k = (21 + mini(2, int(q2 * 3.0))) if srv else 2 + mini(2, int(q2 * 3.0)); s["srv"] = srv
		else: an = "spike"; k = 2 + mini(3, int(q2 * 4.0))
	elif p.sw != null:
		var T: float = VO.swing_t(p.sw.gnd, p.sw.pow); var q3 = clampf(p.sw.t / T, 0.0, 0.999)
		if p.sw.gnd:
			var srv2: bool = g("srv", false) and V.hits <= 1; an = "serve" if srv2 else "gnd"
			var c: int = C5.serveHit if srv2 else C5.gnd; var a0 = 23 if srv2 else 5
			if s.has("hitT0"): k = c + int(s["hitT0"] / 0.04)
			else: k = (a0 + int(q3 / 0.5 * (c - a0))) if q3 < 0.5 else c + int((q3 - 0.5) / 0.5 * 4.0)
			k = mini(k, 39 if srv2 else 15)
		else:
			an = "spike"
			if s.has("hitT0"): k = C5.spike + int(s["hitT0"] / 0.035)
			else: k = (6 + int(q3 / 0.45 * (C5.spike - 6))) if q3 < 0.45 else C5.spike + int((q3 - 0.45) / 0.55 * 3.0)
			k = mini(k, 23)
	elif p.hitA > 0.0 or (p.g and eta5(p) < 0.2 and ((V.b.x > VO.VNX) if i == 1 else (V.b.x < VO.VNX))):
		if p.hitA > 0.0: an = g("hk", "set"); k = C5[an] + int((0.32 - p.hitA) / 0.32 * 8.99)
		else:
			var e = eta5(p); an = "set" if V.b.y < p.y - 36.0 * VO.CHAR_K else "bump"; k = 2 + int((1.0 - e / 0.2) * 5.0)
		k = mini(k, 15)
	elif not p.g:
		if g("at") < 0.6: an = "spike"; k = 16 + mini(7, int(g("at") / 0.6 * 8.0))
		else: an = "jump"; k = (4 + int(clampf((p.vy + VO.PJUMP) / VO.PJUMP, 0.0, 0.999) * 8.0)) if p.vy < 0.0 else 12 + mini(3, int(p.vy / 90.0))
	elif g("tn") < 0.3:
		an = "turn"; var q4 = mini(7, int(g("tn") / 0.3 * 8.0)); k = (7 - q4) if g("tnTo", 0.0) == sf else q4; mir = sf < 0.0
	elif g("lt") < 0.3 and sp < 60.0: an = "jump"; k = 16 + mini(7, int(g("lt") / 0.3 * 8.0))
	elif g("rt") < 0.3 and sp < 60.0:
		var sv: bool = g("srv", false); an = "serve" if sv else "gnd"
		k = (32 + mini(7, int(g("rt") / 0.3 * 8.0))) if sv else 12 + mini(3, int(g("rt") / 0.3 * 4.0))
	elif sp > 8.0:
		var backw: bool = p.vx * face < 0.0
		if backw: an = "back"; k = int(fposmod(p.ph / TAU, 1.0) * 8.0) % 8
		elif acc > 200.0 and sp < 100.0: an = "ss"; k = mini(3, int(sp / 100.0 * 4.0))
		elif acc < -200.0 and sp < 110.0: an = "ss"; k = 4 + mini(3, int((1.0 - sp / 110.0) * 4.0))
		else: an = "run"; k = int(fposmod(p.ph / (2.0 * TAU), 1.0) * 16.0) % 16
	elif V.state == "rally": an = "ready"; k = int(tt * 8.0) % 8
	else: an = "idle"; k = int(tt * 8.0) % 16
	s["last"] = an
	if an == "serve": s["sk"] = k
	if an == "gnd" and p.ch != null and p.g and sp > 8.0:
		y -= absf(sin(p.ph)) * 1.6; k = 2 + int(p.ph / PI) % 3
	return {"an": an, "k": k, "mode": mode, "mir": mir, "x": x, "y": y, "ex": ex}

# bola segura no saque: em cima da palma aberta do desenho
func held_pos(p: Dictionary, f: float) -> Vector2:
	var A: Dictionary = meta.a.serve; var kk = clampi(int(g("sk", 9 if V.charging else 0)), 0, 15)
	var fr: Dictionary = A.f[kk]
	var hd = fr.get("hd")
	if hd == null: hd = [fr.w * 0.9, fr.h * 0.5]
	return Vector2(p.x + f * (hd[0] - fr.ax) * S, p.y + (hd[1] - fr.ay) * S - VO.VRB + 1.0)

func _draw() -> void:
	if V == null: return
	var dt = 1.0 / 60.0
	var P = pick(dt)
	var A: Dictionary = meta.a[P.an]; var n: int = A.f.size(); var f: Dictionary = A.f[clampi(P.k, 0, n - 1)]
	var ay: float = f.ay
	if P.mode == "a" and f.s != null: ay = (f.s[1] + f.s[3]) / 2.0 + meta.scrh
	var t2: Texture2D = tex[P.an]
	mat.set_shader_parameter("mask_tex", mask[P.an])
	mat.set_shader_parameter("atlas_size", Vector2(t2.get_width(), t2.get_height()))
	mat.set_shader_parameter("frame_xy", Vector2(f.x, f.y))
	if f.s != null and f.get("sz") != null:
		var cx: float = f.s[4] if f.s.size() > 4 else (f.s[0] + f.s[2]) / 2.0
		var cy: float = f.s[5] if f.s.size() > 5 else (f.s[1] + f.s[3]) / 2.0
		var L1: float = f.s[6] if f.s.size() > 6 and f.s[6] else f.sz[0]
		var L2: float = f.s[7] if f.s.size() > 7 and f.s[7] else f.sz[1]
		var fk = L2 / fk_div; var fkx = clampf(0.62 * L1 / (11.6 * fk), 0.5, 1.3)
		mat.set_shader_parameter("fc", Vector2(cx, cy)); mat.set_shader_parameter("fr", f.get("r", 0.0))
		mat.set_shader_parameter("fs", Vector2(fk * fkx, fk)); mat.set_shader_parameter("fdy", L2 * 0.03)
		mat.set_shader_parameter("ex", float(P.ex)); mat.set_shader_parameter("has_face", 1.0)
	else:
		mat.set_shader_parameter("has_face", 0.0)
	draw_set_transform(Vector2(P.x, P.y), 0.0, Vector2(S * (-1.0 if P.mir else 1.0), S))
	draw_texture_rect_region(t2, Rect2(-f.ax, -ay, f.w, f.h), Rect2(f.x, f.y, f.w, f.h))
	draw_set_transform(Vector2.ZERO)
