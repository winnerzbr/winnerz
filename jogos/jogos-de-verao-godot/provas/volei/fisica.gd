extends RefCounted
## Vôlei: os números e a física (a mesma do navegador, linha por linha).
## A bola anda num "tempo" próprio: normal = 0,9; batida rápida = 0,9 × 1,2.
## Tela do vôlei: 400 × 225 unidades. Chão em 203, rede no meio (x 200) com a fita em 131.

const W := 400.0
const H := 225.0
const DT := 1.0 / 60.0
const VGY := H - 22.0          # chão
const VNX := W / 2.0           # rede
const VNT := VGY - 72.0        # alto da rede (fita)
const HOME := 88.0             # lugar de espera (22% da largura)
const VRB := 11.5              # raio da bola
const VWIN := 7                # quem fizer 7 vence
const VG := 360.0              # gravidade da bola
const VMAX := 320.0
const VMIN := 150.0
const MOM_BASE := 0.9
const MOM_FAST := 0.9 * 1.2
const PJUMP := 300.0           # pulo (a cabeça passa um pouco da rede)
const PGRAV := 780.0
## dois pontos de contato em cada personagem: a cabeça (maior, em cima) e o corpo
const SHAPES := [{"dy": -23.5, "r": 12.8, "pop": 205.0}, {"dy": -7.5, "r": 9.6, "pop": 150.0}]
const MARGIN := 9.0            # o quanto o centro do personagem chega perto da rede
## peixinho: velocidade do mergulho, pulinho, atrito da areia e tempo para levantar
const DIVE := {"vx": 205.0, "vy": -75.0, "fric": 950.0, "rest": 0.18}
## saque: segurando mais tempo, a bola sobe mais (até o limite)
const SERVE := {"v0": 150.0, "v1": 400.0, "max": 0.8, "back": 22.0}
## até onde, depois da rede, a mão ainda alcança a bola
const NETR := 7.0
## especial: força, ângulo permitido (negativo = para cima) e tempo máximo mirando
const SPEC := {"v": 760.0, "min": -40.0 * PI / 180.0, "max": 75.0 * PI / 180.0, "maxT": 3.0, "reach": 56.0}
const CHAR_K := 1.07           # personagens 7% maiores na quadra
## cortada no ar: o braço gira em volta do ombro
const SPK := {"T": 0.2, "L": 20.0, "sx": 4.9 * CHAR_K, "sy": -18.6 * CHAR_K, "e": 0.25, "grip": 0.55, "vmax": 460.0, "ph0": -82.0, "hand": 7.5, "chMax": 0.45, "Lmin": 17.0, "Lmax": 30.0}
## ponto ideal da bola para a cortada perfeita: à frente da testa
const SPK_F := {"x": 30.0, "y": -40.0}
## cortada do chão: o braço sobe por cima da cabeça e bate na bola de baixo para cima
const SPKG := {"T": 0.22, "L": 20.0, "sx": 8.4 * CHAR_K, "sy": -33.2 * CHAR_K, "ph0": -110.0, "vmax": 380.0, "hand": 7.5, "Lmin": 17.0, "Lmax": 28.0}

## a bola
class Bola:
	var x := 0.0
	var y := 0.0
	var vx := 0.0
	var vy := 0.0
	var spin := 0.0
	var ang := 0.0
	var net_hit := false
	var fire := 0.0
	var fire_t := 0.0
	func copia() -> Bola:
		var c := Bola.new()
		c.x = x; c.y = y; c.vx = vx; c.vy = vy; c.spin = spin; c.ang = ang; c.net_hit = net_hit; c.fire = fire; c.fire_t = fire_t
		return c

## um personagem (só o que a física usa)
class Jog:
	var x := 0.0
	var y := VGY
	var vx := 0.0
	var vy := 0.0
	var g := true          # no chão
	var hitT := 0.0
	var ph := 0.0          # fase do passo
	var sq := 0.0          # amassa / estica
	var dv = null          # peixinho: {t, dir, need, rest?}
	var hitA := 0.0
	var landT := 0.0
	var sw = null          # golpe: {t, hit, gnd, pow, hp?, L?, perfect?}
	var ch = null          # armando o golpe: {t}
	var swUsed := false
	var swCd := 0.0
	var spec := false
	var dvBuf := 0.0
	var hitF := false
	var saves := 0
	## o mesmo que newP do navegador (os outros campos ficam como estão)
	func novo(px: float) -> void:
		x = px; y = VGY; vx = 0.0; vy = 0.0; g = true; hitT = 0.0; ph = 0.0; sq = 0.0; dv = null; hitA = 0.0; landT = 0.0; sw = null; ch = null; swUsed = false
	func copia() -> Jog:
		var c := Jog.new()
		c.x = x; c.y = y; c.vx = vx; c.vy = vy; c.g = g; c.hitT = hitT
		return c

