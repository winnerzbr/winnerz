extends Node
## Jogo: o que vale para o jogo inteiro (lista das provas, recordes, opções, fontes e a fala do IAmiguinho).
## Os números de cada prova (medalhas, nome, faixa de música) ficam aqui em PROVAS; mexa à vontade no editor.

const PASTA_SALVO := "user://"
const ARQ_RECORDES := "user://recordes.cfg"
const ARQ_OPCOES := "user://opcoes.cfg"

## Cores do jogo (as mesmas da versão do navegador)
const NAVY := Color("0a1016")
const CREME := Color("fff6d6")
const OURO := Color("ffd166")
const AZUL_CLARO := Color("bfefff")
const ROSA_CLARO := Color("ffb3c8")

## As 19 provas, na ordem do menu. "cena" vazia = ainda não passou para o Godot.
## med: pontos para bronze, prata e ouro. med_txt: quando a medalha não é por pontos (o texto de cada uma).
var PROVAS := [
	{"id": "surfe", "nome": "Surfe", "tag": "Onda · 50 segundos", "med": [1800, 3300, 5200], "ia": 900, "nota": "a prancha veio sem parafina", "musica": "surfe", "cena": ""},
	{"id": "halfpipe", "nome": "Half-pipe", "tag": "Skate · 1 min 30 s", "med": [2000, 5500, 10000], "ia": 900, "nota": "o shape tava empenado", "musica": "skate", "cena": ""},
	{"id": "embaixadinha", "nome": "Embaixadinha", "tag": "Areia · 3 bolas", "med": [3000, 8000, 20000], "ia": 900, "nota": "a bola tava murcha", "musica": "embaixadinha", "cena": ""},
	{"id": "patins", "nome": "Patins", "tag": "Calçadão · 60 segundos", "med": [3500, 6500, 10000], "ia": 1500, "nota": "o patins veio com rodinha quadrada", "musica": "patins", "cena": ""},
	{"id": "basquete", "nome": "Basquete", "tag": "Quadra da orla · 60 segundos", "med": [2400, 5000, 8200], "ia": 2200, "nota": "a bola era de vôlei pintada de laranja", "musica": "basquete", "cena": ""},
	{"id": "pingue", "nome": "Pingue-pongue", "tag": "Quiosque do Coqueiral · até 11", "med": [800, 1500, 2000], "med_txt": ["fazer 8 pontos", "vencer", "vencer por 5 ou mais"], "ia": 1700, "nota": "a bolinha caiu no copo de açaí", "musica": "pingue", "cena": ""},
	{"id": "bmx", "nome": "BMX", "tag": "Pista · 60 segundos", "med": [10000, 20000, 30000], "ia": 7000, "nota": "a bike era de rodinha", "musica": "bmx", "cena": ""},
	{"id": "obstaculos", "nome": "Corrida na areia", "tag": "Areia · 3 baterias", "med": [5400, 7000, 8400], "ia": 4800, "nota": "a areia tava mais fofa do meu lado", "musica": "corrida", "cena": ""},
	{"id": "frisbee", "nome": "Frisbee", "tag": "Alvos · 10 lançamentos", "med": [3800, 5600, 7200], "ia": 2800, "nota": "o disco era um prato de festa", "musica": "frisbee", "cena": ""},
	{"id": "arco", "nome": "Tiro com arco", "tag": "Alvos · 10 flechas", "med": [6500, 8500, 10300], "ia": 4500, "nota": "a flecha era um palito de picolé", "musica": "arco", "cena": ""},
	{"id": "duelo", "nome": "Duelo de água", "tag": "Arena · 60 segundos", "med": [2400, 3800, 5400], "ia": 1900, "nota": "a pistola era de bolha de sabão", "musica": "duelo", "cena": ""},
	{"id": "canoagem", "nome": "Canoagem", "tag": "Rio · 60 segundos", "med": [2600, 4600, 6500], "ia": 2000, "nota": "o remo era uma colher de pau grande", "musica": "canoagem", "cena": ""},
	{"id": "teco", "nome": "Teco-teco d'Água", "tag": "Céu da Costa WinnerZ · 2 minutos", "med": [1600, 2200, 3000], "med_txt": ["ficar em 3º", "ficar em 2º", "vencer"], "ia": 2200, "nota": "molhou o próprio boné no rasante", "musica": "jetski", "cena": ""},
	{"id": "futebol", "nome": "Futebol de areia", "tag": "1 contra 1 · 2 minutos", "med": [2500, 5000, 8000], "ia": 2200, "nota": "a trave era mais larga do lado do Amiguinho", "musica": "futebol", "cena": ""},
	{"id": "bocha", "nome": "Bocha na areia", "tag": "Vila dos Pescadores · até 7", "med": [400, 1500, 1900], "med_txt": ["fazer 4 pontos", "vencer", "vencer por 4 ou mais"], "ia": 1800, "nota": "a bola caiu dentro da jangada", "musica": "bocha", "cena": ""},
	{"id": "natacao", "nome": "Natação", "tag": "Mar · 50 metros", "med": [4000, 5400, 6300], "ia": 3200, "nota": "a touca não cabia por causa da hélice", "musica": "natacao", "cena": ""},
	{"id": "jetski", "nome": "Jet ski", "tag": "Boias · 3 voltas", "med": [4000, 6000, 8200], "ia": 3000, "nota": "o jet ski era um banquinho com motor de liquidificador", "musica": "jetski", "cena": ""},
	{"id": "bugue", "nome": "Corrida de bugue", "tag": "Dunas Brancas · 3 voltas", "med": [1600, 2200, 3000], "med_txt": ["chegar em 3º", "chegar em 2º", "vencer"], "ia": 2200, "nota": "chegou em 2º, mas com estilo", "musica": "bugue", "cena": ""},
	{"id": "volei", "nome": "Vôlei de praia", "tag": "Areia · quem fizer 7 vence", "med": [1000, 2120, 2480], "med_txt": ["perder por 2 ou menos", "vencer", "vencer por 4 ou mais"], "ia": 200, "nota": "a rede estava alta demais", "musica": "volei", "cena": "res://provas/volei/volei.tscn"},
]

