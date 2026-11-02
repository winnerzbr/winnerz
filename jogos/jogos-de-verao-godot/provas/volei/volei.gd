extends Prova
## Vôlei de praia (estilo Blobby): IAmiguinho (você) contra o Amiguinho Rosa, partida rápida até 7.
## Passado do navegador para cá linha por linha: física da bola e da rede, pulos, peixinho, saque, cortada (o braço gira
## em volta do ombro e a palma manda a bola), especial, regra dos 3 toques, o cérebro novo do Amiguinho (nível 0,45)
## com o humor do placar, a pontuação e a medalha. O desenho é o da versão pintada (cenário, torcida, rede, placar,
## personagens com as pranchas aprovadas e o rosto aceso no visor).
## Arquivos: fisica.gd (números e física), cerebro.gd (o Amiguinho), personagem.gd (+ personagem.gdshader: os desenhos),
## bipe.gd (os bipes do navegador). Ficaram de fora (de propósito): torneio, Copa, 2 jogadores, editor e botões de toque.

const F = preload("res://provas/volei/fisica.gd")
const CE = preload("res://provas/volei/cerebro.gd")
const PERSONAGEM = preload("res://provas/volei/personagem.gd")
const BIPE = preload("res://provas/volei/bipe.gd")

const DT := F.DT
const VGY := F.VGY
const VNX := F.VNX
const VNT := F.VNT
const HOME := F.HOME
const VRB := F.VRB
const VWIN := F.VWIN
const MARGIN := F.MARGIN
const PJUMP := F.PJUMP
const PGRAV := F.PGRAV
const MOM_BASE := F.MOM_BASE
const MOM_FAST := F.MOM_FAST
const PXU := 8.0             # pixels das peças pintadas por unidade do mundo
const OL := 1.05             # contorno de fora (unidades do mundo)

## adversário da partida rápida (OPP.rapida)
const OPP := {"name": "Amiguinho Rosa", "tier": "médio", "O": "#e86fa8", "o": "#b24f80", "lvl": 0.45, "pts": 7}

## cores do desenho
const NV := Color("1b1f4f")
const AMARELO := Color("ffd24a")
const AZUL := Color("2f74dc")
const WARN := Color("ffd04a")
const GO := Color("5fe08a")

## falas do IAmiguinho no vôlei (as mesmas do navegador)
const FALA := {
	"intro": ["Vôlei contra o Amiguinho rosa. Ele é grande, mas fui eu que treinei ele. Mal, de propósito.", "Até três toques por lado. No quarto é ponto dele. Eu sei contar até três, tá.", "Dessa vez eu fico na torcida. Alguém tem que dar moral pro time."],
	"vEspecial": ["Barra cheia! Segura o R2 (ou V) quando a bola chegar e escolhe onde ela cai.", "Especial pronto! Segura R2 ou V perto da bola e mira."],
	"vPeixe": ["PEIXINHO! Salvou com a cara na areia.", "Que mergulho! Ganhou nota 10 dos jurados.", "Se jogou! A areia agradece a visita."],
	"vPonto": ["Ponto! Eu comemorei mais que você.", "Isso! Joga na cara dele. Na bola, digo.", "Ponto nosso. Tô na torcida e já me sinto no pódio."],
	"vLevou": ["A rede tava alta demais. Pra você também, pelo visto kkkk", "Ponto do rosa. Ele vai ficar insuportável.", "Bola no chão do nosso lado. Eu tava olhando o mar, juro."],
}

# ---------------------------------------------------------------- estado da partida
var sc := [0, 0]
var P: Array = []
var b: F.Bola
var state := "serve"
var st := 0.0
var server := 0
var nextServer := 0
var touches := [0, 0]
var side := 0
var score := 0
var ai := {}
var rallies := 0
var hits := 0
var longest := 0
var cheer := 0.0
var mom := MOM_BASE
var momTo := MOM_BASE
var momFx = null
var rapidas := [0, 0]
var dominadas := [0, 0]
var cortadas := [0, 0]
var peixes := [0, 0]
var especiais := [0, 0]
var meter := [0.0, 0.0]
var special = null
var specFx = null
var fx: Array = []
var freeze := 0.0
var mood := 0.0
var moody := false
var oppNm := ""
var held := true
var charge := 0.0
var charging := false
var aiServe := {}
var tossT := 9.0
var ballR := VRB
var gain := [{}, {}]
var lastW := -1
var flash := 0.0
var flashW := 0
var two := false
## sem som e sem falas (teste automático)
var mudo := false
var _falou_intro := false

# ---------------------------------------------------------------- desenho
var C2: Dictionary
var SPR: Dictionary
var T := {}                  # texturas das peças
var torcida: Array = []      # a torcida de Amiguinhos
var rostos_torcida: Texture2D
var bipes
var bonecos: Array = []      # os dois personagens (personagem.gd)
var frente: Node2D           # o que fica por cima dos personagens: areia levantando, placar, bola, especial
var _cam := -1.0
var _cam_tt := 0.0
var _hold = null
var _bv := Vector2.ZERO
var trail: Array = []        # rastro de fogo da bola
var splashes: Array = []     # areia levantando
var _no_chao := [true, true]
var _bola_chao := false

func _init() -> void:
	W = F.W; H = F.H

func _ready() -> void:
	super()
	C2 = Arte.json("res://arte/C2.json")
	SPR = Arte.json("res://arte/SPR.json")
	for n in C2:
		T[n] = Arte.tex(C2[n].src)
	T["poste_escuro"] = Arte.tex(C2.poste.escuro)
	for cor in C2.b_frente.cores:
		T["torcida" + cor] = Arte.tex(C2.b_frente.cores[cor])
	rostos_torcida = load("res://provas/volei/rostos_torcida.png")
	# torcida: duas fileiras de Amiguinhos de várias cores, com um vão no meio (a rede)
	var cols := ["#9a7cf0", "#f08a3c", "#5cc7a0", "#e86fa8", "#ffcf3f", "#5aa0f0", "#f07070", "#b0d060"]
	var n := 0
	for row in [0, 1]:
		var x := 38 if row else 24
		while x < 380:
			if not (x > 168 and x < 232):
				torcida.append({"x": x + sin(n * 7.3) * 4.0, "row": row, "c": cols[(n * 5 + row) % cols.size()], "ph": n * 1.37, "ex": 2 if n % 5 == 0 else (1 if n % 7 == 0 else 0)})
				n += 1
			x += 27 if row else 23
	bipes = BIPE.new(); add_child(bipes)
	for k in 2:
		var bo: Node2D = PERSONAGEM.new()
		add_child(bo); bo.prepara(self, k); bonecos.append(bo)
	frente = Node2D.new(); frente.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	frente.draw.connect(_draw_frente); add_child(frente)

func redesenha() -> void:
	super()
	for bo in bonecos: bo.queue_redraw()
	if frente: frente.queue_redraw()

