extends Control
## Partida: a tela onde uma prova acontece. Mostra a explicação antes, roda a prova 60 vezes por segundo, desenha o placar de cima,
## os avisos que sobem, a faixa do meio, a fala do IAmiguinho, a pausa e o resultado com a medalha.

const DT := 1.0 / 60.0
enum { INTRO, JOGANDO, PAUSA, FIM }
var modo := INTRO
var prova: Prova
var p: Dictionary          # a prova em Jogo.PROVAS
var shake := 0.0
var _acc := 0.0

var palco: Node2D          # onde a prova é desenhada (ampliada para caber na janela)
var sobre: Node2D          # avisos por cima da prova, na mesma escala
var pops: Array = []
var faixa = null           # {s, c, t, d}

var _hud_rot: Array[Label] = []
var _hud_val: Array[Label] = []
var _hud_nome: Label
var _barra: PanelContainer
var _fala: PanelContainer
var _fala_txt: Label
var _fala_t := 0.0
var _tela: Control         # explicação, pausa ou resultado

func _ready() -> void:
	theme = Tema.cria()
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var fundo := ColorRect.new(); fundo.color = Color("070a12"); fundo.set_anchors_preset(Control.PRESET_FULL_RECT); add_child(fundo)
	palco = Node2D.new(); add_child(palco)
	p = Jogo.prova_atual if not Jogo.prova_atual.is_empty() else Jogo.prova("volei")
	var cena: PackedScene = load(p.cena)
	prova = cena.instantiate()
	prova.partida = self
	palco.add_child(prova)
	sobre = Node2D.new(); sobre.set_script(load("res://cenas/sobre.gd")); sobre.partida = self; palco.add_child(sobre)
	_monta_hud()
	_monta_fala()
	Jogo.fala.connect(_mostra_fala)
	resized.connect(_encaixa)
	_encaixa()
	Musica.toca(p.musica)
	prova.iniciar()
	_mostra_intro()

## a prova ocupa o máximo da janela sem cortar (barras pretas se a proporção for outra)
func _encaixa() -> void:
	var sz := get_viewport_rect().size
	var k := minf(sz.x / prova.W, sz.y / prova.H)
	palco.scale = Vector2(k, k)
	palco.position = ((sz - Vector2(prova.W, prova.H) * k) / 2.0).floor()

# ---------------------------------------------------------------- laço
func _physics_process(_d: float) -> void:
	if modo != JOGANDO:
		return
	if Input.is_action_just_pressed("pausa"):
		_pausa(); return
	var I := Entrada.ler()
	prova.t += DT
	for q in pops: q.t += DT
	pops = pops.filter(func(q): return q.t < 1.0)
	if faixa != null:
		faixa.t += DT
		if faixa.t > faixa.d: faixa = null
	if prova.passo(DT, I):
		_fim()

func _process(dt: float) -> void:
	prova.tt = prova.t if modo in [JOGANDO, PAUSA] else prova.tt + dt
	if shake > 0.0:
		palco.position += Vector2(randf_range(-3, 3), randf_range(-3, 3)) * shake * 5.0 * palco.scale.x / 3.2
		shake -= dt
		if shake <= 0.0: _encaixa()
	prova.redesenha()
	sobre.queue_redraw()
	_barra.visible = not (prova.placar_proprio() and modo in [JOGANDO, PAUSA])
	if modo != INTRO: _atualiza_hud()
	if _fala_t > 0.0:
		_fala_t -= dt
		_fala.modulate.a = clampf(_fala_t * 2.0, 0.0, 1.0)
		_fala.visible = _fala_t > 0.0
	if modo == PAUSA and Input.is_action_just_pressed("pausa"):
		_continua()

# ---------------------------------------------------------------- avisos
func pop(s: String, x: float, y: float, cor: Color = Color.WHITE, grande := false) -> void:
	pops.append({"s": s, "x": x, "y": y, "c": cor, "big": grande, "t": 0.0})

func banner(s: String, cor: Color = Color.WHITE, d := 1.4) -> void:
	faixa = {"s": s, "c": cor, "t": 0.0, "d": d}

