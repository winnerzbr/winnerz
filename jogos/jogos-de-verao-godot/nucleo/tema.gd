class_name Tema
## Visual das telas (menu, placar, pausa, resultado): azul-marinho, creme e ouro do jogo; títulos largos em caixa alta;
## botões com o corte inclinado do WinnerZ.

const FUNDO := Color("0b1020")
const PAINEL := Color(0.04, 0.06, 0.09, 0.86)
const LINHA := Color(1, 1, 1, 0.12)
const TEXTO := Color("fff6d6")
const APAGADO := Color(1.0, 0.965, 0.84, 0.6)
const OURO := Color("ffd166")
const AZUL := Color("5b9bff")
const AGORA := Color("ffb22e")

static func botao(cor: Color, borda: Color = Color(0, 0, 0, 0)) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = cor
	s.skew = Vector2(-0.18, 0)
	s.content_margin_left = 22; s.content_margin_right = 22; s.content_margin_top = 10; s.content_margin_bottom = 10
	if borda.a > 0:
		s.border_color = borda; s.set_border_width_all(2)
	return s

static func painel(cor: Color = PAINEL) -> StyleBoxFlat:
	var s := StyleBoxFlat.new(); s.bg_color = cor
	s.content_margin_left = 24; s.content_margin_right = 24; s.content_margin_top = 18; s.content_margin_bottom = 18
	s.border_color = LINHA; s.border_width_bottom = 1; s.border_width_top = 1; s.border_width_left = 1; s.border_width_right = 1
	return s

static func cria() -> Theme:
	var t := Theme.new()
	t.default_font = Jogo.fonte
	t.default_font_size = 22
	t.set_color("font_color", "Label", TEXTO)
	for estado in ["normal", "hover", "pressed", "focus", "disabled"]:
		var cor := Color("fff6d6") if estado == "normal" else (OURO if estado in ["hover", "focus", "pressed"] else Color(1, 1, 1, 0.12))
		t.set_stylebox(estado, "Button", botao(cor))
	t.set_color("font_color", "Button", Color("0a1016"))
	t.set_color("font_hover_color", "Button", Color("0a1016"))
	t.set_color("font_focus_color", "Button", Color("0a1016"))
	t.set_color("font_pressed_color", "Button", Color("0a1016"))
	t.set_color("font_disabled_color", "Button", APAGADO)
	t.set_font("font", "Button", Jogo.fonte_larga)
	t.set_font_size("font_size", "Button", 20)
	t.set_stylebox("panel", "PanelContainer", painel())
	return t

## rótulo pronto
static func rotulo(txt: String, tam := 22, cor: Color = TEXTO, fonte: Font = null) -> Label:
	var l := Label.new(); l.text = txt
	l.add_theme_font_size_override("font_size", tam)
	l.add_theme_color_override("font_color", cor)
	if fonte: l.add_theme_font_override("font", fonte)
	return l

static func titulo(txt: String, tam := 44) -> Label:
	var l := rotulo(txt.to_upper(), tam, TEXTO, Jogo.fonte_larga)
	l.add_theme_color_override("font_outline_color", Color("0a1016")); l.add_theme_constant_override("outline_size", 10)
	return l

static func etiqueta(txt: String, tam := 13, cor: Color = APAGADO) -> Label:
	var l := rotulo(txt.to_upper(), tam, cor, Jogo.fonte_mono)
	return l
