#!/usr/bin/env python3
"""Modelo da linha do tempo nova (10/11/2026): quatro quadros no visual Carga, modo escuro."""
import json, os, datetime
import gen
from gen import btn, kick, tag, chips, tabs, card, header, wrap, meter, grad

OUT = '/home/claude/canvas-tl/project'
CSS = r'''
.tick{display:none!important}
.tl-ph{position:relative;overflow:hidden;background:var(--b2);outline:1px solid var(--ln)}
.tl-ph::before{content:"";position:absolute;inset:0;background:var(--sc)}
.tl-ph::after{content:"SUA FOTO";position:absolute;right:10px;top:9px;font-size:10px;font-weight:700;letter-spacing:.14em;color:rgba(255,255,255,.5)}
.tl-ph.cv::after{content:"CAPA"}
.tl-cap{position:absolute;left:0;right:0;bottom:0;padding:44px 20px 18px;background:linear-gradient(transparent,rgba(5,5,6,.9) 62%);display:flex;flex-direction:column;gap:6px}
.tl-cap h3{margin:0;font-size:22px;font-weight:800;font-stretch:118%;line-height:1.05;color:#fff}
.tl-cap p{margin:0;font-size:14px;line-height:1.45;color:#d5d9de}
.tl-day{font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--fnt)}
.tl-day b{color:var(--now)}
.tl-q{margin:0;font-size:24px;line-height:1.22;font-weight:600;font-stretch:108%;color:var(--ink)}
.tl-q.sm{font-size:18px}
.tl-big{position:relative;min-height:340px}
.tl-big .tl-ph{position:absolute;inset:0}
.tl-med{display:flex;flex-direction:column;gap:14px;justify-content:space-between;padding:22px 24px;background:var(--b1);outline:1px solid var(--ln);min-height:160px}
.tl-quiet{display:flex;align-items:center;gap:14px;padding:4px 2px;color:var(--fnt);font-size:13px;font-weight:600}
.tl-quiet i{display:inline-block;width:14px;height:6px;background:var(--ln);transform:skewX(-22deg)}
.tl-quiet span.l{flex:1;height:1px;background:var(--ln)}
.tl-selo{display:inline-flex;align-items:center;gap:8px;padding:6px 12px 6px 10px;font-size:11.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--onNow);background:var(--now);transform:skewX(-12deg)}
.tl-selo span{display:inline-block;transform:skewX(12deg)}
.tl-selo.w{background:var(--ink);color:var(--bg)}
.tl-ch{display:grid;grid-template-columns:120px minmax(0,1fr);gap:28px;align-items:start}
.tl-rom{font-size:92px;font-weight:800;font-stretch:125%;line-height:.8;color:var(--b3);-webkit-text-stroke:1px var(--ln)}
.tl-chh{display:flex;flex-direction:column;gap:12px;padding-bottom:6px}
.tl-chh h2{margin:0;font-size:40px;font-weight:800;font-stretch:125%;text-transform:uppercase;line-height:.92}
.tl-sum{margin:0;font-size:16px;line-height:1.55;color:var(--ink2);max-width:70ch;font-style:italic}
.tl-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:18px}
.tl-rule{position:relative;height:44px}
.tl-rule::before{content:"";position:absolute;left:0;right:0;top:13px;height:1px;background:var(--ln)}
.tl-rule i{position:absolute;top:8px;width:10px;height:10px;border:1.5px solid var(--mut);background:var(--bg);transform:skewX(-22deg)}
.tl-rule i.m{background:var(--ink);border-color:var(--ink)}
.tl-rule i.n{background:var(--now);border-color:var(--now);width:14px;height:14px;top:6px}
.tl-rule span{position:absolute;top:28px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--fnt);transform:translateX(-30%);white-space:nowrap}
.tl-rule span.n{color:var(--now)}
.tl-ask{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;background:rgba(5,5,6,.82);position:absolute;left:14px;right:14px;bottom:14px;outline:1px solid var(--ln)}
.tl-ask span{flex:1;min-width:140px;font-size:14px;font-weight:600;color:var(--ink)}
.tl-hero{display:grid;grid-template-columns:150px minmax(0,1fr);gap:26px;align-items:end;padding:44px 48px 30px;position:relative}
.tl-hero::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 78% 0%,#3a2f18 0%,#14110b 46%,transparent 78%);opacity:.75;z-index:-1}
.tl-banner{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:0;background:var(--b1);outline:2px solid var(--ink);outline-offset:5px;margin:7px}
.tl-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:4px;min-height:210px}
.tl-nd{display:grid;grid-template-columns:220px minmax(0,1fr);gap:0;background:var(--b1);outline:1px solid var(--now)}
.tl-g{display:grid;grid-template-columns:132px minmax(0,1fr);gap:24px;align-items:start;padding:22px 0;border-top:1px solid var(--ln)}
.tl-th{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.tl-mo{display:flex;align-items:baseline;gap:16px}
.tl-mo h2{margin:0;font-size:34px;font-weight:800;font-stretch:125%;text-transform:uppercase}
.tl-ba{display:grid;grid-template-columns:minmax(0,1fr) 60px minmax(0,1fr);gap:0;align-items:center}
.tl-ba .ar{text-align:center;font-size:26px;color:var(--mut)}
.tl-mnav{position:absolute;left:0;right:0;bottom:0;display:grid;grid-template-columns:repeat(5,1fr);background:var(--b1);border-top:1px solid var(--ln);padding:10px 4px 14px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;text-align:center;color:var(--fnt)}
.tl-mnav b{color:var(--ink)}
'''
SC = {
 'ouro': 'radial-gradient(ellipse at 62% 34%,#c9a45a 0%,#6d5326 20%,#2a2213 48%,#0c0b09 80%)',
 'neve': 'radial-gradient(ellipse at 30% 20%,#aab8c6 0%,#4d5a68 26%,#1d232b 58%,#090a0c 86%)',
 'rubro': 'radial-gradient(ellipse at 70% 60%,#b0452f 0%,#5a1d16 28%,#22100e 58%,#0a0707 86%)',
 'mata': 'radial-gradient(ellipse at 40% 70%,#6f8a4a 0%,#34482a 28%,#141d13 58%,#080a08 86%)',
 'noite': 'radial-gradient(ellipse at 50% 15%,#5a5f9a 0%,#2a2c56 26%,#12132a 58%,#07070c 86%)',
 'cinza': 'radial-gradient(ellipse at 55% 45%,#8a8377 0%,#48443d 26%,#1e1c19 58%,#0a0909 86%)',
}
def ph(tone, style='', cls='', inner=''):
    return f'<div class="tl-ph {cls}" style="--sc: {SC[tone]}; {style}">{inner}</div>'
