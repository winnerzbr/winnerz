extends Node2D
## Fundo: céu e mar com paralaxe, areia, torcida de Amiguinhos, fita da quadra, sombras, areia levantando e a rede.

const VO = preload("res://scripts/volei.gd")
const PXU := 8.0
const HZ2 := 141.0
var V = null
var tt = 0.0
var cam_j = 200.0
var img = {}
var M = {}
var crowd = []
var face_tex: Texture2D

func setup(ftex: Texture2D) -> void:
	face_tex = ftex
	M = JSON.parse_string(FileAccess.get_file_as_string("res://art/cena.json"))
	for n in ["ceu", "mar", "areia", "poste", "poste_escuro", "malha", "faixa"]: img[n] = load("res://art/cena/%s.webp" % n)
	for c in range(8): img["torcida_%d" % c] = load("res://art/cena/torcida_%d.webp" % c)
	var n = 0
	for row in [0, 1]:
		var x = 38.0 if row == 1 else 24.0
		while x < 380.0:
			if not (x > 168.0 and x < 232.0):
				var ex = 2 if n % 5 == 0 else (1 if n % 7 == 0 else 0)
				crowd.append({"x": x + sin(n * 7.3) * 4.0, "row": row, "c": (n * 5 + row) % 8, "ph": n * 1.37, "ex": ex})
				n += 1
			x += 27.0 if row == 1 else 23.0

func ellipse(cx: float, cy: float, rx: float, ry: float, col: Color) -> void:
	var pts = PackedVector2Array()
	for k in range(24): pts.append(Vector2(cx + cos(k * TAU / 24.0) * rx, cy + sin(k * TAU / 24.0) * ry))
	draw_colored_polygon(pts, col)

func face_small(ex: int, pos: Vector2, k: float, col: Color = Color(1, 1, 1)) -> void:
	# rosto desenhado da mesma textura dos personagens (k = unidades do mundo por unidade do rosto)
	var src = Rect2(ex * 480.0, 0.0, 480.0, 384.0)
	draw_texture_rect_region(face_tex, Rect2(pos.x - 10.0 * k, pos.y - 8.0 * k, 20.0 * k, 16.0 * k), src, col)