# ---------------------------------------------------------------- placar de cima
func _monta_hud() -> void:
	var barra := PanelContainer.new()
	_barra = barra
	var sb := StyleBoxFlat.new(); sb.bg_color = Color(0.03, 0.04, 0.07, 0.82); sb.content_margin_left = 18; sb.content_margin_right = 18; sb.content_margin_top = 6; sb.content_margin_bottom = 8
	barra.add_theme_stylebox_override("panel", sb)
	barra.set_anchors_preset(Control.PRESET_TOP_WIDE)
	add_child(barra)
	var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 26); barra.add_child(h)
	_hud_nome = Tema.rotulo(p.nome.to_upper(), 20, Tema.TEXTO, Jogo.fonte_larga)
	_hud_nome.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_hud_nome.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	h.add_child(_hud_nome)
	for i in 4:
		var v := VBoxContainer.new(); v.add_theme_constant_override("separation", -2); v.custom_minimum_size.x = 120
		var r := Tema.etiqueta("", 11); var val := Tema.rotulo("", 22, Tema.TEXTO, Jogo.fonte_larga)
		v.add_child(r); v.add_child(val); h.add_child(v)
		_hud_rot.append(r); _hud_val.append(val)

func _atualiza_hud() -> void:
	var hh: Array = prova.hud()
	for i in 4:
		var c: Array = hh[i] if i < hh.size() else ["", "", false]
		_hud_rot[i].text = str(c[0]).to_upper()
		_hud_val[i].text = str(c[1])
		_hud_val[i].add_theme_color_override("font_color", Tema.AGORA if (c.size() > 2 and c[2] and modo == JOGANDO) else Tema.TEXTO)

# ---------------------------------------------------------------- fala do IAmiguinho
func _monta_fala() -> void:
	_fala = PanelContainer.new()
	var sb := StyleBoxFlat.new(); sb.bg_color = Color("fff6d6"); sb.set_corner_radius_all(6); sb.content_margin_left = 16; sb.content_margin_right = 16; sb.content_margin_top = 10; sb.content_margin_bottom = 12
	_fala.add_theme_stylebox_override("panel", sb)
	_fala.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	_fala.position = Vector2(24, get_viewport_rect().size.y - 130)
	_fala.custom_minimum_size = Vector2(0, 0)
	var v := VBoxContainer.new(); _fala.add_child(v)
	v.add_child(Tema.etiqueta("IAmiguinho", 11, Color("1d63d8")))
	_fala_txt = Tema.rotulo("", 19, Color("0a1016"))
	_fala_txt.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_fala_txt.custom_minimum_size.x = 440
	v.add_child(_fala_txt)
	_fala.visible = false
	add_child(_fala)

func _mostra_fala(t: String) -> void:
	_fala_txt.text = t
	_fala.reset_size()
	_fala.position = Vector2(24, get_viewport_rect().size.y - _fala.size.y - 24)
	_fala.visible = true
	_fala_t = 5.5

# ---------------------------------------------------------------- telas: explicação, pausa, resultado
func _abre_tela(titulo: String, sub: String, corpo: Array, botoes: Array) -> void:
	if _tela: _tela.queue_free()
	_tela = CenterContainer.new(); _tela.set_anchors_preset(Control.PRESET_FULL_RECT)
	var vel := ColorRect.new(); vel.color = Color(0.02, 0.03, 0.06, 0.55); vel.set_anchors_preset(Control.PRESET_FULL_RECT); vel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var raiz := Control.new(); raiz.set_anchors_preset(Control.PRESET_FULL_RECT); raiz.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(raiz); raiz.add_child(vel)
	var pc := PanelContainer.new(); pc.custom_minimum_size.x = 640
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 12); pc.add_child(v)
	if sub != "": v.add_child(Tema.etiqueta(sub, 13))
	v.add_child(Tema.titulo(titulo, 40))
	for c in corpo: v.add_child(c)
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 14); v.add_child(hb)
	var primeiro: Button
	for b in botoes:
		var bt := Button.new(); bt.text = b[0]; bt.pressed.connect(b[1]); hb.add_child(bt)
		if primeiro == null: primeiro = bt
	_tela.add_child(pc); raiz.add_child(_tela)
	_tela.set_meta("raiz", raiz)
	_tela = raiz
	if primeiro: primeiro.call_deferred("grab_focus")

func _fecha_tela() -> void:
	if _tela: _tela.queue_free(); _tela = null

func _texto(t: String, tam := 20, cor: Color = Tema.TEXTO) -> Label:
	var l := Tema.rotulo(t, tam, cor); l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; l.custom_minimum_size.x = 580; return l

