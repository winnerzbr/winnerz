extends Control
## Menu: as 19 provas (as que já passaram para o Godot podem ser jogadas), recordes, medalhas e opções.

static var _abriu := false
var _opcoes: PanelContainer
var _grade: GridContainer

func _ready() -> void:
	theme = Tema.cria()
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var fundo := TextureRect.new(); fundo.set_anchors_preset(Control.PRESET_FULL_RECT)
	fundo.expand_mode = TextureRect.EXPAND_IGNORE_SIZE; fundo.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	fundo.texture = Arte.tex("res://arte/menu/fundo.png")
	add_child(fundo)
	var vel := ColorRect.new(); vel.color = Color(0.02, 0.03, 0.07, 0.55); vel.set_anchors_preset(Control.PRESET_FULL_RECT); add_child(vel)
	var m := MarginContainer.new(); m.set_anchors_preset(Control.PRESET_FULL_RECT)
	for lado in ["left", "right"]: m.add_theme_constant_override("margin_" + lado, 56)
	m.add_theme_constant_override("margin_top", 40); m.add_theme_constant_override("margin_bottom", 32)
	add_child(m)
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 18); m.add_child(v)
	v.add_child(Tema.etiqueta("WinnerZ apresenta", 14))
	v.add_child(Tema.titulo("IAmiguinho: Jogos de Verão", 46))
	var sc := ScrollContainer.new(); sc.size_flags_vertical = Control.SIZE_EXPAND_FILL; sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	v.add_child(sc)
	_grade = GridContainer.new(); _grade.columns = 4; _grade.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_grade.add_theme_constant_override("h_separation", 14); _grade.add_theme_constant_override("v_separation", 14)
	sc.add_child(_grade)
	var primeiro: Button
	for p in Jogo.PROVAS:
		var b := _cartao(p)
		_grade.add_child(b)
		if primeiro == null and Jogo.pronta(p): primeiro = b
	var baixo := HBoxContainer.new(); baixo.add_theme_constant_override("separation", 14); v.add_child(baixo)
	var bo := Button.new(); bo.text = "Opções"; bo.pressed.connect(_abre_opcoes); baixo.add_child(bo)
	if OS.get_name() != "Web":
		var bs := Button.new(); bs.text = "Sair"; bs.pressed.connect(func(): get_tree().quit()); baixo.add_child(bs)
	var esp := Control.new(); esp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; baixo.add_child(esp)
	baixo.add_child(Tema.etiqueta("Teclado: setas e Espaço · Controle: direcional e ✕", 12))
	Musica.toca("menu" if _abriu else "tema")
	_abriu = true
	if primeiro: primeiro.call_deferred("grab_focus")

func _cartao(p: Dictionary) -> Button:
	var b := Button.new(); b.custom_minimum_size = Vector2(270, 112)
	var pronta := Jogo.pronta(p)
	b.disabled = not pronta
	b.text = ""
	var sn := StyleBoxFlat.new(); sn.bg_color = Color(0.04, 0.06, 0.09, 0.82) if pronta else Color(0.04, 0.06, 0.09, 0.5)
	sn.border_color = Color(1, 1, 1, 0.14); sn.set_border_width_all(1); sn.skew = Vector2(-0.12, 0)
	var sf := sn.duplicate(); sf.border_color = Tema.OURO; sf.set_border_width_all(3); sf.bg_color = Color(0.08, 0.1, 0.16, 0.92)
	for e in ["normal", "disabled"]: b.add_theme_stylebox_override(e, sn)
	for e in ["hover", "focus", "pressed"]: b.add_theme_stylebox_override(e, sf)
	var v := VBoxContainer.new(); v.set_anchors_preset(Control.PRESET_FULL_RECT); v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.offset_left = 18; v.offset_top = 12; v.offset_right = -14; v.offset_bottom = -10
	v.add_theme_constant_override("separation", 2)
	b.add_child(v)
	var nome := Tema.rotulo(p.nome.to_upper(), 19, Tema.TEXTO if pronta else Tema.APAGADO, Jogo.fonte_larga)
	nome.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(nome)
	var tag := Tema.etiqueta(p.tag, 11); tag.mouse_filter = Control.MOUSE_FILTER_IGNORE; v.add_child(tag)
	var esp := Control.new(); esp.size_flags_vertical = Control.SIZE_EXPAND_FILL; esp.mouse_filter = Control.MOUSE_FILTER_IGNORE; v.add_child(esp)
	var r := Jogo.recorde(p.id)
	var md := Jogo.medalha(p, r) if r > 0 else ""
	var info := "Ainda não passou para o Godot" if not pronta else ("Recorde %s%s" % [Jogo.nf(r), " · " + md.capitalize() if md != "" else ""] if r > 0 else "Jogar")
	var l := Tema.rotulo(info, 15, (Tema.OURO if md == "ouro" else Tema.TEXTO) if pronta else Tema.APAGADO); l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(l)
	if pronta:
		b.pressed.connect(func():
			Jogo.prova_atual = p
			get_tree().change_scene_to_file("res://cenas/partida.tscn"))
	return b

func _abre_opcoes() -> void:
	if _opcoes: _opcoes.queue_free()
	_opcoes = PanelContainer.new()
	_opcoes.set_anchors_preset(Control.PRESET_CENTER)
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 14); _opcoes.add_child(v)
	v.add_child(Tema.titulo("Opções", 34))
	var primeiro: Control
	for k in [["musica", "Música", 10], ["efeitos", "Efeitos", 7]]:
		var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 16)
		var l := Tema.rotulo(k[1], 20); l.custom_minimum_size.x = 120; h.add_child(l)
		var s := HSlider.new(); s.min_value = 0; s.max_value = k[2]; s.step = 1; s.value = Jogo.opcoes[k[0]]; s.custom_minimum_size.x = 320
		s.value_changed.connect(func(x): Jogo.opcoes[k[0]] = int(x); Jogo.salva_opcoes(); if k[0] == "efeitos": Som.toca("ponto"))
		h.add_child(s); v.add_child(h)
		if primeiro == null: primeiro = s
	var tc := CheckButton.new(); tc.text = "Tela cheia"; tc.button_pressed = Jogo.opcoes.tela_cheia
	tc.toggled.connect(func(x): Jogo.opcoes.tela_cheia = x; Jogo.salva_opcoes())
	v.add_child(tc)
	var f := Button.new(); f.text = "Fechar"; f.pressed.connect(func(): _opcoes.queue_free(); _opcoes = null; _grade.get_child(Jogo.PROVAS.size() - 1).grab_focus()); v.add_child(f)
	add_child(_opcoes)
	_opcoes.position = (get_viewport_rect().size - _opcoes.get_combined_minimum_size()) / 2
	primeiro.call_deferred("grab_focus")
