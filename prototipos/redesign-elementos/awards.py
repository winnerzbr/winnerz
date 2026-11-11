#!/usr/bin/env python3
"""Prévias da página do Awards para a estreia (11/11/2026): cinco direções e a aba do troféu Zênite."""
import json, os, datetime, random, math
import gen
from gen import btn, kick, header

OUT = '/home/claude/canvas-aw/project'
CATS = ['Jogo do Ano', 'Jogo Brasileiro do Ano', 'Melhor Direção', 'Melhor Narrativa', 'Melhor Direção de Arte', 'Melhor Trilha Sonora', 'Melhor Jogo Indie', 'Melhor Jogo Ongoing',
        'Melhor Jogo de Ação', 'Melhor Jogo de Aventura', 'Melhor Jogo de Plataforma', 'Melhor Jogo de Luta', 'Melhor Jogo Familiar', 'Melhor Jogo de Estratégia', 'Melhor Jogo de Corrida',
        'Melhor Jogo de RPG', 'Melhor Multiplayer', 'Jogo Mais Aguardado', 'Criador de Conteúdo do Ano']
N = len(CATS)

CSS = r'''
.tick{display:none!important}
.aw{position:relative;color:var(--ink)}
.aw-hero{position:relative;height:620px;overflow:hidden;background:#000;isolation:isolate}
.aw-hero .in{position:absolute;left:48px;right:48px;bottom:54px;z-index:6;display:flex;flex-direction:column;gap:16px;align-items:flex-start}
.aw-k{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;font-weight:700;letter-spacing:.34em;text-transform:uppercase;color:#E2BE84}
.aw-h{margin:0;font-size:104px;font-weight:800;font-stretch:125%;text-transform:uppercase;line-height:.84;color:#fff;letter-spacing:.01em}
.aw-sub{margin:0;font-size:18px;line-height:1.45;color:#d5d9de;max-width:60ch}
.aw-vig{position:absolute;inset:0;z-index:4;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,transparent 40%,rgba(0,0,0,.8) 100%)}
.aw-tabs{display:flex;gap:34px;padding:0 48px;border-bottom:1px solid var(--ln);background:var(--bg)}
.aw-tabs a{position:relative;padding:20px 0 18px;font-size:13px;font-weight:800;font-stretch:118%;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);text-decoration:none}
.aw-tabs a:hover{color:var(--ink)}
.aw-tabs a.on{color:var(--ink)}
.aw-tabs a.on::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:4px;background:var(--ink);transform:skewX(-22deg)}
.aw-body{padding:34px 48px 48px;display:flex;flex-direction:column;gap:26px}
.aw-row{display:flex;justify-content:space-between;align-items:baseline;gap:20px;flex-wrap:wrap}
.aw-row h2{margin:0;font-size:30px;font-weight:800;font-stretch:125%;text-transform:uppercase}
.aw-cats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.aw-cat{position:relative;display:flex;align-items:center;gap:12px;min-height:58px;padding:10px 16px;border:0;background:var(--b1);outline:1px solid var(--ln);outline-offset:-1px;color:var(--ink2);font:inherit;font-size:14px;font-weight:700;text-align:left;cursor:pointer;transition:outline-color .2s,color .2s,background .2s}
.aw-cat small{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.1em;color:var(--fnt)}
.aw-cat:hover,.aw-cat:focus-visible{outline-color:var(--ink);color:var(--ink)}
.aw-cat.on{background:var(--b2);outline:2px solid var(--ink);outline-offset:-2px;color:#fff}
.aw-cat.ok::after{content:"VOTADO";margin-left:auto;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:.14em;color:#1b1206;background:var(--now);padding:3px 7px;transform:skewX(-12deg)}
.aw-sel{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;padding:26px 30px;background:#000;outline:1px solid var(--ln)}
.aw-sel h3{margin:6px 0 8px;font-size:38px;font-weight:800;font-stretch:125%;text-transform:uppercase;line-height:.95;color:#fff}
.aw-sel p{margin:0;font-size:14px;line-height:1.5;color:#b9bfc6;max-width:74ch}
.aw-dust,.aw-rise{position:absolute;inset:0;z-index:3;pointer-events:none}
.aw-dust i{position:absolute;left:var(--x);top:var(--y);width:var(--s);height:var(--s);background:#F6E2B0;border-radius:50%;opacity:0;animation:aw-float var(--t) var(--d) linear infinite}
@keyframes aw-float{0%{opacity:0;transform:translate(0,20px)}20%{opacity:.85}80%{opacity:.5}100%{opacity:0;transform:translate(34px,-96px)}}
.aw-rise i{position:absolute;left:var(--x);top:100%;width:var(--s);height:calc(var(--s)*3);background:#F6E2B0;opacity:0;animation:aw-up var(--t) var(--d) linear infinite}
@keyframes aw-up{0%{opacity:0;transform:translateY(0)}12%{opacity:.9}100%{opacity:0;transform:translateY(-700px)}}
/* troféu (desenho simplificado) */
.tz{display:block;overflow:visible}
.tz .g1{fill:#F6E2B0}.tz .g2{fill:#E2BE84}.tz .g3{fill:#B98A3E}.tz .g4{fill:#8a6428}
.tz .cu{stroke:#C8763A;fill:none}
.tz .mb{fill:#0c0c0e;stroke:#3a2a1c;stroke-width:1}
.tz .px rect{fill:#E2BE84;animation:tz-px 2.4s var(--d) linear infinite}
@keyframes tz-px{0%{opacity:0;transform:translate(0,0)}15%{opacity:.95}100%{opacity:0;transform:translate(46px,10px)}}
.tz .fl{transform-origin:215px 72px;animation:tz-wave 3.2s ease-in-out infinite alternate}
@keyframes tz-wave{from{transform:skewY(-3deg) scaleX(.97)}to{transform:skewY(3deg) scaleX(1.03)}}
/* 1 · Cerimônia */
.cer-spot{position:absolute;top:-12%;width:360px;height:135%;z-index:2;background:linear-gradient(180deg,rgba(255,236,200,.42),rgba(255,226,170,.1) 60%,transparent 86%);clip-path:polygon(44% 0,56% 0,100% 100%,0 100%);transform-origin:50% 0;mix-blend-mode:screen;animation:cer-sweep var(--t) var(--d) ease-in-out infinite alternate}
@keyframes cer-sweep{from{transform:rotate(-26deg)}to{transform:rotate(26deg)}}
.cer-floor{position:absolute;left:0;right:0;bottom:0;height:42%;z-index:1;background:radial-gradient(ellipse at 50% 100%,rgba(226,190,132,.28),transparent 62%),repeating-linear-gradient(90deg,rgba(255,255,255,.04) 0 1px,transparent 1px 80px)}
.cer-tz{position:absolute;right:120px;bottom:0;z-index:5;filter:drop-shadow(0 0 40px rgba(246,226,176,.35))}
.cer .lt{display:inline-block;opacity:.07}
.cer.ra .lt{animation:cer-a 1.1s var(--d) cubic-bezier(.2,.7,.2,1) forwards}
.cer.rb .lt{animation:cer-b 1.1s var(--d) cubic-bezier(.2,.7,.2,1) forwards}
@keyframes cer-a{0%{opacity:.07;text-shadow:none}35%{opacity:1;color:#FFF3D6;text-shadow:0 0 34px #FFD9A3,0 0 90px rgba(255,178,91,.8)}100%{opacity:1;color:#fff;text-shadow:0 0 22px rgba(246,226,176,.25)}}
@keyframes cer-b{0%{opacity:.07;text-shadow:none}35%{opacity:1;color:#FFF3D6;text-shadow:0 0 34px #FFD9A3,0 0 90px rgba(255,178,91,.8)}100%{opacity:1;color:#fff;text-shadow:0 0 22px rgba(246,226,176,.25)}}
.aw-sel.sa{animation:aw-wipe-a .8s cubic-bezier(.7,0,.2,1)}
.aw-sel.sb{animation:aw-wipe-b .8s cubic-bezier(.7,0,.2,1)}
@keyframes aw-wipe-a{from{clip-path:polygon(0 0,0 0,-12% 100%,-12% 100%)}to{clip-path:polygon(0 0,112% 0,100% 100%,-12% 100%)}}
@keyframes aw-wipe-b{from{clip-path:polygon(0 0,0 0,-12% 100%,-12% 100%)}to{clip-path:polygon(0 0,112% 0,100% 100%,-12% 100%)}}
/* 2 · Ascensão */
.asc .aw-hero{height:680px}
.asc-sky{position:absolute;left:0;right:0;bottom:0;height:2720px;z-index:1;transition:transform 1.9s cubic-bezier(.5,0,.2,1);background:linear-gradient(0deg,#050506 0%,#0b0a09 22%,#1d160b 44%,#4a3413 64%,#a8782d 82%,#F6E2B0 96%,#fff 100%)}
.asc-sky .st{position:absolute;left:48px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.55)}
.asc-sky .st::after{content:"";position:absolute;left:0;top:26px;width:1184px;height:1px;background:rgba(255,255,255,.14)}
.asc-tz{position:absolute;left:50%;top:150px;margin-left:-120px;filter:drop-shadow(0 0 60px rgba(255,255,255,.8))}
.asc-halo{position:absolute;left:50%;top:40px;width:900px;height:900px;margin-left:-450px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.85),rgba(246,226,176,.4) 30%,transparent 62%)}
.asc-nav{position:absolute;right:48px;top:40px;z-index:7;display:flex;flex-direction:column;gap:8px}
.asc-nav button{display:flex;align-items:center;gap:10px;padding:9px 14px;border:0;background:rgba(5,5,6,.72);outline:1px solid rgba(255,255,255,.22);color:#c9ced4;font:inherit;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}
.asc-nav button::before{content:"";width:9px;height:9px;border:1.5px solid currentColor;transform:skewX(-22deg)}
.asc-nav button:hover,.asc-nav button:focus-visible{outline-color:#fff;color:#fff}
.asc-nav button.on{outline:2px solid #FFB25B;color:#FFB25B}
.asc-nav button.on::before{background:#FFB25B}
.asc .aw-hero .in{text-shadow:0 2px 24px rgba(0,0,0,.9)}
/* 3 · Forja */
.for .aw-hero{background:radial-gradient(ellipse at 50% 108%,#7a2c08 0%,#2a0f04 34%,#060303 68%)}
.for-glow{position:absolute;left:0;right:0;bottom:-40px;height:190px;z-index:1;background:radial-gradient(ellipse at 50% 100%,#FFB25B,rgba(255,110,30,.5) 40%,transparent 72%);animation:for-breathe 3.4s ease-in-out infinite alternate}
@keyframes for-breathe{from{opacity:.65}to{opacity:1}}
.for-sp{position:absolute;inset:0;z-index:3;pointer-events:none}
.for-sp i{position:absolute;left:var(--x);bottom:30px;width:var(--s);height:calc(var(--s)*4);border-radius:2px;background:#FFD9A3;box-shadow:0 0 8px 2px rgba(255,150,60,.8);opacity:0;animation:for-fly var(--t) var(--d) cubic-bezier(.2,.6,.4,1) infinite}
@keyframes for-fly{0%{opacity:0;transform:translate(0,0) rotate(0)}8%{opacity:1}70%{opacity:.9;background:#FF8A3D}100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(40deg);background:#C8763A}}
.for-h{background:linear-gradient(100deg,#8a6428 0%,#E2BE84 22%,#FFF3D6 38%,#FFB25B 52%,#C8763A 70%,#8a6428 100%);background-size:260% 100%;-webkit-background-clip:text;background-clip:text;color:transparent!important;animation:for-pour 7s linear infinite}
@keyframes for-pour{from{background-position:130% 0}to{background-position:-130% 0}}
.for-veins{position:absolute;inset:0;z-index:2;width:100%;height:100%}
.for-veins path{fill:none;stroke:#C8763A;stroke-width:1.6;stroke-dasharray:1400;stroke-dashoffset:1400;filter:drop-shadow(0 0 6px rgba(255,140,60,.8))}
.for.ra .for-veins path{animation:for-vein-a 4.5s var(--d) ease-out forwards}
.for.rb .for-veins path{animation:for-vein-b 4.5s var(--d) ease-out forwards}
@keyframes for-vein-a{to{stroke-dashoffset:0}}
@keyframes for-vein-b{to{stroke-dashoffset:0}}
.for .aw-sel.sa{animation:for-stamp-a .55s cubic-bezier(.2,1.5,.4,1)}
.for .aw-sel.sb{animation:for-stamp-b .55s cubic-bezier(.2,1.5,.4,1)}
@keyframes for-stamp-a{0%{transform:scale(1.5);filter:brightness(4);opacity:0}45%{transform:scale(.97);filter:brightness(2.2);opacity:1}62%{transform:translate(-5px,3px)}78%{transform:translate(4px,-2px)}100%{transform:none;filter:none}}
@keyframes for-stamp-b{0%{transform:scale(1.5);filter:brightness(4);opacity:0}45%{transform:scale(.97);filter:brightness(2.2);opacity:1}62%{transform:translate(-5px,3px)}78%{transform:translate(4px,-2px)}100%{transform:none;filter:none}}
.for .aw-sel{outline-color:#C8763A}
.for .aw-sel h3{background:linear-gradient(180deg,#FFF3D6,#E2BE84 60%,#B98A3E);-webkit-background-clip:text;background-clip:text;color:transparent}
/* 4 · Constelação */
.con .aw-hero{height:820px;background:radial-gradient(ellipse at 30% 20%,#141a33 0%,#070813 46%,#020205 80%)}
.con-l{position:absolute;inset:-40px;transition:transform .25s ease-out}
.con-bg i{position:absolute;left:var(--x);top:var(--y);width:var(--s);height:var(--s);border-radius:50%;background:#fff;opacity:.5;animation:con-tw var(--t) var(--d) ease-in-out infinite alternate}
@keyframes con-tw{from{opacity:.12}to{opacity:.85}}
.con-lines{position:absolute;inset:0;width:100%;height:100%}
.con-lines polyline{fill:none;stroke:#E2BE84;stroke-width:.14;stroke-dasharray:.5 .7;opacity:.55;vector-effect:non-scaling-stroke;stroke-width:1.2px}
.con-star{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border:0;background:none;padding:0;cursor:pointer;z-index:2}
.con-star i{position:absolute;inset:11px;background:#c9ced4;clip-path:polygon(STARPTS);transition:inset .25s,background .25s,filter .25s}
.con-star span{position:absolute;left:50%;top:44px;transform:translateX(-50%);white-space:nowrap;font-size:12px;font-weight:700;letter-spacing:.06em;color:#fff;background:rgba(2,2,5,.85);padding:4px 8px;opacity:0;pointer-events:none;transition:opacity .2s}
.con-star:hover i,.con-star:focus-visible i{inset:2px;background:#fff;filter:drop-shadow(0 0 10px #fff)}
.con-star:hover span,.con-star:focus-visible span,.con-star.on span{opacity:1}
.con-star:focus-visible{outline:2px solid #fff;outline-offset:2px}
.con-star.on i{inset:-4px;background:#FFB25B;filter:drop-shadow(0 0 14px #FFB25B)}
.con-star.ok i{background:#E2BE84}
.con-star.on span{color:#FFB25B}
.con .aw-hero .in{bottom:auto;top:44px}
.con .aw-h{font-size:64px}
.con-sel{position:absolute;left:48px;right:48px;bottom:34px;z-index:6}
/* 5 · Contagem */
.cd .aw-hero{height:600px;background:radial-gradient(ellipse at 50% 60%,#17130c 0%,#060606 60%)}
.cd-clock{position:absolute;left:0;right:0;top:120px;z-index:5;display:flex;justify-content:center;align-items:flex-start;gap:26px}
.cd-u{display:flex;flex-direction:column;align-items:center;gap:10px;position:relative}
.cd-n{font-size:190px;font-weight:800;font-stretch:125%;line-height:.82;color:#fff;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.cd-u small{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;letter-spacing:.34em;text-transform:uppercase;color:#E2BE84}
.cd-c{font-size:150px;font-weight:800;line-height:.9;color:#3a3a3a}
.cd-n.fa{animation:cd-a .85s cubic-bezier(.2,.7,.2,1)}
.cd-n.fb{animation:cd-b .85s cubic-bezier(.2,.7,.2,1)}
@keyframes cd-a{0%{opacity:.15;filter:blur(9px);transform:translateY(-16px) scale(1.07);color:#FFB25B}100%{opacity:1;filter:none;transform:none;color:#fff}}
@keyframes cd-b{0%{opacity:.15;filter:blur(9px);transform:translateY(-16px) scale(1.07);color:#FFB25B}100%{opacity:1;filter:none;transform:none;color:#fff}}
.cd-burst{position:absolute;left:50%;top:70px;width:0;height:0}
.cd-burst i{position:absolute;width:var(--s);height:var(--s);background:#FFB25B;opacity:0}
.cd-burst.fa i{animation:cd-pa .85s ease-out}
.cd-burst.fb i{animation:cd-pb .85s ease-out}
@keyframes cd-pa{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(var(--dx),var(--dy))}}
@keyframes cd-pb{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(var(--dx),var(--dy))}}
.cd-ph{position:absolute;left:0;right:0;top:44px;z-index:6;display:flex;justify-content:center;gap:10px}
.cd-ph button{padding:9px 16px;border:0;background:rgba(5,5,6,.7);outline:1px solid rgba(255,255,255,.22);color:#c9ced4;font:inherit;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transform:skewX(-12deg)}
.cd-ph button.on{outline:2px solid #fff;color:#fff;background:#17191c}
.cd-prog{position:absolute;left:48px;right:48px;bottom:44px;z-index:6;display:flex;flex-direction:column;gap:12px}
.cd-bar{height:10px;background:rgba(255,255,255,.1);transform:skewX(-22deg);overflow:hidden}
.cd-bar i{display:block;height:100%;background:#FFB25B;box-shadow:0 0 16px rgba(255,178,91,.7);transition:width .5s cubic-bezier(.2,.7,.2,1)}
/* 6 · Zênite */
.zen-stage{position:relative;height:760px;overflow:hidden;background:radial-gradient(ellipse at 34% 46%,#2a2113 0%,#0c0a07 44%,#020202 78%);isolation:isolate;perspective:1400px}
.zen-rays{position:absolute;left:34%;top:46%;width:1500px;height:1500px;margin:-750px 0 0 -750px;z-index:1;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(246,226,176,.13) 0 2deg,transparent 2deg 9deg);-webkit-mask:radial-gradient(circle,#000 0,transparent 62%);mask:radial-gradient(circle,#000 0,transparent 62%);animation:zen-spin 80s linear infinite}
@keyframes zen-spin{to{transform:rotate(360deg)}}
.zen-tz{position:absolute;left:34%;top:60px;width:380px;margin-left:-190px;z-index:4;transform-style:preserve-3d;transition:transform .2s ease-out,scale .6s cubic-bezier(.2,.7,.2,1)}
.zen-stage.zoom .zen-tz{scale:1.3}
.zen-stage.zoom .zen-info{opacity:0;pointer-events:none}
.zen-sheen{position:absolute;inset:0;z-index:5;pointer-events:none;mix-blend-mode:screen;background:radial-gradient(circle at var(--sx,50%) var(--sy,30%),rgba(255,255,255,.5),transparent 34%)}
.zen-info{position:absolute;right:48px;top:70px;width:470px;z-index:6;display:flex;flex-direction:column;gap:18px;transition:opacity .4s}
.zen-info h1{margin:0;font-size:120px;font-weight:800;font-stretch:125%;text-transform:uppercase;line-height:.82;color:#fff}
.zen-parts{display:flex;flex-direction:column;gap:6px}
.zen-parts button{display:grid;grid-template-columns:34px minmax(0,1fr);align-items:center;gap:10px;padding:12px 14px;border:0;background:rgba(5,5,6,.7);outline:1px solid rgba(255,255,255,.18);outline-offset:-1px;color:#c9ced4;font:inherit;font-size:14px;font-weight:700;text-align:left;cursor:pointer}
.zen-parts button small{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.14em;color:#8b9199}
.zen-parts button:hover,.zen-parts button:focus-visible{outline-color:#fff;color:#fff}
.zen-parts button.on{outline:2px solid #E2BE84;outline-offset:-2px;color:#fff;background:#17130c}
.zen-parts button.on small{color:#E2BE84}
.zen-txt{margin:0;font-size:16px;line-height:1.55;color:#d5d9de;min-height:100px}
.zen-tz .tz [data-p]{transition:opacity .4s,filter .4s}
.zen-tz.p0 .tz [data-p]:not([data-p="0"]),.zen-tz.p1 .tz [data-p]:not([data-p="1"]),.zen-tz.p2 .tz [data-p]:not([data-p="2"]),.zen-tz.p3 .tz [data-p]:not([data-p="3"]){opacity:.22;filter:saturate(.2)}
.zen-tz.p0 .tz [data-p="0"],.zen-tz.p1 .tz [data-p="1"],.zen-tz.p2 .tz [data-p="2"],.zen-tz.p3 .tz [data-p="3"]{filter:drop-shadow(0 0 14px rgba(246,226,176,.75))}
.zen-arc{position:relative;height:250px;overflow:hidden;background:linear-gradient(180deg,#0b0d18,#1a1408 70%,#2a1c08);outline:1px solid var(--ln)}
.zen-arc svg{position:absolute;inset:0;width:100%;height:100%}
.zen-arc path{fill:none;stroke:rgba(246,226,176,.35);stroke-width:1.5;stroke-dasharray:5 7}
.zen-sun{position:absolute;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:#fff;box-shadow:0 0 30px 10px rgba(255,226,170,.8),0 0 110px 40px rgba(255,178,91,.35);offset-path:path("M 60 235 Q 592 -190 1124 235");offset-distance:8%;transition:offset-distance 2.4s cubic-bezier(.4,0,.2,1)}
.zen-arc:hover .zen-sun,.zen-arc:focus-within .zen-sun,.zen-arc.up .zen-sun{offset-distance:50%}
.zen-arc .cp{position:absolute;left:36px;top:28px;right:36px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
.zen-arc .cp p{margin:8px 0 0;font-size:15px;line-height:1.5;color:#d5d9de;max-width:44ch}
.zen-ped{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.zen-ped div{position:relative;height:190px;background:linear-gradient(180deg,#0b0c0e,#050506);outline:1px dashed var(--ln);display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:16px}
.zen-ped div::before{content:"";position:absolute;left:50%;top:26px;width:54px;height:92px;margin-left:-27px;background:#15171a;clip-path:polygon(40% 0,60% 0,66% 62%,100% 100%,0 100%,34% 62%)}
.zen-ped b{font-size:15px;color:var(--ink)}
.zen-ped small{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--fnt)}
'''
def starpts():
    pts = []
    for k in range(16):
        r = 50 if k % 4 == 0 else (34 if k % 2 == 0 else 16)
        a = math.pi * 2 * k / 16 - math.pi / 2
        pts.append(f'{50 + r * math.cos(a):.1f}% {50 + r * math.sin(a):.1f}%')
    return ','.join(pts)
