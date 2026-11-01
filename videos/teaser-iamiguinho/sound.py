"""Som do teaser (feito em código, sem música): ambiente do galpão, máquinas ao longe, luz tremendo, passos do cientista,
o boné encaixando e a hélice girando, a tensão crescendo no close, o visor ligando e os olhos abrindo. Corte seco no fim.
A risada do cientista fica para um áudio gravado (voz do dono ou Fish Audio): lugar marcado em RISO.
Saída: teaser_som.wav (48 kHz, estéreo)."""
import numpy as np, wave
from scipy import signal
SR, T = 48000, 33.5
N = int(SR * T); rng = np.random.default_rng(3)
L = np.zeros(N); R = np.zeros(N)
RISO = 19.9  # onde entra a risada gravada
def sec(t): return int(t * SR)
def add(x, t, gain=1.0, pan=0.0):
    i = sec(t); n = min(len(x), N - i)
    if n <= 0: return
    gl, gr = gain * np.cos((pan + 1) * np.pi / 4), gain * np.sin((pan + 1) * np.pi / 4)
    L[i:i + n] += x[:n] * gl * 1.414; R[i:i + n] += x[:n] * gr * 1.414
def env(n, a, d):  # ataque e queda exponencial (segundos)
    t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def bp(x, f0, f1, o=2): b, a = signal.butter(o, [f0 / (SR / 2), f1 / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def lp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2)); return signal.lfilter(b, a, x)
def hp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)

# ---------- reverberação do galpão (cauda longa)
def ir(sec_len, seed):
    r = np.random.default_rng(seed); n = int(SR * sec_len); t = np.arange(n) / SR
    x = r.standard_normal(n) * np.exp(-t * 6.9 / sec_len); x = lp(x, 3500); x[:int(.012 * SR)] = 0; return x / np.sqrt((x ** 2).sum())
IRL, IRR = ir(2.6, 1), ir(2.6, 2)
WL = np.zeros(N); WR = np.zeros(N)   # o que vai para a reverberação
def addw(x, t, gain=1.0, pan=0.0, wet=.6):
    add(x, t, gain * (1 - wet * .5), pan)
    i = sec(t); n = min(len(x), N - i)
    if n > 0: WL[i:i + n] += x[:n] * gain * wet * (1 - pan) / 2 * 2; WR[i:i + n] += x[:n] * gain * wet * (1 + pan) / 2 * 2

# ---------- ambiente: zumbido elétrico e ar do galpão
t = np.arange(N) / SR
hum = sum(np.sin(2 * np.pi * f * t) * a for f, a in ((50, 1), (100, .5), (150, .22), (200, .1))) * (1 + .08 * np.sin(2 * np.pi * .13 * t))
air = lp(rng.standard_normal(N), 260) * 3.5
amb = (hum * .012 + air * .02) * np.clip(t / 2.5, 0, 1)
# no close, o ar abaixa um pouco e entra um grave de tensão
amb *= np.where(t < 24.6, 1, np.clip(1 - (t - 24.6) / 3, .55, 1))
L += amb; R += amb
# esteiras rolando ao longe (só nos planos do galpão)
belt = lp(rng.standard_normal(N), 120) * (1 + .5 * np.sin(2 * np.pi * 7.3 * t)) * .05 * np.clip(t / 3, 0, 1) * np.clip((14.6 - t) / 2, 0, 1)
L += belt * .8; R += belt

# ---------- máquinas ao longe: batidas metálicas com eco
def clank(seed):
    r = np.random.default_rng(seed); n = int(SR * 1.2); tt = np.arange(n) / SR
    parts = sum(np.sin(2 * np.pi * f * tt + r.random() * 6) * np.exp(-tt * d) * a for f, d, a in ((r.uniform(280, 340), 6, 1), (r.uniform(510, 560), 8, .7), (r.uniform(830, 880), 11, .5), (r.uniform(1190, 1260), 14, .35)))
    hit = bp(r.standard_normal(n), 600, 3500) * np.exp(-tt * 60)
    return (parts * .5 + hit) * .9
for i, tc in enumerate((1.6, 4.1, 6.8, 9.9, 12.7, 16.2, 22.8)):
    addw(clank(i), tc, .05 + .02 * (i % 2), pan=(-.6, .5, -.2, .7, -.5, .4, -.7)[i], wet=.95)

# ---------- luz tremendo: zumbido curto
def buzz(dur, amp=1):
    n = int(SR * dur); tt = np.arange(n) / SR; x = signal.square(2 * np.pi * 120 * tt) * .3 + bp(rng.standard_normal(n), 2000, 6000) * .5
    return x * env(n, .003, dur / 2.5) * amp
for t0 in (2.3, 5.9, 10.7, 12.1, 17.4, 21.6, 26.2): addw(buzz(.3), t0, .035, pan=.3, wet=.4)

