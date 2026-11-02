# Junta os sons de desenho ESCOLHIDOS pelo dono (escolhas.json, lido da página "Sons de Desenho", coleção "escolha") num arquivo só
# para o jogo: ../jogos_verao/musica/sons.mp3 + sons.json ({nome: [início, duração, contínuo]}).
# Origem de cada escolha: "atual" = 1ª rodada em código (out_c), "N1/N2/N3" = 2ª rodada (out_c2, n2_/n3_/n4_), "A/B/C" = FilmCow (filmcow_opcoes.py).
# "nenhum" ou vazio = o som fica de fora. Igual à página: mono 32 kHz, batidas -20 dB, contínuos -24 dB, pico até -3 dB.
# Os contínuos entram duas vezes seguidas e o jogo repete o trecho do meio (a emenda não depende do atraso do mp3).
import json, re, subprocess, wave, sys
from pathlib import Path
import numpy as np
from scipy.signal import resample_poly
AQUI = Path(__file__).resolve().parent; sys.path.insert(0, str(AQUI))
from filmcow_opcoes import OPCOES
import filmcow_prepara as fp

SR = 32000
def chirp(p):
    with wave.open(str(p)) as w: a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768; ch = w.getnchannels(); sr = w.getframerate()
    assert sr == 44100; return resample_poly(a.reshape(-1, ch).mean(1), 320, 441)

def variantes(pasta, base):
    fs = sorted((AQUI / pasta / 'sfx').glob('*.wav'))
    exato = [f for f in fs if f.stem == base]
    return exato or sorted([f for f in fs if re.fullmatch(re.escape(base) + r'_\d+', f.stem)], key=lambda f: int(f.stem.rsplit('_', 1)[1]))

def clipes(sid, op):
    loop = sid.endswith('_loop')
    if op == 'atual': return [chirp(f) for f in variantes('out_c', sid)]
    if op[0] == 'N': return [chirp(f) for f in variantes('out_c2', f'n{int(op[1]) + 1}_{sid}')]
    letra, nome, arqs, corte = next(o for o in OPCOES[sid] if o[0] == op); out = []
    for arq in arqs:
        if isinstance(arq, list):
            partes = [(fp.apara(fp.le(n), c), t) for n, t, c in arq]; tot = max(int(t * SR) + len(p) for p, t in partes); a = np.zeros(tot)
            for p, t in partes: i = int(t * SR); a[i:i + len(p)] += fp.nivela(p, -20)
        else: a = fp.le(arq); a = fp.laco(a) if loop else fp.apara(a, corte)
        out.append(a)
    return out

esc = json.loads((AQUI / 'escolhas.json').read_text())
partes, mapa, t = [], {}, 0.0
gap = np.zeros(int(SR * .08)); partes.append(gap); t += len(gap) / SR
fora = []
for sid, op in esc.items():
    if not op or op == 'nenhum': fora.append(sid); continue
    cs = clipes(sid, op); assert cs, (sid, op); loop = sid.endswith('_loop')
    for k, a in enumerate(cs):
        a = fp.nivela(a, -24 if loop else -20); nome = sid if len(cs) == 1 else f'{sid}_{k + 1}'
        if loop:
            L = len(a) / SR; a2 = np.concatenate([a, a]); mapa[nome] = [round(t + L / 2, 4), round(L, 4), 1]; partes.append(a2); t += len(a2) / SR
        else:
            mapa[nome] = [round(t, 4), round(len(a) / SR, 4), 0]; partes.append(a); t += len(a) / SR
        partes.append(gap); t += len(gap) / SR
x = np.concatenate(partes); pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()
dst = AQUI.parent / 'jogos_verao' / 'musica' / 'sons.mp3'
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '96k', str(dst)], input=pcm, check=True)
(AQUI / 'sons.json').write_text(json.dumps(mapa))
print(len(mapa), 'trechos,', round(t, 1), 's,', dst.stat().st_size // 1024, 'KB; de fora:', fora)
