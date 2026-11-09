#!/usr/bin/env python3
"""Monta os quadros do canvas: cada página do site em cada direção de design, no modo escuro e no claro."""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/canvas/project'
BASE = open(os.path.join(HERE, 'themes/base.css'), encoding='utf-8').read()

THEMES = {
    'F': ('Fresta 2', 'Fresta'),
    'M': ('Monolito', 'Mono'),
    'L': ('Letreiro', 'Letreiro'),
    'N': ('Anamórfico', 'Anamorfico'),
    'I': ('Impacto', 'Impacto'),
    'G': ('Ímã', 'Ima'),
    'T': ('Transmissão', 'Transmissao'),
    'C': ('Cromo', 'Cromo'),
    'X': ('Impacto + Ímã', 'ImpactoIma'),
    'Y': ('Impacto + Ímã com contorno', 'ImpactoImaContorno'),
    'P': ('Pincel', 'Pincel'),
    'S': ('Figurinha', 'Figurinha'),
    'E': ('Estojo', 'Estojo'),
    'Q': ('Quadrinho', 'Quadrinho'),
    'Z': ('Zênite', 'Zenite'),
}
CHAIN = {'X': ['I', 'X'], 'Y': ['I', 'X', 'Y']}
ONLY = os.environ.get('ONLY', '')

LOGO = ('<svg viewBox="0 0 506 280" width="{w}" height="{h}" role="img" aria-label="WinnerZ"><defs><linearGradient id="lg{u}" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" style="stop-color: var(--lg1)"></stop><stop offset="1" style="stop-color: var(--lg2)"></stop></linearGradient></defs>'
        '<path fill="url(#lg{u})" d="M2 0H58L147 222L124 280H114ZM180 0H222L282 148L307 85H366L288 280H273L201 98L167 182L134 115ZM232 0H506L484 54H254ZM386 105H472L454 150H420L389 226H492L470 280H336L326 256ZM70 0H170L148 54H92Z"></path></svg>')
ICON = {
    'heart': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 20.5 4.6 13.3a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9a4.6 4.6 0 0 1 6.5 6.5Z"></path></svg>',
    'dots': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="11" width="3" height="3"></rect><rect x="10.5" y="11" width="3" height="3"></rect><rect x="17" y="11" width="3" height="3"></rect></svg>',
    'plus': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>',
}

def esc(s):
    return s.replace('&', '&amp;').replace('"', '&quot;')

# ---- peças ---------------------------------------------------------------------------------
def btn(label, k='pri', size=''):
    cls = ' '.join(x for x in ['btn', k, size] if x)
    if k == 'off':
        return f'<button class="{cls}" type="button" disabled=""><i class="btn__led"></i><span class="btn__t"><span>{label}</span><span aria-hidden="true">{label}</span></span><i class="btn__ar"></i></button>'
    return f'<a class="{cls}" href="#"><i class="btn__led"></i><span class="btn__t"><span>{label}</span><span aria-hidden="true">{label}</span></span><i class="btn__ar"></i></a>'

def ibtn(icon, label, size=''):
    cls = ' '.join(x for x in ['btn', 'sec', 'icon', size] if x)
    return f'<button class="{cls}" type="button" aria-label="{label}">{ICON[icon]}</button>'

def kick(t, m=''):
    return f'<span class="kick {m}">{t}</span>'

def tag(t, m='b'):
    return f'<span class="tag {m}"><i class="led"></i><span>{t}</span></span>'

def chip(t, n=None, on=False):
    sm = f'<small>{n}</small>' if n is not None else ''
    return f'<button type="button" class="chip{" on" if on else ""}" aria-pressed="{"true" if on else "false"}"><i class="led"></i><span>{t}</span>{sm}</button>'

def chips(items, vert=False):
    return f'<div class="chips{" vert" if vert else ""}">' + ''.join(chip(*it) for it in items) + '</div>'

def tabs(items, active=0, counts=None, label='Abas'):
    counts = counts or {}
    out = []
    for i, t in enumerate(items):
        c = f'<b class="tabs__c">{counts[i]}</b>' if i in counts else ''
        out.append(f'<a href="#" class="{"on" if i == active else ""}"><i class="tabs__n">0{i + 1}</i><span>{t}</span>{c}</a>')
    return f'<nav class="tabs" aria-label="{label}">' + ''.join(out) + '</nav>'

def card(parts, m=''):
    return f'<article class="card {m}">' + ''.join(f'<div class="part {c}">{h}</div>' for c, h in parts) + '</article>'

def grad(c):
    return f'linear-gradient(165deg, {c}, #0b0b0d 78%)'

