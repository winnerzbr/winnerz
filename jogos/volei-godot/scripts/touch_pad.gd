extends Control
## Botões de toque (celular e tablet): setas à esquerda, ações à direita. Vários dedos ao mesmo tempo.

const NV := Color("#1b1f4f")
var BTN := {
	"l": {"p": Vector2(120, 600), "r": 74.0, "t": "◀"}, "r": {"p": Vector2(290, 600), "r": 74.0, "t": "▶"},
	"u": {"p": Vector2(1160, 590), "r": 80.0, "t": "Pular"}, "c": {"p": Vector2(1000, 640), "r": 62.0, "t": "Corte"},
	"d": {"p": Vector2(1175, 410), "r": 56.0, "t": "Peixinho"}, "e": {"p": Vector2(1000, 470), "r": 52.0, "t": "Especial"},
	"pause": {"p": Vector2(60, 56), "r": 36.0, "t": "II"},
}
var fingers := {}
var held := {}
var font: Font
var meter_full := false
var shown := false

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_preset(Control.PRESET_FULL_RECT)

func which(pos: Vector2) -> String:
	var best := ""; var bd := 1e9
	for k in BTN.keys():
		var d: float = pos.distance_to(BTN[k].p)
		if d < BTN[k].r * 1.35 and d < bd: best = k; bd = d
	return best

func _input(ev: InputEvent) -> void:
	if ev is InputEventScreenTouch:
		shown = true
		if ev.pressed: fingers[ev.index] = which(ev.position)
		else: fingers.erase(ev.index)
		_refresh()
	elif ev is InputEventScreenDrag:
		var k := which(ev.position)
		if fingers.get(ev.index, "") in ["l", "r"] and k in ["l", "r"]: fingers[ev.index] = k
		_refresh()

func _refresh() -> void:
	held = {}
	for k in fingers.values():
		if k != "": held[k] = true
	queue_redraw()

func _draw() -> void:
	if not shown or not visible: return
	for k in BTN.keys():
		var B: Dictionary = BTN[k]; var on: bool = held.has(k)
		var a := 0.55 if on else 0.32
		if k == "e" and not meter_full: a = 0.14
		draw_circle(B.p, B.r, Color(1, 1, 1, a * 0.55))
		draw_arc(B.p, B.r, 0.0, TAU, 48, Color(1, 1, 1, a + 0.2), 3.0, true)
		var fs := 34 if B.t.length() <= 2 else 22
		var w := font.get_string_size(B.t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		draw_string_outline(font, B.p + Vector2(-w / 2.0, fs * 0.36), B.t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 6, Color(NV, a + 0.3))
		draw_string(font, B.p + Vector2(-w / 2.0, fs * 0.36), B.t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 1, 1, a + 0.45))
