extends Node2D
## Um personagem pintado do vôlei (IAmiguinho ou Amiguinho), com as pranchas aprovadas (MV5 e MVB).
## Cada animação é uma sequência de desenhos inteiros; o quadro mostrado sai do estado da física
## (fase do passo, subida e descida do pulo, progresso do golpe, tempo do saque, deslize do peixinho).
## É a mesma escolha de quadros do navegador (drawIA5 / drawBlob5). O rosto aceso é desenhado pelo shader, só dentro do visor.

const F = preload("res://provas/volei/fisica.gd")
const C5 := {"set": 7, "bump": 7, "spike": 10, "gnd": 8, "serveHit": 27}
## quanto o rosto anda dentro do visor para olhar a bola (ROSTO.olhar do editor do navegador; o dono deixou em 0)
const OLHAR := 0.0

var v                       # a partida (volei.gd)
var i := 0                  # 0 = IAmiguinho (você), 1 = Amiguinho
var ia := true
var M: Dictionary           # as fichas das pranchas
var S := 1.0                # unidades do mundo por pixel da prancha
var fk_div := 14.5
var tex := {}
var mask := {}
var mat: ShaderMaterial
var s := {}                 # relógios próprios deste personagem (o "stOf" do navegador)

func prepara(prova, idx: int) -> void:
	v = prova; i = idx; ia = idx == 0
	M = Arte.json("res://arte/MV5.json" if ia else "res://arte/MVB.json")
	S = 56.0 / 325.0 / float(M.q) if ia else 34.8 / 152.0
	fk_div = 14.5 if ia else 14.0
	for an in M.a:
		var A: Dictionary = M.a[an]
		tex[an] = Arte.tex(A.src); mask[an] = Arte.tex(A.mask)
		if A.get("msrc"):
			tex[an + "~m"] = Arte.tex(A.msrc); mask[an + "~m"] = Arte.tex(A.mmask)
	mat = ShaderMaterial.new()
	mat.shader = preload("res://provas/volei/personagem.gdshader")
	mat.set_shader_parameter("face_tex", load("res://provas/volei/rostos_ia.png" if ia else "res://provas/volei/rostos_bl.png"))
	material = mat
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR

func zera() -> void:
	s = {}

func g(k: String, d = 9.0):
	return s.get(k, d)

## tempo até a bola chegar à cabeça (para começar o toque/manchete antes do contato)
func eta5(p: F.Jog) -> float:
	var b: F.Bola = v.b
	var hx := p.x
	var hy := p.y - 40.0 * F.CHAR_K
	var dx := b.x - hx
	var dy := b.y - hy
	var d := sqrt(dx * dx + dy * dy)
	var cl := -(dx * b.vx + dy * b.vy) / maxf(1.0, d)
	if v.state != "rally" or cl <= 30.0: return 9.0
	return maxf(0.0, d - F.VRB - 10.0) / cl

## andar, arrancar, frear e recuar: velocidade suavizada, e cada estado fica pelo menos um instante
func loco(p: F.Jog, face: float, dt: float) -> String:
	s.fvx = s.get("fvx", p.vx); s.fvx += (p.vx - s.fvx) * minf(1.0, dt * 9.0)
	var fs := absf(s.fvx)
	var fa: float = (fs - s.get("fsp", fs)) / maxf(dt, 0.001); s.fsp = fs
	s.fac = s.get("fac", 0.0) + (fa - s.get("fac", 0.0)) * minf(1.0, dt * 8.0)
	var L: String = s.get("L", "")
	var moving := (fs > 6.0 and absf(p.vx) > 2.0) if (L != "" and L != "stand") else fs > 20.0
	var c := "stand"
	if moving:
		if s.fvx * face < -12.0 or (L == "back" and s.fvx * face < 0.0): c = "back"
		elif s.fac > 260.0 and fs < 95.0: c = "ssA"
		elif s.fac < -260.0 and fs < 105.0 and L != "stand": c = "ssD"
		else: c = "run"
	if L == "stand" and c == "run": c = "ssA"
	if (L == "run" or L == "ssA") and c == "stand": c = "ssD"
	s.Lt = s.get("Lt", 9.0) + dt
	var hold: float
	if c == "ssD" and L == "run": hold = 0.0
	elif L == "ssA": hold = (0.1 if c == "ssD" else (0.22 if ia else 0.18))
	elif L == "ssD": hold = 0.26 if ia else 0.14
	elif L == "stand": hold = 0.05
	else: hold = 0.16
	if L == "" or (c != L and s.Lt >= hold):
		s.L = c; s.Lt = 0.0
	return s.L