def cover(name, meta, c, st=None):
    s = tag(st[0], st[1]) if st else ''
    return (f'<div class="cover"><div class="cover__img"><div class="cover__bg" style="background: {grad(c)}"></div><span class="cover__ph">CAPA</span>{s}</div>'
            f'<div class="cover__info">{s}<p class="cover__nm">{name}</p><span class="meta">{meta}</span></div></div>')

def rate(n='4,5', v=4.5, avg='4,1', a=4.1, big=None):
    bars = ''.join('<i class="on"></i>' if v >= i + 1 else ('<i class="half"></i>' if v > i else '<i></i>') for i in range(5))
    st = f' style="font-size: {big}px"' if big else ''
    return (f'<div class="rate"><span class="rate__n"{st}>{n}</span><span class="rate__bar" style="--v: {v / 5 * 100:.0f}%; --m: {a / 5 * 100:.0f}%" aria-label="Nota {n} de 5">{bars}</span>'
            f'<span class="rate__avg"><span class="meta">Média da Galera</span><b>{avg}</b></span></div>')

def meter(on, total, m=''):
    return f'<div class="meter {m}" style="--p: {on / total * 100:.0f}%" aria-label="{on} de {total}">' + ''.join('<i class="on"></i>' if i < on else '<i></i>' for i in range(total)) + '</div>'

def labeled_meter(label, val, on, total, m=''):
    km = 'now' if m == 'now' else ('au' if m == 'au' else '')
    return f'<div style="display: flex; flex-direction: column; gap: 10px"><div style="display: flex; justify-content: space-between; align-items: center; gap: 12px">{kick(label, km)}<span class="meta">{val}</span></div>{meter(on, total, m)}</div>'

def field(label, value='', ph='', state='', msg=''):
    v = f' value="{esc(value)}"' if value else ''
    p = f' placeholder="{esc(ph)}"' if ph else ''
    mm = f'<span class="field__m">{msg}</span>' if msg else ''
    return f'<label class="field {state}"><span class="field__l">{label}</span><span class="field__w"><input type="text"{v}{p}><i class="led"></i></span>{mm}</label>'

def sw(label, on=False):
    return (f'<button type="button" class="sw{" on" if on else ""}" role="switch" aria-checked="{"true" if on else "false"}"><span>{label}</span>'
            f'<span class="sw__t"><span class="sw__k"><i class="led"></i></span></span><span class="sw__yn"><span class="{"" if on else "y"}">Não</span><span class="{"y" if on else ""}">Sim</span></span></button>')

def av(l, cls=''):
    return f'<span class="av {cls}">{l}</span>'

def toast(t, a='Desfazer'):
    return f'<div class="toast"><span style="flex: 1; font-size: 14.5px; font-weight: 600">{t}</span>{btn(a, "quiet", "sm")}</div>'

def post(who, letter, where, text, reacs, spoiler=False):
    sp = tag('Spoiler', 's') if spoiler else ''
    return (f'<div class="post"><div class="post__who">{av(letter)}<span><b>{who}</b><span class="meta">{where}</span></span></div>{sp}<p class="txt">{text}</p></div>',
            '<div class="reac">' + ''.join(tag(r, 'b') for r in reacs) + '</div>')

def litem(name, meta, c):
    return f'<div class="list__it"><span class="list__th" style="background: {grad(c)}"></span><span><b>{name}</b><span class="meta">{meta}</span></span></div>'

def header(active='', pill=False, u='h'):
    L = ['Início', 'Coleção', 'Jogos', 'Jornada']
    R = ['Comunidade', 'Eventos']
    a = lambda t: f'<a href="#" class="{"on" if t == active else ""}">{t}</a>'
    p = '<span class="pill"><span>Jogando · 1h 42</span></span>' if pill else ''
    tk = ('<span><b>Ao vivo</b> · Splatoon 3 · 1h 42 · GTA VI sai em 10 dias · Votação do WinnerZ Awards em dezembro · 3 novas na Galera · '
          'Mina the Hollower zerado · Fire Emblem: Fortune\'s Weave nos seus desejos · </span>')
    tick = f'<div class="tick" aria-hidden="true"><div class="tick__in">{tk}{tk}</div></div>'
    return (f'<header class="hdr"><nav aria-label="Seções">{"".join(a(t) for t in L)}</nav><div class="hdr__logo">{LOGO.format(w=62, h=34, u=u)}</div>'
            f'<div class="hdr__r"><nav aria-label="Mais seções">{"".join(a(t) for t in R)}</nav><div class="hdr__tools"><span class="srch">Buscar</span>{p}{av("H")}</div></div></header>{tick}')

def photo(h, bg, inner, label='IMAGEM DE FUNDO'):
    return (f'<section class="photo" style="height: {h}px"><div class="photo__bg" style="background: {bg}"></div><div class="photo__shade"></div>'
            f'<span class="photo__ph">{label}</span><div class="photo__in" style="position: absolute; left: 48px; right: 48px; bottom: 54px">{inner}</div></section>')

