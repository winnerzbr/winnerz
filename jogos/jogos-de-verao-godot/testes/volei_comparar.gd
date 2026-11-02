extends Node2D
## Teste de comparação com o navegador: monta o vôlei em 4 momentos fixos (os mesmos que o script do navegador monta),
## desenha sem andar a física e tira uma foto de cada um (testes/fotos/volei_comparar_<momento>_godot.png).
## Depois, ferramenta de fora junta lado a lado com a foto do navegador.
## Rodar: xvfb-run -a -s "-screen 0 1280x720x24" godot --path . --rendering-driver opengl3 --resolution 1280x720 res://testes/volei_comparar.tscn

const F = preload("res://provas/volei/fisica.gd")
const PASTA := "res://testes/fotos/"
var v

## o mesmo estado que o navegador recebe (testes: volei_comparar.cjs)
static func monta(v, n: String) -> void:
	v.iniciar()
	v.mudo = true
	match n:
		"saque":
			v.t = 1.0
		"rali":
			v.state = "rally"; v.held = false; v.hits = 3; v.server = 0; v.tossT = 5.0; v.touches = [0, 1]; v.side = 1
			v.P[0].x = 120.0; v.P[0].y = F.VGY - 40.0; v.P[0].g = false; v.P[0].vy = -100.0
			v.P[1].x = 300.0
			v.b.x = 250.0; v.b.y = 90.0; v.b.vx = -80.0; v.b.vy = 50.0; v.b.ang = 1.3
			v.t = 2.3
		"cortada":
			v.state = "rally"; v.held = false; v.hits = 2; v.server = 0; v.tossT = 5.0; v.touches = [0, 1]; v.side = 1
			v.P[0].x = 90.0
			v.P[1].x = 240.0; v.P[1].y = F.VGY - 50.0; v.P[1].g = false; v.P[1].vy = -20.0; v.P[1].sw = {"t": 0.08, "hit": false, "gnd": false, "pow": 0.8}
			v.b.x = 222.0; v.b.y = 72.0; v.b.vx = -30.0; v.b.vy = 40.0; v.b.ang = 0.4
			v.t = 3.1
		"ponto":
			v.state = "point"; v.held = false; v.st = 0.5; v.lastW = 0; v.sc = [3, 2]; v.cheer = 1.0; v.hits = 4
			v.P[0].x = 110.0; v.P[1].x = 280.0
			v.b.x = 260.0; v.b.y = F.VGY - F.VRB; v.b.ang = 2.0
			v.t = 4.2
	v.tt = v.t

func _ready() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(PASTA))
	v = load("res://provas/volei/volei.tscn").instantiate()
	v.mudo = true
	add_child(v)
	v.scale = Vector2(3.2, 3.2)
	for n in ["saque", "rali", "cortada", "ponto"]:
		monta(v, n)
		v._cam = F.W / 2.0; v._cam_tt = v.tt
		for k in 4:
			v.redesenha()
			await get_tree().process_frame
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(ProjectSettings.globalize_path(PASTA + "volei_comparar_%s_godot.png" % n))
		print("foto ", n)
	get_tree().quit()
