extends Node
## Música: as faixas gravadas do dono (pasta musica/). Musica.toca("volei") troca de faixa com uma passagem suave;
## Musica.abaixa(0.35) abaixa (na pausa) e Musica.abaixa(1) volta.
## Volume (como na versão do navegador): as faixas tocam a 25% no volume padrão (5 de 10), para não cobrir os efeitos.

const BASE := 0.25
const NOMES := {"tema": "Carnaval na Areia", "menu": "Disco do Caranguejo", "volei": "Forró do Coqueiro", "surfe": "Onda Gigante", "skate": "Skate no Calçadão", "festa": "Soca do Coco", "podio": "Mambo do Pódio",
	"embaixadinha": "Samba da Embaixadinha", "patins": "Rinque Neon", "basquete": "Cesta de Três", "pingue": "Tic-Tac Swing", "bmx": "Manobra Radical",
	"corrida": "Kuduro na Areia", "frisbee": "Disco Voador", "arco": "Na Mosca", "duelo": "Guerra de Água", "canoagem": "Remada Polinésia",
	"futebol": "Gol de Bicicleta", "bocha": "Tarantela da Bocha", "natacao": "Braçada Turbo", "jetski": "Turbo Jet", "bugue": "Bugue Turbo"}

var volume := 0.5:  # 0..1 (o volume da música nas opções)
	set(v):
		volume = v
		_ajusta()
var faixa := ""
var _duck := 1.0
var _a: AudioStreamPlayer
var _b: AudioStreamPlayer

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_a = AudioStreamPlayer.new(); add_child(_a)
	_b = AudioStreamPlayer.new(); add_child(_b)

func _ganho() -> float:
	return BASE * volume * 2.0 * _duck

func _ajusta() -> void:
	if _a and _a.playing:
		_a.volume_db = linear_to_db(maxf(0.0001, _ganho()))

func toca(nome: String) -> void:
	if nome == faixa:
		return
	var st = load("res://musica/%s.mp3" % nome) if ResourceLoader.exists("res://musica/%s.mp3" % nome) else null
	faixa = nome
	# a que estava tocando some em 0,6 s; a nova entra
	var velho := _a
	_a = _b; _b = velho
	if velho.playing:
		var tw := create_tween(); tw.tween_property(velho, "volume_db", -60.0, 0.6); tw.tween_callback(velho.stop)
	if st == null:
		return
	if st is AudioStreamMP3:
		st.loop = true
	_a.stream = st
	_a.volume_db = -40.0
	_a.play()
	var tw2 := create_tween(); tw2.tween_property(_a, "volume_db", linear_to_db(maxf(0.0001, _ganho())), 0.5)

func abaixa(k: float) -> void:
	_duck = k
	_ajusta()

func para() -> void:
	faixa = ""
	_a.stop(); _b.stop()
