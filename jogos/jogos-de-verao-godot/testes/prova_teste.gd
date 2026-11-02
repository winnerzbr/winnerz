extends Prova
## Prova de teste da base (só para os testes automáticos): uma bola quicando; ✕ pula; acaba em 3 s.
var y := 100.0
var vy := 0.0
func iniciar() -> void: y = 100.0; vy = 0.0; pontos = 0
func explicacao() -> String: return "Prova de teste da base. Espaço pula."
func passo(dt: float, I: Dictionary) -> bool:
	vy += 600 * dt; y += vy * dt
	if y > 180: y = 180; vy = -vy * 0.7; Som.toca("quique")
	if I.pa: vy = -250; pontos += 100; pop("+100", 200, y - 20, Jogo.OURO); Som.toca("pulo")
	if t > 1.0 and t - 1.0 < 1.0 / 60.0: banner("Faixa do meio")
	return t > 3.0
func desenhar(_tt: float) -> void:
	grad_rect(0, 0, W, H, [Color("5bb7ff"), Color("ffd9a8")])
	R(0, 190, W, 35, Color("e8c48a"))
	circle(200, y, 10, Color("ff8a3c"))
	text("Base do Godot", 200, 40, Color.WHITE, 14, "c", 2)
func hud() -> Array: return [["Pontos", Jogo.nf(pontos), true], ["Tempo", "%ds" % ceil(3 - t), false], ["", "", false], ["", "", false]]
func estatisticas() -> Array: return ["3 segundos", "%d pulos" % (pontos / 100)]