# ---------------------------------------------------------------- começo, saque, humor
func iniciar() -> void:
	sc = [0, 0]; P = [F.Jog.new(), F.Jog.new()]; P[0].novo(HOME); P[1].novo(F.W - HOME)
	state = "serve"; st = 0.0; server = 0; nextServer = 0; touches = [0, 0]; side = 0; score = 0; pontos = 0
	ai = {"t": 0.0, "tx": F.W - HOME}; rallies = 0; hits = 0; longest = 0; cheer = 0.0
	mom = MOM_BASE; momTo = MOM_BASE; momFx = null
	rapidas = [0, 0]; dominadas = [0, 0]; cortadas = [0, 0]; peixes = [0, 0]; especiais = [0, 0]; meter = [0.0, 0.0]
	special = null; specFx = null; fx = []; freeze = 0.0; mood = 0.0; lastW = -1; flash = 0.0
	trail = []; splashes = []; _no_chao = [true, true]; _bola_chao = false; _cam = -1.0
	moody = not two and (base_lvl() >= 0.7 or randf() < 0.45 + 0.45 * base_lvl())
	oppNm = OPP.name
	reset_serve(0)
	for bo in bonecos: bo.zera()
	# a fala de abertura (no navegador, quando a prova é escolhida; não repete no "jogar de novo")
	if not _falou_intro:
		_falou_intro = true; diz_talvez(FALA.intro, 1.0)

func reset_serve(s: int) -> void:
	server = s; state = "serve"; st = 0.0; touches = [0, 0]; side = s; hits = 0
	P[0].novo(F.SERVE.back if s == 0 else HOME); P[1].novo(F.W - F.SERVE.back if s == 1 else F.W - HOME)
	gain = [{}, {}]
	b = F.Bola.new(); b.x = F.W - HOME if s else HOME; b.y = 100.0
	mom = MOM_BASE; momTo = MOM_BASE; ai = {"t": 0.0, "tx": 250.0}
	held = true; charge = 0.0; charging = false; aiServe = {"wait": rand(0.5, 1.1), "hold": rand(0.1, 0.35)}
	trail = []
	hold_ball()

func base_lvl() -> float: return OPP.lvl
## humor da partida: se você está na frente, ele pode se concentrar (erra menos); se ele está na frente, pode relaxar (erra mais)
func mood_l() -> float:
	var L := base_lvl()
	return mood * (0.05 + 0.2 * L * L) if mood > 0.0 else mood * (0.14 - 0.08 * L)
func cfg_now() -> Dictionary: return F.lvl_cfg(base_lvl() + mood_l())
func target() -> int: return VWIN

func mood_step() -> void:
	if two or not moody: return
	var L := base_lvl()
	var diff: int = sc[1] - sc[0]
	var was := mood
	var nm := "Rosa"
	if diff <= -1 and randf() < 0.2 + 0.45 * L: mood = minf(1.0, mood + 0.5)
	elif diff >= 1 and randf() < 0.35 - 0.2 * L: mood = maxf(-1.0, mood - 0.5)
	elif diff == 0: mood *= 0.5
	if mood >= 0.5 and was < 0.5:
		diz(pick(["Ih, o %s ficou sério. Olha a cara dele." % nm, "Acordou o %s. Agora ele tá jogando de verdade." % nm, "O %s não gostou de ficar atrás. Cuidado." % nm]))
	elif mood <= -0.5 and was > -0.5:
		diz(pick(["O %s relaxou achando que já ganhou. Aproveita!" % nm, "O %s tá tremendo. Dá pra virar!" % nm, "Viu? O %s começou a errar." % nm]))

## bola nas mãos de quem saca, acima da cabeça (a física usa a mão do desenho antigo, como no navegador)
func hold_ball() -> void:
	var i := server
	var p: F.Jog = P[i]
	var f := -1.0 if i else 1.0
	b.vx = 0.0; b.vy = 0.0; b.spin = 0.0
	var key := "ia" if i == 0 else "am_rosa"
	var fr: Dictionary = SPR[key].anims.saque[1 if charging else 0] if SPR else {}
	if fr.get("ball") != null:
		b.x = p.x + f * (fr.ball[0] - fr.ax) / 2.0 * F.CHAR_K; b.y = p.y + (fr.ball[1] - fr.ay) / 2.0 * F.CHAR_K; ballR = fr.ball[2] / 2.0 * F.CHAR_K
	else:
		b.x = p.x + f * (3.0 if i == 0 else 2.0); b.y = p.y - (64.0 if i == 0 else 46.0); ballR = VRB

func serve_step(dt: float, c: Dictionary) -> void:
	var i := server
	var p: F.Jog = P[i]
	var hold: bool = c.get("spH", false)
	var rel := false
	if (i == 1 and not two) or c.get("auto", false):
		aiServe.wait -= dt; hold = aiServe.wait <= 0.0 and aiServe.wait > -aiServe.hold
	if hold and p.g:
		if not charging:
			charging = true; charge = 0.0
		charge = minf(F.SERVE.max, charge + dt)
	elif charging:
		rel = true
	if not rel and st > 9.0:
		rel = true; charge = 0.15  # ninguém sacou: joga sozinho
	if rel:
		var k: float = charge / F.SERVE.max
		var f := -1.0 if i else 1.0
		b.vy = -(F.SERVE.v0 + (F.SERVE.v1 - F.SERVE.v0) * k); b.vx = f * (22.0 + 14.0 * k); held = false; charging = false; state = "rally"; tossT = 0.0
		p.swCd = 0.25; p.swUsed = false
		if i == 0: bipe(500.0 + 300.0 * k, 0.08, "triangle", 0.04, 200.0)
		if i == 1: ai.spRoll = -1

## especial: mira com analógico (ou cima/baixo, esquerda/direita) e solta o botão para cortar com força total
func special_step(dt: float, c: Dictionary) -> void:
	var S: Dictionary = special
	var p: F.Jog = P[S.i]
	var f := -1.0 if S.i else 1.0
	S.t += dt
	var cax: float = c.get("ax", 0.0)
	var cay = c.get("ay")
	var mag := sqrt(cax * cax + (cay if cay != null else 0.0) * (cay if cay != null else 0.0))
	if mag > 0.35 and cay != null: S.ang = F.cl(atan2(cay, cax * f), F.SPEC.min, F.SPEC.max)
	else: S.ang = F.cl(S.ang + ((1.0 if c.get("ad", false) else 0.0) - (1.0 if c.get("au", false) else 0.0)) * 1.6 * dt, F.SPEC.min, F.SPEC.max)
	if (not c.get("spcH", false) and S.t > 0.15) or S.t > F.SPEC.maxT:
		b.vx = cos(S.ang) * F.SPEC.v * f; b.vy = sin(S.ang) * F.SPEC.v; b.spin = f * 6.0
		special = null; meter[S.i] = 0.0; mom = MOM_BASE; momTo = MOM_BASE; freeze = 0.16; tremer(0.45); b.fire = 1.6; b.fire_t = 0.0
		p.sw = {"t": F.SPK.T * 0.5, "hit": true, "pow": 1.0, "gnd": p.g}; p.hitT = 0.18; p.hitA = 0.3
		bipe(90, 0.35, "sawtooth", 0.08, -40); bipe(1200, 0.15, "square", 0.05, -700); bipe(60, 0.4, "square", 0.06, -20, 0.06)
		var sparks := []
		for k in 28:
			var a: float = S.ang + rand(-1.4, 1.4) + (PI if f < 0.0 else 0.0)
			var vel := rand(80.0, 260.0)
			sparks.append({"x": b.x, "y": b.y, "vx": cos(a) * vel * f * f, "vy": sin(a) * vel, "c": pick([Color.WHITE, Color("7ff0ff"), Color("ffe27a"), Color("ff9a2a")])})
		specFx = {"x": b.x, "y": b.y, "t": 0.0, "ang": S.ang, "f": f, "sparks": sparks}
		touch(S.i)

