#!/usr/bin/env python3
"""Monta o Arcade: insere os jogos novos (novos/<id>.js) no index.html, antes de `const GAMES`.
uso: python3 montar.py            -> build/index.html com todos os jogos novos na ordem de ORDEM
     python3 montar.py <id> [...] -> build/<id>.html só com esses jogos novos (para testar)"""
import sys, pathlib
ORDEM = ['jato', 'ladeira', 'spoiler', 'loja', 'torre', 'disco', 'gancho', 'lobby', 'defesa', 'derruba']
base = pathlib.Path(__file__).parent
src = (base / 'index.html').read_text(encoding='utf-8')
ids = sys.argv[1:] or ORDEM
partes = []
for i in ids:
    f = base / 'novos' / f'{i}.js'
    if f.exists():
        partes.append(f'/* ============================================================ jogo novo: {i} */\n' + f.read_text(encoding='utf-8').strip() + '\n')
    else:
        print('faltando:', f)
marca = 'const GAMES = ['
assert src.count(marca) == 1
out = src.replace(marca, '\n'.join(partes) + '\n' + marca)
nome = 'index.html' if not sys.argv[1:] else '-'.join(ids) + '.html'
(base / 'build' / nome).write_text(out, encoding='utf-8')
print('ok:', base / 'build' / nome, len(partes), 'jogos novos')