def wrap(inner, pad='40px 48px', gap=36):
    return f'<div style="padding: {pad}; display: flex; flex-direction: column; gap: {gap}px">{inner}</div>'

def row(*items, gap=14, align='center', wrap_=True):
    return f'<div style="display: flex; flex-wrap: {"wrap" if wrap_ else "nowrap"}; gap: {gap}px; align-items: {align}">' + ''.join(items) + '</div>'

def grid(n, items, gap=22, align='start'):
    return f'<div class="grid" style="display: grid; grid-template-columns: repeat({n}, minmax(0, 1fr)); gap: {gap}px; align-items: {align}">' + ''.join(items) + '</div>'

GAMES = [
    ('Resident Evil Requiem', 'PS5 · 2026', '#4a1717', ('Jogando', 'j')),
    ('Mina the Hollower', 'Switch 2 · 2026', '#1f3d36', ('Zerado', 'z')),
    ('Pokémon Pokopia', 'Switch 2 · 2026', '#3b3a17', ('Backlog', 'b')),
    ('Onimusha: Way of the Sword', 'PC · 2026', '#2a2340', ('Assisti', 'b')),
    ('Ocarina of Time', 'Switch 2 · 2026', '#403017', ('Backlog', 'b')),
    ('Splatoon 3', 'Switch · 2022', '#3b1f5c', ('Zerado', 'z')),
    ('Hollow Knight: Silksong', 'PC · 2025', '#2b2f3a', None),
    ('Metroid Prime 4', 'Switch 2 · 2025', '#193544', ('Backlog', 'b')),
    ('Donkey Kong Bananza', 'Switch 2 · 2025', '#4a3312', ('Zerado', 'z')),
    ('Hades II', 'PC · 2025', '#3d1430', None),
    ('Mario Kart World', 'Switch 2 · 2025', '#173a2a', ('Zerado', 'z')),
    ('Elden Ring', 'PS5 · 2022', '#2e2a1c', ('Deixei de lado', 'p')),
]

# ---- páginas -------------------------------------------------------------------------------
def p_inicio():
    hero = photo(460, 'radial-gradient(ellipse at 72% 30%, #4b2a78 0%, #171a33 45%, #08080a 80%)',
        '<div style="display: grid; grid-template-columns: minmax(0, 1fr) 210px; gap: 48px; align-items: end">'
        f'<div style="display: flex; flex-direction: column; gap: 18px">{kick("Jogando agora · desde 21:08", "now")}<h1 class="ttl" style="font-size: 88px">Splatoon 3</h1>'
        '<p class="lead" style="max-width: 620px">Seu recado para a próxima sessão: testar a Splatana nova no Turf War.</p>'
        f'{row(btn("Encerrar sessão · 1h 42", "now", "lg"), btn("Ponto para voltar", "sec", "lg"), gap=16)}</div>'
        f'{cover("Splatoon 3", "Switch · 2022", "#3b1f5c", ("Jogando", "j"))}</div>')
    hz = ('<div class="hz"><div class="hz__line"></div>'
          '<div class="hz__p now"><i class="hz__dot"></i><span class="hz__d">Hoje</span><b style="font-size: 15px">Sessão aberta</b><span class="meta">Splatoon 3</span></div>'
          '<div class="hz__p"><i class="hz__dot"></i><span class="hz__d">19 nov</span><b style="font-size: 15px">Grand Theft Auto VI</b><span class="meta">Sai em 10 dias</span></div>'
          '<div class="hz__p"><i class="hz__dot"></i><span class="hz__d">Dezembro</span><b style="font-size: 15px">Votação do WinnerZ Awards</b><span class="meta">19 categorias</span></div>'
          '<div class="hz__p"><i class="hz__dot"></i><span class="hz__d">Sem data</span><b style="font-size: 15px">Fire Emblem: Fortune\'s Weave</b><span class="meta">Nos seus desejos</span></div></div>')
    sec_hz = f'<div class="sect"><div class="sect__h">{kick("No seu Radar")}{btn("Abrir o Radar", "quiet", "sm")}</div>{hz}</div>'
    pp = post('@lumina', 'L', 'há 40 min · Resident Evil', 'Joguei de fone e luz apagada. Erro meu.', ['Aceno 12', 'Respostas 4'])
    cards = grid(3, [
        card([('head', kick('Sua Jornada') + '<span class="meta">há 3 dias</span>'),
              ('', '<h3 class="ttl" style="font-size: 26px">Mina the Hollower</h3><p class="txt">6h em 4 sessões. Você parou no segundo chefe.</p>' + meter(6, 16)),
              ('foot', btn('Continuar', 'pri', 'sm') + btn('Ver sessões', 'quiet', 'sm'))]),
        card([('head', kick('Nos seus desejos') + '<span class="meta">3 jogos</span>'),
              ('', '<div class="list">' + litem('Grand Theft Auto VI', 'Sai em 10 dias', '#5a1f1f') + litem("Fire Emblem: Fortune's Weave", 'Sem data', '#24413a') + litem('Metroid Prime 4', 'Saiu em 2025', '#193544') + '</div>'),
              ('foot', btn('Ver os desejos', 'quiet', 'sm'))]),
        card([('head', kick('Galera') + '<span class="meta">3 novas</span>'), ('', pp[0]), ('foot', pp[1])]),
    ])
    return header('Início', True) + hero + wrap(sec_hz + cards, gap=44), 1300