func add_meter(i: int, val: float, src: String = "") -> void:
	if src != "":
		if gain[i].get(src, false): return
		gain[i][src] = true
	if two or i == 0:
		var was: float = meter[i]
		meter[i] = minf(1.0, meter[i] + val)
		if was < 1.0 and meter[i] >= 1.0 and i == 0:
			bipe(880, 0.08, "triangle", 0.05, 300); bipe(1320, 0.1, "triangle", 0.05, 200, 0.09)
			fala(FALA.vEspecial, 1.0)

func names() -> Array: return ["Você", oppNm.replace("Amiguinho ", "")]

func final_score() -> int:
	var a: int = sc[0]
	var bb: int = sc[1]
	return 200 * a + 120 * (VWIN - bb) + (600 if a >= VWIN else 0)

# ---------------------------------------------------------------- previsões (usadas pelo Amiguinho)
## onde a bola vai estar quando descer até a altura yh: [x, tempo]
func predict(yh: float, maxT: float = 3.0) -> Array:
	if state == "serve": return [b.x, 0.0]
	var c := b.copia()
	var t2 := 0.0
	var k := 0
	while k < maxT / DT:
		F.ball_step(c, DT * mom); t2 += DT
		if c.vy > 0.0 and c.y >= yh: return [c.x, t2]
		k += 1
	return [c.x, t2]

## imagina o giro do braço a partir de agora: se acertar a bola e ela cair do outro lado, vale cortar
func spike_sim(i: int, pw: float = 0.6):
	var p: F.Jog = P[i].copia()
	var bb := b.copia()
	var face := -1.0 if i else 1.0
	var g := mom
	var t2 := DT
	var TT := F.swing_t(false, pw)
	while t2 <= TT:
		p.vy += PGRAV * DT; p.y += p.vy * DT; p.x += p.vx * DT
		if p.y >= VGY: return null
		F.ball_step(bb, DT * g)
		if bb.y + VRB >= VGY: return null
		if not F.braco_alcanca(bb, p.x, p.y, face, false): t2 += DT; continue
		for Q in F.swing_pose(p.x, p.y, p.vx, p.vy, face, t2, false, pw, -1.0, bb, true):
			if F.spike_hit(bb, Q).x < 0.0: continue
			var vel := sqrt(bb.vx * bb.vx + bb.vy * bb.vy)
			F.voo(bb, DT, 1e9, i, 240)  # a bola voando até o chão (no máximo 4 s)
			if bb.y + VRB >= VGY: return {"good": (bb.x < VNX if i else bb.x > VNX), "v": vel}
			return {"good": false, "v": vel}
		t2 += DT
	return null

## a altura em que a bola cruza a rede
func crossing():
	var c := b.copia()
	for k in 90:
		var was := c.x < VNX
		F.ball_step(c, DT * mom)
		if (c.x < VNX) != was: return c.y
		if c.y > VGY: return null
	return null

func sand(x: float, dir: float, n: int) -> void:
	for k in n:
		fx.append({"x": x + rand(-6.0, 6.0), "y": VGY - 1.0, "vx": -dir * rand(15.0, 75.0) + rand(-15.0, 15.0), "vy": -rand(40.0, 115.0), "t": 0.0})

# ---------------------------------------------------------------- o passo do jogo (60 por segundo)
func passo(dt: float, I: Dictionary) -> bool:
	_anda_efeitos(dt)
	cheer = maxf(0.0, cheer - dt)
	for f in fx:
		f.t += dt; f.vy += 420.0 * dt; f.x += f.vx * dt; f.y = minf(VGY, f.y + f.vy * dt)
	fx = fx.filter(func(f): return f.t < 0.55)
	if freeze > 0.0:
		freeze -= dt; return false
	tossT += dt
	if state == "over":
		st += dt; return st > 1.8
	if state == "point":
		st += dt
		if st > 1.3:
			if maxi(sc[0], sc[1]) >= target():
				state = "over"; st = 0.0; score = final_score(); pontos = score; _fala_do_fim()
			else:
				reset_serve(nextServer)
		return false
	var cfg := cfg_now()
	var c0 := {"l": I.get("l", false), "r": I.get("r", false), "u": I.get("u", false) or I.get("a", false) or I.get("pu", false) or I.get("pa", false),
		"ax": float(I.get("ax", 0.0)), "ay": I.get("ay"), "d": I.get("pd", false) or I.get("pb", false), "sp": I.get("pc", false), "spH": I.get("c", false), "spcH": I.get("e", false),
		"au": I.get("u", false) or I.get("l", false), "ad": I.get("d", false) or I.get("r", false), "auto": I.get("auto", false)}
	var c1 := CE.cerebro_novo(self, 1, dt, ai, cfg)
	var cs := [c0, c1]
	# especial: o tempo para; quem ativou mira a seta e solta o botão para disparar
	if special != null:
		special_step(dt, cs[special.i]); return false
	# saque: quem saca segura a bola; segurar o botão de cortada carrega, soltar joga a bola para cima
	if state == "serve" and held: serve_step(dt, cs[server])
	for i in 2:
		_passo_jogador(i, cs[i], dt, cfg)
	mom += (momTo - mom) * minf(1.0, dt * 5.0)
	if momFx != null:
		momFx.t += dt
		if momFx.t > 0.8: momFx = null
	if state == "serve":
		st += dt
		if held:
			hold_ball(); return false
	if state == "rally": F.ball_step(b, dt * mom)
	if b.fire > 0.0:
		b.fire_t += dt; b.fire = maxf(0.0, b.fire - dt)
	# contato com os personagens: cabeça e corpo, cada um um círculo
	for i in 2:
		var p: F.Jog = P[i]
		# bola do saque subindo logo depois do lançamento: ainda não encosta em quem sacou
		if i == server and hits == 0 and b.vy < 0.0 and tossT < 0.6: continue
		if p.sw != null and not p.sw.hit and (b.x > VNX - F.NETR if i else b.x < VNX + F.NETR):
			var face := -1.0 if i else 1.0
			var hit := false
			for Q in F.swing_pose(p.x, p.y, p.vx, p.vy, face, p.sw.t, p.sw.gnd, p.sw.pow, -1.0, b):
				var hr := F.spike_hit(b, Q)
				if hr.x < 0.0: continue
				mom = MOM_BASE; momTo = MOM_BASE; p.sw.hit = true; p.sw.hp = hr.x; p.sw.L = Q.L; hit = true
				cortadas[i] += 1
				var ang := atan2(b.vy, b.vx * (-1.0 if i else 1.0))
				if hr.y > 0.0 and hr.x > 0.75 and ang > 0.08 and ang < 0.8:
					add_meter(i, 0.25, "corte"); p.sw.perfect = true
				if p.sw.hp > 0.55:
					freeze = 0.05
					if i == 0:
						tremer(0.12); bipe(140, 0.12, "square", 0.06, -60); bipe(900, 0.05, "square", 0.03, 0)
				elif i == 0:
					bipe(420, 0.06, "square", 0.035, 0)
				p.hitT = 0.18; p.hitA = 0.25; p.hitF = false
				touch(i)
				if state != "rally" and state != "serve": return false
				break
			if hit: continue
		if p.sw != null and p.sw.hit and p.sw.t < 0.25: continue
		var armUp: bool = p.sw != null and not p.sw.hit and b.y < p.y + (F.SPKG.sy if p.g else F.SPK.sy) + 4.0
		var shapes: Array
		var mergulho: bool = p.dv != null and not p.dv.has("rest")
		if mergulho:
			var dd: float = p.dv.dir
			shapes = [{"dx": dd * 17.0, "dy": -6.0, "r": 8.0, "dive": true}, {"dx": dd * 5.0, "dy": -7.0, "r": 12.0, "dive": true}, {"dx": -dd * 10.0, "dy": -5.0, "r": 8.0, "dive": true}]
		else:
			shapes = F.SHAPES.slice(1) if armUp else F.SHAPES
		for S in shapes:
			var cx: float = p.x + S.get("dx", 0.0)
			var cy: float = p.y + S.dy
			var dx := b.x - cx
			var dy := b.y - cy
			var d := sqrt(dx * dx + dy * dy)
			var R0: float = VRB + S.r
			if d >= R0 or d == 0.0: continue
			var nx := dx / d
			var ny := dy / d
			b.x = cx + nx * (R0 + 0.5); b.y = cy + ny * (R0 + 0.5)
			# velocidade relativa: a bola quica no personagem e ganha um empurrão na direção do contato
			var rvx := b.vx - p.vx
			var rvy := b.vy - p.vy
			var vn := rvx * nx + rvy * ny
			if vn >= 0.0 and p.hitT > 0.0: continue
			if S.get("dive", false):
				if b.y > VGY - 45.0 and p.dv.need: add_meter(i, 0.15, "peixe")
				b.vx = F.cl(((F.W - VNX * 0.47 if i else VNX * 0.47) - b.x) * 0.7, -70.0, 70.0) + (-12.0 if i else 12.0); b.vy = -rand(255.0, 285.0); b.spin *= 0.2
				momTo = MOM_BASE; freeze = 0.07; p.saves += 1; peixes[i] += 1; sand(b.x, p.dv.dir, 6)
				if i == 0:
					bipe(660, 0.06, "square", 0.05, 300); bipe(990, 0.08, "square", 0.04, 200, 0.06); fala(FALA.vPeixe, 0.7)
			else:
				# decompõe: a parte que bate de frente volta amortecida, a parte de raspão continua (e vira giro)
				var tx := -ny
				var ty := nx
				var vt := rvx * tx + rvy * ty
				var outN: float = -minf(0.0, vn) * 0.32 + S.pop
				var outT := vt * 0.55
				var ox := nx * outN + tx * outT + p.vx * 0.55
				var oy := ny * outN + ty * outT + minf(0.0, p.vy) * 0.35
				# um pouco de imperfeição natural no contato (±4°)
				var jit := rand(-0.07, 0.07)
				var cj := cos(jit)
				var sj := sin(jit)
				var ox2 := ox * cj - oy * sj
				var oy2 := ox * sj + oy * cj
				var spd := sqrt(ox2 * ox2 + oy2 * oy2)
				var lim := F.cl(spd, F.VMIN, F.VMAX)
				b.vx = ox2 * lim / spd; b.vy = oy2 * lim / spd; b.spin = F.cl(b.spin * 0.3 + vt * 0.03, -10.0, 10.0)
			if p.hitT <= 0.0:
				p.hitT = 0.18
				# saque do adversário: quem joga bem coloca a bola onde quer do outro lado
				if i == 1 and not two and hits == 0 and server == 1: CE.ai_serve_shot(self, b)
				var forward: bool = p.dv == null and not p.g and (p.vx > 20.0 if i == 0 else p.vx < -20.0)
				p.hitA = 0.32; p.hitF = forward
				if forward:
					mom = MOM_FAST; momTo = MOM_FAST; rapidas[i] += 1; momFx = {"k": "BOLA RÁPIDA", "t": 0.0, "c": WARN}
					if i == 0: bipe(780, 0.08, "square", 0.045, 400)
				elif b.vy < -60.0 and momTo > MOM_BASE:
					momTo = MOM_BASE; dominadas[i] += 1; momFx = {"k": "DOMINOU", "t": 0.0, "c": GO}
					if i == 0: bipe(520, 0.1, "triangle", 0.05, -120)
				touch(i)
				if state != "rally" and state != "serve": return false
			break
	if b.net_hit: b.net_hit = false
	var lado := 0 if b.x < VNX else 1
	if lado != side:
		side = lado; touches = [0, 0]
	if b.y + VRB >= VGY:
		var lost := 0 if b.x < VNX else 1
		point(1 - lost, "a bola caiu do seu lado" if lost == 0 else "a bola caiu do lado dele")
	return false