CSS = CSS.replace('STARPTS', starpts())

def dots(n, seed, extra=''):
    r = random.Random(seed)
    return ''.join(f'<i style="--x: {r.random() * 100:.1f}%; --y: {r.random() * 100:.1f}%; --d: {-r.random() * 14:.1f}s; --t: {6 + r.random() * 10:.1f}s; --s: {1 + r.random() * 3:.1f}px{extra}"></i>' for _ in range(n))

def trofeu(w=240):
    px = ''.join(f'<rect x="{292 + (i % 4) * 9}" y="{58 + (i * 7) % 46}" width="6" height="6" style="--d: {-i * .21:.2f}s"></rect>' for i in range(12))
    return (f'<svg class="tz" width="{w}" viewBox="0 0 340 520" role="img" aria-label="Troféu Zênite (desenho simplificado)">'
            '<g data-p="3"><polygon class="mb" points="95,455 205,455 215,472 85,472"></polygon><polygon class="mb" points="85,472 215,472 232,512 68,512"></polygon>'
            '<path class="cu" stroke-width="1.4" d="M80 498 L112 486 L128 500 L160 478 L186 492 L222 480"></path><path class="cu" stroke-width="1" d="M100 508 L136 494 L150 506 M178 508 L196 488"></path>'
            '<text x="150" y="500" text-anchor="middle" font-size="13" font-weight="800" fill="#C8763A" font-family="Archivo, sans-serif">WZ</text></g>'
            '<g data-p="0"><polygon class="g3" points="136,455 150,338 150,455"></polygon><polygon class="g2" points="150,455 150,338 166,455"></polygon>'
            '<polygon class="g2" points="128,340 150,340 150,250 135,250"></polygon><polygon class="g1" points="150,340 172,340 165,250 150,250"></polygon>'
            '<polygon class="g4" points="135,256 116,330 127,336 141,268"></polygon>'
            '<polygon class="g1" points="140,246 160,246 164,222 150,208 136,222"></polygon><polygon class="g3" points="140,246 150,246 150,208 136,222"></polygon>'
            '<polygon class="g2" points="162,256 194,178 204,185 174,272"></polygon><polygon class="g1" points="194,178 204,185 208,172 198,168"></polygon></g>'
            '<g data-p="1"><line class="cu" x1="201" y1="188" x2="216" y2="36" stroke-width="5" stroke-linecap="square"></line><circle cx="216" cy="34" r="5" fill="#C8763A"></circle></g>'
            '<g data-p="2"><g class="fl"><polygon class="g2" points="216,44 292,58 280,84 292,110 213,100"></polygon><polygon class="g1" points="216,44 292,58 280,84 214,72"></polygon>'
            '<polygon fill="#fff" points="250,60 253,74 266,77 253,80 250,94 247,80 234,77 247,74"></polygon><polygon fill="#fff" opacity=".8" points="250,68 256,71 259,77 256,83 250,86 244,83 241,77 244,71"></polygon></g>'
            f'<g class="px">{px}</g></g></svg>')