def p_colecao():
    top = tabs(['Estante', 'Consoles', 'Desejos', 'Emprestados'], 0, label='Partes da Coleção')
    head = ('<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 30px">'
            '<div style="display: flex; flex-direction: column; gap: 14px"><h1 class="ttl" style="font-size: 76px">Coleção</h1><p class="lead">148 jogos em 6 plataformas. 12 zerados este ano.</p></div>'
            + row(btn('Adicionar jogo', 'pri', 'lg'), btn('Importar', 'sec', 'lg'), gap=16) + '</div>')
    filt = ('<div style="display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 30px; align-items: end"><div style="display: flex; flex-direction: column; gap: 14px">'
            + chips([('Switch 2', 32, True), ('PS5', 18), ('PC', 41, True), ('Xbox', 6), ('Retrô', 23)])
            + chips([('Jogando', 1), ('Zerado', 12), ('Backlog', 48), ('Assisti', 5)])
            + '</div>' + field('Buscar na coleção', ph='Nome, série ou estúdio') + '</div>')
    covers = grid(6, [cover(*g) for g in GAMES], gap=20)
    return header('Coleção') + wrap(top + head + filt + covers, gap=34), 1340

def p_jornada():
    hero = photo(320, 'radial-gradient(ellipse at 75% 20%, #2c2240 0%, #121019 50%, #08080a 82%)',
        f'<div style="display: flex; flex-direction: column; gap: 16px">{kick("Jornada")}<h1 class="ttl" style="font-size: 78px">Minha Jornada em 2026</h1>'
        '<p class="lead"><b>12</b> zerados · <b>48</b> no backlog · <b>1</b> jogando agora · <b>214</b> horas</p></div>')
    tl = ('<div class="sect">' + f'<div class="sect__h">{kick("Linha do tempo")}{chips([("Tudo", None, True), ("Sessões",), ("Zerados",), ("Notas",)])}</div>'
          + card([('head', kick('Agora · Splatoon 3', 'now') + '<span class="meta">1h 42</span>'), ('', '<p class="txt">Sessão aberta desde 21:08. Meta da noite: 2 horas.</p>' + meter(17, 20, 'now'))], 'now')
          + card([('head', kick('Ontem · Resident Evil Requiem') + '<span class="meta">2h 10</span>'), ('', '<p class="txt">Chegou ao hospital. Seu recado: voltar com a lanterna carregada.</p>')])
          + card([('head', kick('6 nov · Mina the Hollower') + tag('Zerado', 'z')), ('', '<h3 class="ttl" style="font-size: 22px">História concluída</h3>' + rate())])
          + card([('head', kick('3 nov · Ocarina of Time') + '<span class="meta">1h 30</span>'), ('', '<p class="txt">Começou a Jornada. Primeira sessão no Switch 2.</p>')])
          + '</div>')
    side = ('<div class="sect">' + kick('Zerados recentemente') + grid(3, [cover('Mina the Hollower', '6 nov', '#1f3d36'), cover('Donkey Kong Bananza', 'out', '#4a3312'), cover('Mario Kart World', 'set', '#173a2a')], gap=12)
            + labeled_meter('Backlog zerado', '12 de 48', 6, 24)
            + '<div style="display: flex; flex-direction: column; gap: 16px">' + sw('Lembrete de jogo parado', False) + sw('Registrar sessões automaticamente', True) + '</div></div>')
    body = f'<div style="display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: 48px; align-items: start">{tl}{side}</div>'
    return header('Jornada', True) + hero + wrap(body), 1360

