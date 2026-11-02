"""Corta o arquivo de sons do jogo do navegador (musica/sons.mp3 + som/sons.json, feitos por som/jogo_sons.py com os sons que o
dono escolheu) em um WAV por som, na pasta sons/ do projeto Godot. Os contínuos (_loop) saem com o trecho exato que repete.
Uso: python3 ferramentas/sons.py <sons.mp3> <sons.json>"""
import json, subprocess, sys, wave
from pathlib import Path
import numpy as np
mp3, js = sys.argv[1], sys.argv[2]
SR = 32000
pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', mp3, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
a = np.frombuffer(pcm, np.int16)
dst = Path(__file__).resolve().parent.parent / 'sons'; dst.mkdir(exist_ok=True)
for f in dst.glob('*.wav'): f.unlink()
for nome, (t0, dur, loop) in json.load(open(js)).items():
    i0, n = int(round(t0 * SR)), int(round(dur * SR)); x = a[i0:i0 + n].copy()
    if not loop:  # fim suave (2 ms) para não estalar
        f = min(len(x), 64); x[-f:] = (x[-f:] * np.linspace(1, 0, f)).astype(np.int16)
    with wave.open(str(dst / f'{nome}.wav'), 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(x.tobytes())
print(len(list(dst.glob('*.wav'))), 'sons em', dst)