def tabsnav(active):
    t = [('Votação', 'Main.dc.html'), ('Troféu Zênite', 'Zenite.dc.html'), ('Como funciona', '#'), ('Edições', '#')]
    return '<nav class="aw-tabs" aria-label="Seções do Awards">' + ''.join(f'<a href="{h}" class="{"on" if i == active else ""}">{n}</a>' for i, (n, h) in enumerate(t)) + '</nav>'
def cats():
    return '<div class="aw-cats">' + ''.join(f'<button type="button" class="aw-cat {{{{c{i}}}}}" onClick="{{{{g{i}}}}}"><small>{i + 1:02d}</small>{c}</button>' for i, c in enumerate(CATS)) + '</div>'
NOTA = 'A apresentação dos indicados continua exatamente como é hoje: cena em tela larga, zoom lento, reflexo de lente, luz vazando, granulado, faixas pretas e clarão.'
def sel(extra=''):
    return (f'<section class="aw-sel {{{{selCls}}}}"{extra}><div><span class="aw-k">{{{{selK}}}}</span><h3>{{{{selName}}}}</h3><p>{NOTA}</p></div>'
            '<button type="button" class="btn pri" onClick="{{vote}}"><i class="btn__led"></i><span class="btn__t"><span>{{voteLabel}}</span><span aria-hidden="true">{{voteLabel}}</span></span><i class="btn__ar"></i></button></section>')