# ---------- passos do cientista (sapato no piso de concreto), entrando e saindo
def step(seed):
    r = np.random.default_rng(seed); n = int(SR * .35); tt = np.arange(n) / SR
    heel = bp(r.standard_normal(n), 1400, 5200) * np.exp(-tt * 140); thud = np.sin(2 * np.pi * 85 * tt) * np.exp(-tt * 38)
    sole = bp(r.standard_normal(n), 300, 1600) * np.exp(-((tt - .05) / .03) ** 2) * .35
    return heel * .8 + thud * .6 + sole
k = 0
for t0 in np.arange(14.8, 17.0, .28):
    g = .08 + .17 * min(1, (t0 - 14.8) / 2.0); addw(step(k), t0, g, pan=.7 - .5 * (t0 - 14.8) / 2.2, wet=.55); k += 1
addw(step(99), 17.02, .2, pan=.2, wet=.5)   # para
for t0 in np.arange(20.1, 22.4, .28):
    g = .25 - .2 * min(1, (t0 - 20.1) / 2.2); addw(step(k), t0, g, pan=.25 + .6 * (t0 - 20.1) / 2.2, wet=.55); k += 1
# jaleco: um farfalhar quando ele levanta e abaixa os braços
def swish(dur):
    n = int(SR * dur); tt = np.arange(n) / SR; x = bp(rng.standard_normal(n), 900, 5000) * np.sin(np.pi * tt / dur) ** 2; return x
for t0 in (17.85, 18.65, 19.55): addw(swish(.45), t0, .05, pan=.2, wet=.3)

# ---------- o boné encaixando e a hélice dando umas voltinhas
def toc():
    n = int(SR * .4); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * 920 * tt) * np.exp(-tt * 45) + np.sin(2 * np.pi * 2240 * tt) * np.exp(-tt * 70) * .6 + bp(rng.standard_normal(n), 1000, 4000) * np.exp(-tt * 200) * .6)
addw(toc(), 19.5, .32, pan=-.05, wet=.35)
ts = 19.62; gap = .045
while ts < 20.5:
    n = int(SR * .02); tt = np.arange(n) / SR; c = bp(rng.standard_normal(n), 2500, 7000) * np.exp(-tt * 400)
    addw(c, ts, .09 * (1 - (ts - 19.62) / 1.0), pan=-.05, wet=.2); ts += gap; gap *= 1.18

# ---------- close: tensão, a luz do visor tentando ligar, ligando, e os olhos abrindo
tt = np.arange(sec(29.0) - sec(24.6)) / SR
drone = (np.sin(2 * np.pi * 41 * tt) * .6 + np.sin(2 * np.pi * 61.5 * tt) * .3 + lp(rng.standard_normal(len(tt)), 180) * 1.5) * (tt / tt[-1]) ** 1.6 * .05
add(drone, 24.6, 1.0)
for t0, d in ((28.6, .07), (28.8, .05)): addw(buzz(d, 1.4), t0, .09, wet=.25)
n = int(SR * 1.3); tt = np.arange(n) / SR; f = 60 + 360 * (1 - np.exp(-tt * 3.2)); ph = 2 * np.pi * np.cumsum(f) / SR
sweep = (np.sin(ph) + .4 * np.sin(2 * ph) + .2 * np.sin(3.01 * ph)) * np.minimum(1, tt / .05) * np.exp(-np.maximum(0, tt - .55) * 2.2)
shimmer = bp(rng.standard_normal(n), 3000, 9000) * np.minimum(1, tt / .3) * np.exp(-tt * 2.5) * .15
addw(sweep * .16 + shimmer, 29.0, 1.0, wet=.4)
tt = np.arange(sec(31.8) - sec(29.5)) / SR; screen = np.sin(2 * np.pi * 180 * tt) * .006 + np.sin(2 * np.pi * 360 * tt) * .003; add(screen, 29.5)
def blip(f, d):
    n = int(SR * .5); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + .3 * np.sin(2 * np.pi * 2 * f * tt)) * env(n, .004, d)
addw(blip(1046.5, .09), 30.2, .11, pan=-.15, wet=.5); addw(blip(1568, .14), 30.31, .1, pan=.15, wet=.5)

# ---------- reverberação e corte seco no fim
L += signal.fftconvolve(WL, IRL)[:N] * .9; R += signal.fftconvolve(WR, IRR)[:N] * .9
cut = sec(31.8); L[cut:] = 0; R[cut:] = 0
fade = np.clip(np.arange(N) / SR / 1.5, 0, 1); L *= fade; R *= fade
pk = max(np.abs(L).max(), np.abs(R).max()); L, R = L / pk * .89, R / pk * .89
st = np.stack([L, R], 1); st = (st * 32767).astype(np.int16)
with wave.open('teaser_som.wav', 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print('ok teaser_som.wav', round(N / SR, 1), 's · pico normalizado')