def p_comunidade():
    top = tabs(['Para você', 'Seguindo', 'Acontecendo', 'Clubes'], 0, {2: '2'}, 'Partes da Comunidade')
    head = ('<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 30px">'
            '<div style="display: flex; flex-direction: column; gap: 14px"><h1 class="ttl" style="font-size: 76px">Praça</h1><p class="lead">O que a Galera anda jogando e conversando.</p></div>'
            + btn('Escrever', 'pri', 'lg') + '</div>')
    p1 = post('@lumina', 'L', 'há 40 min · Resident Evil', 'Joguei de fone e luz apagada. Erro meu.', ['Aceno 12', 'Respostas 4'])
    p2 = post('@winnerz', 'H', 'há 2 h · Splatoon BR', 'Mais um jogo zerado. Ou melhor, mais um tutorial.', ['Aceno 31', 'Respostas 9'])
    p3 = post('@rafa_joga', 'R', 'ontem · Metroidvanias', 'Silksong me humilhou de novo. Alguém tem dica para o chefe da ponte?', ['Aceno 7', 'Respostas 15'], True)
    feed = ('<div class="sect">' + field('Nova postagem', ph='O que você está jogando?')
            + ''.join(card([('', p[0]), ('foot', p[1])]) for p in (p1, p2, p3)) + '</div>')
    side = ('<div class="sect">'
            + card([('head', kick('Acontecendo agora', 'now')), ('', '<h3 class="ttl" style="font-size: 22px">Jogatina de Splatoon</h3><p class="txt">8 pessoas na sala. Turf War até as 23h.</p>'), ('foot', btn('Entrar', 'now', 'sm'))], 'now')
            + card([('head', kick('Comunidades que você segue')), ('', '<div class="list">' + litem('Splatoon BR', '312 pessoas', '#3b1f5c') + litem('Metroidvanias', '540 pessoas', '#2b2f3a') + litem('Retrô BR', '228 pessoas', '#403017') + litem('Resident Evil', '190 pessoas', '#4a1717') + '</div>'), ('foot', btn('Ver todas', 'quiet', 'sm'))])
            + '</div>')
    body = f'<div style="display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: 48px; align-items: start">{feed}{side}</div>'
    return header('Comunidade') + wrap(top + head + body, gap=34), 1420

def p_awards():
    hero = photo(470, 'radial-gradient(ellipse at 70% 28%, #3d2b10 0%, #140e07 48%, #060606 82%)',
        f'<div style="display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 48px; align-items: end"><div style="display: flex; flex-direction: column; gap: 18px">{kick("WinnerZ Awards 2026", "au")}'
        '<h1 class="ttl" style="font-size: 96px">Jogo do Ano</h1><p class="lead" style="max-width: 560px">19 categorias. Você escolhe um indicado em cada uma, e o troféu Zênite vai para quem a Galera escolher.</p>'
        f'{row(btn("Votar no WinnerZ Awards", "au", "lg"), btn("Ver as categorias", "sec", "lg"), gap=16)}</div>'
        f'<div style="padding-bottom: 8px">{labeled_meter("Sua cédula", "7 de 19 categorias", 7, 19, "au")}</div></div>', 'IMAGEM DO EVENTO')
    cats = chips([('Jogo do Ano', None, True), ('Jogo Brasileiro do Ano',), ('Melhor Direção',), ('Melhor Narrativa',), ('Melhor Direção de Arte',), ('Melhor Trilha Sonora',), ('Melhor Jogo Indie',), ('Melhor Multiplayer',), ('Mais 11',)])
    noms = [('Mina the Hollower', 'Yacht Club Games', '#1f3d36'), ('Onimusha: Way of the Sword', 'Capcom', '#2a2340'), ('Pokémon Pokopia', 'The Pokémon Company', '#3b3a17'),
            ('Resident Evil Requiem', 'Capcom', '#4a1717'), ('Grand Theft Auto VI', 'Rockstar Games', '#5a1f1f'), ('The Legend of Zelda: Ocarina of Time', 'Nintendo', '#403017'), ("Fire Emblem: Fortune's Weave", 'Intelligent Systems', '#24413a')]
    ng = grid(7, [f'<div style="display: flex; flex-direction: column; gap: 12px">{cover(n, s, c)}{btn("Escolher", "sec", "sm")}</div>' for n, s, c in noms], gap=16)
    sect = f'<div class="sect"><div class="sect__h">{kick("Indicados · Jogo do Ano", "au")}<span class="note">A cena dos indicados continua a de hoje. Aqui, só os elementos em volta.</span></div>{ng}</div>'
    return header('Eventos') + hero + wrap(cats + sect, gap=34), 1300

