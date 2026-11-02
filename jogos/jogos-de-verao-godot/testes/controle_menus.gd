extends Node
## Teste do controle nos menus (02/11, relato do dono): só com os botões do controle (direcional, ✕, ○, Start), sem mouse.
## Desce até o vôlei, abre, ○ volta ao menu, abre de novo, ✕ joga, Start pausa e Start volta, ○ na pausa continua,
## e as opções abrem e fecham com ○. Confere a cada passo onde o foco está.
var corredor := false
func _joy(botao: int) -> void:
	var e := InputEventJoypadButton.new(); e.button_index = botao; e.pressed = true; e.device = 0; Input.parse_input_event(e)
	await get_tree().process_frame; await get_tree().process_frame
	var s := InputEventJoypadButton.new(); s.button_index = botao; s.pressed = false; s.device = 0; Input.parse_input_event(s)
	await get_tree().process_frame; await get_tree().process_frame
func _foco() -> String:
	var f := get_viewport().gui_get_focus_owner()
	if f == null: return "(nada)"
	if f is Button and f.text != "": return f.text
	var l := f.find_children("*", "Label", true, false)
	return l[0].text if l.size() > 0 else f.get_class()
func _cena() -> String: return get_tree().current_scene.name if get_tree().current_scene else "?"
func _ready() -> void:
	if not corredor:
		var r = get_script().new(); r.corredor = true; get_tree().root.call_deferred("add_child", r); return
	get_tree().change_scene_to_file("res://cenas/menu.tscn")
	await get_tree().create_timer(0.8).timeout
	print("menu, foco: ", _foco())
	for i in 4: await _joy(JOY_BUTTON_DPAD_DOWN)
	await get_tree().create_timer(0.3).timeout
	var vg := get_tree().current_scene.find_children("*", "ScrollContainer", true, false)[0]
	print("desceu 4x, foco: ", _foco(), " · rolagem: ", vg.scroll_vertical)
	for i in 3: await _joy(JOY_BUTTON_DPAD_RIGHT)
	print("direita 3x, foco: ", _foco())
	await _joy(JOY_BUTTON_A); await get_tree().create_timer(0.8).timeout
	print("✕ → cena: ", _cena(), " · foco: ", _foco())
	await _joy(JOY_BUTTON_B); await get_tree().create_timer(0.8).timeout
	print("○ na explicação → cena: ", _cena(), " · foco: ", _foco())
	Jogo.prova_atual = Jogo.prova("volei"); get_tree().change_scene_to_file("res://cenas/partida.tscn"); await get_tree().create_timer(0.8).timeout
	await _joy(JOY_BUTTON_A); await get_tree().create_timer(0.5).timeout
	var pt = get_tree().current_scene
	print("✕ Jogar → modo: ", pt.modo, " (1 = jogando)")
	await _joy(JOY_BUTTON_START); await get_tree().create_timer(0.3).timeout
	print("Start → modo: ", pt.modo, " (2 = pausa) · foco: ", _foco())
	await _joy(JOY_BUTTON_START); await get_tree().create_timer(0.3).timeout
	print("Start de novo → modo: ", pt.modo, " (1 = jogando)")
	await _joy(JOY_BUTTON_START); await get_tree().create_timer(0.3).timeout
	await _joy(JOY_BUTTON_B); await get_tree().create_timer(0.3).timeout
	print("pausa + ○ → modo: ", pt.modo, " (1 = jogando)")
	await _joy(JOY_BUTTON_START); await get_tree().create_timer(0.3).timeout
	await _joy(JOY_BUTTON_DPAD_RIGHT); await _joy(JOY_BUTTON_DPAD_RIGHT)
	print("pausa, direita 2x, foco: ", _foco())
	await _joy(JOY_BUTTON_A); await get_tree().create_timer(0.8).timeout
	print("✕ em Menu → cena: ", _cena(), " · foco: ", _foco())
	# opções: desce até o botão Opções
	for i in 6: await _joy(JOY_BUTTON_DPAD_DOWN)
	await _joy(JOY_BUTTON_DPAD_LEFT)
	print("desceu e foi para a esquerda até: ", _foco())
	await _joy(JOY_BUTTON_A); await get_tree().create_timer(0.3).timeout
	print("opções abertas, foco: ", _foco())
	await _joy(JOY_BUTTON_DPAD_RIGHT)
	print("música depois de → : ", Jogo.opcoes.musica)
	await _joy(JOY_BUTTON_B); await get_tree().create_timer(0.3).timeout
	print("○ fecha opções, foco: ", _foco())
	get_tree().quit()
