extends Node2D
## Avisos por cima da prova (na escala dela): os textos que sobem ("+100", "Ponto!") e a faixa do meio da tela.
var partida

func _txt(s: String, x: float, y: float, cor: Color, tam: float, contorno := 0.0) -> void:
	var f: Font = Jogo.fonte_larga
	var n := int(ceil(tam * 4.0)); var k := tam / n
	var w := f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, n).x * k
	draw_set_transform(Vector2(x - w / 2.0, y), 0.0, Vector2(k, k))
	if contorno > 0.0: draw_string_outline(f, Vector2.ZERO, s, HORIZONTAL_ALIGNMENT_LEFT, -1, n, int(contorno / k), Color("0a1016"))
	draw_string(f, Vector2.ZERO, s, HORIZONTAL_ALIGNMENT_LEFT, -1, n, cor)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _w(s: String, tam: float) -> float:
	var n := int(ceil(tam * 4.0)); return Jogo.fonte_larga.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, n).x * tam / n

func _draw() -> void:
	if partida == null: return
	var W: float = partida.prova.W
	for q in partida.pops:
		if q.t > 0.85 and int(q.t * 20) % 2 == 1: continue
		var s: String = str(q.s).to_upper(); var tam := 7.0
		var w := _w(s, tam); var x := clampf(q.x, w / 2 + 6, W - w / 2 - 6); var y: float = q.y - q.t * 16
		if q.big: draw_rect(Rect2(x - w / 2 - 4, y - 9, w + 8, 12), Color(0.04, 0.06, 0.09, 0.62))
		_txt(s, x, y, q.c, tam, 0.0 if q.big else 1.6)
	var f = partida.faixa
	if f != null:
		var y: float = partida.prova.get("banner_y") if partida.prova.get("banner_y") != null else 84.0
		var c: Color = f.c
		draw_rect(Rect2(0, y, W, 24), Color(0.04, 0.06, 0.09, 0.84))
		draw_rect(Rect2(0, y, W, 1), c); draw_rect(Rect2(0, y + 23, W, 1), c)
		_txt(str(f.s).to_upper(), W / 2, y + 16, c, 9.0)
