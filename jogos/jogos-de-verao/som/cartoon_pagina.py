# Página para o dono ouvir e testar os sons de desenho animado (02/11/2026).
# Lê os WAVs do chirp (out_c/sfx), iguala o volume, embute tudo (WAV mono 32 kHz em base64) e escreve sons_desenho/index.html.
# Uso: python3 cartoon_pagina.py   (depois de: node ~/.game-tools/chirp/bin/chirp.js build cartoon.cx.js --no-preview --out out_c)
import base64, io, json, re, wave
from pathlib import Path
import numpy as np
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from cartoon_prompts import P as PROMPTS, ESTILO
from filmcow_prepara import prepara as prepara_fc
from scipy.signal import resample_poly

AQUI = Path(__file__).resolve().parent
SFX = AQUI / 'out_c' / 'sfx'
SAIDA = AQUI / 'sons_desenho'
SR = 32000

def le(p):
    with wave.open(str(p)) as w:
        n, ch, sr = w.getnframes(), w.getnchannels(), w.getframerate()
        a = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
    a = a.reshape(-1, ch).mean(axis=1)
    assert sr == 44100, sr
    return resample_poly(a, 320, 441), SR

def rms_ativo(a):
    q = int(SR * 0.02); fr = [a[i:i + q] for i in range(0, max(1, len(a) - q), q)]
    e = np.array([np.sqrt(np.mean(f ** 2)) for f in fr if len(f)])
    e = e[e > 10 ** (-45 / 20)]
    return float(np.sqrt(np.mean(e ** 2))) if len(e) else 1e-6

def wav64(a):
    b = io.BytesIO()
    with wave.open(b, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())
    return 'data:audio/wav;base64,' + base64.b64encode(b.getvalue()).decode()

# alvo de volume: batidas -20 dB, contínuos -24 dB, pico até -3 dB
sons = {}
for p in sorted(SFX.glob('*.wav')):
    nome = p.stem; a, _ = le(p)
    alvo = -24 if nome.endswith('_loop') else -20
    g = 10 ** (alvo / 20) / rms_ativo(a)
    pico = np.max(np.abs(a)) * g
    if pico > 10 ** (-3 / 20): g *= 10 ** (-3 / 20) / pico
    sons[nome] = wav64(a * g)

