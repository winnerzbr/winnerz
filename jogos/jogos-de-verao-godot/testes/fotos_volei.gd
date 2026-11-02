extends Node
## Teste automático do vôlei com a tela: abre a partida de verdade (a mesma do menu), joga com um piloto automático
## no lugar do jogador (o cérebro antigo, ficha "forte") e tira fotos: explicação, saque, rali, cortada, ponto e o fim.
## O piloto aperta os mesmos botões que uma pessoa (pelos botões de toque da Entrada).
## Para não esperar uma partida inteira, depois da foto do ponto o placar pula para perto do fim (6 a x).
## Rodar: xvfb-run -a -s "-screen 0 1280x720x24" godot --path . --rendering-driver opengl3 --resolution 1280x720 res://testes/fotos_volei.tscn

const F = preload("res://provas/volei/fisica.gd")
const CE = preload("res://provas/volei/cerebro.gd")
const PASTA := "res://testes/fotos/"
const FORTE := {"react": 0.08, "err": 2.0, "spd": 1.05, "fwd": 0.6, "block": 0.5, "slip": 0.008, "iq": 1.0, "dive": 0.7, "spike": 0.6, "set": 0.3, "read": 0.5}

var corredor := false
var piloto := false
var A := {"t": 0.0, "tx": 70.0}
var segura_saque := 0
var ja_tirou := {}

func _foto(nome: String) -> void:
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(ProjectSettings.globalize_path(PASTA + nome + ".png"))
	print("foto ", nome)

func _espera(s: float) -> void: await get_tree().create_timer(s, true, false, true).timeout

func _aperta(acao: String) -> void:
	var e := InputEventAction.new(); e.action = acao; e.pressed = true; Input.parse_input_event(e)
	await get_tree().process_frame; await get_tree().process_frame
	var s := InputEventAction.new(); s.action = acao; s.pressed = false; Input.parse_input_event(s)

func _prova():
	var cena = get_tree().current_scene
	return cena.prova if cena and "prova" in cena else null

## espera até a condição valer (ou o tempo acabar)
func _ate(cond: Callable, max_s: float) -> bool:
	var t0 := Time.get_ticks_msec()
	while Time.get_ticks_msec() - t0 < max_s * 1000.0:
		var v = _prova()
		if v != null and v.b != null and cond.call(v): return true
		await get_tree().process_frame
	return false

func _ready() -> void:
	# a cena de teste some quando a partida entra: o teste roda num nó preso à raiz
	if not corredor:
		var r = get_script().new(); r.corredor = true; get_tree().root.call_deferred("add_child", r); return
	process_physics_priority = -10  # o piloto aperta os botões antes da partida ler a entrada
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(PASTA))
	Jogo.prova_atual = Jogo.prova("volei")
	get_tree().change_scene_to_file("res://cenas/partida.tscn")
	await _espera(1.2); await _foto("volei_1_explicacao")
	await _aperta("ui_accept"); await _espera(0.6)
	await _foto("volei_2_saque")
	piloto = true
	Engine.time_scale = 2.0
	if await _ate(func(v): return v.state == "rally" and v.hits >= 2 and v.b.y < 150.0, 60.0):
		await _foto("volei_3_rali")
	if await _ate(func(v): return v.state == "rally" and ((v.P[1].sw != null and v.P[1].sw.t > 0.06) or (v.P[0].sw != null and v.P[0].sw.t > 0.06 and not v.P[0].g)), 240.0):
		await _foto("volei_4_cortada")
	if await _ate(func(v): return v.state == "point" and v.st > 0.35, 120.0):
		await _foto("volei_5_ponto")
	var v = _prova()
	if v:
		v.sc = [6, mini(v.sc[1], 5)]
	if await _ate(func(v2): return get_tree().current_scene.modo == 3, 240.0):  # 3 = FIM (a tela do resultado)
		piloto = false
		Engine.time_scale = 1.0
		await _espera(1.5); await _foto("volei_6_fim")
	Engine.time_scale = 1.0
	get_tree().quit()

## o piloto: o cérebro antigo decide e os botões de toque fazem o resto
func _physics_process(_d: float) -> void:
	if not piloto: return
	var v = _prova()
	var T: Dictionary = Entrada.toque
	for k in ["l", "r", "a", "b", "c", "e"]: T[k] = false
	if v == null or v.b == null or get_tree().current_scene.modo != 1: return
	# saque: segura o C um pouco e solta
	if v.state == "serve" and v.held and v.server == 0:
		segura_saque += 1
		T.c = segura_saque > 20 and segura_saque < 45
		return
	segura_saque = 0
	var c := CE.cerebro_antigo(v, 0, F.DT, A, FORTE)
	T.r = c.ax > 0.3; T.l = c.ax < -0.3
	T.a = c.u; T.b = c.d; T.c = c.sp
