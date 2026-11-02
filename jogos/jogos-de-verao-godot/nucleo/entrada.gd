extends Node
## Entrada: teclado, controle e toque viram o mesmo pacote "I" que as provas leem a cada passo (como na versão do navegador):
## I.l, I.r, I.u, I.d, I.a, I.b, I.c, I.e = segurando; I.pl, I.pr, I.pu, I.pd, I.pa, I.pb, I.pc, I.pe = apertou agora;
## I.ax = eixo de -1 a 1 (no analógico, proporcional; no teclado, cheio); I.ay, I.rx, I.ry = analógicos.
## Teclas: setas ou WASD; Espaço ou Z = ação (✕); X = ○; C = □; V = △. Controle: direcional ou analógico, ✕ ○ □ △ (ou RT), Start = pausa.

const BOTOES := ["l", "r", "u", "d", "a", "b", "c", "e"]
var I := {}
var _antes := {}
var _trava := {}
## botões da tela (celular/Steam Deck): a interface de toque marca aqui
var toque := {}

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_mapa("l", [KEY_LEFT, KEY_A], [JOY_BUTTON_DPAD_LEFT])
	_mapa("r", [KEY_RIGHT, KEY_D], [JOY_BUTTON_DPAD_RIGHT])
	_mapa("u", [KEY_UP, KEY_W], [JOY_BUTTON_DPAD_UP])
	_mapa("d", [KEY_DOWN, KEY_S], [JOY_BUTTON_DPAD_DOWN])
	_mapa("a", [KEY_SPACE, KEY_Z], [JOY_BUTTON_A])
	_mapa("b", [KEY_X], [JOY_BUTTON_B])
	_mapa("c", [KEY_C], [JOY_BUTTON_X])
	_mapa("e", [KEY_V], [JOY_BUTTON_Y])
	_mapa("pausa", [KEY_ESCAPE, KEY_P], [JOY_BUTTON_START])
	_eixo("l", JOY_AXIS_LEFT_X, -1.0)
	_eixo("r", JOY_AXIS_LEFT_X, 1.0)
	_eixo("u", JOY_AXIS_LEFT_Y, -1.0)
	_eixo("d", JOY_AXIS_LEFT_Y, 1.0)
	_eixo("e", JOY_AXIS_TRIGGER_RIGHT, 1.0)
	# 02/11 (o dono: "nos menus alguns comandos do controle não funcionam"): no Godot, confirmar e voltar nos menus vêm só com
	# Enter/Espaço e Esc. O controle ganha ✕ (A) para confirmar e ○ (B) para voltar.
	_mapa("ui_accept", [], [JOY_BUTTON_A])
	_mapa("ui_cancel", [], [JOY_BUTTON_B])
	for k in BOTOES:
		I[k] = false
		I["p" + k] = false
		_antes[k] = false
	I.ax = 0.0; I.ay = 0.0; I.rx = 0.0; I.ry = 0.0

func _mapa(acao: String, teclas: Array, botoes: Array) -> void:
	if not InputMap.has_action(acao):
		InputMap.add_action(acao, 0.4)
	for t in teclas:
		var ev := InputEventKey.new(); ev.physical_keycode = t; InputMap.action_add_event(acao, ev)
	for b in botoes:
		var ev := InputEventJoypadButton.new(); ev.button_index = b; InputMap.action_add_event(acao, ev)

func _eixo(acao: String, eixo: int, lado: float) -> void:
	var ev := InputEventJoypadMotion.new(); ev.axis = eixo; ev.axis_value = lado; InputMap.action_add_event(acao, ev)

## guarda os toques rápidos (apertou e soltou entre dois passos do jogo)
func _input(ev: InputEvent) -> void:
	for k in BOTOES:
		if ev.is_action_pressed(k, false, true):
			_trava[k] = true

## chamado pela partida a cada passo (60 por segundo)
func ler() -> Dictionary:
	for k in BOTOES:
		var h: bool = Input.is_action_pressed(k) or bool(toque.get(k, false))
		I[k] = h
		I["p" + k] = bool(_trava.get(k, false)) or (h and not _antes[k])
		_antes[k] = h
		_trava[k] = false
	var kx := (1.0 if Input.is_physical_key_pressed(KEY_RIGHT) or Input.is_physical_key_pressed(KEY_D) or toque.get("r", false) else 0.0) - (1.0 if Input.is_physical_key_pressed(KEY_LEFT) or Input.is_physical_key_pressed(KEY_A) or toque.get("l", false) else 0.0)
	var jx := 0.0; var jy := 0.0; var rx := 0.0; var ry := 0.0
	var pads := Input.get_connected_joypads()
	if pads.size() > 0:
		var p: int = pads[0]
		var ax := Input.get_joy_axis(p, JOY_AXIS_LEFT_X)
		var dz := 0.12
		var mag := maxf(0.0, (absf(ax) - dz) / (1.0 - dz))
		jx = signf(ax) * pow(mag, 1.4)
		if Input.is_joy_button_pressed(p, JOY_BUTTON_DPAD_LEFT): jx = -1.0
		if Input.is_joy_button_pressed(p, JOY_BUTTON_DPAD_RIGHT): jx = 1.0
		var ay := Input.get_joy_axis(p, JOY_AXIS_LEFT_Y)
		jy = ay if absf(ay) > 0.2 else 0.0
		rx = Input.get_joy_axis(p, JOY_AXIS_RIGHT_X); ry = Input.get_joy_axis(p, JOY_AXIS_RIGHT_Y)
	I.ax = kx if kx != 0.0 else jx
	I.ay = jy; I.rx = rx; I.ry = ry
	return I

## solta tudo (ao pausar ou trocar de tela)
func solta() -> void:
	for k in BOTOES:
		_antes[k] = true
		_trava[k] = false
		toque[k] = false