# fichas: nome amigável, como soa, onde toca, se é contínuo (com velocidade)
FICHAS = [
  ('Pés', [
    ('passo_tip', 'Passinho na ponta do pé', 'tip-tap', 'Basquete, Pingue-pongue, Half-pipe (andando no chão firme)'),
    ('passo_areia', 'Passo na areia', 'puf', 'Corrida, Vôlei, Futebol, Embaixadinha, Bocha, Frisbee'),
    ('passo_fofo', 'Areia fofa', 'squish', 'Corrida (montinhos de areia fofa)'),
    ('passo_poca', 'Pisando na poça', 'ploc', 'Corrida (poças)'),
    ('plof', 'Amiguinho andando', 'bloop', 'Todas as provas com Amiguinhos'),
  ]),
  ('Corpo', [
    ('pulo', 'Pulo', 'fiuuu (apito subindo)', 'Corrida, Vôlei, Basquete, Futebol'),
    ('pulo_boing', 'Pulo de mola', 'boing', 'Outra opção para o pulo'),
    ('pouso', 'Pouso', 'pof', 'Corrida, Vôlei, Basquete, Half-pipe, BMX'),
    ('tombo', 'Tombo', 'fiuuu… bonk! + estrelinhas', 'Corrida, BMX, Skate, Patins, Surfe'),
    ('bonk', 'Batida na cabeça', 'bonk', 'Bola na cabeça, trombadas'),
    ('estrelinhas', 'Estrelinhas', 'plim-plim-plim', 'Tontura (Teco-teco, depois de um tombo)'),
    ('whoosh', 'Vento rápido', 'fiu', 'Arremessos, manobras, chutes'),
    ('derrapada', 'Derrapada', 'skrrrt', 'Bugue, BMX, Patins'),
  ]),
  ('Rodas e manobras', [
    ('rodas_loop', 'Rodinhas rolando', 'rrrrr', 'Skate, Patins, BMX', 1),
    ('grind_loop', 'Deslizando no corrimão', 'zzzzt', 'Skate, Patins', 1),
    ('catraca_loop', 'Catraca da bike', 'tic-tic-tic', 'BMX (sem pedalar)', 1),
    ('ollie', 'Ollie', 'pop!', 'Half-pipe (skate)'),
    ('manobra', 'Manobra feita', 'zing!', 'Half-pipe, BMX, Patins, Surfe'),
    ('pouso_skate', 'Pouso do skate', 'tác-toc', 'Half-pipe, Patins'),
  ]),
  ('Água', [
    ('splash', 'Splash', 'splash! + bolhinhas', 'Surfe, Canoagem, Jet ski, Natação'),
    ('splash_grande', 'Splash grande', 'SPLASH!', 'Quedas na água, Teco-teco no mar'),
    ('bolhas', 'Bolhas', 'blup-blup', 'Natação, Surfe (embaixo d’água)'),
    ('mergulho', 'Mergulho', 'bloop', 'Natação (largada), Surfe (caiu)'),
    ('remada', 'Remada', 'plac-ploc', 'Canoagem'),
    ('bracada', 'Braçada', 'splish', 'Natação'),
    ('jato_loop', 'Pistola d’água', 'pssshh', 'Duelo de água, Teco-teco', 1),
    ('splat', 'Bexiga d’água acertando', 'splat!', 'Duelo de água, Teco-teco'),
  ]),
  ('Motores', [
    ('motor_bugue_loop', 'Motor do bugue', 'brrrum', 'Corrida de bugue', 1),
    ('motor_jetski_loop', 'Motor do jet ski', 'nheeem', 'Jet ski', 1),
    ('motor_aviao_loop', 'Hélice do teco-teco', 'brrrrrr', 'Teco-teco d’Água', 1),
    ('vrum', 'Acelerada', 'vruuum!', 'Bugue, Jet ski (largada)'),
    ('turbo', 'Turbo', 'zuiiim!', 'Bugue, Jet ski, Teco-teco'),
    ('buzina', 'Buzina de palhaço', 'fon-fon', 'Bugue (ultrapassando)'),
    ('batida', 'Batida', 'crash-bonk-boing', 'Bugue, Jet ski, Canoagem'),
  ]),
  ('Bolas', [
    ('quique', 'Quique da bola', 'dum', 'Basquete'),
    ('aro', 'Bola no aro', 'dlonnng', 'Basquete'),
    ('rede', 'Cesta', 'chuá', 'Basquete'),
    ('tabela', 'Tabela', 'tonk', 'Basquete'),
    ('toque', 'Toque na bola', 'pom', 'Vôlei, Embaixadinha'),
    ('chute', 'Chute', 'PAF!', 'Futebol, Embaixadinha'),
    ('trave', 'Bola na trave', 'doinnng', 'Futebol'),
    ('bola_areia', 'Bola caindo na areia', 'puf', 'Vôlei, Futebol, Embaixadinha'),
    ('ping_mesa', 'Bolinha na mesa', 'pic', 'Pingue-pongue'),
    ('ping_raquete', 'Bolinha na raquete', 'poc', 'Pingue-pongue'),
    ('bocha_bate', 'Bolas da bocha batendo', 'toc!', 'Bocha'),
    ('rolar_loop', 'Bocha rolando', 'rrrr macio', 'Bocha', 1),
  ]),
  ('Arco, disco e balões', [
    ('corda_puxa', 'Puxando a corda', 'nhééééc', 'Tiro com arco'),
    ('corda_solta', 'Soltando a flecha', 'tuoing!', 'Tiro com arco'),
    ('flecha_alvo', 'Flecha no alvo', 'tchoc + oing-oing', 'Tiro com arco'),
    ('balao_estoura', 'Balão estourando', 'POP!', 'Tiro com arco, Teco-teco'),
    ('balao_murcha', 'Balão murchando', 'fffrrrt', 'Teco-teco (bexiga errou)'),
    ('disco_voo', 'Disco voando', 'fiuuuuu', 'Frisbee'),
    ('pegou', 'Pegou!', 'plim', 'Frisbee, argolas do Teco-teco'),
  ]),
  ('Placar e festa', [
    ('contagem', 'Contagem', 'tum', '3, 2, 1… de todas as provas'),
    ('contagem_vai', 'Vai!', 'tlim!', 'Largada de todas as provas'),
    ('apito', 'Apito', 'priiii', 'Futebol, Vôlei, Natação, Corrida'),
    ('ponto', 'Ponto', 'plim-plim', 'Todas as provas'),
    ('encostou', 'Encostou!', 'tlim', 'Bocha'),
    ('palminhas', 'Palminhas', 'clap-clap', 'Ponto bonito, fim de prova'),
    ('tada', 'Ta-dá!', 'xilofone subindo', 'Recorde, medalha'),
    ('vitoria', 'Vitória', 'fanfarra de kazoo', 'Vencer a prova'),
    ('wah_wah', 'Derrota', 'uá-uá-uá-uááá', 'Perder a prova'),
  ]),
]