## um pedaço do braço na cortada (um segmento com espessura); a mão é a palma reta
class Pedaco:
	var sx := 0.0
	var sy := 0.0
	var ph := 0.0
	var w := 0.0
	var face := 1.0
	var L := 0.0
	var pvx := 0.0
	var pvy := 0.0
	var vmax := 0.0
	var ax := 0.0
	var ay := 0.0
	var bx := 0.0
	var by := 0.0
	var k0 := 0.0
	var k1 := 0.0
	var r := 0.0
	var hand := false
	var x := 0.0
	var y := 0.0
	var eff := 1.0

## igual ao clamp do navegador (Math.max(a, Math.min(b, v)))
static func cl(v: float, a: float, b: float) -> float:
	return maxf(a, minf(b, v))

## arredonda como o Math.round do navegador (meio para cima)
static func jsround(v: float) -> float:
	return floor(v + 0.5)

## um passo da bola: gravidade, efeito (a bola com giro faz curva), paredes e rede
static func ball_step(b: Bola, dt: float) -> void:
	b.vy += VG * dt
	# efeito Magnus: o giro empurra a bola de lado em relação ao caminho
	var k := 0.045 * b.spin
	b.vx += -k * b.vy * dt
	b.vy += k * b.vx * dt
	b.spin *= exp(-0.9 * dt)
	b.ang += b.spin * dt
	b.x += b.vx * dt
	b.y += b.vy * dt
	if b.x < VRB:
		b.x = VRB; b.vx = absf(b.vx) * 0.8; b.spin *= -0.6
	if b.x > W - VRB:
		b.x = W - VRB; b.vx = -absf(b.vx) * 0.8; b.spin *= -0.6
	if b.y < -70.0:
		b.y = -70.0; b.vy = absf(b.vy) * 0.5
	# poste da rede
	if b.y > VNT and absf(b.x - VNX) < VRB + 2.0:
		var sg := -1.0 if b.x < VNX else 1.0
		b.x = VNX + sg * (VRB + 2.0); b.vx = sg * maxf(40.0, absf(b.vx) * 0.5); b.spin *= 0.5
	# fita de cima: bate e espirra para um lado ou para o outro
	var dx := b.x - VNX
	var dy := b.y - VNT
	var d := sqrt(dx * dx + dy * dy)
	if d < VRB + 3.0 and d > 0.0:
		var nx := dx / d
		var ny := dy / d
		b.x = VNX + nx * (VRB + 3.0); b.y = VNT + ny * (VRB + 3.0)
		var vn := b.vx * nx + b.vy * ny
		if vn < 0.0:
			b.vx -= 1.55 * vn * nx; b.vy -= 1.55 * vn * ny; b.spin += nx * 3.0; b.net_hit = true

## voo da bola sem ninguém tocar, com a conta do ball_step feita em variáveis soltas (bem mais rápido; o resultado é o mesmo).
## dt é o passo da bola (com o "tempo" dela); o relógio (max_t e o tempo devolvido) anda em passos de 1/60 s.
## Anda até a bola chegar no chão ou o tempo acabar. lado: 0 = do lado esquerdo, 1 = do direito (para saber se cruzou a rede).
## Devolve [cruzou, ponto mais alto, velocidade ao cruzar, tempo, x final, y final]. A bola "b" fica onde parou.
static func voo(b: Bola, dt: float, max_t: float, lado: int, passos_max: int = -1) -> Array:
	var x := b.x
	var y := b.y
	var vx := b.vx
	var vy := b.vy
	var spin := b.spin
	var ang := b.ang
	var ex := exp(-0.9 * dt)
	var apex := y
	var cross := false
	var vc := 0.0
	var t2 := 0.0
	var n := 0
	while t2 < max_t:
		if passos_max >= 0 and n >= passos_max: break
		n += 1
		var was: bool = x > VNX if lado == 1 else x < VNX
		# ---- o mesmo que ball_step
		vy += VG * dt
		var k := 0.045 * spin
		vx += -k * vy * dt
		vy += k * vx * dt
		spin *= ex
		ang += spin * dt
		x += vx * dt
		y += vy * dt
		if x < VRB:
			x = VRB; vx = absf(vx) * 0.8; spin *= -0.6
		if x > W - VRB:
			x = W - VRB; vx = -absf(vx) * 0.8; spin *= -0.6
		if y < -70.0:
			y = -70.0; vy = absf(vy) * 0.5
		if y > VNT and absf(x - VNX) < VRB + 2.0:
			var sg := -1.0 if x < VNX else 1.0
			x = VNX + sg * (VRB + 2.0); vx = sg * maxf(40.0, absf(vx) * 0.5); spin *= 0.5
		var dx := x - VNX
		var dy := y - VNT
		var d := sqrt(dx * dx + dy * dy)
		if d < VRB + 3.0 and d > 0.0:
			var nx := dx / d
			var ny := dy / d
			x = VNX + nx * (VRB + 3.0); y = VNT + ny * (VRB + 3.0)
			var vn := vx * nx + vy * ny
			if vn < 0.0:
				vx -= 1.55 * vn * nx; vy -= 1.55 * vn * ny; spin += nx * 3.0
		# ----
		apex = minf(apex, y)
		var agora: bool = x > VNX if lado == 1 else x < VNX
		if was and not agora:
			cross = true; vc = sqrt(vx * vx + vy * vy)
		if y + VRB >= VGY: break
		t2 += DT
	b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.spin = spin; b.ang = ang
	return [cross, apex, vc, t2, x, y]