def corpo(titulo='As 19 categorias', dica='Toque numa categoria para ver como ela entra.'):
    return f'<div class="aw-body"><div class="aw-row"><h2>{titulo}</h2><span class="meta">{dica} · Você votou em <b>{{{{nv}}}}</b> de 19</span></div>{sel()}{cats()}</div>'
def jsbtn(label, hole, k='sec'):
    return f'<button type="button" class="btn {k}" onClick="{{{{{hole}}}}}"><i class="btn__led"></i><span class="btn__t"><span>{label}</span><span aria-hidden="true">{label}</span></span><i class="btn__ar"></i></button>'
def letras(t):
    return ''.join((f'<span class="lt" style="--d: {i * .055:.2f}s">{c}</span>' if c != ' ' else ' ') for i, c in enumerate(t))

# ---------------------------------------------------------------- quadros
def b_cerimonia():
    hero = ('<section class="aw-hero"><div class="cer-floor"></div>'
            + ''.join(f'<i class="cer-spot" style="left: {x}px; --t: {t}s; --d: {d}s"></i>' for x, t, d in [(60, 9, 0), (360, 11, -4), (700, 8, -2), (960, 12, -7)])
            + f'<div class="aw-dust">{dots(70, 3)}</div><div class="cer-tz">{trofeu(250)}</div><div class="aw-vig"></div>'
            f'<div class="in"><span class="aw-k">Edição 2026 · votação em dezembro</span><h1 class="aw-h">{letras("WinnerZ")}<br>{letras("Awards")}</h1>'
            '<p class="aw-sub">Dezenove categorias. Um troféu. Quem decide é você.</p>'
            f'<div style="display: flex; gap: 14px; flex-wrap: wrap">{btn("Começar a votar", "pri", "lg")}{jsbtn("Rever a abertura", "replay")}</div></div></section>')
    return f'<div class="aw cer {{{{run}}}}">{header("Eventos")}{hero}{tabsnav(0)}{corpo(dica="Cada categoria entra com o corte em lâmina.")}</div>', 1640, {}

