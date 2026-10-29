extends Node2D
## Frente: areia levantando, bola, seta da bola fora da tela, placar de madeira e o especial (mira, clarão, faíscas).

const VO = preload("res://scripts/volei.gd")
const PXU := 8.0
const NV := Color("#1b1f4f")
var V = null
var tt = 0.0
var img = {}
var M = {}
var font: Font
var spl = []
var ground_was = [true, true]
var ball_ground = false

func setup(fnt: Font) -> void:
	font = fnt
	M = JSON.parse_string(FileAccess.get_file_as_string("res://art/cena.json"))
	for n in ["bola", "placar", "areia1", "areia2", "areia3"]: img[n] = load("res://art/cena/%s.webp" % n)

func splash(x: float, big: bool) -> void:
	spl.append({"x": x, "t": 0.0, "n": "areia3" if big else ("areia1" if randf() < 0.5 else "areia2"), "s": 0.55 if big else 0.7})

func text_o(s: String, pos: Vector2, size: float, fill: Color, lw: float = 2.2) -> void:
	# texto com contorno, centrado (tamanho em unidades do mundo: desenhado em escala maior e reduzido, para ficar nítido)
	var k = 8.0; var fs = int(size * k)
	var w = font.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	draw_set_transform(pos, 0.0, Vector2(1.0 / k, 1.0 / k))
	var base = Vector2(-w / 2.0, fs * 0.36)
	if lw > 0.0: draw_string_outline(font, base, s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, int(lw * k), NV)
	draw_string(font, base, s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, fill)
	draw_set_transform(Vector2.ZERO)

func ball(x: float, y: float, ang: float, sc: float = 1.0) -> void:
	var a: Dictionary = M.bola; var k: float = (VO.VRB * 2.0) / (a.w / PXU) * 1.04 * sc
	draw_set_transform(Vector2(x, y), ang, Vector2(k / PXU, k / PXU))
	draw_texture(img.bola, Vector2(-a.c[0], -a.c[1]))
	draw_set_transform(Vector2.ZERO)

func _draw() -> void:
	if V == null: return
	var dt = 1.0 / 60.0; var W = VO.W; var H = VO.H; var b: Dictionary = V.b
	# areia levantando quando alguém pousa ou a bola cai
	for i in range(2):
		var p: Dictionary = V.P[i]
		if p.g and not ground_was[i]: splash(p.x + (p.dv.dir * 6.0 if p.dv != null else 0.0), p.dv != null)
		ground_was[i] = p.g
	var on_g: bool = b.y + VO.VRB >= VO.VGY - 1.0
	if on_g and not ball_ground: splash(b.x, true)
	ball_ground = on_g
	for e in spl: e.t += dt
	spl = spl.filter(func(e): return e.t <= 0.5)
	for e in spl:
		var a: Dictionary = M[e.n]; var k: float = e.t / 0.5; var sc: float = e.s * (0.55 + 0.6 * ease(minf(1.0, k * 1.8), -1.6))
		draw_set_transform(Vector2(e.x, VO.VGY + 2.0), 0.0, Vector2(sc / PXU, sc * (1.0 - 0.25 * k) / PXU))
		draw_texture(img[e.n], Vector2(-a.c[0], -a.c[1]), Color(1, 1, 1, clampf(1.6 - k * 1.6, 0.0, 1.0)))
		draw_set_transform(Vector2.ZERO)
	var bv: Vector2 = get_parent().ball_view_pos()
	var held_sc = (VO.VRB + 1.2) / VO.VRB if V.state == "serve" and V.held else 1.0
	ball(bv.x, bv.y, b.ang, held_sc)
	# bola lá no alto, fora da tela: setinha
	if b.y + VO.VRB < 0.0:
		var k = clampf(1.0 + (b.y + VO.VRB) / 160.0, 0.45, 1.0); var x = clampf(b.x, 8.0, W - 8.0); var s2 = 3.0 + 2.5 * k
		var tri = PackedVector2Array([Vector2(x, 2), Vector2(x + s2, 2 + s2 * 1.3), Vector2(x - s2, 2 + s2 * 1.3)])
		draw_colored_polygon(tri, Color(1, 1, 1, 0.6 + 0.4 * k)); draw_polyline(tri + PackedVector2Array([tri[0]]), NV, 1.4, true)
	scoreboard()
	# especial: tudo para, a tela escurece e aparece a seta de mira
	if V.special != null:
		var S: Dictionary = V.special; var f = -1.0 if S.i == 1 else 1.0
		draw_rect(Rect2(0, 0, W, H), Color(0.078, 0.07, 0.27, 0.45))
		if S.t < 0.5:
			for k in range(8):
				var a2: float = k / 8.0 * TAU + S.t * 9.0; var r: float = 6.0 + S.t * 40.0
				draw_circle(Vector2(S.from.x + cos(a2) * r, S.from.y - 20.0 + sin(a2) * r), 1.6, Color(0.5, 0.94, 1.0, (1.0 - S.t / 0.5) * 0.8))
		ball(b.x, b.y, b.ang)
		var ca: float = cos(S.ang) * f; var sa: float = sin(S.ang); var L0 = VO.VRB + 4.0; var L1 = VO.VRB + 46.0; var pl = 0.5 + 0.5 * sin(tt * 10.0)
		draw_line(Vector2(b.x + ca * L0, b.y + sa * L0), Vector2(b.x + ca * L1, b.y + sa * L1), NV, 4.2, true)
		draw_dashed_line(Vector2(b.x + ca * L0, b.y + sa * L0), Vector2(b.x + ca * L1, b.y + sa * L1), Color.WHITE, 2.0, 3.0)
		var hx: float = b.x + ca * (L1 + 6.0); var hy: float = b.y + sa * (L1 + 6.0); var nx = -sa; var ny = ca
		var head = PackedVector2Array([Vector2(hx + ca * 2.0, hy + sa * 2.0), Vector2(hx - ca * 9.0 + nx * 6.5, hy - sa * 9.0 + ny * 6.5), Vector2(hx - ca * 9.0 - nx * 6.5, hy - sa * 9.0 - ny * 6.5)])
		draw_colored_polygon(head, Color((200.0 + 55.0 * pl) / 255.0, 245.0 / 255.0, 1.0)); draw_polyline(head + PackedVector2Array([head[0]]), NV, 2.1, true)
		draw_arc(Vector2(b.x, b.y), VO.VRB + 3.0 + pl * 2.0, 0.0, TAU, 32, Color(0.5, 0.94, 1.0, 0.4 + 0.4 * pl), 1.5, true)
	if V.spec_fx != null:
		var F: Dictionary = V.spec_fx; F.t += dt
		if F.t < 0.22: draw_rect(Rect2(0, 0, W, H), Color(1.0, 1.0, 0.94, 0.75 * (1.0 - F.t / 0.22)))
		for k in range(3):
			var tk: float = F.t - k * 0.07
			if tk <= 0.0 or tk > 0.5: continue
			draw_arc(Vector2(F.x, F.y), 8.0 + tk * 160.0, 0.0, TAU, 48, Color(0.5, 0.94, 1.0, 1.0 - tk / 0.5) if k == 1 else Color(1, 1, 1, 1.0 - tk / 0.5), 2.0, true)
		if F.t < 0.35:
			for k in range(10):
				var a3: float = F.ang + (k - 4.5) * 0.08; var l0: float = 14.0 + F.t * 120.0; var l1 = l0 + 26.0
				draw_line(Vector2(F.x - cos(a3) * F.f * l0, F.y - sin(a3) * l0), Vector2(F.x - cos(a3) * F.f * l1, F.y - sin(a3) * l1), Color(1, 1, 1, (1.0 - F.t / 0.35) * 0.8), 2.0, true)
		for q in F.sparks:
			q.x += q.vx / 60.0; q.y += q.vy / 60.0; q.vy += 300.0 / 60.0; q.vx *= 0.97
			var cc: Color = q.c; cc.a = maxf(0.0, 1.0 - F.t / 0.7); draw_circle(Vector2(q.x, q.y), 1.2, cc)
		if F.t > 0.75: V.spec_fx = null