def cap(day, title, text=''):
    t = f'<p>{text}</p>' if text else ''
    return f'<div class="tl-cap"><span class="tl-day">{day}</span><h3>{title}</h3>{t}</div>'
def big(tone, day, title, text='', span=6, h=340, extra=''):
    return f'<article class="tl-big" style="grid-column: span {span}; min-height: {h}px">{ph(tone)}{extra}{cap(day, title, text)}</article>'
def med(day, quote, foot='', span=3, sm=False):
    f = f'<span class="meta">{foot}</span>' if foot else ''
    return f'<article class="tl-med" style="grid-column: span {span}"><span class="tl-day">{day}</span><p class="tl-q{" sm" if sm else ""}">{quote}</p>{f}</article>'
def quiet(text):
    return f'<div class="tl-quiet" style="grid-column: 1 / -1"><i></i><i></i><i></i><span>{text}</span><span class="l"></span></div>'
def selo(t, w=False):
    return f'<span class="tl-selo{" w" if w else ""}"><span>{t}</span></span>'
def rule(marks):
    return '<div class="tl-rule" aria-hidden="true">' + ''.join((f'<i class="{c}" style="left: {x}%"></i>' if not lb else f'<span class="{c}" style="left: {x}%">{lb}</span>') for x, c, lb in marks) + '</div>'
