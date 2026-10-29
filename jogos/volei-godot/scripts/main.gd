extends Node
## Vôlei de praia (teste no Godot): monta a cena, lê teclado, controle e toque, roda a partida em passos fixos e mostra os menus.

const VO = preload("res://scripts/volei.gd")
const NV := Color("#1b1f4f")
const CREAM := Color("#fff4dc")
const YEL := Color("#ffd24a")

var V
var world
var chars := []
var touch
var overlay: Control
var font: Font
var mode := "title"   # title · play · pause · over
var acc := 0.0
var tt := 0.0
var demo_ai := {}
var prev := {}
var sfx := {}
var players := []
var pi := 0
var panel: PanelContainer

func _ready() -> void:
	font = load("res://fonte.ttf")
	var face_tex: Texture2D = load("res://art/rostos.png")
	V = VO.new()
	world = Node2D.new(); world.set_script(load("res://scripts/world.gd")); world.scale = Vector2(3.2, 3.2); add_child(world)
	var back = Node2D.new(); back.set_script(load("res://scripts/back_view.gd")); world.add_child(back); back.setup(face_tex)
	for i in range(2):
		var c = Node2D.new(); c.set_script(load("res://scripts/char_view.gd")); world.add_child(c); c.setup("ia" if i == 0 else "bl", i, face_tex); chars.append(c)
	var front = Node2D.new(); front.set_script(load("res://scripts/front_view.gd")); world.add_child(front); front.setup(font)
	world.chars = chars; world.V = V
	var ui := CanvasLayer.new(); add_child(ui)
	touch = Control.new(); touch.set_script(load("res://scripts/touch_pad.gd")); touch.font = font; ui.add_child(touch)
	overlay = Control.new(); overlay.set_anchors_preset(Control.PRESET_FULL_RECT); overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE; ui.add_child(overlay)
	for n in ["pulo", "toque", "toque_dele", "corte", "corte_forte", "giro", "saque", "peixinho", "pouso", "salvou", "rapida", "ponto", "levou", "barra", "mira", "especial"]:
		sfx[n] = load("res://sons/%s.wav" % n)
	for k in range(8):
		var a := AudioStreamPlayer.new(); a.volume_db = -6.0; add_child(a); players.append(a)
	demo_ai = V.new_ai()
	show_title()

func play(n: String) -> void:
	if not sfx.has(n): return
	var a: AudioStreamPlayer = players[pi]; pi = (pi + 1) % players.size(); a.stream = sfx[n]; a.play()

# ---------------------------------------------------------------- controles
func joy_btn(b: int) -> bool:
	for d in Input.get_connected_joypads():
		if Input.is_joy_button_pressed(d, b): return true
	return false

func joy_axis(a: int) -> float:
	var best := 0.0
	for d in Input.get_connected_joypads():
		var v := Input.get_joy_axis(d, a)
		if absf(v) > absf(best): best = v
	return best

func key(ks: Array) -> bool:
	for k in ks:
		if Input.is_physical_key_pressed(k): return true
	return false

func read_input() -> Dictionary:
	var T: Dictionary = touch.held
	var l := key([KEY_LEFT, KEY_A]) or joy_btn(JOY_BUTTON_DPAD_LEFT) or T.has("l")
	var r := key([KEY_RIGHT, KEY_D]) or joy_btn(JOY_BUTTON_DPAD_RIGHT) or T.has("r")
	var up := key([KEY_UP, KEY_W]) or joy_btn(JOY_BUTTON_DPAD_UP)
	var down := key([KEY_DOWN, KEY_S]) or joy_btn(JOY_BUTTON_DPAD_DOWN)
	var jump := up or key([KEY_SPACE]) or joy_btn(JOY_BUTTON_A) or T.has("u")
	var dive := down or key([KEY_X]) or joy_btn(JOY_BUTTON_B) or T.has("d")
	var spike := key([KEY_C, KEY_J]) or joy_btn(JOY_BUTTON_X) or T.has("c")
	var spec := key([KEY_V, KEY_K]) or joy_btn(JOY_BUTTON_RIGHT_SHOULDER) or joy_axis(JOY_AXIS_TRIGGER_RIGHT) > 0.5 or T.has("e")
	var ax := joy_axis(JOY_AXIS_LEFT_X); var ay := joy_axis(JOY_AXIS_LEFT_Y)
	var c := {"l": l, "r": r, "u": jump, "d": dive and not prev.get("dive", false), "sp": spike and not prev.get("spike", false), "spH": spike,
		"spcH": spec, "au": up or l, "ad": down or r, "has_ax": false, "ax": 0.0, "has_ay": false, "ay": 0.0, "dir": 0.0, "pow": null}
	if absf(ax) > 0.3 and not (l or r): c.has_ax = true; c.ax = ax
	if Vector2(ax, ay).length() > 0.35: c.has_ay = true; c.ay = ay; c.ax = ax
	if absf(ay) > 0.6 and ay > 0.0 and not prev.get("stick_down", false): c.d = true
	prev = {"dive": dive, "spike": spike, "stick_down": absf(ay) > 0.6 and ay > 0.0}
	return c

