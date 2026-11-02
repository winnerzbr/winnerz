extends Node
## Teste automático do vôlei (sem tela): várias partidas com os dois lados jogando sozinhos.
## Você = o cérebro antigo com a ficha "bot" (a mesma do teste vlv3 do navegador); Amiguinho Rosa = o cérebro novo (nível 0,45).
## Mostra o placar de cada partida, quantos ralis, o maior rali, cortadas, peixinhos e a pontuação, e confere que toda partida acaba.
## Rodar: godot --headless --path . res://testes/sim_volei.tscn   (número de partidas: -- 20)

const F = preload("res://provas/volei/fisica.gd")
const CE = preload("res://provas/volei/cerebro.gd")
const BOT := {"react": 0.14, "err": 4.0, "spd": 1.0, "fwd": 0.5, "block": 0.4, "slip": 0.015, "iq": 0.9, "dive": 0.5, "spike": 0.0, "set": 0.0, "read": 0.0}

func _ready() -> void:
	var N := 20
	for a in OS.get_cmdline_user_args():
		if a.is_valid_int(): N = int(a)
	var v = load("res://provas/volei/volei.tscn").instantiate()
	v.mudo = true
	add_child(v)
	var R := []
	var t0 := Time.get_ticks_msec()
	var tj := 0.0
	var pior := 0.0
	var lentos := [0, 0, 0]  # passos acima de 8, 16 e 33 ms
	for m in N:
		v.iniciar()
		var A := {"t": 0.0, "tx": 70.0}
		var t := 0.0
		while v.state != "over" and t < 900.0:
			var c := CE.cerebro_antigo(v, 0, F.DT, A, BOT)
			var I := {"l": c.l, "r": c.r, "u": c.u, "a": false, "ax": c.ax, "pd": c.d, "d": c.d, "pc": c.sp, "auto": true}
			var q0 := Time.get_ticks_usec()
			v.t += F.DT; v.passo(F.DT, I); t += F.DT
			var dq := (Time.get_ticks_usec() - q0) / 1000.0
			pior = maxf(pior, dq)
			if dq > 8.0: lentos[0] += 1
			if dq > 16.0: lentos[1] += 1
			if dq > 33.0: lentos[2] += 1
		var acabou: bool = v.state == "over"
		while v.state == "over":
			v.t += F.DT; t += F.DT
			if v.passo(F.DT, {}): break
		tj += t
		var r := {"sc": v.sc.duplicate(), "ralis": v.rallies, "maior": v.longest, "cortadas": v.cortadas.duplicate(), "rapidas": v.rapidas.duplicate(), "peixes": v.peixes.duplicate(), "pontos": v.pontos, "s": roundi(t), "acabou": acabou}
		R.append(r)
		print(JSON.stringify(r))
	var ms := float(Time.get_ticks_msec() - t0)
	var med := func(f: Callable) -> String:
		var s := 0.0
		for r in R: s += f.call(r)
		return "%.2f" % (s / R.size())
	var venceu := 0
	var acabaram := 0
	for r in R:
		if r.sc[0] > r.sc[1]: venceu += 1
		if r.acabou: acabaram += 1
	print("partidas %d (acabaram %d) · você venceu %d · média de pontos (você %s x %s Rosa) · ralis %s · maior rali %s · cortadas Rosa %s · peixinhos (%s, %s) · rápidas (%s, %s) · pontuação %s · %s s/partida · %.2f ms de cálculo por s de jogo · passo mais lento %.1f ms · passos acima de 8/16/33 ms: %s de %d" % [
		R.size(), acabaram, venceu, med.call(func(r): return r.sc[0]), med.call(func(r): return r.sc[1]), med.call(func(r): return r.ralis), med.call(func(r): return r.maior),
		med.call(func(r): return r.cortadas[1]), med.call(func(r): return r.peixes[0]), med.call(func(r): return r.peixes[1]), med.call(func(r): return r.rapidas[0]), med.call(func(r): return r.rapidas[1]),
		med.call(func(r): return r.pontos), med.call(func(r): return r.s), ms / tj, pior, lentos, int(tj * 60.0)])
	get_tree().quit()