RULE = rule([(1,'m',''),(1,'','12 out'),(9,'',''),(14,'m',''),(20,'',''),(26,'m',''),(26,'','17 out'),(33,'',''),(41,'m',''),(48,'',''),(48,'','22 out'),(60,'',''),(74,'m',''),(74,'','5 nov'),(86,'',''),(97,'n',''),(95,'n','hoje')])
def neste_dia(compact=False):
    return (f'<section class="tl-nd" style="grid-template-columns: {"120px" if compact else "220px"} minmax(0,1fr)">{ph("rubro", "min-height: 130px")}'
            f'<div style="padding: 18px 22px; display: flex; flex-direction: column; gap: 8px; justify-content: center">{kick("Neste dia · há 1 mês", "now")}'
            f'<p class="tl-q{" sm" if compact else ""}">Você enfrentou Margit pela primeira vez.</p>'
            + ('' if compact else '<span class="meta">16 de outubro · Limgrave · sessão de 1 h 10</span>') + '</div></section>')

def chapter(rom, name, dates, summ, cards, selos=''):
    return (f'<section class="tl-ch"><div class="tl-rom" aria-hidden="true">{rom}</div><div style="display: flex; flex-direction: column; gap: 22px">'
            f'<div class="tl-chh"><span class="tl-day">Capítulo {rom} · {dates}</span><h2>{name}</h2><p class="tl-sum">{summ}</p>'
            f'<div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center">{selos}</div></div>'
            f'<div class="tl-grid">{cards}</div></div></section>')

def hero(buttons, sub):
    return (f'<section class="tl-hero"><div class="tl-ph cv" style="--sc: {SC["ouro"]}; height: 200px"></div>'
            f'<div style="display: flex; flex-direction: column; gap: 14px"><a href="#" class="meta">← Jornada</a><h1 class="ttl" style="font-size: 64px">Elden Ring</h1>'
            f'<p class="lead">{sub}</p><div style="display: flex; gap: 14px; flex-wrap: wrap; align-items: center; padding-top: 6px">{buttons}</div></div></section>')
def trilha():
    return ('<div style="display: flex; flex-direction: column; gap: 10px"><div style="display: flex; justify-content: space-between; align-items: baseline">'
            '<span class="txt">Você está em <b>Leyndell, Capital das Cinzas</b></span><span class="meta">4 DE 23 FEITOS · <b style="color: var(--ink); font-size: 18px">39%</b></span></div>' + meter(9, 23, 'now') + '</div>')

# 1 · Jornada do jogo: o botão em destaque e o cartão de entrada
def b_jornada():
    banner = ('<section class="tl-banner"><div style="padding: 30px 32px; display: flex; flex-direction: column; gap: 16px; justify-content: center">'
              + kick('A sua história com este jogo', 'now') + '<h2 class="ttl" style="font-size: 44px">Linha do tempo</h2>'
              '<p class="lead"><b>10</b> dias de jogo · <b>6</b> momentos · <b>3</b> capítulos, de 12 de outubro até hoje.</p>'
              f'<div style="display: flex; gap: 14px; flex-wrap: wrap">{btn("Abrir a linha do tempo", "pri", "lg")}{btn("Rever a jornada", "sec")}</div></div>'
              f'<div class="tl-strip">{ph("neve")}{ph("rubro")}{ph("ouro")}{ph("noite")}</div></section>')
    parou = card([('head', kick('Onde você parou', 'now') + '<span class="meta">ontem · 1 h 20</span>'),
                  ('', '<p class="tl-q sm">“Abrir o portão principal e subir pela muralha da esquerda.”</p><span class="meta">Parou em Leyndell, Capital das Cinzas</span>')], 'now')
    body = (hero(btn('Começar sessão', 'pri', 'lg') + btn('Linha do tempo', 'pri') + btn('Ações', 'sec'), 'PS5 · Primeira vez · Em andamento · <b>10</b> dias de jogo · <b>4 h 05</b>')
            + wrap(trilha() + banner
                   + f'<div style="display: grid; grid-template-columns: minmax(0,1.5fr) minmax(0,1fr); gap: 28px; align-items: start">{parou}{neste_dia(True)}</div>'
                   + tabs(['Diário', 'Detalhes'], 0), pad='8px 48px 44px', gap=30))
    return header('Jornada') + body, 1260

