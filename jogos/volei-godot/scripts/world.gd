extends Node2D
## Mundo do vôlei (400 × 225 unidades, ampliado 3,2× para 1280 × 720). Guarda o estado comum às camadas de desenho.

const VO = preload("res://scripts/volei.gd")
var V = null
var tt := 0.0
var trail: Array = []
var chars: Array = []
var hold = null

# onde a bola aparece: na palma de quem saca, saindo da mão no lançamento, ou onde a física diz
func ball_view_pos() -> Vector2:
	var b: Dictionary = V.b
	if V.state == "serve" and V.held:
		var f = -1.0 if V.server == 1 else 1.0
		hold = chars[V.server].held_pos(V.P[V.server], f); return hold
	if V.state == "rally" and V.hits == 0 and hold != null and V.toss_t < 0.16:
		var k = ease(V.toss_t / 0.16, 0.5)
		return Vector2(lerpf(hold.x, b.x, k), lerpf(hold.y, b.y, k))
	return Vector2(b.x, b.y)

func redraw_all() -> void:
	for c in get_children():
		c.V = V; c.tt = tt; c.queue_redraw()
