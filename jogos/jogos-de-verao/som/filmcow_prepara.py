# Prepara os sons do FilmCow escolhidos em filmcow_opcoes.py: corta o silêncio do começo, corta no tamanho, faz o fim sumir,
# deixa mono 32 kHz, iguala o volume (batidas -20 dB, contínuos -24 dB, pico até -3) e devolve como dados prontos para a página
# (batidas em mp3 96k; contínuos em WAV, com o fim emendado no começo para repetir sem pulo).
import base64, io, subprocess, wave, glob, os
from pathlib import Path
import numpy as np
from scipy.signal import resample_poly
from filmcow_opcoes import OPCOES

FC = Path(os.environ.get('FILMCOW', '/home/claude/work/fc'))
SR = 32000
IDX = {Path(p).stem: p for p in glob.glob(str(FC / '**' / '*.wav'), recursive=True)}

def le(nome):
    with wave.open(IDX[nome]) as w:
        n, sr, ch, sw = w.getnframes(), w.getframerate(), w.getnchannels(), w.getsampwidth(); raw = w.readframes(n)
    if sw == 3:
        b = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 3).astype(np.int32); a = b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16); a = np.where(a >= 1 << 23, a - (1 << 24), a) / float(1 << 23)
    elif sw == 2: a = np.frombuffer(raw, dtype=np.int16) / 32768.
    else: a = np.frombuffer(raw, dtype=np.int32) / 2 ** 31
    a = a.reshape(-1, ch).mean(1).astype(np.float64)
    assert sr == 48000, (nome, sr)
    return resample_poly(a, 2, 3)

def apara(a, corte):
    thr = np.abs(a).max() * 10 ** (-40 / 20); i = np.argmax(np.abs(a) > thr); a = a[max(0, i - int(.004 * SR)):]
    j = len(a) - np.argmax(np.abs(a[::-1]) > np.abs(a).max() * 10 ** (-55 / 20)); a = a[:j]
    if corte and len(a) > corte * SR:
        a = a[:int(corte * SR)].copy(); f = min(len(a), int(.06 * SR)); a[-f:] *= np.linspace(1, 0, f) ** 2
    return a

def rms_ativo(a):
    q = int(SR * .02); e = np.array([np.sqrt(np.mean(a[i:i + q] ** 2)) for i in range(0, max(1, len(a) - q), q)])
    e = e[e > 10 ** (-45 / 20)]; return float(np.sqrt(np.mean(e ** 2))) if len(e) else 1e-6

def nivela(a, alvo):
    g = 10 ** (alvo / 20) / rms_ativo(a); p = np.abs(a).max() * g
    if p > 10 ** (-3 / 20): g *= 10 ** (-3 / 20) / p
    return a * g

def laco(a):
    thr = np.abs(a).max() * 10 ** (-40 / 20); idx = np.where(np.abs(a) > thr)[0]; a = a[idx[0]:idx[-1]]
    L = int(min(2.0, .6 * len(a) / SR) * SR); xf = int(.25 * SR); s0 = int(.2 * len(a))
    if s0 + L + xf > len(a): s0 = max(0, len(a) - L - xf)
    seg = a[s0:s0 + L + xf].copy(); out = seg[:L].copy(); t = np.linspace(0, 1, xf)
    out[:xf] = seg[:xf] * np.sqrt(t) + seg[L:L + xf] * np.sqrt(1 - t)
    return out

def wav64(a):
    b = io.BytesIO()
    with wave.open(b, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())
    return 'data:audio/wav;base64,' + base64.b64encode(b.getvalue()).decode()

def mp364(a):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()
    r = subprocess.run(['ffmpeg', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '96k', '-f', 'mp3', '-'], input=pcm, capture_output=True, check=True)
    return 'data:audio/mpeg;base64,' + base64.b64encode(r.stdout).decode()

def prepara():
    sons, opcoes = {}, {}
    for sid, ops in OPCOES.items():
        loop = sid.endswith('_loop'); lst = []
        for letra, nome, arqs, corte in ops:
            vs = []
            for k, arq in enumerate(arqs):
                if isinstance(arq, list):   # peça composta
                    partes = [(apara(le(n), c), t) for n, t, c in arq]; tot = max(int(t * SR) + len(p) for p, t in partes); a = np.zeros(tot)
                    for p, t in partes: i = int(t * SR); a[i:i + len(p)] += nivela(p, -20)
                else:
                    a = le(arq); a = laco(a) if loop else apara(a, corte)
                a = nivela(a, -24 if loop else -20); chave = f'fc_{sid}_{letra}_{k + 1}'
                sons[chave] = wav64(a) if loop else mp364(a); vs.append(chave)
            lst.append({'k': letra, 'nome': nome, 'v': vs, 'arq': [a if isinstance(a, str) else ' + '.join(n for n, _, _ in a) for a in arqs]})
        opcoes[sid] = lst
    return sons, opcoes

if __name__ == '__main__':
    s, o = prepara(); print(len(s), 'trechos,', sum(len(v) for v in s.values()) // 1024, 'KB')