## quadros do meio: quando a animação avança um quadro, mostra primeiro o desenho intermediário durante metade do tempo do quadro
func mid_k(an: String, k: int, tt: float, A: Dictionary) -> float:
	if not s.has("mk"): s.mk = {"an": "", "k": -1, "t": 0.0, "d": 0.125, "from": -1}
	var m: Dictionary = s.mk
	var n: int = A.f.size()
	if an != m.an:
		m.an = an; m.k = k; m.t = tt; m.from = -1
	elif k != m.k:
		var fwd: bool = ((k - m.k) % n + n) % n == 1
		if fwd:
			m.d = clampf(tt - m.t, 0.03, 0.3); m.from = m.k
		else:
			m.from = -1
		m.t = tt; m.k = k
	var tem_meio: bool = m.from >= 0 and A.get("m") != null and m.from < A.m.size() and A.m[m.from] != null
	return m.from + 0.5 if tem_meio and tt - m.t < m.d * 0.5 else float(k)

func _draw() -> void:
	if v == null or v.b == null:
		return
	var tt: float = v.tt
	var p: F.Jog = v.P[i]
	var dt := clampf(tt - s.get("tt", tt), 0.0, 0.05); s.tt = tt
	var va: Array = v.v_anim(p, i, tt)
	var an0: String = va[0]
	var ex: int = va[2]
	var sf := -1.0 if i else 1.0
	var face: float = p.dv.dir if p.dv != null else sf
	# relógios próprios: pouso, fim do golpe, levantar do peixinho, virada
	if s.get("air", false) and p.g and p.dv == null: s.lt = 0.0
	s.air = not p.g; s.lt = g("lt") + dt
	if s.get("sw", false) and p.sw == null:
		if s.get("swg", false): s.rt = 0.0
		else: s.at = 0.0
	s.sw = p.sw != null
	if p.sw != null: s.swg = p.sw.gnd
	s.rt = g("rt") + dt; s.at = g("at") + dt
	if s.get("dv", false) and p.dv == null: s.gu = 0.0
	s.dv = p.dv != null; s.gu = g("gu") + dt
	if p.sw != null and p.sw.hit and not s.has("hitT0"): s.hitT0 = 0.0
	if p.sw == null: s.erase("hitT0")
	elif s.has("hitT0"): s.hitT0 += dt
	if p.hitA > 0.0 and not s.get("ha", false): s.hk = "set" if v.b.y < p.y - 36.0 * F.CHAR_K else "bump"
	s.ha = p.hitA > 0.0
	if not s.has("face"): s.face = face
	if face != s.face:
		if p.g and p.dv == null:
			s.tn = 0.0; s.tnTo = face
		s.face = face
	s.tn = g("tn") + dt
	var sp := absf(p.vx)
	s.sp = sp
	var LOC := loco(p, face, dt)
	var an := "idle"
	var k := 0
	var mode := "g" if p.g else "a"
	var mir: bool = (sf > 0.0) if face != sf else (sf < 0.0)
	var y := p.y
	var x := p.x
	var A5: Dictionary = M.a
	var srv_v: bool = v.state == "rally" and v.hits == 0 and v.tossT < 0.42 and p.g and p.ch == null and p.sw == null
	if (an0 == "comemora" or an0 == "triste") and not p.g:
		an = "jump"; k = (4 + int(floor(clampf((p.vy + F.PJUMP) / F.PJUMP, 0.0, 0.999) * 8.0))) if p.vy < 0.0 else 12 + mini(3, int(floor(p.vy / 90.0)))
	elif an0 == "comemora":
		an = "party"; k = int(floor(tt * 10.0)) % 16; mir = false
	elif an0 == "triste":
		an = "sad"; var q: float = v.st * 9.0; k = int(floor(q)) if q < 8.0 else 8 + int(floor(tt * 6.0)) % 8; mir = false
	elif p.spec:
		an = "spec"; k = int(floor(tt * 12.0)) % 8
	elif p.dv != null:
		var d: Dictionary = p.dv
		an = "dive"; mir = d.dir < 0.0; mode = "g"; y = F.VGY
		if d.has("rest"):
			if ia: k = 24 + mini(3, int(floor((d.t - d.rest) / F.DIVE.rest * 4.0)))  # levantar: deitado até ajoelhado
			else: k = 24 + mini(5, int(floor((d.t - d.rest) / 0.3 * 6.0)))
		elif not p.g:
			k = (3 + int(floor(d.t / 0.1 * 5.0))) if d.t < 0.1 else 8 + clampi(int(floor((p.vy + 80.0) / 160.0 * 4.0)), 0, 3)
		else:
			s.dg = s.get("dg", 0.0) + dt; var tg: float = s.dg
			k = (12 + int(floor(tg / 0.14 * 4.0))) if tg < 0.14 else 16 + clampi(int(floor((1.0 - sp / 150.0) * 8.0)), 0, 7)
		if not p.g: s.dg = 0.0
	elif g("gu") < 0.3 and p.g and sp < 40.0:
		an = "dive"  # levantar: de joelhos até em pé
		k = (28 + mini(3, int(floor(g("gu") / 0.3 * 4.0)))) if ia else 27 + mini(2, int(floor(g("gu") / 0.3 * 3.0)))
	elif (an0 == "saque" or srv_v) and v.server == i:
		an = "serve"
		if v.held:
			k = (8 + mini(7, int(floor(clampf(v.charge / F.SERVE.max, 0.0, 1.0) * 6.0)) + int(floor(tt * 14.0)) % 2)) if v.charging else int(floor(tt * 8.0)) % 8
		else:
			var q2: float = v.tossT
			k = (16 + mini(3, int(floor(q2 / 0.2 * 4.0)))) if q2 < 0.2 else 19 - mini(3, int(floor((q2 - 0.2) / 0.22 * 4.0)))  # lança e o braço volta
	elif p.ch != null:
		# armando o braço (segurando o botão)
		var q3 := clampf(p.ch.t / F.SPK.chMax, 0.0, 1.0)
		if p.g:
			var srv: bool = v.hits == 0 and v.server == i and v.state == "rally"
			an = "serve" if srv else "gnd"; k = (21 + mini(2, int(floor(q3 * 3.0)))) if srv else 2 + mini(2, int(floor(q3 * 3.0))); s.srv = srv
		else:
			an = "spike"; k = 2 + mini(3, int(floor(q3 * 4.0)))
	elif p.sw != null:
		var T := F.swing_t(p.sw.gnd, p.sw.pow)
		var q4 := clampf(p.sw.t / T, 0.0, 0.999)
		if p.sw.gnd:
			var srv2: bool = s.get("srv", false) and v.hits <= 1
			an = "serve" if srv2 else "gnd"
			var c: int = C5.serveHit if srv2 else C5.gnd
			var a0 := 23 if srv2 else 5
			if s.has("hitT0"): k = c + int(floor(s.hitT0 / 0.04))
			else: k = (a0 + int(floor(q4 / 0.5 * (c - a0)))) if q4 < 0.5 else c + int(floor((q4 - 0.5) / 0.5 * 4.0))
			k = mini(k, 39 if srv2 else 15)
		else:
			an = "spike"
			if s.has("hitT0"): k = C5.spike + int(floor(s.hitT0 / 0.035))
			else: k = (6 + int(floor(q4 / 0.45 * (C5.spike - 6)))) if q4 < 0.45 else C5.spike + int(floor((q4 - 0.45) / 0.55 * 3.0))
			k = mini(k, 23)
	elif p.hitA > 0.0 or (p.g and eta5(p) < 0.2 and (v.b.x > F.VNX if i else v.b.x < F.VNX)):
		# toque / manchete: a preparação começa antes da bola chegar; o quadro de contato bate com o toque
		if p.hitA > 0.0:
			an = s.get("hk", "set"); k = C5[an] + int(floor((0.32 - p.hitA) / 0.32 * 8.99))
		else:
			var e := eta5(p)
			an = "set" if v.b.y < p.y - 36.0 * F.CHAR_K else "bump"; k = 2 + int(floor((1.0 - e / 0.2) * 5.0))
		k = mini(k, 15)
	elif not p.g:
		if g("at") < 0.6:
			an = "spike"; k = 16 + mini(7, int(floor(g("at") / 0.6 * 8.0)))
		else:
			an = "jump"; k = (4 + int(floor(clampf((p.vy + F.PJUMP) / F.PJUMP, 0.0, 0.999) * 8.0))) if p.vy < 0.0 else 12 + mini(3, int(floor(p.vy / 90.0)))
	elif g("tn") < 0.3:
		an = "turn"; var q5 := mini(7, int(floor(g("tn") / 0.3 * 8.0))); k = (7 - q5) if s.get("tnTo", 0.0) == sf else q5; mir = sf < 0.0
	elif g("lt") < 0.3 and sp < 60.0:
		an = "jump"; k = 16 + mini(7, int(floor(g("lt") / 0.3 * 8.0)))
	elif g("rt") < 0.3 and sp < 60.0:
		var sv: bool = s.get("srv", false)
		an = "serve" if sv else "gnd"
		k = (32 + mini(7, int(floor(g("rt") / 0.3 * 8.0)))) if sv else 12 + mini(3, int(floor(g("rt") / 0.3 * 4.0)))
	elif LOC != "stand":
		var Ls: String = s.L
		if Ls == "back":
			an = "back"; k = int(floor(fposmod(p.ph / TAU, 1.0) * 8.0)) % 8
		elif Ls == "ssA":
			an = "ss"; k = mini(3, int(floor(clampf(s.Lt / 0.22, 0.0, 0.999) * 4.0))) if ia else 1 + mini(2, int(floor(clampf(s.Lt / 0.18, 0.0, 0.999) * 3.0)))
		elif Ls == "ssD":
			an = "ss"; k = 4 + mini(3, int(floor(clampf(s.Lt / 0.26, 0.0, 0.999) * 4.0))) if ia else 4 + mini(1, int(floor(clampf(s.Lt / 0.14, 0.0, 0.999) * 2.0)))
		else:
			an = "run"; k = int(floor(fposmod(p.ph / (2.0 * TAU), 1.0) * 16.0)) % 16
	elif v.state == "rally":
		# espera olhando para a bola: a cabeça sobe ou desce conforme a altura da bola (com folga para não ficar trocando)
		an = "ready"; k = int(floor(tt * 8.0)) % 8
		if A5.has("readyU") and A5.has("readyD"):
			var b: F.Bola = v.b
			var dx := b.x - p.x
			var dy := b.y - (p.y - 42.0 * F.CHAR_K)
			var dd := sqrt(dx * dx + dy * dy)
			if dd == 0.0: dd = 1.0
			var el := -dy / dd
			var was: int = s.get("rv", 0)
			var up := el > (0.45 if was == 1 else 0.6)
			var down := dy > 0.0 and el < (-0.25 if was == -1 else -0.4) and dd < 150.0
			if up: s.rv = 1
			elif down: s.rv = -1
			elif (was == 1 and el > 0.3) or (was == -1 and el < -0.1): s.rv = was
			else: s.rv = 0
			# a cabeça sobe e desce aos poucos: passa pelos dois desenhos do meio (1/3 e 2/3)
			s.lv = s.get("lv", 0.0); s.lv += clampf(s.rv - s.lv, -dt * 4.5, dt * 4.5)
			var q6 := int(F.jsround(absf(s.lv) * 3.0))
			var dirn := "readyU" if s.lv > 0.0 else "readyD"
			if q6 >= 3: an = dirn
			elif q6 > 0 and A5.has(dirn + "_" + str(q6)): an = dirn + "_" + str(q6)
	else:
		an = "idle"; k = int(floor(tt * 8.0)) % 16
	if not an.begins_with("ready"): s.lv = 0.0
	s.last = an
	if an == "serve": s.sk = k
	# armando no chão e andando: pranchas próprias (para a frente: quadros 0-7; para trás: 8-15)
	if an == "gnd" and p.ch != null and p.g and sp > 8.0:
		var backw := p.vx * face < 0.0
		an = "gndw"; k = (8 if backw else 0) + int(floor(fposmod(p.ph / TAU, 1.0) * 8.0)) % 8
	# olha para a bola durante o rali (o rosto anda dentro do visor, suave)
	var lx := 0.0
	var ly := 0.0
	var live: bool = (v.state == "rally" or v.state == "serve") and not (an in ["party", "sad", "dive", "turn"])
	if live:
		var b2: F.Bola = v.b
		var hx := p.x
		var hy := y - 42.0 * F.CHAR_K
		var ddx := b2.x - hx
		var ddy := b2.y - hy
		var d2 := sqrt(ddx * ddx + ddy * ddy)
		if d2 == 0.0: d2 = 1.0
		var k2 := clampf(d2 / 60.0, 0.0, 1.0)
		lx = ddx / d2 * k2 * (-1.0 if mir else 1.0)
		ly = clampf(ddy / d2 * k2, -1.0, 0.6) * (0.35 if (an.begins_with("readyU") or an.begins_with("readyD")) else 1.0)
	var lk: Array = s.get("lk", [0.0, 0.0])
	var a := minf(1.0, dt * 10.0)
	lk[0] += (lx - lk[0]) * a; lk[1] += (ly - lk[1]) * a; s.lk = lk
	_quadro(an, mid_k(an, k, tt, A5[an]), mode, ex, mir, x, y, lk)