func _draw() -> void:
	if V == null: return
	var W = VO.W; var H = VO.H
	cam_j = lerpf(cam_j, clampf(V.b.x, 40.0, W - 40.0), minf(1.0, (1.0 / 60.0) * 1.5))
	var cam = cam_j - W / 2.0
	for L in [["ceu", 0.015, 1.08], ["mar", 0.035, 1.1]]:
		var w: float = W * L[2]; var h: float = w * 9.0 / 16.0
		draw_texture_rect(img[L[0]], Rect2((W - w) / 2.0 - cam * L[1], HZ2 - 0.6376 * h, w, h), false)
	draw_texture_rect(img.areia, Rect2(0, 0, W, H), false)
	# torcida
	var cheer: bool = V.cheer > 0.0; var a: Dictionary = M.b_frente
	for row in [0, 1]:
		for c in crowd:
			if c.row != row: continue
			var kk = 0.4 if c.row == 1 else 0.34; var y = 172.0 if c.row == 1 else 165.0
			var hop = maxf(0.0, sin(tt * 11.0 + c.ph)) * 5.0 if cheer else maxf(0.0, sin(tt * 2.0 + c.ph)) * 0.6
			var sy = 1.0 + (0.06 if cheer else 0.02) * sin(tt * 11.0 + c.ph)
			var x: float = c.x - cam * 0.05
			draw_set_transform(Vector2(x, y - hop), 0.0, Vector2(kk / PXU, kk * sy / PXU))
			draw_texture(img["torcida_%d" % c.c], Vector2(-a.foot[0], -a.foot[1]))
			draw_set_transform(Vector2.ZERO)
			var fe: int = 2 if cheer else (4 if V.mood < -0.4 else c.ex)
			face_small(fe, Vector2(x + (a.vis[0] - a.foot[0]) / PXU * kk, y - hop + (a.vis[1] - a.foot[1]) / PXU * kk + 0.3), kk * 0.9)
	# névoa leve separando a torcida da quadra
	var top = Color(1.0, 0.745, 0.667, 0.0); var mid = Color(1.0, 0.745, 0.667, 0.14)
	draw_polygon(PackedVector2Array([Vector2(0, 120), Vector2(W, 120), Vector2(W, 157), Vector2(0, 157)]), PackedColorArray([top, top, mid, mid]))
	draw_polygon(PackedVector2Array([Vector2(0, 157), Vector2(W, 157), Vector2(W, 182), Vector2(0, 182)]), PackedColorArray([mid, mid, top, top]))
	# fita da quadra
	var lc = Color(1.0, 0.973, 0.902, 0.75)
	draw_line(Vector2(30, 190), Vector2(370, 190), lc, 1.4, true)
	draw_line(Vector2(12, 216), Vector2(388, 216), lc, 1.9, true)
	draw_line(Vector2(30, 190), Vector2(12, 216), lc, 1.2, true); draw_line(Vector2(370, 190), Vector2(388, 216), lc, 1.2, true)
	# sombras (diminuem com a altura)
	var bv: Vector2 = get_parent().ball_view_pos()
	var hb = maxf(0.0, VO.VGY - (bv.y + VO.VRB)); var ks = clampf(1.0 - hb / 170.0, 0.2, 1.0)
	ellipse(bv.x, VO.VGY + 1.0, 3.0 + 10.0 * ks, 1.0 + 1.7 * ks, Color(0.588, 0.282, 0.188, 0.1 + 0.3 * ks))
	for i in range(2):
		var p: Dictionary = V.P[i]; var k = clampf(1.0 - (VO.VGY - p.y) / 90.0, 0.35, 1.0)
		ellipse(p.x, VO.VGY + 1.0, (15.0 if i == 1 else 12.0) * k, 2.4, Color(0.588, 0.282, 0.188, 0.32 * k))
	for f in V.fx: draw_circle(Vector2(f.x, f.y), 1.1, Color(0.84, 0.59, 0.36, 1.0 - f.t / 0.55))
	# rastro de fogo da bola depois do especial
	var b: Dictionary = V.b
	var tr: Array = get_parent().trail
	if b.fire > 0.0:
		tr.push_front(Vector2(b.x, b.y))
		if tr.size() > 14: tr.pop_back()
		for k in range(tr.size()):
			var col = Color("#ffffff") if k < 4 else (Color("#7ff0ff") if k < 8 else Color("#ff9a2a"))
			col.a = (1.0 - k / 14.0) * minf(1.0, b.fire) * 0.85
			draw_circle(tr[k], maxf(2.0, VO.VRB - k * 0.6), col)
	else: tr.clear()
	net2()
	# rastro do braço na cortada
	for i in range(2):
		var p: Dictionary = V.P[i]
		if p.sw == null: continue
		var face = -1.0 if i == 1 else 1.0; var pts = []
		for k in range(7):
			var t2: float = p.sw.t - k * 0.013
			if t2 < VO.SPK.T * 0.15: break
			var Lr = p.sw.L if p.sw.hit else V.b
			pts.append(VO.swing_pose(p, face, t2, p.sw.gnd, p.sw.pow, Lr).pts[0])
		for k in range(1, pts.size()):
			var al = 0.55 * (1.0 - float(k) / pts.size())
			draw_line(Vector2(pts[k - 1].x, pts[k - 1].y), Vector2(pts[k].x, pts[k].y), Color(1, 1, 1, al), 5.0 * (1.0 - float(k) / pts.size()) + 1.0, true)

func post(x: float, top: float, bot: float, kw: float, im: Texture2D) -> void:
	var a: Dictionary = M.poste; var w: float = a.w / PXU * kw; var cx: float = a.cx[0] / PXU * kw
	var capH = 104.0 / PXU * kw; var knH = 56.0 / PXU * kw; var kn = VO.VNT + 46.0 - knH / 2.0
	var seg = func(y0: float, y1: float, dy: float, dh: float): draw_texture_rect_region(im, Rect2(x - cx, dy, w, dh), Rect2(0, y0, a.w, y1 - y0))
	seg.call(0.0, 104.0, top, capH); seg.call(104.0, 182.0, top + capH - 0.1, kn - top - capH + 0.2)
	seg.call(182.0, 238.0, kn, knH); seg.call(238.0, a.h, kn + knH - 0.1, bot - kn - knH + 0.1)

func net2() -> void:
	var x0 = VO.VNX; var top = VO.VNT; var bot = VO.VNT + 46.0; var bx = x0 + 15.0; var by = -9.0
	post(bx, top - 13.0, VO.VGY - 12.0, 0.5, img.poste_escuro)
	var m: Dictionary = M.malha; var f: Dictionary = M.faixa
	draw_set_transform_matrix(Transform2D(Vector2(15.0 / m.w, by / m.w), Vector2(0, 44.0 / m.h), Vector2(x0, top + 2.0)))
	draw_texture(img.malha, Vector2.ZERO); draw_texture(img.malha, Vector2.ZERO)
	draw_set_transform_matrix(Transform2D(Vector2(15.0 / f.w, by / f.w), Vector2(0, 4.2 / f.h), Vector2(x0, top - 1.6)))
	draw_texture(img.faixa, Vector2.ZERO)
	draw_set_transform_matrix(Transform2D(Vector2(15.0 / f.w, by / f.w), Vector2(0, 2.6 / f.h), Vector2(x0, bot - 1.0)))
	draw_texture(img.faixa, Vector2.ZERO)
	draw_set_transform(Vector2.ZERO)
	post(x0, top - 4.0, VO.VGY + 3.0, 0.6, img.poste)