def b_ascensao():
    stops = ['O chão', 'A subida', 'Quase lá', 'O zênite']
    sky = ('<div class="asc-sky" style="transform: {{sky}}"><div class="asc-halo"></div>' + f'<div class="asc-tz">{trofeu(240)}</div>'
           + ''.join(f'<span class="st" style="bottom: {i * 680 + 620}px">{i + 1:02d} · {s}</span>' for i, s in enumerate(stops)) + '</div>')
    nav = '<div class="asc-nav">' + ''.join(f'<button type="button" class="{{{{a{i}}}}}" onClick="{{{{ga{i}}}}}">{s}</button>' for i, s in reversed(list(enumerate(stops)))) + '</div>'
    hero = (f'<section class="aw-hero">{sky}<div class="aw-rise">{dots(60, 9)}</div>{nav}'
            '<div class="in"><span class="aw-k">{{altK}}</span><h1 class="aw-h" style="font-size: 84px">{{altT}}</h1><p class="aw-sub">{{altX}}</p>'
            f'<div style="display: flex; gap: 14px; flex-wrap: wrap">{jsbtn("{{climbLabel}}", "climb", "pri")}{jsbtn("Voltar ao chão", "ga0")}</div></div></section>')
    js = {'state': "alt: 0", 'extra': """
    const ALT = [['WinnerZ Awards 2026', 'Tudo começa aqui embaixo', 'A página sobe com você. Lá em cima está o Zênite, o ponto mais alto do céu.'],
      ['Dezenove categorias', 'Cada voto é um degrau', 'As categorias ficam no caminho. A cada voto, a luz chega um pouco mais perto.'],
      ['Falta pouco', 'O céu começa a dourar', 'Quem votou em tudo chega ao topo e assiste à revelação lá de cima.'],
      ['O ponto mais alto', 'Zênite', 'O troféu espera no alto, sob a luz mais forte da página.']];
    v.sky = 'translateY(' + (s.alt * 680) + 'px)';
    v.altK = ALT[s.alt][0]; v.altT = ALT[s.alt][1]; v.altX = ALT[s.alt][2];
    v.climbLabel = s.alt >= 3 ? 'Você chegou ao zênite' : 'Subir';
    v.climb = () => this.setState({ alt: Math.min(3, this.state.alt + 1) });
    for (let k = 0; k < 4; k++) { v['a' + k] = k === s.alt ? 'on' : ''; v['ga' + k] = () => this.setState({ alt: k }); }"""}
    return f'<div class="aw asc">{header("Eventos")}{hero}{tabsnav(0)}{corpo(dica="As categorias são os degraus da subida.")}</div>', 1700, js