## desenha um quadro (o frame5 do navegador)
func _quadro(an: String, k: float, mode: String, ex: int, mirror: bool, x: float, y: float, look: Array) -> void:
	var A: Dictionary = M.a[an]
	var n: int = A.f.size()
	var half: bool = fmod(k, 1.0) != 0.0 and A.get("m") != null and A.m[int(k)] != null
	var key := an + "~m" if half else an
	var f: Dictionary = A.m[int(k)] if half else A.f[clampi(int(k), 0, n - 1)]
	var fs = f.get("s")
	var ay: float = (fs[1] + fs[3]) / 2.0 + float(M.scrh) if (mode == "a" and fs != null) else float(f.ay)
	var t2: Texture2D = tex[key]
	mat.set_shader_parameter("mask_tex", mask[key])
	mat.set_shader_parameter("atlas_size", Vector2(t2.get_width(), t2.get_height()))
	mat.set_shader_parameter("frame_x", float(f.x))
	if fs != null and f.get("sz") != null:
		var cx: float = fs[4] if fs.size() > 4 and fs[4] != null else (fs[0] + fs[2]) / 2.0
		var cy: float = fs[5] if fs.size() > 5 and fs[5] != null else (fs[1] + fs[3]) / 2.0
		var L1: float = fs[6] if fs.size() > 6 and fs[6] else f.sz[0]
		var L2: float = fs[7] if fs.size() > 7 and fs[7] else f.sz[1]
		var fk := L2 / fk_div
		var fkx := clampf(0.62 * L1 / (11.6 * fk), 0.5, 1.3)
		mat.set_shader_parameter("face_c", Vector2(cx, cy))
		mat.set_shader_parameter("face_r", float(f.get("r", 0.0) if f.get("r") != null else 0.0))
		mat.set_shader_parameter("face_k", fk)
		mat.set_shader_parameter("face_off", Vector2(look[0] * OLHAR * L1 * 0.12, L2 * 0.03 + look[1] * OLHAR * L2 * 0.13))
		mat.set_shader_parameter("face_ex", float(ex))
		mat.set_shader_parameter("face_row", float(clampi(int(F.jsround((fkx - 0.85) / 0.05)), 0, 9)))
		mat.set_shader_parameter("has_face", 1.0)
	else:
		mat.set_shader_parameter("has_face", 0.0)
	var xf := Transform2D(0.0, Vector2(x, y)) * Transform2D.IDENTITY.scaled(Vector2(S * (-1.0 if mirror else 1.0), S))
	# tamanho e giro do desenho inteiro (ajuste do editor), em volta dos pés
	if f.get("ks") or f.get("kr"):
		xf = xf * Transform2D(float(f.get("kr", 0.0) if f.get("kr") else 0.0), Vector2.ZERO) * Transform2D.IDENTITY.scaled(Vector2.ONE * float(f.get("ks", 1.0) if f.get("ks") else 1.0))
	draw_set_transform_matrix(xf)
	draw_texture_rect_region(t2, Rect2(-float(f.ax), -ay, float(f.w), float(f.h)), Rect2(float(f.x), 0.0, float(f.w), float(f.h)))
	draw_set_transform_matrix(Transform2D.IDENTITY)

## bola segura no saque: em cima da palma aberta do desenho (held5 / heldB5)
func mao_do_saque(p: F.Jog, fsg: float) -> Vector2:
	var A: Dictionary = M.a.serve
	var fr: Dictionary = A.f[clampi(int(s.get("sk", 9 if v.charging else 0)), 0, 15)]
	var hd = fr.get("hd")
	if hd == null: hd = [fr.w * 0.9, fr.h * 0.5]
	return Vector2(p.x + fsg * (hd[0] - fr.ax) * S, p.y + (hd[1] - fr.ay) * S - F.VRB + 1.0)