func _passo_jogador(i: int, c: Dictionary, dt: float, cfg: Dictionary) -> void:
	var p: F.Jog = P[i]
	p.spec = false
	# peixinho: mergulho baixo e rápido; depois de cair, escorrega na areia e leva um instante para levantar
	if p.dv != null:
		var dv: Dictionary = p.dv
		dv.t += dt; p.hitT -= dt; p.hitA = maxf(0.0, p.hitA - dt)
		if not p.g:
			p.vy += PGRAV * dt; p.y += p.vy * dt
			if p.y >= VGY:
				p.y = VGY; p.vy = 0.0; p.g = true; p.sq = -0.6; sand(p.x, dv.dir, 9)
				if i == 0: bipe(120, 0.07, "square", 0.04, -40)
		else:
			p.vx -= signf(p.vx) * minf(absf(p.vx), F.DIVE.fric * dt)
			if absf(p.vx) > 40.0 and randf() < 0.6: sand(p.x - dv.dir * 6.0, dv.dir, 1)
		p.x += p.vx * dt
		var x1 := p.x
		p.x = F.cl(p.x, VNX + MARGIN, F.W - 12.0) if i else F.cl(p.x, 12.0, VNX - MARGIN)
		if p.x != x1: p.vx = 0.0
		if p.g and absf(p.vx) < 1.0 and not dv.has("rest"): dv.rest = dv.t
		if dv.has("rest") and dv.t - dv.rest > F.DIVE.rest:
			p.dv = null; p.landT = 0.1
		return
	if p.g: p.swUsed = false
	p.swCd = maxf(0.0, p.swCd - dt)
	var serving := state == "serve" and held
	# cortada: apertou, começa a armar o braço; quanto mais tempo segura, mais forte. Soltou, bate.
	if c.get("sp", false) and not serving and p.sw == null and p.ch == null and p.swCd <= 0.0 and (p.g or not p.swUsed) and state != "point":
		p.ch = {"t": 0.0}
		if not p.g: p.swUsed = true
	if p.ch != null:
		if c.get("spH", false) and state != "point":
			p.ch.t = minf(F.SPK.chMax, p.ch.t + dt)
		else:
			var pw: float = c.pow if c.get("pow") != null else F.cl(0.35 + 0.65 * p.ch.t / F.SPK.chMax, 0.35, 1.0)
			p.sw = {"t": 0.0, "hit": false, "gnd": p.g, "pow": pw}; p.ch = null
			if i == 0: bipe(300.0 + 160.0 * pw, 0.09, "sawtooth", 0.025 + 0.02 * pw, 420)
	# especial: barra cheia e R2 (V) segurado; assim que a bola chega ao alcance, o tempo para e a seta aparece
	if c.get("spcH", false) and meter[i] >= 1.0 and state == "rally" and p.dv == null and (b.x > VNX + F.NETR if i else b.x < VNX - F.NETR):
		var f := -1.0 if i else 1.0
		# qualquer posição do seu lado da quadra: a bola vai para perto da rede e o personagem é teletransportado
		var from := Vector2(p.x, p.y)
		b.x = VNX - f * 30.0; b.y = VNT - 46.0; b.vx = 0.0; b.vy = 0.0; b.spin = 0.0
		p.x = b.x - f * F.SPK_F.x; p.y = b.y - F.SPK_F.y; p.vx = 0.0; p.vy = 0.0; p.g = false; p.sw = null; p.ch = null; p.dv = null; p.swUsed = true
		special = {"i": i, "ang": 26.0 * PI / 180.0, "t": 0.0, "from": from}; p.spec = true; especiais[i] += 1
		bipe(220, 0.25, "sawtooth", 0.04, 600); bipe(1400, 0.2, "sine", 0.03, -800)
		return
	if p.sw != null:
		p.sw.t += dt
		if p.sw.t > F.swing_t(p.sw.gnd, p.sw.pow):
			p.sw = null; p.swCd = 0.12
	# aperto um pouco antes de pousar também vale (fica guardado por um instante)
	p.dvBuf = maxf(0.0, p.dvBuf - dt)
	if c.get("d", false): p.dvBuf = 0.14
	if p.dvBuf > 0.0 and p.g and state != "point" and not (serving and i == server):
		p.dvBuf = 0.0
		var hx := signf(F.jsround(float(c.get("ax", 0.0)) * 3.0))
		# sem direção apertada: vai para onde a bola vai cair
		var land: float = predict(VGY - 10.0)[0] if state == "rally" else b.x
		var dir: float = c.get("dir", 0.0)
		if dir == 0.0: dir = hx
		if dir == 0.0: dir = signf(land - p.x)
		if dir == 0.0: dir = -1.0 if i else 1.0
		var need := false
		if state == "rally" and b.vy > 0.0:
			var pr := predict(VGY - VRB - 2.0)
			need = absf(pr[0] - p.x) > 128.0 * pr[1] + 12.0
		p.dv = {"t": 0.0, "dir": dir, "need": need}; p.vx = dir * F.DIVE.vx; p.vy = F.DIVE.vy; p.g = false; p.sq = 0.5; p.landT = 0.0
		if i == 0: bipe(240, 0.1, "triangle", 0.05, -110)
		return
	var u: bool = c.get("u", false)
	if serving and i == server: u = false
	# aceleração: ninguém sai de 0 a 100 num quadro. Toque leve (ou analógico pouco inclinado) anda pouco
	var ax := F.cl(float(c.get("ax", 0.0)), -1.0, 1.0)
	var tgt: float = ax * 128.0 * (cfg.spd if (i == 1 and not two) else 1.0)
	var speeding: bool = tgt != 0.0 and (p.vx == 0.0 or signf(tgt) == signf(p.vx)) and absf(tgt) > absf(p.vx)
	var acc := (1250.0 if speeding else 1900.0) if p.g else (760.0 if speeding else 520.0)
	var dvx: float = tgt - p.vx
	p.vx += signf(dvx) * minf(absf(dvx), acc * dt)
	p.x += p.vx * dt
	var x0 := p.x
	p.x = F.cl(p.x, VNX + MARGIN, F.W - 12.0) if i else F.cl(p.x, 12.0, VNX - MARGIN)
	if serving and i == server: p.x = F.W - F.SERVE.back if i else F.SERVE.back
	if p.x != x0: p.vx = 0.0
	if u and p.g:
		p.vy = -PJUMP; p.g = false; p.sq = 1.0
		if i == 0: som("pulo", 0.5)
	if not p.g:
		p.vy += PGRAV * dt; p.y += p.vy * dt
		if p.y >= VGY:
			p.y = VGY; p.vy = 0.0; p.g = true; p.sq = -1.0; p.landT = 0.16
	# animação: passos acompanham a velocidade; amassa ao pousar, estica ao pular
	p.ph += absf(p.vx) * dt * 0.11 if p.g else 0.0
	p.sq = p.sq * exp(-dt * 9.0)
	p.hitT -= dt; p.hitA = maxf(0.0, p.hitA - dt); p.landT = maxf(0.0, p.landT - dt)