# 2 · A página própria da linha do tempo do jogo
def b_linha():
    top = (f'<section style="padding: 40px 48px 0; display: flex; flex-direction: column; gap: 22px"><a href="#" class="meta">← Elden Ring</a>'
           f'<div style="display: flex; justify-content: space-between; align-items: end; gap: 24px; flex-wrap: wrap"><div style="display: flex; flex-direction: column; gap: 12px">{kick("Elden Ring · Primeira vez")}'
           f'<h1 class="ttl" style="font-size: 78px">Linha do tempo</h1><p class="lead"><b>10</b> dias de jogo · <b>4 h 05</b> · <b>6</b> momentos · começou em 12 de outubro</p></div>'
           f'<div style="display: flex; gap: 14px; flex-wrap: wrap">{btn("▶ Rever a jornada", "pri", "lg")}{btn("Compartilhar", "sec")}</div></div>'
           + chips([('Tudo', None, True), ('Só momentos', 6), ('Recados', 5), ('Pontos para voltar', 2), ('Capturas', 9)]) + RULE + neste_dia() + '</section>')
    c1 = chapter('I', 'Limgrave', '12 – 17 out', 'Você começou a sua primeira História em Elden Ring e passou quatro dias em Limgrave. Guardou dois momentos e saiu de lá depois de vencer Margit.',
        big('mata', 'seg 12 out · começo', 'A primeira vez', 'O primeiro passo fora da caverna.', 7, 360)
        + med('qua 14 out · 2 h 08', '“Explorar as ruínas ao sul antes de enfrentar o primeiro chefe.”', 'Seu recado', 5)
        + quiet('2 dias de jogo sem anotação · 35 min')
        + big('rubro', 'sex 16 out · momento', 'Margit, o Presságio Temido', 'Sete tentativas. Na oitava, foi.', 8, 380)
        + med('sáb 17 out', '“Voltar ao castelo com mais frascos.”', 'Ponto para voltar · resolvido', 4, True),
        selo('Sua maior sessão · 2 h 08') + selo('Capa do capítulo: trocar', True))
    c2 = chapter('II', 'Montanhas dos Gigantes', '18 – 22 out', 'Quatro dias de jogo, quase sempre à noite. Você disse “adorei” em três deles e guardou uma foto sem legenda.',
        med('dom 18 out · 50 min', '“Quero continuar.”', 'Como foi', 4, True)
        + big('neve', 'ter 20 out · momento', '', '', 8, 340, '<div class="tl-ask"><span>O que estava acontecendo aqui?</span>' + btn('Escrever a legenda', 'sec', 'sm') + '</div>')
        + quiet('1 dia de jogo sem anotação · 20 min')
        + big('noite', 'qui 22 out · momento', 'O gigante de fogo', 'Quase desisti na segunda fase.', 6, 320)
        + med('qui 22 out', '“Subir até a forja antes de voltar para a capital.”', 'Seu recado', 6))
    c3 = chapter('III', 'Leyndell, Capital das Cinzas', '5 nov – hoje', 'Você voltou depois de 14 dias longe e está aqui agora.',
        med('qui 5 nov', '“Abrir o portão principal e subir pela muralha da esquerda.”', 'Seu recado', 7)
        + f'<article class="tl-med" style="grid-column: span 5; outline: 2px solid var(--now)">{kick("Hoje", "now")}<p class="tl-q">O próximo instante</p>{btn("Começar sessão", "pri")}</article>',
        selo('Voltou depois de 14 dias'))
    ba = (f'<section style="display: flex; flex-direction: column; gap: 18px">{kick("Antes e depois")}<div class="tl-ba">'
          f'<div class="tl-big" style="min-height: 260px">{ph("mata")}{cap("12 out", "O primeiro dia")}</div><div class="ar" aria-hidden="true">→</div>'
          f'<div class="tl-big" style="min-height: 260px">{ph("ouro")}{cap("5 nov", "A foto mais recente")}</div></div></section>')
    return header('Jornada') + top + wrap(c1 + c2 + c3 + ba, pad='48px 48px 56px', gap=64), 3680