func _unhandled_input(ev: InputEvent) -> void:
	var pause := false
	if ev is InputEventKey and ev.pressed and not ev.echo and ev.physical_keycode in [KEY_ESCAPE, KEY_P]: pause = true
	if ev is InputEventJoypadButton and ev.pressed and ev.button_index == JOY_BUTTON_START: pause = true
	if pause:
		if mode == "play": show_pause()
		elif mode == "pause": resume()

# ---------------------------------------------------------------- laço principal
func _process(delta: float) -> void:
	tt += delta
	if touch.held.has("pause") and mode == "play": touch.held.erase("pause"); show_pause()
	if mode == "play" or mode == "title":
		acc = minf(acc + delta, 0.1)
		while acc >= VO.DT:
			acc -= VO.DT
			var c0: Dictionary
			if mode == "title":
				c0 = V.brain(0, VO.DT, demo_ai, V.cfg_now()); c0.spH = false; c0.spcH = false
				if V.state == "serve" and V.held and V.server == 0: c0.spH = int(tt * 60.0) % 90 < 40
			else: c0 = read_input()
			var done: bool = V.update(VO.DT, c0)
			for e in V.events:
				if mode == "play": play({"pouso_peixe": "pouso"}.get(e, e))
			V.events.clear()
			if done:
				if mode == "title": V.reset_match(); reset_views()
				else: show_over(); break
	if V.flash > 0.0: V.flash = maxf(0.0, V.flash - delta)
	var sh: float = V.shake
	world.position = Vector2(randf_range(-1.0, 1.0), randf_range(-1.0, 1.0)) * sh * 14.0 if sh > 0.0 else Vector2.ZERO
	touch.meter_full = V.meter[0] >= 1.0
	touch.visible = mode == "play"
	touch.queue_redraw()
	world.tt = tt; world.redraw_all()

func reset_views() -> void:
	for c in chars: c.reset()
	world.trail.clear(); world.hold = null

# ---------------------------------------------------------------- menus
func clear_overlay() -> void:
	for c in overlay.get_children(): c.queue_free()
	panel = null

func lbl(t: String, size: int, col: Color = CREAM) -> Label:
	var L := Label.new(); L.text = t; L.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; L.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	L.add_theme_font_override("font", font); L.add_theme_font_size_override("font_size", size); L.add_theme_color_override("font_color", col)
	L.add_theme_color_override("font_outline_color", NV); L.add_theme_constant_override("outline_size", 6)
	return L

func btn(t: String, cb: Callable, primary: bool = false) -> Button:
	var B := Button.new(); B.text = t; B.custom_minimum_size = Vector2(320, 64)
	B.add_theme_font_override("font", font); B.add_theme_font_size_override("font_size", 28)
	for st in ["normal", "hover", "pressed", "focus"]:
		var sb := StyleBoxFlat.new(); sb.set_corner_radius_all(32); sb.set_border_width_all(4)
		var on: bool = st in ["hover", "focus", "pressed"]
		sb.bg_color = YEL if primary else (Color("#2f74dc") if on else Color(1, 1, 1, 0.12))
		if primary and on: sb.bg_color = Color("#ffe27a")
		sb.border_color = Color.WHITE if on else (YEL if primary else Color(1, 1, 1, 0.5))
		B.add_theme_stylebox_override(st, sb)
	B.add_theme_color_override("font_color", NV if primary else CREAM); B.add_theme_color_override("font_hover_color", NV if primary else Color.WHITE)
	B.add_theme_color_override("font_focus_color", NV if primary else Color.WHITE); B.add_theme_color_override("font_pressed_color", NV if primary else Color.WHITE)
	B.pressed.connect(cb)
	return B