FC_SONS, FC_OPS = prepara_fc()
# 2ª rodada em código (out_c2): os que o dono marcou "Nenhuma serve"; viram as opções "Novo 1/2/3" (n2_, n3_, n4_)
NOVOS = {}
for p in sorted((AQUI / 'out_c2' / 'sfx').glob('*.wav')):
    nome = p.stem; a, _ = le(p); alvo = -24 if nome.endswith('_loop') else -20
    g = 10 ** (alvo / 20) / rms_ativo(a); pico = np.max(np.abs(a)) * g
    if pico > 10 ** (-3 / 20): g *= 10 ** (-3 / 20) / pico
    sons[nome] = wav64(a * g)
    m = re.match(r'n(\d)_(.+?)(?:_(\d+))?$', nome); NOVOS.setdefault(m.group(2), {}).setdefault(int(m.group(1)), []).append(nome)
grupos = []
for titulo, itens in FICHAS:
    g = []
    for it in itens:
        sid, nome, como, onde = it[:4]; cont = len(it) > 4
        vs = sorted([k for k in sons if re.fullmatch(re.escape(sid) + r'(_\d+)?', k) and (k == sid or not k.endswith('_loop'))],
                    key=lambda k: int(re.search(r'_(\d+)$', k).group(1)) if re.search(r'_(\d+)$', k) else 0)
        assert vs, sid
        pr, seg = PROMPTS[sid]
        novos = [{'k': f'N{n - 1}', 'nome': f'Novo {n - 1}', 'v': sorted(v), 'arq': []} for n, v in sorted(NOVOS.get(sid, {}).items())]
        ops = [{'k': 'atual', 'nome': 'Feito em código', 'v': vs, 'arq': []}] + novos + FC_OPS.get(sid, [])
        g.append({'id': sid, 'nome': nome, 'como': como, 'onde': onde, 'loop': cont, 'ops': ops, 'prompt': pr + ' ' + ESTILO, 'seg': seg})
    grupos.append({'t': titulo, 'itens': g})
usados = {v for g in grupos for i in g['itens'] for v in i['ops'][0]['v']}
sons.update(FC_SONS)
assert not set(FC_OPS) - {i['id'] for g in grupos for i in g['itens']}
faltam = {k for k in sons if not k.startswith('fc_') and not re.match(r'n\d_', k)} - usados
assert set(NOVOS) <= {i['id'] for g in grupos for i in g['itens']}, set(NOVOS)
assert not faltam, faltam

html = (AQUI / 'cartoon_pagina.html').read_text(encoding='utf-8')
html = html.replace('/*__GRUPOS__*/null', json.dumps(grupos, ensure_ascii=False)).replace('/*__SONS__*/null', json.dumps(sons))
SAIDA.mkdir(exist_ok=True); (SAIDA / 'index.html').write_text(html, encoding='utf-8')
print('sons', len(sons), 'fichas', sum(len(g['itens']) for g in grupos), 'página', len(html) // 1024, 'KB')