## pow (0,35 a 1): força da cortada. Mais força = giro mais rápido
static func swing_t(gnd: bool, pw: float = 0.6) -> float:
	return (SPKG.T if gnd else SPK.T) * (1.2 - 0.4 * pw)

## pose do braço no giro. L_fixo >= 0: comprimento já decidido; senão mede até a bola (bola null = 22)
static var _reuso: Array = [Pedaco.new(), Pedaco.new()]
## reusa = true: devolve sempre as mesmas duas peças (para as contas do Amiguinho, que não guardam a pose)
static func swing_pose(px: float, py: float, pvx: float, pvy: float, face: float, t: float, gnd: bool, pw: float, L_fixo: float, bola: Bola, reusa: bool = false) -> Array:
	var Ksx: float = SPKG.sx if gnd else SPK.sx
	var Ksy: float = SPKG.sy if gnd else SPK.sy
	var Kph0: float = SPKG.ph0 if gnd else SPK.ph0
	var Kvmax: float = SPKG.vmax if gnd else SPK.vmax
	var T := swing_t(gnd, pw)
	var L := 22.0
	if L_fixo >= 0.0:
		L = L_fixo
	elif bola != null:
		var ddx: float = bola.x - (px + face * Ksx)
		var ddy: float = bola.y - (py + Ksy)
		L = cl(sqrt(ddx * ddx + ddy * ddy) - 1.0, SPKG.Lmin if gnd else SPK.Lmin, SPKG.Lmax if gnd else SPK.Lmax)
	var s := cl(t / T, 0.0, 1.0)
	var ph: float = (Kph0 + 180.0 * (s - sin(TAU * s) / TAU)) * PI / 180.0
	var w := PI * (1.0 - cos(TAU * s)) / T
	var phd := ph * 180.0 / PI
	var eff := 1.0 if gnd else cl(0.4 + 0.6 * (phd + 50.0) / 65.0, 0.4, 1.0)  # bola em cima ou atrás: bate, mas sem força
	var sx: float = px + face * Ksx
	var sy: float = py + Ksy
	var vm: float = Kvmax * (0.8 + 0.3 * pw + 0.6 * maxf(0.0, pw - 0.75)) * eff
	var hc0 := sx + face * sin(ph) * L
	var hc1 := sy - cos(ph) * L
	# mira por cima da rede: o punho nunca aponta mais para baixo do que o necessário para a bola passar a fita
	var dxn := maxf(8.0, (VNX - hc0) * face)
	var drop := 0.5 * VG * pow(dxn / maxf(260.0, vm), 2.0)
	var clear := atan2(VNT - VRB - 7.0 - drop - hc1, dxn) * 180.0 / PI
	var base_a: float
	if gnd: base_a = -38.0 + 0.15 * phd
	elif phd < 0.0: base_a = 22.0 + 0.55 * phd
	else: base_a = 22.0 + 0.15 * phd
	var th := cl(minf(base_a, clear if dxn > 14.0 else 90.0), phd - (50.0 if gnd else 70.0), phd + 60.0) * PI / 180.0
	var ux := face * sin(th)
	var uy := -cos(th)
	var hw := 7.0
	var a: Pedaco = _reuso[0] if reusa else Pedaco.new()
	var b: Pedaco = _reuso[1] if reusa else Pedaco.new()
	for q in [a, b]:
		q.sx = sx; q.sy = sy; q.ph = ph; q.w = w; q.face = face; q.L = L; q.pvx = pvx; q.pvy = pvy; q.vmax = vm
	a.ax = hc0 - ux * hw; a.ay = hc1 - uy * hw; a.bx = hc0 + ux * hw; a.by = hc1 + uy * hw
	a.k0 = 1.0; a.k1 = 1.0; a.r = 5.0; a.hand = true; a.x = hc0; a.y = hc1; a.eff = eff
	b.ax = sx + face * sin(ph) * L * 0.35; b.ay = sy - cos(ph) * L * 0.35
	b.bx = sx + face * sin(ph) * L * 0.85; b.by = sy - cos(ph) * L * 0.85
	b.k0 = 0.35; b.k1 = 0.85; b.r = 3.5; b.x = b.bx; b.y = b.by; b.eff = 1.0
	return _reuso if reusa else [a, b]