func touch(i: int) -> void:
	if b.fire > 0.0 and b.fire_t > 0.05: b.fire = 0.0
	if state == "serve": state = "rally"
	touches[i] += 1; touches[1 - i] = 0; hits += 1; longest = maxi(longest, hits)
	if i == 0: som("toque")
	else: bipe(300, 0.05, "square", 0.03, 80)
	if touches[i] > 3: point(1 - i, "4 toques do seu lado" if i == 0 else "4 toques do lado dele")

func point(w: int, _why: String) -> void:
	sc[w] += 1; lastW = w; state = "point"; st = 0.0; mood_step(); add_meter(w, 0.2); special = null; nextServer = 1 - w; rallies += 1
	b.vx = 0.0; b.vy = 0.0; b.spin = 0.0; b.y = minf(b.y, VGY - VRB)
	# sem aviso na tela: só o placar pisca do lado de quem pontuou
	flash = 1.0; flashW = w
	som("bola_areia", 0.9)
	if w == 0:
		som("ponto"); cheer = 1.4; fala(FALA.vPonto, 0.35)
	else:
		bipe(160, 0.08, "sawtooth", 0.03, -40); fala(FALA.vLevou, 0.35)

func _fala_do_fim() -> void:
	var m := Jogo.medalha(Jogo.prova("volei"), score)
	if sc[0] >= VWIN:
		diz("Atropelou o Amiguinho rosa. Ele vai pedir revanche. E VAR. Principalmente VAR. lmao" if m == "ouro" else "Vitória! Eu torci tanto que a hélice esquentou.")
	else:
		diz(pick(["O rosa levou essa. A rede tava alta demais, eu avisei kkkk", "Perdeu pro Amiguinho rosa. Tudo bem, ele treina comigo. Eu sou um ótimo técnico, aparentemente."]))

# ---------------------------------------------------------------- sons e falas
func som(nome: String, vol: float = 1.0) -> void:
	if not mudo: Som.toca(nome, vol)
func bipe(f: float, d: float, tipo: String, v: float, slide: float, atraso: float = 0.0) -> void:
	if not mudo and bipes: bipes.bipe(f, d, tipo, v, slide, atraso)
func fala(linhas: Array, prob: float) -> void:
	if not mudo: Jogo.falar(linhas, prob)
func diz(t2: String) -> void:
	if not mudo: Jogo.diz(t2)
func diz_talvez(linhas: Array, prob: float) -> void:
	if not mudo: Jogo.falar(linhas, prob)

# ---------------------------------------------------------------- placar de cima, fim e explicação
## o placar de madeira fica no próprio desenho: a barra de cima da partida some durante o jogo
func placar_proprio() -> bool: return true

func hud() -> Array:
	var n := names()
	return [[n[0], str(sc[0]), false], [n[1], str(sc[1]), false], ["Seus toques", "%d/3" % touches[0], side == 0 and state == "rally"],
		["Saque", (n[1] if server else n[0]) if state == "serve" else "—", false]]

func estatisticas() -> Array:
	return ["Placar %d a %d" % [sc[0], sc[1]], "%d cortadas · %d batidas rápidas · %d dominadas" % [cortadas[0], rapidas[0], dominadas[0]], "Maior rali: %d toques" % longest]

func placar_txt() -> String:
	return "%d a %d" % [sc[0], sc[1]]