def p_perfil():
    head = ('<div style="display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 34px; align-items: center">' + av('H', 'xl')
            + f'<div style="display: flex; flex-direction: column; gap: 12px">{kick("Passaporte")}<h1 class="ttl" style="font-size: 60px">@winnerz</h1><p class="txt">Mais um jogo zerado. Live por temporadas.</p>'
            + row(tag('Jogando agora: Splatoon 3', 'j'), tag('Fundador nº 001', 'au'), gap=10) + '</div>'
            + '<div style="display: grid; grid-template-columns: repeat(4, auto); gap: 34px">'
            + ''.join(f'<div style="display: flex; flex-direction: column; gap: 8px"><span class="ttl" style="font-size: 46px">{n}</span>{kick(l)}</div>' for n, l in [('12', 'Zerados'), ('1', 'Jogando'), ('48', 'Backlog'), ('214', 'Horas')])
            + '</div></div>')
    acts = row(btn('Seguir', 'pri'), btn('Mensagem', 'sec'), ibtn('dots', 'Mais ações'), gap=12)
    top = tabs(['Passaporte', 'Vitrines', 'Notas e análises', 'Zerados'], 0, label='Partes do perfil')
    cards = grid(3, [
        card([('head', kick('Jogando agora', 'now') + '<span class="meta">1h 42</span>'), ('', '<h3 class="ttl" style="font-size: 26px">Splatoon 3</h3><p class="txt">Turf War com a Galera do Discord.</p>' + meter(17, 20, 'now'))], 'now'),
        card([('head', kick('O jogo que me definiu')), ('', '<div style="display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 16px; align-items: center">' + cover('Splatoon', '', '#3b1f5c') + '<p class="txt">O jogo mais jogado no canal. Foi lá que os Amiguinhos nasceram.</p></div>')]),
        card([('head', kick('Notas e análises') + '<span class="meta">Mina the Hollower</span>'), ('', rate() + '<p class="txt">Difícil na medida. O chefe da torre é cruel.</p>')]),
    ])
    vit = f'<div class="sect"><div class="sect__h">{kick("Vitrine · Favoritos")}{btn("Editar vitrine", "quiet", "sm")}</div>' + grid(6, [cover(*g[:3]) for g in GAMES[5:11]], gap=20) + '</div>'
    return header('') + wrap(head + acts + top + cards + vit, pad='52px 48px 40px', gap=30), 1460

def p_pref():
    nav = chips([('Conta',), ('Perfil e privacidade',), ('Aparência e notas', None, True), ('Animações',), ('Jornada',), ('Avisos',), ('IAmiguinho',), ('Tradutor de tela',), ('Seus dados',)], vert=True)
    form = card([
        ('head', kick('Aparência e notas')),
        ('', '<div style="display: flex; flex-direction: column; gap: 18px">' + sw('Tema claro', False) + sw('Mostrar a média da Galera nas notas', True) + sw('Notas com meio ponto', True) + '</div>'),
        ('', '<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 22px">' + field('Nome que aparece', 'WinnerZ') + field('Seu @', 'winnerz', state='foc')
             + field('Canal ou site', ph='youtube.com/@seucanal') + field('Seu @ na Twitch', 'winnerz_', state='err', msg='Esse @ não existe na Twitch') + '</div>'),
        ('', kick('Animações') + chips([('Completas', None, True), ('Discretas',), ('Reduzidas',)])),
        ('foot', row(btn('Salvar', 'pri'), btn('Desfazer', 'quiet', 'sm'), gap=18) + btn('Apagar conta', 'dan', 'sm')),
    ])
    body = f'<div style="display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 48px; align-items: start">{nav}<div style="display: flex; flex-direction: column; gap: 22px">{form}{toast("Preferências salvas.")}</div></div>'
    return header('') + wrap('<h1 class="ttl" style="font-size: 72px">Preferências</h1>' + body, pad='48px', gap=34), 1260

def p_jogo():
    hero = photo(500, 'radial-gradient(ellipse at 72% 30%, #4a1a17 0%, #1c0c0b 45%, #08080a 80%)',
        '<div style="display: grid; grid-template-columns: 230px minmax(0, 1fr); gap: 44px; align-items: end">' + cover('Resident Evil Requiem', 'PS5 · 2026', '#6a2220', ('Jogando', 'j'))
        + f'<div style="display: flex; flex-direction: column; gap: 18px; padding-bottom: 54px">{row(tag("Jogando", "j"), tag("Capcom · 2026", "b"), gap=10)}<h1 class="ttl" style="font-size: 84px">Resident Evil Requiem</h1>'
        + row(tag('PS5', 'b'), tag('Xbox Series', 'b'), tag('PC', 'b'), tag('Terror', 'b'), gap=8)
        + row(btn('Abrir sessão', 'pri', 'lg'), btn('Registrar zerado', 'sec', 'lg'), ibtn('heart', 'Favoritar', 'lg'), ibtn('dots', 'Mais ações', 'lg'), gap=14) + '</div></div>')
    pp = post('@lumina', 'L', 'há 40 min', 'Joguei de fone e luz apagada. Erro meu.', ['Aceno 8', 'Respostas 2'])
    cards = grid(3, [
        card([('head', kick('Sua nota')), ('', rate())]),
        card([('head', kick('Sua Jornada') + '<span class="meta">ontem</span>'), ('', '<p class="txt"><b>9h</b> em 5 sessões. Você parou no hospital.</p>' + meter(9, 20)), ('foot', btn('Ver as sessões', 'quiet', 'sm'))]),
        card([('head', kick('Galera') + '<span class="meta">3 novas</span>'), ('', pp[0]), ('foot', pp[1])]),
    ])
    t = tabs(['Visão geral', 'Sua Jornada', 'Galera', 'Mídia', 'Onde comprar'], 0, {2: '3'}, 'Partes da página do jogo')
    return header('Jogos') + hero + wrap(t + cards, pad='0 48px 40px', gap=34), 1120