func make_panel(width: float) -> VBoxContainer:
	clear_overlay()
	var dim := ColorRect.new(); dim.color = Color(0.06, 0.06, 0.2, 0.42); dim.set_anchors_preset(Control.PRESET_FULL_RECT); dim.mouse_filter = Control.MOUSE_FILTER_IGNORE; overlay.add_child(dim)
	var cc := CenterContainer.new(); cc.set_anchors_preset(Control.PRESET_FULL_RECT); overlay.add_child(cc)
	panel = PanelContainer.new(); var sb := StyleBoxFlat.new(); sb.bg_color = Color(0.106, 0.122, 0.31, 0.9); sb.set_corner_radius_all(28)
	sb.set_border_width_all(4); sb.border_color = Color(1, 0.82, 0.29, 0.9); sb.content_margin_left = 48; sb.content_margin_right = 48; sb.content_margin_top = 34; sb.content_margin_bottom = 34
	panel.add_theme_stylebox_override("panel", sb); panel.custom_minimum_size = Vector2(width, 0); cc.add_child(panel)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 14); vb.alignment = BoxContainer.ALIGNMENT_CENTER; panel.add_child(vb)
	return vb

func center(n: Control) -> CenterContainer:
	var c := CenterContainer.new(); c.add_child(n); return c

func show_title() -> void:
	mode = "title"; V.reset_match(); reset_views()
	var vb := make_panel(760)
	vb.add_child(lbl("IAmiguinho · Jogos de Verão", 22, YEL))
	vb.add_child(lbl("Vôlei de praia", 64))
	vb.add_child(lbl("Contra o Amiguinho Rosa. Quem fizer 7 pontos vence.", 24))
	var go := btn("Jogar", start_game, true); vb.add_child(center(go))
	vb.add_child(center(btn("Tela cheia", toggle_fs)))
	vb.add_child(lbl("Teclado: ◀ ▶ anda · ▲ ou Espaço pula · ▼ ou X peixinho · C corta (segure = mais forte) · V especial · Esc pausa", 17, Color(1, 1, 1, 0.85)))
	vb.add_child(lbl("Controle: analógico anda · ✕ pula · □ corta · ○ peixinho · R1/R2 especial · Start pausa", 17, Color(1, 1, 1, 0.85)))
	vb.add_child(lbl("No celular: botões na tela, com o aparelho deitado. Versão de teste feita no Godot.", 17, Color(1, 1, 1, 0.65)))
	go.call_deferred("grab_focus")

func start_game() -> void:
	clear_overlay(); V.reset_match(); reset_views(); mode = "play"; acc = 0.0; prev = {"dive": true, "spike": true}

func toggle_fs() -> void:
	var m := DisplayServer.window_get_mode()
	DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED if m == DisplayServer.WINDOW_MODE_FULLSCREEN else DisplayServer.WINDOW_MODE_FULLSCREEN)

func show_pause() -> void:
	mode = "pause"
	var vb := make_panel(560)
	vb.add_child(lbl("Pausa", 56))
	var go := btn("Continuar", resume, true); vb.add_child(center(go))
	vb.add_child(center(btn("Recomeçar", start_game)))
	vb.add_child(center(btn("Tela cheia", toggle_fs)))
	vb.add_child(center(btn("Sair para o início", show_title)))
	go.call_deferred("grab_focus")

func resume() -> void:
	clear_overlay(); mode = "play"; acc = 0.0

func show_over() -> void:
	mode = "over"
	var won: bool = V.sc[0] > V.sc[1]
	var vb := make_panel(640)
	vb.add_child(lbl("Você venceu!" if won else "O Amiguinho venceu", 56, YEL if won else CREAM))
	vb.add_child(lbl("%d a %d" % [V.sc[0], V.sc[1]], 40))
	vb.add_child(lbl("%d cortadas · %d batidas rápidas · %d peixinhos · maior rali: %d toques" % [V.cortadas[0], V.rapidas[0], V.peixes[0], V.longest], 20, Color(1, 1, 1, 0.85)))
	var go := btn("Jogar de novo", start_game, true); vb.add_child(center(go))
	vb.add_child(center(btn("Início", show_title)))
	go.call_deferred("grab_focus")