func explicacao() -> String:
	return "Setas para os lados andam; seta para cima ou Espaço pula. Até 3 toques por lado.\n" \
		+ "Seta para baixo ou X dá um peixinho: salva a bola rente ao chão, mas você demora a levantar.\n" \
		+ "C (ou □) corta: segure para bater mais forte. No saque, segure para jogar a bola mais alto.\n" \
		+ "Barra cheia: segure V (ou R2) quando a bola chegar, mire e solte.\n" \
		+ "Controle: analógico anda · ✕ pula · □ corta (segure para mais força) · ○ peixinho · R2 especial · Start pausa"

# ---------------------------------------------------------------- animação "do jogo" de cada personagem (vAnim do navegador)
## devolve [animação, quadro, expressão, pose]. Expressões: 0 normal, 1 piscando, 2 feliz, 3 susto, 4 triste, 5 concentrado
func v_anim(p: F.Jog, i: int, tt2: float) -> Array:
	var stt := state
	var win := (0 if sc[0] > sc[1] else 1) if stt == "over" else lastW
	if (stt == "point" or stt == "over") and win >= 0:
		if win == i: return ["comemora", int(floor(tt2 * 7.0)) % 4, 2, 0]
		return ["triste", mini(2, int(floor(st * 5.0))), 4, 0]
	if p.spec: return ["cortada", 0, 5, 0]
	if stt == "serve" and held and server == i: return ["saque", 1 if charging else 0, 5 if charging else 0, 0]
	if stt == "rally" and server == i and tossT < 0.28 and hits == 0: return ["saque", 2, 0, 0]
	if p.dv != null:
		var ex := 2 if p.hitA > 0.0 else 5
		if p.dv.has("rest"): return ["peixinho", 3, 2 if p.hitA > 0.0 else 0, 0]
		return ["peixinho", (0 if p.dv.t < 0.07 else 1) if not p.g else 2, ex, 0]
	if p.ch != null: return ["cortechao" if p.g else "cortada", 0, 5, 0]
	if p.sw != null:
		var s2: float = p.sw.t / F.swing_t(p.sw.gnd, p.sw.pow)
		if p.sw.gnd: return ["cortechao", 0 if s2 < 0.3 else (1 if s2 < 0.55 else 2), 2 if p.sw.hit else 5, 0]
		return ["cortada", 0 if s2 < 0.22 else (1 if s2 < 0.45 else (2 if s2 < 0.7 else 3)), 2 if p.sw.hit else 5, 0]
	var a: Array
	if p.hitA > 0.0: a = ["batida" if p.hitF else "toque", mini(2, int(floor((1.0 - p.hitA / 0.32) * 3.2))), 2, 0]
	elif not p.g: a = ["pulo", 1 if p.vy < -140.0 else (2 if p.vy < 110.0 else 3), 5, 0]
	elif p.landT > 0.0: a = ["aterrissagem", 0 if p.landT > 0.08 else 1, 0, 0]
	elif absf(p.vx) > 8.0:
		var fq := int(floor(p.ph / TAU * 6.0)) % 6
		if (p.vx < 0.0 if i == 0 else p.vx > 0.0): fq = 5 - fq
		a = ["correndo", fq, 0, 0]
	else: a = ["parado", int(floor(tt2 * 5.0)) % 4, 0, 0]
	if a[2] == 0 and i == 1 and not two and absf(mood) >= 0.5 and fmod(tt2 + 1.7, 3.6) >= 0.12: a[2] = 5 if mood > 0.0 else 4
	if a[2] == 0:
		var mine := b.x < VNX if i == 0 else b.x > VNX
		if state == "rally" and mine and b.vy > 0.0 and b.y > VGY - 55.0 and absf(b.x - p.x) > 34.0: a[2] = 3
		elif fmod(tt2 + i * 1.7, 3.6) < 0.12: a[2] = 1
	return a

# ---------------------------------------------------------------- efeitos que no navegador andam a cada desenho
func _anda_efeitos(dt: float) -> void:
	if flash > 0.0: flash = maxf(0.0, flash - dt)
	# rastro de fogo da bola depois do especial
	if b != null and b.fire > 0.0:
		trail.push_front(Vector2(b.x, b.y))
		if trail.size() > 14: trail.pop_back()
	else:
		trail = []
	# especial: clarão, ondas de choque e faíscas
	if specFx != null:
		specFx.t += dt
		for q in specFx.sparks:
			q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 300.0 * dt; q.vx *= 0.97
		if specFx.t > 0.75: specFx = null
	# areia levantando: quando alguém cai no chão e quando a bola bate na areia
	for e in splashes: e.t += dt
	splashes = splashes.filter(func(e): return e.t <= 0.5)
	if b != null and not P.is_empty():
		for i in 2:
			var p: F.Jog = P[i]
			if p.g and not _no_chao[i]: _splash(p.x + (p.dv.dir * 6.0 if p.dv != null else 0.0), p.dv != null)
			_no_chao[i] = p.g
		var onG := b.y + VRB >= VGY - 1.0
		if onG and not _bola_chao: _splash(b.x, true)
		_bola_chao = onG

func _splash(x: float, big: bool) -> void:
	splashes.append({"x": x, "t": 0.0, "n": "areia3" if big else ("areia1" if randf() < 0.5 else "areia2"), "s": 0.55 if big else 0.7})

# ---------------------------------------------------------------- desenho (fundo, sombras, rede, rastro do braço)
static func suave(k: float) -> float: return k * k * (3.0 - 2.0 * k)

func desenhar(tt2: float) -> void:
	if b == null: return
	_cenario(tt2)
	# a bola na mão de quem saca (o desenho segura a bola na palma; a física guarda a bola em cima da cabeça até o lançamento)
	var bv := Vector2(b.x, b.y)
	if state == "serve" and held:
		bv = bonecos[server].mao_do_saque(P[server], -1.0 if server else 1.0); _hold = bv
	elif state == "rally" and hits == 0 and _hold != null and tossT < 0.16:
		var k := suave(tossT / 0.16); bv = Vector2(lerpf(_hold.x, b.x, k), lerpf(_hold.y, b.y, k))
	_bv = bv
	# sombras (diminuem com a altura)
	var hb := maxf(0.0, VGY - (bv.y + VRB))
	var kb := F.cl(1.0 - hb / 170.0, 0.2, 1.0)
	ellipse(bv.x, VGY + 1.0, 3.0 + 10.0 * kb, 1.0 + 1.7 * kb, Color8(150, 72, 48, int(round((0.1 + 0.3 * kb) * 255))))
	for i in 2:
		var p: F.Jog = P[i]
		var k2 := F.cl(1.0 - (VGY - p.y) / 90.0, 0.35, 1.0)
		ellipse(p.x, VGY + 1.0, (15.0 if i else 12.0) * k2, 2.4, Color(150 / 255.0, 72 / 255.0, 48 / 255.0, 0.32 * k2))
	for f in fx:
		circle(f.x, f.y, 1.1, Color(214 / 255.0, 150 / 255.0, 92 / 255.0, 1.0 - f.t / 0.55))
	# rastro de fogo da bola (especial)
	for k in trail.size():
		var q: Vector2 = trail[k]
		save(); alpha = (1.0 - k / 14.0) * minf(1.0, b.fire) * 0.85
		circle(q.x, q.y, maxf(2.0, VRB - k * 0.6), Color.WHITE if k < 4 else (Color("7ff0ff") if k < 8 else Color("ff9a2a")))
		restore()
	_rede()
	# rastro do braço na cortada: um borrão em leque por onde a mão passou
	for i in 2:
		var p: F.Jog = P[i]
		if p.sw == null: continue
		var face := -1.0 if i else 1.0
		var pts := []
		for k in 7:
			var t2: float = p.sw.t - k * 0.013
			if t2 < F.SPK.T * 0.15: break
			pts.append(F.swing_pose(p.x, p.y, p.vx, p.vy, face, t2, p.sw.gnd, p.sw.pow, _sw_L(p), b)[0])
		if pts.size() > 1:
			for k in range(1, pts.size()):
				var kk := float(k) / pts.size()
				capsula(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y, 5.0 * (1.0 - kk) + 1.0, Color(1, 1, 1, 0.55 * (1.0 - kk)))