def p_elementos(name, desc):
    sec = lambda t, h: f'<div class="sect" style="padding-top: 26px; border-top: 1px solid var(--hair, rgba(128,128,128,.2))"><p class="nm">{t}</p>{h}</div>'
    head = f'<div style="display: flex; flex-direction: column; gap: 16px">{kick("Direção nova")}<h1 class="ttl" style="font-size: 96px">{name}</h1><p class="lead" style="max-width: 760px">{desc}</p></div>'
    b = sec('Botões', row(btn('Começar a jogar'), btn('Sessão aberta · 1h 42', 'now'), btn('No Radar', 'sec'), btn('Votar no WinnerZ Awards', 'au'), btn('Apagar sessão', 'dan'), ibtn('heart', 'Favoritar'), btn('Ver toda a Jornada', 'quiet'), btn('Sem estoque', 'off'), gap=22)
            + row(btn('Grande', 'pri', 'lg'), btn('Médio'), btn('Pequeno', 'pri', 'sm'), gap=22))
    c = sec('Cards', grid(4, [
        card([('head', kick('Sua Jornada') + '<span class="meta">há 3 dias</span>'), ('', '<h3 class="ttl" style="font-size: 22px">Mina the Hollower</h3><p class="txt">6h em 4 sessões.</p>' + meter(6, 16)), ('foot', btn('Continuar', 'pri', 'sm'))]),
        card([('head', kick('Jogando agora', 'now')), ('', '<h3 class="ttl" style="font-size: 22px">Splatoon 3</h3><span class="ttl" style="font-size: 40px; color: var(--nowI)">1:42</span>')], 'now'),
        card([('head', kick('WinnerZ Awards', 'au')), ('', '<h3 class="ttl" style="font-size: 22px">Troféu Zênite</h3><p class="txt">19 categorias. A votação abre em dezembro.</p>')], 'au'),
        card([('', kick('Radar') + '<h3 class="ttl" style="font-size: 26px">Vazio</h3><p class="txt">Marque os lançamentos que você quer acompanhar.</p>' + btn('Explorar', 'sec', 'sm'))], 'empty'),
    ]))
    cv = sec('Capas (passe o mouse)', grid(5, [cover(*g) for g in GAMES[:5]], gap=20))
    f1 = sec('Abas, filtros e etiquetas', tabs(['Visão geral', 'Jornada', 'Galera', 'Mídia'], 0, {2: '3'}) + chips([('Switch 2', 32, True), ('PS5', 18), ('PC', 41, True), ('Xbox', 6), ('Retrô', 23)])
             + row(tag('Zerado', 'z'), tag('Jogando', 'j'), tag('Backlog', 'b'), tag('Deixei de lado', 'p'), tag('Spoiler', 's'), tag('Indicado', 'au'), gap=10))
    f2 = sec('Nota e medidores', rate() + labeled_meter('Backlog zerado', '12 de 48', 6, 24) + labeled_meter('Sessão de hoje', '1h 42 de 2h', 20, 24, 'now') + labeled_meter('Sua cédula do Awards', '7 de 19', 7, 19, 'au'))
    f3 = sec('Campos, escolhas e aviso', field('Seu @', ph='como a Galera te acha') + field('Nome do jogo', 'Ocarina of Time', state='foc') + field('Seu @', 'winnerz', state='err', msg='Esse @ já tem dono')
             + sw('Lembrete de jogo parado', False) + sw('Mostrar a média da Galera', True) + toast('Sessão salva na sua Jornada.'))
    body = head + b + c + cv + f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 56px">{f1 + f2}{f3}</div>'
    return wrap(body, pad='60px 64px', gap=34), 2320

PAGES = [('Inicio', 'Início', p_inicio), ('Colecao', 'Coleção', p_colecao), ('Jornada', 'Jornada', p_jornada), ('Comunidade', 'Comunidade', p_comunidade),
         ('Awards', 'WinnerZ Awards', p_awards), ('Perfil', 'Perfil', p_perfil), ('Preferencias', 'Preferências', p_pref), ('Jogo', 'Página do jogo', p_jogo)]

