extends Node
## Bipes do vôlei: no navegador, vários momentos do vôlei (cortada, peixinho, especial, saque...) tocam um "bipe" feito na hora
## pelo navegador (um oscilador: quadrada, dente de serra, triângulo ou seno, com a altura deslizando e o volume sumindo).
## Aqui o mesmo bipe é montado como som (uma vez só para cada tipo) e tocado com o volume dos efeitos.

const TAXA := 22050
var _cache := {}
var _players: Array[AudioStreamPlayer] = []
var mudo := false

func _ready() -> void:
	for k in 8:
		var p := AudioStreamPlayer.new(); add_child(p); _players.append(p)

## f: frequência (Hz) · d: duração (s) · tipo: "square", "sawtooth", "triangle", "sine" · v: volume · slide: quanto a frequência anda (Hz)
func bipe(f: float, d: float = 0.08, tipo: String = "square", v: float = 0.05, slide: float = 0.0, atraso: float = 0.0) -> void:
	if mudo or Som.volume <= 0.0:
		return
	if atraso > 0.0:
		get_tree().create_timer(atraso, false).timeout.connect(func(): bipe(f, d, tipo, v, slide))
		return
	var chave := "%s|%s|%s|%s|%s" % [f, d, tipo, v, slide]
	if not _cache.has(chave):
		_cache[chave] = _monta(f, d, tipo, v, slide)
	var p: AudioStreamPlayer = _players[0]
	for q in _players:
		if not q.playing:
			p = q; break
	p.stream = _cache[chave]
	p.volume_db = linear_to_db(maxf(0.0001, Som.volume))
	p.play()

## o mesmo que o oscilador do navegador: frequência em rampa exponencial até f + slide (mínimo 40 Hz) em d segundos;
## volume em rampa exponencial de v até quase zero em d segundos; para em d + 0,02 s
func _monta(f: float, d: float, tipo: String, v: float, slide: float) -> AudioStreamWAV:
	var n := int((d + 0.02) * TAXA)
	var dados := PackedByteArray(); dados.resize(n * 2)
	var f1 := maxf(40.0, f + slide)
	var fase := 0.0
	for k in n:
		var t := float(k) / TAXA
		var u := minf(1.0, t / d)
		var fr := f * pow(f1 / f, u) if slide != 0.0 else f
		var g := v * pow(0.0001 / v, u)
		fase = fmod(fase + fr / TAXA, 1.0)
		var o: float
		match tipo:
			"square": o = 1.0 if fase < 0.5 else -1.0
			"sawtooth": o = 2.0 * fase - 1.0
			"triangle": o = 1.0 - 4.0 * absf(fase - 0.5)
			_: o = sin(TAU * fase)
		dados.encode_s16(k * 2, int(clampf(o * g, -1.0, 1.0) * 32767.0))
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = TAXA
	w.stereo = false
	w.data = dados
	return w