## comprimento do braço para o desenho: o que bateu na bola, 22 (especial) ou medir até a bola
func _sw_L(p: F.Jog) -> float:
	if p.sw.hit: return p.sw.get("L", 22.0)
	return -1.0

## céu, mar, areia, torcida, névoa e a fita da quadra (scene2 do navegador)
func _cenario(tt2: float) -> void:
	var dt := clampf(tt2 - _cam_tt, 0.0, 0.05); _cam_tt = tt2
	if _cam < 0.0: _cam = F.W / 2.0
	_cam = lerpf(_cam, F.cl(b.x, 40.0, F.W - 40.0), minf(1.0, dt * 1.5))
	var cam := _cam - F.W / 2.0
	var HZ2 := 141.0
	for cam_k in [["ceu", 0.015, 1.08], ["mar", 0.035, 1.1]]:
		var w: float = F.W * cam_k[2]
		var h := w * 9.0 / 16.0
		img_todo(T[cam_k[0]], (F.W - w) / 2.0 - cam * cam_k[1], HZ2 - 0.6376 * h, w, h)
	img_todo(T.areia, 0, 0, F.W, F.H)
	# torcida de Amiguinhos (o mesmo desenho, em várias cores)
	var bf: Dictionary = C2.b_frente
	var foot: Array = bf.foot
	var vis: Array = bf.vis
	var anima := cheer > 0.0
	save(); translate_(-cam * 0.05, 0.0)
	for row in [0, 1]:
		for c in torcida:
			if c.row != row: continue
			var kk := 0.4 if row else 0.34
			var y := 172.0 if row else 165.0
			var hop := maxf(0.0, sin(tt2 * 11.0 + c.ph)) * 5.0 if anima else maxf(0.0, sin(tt2 * 2.0 + c.ph)) * 0.6
			save(); translate_(c.x, y - hop); scale_(kk / PXU, kk * (1.0 + (0.06 if anima else 0.02) * sin(tt2 * 11.0 + c.ph)) / PXU)
			img_todo(T["torcida" + c.c], -foot[0], -foot[1], bf.w, bf.h)
			restore()
			save(); translate_(c.x + (vis[0] - foot[0]) / PXU * kk, y - hop + (vis[1] - foot[1]) / PXU * kk + 0.3); scale_(kk * 0.9, kk * 0.9)
			var ex: int = 2 if anima else (4 if mood < -0.4 else c.ex)
			img(rostos_torcida, ex * 224.0, 0.0, 224.0, 160.0, -14.0, -10.0, 28.0, 20.0)
			restore()
	restore()
	# névoa leve até a torcida (separa a quadra do fundo)
	var nv0 := Color(1.0, 190 / 255.0, 170 / 255.0, 0.0)
	var nv1 := Color(1.0, 190 / 255.0, 170 / 255.0, 0.14)
	grad_rect(0, 120, F.W, 62 * 0.6, [nv0, nv1]); grad_rect(0, 120 + 62 * 0.6, F.W, 62 * 0.4, [nv1, nv0])
	# fita da quadra na areia
	var fita := Color(1.0, 248 / 255.0, 230 / 255.0, 0.75)
	capsula(30, 190, 370, 190, 1.4, fita)
	capsula(12, 216, 388, 216, 1.9, fita)
	capsula(30, 190, 12, 216, 1.2, fita); capsula(370, 190, 388, 216, 1.2, fita)

## poste de madeira: o topo com o nó, o nó de baixo na altura da corda e o resto esticado
func _poste(x: float, top: float, bot: float, kw: float, tex: Texture2D) -> void:
	var a: Dictionary = C2.poste
	var w: float = a.w / PXU * kw
	var cx: float = a.cx[0] / PXU * kw
	var capH := 104.0 / PXU * kw
	var knH := 56.0 / PXU * kw
	var kn := VNT + 46.0 - knH / 2.0
	img(tex, 0, 0, a.w, 104, x - cx, top, w, capH)
	img(tex, 0, 104, a.w, 78, x - cx, top + capH - 0.1, w, kn - top - capH + 0.2)
	img(tex, 0, 182, a.w, 56, x - cx, kn, w, knH)
	img(tex, 0, 238, a.w, a.h - 238, x - cx, kn + knH - 0.1, w, bot - kn - knH + 0.1)

func _rede() -> void:
	var x0 := VNX
	var top := VNT
	var bot := VNT + 46.0
	var by := -9.0
	_poste(x0 + 15.0, top - 13.0, VGY - 12.0, 0.5, T.poste_escuro)
	# malha e corda de cima: o desenho da rede, visto de lado (inclinado em perspectiva)
	var m: Dictionary = C2.malha
	var f: Dictionary = C2.faixa
	save(); set_transform_(_xf * Transform2D(Vector2(15.0 / m.w, by / m.w), Vector2(0.0, 44.0 / m.h), Vector2(x0, top + 2.0)))
	img_todo(T.malha, 0, 0); img_todo(T.malha, 0, 0); restore()
	save(); set_transform_(_xf * Transform2D(Vector2(15.0 / f.w, by / f.w), Vector2(0.0, 4.2 / f.h), Vector2(x0, top - 1.6))); img_todo(T.faixa, 0, 0); restore()
	save(); set_transform_(_xf * Transform2D(Vector2(15.0 / f.w, by / f.w), Vector2(0.0, 2.6 / f.h), Vector2(x0, bot - 1.0))); img_todo(T.faixa, 0, 0); restore()
	_poste(x0, top - 4.0, VGY + 3.0, 0.6, T.poste)

# ---------------------------------------------------------------- desenho por cima dos personagens
func _draw_frente() -> void:
	_alvo = frente; _xf = Transform2D.IDENTITY; alpha = 1.0; _pilha.clear()
	frente.draw_set_transform_matrix(_xf)
	if b != null: _frente(tt)
	_alvo = self