DESC = {
    'P': 'Tudo pintado à mão. Cada peça é uma pincelada de borda irregular, e no hover uma segunda demão passa por cima. Os cards são telas cortadas à mão, a nota são cinco toques de pincel e os rótulos pequenos são anotações manuscritas.',
    'S': 'Cada peça é uma figurinha do Álbum: borda branca recortada, levemente torta, como se colada à mão. No hover o canto descola e passa o brilho de figurinha holográfica. O que ainda falta aparece como espaço tracejado.',
    'E': 'A coleção física. Abas e filtros são lombadas na prateleira, e a escolhida é puxada para fora. Um disco sai do botão, o card abre de leve como um estojo e a capa abre na dobradiça e mostra o disco girando.',
    'Q': 'Traço grosso de nanquim. A sombra é retícula (os pontinhos de impressão), o botão bate na própria sombra e solta linhas de velocidade, os cards são quadros com legenda e os campos são balões de fala.',
    'Z': 'A luz vem de cima, como no troféu Zênite. Cada peça tem a borda de cima iluminada, sobe para a luz no hover e deixa um reflexo no chão. Os estados são fases: disco cheio para zerado, anel para backlog, eclipse com coroa âmbar para o agora.',
    'N': 'Cinema de autor. Luz de cena que se move, reflexos de lente anamórfica nos botões e nas linhas, granulado de filme, faixas pretas de cinema no topo e foco que muda: ao passar o mouse numa capa, as outras saem de foco.',
    'G': 'O W e o Z da vinheta. Cada peça é feita de duas metades que se afastam e se cravam, e a costura entre elas acende no impacto: botões, cards, abas, campos e até o logo do menu.',
    'T': 'O site vestido como o pacote gráfico de uma live: tarjas, letreiro de LED correndo no topo, números em pontos de LED, linhas de tela, cortinas que passam nos botões e varredura nas capas.',
    'C': 'Metal espelhado e laca negra. Reflexos que correm pelo botão e pelas molduras, brilho de quina ao passar o mouse, títulos cromados que mudam de luz e ouro espelhado só no Awards.',
    'X': 'Tudo da Impacto, com os botões da Ímã: duas peças inclinadas a 22° que se afastam e se cravam. No impacto, a costura acende, as faíscas saem da emenda e o botão treme.',
    'Y': 'A Impacto + Ímã com outra versão de cards: contorno sólido em volta do card inteiro, platina nos comuns, âmbar no que está acontecendo agora e ouro no Awards. Ao passar o mouse, o contorno dá um pulso.',
    'I': 'A vinheta do WinnerZ virou interface. As peças se cravam inclinadas a 22°, a luz diagonal corta os botões, o pulso sai das bordas, faíscas saltam no principal e partículas sobem no topo das páginas.',
}

def page_file(theme, mode, body, h, title):
    css = BASE + ''.join('\n' + open(os.path.join(HERE, f'themes/{t}.css'), encoding='utf-8').read() for t in CHAIN.get(theme, [theme]))
    css = css.replace('</', '<\\/')
    awards = ' awards' if 'Awards' in title else ''
    grain = '<svg class="grain" aria-hidden="true"><filter id="gn"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"></feTurbulence><feColorMatrix type="saturate" values="0"></feColorMatrix></filter><rect width="100%" height="100%" filter="url(#gn)"></rect></svg>'
    return f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&amp;family=Caveat:wght@500..700&amp;display=swap" rel="stylesheet">
<style>
{css}
</style>
</helmet>
<div class="A {theme} {mode}{awards}" style="width: 1280px; height: {h}px">{grain}<div class="fx"></div>{body}</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1280,"height":{h}}}}}'>
class Component extends DCLogic {{
  renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''

def main():
    made = {}
    for t, (tname, slug) in THEMES.items():
        if ONLY and t not in ONLY:
            continue
        for mode in ('dark', 'light'):
            ml = 'escuro' if mode == 'dark' else 'claro'
            pages = list(PAGES)
            if t in ('N', 'I', 'G', 'T', 'C', 'X', 'Y', 'P', 'S', 'E', 'Q', 'Z'):
                pages = [('Elementos', 'Todos os elementos', lambda t=t, tname=tname: p_elementos(tname, DESC[t]))] + pages
            for key, label, fn in pages:
                body, h = fn()
                if t in ('F', 'M', 'L') and key == 'Jogo' and mode == 'dark':
                    continue
                fname = f'{slug}-{key}-{"E" if mode == "dark" else "C"}.dc.html'
                title = f'{tname} · {label} · modo {ml}'
                with open(os.path.join(OUT, fname), 'w', encoding='utf-8') as fh:
                    fh.write(page_file(t, mode, body, h, title))
                made[fname] = {'theme': t, 'mode': mode, 'key': key, 'h': h, 'title': title}
    json.dump(made, open(os.path.join(HERE, 'made-' + (ONLY or 'all') + '.json'), 'w'), ensure_ascii=False, indent=1)
    print(len(made), 'quadros')

if __name__ == '__main__':
    main()
