extends Node
## Som: os efeitos de desenho escolhidos pelo dono (pasta sons/, um arquivo por som; feitos por ferramentas/sons.py).
## Som.toca("pulo") toca um som (nomes com variações, como passo_areia_1, _2..., sorteiam uma);
## Som.laco("motor", "motor_bugue_loop", volume, velocidade) mantém um som contínuo: chame a cada passo; quando parar de chamar
## (pausa, fim da prova, troca de situação), ele some sozinho em 0,15 s.

var volume := 1.0  # 0..1 (o volume dos efeitos nas opções)
const GANHO := 0.85
var _sons := {}       # nome -> AudioStream
var _var := {}        # nome base -> [nomes das variações]
var _livres: Array[AudioStreamPlayer] = []
var _lacos := {}      # id -> {p, nome, visto, alvo}
var _t := 0.0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	var d := DirAccess.open("res://sons")
	if d:
		for f in d.get_files():
			var f2 := f.trim_suffix(".import").trim_suffix(".remap")
			if not f2.ends_with(".wav") or _sons.has(f2.get_basename()):
				continue
			var nome := f2.get_basename()
			var st = load("res://sons/" + f2)
			if st == null:
				continue
			if nome.ends_with("_loop") and st is AudioStreamWAV:
				st.loop_mode = AudioStreamWAV.LOOP_FORWARD
				st.loop_begin = 0
				st.loop_end = int(st.data.size() / 2)  # 16 bits, mono
			_sons[nome] = st
			var m := RegEx.create_from_string("^(.*)_(\\d+)$").search(nome)
			if m and not nome.ends_with("_loop"):
				var base := m.get_string(1)
				if not _var.has(base):
					_var[base] = []
				_var[base].append(nome)
	for i in 24:
		var p := AudioStreamPlayer.new(); add_child(p); _livres.append(p)

func tem(nome: String) -> bool:
	return _sons.has(nome) or _var.has(nome)

func _escolhe(nome: String) -> String:
	if _sons.has(nome):
		return nome
	if _var.has(nome):
		var v: Array = _var[nome]
		return v[randi() % v.size()]
	return ""

func _player() -> AudioStreamPlayer:
	for p in _livres:
		if not p.playing:
			return p
	return _livres[0]

## toca um som. vol: 0..1; rate: velocidade (1 = normal); atraso: segundos antes de tocar. Devolve false se o som não existe.
func toca(nome: String, vol: float = 1.0, rate: float = 1.0, _lado: float = 0.0, atraso: float = 0.0) -> bool:
	var k := _escolhe(nome)
	if k == "" or volume <= 0.0:
		return k != ""
	if atraso > 0.0:
		get_tree().create_timer(atraso, true, false, true).timeout.connect(func(): toca(nome, vol, rate))
		return true
	var p := _player()
	p.stream = _sons[k]
	p.pitch_scale = maxf(0.05, rate * (1.0 + (randf() - 0.5) * 0.06))
	p.volume_db = linear_to_db(maxf(0.0001, vol * GANHO * volume))
	p.play()
	return true

## som contínuo (chamar a cada passo)
func laco(id: String, nome: String, vol: float, rate: float = 1.0) -> void:
	if not _sons.has(nome):
		return
	var L = _lacos.get(id)
	if L == null or L.nome != nome:
		if L != null:
			L.p.stop(); L.p.queue_free()
		var p := AudioStreamPlayer.new(); add_child(p)
		p.stream = _sons[nome]; p.volume_db = -60.0
		p.play(randf() * (_sons[nome].get_length() * 0.9))
		L = {"p": p, "nome": nome, "visto": _t, "vol": 0.0}
		_lacos[id] = L
	L.visto = _t
	L.alvo = maxf(0.0, vol)
	L.p.pitch_scale = clampf(rate, 0.3, 3.0)

func _process(dt: float) -> void:
	_t += dt
	for id in _lacos.keys():
		var L = _lacos[id]
		var alvo: float = L.get("alvo", 0.0) if (_t - L.visto) < 0.15 else 0.0
		L.vol = lerpf(L.vol, alvo, clampf(dt / 0.07, 0.0, 1.0))
		L.p.volume_db = linear_to_db(maxf(0.0001, L.vol * GANHO * volume))
		if _t - L.visto > 0.6:
			L.p.stop(); L.p.queue_free(); _lacos.erase(id)

func para_tudo() -> void:
	for id in _lacos.keys():
		_lacos[id].p.stop(); _lacos[id].p.queue_free()
	_lacos.clear()
	for p in _livres:
		p.stop()