func _medalhas_txt() -> String:
	var m: Array = p.med
	if p.has("med_txt"):
		return "Bronze: %s · Prata: %s · Ouro: %s" % p.med_txt
	return "Bronze %s · Prata %s · Ouro %s" % [Jogo.nf(m[0]), Jogo.nf(m[1]), Jogo.nf(m[2])]

func _mostra_intro() -> void:
	modo = INTRO
	var corpo := [_texto(prova.explicacao()), _texto(_medalhas_txt(), 17, Tema.APAGADO)]
	var r := Jogo.recorde(p.id)
	if r > 0: corpo.append(_texto("Seu recorde: " + Jogo.nf(r), 17, Tema.OURO))
	_abre_tela(p.nome, p.tag, corpo, [["Jogar", _comeca], ["Menu", _menu]])

func _comeca() -> void:
	_fecha_tela()
	Entrada.solta()
	if modo != INTRO:
		prova.iniciar()
	pops.clear(); faixa = null
	prova.t = 0.0
	modo = JOGANDO
	Musica.abaixa(1.0)
	_toca_geral("start")

func _pausa() -> void:
	modo = PAUSA
	Musica.abaixa(0.35)
	Som.para_tudo()
	_abre_tela("Pausa", p.nome, [], [["Continuar", _continua], ["Recomeçar", _recomeca], ["Menu", _menu]])

func _continua() -> void:
	_fecha_tela(); Entrada.solta(); modo = JOGANDO; Musica.abaixa(1.0)

func _recomeca() -> void:
	modo = FIM
	_comeca()

func _fim() -> void:
	modo = FIM
	Som.para_tudo()
	var s := prova.pontos
	var m := Jogo.medalha(p, s)
	var rec := Jogo.registra(p.id, s)
	Jogo.resultado = {"id": p.id, "pontos": s, "medalha": m, "recorde": rec}
	Musica.abaixa(0.5)
	_toca_geral("win" if m != "" else "over")
	var titulo := "Você levou o ouro" if m == "ouro" else ("Medalha de " + m if m != "" else "Sem medalha")
	var corpo := []
	var placar := prova.placar_txt()
	corpo.append(Tema.titulo(placar if placar != "" else Jogo.nf(s), 64))
	corpo.append(_texto(("%s pontos · " % Jogo.nf(s) if placar != "" else "") + ("Recorde pessoal" if rec else "Seu recorde: " + Jogo.nf(Jogo.recorde(p.id))), 18, Tema.OURO if rec else Tema.APAGADO))
	var falta := _falta_txt(s, m)
	if falta != "": corpo.append(_texto(falta, 17, Tema.APAGADO))
	var est := HFlowContainer.new(); est.add_theme_constant_override("h_separation", 8); est.add_theme_constant_override("v_separation", 8)
	for e in prova.estatisticas():
		var c := PanelContainer.new(); var sb := StyleBoxFlat.new(); sb.bg_color = Color(1, 1, 1, 0.08); sb.content_margin_left = 10; sb.content_margin_right = 10; sb.content_margin_top = 4; sb.content_margin_bottom = 4
		c.add_theme_stylebox_override("panel", sb); c.add_child(Tema.rotulo(str(e), 15)); est.add_child(c)
	corpo.append(est)
	_abre_tela(titulo, "Fim · " + p.nome, corpo, [["Jogar de novo", _recomeca], ["Menu", _menu]])

func _falta_txt(s: int, m: String) -> String:
	if m == "ouro": return "Ouro é o teto. Agora é bater o seu recorde."
	var nxt := 2 if m == "prata" else (1 if m == "bronze" else 0)
	if p.has("med_txt"): return "Para %s: %s." % [["o bronze", "a prata", "o ouro"][nxt], p.med_txt[nxt]]
	return "Faltaram %s pontos para %s." % [Jogo.nf(p.med[nxt] - s), ["o bronze", "a prata", "o ouro"][nxt]]

func _menu() -> void:
	Som.para_tudo()
	get_tree().change_scene_to_file("res://cenas/menu.tscn")

## sons de todas as provas: largada, vitória, derrota (a prova toca os seus)
func _toca_geral(k: String) -> void:
	var nome: String = {"start": "contagem_vai", "win": "vitoria", "over": "wah_wah"}.get(k, "")
	if nome != "": Som.toca(nome)
