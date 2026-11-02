extends Node
## Teste automático da base: fotos do menu, da explicação, do jogo, da pausa e do resultado (pasta testes/fotos/).
const PASTA := "res://testes/fotos/"
func _foto(nome: String) -> void:
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(ProjectSettings.globalize_path(PASTA + nome + ".png"))
	print("foto ", nome)
func _espera(s: float) -> void: await get_tree().create_timer(s).timeout
func _aperta(acao: String) -> void:
	var e := InputEventAction.new(); e.action = acao; e.pressed = true; Input.parse_input_event(e)
	await get_tree().process_frame; await get_tree().process_frame
	var s := InputEventAction.new(); s.action = acao; s.pressed = false; Input.parse_input_event(s)
var corredor := false
func _ready() -> void:
	# a cena de teste some quando o menu entra: o teste roda num nó preso à raiz
	if not corredor:
		var r = get_script().new(); r.corredor = true; get_tree().root.call_deferred("add_child", r); return
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(PASTA))
	get_tree().change_scene_to_file("res://cenas/menu.tscn")
	await _espera(1.0); await _foto("1_menu")
	Jogo.prova_atual = {"id": "teste", "nome": "Prova de teste", "tag": "Base · 3 segundos", "med": [100, 300, 500], "musica": "volei", "cena": "res://testes/prova_teste.tscn"}
	get_tree().change_scene_to_file("res://cenas/partida.tscn")
	await _espera(0.8); await _foto("2_explicacao")
	await _aperta("ui_accept"); await _espera(1.15)
	await _aperta("a"); await _espera(0.1); await _foto("3_jogo")
	await _aperta("pausa"); await _espera(0.3); await _foto("4_pausa")
	await _aperta("ui_accept"); await _espera(0.3)
	Jogo.diz("Teste da fala do IAmiguinho: o balão aparece aqui embaixo.")
	await _espera(3.0); await _foto("5_resultado")
	get_tree().quit()