# 3 · A linha do tempo geral (Jornada → Linha do tempo)
def b_geral():
    def grupo(tone, nome, linha, quote, thumbs):
        return (f'<article class="tl-g">{ph(tone, "height: 176px", "cv")}<div style="display: flex; flex-direction: column; gap: 12px">'
                f'<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 16px"><h3 class="ttl" style="font-size: 26px">{nome}</h3><a href="#" class="meta">Abrir a linha do jogo →</a></div>'
                f'<span class="meta">{linha}</span>' + (f'<p class="tl-q sm">{quote}</p>' if quote else '')
                + (f'<div class="tl-th">{"".join(ph(t, "height: 96px") for t in thumbs)}</div>' if thumbs else '') + '</div></article>')
    top = (f'<section style="padding: 36px 48px 0; display: flex; flex-direction: column; gap: 22px">{tabs(["Em andamento", "Concluídas", "Linha do tempo", "Retrospectivas"], 2)}'
           '<h1 class="ttl" style="font-size: 78px">Linha do tempo</h1><p class="lead">Tudo o que você viveu jogando, mês a mês.</p>'
           + chips([('Tudo', None, True), ('Só momentos', 14), ('Jornadas',), ('Coleção',)]) + neste_dia() + '</section>')
    nov = (f'<section><div class="tl-mo"><h2>Novembro 2026</h2>{kick("Agora", "now")}<span class="meta">3 dias de jogo · 1 h 25</span></div>'
           + grupo('ouro', 'Elden Ring', '2 dias · 1 h 20 · chegou a Leyndell, Capital das Cinzas', '“Abrir o portão principal e subir pela muralha da esquerda.”', [])
           + '</section>')
    zer = (f'<article class="tl-big" style="min-height: 300px">{ph("cinza")}<div class="tl-cap"><span class="tl-day"><b>Zerou</b> · dom 18 out</span>'
           '<h3 style="font-size: 34px">The Last of Us</h3><p>Primeira História concluída, em 4 dias de jogo. Depois vieram o NG+, todos os finais e a platina.</p></div></article>')
    out = (f'<section><div class="tl-mo"><h2>Outubro 2026</h2><span class="meta">12 dias de jogo · 9 h 40 · 3 jogos</span></div>'
           + f'<div style="padding: 22px 0">{zer}</div>'
           + grupo('ouro', 'Elden Ring', '8 dias · 2 h 45 · 5 momentos · começou em 12 out', '“Sete tentativas. Na oitava, foi.”', ['mata', 'rubro', 'neve', 'noite'])
           + grupo('mata', 'A Short Hike', '1 dia · 39 min · 1 momento', '', ['mata', 'neve'])
           + quiet('20 out · 6 jogos entraram na coleção, pela importação') + '</section>')
    return header('Jornada') + top + wrap(nov + out, pad='44px 48px 56px', gap=52), 2240

# 4 · No celular: a página da linha do tempo
def b_cel():
    def mbig(tone, day, title, text='', h=250, extra=''):
        return f'<article class="tl-big" style="min-height: {h}px">{ph(tone)}{extra}{cap(day, title, text)}</article>'
    body = ('<div style="padding: 22px 18px 96px; display: flex; flex-direction: column; gap: 20px"><a href="#" class="meta">← Elden Ring</a>'
            f'{kick("Elden Ring · Primeira vez")}<h1 class="ttl" style="font-size: 40px">Linha do tempo</h1><p class="txt"><b>10</b> dias de jogo · <b>4 h 05</b> · <b>6</b> momentos</p>'
            + btn('▶ Rever a jornada', 'pri') + chips([('Tudo', None, True), ('Só momentos', 6), ('Recados', 5)]) + neste_dia(True)
            + '<div style="display: flex; flex-direction: column; gap: 10px; padding-top: 10px"><span class="tl-day">Capítulo I · 12 – 17 out</span><h2 class="ttl" style="font-size: 28px">Limgrave</h2>'
              '<p class="tl-sum" style="font-size: 14.5px">Você começou a sua primeira História e passou quatro dias em Limgrave.</p>' + f'<div>{selo("Sua maior sessão · 2 h 08")}</div></div>'
            + mbig('mata', 'seg 12 out · começo', 'A primeira vez', 'O primeiro passo fora da caverna.')
            + '<article class="tl-med"><span class="tl-day">qua 14 out · 2 h 08</span><p class="tl-q sm">“Explorar as ruínas ao sul antes de enfrentar o primeiro chefe.”</p><span class="meta">Seu recado</span></article>'
            + quiet('2 dias sem anotação · 35 min')
            + mbig('rubro', 'sex 16 out · momento', 'Margit, o Presságio Temido', 'Sete tentativas. Na oitava, foi.', 270)
            + '</div><nav class="tl-mnav" aria-label="Seções"><span>Início</span><b>Jornada</b><span>Coleção</span><span>Álbum</span><span>Mais</span></nav>')
    return body, 1780