def b_forja():
    r = random.Random(5)
    sp = ''.join(f'<i style="--x: {30 + r.random() * 40:.1f}%; --dx: {(r.random() - .5) * 620:.0f}px; --dy: {-(160 + r.random() * 420):.0f}px; --d: {-r.random() * 3:.2f}s; --t: {1.2 + r.random() * 2.2:.2f}s; --s: {1.5 + r.random() * 2.5:.1f}px"></i>' for _ in range(56))
    veins = ('<svg class="for-veins" viewBox="0 0 1280 620" preserveAspectRatio="none" aria-hidden="true">'
             '<path style="--d: 0s" d="M-10 420 L140 380 L210 440 L360 350 L470 410 L640 300 L720 360 L900 280 L1010 340 L1290 250"></path>'
             '<path style="--d: .5s" d="M360 350 L400 250 L520 210 L560 120 L700 90"></path><path style="--d: .9s" d="M900 280 L940 180 L1080 150 L1130 60"></path>'
             '<path style="--d: 1.2s" d="M140 380 L120 260 L230 200 L250 110"></path></svg>')
    hero = (f'<section class="aw-hero">{veins}<div class="for-glow"></div><div class="for-sp">{sp}</div><div class="aw-vig"></div>'
            '<div class="in"><span class="aw-k">Edição 2026 · forjado em ouro, cobre e mármore negro</span><h1 class="aw-h for-h">WinnerZ<br>Awards</h1>'
            '<p class="aw-sub">O troféu ainda está quente. Cada voto é mais uma batida do martelo.</p>'
            f'<div style="display: flex; gap: 14px; flex-wrap: wrap">{btn("Começar a votar", "pri", "lg")}{jsbtn("Reacender os veios", "replay")}</div></div></section>')
    return f'<div class="aw for {{{{run}}}}">{header("Eventos")}{hero}{tabsnav(0)}{corpo(dica="Cada categoria é cunhada com um impacto.")}</div>', 1640, {}

def b_constelacao():
    r = random.Random(11)
    pos = []
    for i in range(N):
        row, col = (0, i) if i < 7 else ((1, i - 7) if i < 14 else (2, i - 14))
        n = 7 if row < 2 else 5
        pos.append((8 + (col + .5 + (row % 2) * .35) * (84 / n) + (r.random() - .5) * 5, 30 + row * 17 + (r.random() - .5) * 9))
    stars = ''.join(f'<button type="button" class="con-star {{{{c{i}}}}}" style="left: {x:.1f}%; top: {y:.1f}%" onClick="{{{{g{i}}}}}" aria-label="{CATS[i]}"><i></i><span>{CATS[i]}</span></button>' for i, (x, y) in enumerate(pos))
    line = f'<svg class="con-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in pos)}"></polyline></svg>'
    hero = ('<section class="aw-hero" onMouseMove="{{mv}}">'
            f'<div class="con-l con-bg" style="transform: {{{{l1}}}}">{dots(130, 21)}</div>'
            f'<div class="con-l" style="transform: {{{{l2}}}}">{line}{stars}</div><div class="aw-vig"></div>'
            '<div class="in"><span class="aw-k">Edição 2026 · mova o mouse pelo céu</span><h1 class="aw-h">WinnerZ Awards</h1></div>'
            f'<div class="con-sel">{sel()}</div></section>')
    js = {'state': "mx: .5, my: .5", 'extra': """
    v.mv = (e) => { const b = e.currentTarget.getBoundingClientRect(); const x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
      if (Math.abs(x - this.state.mx) > .012 || Math.abs(y - this.state.my) > .012) this.setState({ mx: x, my: y }); };
    v.l1 = 'translate(' + ((.5 - s.mx) * 22).toFixed(1) + 'px,' + ((.5 - s.my) * 16).toFixed(1) + 'px)';
    v.l2 = 'translate(' + ((.5 - s.mx) * 54).toFixed(1) + 'px,' + ((.5 - s.my) * 36).toFixed(1) + 'px)';"""}
    extra = ('<div class="aw-body"><div class="aw-row"><h2>Como se lê o céu</h2><span class="meta">Você votou em <b>{{nv}}</b> de 19</span></div>'
             '<p class="lead" style="max-width: 80ch">Cada estrela de oito pontas, a mesma da bandeira do troféu, é uma categoria. A estrela âmbar é a que você abriu; as douradas são as que você já votou. O rastro pontilhado liga uma à outra, na ordem da cerimônia.</p></div>')
    return f'<div class="aw con">{header("Eventos")}{hero}{tabsnav(0)}{extra}</div>', 1260, js