func scoreboard() -> void:
	var a: Dictionary = M.placar; var Z = 1.4; var w: float = a.w / PXU * Z; var x = VO.W / 2.0 - w / 2.0; var y = 1.0
	draw_texture_rect(img.placar, Rect2(x, y, w, a.h / PXU * Z), false)
	var blink0 = V.flash > 0.0 and V.flash_w == 0 and int(V.flash * 10.0) % 2 == 0
	var blink1 = V.flash > 0.0 and V.flash_w == 1 and int(V.flash * 10.0) % 2 == 0
	text_o(str(V.sc[0]), Vector2(x + a.c1[0] / PXU * Z, y + a.c1[1] / PXU * Z + 1.0), 17.0, Color.WHITE if blink0 else Color("#2f74dc"), 3.2)
	text_o(str(V.sc[1]), Vector2(x + a.c2[0] / PXU * Z, y + a.c2[1] / PXU * Z + 1.0), 17.0, Color.WHITE if blink1 else Color("#e86fa8"), 3.2)
	var cx = VO.W / 2.0; var cyy: float = y + a.c1[1] / PXU * Z
	draw_circle(Vector2(cx, cyy + 9.0), 3.6, Color("#ffd24a")); draw_arc(Vector2(cx, cyy + 9.0), 3.6, 0.0, TAU, 24, NV, 1.0, true)
	text_o(str(VO.VWIN), Vector2(cx, cyy + 9.3), 4.2, NV, 0.0)
	if V.state == "rally":
		for side in [0, 1]:
			var bx: float = x + (a.c2[0] if side == 1 else a.c1[0]) / PXU * Z; var by: float = y + a.h / PXU * Z + 3.2
			for k in range(3):
				var on: bool = k < V.touches[side]
				draw_circle(Vector2(bx + (k - 1) * 5.0, by), 1.7, Color("#ffd24a") if on else Color(1, 1, 1, 0.4))
				draw_arc(Vector2(bx + (k - 1) * 5.0, by), 1.7, 0.0, TAU, 16, NV, 0.7, true)