func _frente(tt2: float) -> void:
	# areia levantando
	for e in splashes:
		var a: Dictionary = C2[e.n]
		var k: float = e.t / 0.5
		var sc2: float = e.s * (0.55 + 0.6 * suave(minf(1.0, k * 1.8)))
		save(); alpha = F.cl(1.6 - k * 1.6, 0.0, 1.0); translate_(e.x, VGY + 2.0); scale_(sc2 / PXU, sc2 * (1.0 - 0.25 * k) / PXU)
		img_todo(T[e.n], -a.c[0], -a.c[1]); restore()
	_placar()
	_bola(_bv.x, _bv.y, b.ang)
	# bola fora da tela, lá no alto: setinha mostrando onde ela está
	if b.y + VRB < 0.0:
		var k := F.cl(1.0 + (b.y + VRB) / 160.0, 0.45, 1.0)
		var x := F.cl(b.x, 8.0, F.W - 8.0)
		var s2 := 3.0 + 2.5 * k
		save(); alpha = 0.6 + 0.4 * k
		var tri := PackedVector2Array([Vector2(x, 2), Vector2(x + s2, 2 + s2 * 1.3), Vector2(x - s2, 2 + s2 * 1.3)])
		_contorno(tri, NV, 2.0 * OL); poly(tri, Color.WHITE); restore()
	# especial: tudo para, a tela escurece e aparece a seta de mira saindo da bola
	if special != null:
		var S: Dictionary = special
		var f := -1.0 if S.i else 1.0
		R(0, 0, F.W, F.H, Color(20 / 255.0, 18 / 255.0, 70 / 255.0, 0.45))
		if S.t < 0.5:
			save(); alpha = (1.0 - S.t / 0.5) * 0.8
			for k in 8:
				var a2: float = k / 8.0 * TAU + S.t * 9.0
				var r: float = 6.0 + S.t * 40.0
				circle(S.from.x + cos(a2) * r, S.from.y - 20.0 + sin(a2) * r, 1.6, Color("7ff0ff"))
			restore()
		_bola(b.x, b.y, b.ang)
		var ca: float = cos(S.ang) * f
		var sa: float = sin(S.ang)
		var L0 := VRB + 4.0
		var L1 := VRB + 46.0
		var pl := 0.5 + 0.5 * sin(tt2 * 10.0)
		capsula(b.x + ca * L0, b.y + sa * L0, b.x + ca * L1, b.y + sa * L1, 4.2, NV)
		# tracejado branco andando
		var dd := L0
		while dd < L1:
			var fase := fposmod((dd - L0) - tt2 * 20.0, 6.0)
			if fase < 3.0:
				var fim := minf(L1, dd + (3.0 - fase))
				capsula(b.x + ca * dd, b.y + sa * dd, b.x + ca * fim, b.y + sa * fim, 2.0, Color.WHITE)
				dd = fim + 0.001
			else:
				dd += 6.0 - fase
		var hx := b.x + ca * (L1 + 6.0)
		var hy := b.y + sa * (L1 + 6.0)
		var nx := -sa
		var ny := ca
		var tri2 := PackedVector2Array([Vector2(hx + ca * 2.0, hy + sa * 2.0), Vector2(hx - ca * 9.0 + nx * 6.5, hy - sa * 9.0 + ny * 6.5), Vector2(hx - ca * 9.0 - nx * 6.5, hy - sa * 9.0 - ny * 6.5)])
		_contorno(tri2, NV, 2.0 * OL); poly(tri2, Color8(int(200 + 55 * pl), 245, 255))
		ring(b.x, b.y, VRB + 3.0 + pl * 2.0, Color(127 / 255.0, 240 / 255.0, 1.0, 0.4 + 0.4 * pl), 1.5)
	# especial: clarão, ondas de choque e faíscas
	if specFx != null:
		var Fx: Dictionary = specFx
		if Fx.t < 0.22: R(0, 0, F.W, F.H, Color(1.0, 1.0, 240 / 255.0, 0.75 * (1.0 - Fx.t / 0.22)))
		for k in 3:
			var tk: float = Fx.t - k * 0.07
			if tk <= 0.0 or tk > 0.5: continue
			var cr := Color("7ff0ff") if k == 1 else Color.WHITE
			cr.a = 1.0 - tk / 0.5
			ring(Fx.x, Fx.y, 8.0 + tk * 160.0, cr, 2.0)
		if Fx.t < 0.35:
			for k in 10:
				var a3: float = Fx.ang + (k - 4.5) * 0.08
				var l0: float = 14.0 + Fx.t * 120.0
				var l1 := l0 + 26.0
				capsula(Fx.x - cos(a3) * Fx.f * l0, Fx.y - sin(a3) * l0, Fx.x - cos(a3) * Fx.f * l1, Fx.y - sin(a3) * l1, 2.0, Color(1, 1, 1, (1.0 - Fx.t / 0.35) * 0.8))
		for q in Fx.sparks:
			var cq: Color = q.c
			cq.a = maxf(0.0, 1.0 - Fx.t / 0.7)
			circle(q.x, q.y, 1.2, cq)

## placar de madeira pendurado no alto, com as plaquinhas mostrando os pontos
func _placar() -> void:
	var a: Dictionary = C2.placar
	var Z := 1.4
	var w: float = a.w / PXU * Z
	var x := F.W / 2.0 - w / 2.0
	var y := 1.0
	img_todo(T.placar, x, y, w, a.h / PXU * Z)
	texto_o(str(sc[0]), x + a.c1[0] / PXU * Z, y + a.c1[1] / PXU * Z + 1.0, 17.0, AZUL, 3.2)
	texto_o(str(sc[1]), x + a.c2[0] / PXU * Z, y + a.c2[1] / PXU * Z + 1.0, 17.0, Color(OPP.O), 3.2)
	# pontos para vencer: num círculo amarelo entre as plaquinhas
	var cx := F.W / 2.0
	var cyy: float = y + a.c1[1] / PXU * Z
	circle(cx, cyy + 9.0, 3.6, AMARELO); ring(cx, cyy + 9.0, 3.6, NV, 1.0)
	texto_o(str(target()), cx, cyy + 9.3, 4.2, NV, 0.0)
	if state == "rally":
		for lado in [0, 1]:
			var bx: float = x + (a.c2[0] if lado else a.c1[0]) / PXU * Z
			var by: float = y + a.h / PXU * Z + 3.2
			for k in 3:
				circle(bx + (k - 1) * 5.0, by, 1.7, AMARELO if k < touches[lado] else Color(1, 1, 1, 0.4))
				ring(bx + (k - 1) * 5.0, by, 1.7, NV, 0.7)

func _bola(x: float, y: float, ang: float, s2: float = 1.0) -> void:
	var a: Dictionary = C2.bola
	var k: float = (VRB * 2.0) / (a.w / PXU) * 1.04 * s2
	save(); translate_(x, y); rotate_(ang); scale_(k / PXU, k / PXU); img_todo(T.bola, -a.c[0], -a.c[1]); restore()

# ---------------------------------------------------------------- utilidades de desenho
## linha com as pontas redondas (como lineCap 'round' do navegador), sem sobrepor a transparência
func capsula(x0: float, y0: float, x1: float, y1: float, w: float, cor: Color) -> void:
	var d := Vector2(x1 - x0, y1 - y0)
	var L := d.length()
	var u := d / L if L > 0.0001 else Vector2.RIGHT
	var n := Vector2(-u.y, u.x) * w * 0.5
	var pts := PackedVector2Array()
	var seg := 8
	for k in seg + 1:
		pts.append(Vector2(x1, y1) + n.rotated(-PI * k / seg))
	for k in seg + 1:
		pts.append(Vector2(x0, y0) - n.rotated(-PI * k / seg))
	poly(pts, cor)

func _contorno(pts: PackedVector2Array, cor: Color, lw: float) -> void:
	var fech := pts.duplicate(); fech.append(pts[0])
	polyline(fech, cor, lw)
	for q in pts: circle(q.x, q.y, lw * 0.5, cor)

## texto com contorno azul-marinho, centrado na altura (o textO do navegador)
func texto_o(s: String, x: float, y: float, tam: float, cor: Color, lw: float) -> void:
	var f: Font = Jogo.fonte_larga
	var fs := int(ceil(tam))
	var k := tam / fs
	var base := y + (f.get_ascent(fs) - f.get_descent(fs)) * 0.5 * k
	text(s, x, base, cor, tam, "c", lw * 0.5, NV, f)