BOARDS = [
 ('Main.dc.html', 'A · Página do jogo: o botão e o cartão da linha do tempo', b_jornada, 1280),
 ('Linha-Jogo.dc.html', 'B · A página própria da linha do tempo do jogo', b_linha, 1280),
 ('Linha-Geral.dc.html', 'C · A linha do tempo geral, por mês e por jogo', b_geral, 1280),
 ('Linha-Celular.dc.html', 'D · A linha do tempo do jogo no celular', b_cel, 390),
]
def main():
    boards, order, x = {}, [], 0
    for fname, title, fn, w in BOARDS:
        body, h = fn()
        html = gen.page_file('U', 'dark', body, h, title).replace('</style>', CSS.replace('</', '<\\/') + '</style>', 1)
        if w != 1280:
            html = html.replace('style="width: 1280px;', f'style="width: {w}px;', 1).replace('"width":1280', f'"width":{w}', 1)
        open(os.path.join(OUT, fname), 'w', encoding='utf-8').write(html)
        boards[fname] = {'x': x, 'y': 0, 'w': w, 'h': h, 'title': title}
        order.append(fname); x += w + 80
    notes = {
      'titulo': {'x': 0, 'y': -300, 'text': 'Linha do tempo nova · modelo', 'kind': 'title1', 'maxW': 4200},
      'n1': {'x': 0, 'y': 1400, 'w': 620, 'fill': 'orange', 'text': 'A · O que muda na página do jogo\n\n• Botão "Linha do tempo" no topo, ao lado de Começar sessão\n• Cartão grande de entrada, com as suas fotos\n• "Neste dia" quando houver lembrança\n• As abas ficam só com Diário e Detalhes'},
      'n2': {'x': 1360, 'y': 3820, 'w': 620, 'fill': 'green', 'text': 'B · A página própria\n\n• Um cartão por dia\n• Três tamanhos: foto grande, recado médio, dia sem anotação vira um traço\n• Capítulo com o nome da região e resumo\n• Selos automáticos (maior sessão, voltou depois de 14 dias)\n• Foto sem legenda pergunta "o que estava acontecendo aqui?"\n• Antes e depois no fim\n• "Rever a jornada" abre o passeio em tela cheia que já existe'},
      'n3': {'x': 2720, 'y': 2380, 'w': 620, 'fill': 'blue', 'text': 'C · A linha geral\n\n• Agrupada por mês e, dentro do mês, por jogo\n• "Zerou" ganha cartão grande\n• Filtro "Só momentos"\n• O que entrou na coleção vira uma linha discreta'},
      'n4': {'x': 4080, 'y': 1920, 'w': 390, 'fill': 'gray', 'text': 'As fotos aqui são só manchas de cor no lugar das suas capturas de verdade.'},
    }
    idx = {'v': 3, 'createdOnFiles': {'v': 1, 'at': datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%dT%H:%M:%SZ')}, 'title': 'WinnerZ · Linha do tempo nova (modelo)',
           'launch': {'view': 'canvas'}, 'pages': [], 'boards': boards, 'order': order, 'notes': notes, 'designSystems': []}
    json.dump(idx, open(os.path.join(OUT, 'canvas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(boards), 'quadros')
main()
