class_name Prova
extends Node2D
## Base de toda prova. Cada prova é uma cena com um script que "extends Prova" e preenche:
##   id (igual ao de Jogo.PROVAS), W e H (o tamanho da tela da prova, em unidades; a partida amplia para caber na janela),
##   iniciar(), passo(dt, I) -> true quando acabou, desenhar(tt), hud() -> 4 pares [rótulo, valor, destaque],
##   estatisticas() -> textos do fim, pontos (a pontuação), placar_txt() (opcional: "7 a 3"), explicacao() (antes de jogar).
## O desenho usa os mesmos comandos da versão do navegador (save/restore/translate/rotate/scale, alpha, retângulos, imagens),
## para que cada prova passe de lá para cá quase linha por linha.

var W := 400.0
var H := 225.0
var t := 0.0
var pontos := 0
## preenchido pela partida
var partida = null
## tempo do desenho (para animações), avança mesmo pausado no menu
var tt := 0.0

# ---------------------------------------------------------------- o que cada prova escreve
func iniciar() -> void: pass
func passo(_dt: float, _I: Dictionary) -> bool: return false
func desenhar(_tt: float) -> void: pass
func hud() -> Array: return [["Pontos", Jogo.nf(pontos), false], ["", "", false], ["", "", false], ["", "", false]]
func estatisticas() -> Array: return []
func placar_txt() -> String: return ""
func explicacao() -> String: return ""
## a prova pode desenhar uma camada de luz (somada, como o "lighter" do navegador): escreva desenhar_luz(tt)
func desenhar_luz(_tt: float) -> void: pass
func tem_luz() -> bool: return false

# ---------------------------------------------------------------- avisos na tela (a partida desenha por cima)
func pop(s: String, x: float, y: float, cor: Color = Color.WHITE, grande := false) -> void:
	if partida: partida.pop(s, x, y, cor, grande)
func banner(s: String, cor: Color = Color.WHITE, d := 1.4) -> void:
	if partida: partida.banner(s, cor, d)
func tremer(k: float) -> void:
	if partida: partida.shake = maxf(partida.shake, k)
func falar(linhas, prob := 1.0) -> void: Jogo.falar(linhas, prob)

# ---------------------------------------------------------------- desenho
var _alvo: CanvasItem
var _xf := Transform2D.IDENTITY
var alpha := 1.0
var _pilha: Array = []
var _luz: Node2D

func _ready() -> void:
	_alvo = self
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	if tem_luz():
		_luz = Node2D.new()
		var m := CanvasItemMaterial.new(); m.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		_luz.material = m
		_luz.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
		_luz.draw.connect(_draw_luz)
		add_child(_luz)

func _draw() -> void:
	_alvo = self; _xf = Transform2D.IDENTITY; alpha = 1.0; _pilha.clear()
	draw_set_transform_matrix(_xf)
	desenhar(tt)

func _draw_luz() -> void:
	_alvo = _luz; _xf = Transform2D.IDENTITY; alpha = 1.0; _pilha.clear()
	_luz.draw_set_transform_matrix(_xf)
	desenhar_luz(tt)
	_alvo = self

## pede um desenho novo (a partida chama a cada quadro)
func redesenha() -> void:
	queue_redraw()
	if _luz: _luz.queue_redraw()

func save() -> void: _pilha.append([_xf, alpha])
func restore() -> void:
	if _pilha.is_empty(): return
	var s = _pilha.pop_back(); _xf = s[0]; alpha = s[1]; _alvo.draw_set_transform_matrix(_xf)
func translate_(x: float, y: float) -> void: _xf = _xf * Transform2D(0.0, Vector2(x, y)); _alvo.draw_set_transform_matrix(_xf)
func rotate_(a: float) -> void: _xf = _xf * Transform2D(a, Vector2.ZERO); _alvo.draw_set_transform_matrix(_xf)
func scale_(sx: float, sy: float) -> void: _xf = _xf * Transform2D.IDENTITY.scaled(Vector2(sx, sy)); _alvo.draw_set_transform_matrix(_xf)
func set_transform_(xf: Transform2D) -> void: _xf = xf; _alvo.draw_set_transform_matrix(_xf)

func _c(cor: Color) -> Color:
	if alpha >= 1.0: return cor
	return Color(cor.r, cor.g, cor.b, cor.a * alpha)

## retângulo cheio (o "R" do navegador)
func R(x: float, y: float, w: float, h: float, cor) -> void:
	_alvo.draw_rect(Rect2(x, y, w, h), _c(cor if cor is Color else Color(cor)))
## retângulo só com a borda
func stroke_rect(x: float, y: float, w: float, h: float, cor: Color, lw := 1.0) -> void:
	_alvo.draw_rect(Rect2(x, y, w, h), _c(cor), false, lw)
func circle(x: float, y: float, r: float, cor: Color) -> void:
	_alvo.draw_circle(Vector2(x, y), r, _c(cor))