def b_contagem():
    r = random.Random(8)
    burst = ''.join(f'<i style="--dx: {(r.random() - .5) * 260:.0f}px; --dy: {(r.random() - .5) * 200:.0f}px; --s: {3 + r.random() * 5:.0f}px"></i>' for _ in range(22))
    def unit(h, lb, cls=''):
        return f'<div class="cd-u"><span class="cd-n {cls}">{{{{{h}}}}}</span><small>{lb}</small></div>'
    clock = ('<div class="cd-clock">' + unit('dd', 'dias') + '<span class="cd-c">:</span>' + unit('hh', 'horas') + '<span class="cd-c">:</span>' + unit('mm', 'minutos', '{{mCls}}') + '<span class="cd-c">:</span>'
             + f'<div class="cd-u"><span class="cd-n {{{{sCls}}}}">{{{{ss}}}}</span><span class="cd-burst {{{{sCls}}}}">{burst}</span><small>segundos</small></div></div>')
    hero = (f'<section class="aw-hero"><div class="aw-dust">{dots(40, 13)}</div><div class="aw-vig"></div>'
            '<div class="cd-ph"><button type="button" class="{{ph0}}" onClick="{{gp0}}">Votação aberta</button><button type="button" class="{{ph1}}" onClick="{{gp1}}">Esperando a revelação</button></div>'
            + clock + '<div class="cd-prog"><div class="aw-row"><span class="aw-k">{{phK}}</span><span class="meta" style="color: #d5d9de">{{phX}}</span></div><div class="cd-bar"><i style="width: {{pct}}"></i></div></div></section>')
    js = {'state': "t: 1068067, ph: 0", 'mount': "this.timer = setInterval(() => this.setState({ t: Math.max(0, this.state.t - 1) }), 1000);", 'extra': """
    const p2 = (n) => String(n).padStart(2, '0');
    v.dd = p2(Math.floor(s.t / 86400)); v.hh = p2(Math.floor(s.t % 86400 / 3600)); v.mm = p2(Math.floor(s.t % 3600 / 60)); v.ss = p2(s.t % 60);
    v.sCls = s.t % 2 ? 'fa' : 'fb'; v.mCls = s.t % 60 === 59 ? 'fa' : '';
    v.ph0 = s.ph === 0 ? 'on' : ''; v.ph1 = s.ph === 1 ? 'on' : '';
    v.gp0 = () => this.setState({ ph: 0 }); v.gp1 = () => this.setState({ ph: 1 });
    v.phK = s.ph === 0 ? 'A votação fecha em' : 'Os vencedores aparecem em';
    v.phX = s.ph === 0 ? 'Você votou em ' + nv + ' de 19 categorias' : 'Seus votos estão guardados. O resultado fica lacrado até a hora.';
    v.pct = (nv / 19 * 100).toFixed(1) + '%';"""}
    return f'<div class="aw cd">{header("Eventos")}{hero}{tabsnav(0)}{corpo(dica="Toque e depois em Votar: a barra lá em cima enche.")}</div>', 1620, js

def b_zenite():
    parts = [('01', 'A figura'), ('02', 'O mastro'), ('03', 'A bandeira'), ('04', 'A base')]
    stage = ('<section class="zen-stage {{zoomCls}}" onMouseMove="{{mv}}"><div class="zen-rays"></div>' + f'<div class="aw-dust">{dots(80, 31)}</div>'
             + f'<div class="zen-tz {{{{pCls}}}}" style="transform: {{{{rot}}}}">{trofeu(380)}</div><div class="zen-sheen" style="--sx: {{{{sx}}}}; --sy: {{{{sy}}}}"></div><div class="aw-vig"></div>'
             '<div class="zen-info"><span class="aw-k">O troféu do WinnerZ Awards</span><h1>Zênite</h1>'
             '<div class="zen-parts">' + ''.join(f'<button type="button" class="{{{{p{i}}}}}" onClick="{{{{gp{i}}}}}"><small>{n}</small>{t}</button>' for i, (n, t) in enumerate(parts)) + '</div>'
             '<p class="zen-txt">{{pTxt}}</p></div>'
             f'<div style="position: absolute; left: 48px; bottom: 40px; z-index: 7; display: flex; gap: 14px">{jsbtn("{{zoomLabel}}", "zoom", "pri")}{jsbtn("Ver o troféu inteiro", "gpAll")}</div></section>')
    arc = ('<section class="zen-arc" tabindex="0"><svg viewBox="0 0 1184 250" preserveAspectRatio="none" aria-hidden="true"><path d="M 60 235 Q 592 -190 1124 235"></path></svg><i class="zen-sun"></i>'
           '<div class="cp"><div><span class="aw-k">Por que Zênite</span><p>Zênite é o ponto mais alto do céu, bem acima da sua cabeça. Passe o mouse aqui e veja a luz subir até lá.</p></div></div></section>')
    ped = ('<div class="zen-ped">' + ''.join(f'<div><b>{t}</b><small>{s}</small></div>' for t, s in [('Jogo do Ano 2026', 'lacrado até a revelação'), ('Jogo Brasileiro 2026', 'lacrado até a revelação'), ('Criador de Conteúdo 2026', 'lacrado até a revelação'), ('Edição 2027', 'ainda por vir')]) + '</div>')
    body = f'<div class="aw-body">{arc}<div class="aw-row"><h2>Quem já levou o Zênite</h2><span class="meta">Os pedestais acendem na revelação</span></div>{ped}</div>'
    js = {'state': "p: -1, zoom: false, mx: .5, my: .5", 'extra': """
    const TX = ['Uma figura humana lapidada em ouro, com um braço erguido. É quem joga: você, no momento em que chega lá.',
      'O mastro de cobre que a figura levanta. Cobre é o metal que conduz: liga quem faz o jogo a quem joga.',
      'A bandeira leva a estrela de oito pontas e solta um rastro de pixels, a marca de que tudo isso nasceu dos videogames.',
      'A base de mármore negro, cortada por veios de cobre, com o WZ gravado. É o chão de onde a subida começa.'];
    v.pTxt = s.p < 0 ? 'Toque numa parte para ver de perto. Mova o mouse sobre o troféu para girar e ver a luz correr pelo ouro.' : TX[s.p];
    v.pCls = s.p < 0 ? '' : 'p' + s.p;
    for (let k = 0; k < 4; k++) { v['p' + k] = k === s.p ? 'on' : ''; v['gp' + k] = () => this.setState({ p: k }); }
    v.gpAll = () => this.setState({ p: -1, zoom: false });
    v.zoom = () => this.setState({ zoom: !this.state.zoom }); v.zoomCls = s.zoom ? 'zoom' : ''; v.zoomLabel = s.zoom ? 'Sair do ver de perto' : 'Ver de perto';
    v.mv = (e) => { const b = e.currentTarget.getBoundingClientRect(); const x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
      if (Math.abs(x - this.state.mx) > .012 || Math.abs(y - this.state.my) > .012) this.setState({ mx: x, my: y }); };
    v.rot = 'rotateY(' + ((s.mx - .5) * 44).toFixed(1) + 'deg) rotateX(' + ((.5 - s.my) * 14).toFixed(1) + 'deg)';
    v.sx = (s.mx * 100).toFixed(0) + '%'; v.sy = (s.my * 100).toFixed(0) + '%';"""}
    return f'<div class="aw zen">{header("Eventos")}{tabsnav(1)}{stage}{body}</div>', 1700, js