## opções (0 a 10)
var opcoes := {"musica": 5, "efeitos": 7, "tela_cheia": false}
var recordes := {}
## a prova escolhida (um item de PROVAS) e o resultado da última partida
var prova_atual: Dictionary = {}
var resultado: Dictionary = {}

var fonte: Font
var fonte_larga: Font
var fonte_mono: Font

signal fala(texto: String)

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	fonte = _carrega_fonte("res://fontes/Archivo.ttf", 100, 700)
	fonte_larga = _carrega_fonte("res://fontes/Archivo.ttf", 125, 900)
	fonte_mono = _carrega_fonte("res://fontes/IBMPlexMono-Bold.ttf", -1, -1)
	_le_opcoes()
	_le_recordes()
	call_deferred("_aplica_opcoes")  # depois que o Som e a Música já existem

## fonte nítida em qualquer tamanho (MSDF): o jogo desenha em tamanho pequeno e a tela amplia
func _carrega_fonte(caminho: String, largura: int, peso: int) -> Font:
	var f := FontFile.new()
	f.load_dynamic_font(caminho)
	f.multichannel_signed_distance_field = true
	f.msdf_pixel_range = 14
	f.msdf_size = 64
	if largura < 0:
		return f
	var v := FontVariation.new()
	v.base_font = f
	v.variation_opentype = {TextServerManager.get_primary_interface().name_to_tag("wdth"): largura, TextServerManager.get_primary_interface().name_to_tag("wght"): peso}
	return v

func prova(id: String) -> Dictionary:
	for p in PROVAS:
		if p.id == id:
			return p
	return {}

func pronta(p: Dictionary) -> bool:
	return p.get("cena", "") != ""

func medalha(p: Dictionary, pontos: int) -> String:
	var m: Array = p.get("med", [])
	if m.size() < 3:
		return ""
	if pontos >= m[2]:
		return "ouro"
	if pontos >= m[1]:
		return "prata"
	if pontos >= m[0]:
		return "bronze"
	return ""

func recorde(id: String) -> int:
	return int(recordes.get(id, 0))

## guarda o recorde; devolve true se foi recorde novo
func registra(id: String, pontos: int) -> bool:
	if pontos > recorde(id):
		recordes[id] = pontos
		var c := ConfigFile.new()
		for k in recordes:
			c.set_value("recordes", k, recordes[k])
		c.save(ARQ_RECORDES)
		return true
	return false

func _le_recordes() -> void:
	var c := ConfigFile.new()
	if c.load(ARQ_RECORDES) == OK and c.has_section("recordes"):
		for k in c.get_section_keys("recordes"):
			recordes[k] = int(c.get_value("recordes", k, 0))

func _le_opcoes() -> void:
	var c := ConfigFile.new()
	if c.load(ARQ_OPCOES) == OK:
		for k in opcoes:
			opcoes[k] = c.get_value("opcoes", k, opcoes[k])

func salva_opcoes() -> void:
	var c := ConfigFile.new()
	for k in opcoes:
		c.set_value("opcoes", k, opcoes[k])
	c.save(ARQ_OPCOES)
	_aplica_opcoes()

func _aplica_opcoes() -> void:
	Musica.volume = float(opcoes.musica) / 10.0
	Som.volume = float(opcoes.efeitos) / 7.0
	if DisplayServer.get_name() != "headless":
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN if opcoes.tela_cheia else DisplayServer.WINDOW_MODE_WINDOWED)

## o IAmiguinho comenta (balão no canto da tela). prob: chance de falar; espera 6 s entre uma fala e outra
var _fala_espera := 0.0
func falar(linhas, prob: float = 1.0) -> void:
	if _fala_espera > 0.0 or randf() > prob:
		return
	var t: String = linhas if linhas is String else str(linhas[randi() % linhas.size()])
	_fala_espera = 6.0
	fala.emit(t)

func diz(t: String) -> void:  # fala sempre (sem a espera)
	_fala_espera = 6.0
	fala.emit(t)

func _process(dt: float) -> void:
	_fala_espera = maxf(0.0, _fala_espera - dt)

## número com ponto de milhar (1.500)
static func nf(n) -> String:
	var s := str(int(n))
	var neg := s.begins_with("-")
	if neg:
		s = s.substr(1)
	var out := ""
	while s.length() > 3:
		out = "." + s.substr(s.length() - 3) + out
		s = s.substr(0, s.length() - 3)
	return ("-" if neg else "") + s + out