## a bola está longe demais do ombro para o braço (mão + palma) encostar nela? Então nem precisa montar a pose:
## o resultado é o mesmo (spike_hit não faria nada), só fica mais rápido. Conta: braço até 30 + meia palma 7 + raio da mão 5 + bola.
static func braco_alcanca(b: Bola, px: float, py: float, face: float, gnd: bool) -> bool:
	var dx: float = b.x - (px + face * (SPKG.sx if gnd else SPK.sx))
	var dy: float = b.y - (py + (SPKG.sy if gnd else SPK.sy))
	var lim: float = (SPKG.Lmax if gnd else SPK.Lmax) + 7.0 + 5.0 + VRB + 1.0
	return dx * dx + dy * dy < lim * lim

## choque da bola com um pedaço do braço. Devolve Vector2(força, mão?1:0) ou Vector2(-1, 0) se não bateu.
## (como no navegador, a bola é empurrada para fora do braço mesmo quando não conta como batida)
static func spike_hit(b: Bola, P: Pedaco) -> Vector2:
	var ex := P.bx - P.ax
	var ey := P.by - P.ay
	var l2 := ex * ex + ey * ey
	var u := cl(((b.x - P.ax) * ex + (b.y - P.ay) * ey) / l2, 0.0, 1.0)
	var cx := P.ax + ex * u
	var cy := P.ay + ey * u
	var dx := b.x - cx
	var dy := b.y - cy
	var d := sqrt(dx * dx + dy * dy)
	var R0 := VRB + P.r
	if d >= R0 or d == 0.0:
		return Vector2(-1.0, 0.0)
	var nx := dx / d
	var ny := dy / d
	b.x = cx + nx * (R0 + 0.5); b.y = cy + ny * (R0 + 0.5)
	var kk := P.k0 + (P.k1 - P.k0) * u
	var pvx := P.pvx + P.face * cos(P.ph) * P.L * kk * P.w
	var pvy := P.pvy + sin(P.ph) * P.L * kk * P.w
	var ux := b.vx - pvx
	var uy := b.vy - pvy
	var un := ux * nx + uy * ny
	if un >= 0.0:
		return Vector2(-1.0, 0.0)
	var tx := -ny
	var ty := nx
	var ut := ux * tx + uy * ty
	if P.hand and u > 0.04 and u < 0.96:
		# bateu de chapa na palma: a bola sai para onde a palma aponta
		var spd: float = -un * (1.0 + SPK.e) * 0.9
		b.vx = nx * spd + tx * ut * 0.15; b.vy = ny * spd + ty * ut * 0.15
	else:
		b.vx -= (1.0 + SPK.e) * un * nx + SPK.grip * ut * tx
		b.vy -= (1.0 + SPK.e) * un * ny + SPK.grip * ut * ty
	b.spin = cl(b.spin * 0.3 - ut * 0.04, -12.0, 12.0)
	var sp := sqrt(b.vx * b.vx + b.vy * b.vy)
	if sp > P.vmax:
		b.vx *= P.vmax / sp; b.vy *= P.vmax / sp
	return Vector2(cl(-un / 420.0, 0.0, 1.0) * minf(1.0, kk) * P.eff, 1.0 if P.hand else 0.0)

## nível do adversário: 0 = bem fácil, 1 = quase perfeito
static var _cfgc := {}
static func lvl_cfg(L: float) -> Dictionary:
	L = jsround(cl(L, 0.0, 1.08) * 100.0) / 100.0
	if _cfgc.has(L):
		return _cfgc[L]
	var lp := func(a: float, b: float) -> float: return a + (b - a) * L
	var c := {"react": lp.call(0.36, 0.06), "err": lp.call(18.0, 1.2), "spd": lp.call(0.82, 1.18), "fwd": lp.call(0.12, 0.8), "block": lp.call(0.04, 0.85),
		"slip": 0.09 * pow(0.004 / 0.09, L), "iq": lp.call(0.2, 1.0), "dive": lp.call(0.05, 0.95), "spike": cl((L - 0.05) / 0.95, 0.0, 1.0) * 0.95,
		"set": cl((L - 0.3) / 0.7, 0.0, 1.0) * 0.8, "read": cl((L - 0.2) / 0.8, 0.0, 1.0), "lvl": L}
	_cfgc[L] = c
	return c
