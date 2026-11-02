"""Junta os efeitos feitos em código (foley.cx.js -> out/sfx/*.wav) num arquivo só: ../jogos_verao/musica/foley.mp3 + foley.json.
Cada som vira mono e é igualado pelo volume médio (RMS): batidas e passos em -20 dB, sons contínuos (loop) em -24 dB, com o pico no
máximo em -2 dB. O jogo ajusta o volume de cada um na hora. Os loops entram duas vezes seguidas e o jogo repete o trecho do meio
(assim, se o arquivo comprimido atrasar uns milissegundos no começo, a emenda continua perfeita)."""
import numpy as np, wave, glob, os, json, subprocess, sys
SR = 44100
def rd(p):
    with wave.open(p) as w: a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768; ch = w.getnchannels()
    return a.reshape(-1, ch).mean(1)
out, mapa, t = [], {}, 0.0
gap = np.zeros(int(SR * .08), np.float32); out.append(gap); t += len(gap) / SR
for p in sorted(glob.glob('out/sfx/*.wav')):
    nm = os.path.basename(p)[:-4]; a = rd(p); lp = nm.endswith('_loop')
    rms = np.sqrt(np.mean(a ** 2)) + 1e-9; alvo = 10 ** ((-24 if lp else -20) / 20); g = alvo / rms
    g = min(g, 10 ** (-2 / 20) / (np.abs(a).max() + 1e-9)); a = a * g
    if lp:
        L = len(a) / SR; a2 = np.concatenate([a, a]); mapa[nm] = [round(t + L / 2, 4), round(L, 4), 1]; out.append(a2); t += len(a2) / SR
    else:
        mapa[nm] = [round(t, 4), round(len(a) / SR, 4), 0]; out.append(a); t += len(a) / SR
    out.append(gap); t += len(gap) / SR
x = np.concatenate(out); pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
with wave.open('foley.wav', 'w') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
dst = 'foley.mp3'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', 'foley.wav', '-codec:a', 'libmp3lame', '-b:a', '96k', dst], check=True)
json.dump(mapa, open('foley.json', 'w'))
print(len(mapa), 'sons', round(t, 1), 's', os.path.getsize(dst) // 1024, 'KB')