func ring(x: float, y: float, r: float, cor: Color, lw := 1.0) -> void:
	_alvo.draw_arc(Vector2(x, y), r, 0.0, TAU, maxi(16, int(r * 3)), _c(cor), lw, true)
func ellipse(x: float, y: float, rx: float, ry: float, cor: Color, rot := 0.0) -> void:
	var p := PackedVector2Array()
	var n := maxi(16, int(maxf(rx, ry) * 2.5))
	for k in n:
		var a := TAU * k / n
		p.append(Vector2(x, y) + Vector2(cos(a) * rx, sin(a) * ry).rotated(rot))
	_alvo.draw_colored_polygon(p, _c(cor))
func line(x0: float, y0: float, x1: float, y1: float, cor: Color, lw := 1.0) -> void:
	_alvo.draw_line(Vector2(x0, y0), Vector2(x1, y1), _c(cor), lw, true)
func poly(pts: PackedVector2Array, cor: Color) -> void:
	if pts.size() >= 3: _alvo.draw_colored_polygon(pts, _c(cor))
func polyline(pts: PackedVector2Array, cor: Color, lw := 1.0) -> void:
	if pts.size() >= 2: _alvo.draw_polyline(pts, _c(cor), lw, true)
## degradê vertical num retângulo: cores de cima para baixo (2 ou mais)
func grad_rect(x: float, y: float, w: float, h: float, cores: Array) -> void:
	var n := cores.size() - 1
	for i in n:
		var y0 := y + h * i / n; var y1 := y + h * (i + 1) / n
		var c0: Color = _c(cores[i]); var c1: Color = _c(cores[i + 1])
		_alvo.draw_polygon(PackedVector2Array([Vector2(x, y0), Vector2(x + w, y0), Vector2(x + w, y1), Vector2(x, y1)]), PackedColorArray([c0, c0, c1, c1]))

## imagem: pedaço (sx, sy, sw, sh) da textura desenhado em (dx, dy, dw, dh) — o drawImage de 9 números
func img(tex: Texture2D, sx: float, sy: float, sw: float, sh: float, dx: float, dy: float, dw: float, dh: float) -> void:
	if tex == null: return
	_alvo.draw_texture_rect_region(tex, Rect2(dx, dy, dw, dh), Rect2(sx, sy, sw, sh), Color(1, 1, 1, alpha))
## imagem inteira em (dx, dy, dw, dh)
func img_todo(tex: Texture2D, dx: float, dy: float, dw := -1.0, dh := -1.0) -> void:
	if tex == null: return
	if dw < 0: dw = tex.get_width()
	if dh < 0: dh = tex.get_height()
	_alvo.draw_texture_rect(tex, Rect2(dx, dy, dw, dh), false, Color(1, 1, 1, alpha))
## imagem com cor por cima (multiplica): para tingir
func img_cor(tex: Texture2D, sx: float, sy: float, sw: float, sh: float, dx: float, dy: float, dw: float, dh: float, cor: Color) -> void:
	if tex == null: return
	_alvo.draw_texture_rect_region(tex, Rect2(dx, dy, dw, dh), Rect2(sx, sy, sw, sh), _c(cor))

## texto (fonte do jogo). al: "c" centro, "l" esquerda, "r" direita. contorno: largura da borda escura (0 = sem)
func text(s: String, x: float, y: float, cor: Color = Color.WHITE, tam := 8.0, al := "c", contorno := 0.0, cor_contorno: Color = Jogo.NAVY, fonte: Font = null) -> void:
	var f: Font = fonte if fonte else Jogo.fonte
	var w: float = f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, int(ceil(tam))).x * tam / ceil(tam)
	var x0: float = x - w / 2.0 if al == "c" else (x - w if al == "r" else x)
	save(); translate_(x0, y); var k: float = tam / ceil(tam); scale_(k, k)
	if contorno > 0.0:
		_alvo.draw_string_outline(f, Vector2.ZERO, s, HORIZONTAL_ALIGNMENT_LEFT, -1, int(ceil(tam)), int(contorno * 2 / k), _c(cor_contorno))
	_alvo.draw_string(f, Vector2.ZERO, s, HORIZONTAL_ALIGNMENT_LEFT, -1, int(ceil(tam)), _c(cor))
	restore()
func text_w(s: String, tam := 8.0, fonte: Font = null) -> float:
	var f: Font = fonte if fonte else Jogo.fonte
	return f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, int(ceil(tam))).x * tam / ceil(tam)

# ---------------------------------------------------------------- utilidades (as mesmas do navegador)
static func rand(a: float, b: float) -> float: return a + randf() * (b - a)
static func pick(a: Array): return a[randi() % a.size()]
static func sgn(v: float) -> float: return 1.0 if v > 0 else (-1.0 if v < 0 else 0.0)