LOGIC = """class Component extends DCLogic {
  state = { sel: -1, n: 0, k: 0, voted: {}, STATE };
  componentDidMount() { MOUNT }
  componentWillUnmount() { if (this.timer) clearInterval(this.timer); }
  renderVals() {
    const s = this.state, v = {};
    const CATS = CATLIST;
    const nv = Object.keys(s.voted).length;
    v.nv = String(nv);
    for (let k = 0; k < CATS.length; k++) {
      v['c' + k] = (k === s.sel ? 'on' : '') + (s.voted[k] ? ' ok' : '');
      v['g' + k] = () => this.setState({ sel: k, n: this.state.n + 1 });
    }
    v.selK = s.sel < 0 ? 'Categoria' : 'Categoria ' + String(s.sel + 1).padStart(2, '0') + ' de 19';
    v.selName = s.sel < 0 ? 'Escolha uma categoria' : CATS[s.sel];
    v.selCls = s.sel < 0 ? '' : (s.n % 2 ? 'sa' : 'sb');
    v.voteLabel = s.sel >= 0 && s.voted[s.sel] ? 'Desfazer o voto' : 'Votar (exemplo)';
    v.vote = () => { const i = this.state.sel; if (i < 0) return; const nx = Object.assign({}, this.state.voted); if (nx[i]) delete nx[i]; else nx[i] = 1; this.setState({ voted: nx }); };
    v.run = s.k % 2 ? 'rb' : 'ra';
    v.replay = () => this.setState({ k: this.state.k + 1 });
    EXTRA
    return v;
  }
}"""

BOARDS = [
 ('Main.dc.html', '1 · Cerimônia', b_cerimonia, 0, 0),
 ('Ascensao.dc.html', '2 · Ascensão', b_ascensao, 1360, 0),
 ('Forja.dc.html', '3 · Forja', b_forja, 2720, 0),
 ('Constelacao.dc.html', '4 · Constelação', b_constelacao, 0, 1820),
 ('Contagem.dc.html', '5 · Contagem', b_contagem, 1360, 1820),
 ('Zenite.dc.html', 'Aba · Troféu Zênite', b_zenite, 2720, 1820),
]
def main():
    boards, order = {}, []
    for fname, title, fn, x, y in BOARDS:
        body, h, js = fn()
        html = gen.page_file('U', 'dark', body, h, 'WinnerZ Awards · ' + title).replace('</style>', CSS.replace('</', '<\\/') + '</style>', 1)
        a = html.index('class Component extends DCLogic'); b = html.index('</script>', a)
        logic = LOGIC.replace('STATE', js.get('state', 'z: 0')).replace('MOUNT', js.get('mount', '')).replace('CATLIST', json.dumps(CATS, ensure_ascii=False)).replace('EXTRA', js.get('extra', ''))
        html = html[:a] + logic + '\n' + html[b:]
        open(os.path.join(OUT, fname), 'w', encoding='utf-8').write(html)
        boards[fname] = {'x': x, 'y': y, 'w': 1280, 'h': h, 'title': title, 'is_interactive': True}
        order.append(fname)
    notes = {
      't': {'x': 0, 'y': -300, 'text': 'WinnerZ Awards · página da estreia (aperte Play em cada quadro)', 'kind': 'title1', 'maxW': 4000},
      'n1': {'x': 4080, 'y': 0, 'w': 720, 'fill': 'orange', 'text': 'O que testar em cada quadro\n\n1 · Cerimônia: holofotes e poeira; "Rever a abertura" acende o título de novo; toque numa categoria.\n\n2 · Ascensão: "Subir" leva a página até o zênite, onde está o troféu.\n\n3 · Forja: faíscas e ouro derretido; toque numa categoria para cunhar.\n\n4 · Constelação: mova o mouse pelo céu; cada estrela é uma categoria.\n\n5 · Contagem: o relógio anda de verdade; vote nas categorias e veja a barra encher.\n\nAba Zênite: mova o mouse para girar o troféu; toque nas partes; "Ver de perto".'},
      'n2': {'x': 4080, 'y': 1820, 'w': 720, 'fill': 'gray', 'text': 'Avisos\n\n• O troféu aqui é um desenho simplificado, só para marcar o lugar. No site entra a sua imagem ou o modelo 3D do Zênite.\n\n• A apresentação dos indicados não aparece nestes quadros porque não muda: continua igual à de hoje.\n\n• As datas e o relógio são de exemplo.\n\n• Partículas e holofotes ficam em movimento o tempo todo; é a exceção à regra de animar só no mouse.'},
    }
    idx = {'v': 3, 'createdOnFiles': {'v': 1, 'at': datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%dT%H:%M:%SZ')}, 'title': 'WinnerZ Awards · página da estreia (prévias)',
           'launch': {'view': 'canvas'}, 'pages': [], 'boards': boards, 'order': order, 'notes': notes, 'designSystems': []}
    json.dump(idx, open(os.path.join(OUT, 'canvas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(boards), 'quadros')
main()
