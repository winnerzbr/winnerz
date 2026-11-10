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
/* ---- cinema: grão, faixas pretas, luz anamórfica, zoom lento ---- */
.A .grain{display:block!important;position:absolute;inset:0;width:100%;height:100%;opacity:.09;mix-blend-mode:overlay;pointer-events:none;z-index:60}
.cine .tl-ph{outline:0}
.cine .tl-ph::before{transform-origin:60% 40%;transition:transform 2.4s cubic-bezier(.2,.6,.2,1)}
.cine .tl-big{overflow:hidden;background:#000}
.cine .tl-big .tl-ph{inset:26px 0}
.cine .tl-big::before,.cine .tl-big::after{content:"";position:absolute;left:0;right:0;height:26px;background:#000;z-index:3}
.cine .tl-big::before{top:0}.cine .tl-big::after{bottom:0}
.cine .tl-big .vig{position:absolute;inset:26px 0;background:radial-gradient(ellipse at 50% 45%,transparent 46%,rgba(0,0,0,.72) 100%);z-index:1;pointer-events:none}
.cine .tl-big .tl-cap{bottom:26px;z-index:2}
.cine .tl-big .tl-ask{bottom:40px;z-index:4}
.cine .tl-big:hover .tl-ph::before{transform:scale(1.12)}
.streak{position:absolute;left:-30%;width:60%;height:2px;top:50%;background:linear-gradient(90deg,transparent,rgba(255,214,150,.0) 10%,rgba(255,226,180,.95) 50%,rgba(255,214,150,0) 90%,transparent);box-shadow:0 0 22px 5px rgba(255,190,110,.35),0 0 70px 16px rgba(255,170,80,.16);opacity:0;z-index:5;pointer-events:none}
.cine .tl-big:hover .streak,.tl-tc:hover .streak,.tl-open:hover .streak{animation:tl-sweep 1.5s cubic-bezier(.3,.6,.2,1) forwards}
@keyframes tl-sweep{0%{opacity:0;transform:translateX(0)}18%{opacity:1}100%{opacity:0;transform:translateX(220%)}}
.tl-tc{position:relative;overflow:hidden;display:grid;grid-template-columns:170px minmax(0,1fr);gap:30px;align-items:center;padding:34px 36px;background:#000;border-top:1px solid var(--ln);border-bottom:1px solid var(--ln)}
.tl-tc::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 12% 50%,rgba(255,178,91,.16),transparent 55%)}
.tl-tc .tl-rom{position:relative;font-size:120px;color:transparent;-webkit-text-stroke:1.5px var(--now)}
.tl-tc h2{margin:0;font-size:46px;font-weight:800;font-stretch:125%;text-transform:uppercase;letter-spacing:.06em;line-height:.95;color:#fff}
.tl-tc .tl-sum{color:#c9ced4}
.tl-tc .line{display:block;width:120px;height:2px;background:var(--now);box-shadow:0 0 14px 2px rgba(255,178,91,.5)}
.tl-open{position:relative;overflow:hidden;height:440px;background:#000}
.tl-open .tl-ph{position:absolute;inset:38px 0;outline:0}
.tl-open .tl-ph::before{transition:transform 3s cubic-bezier(.2,.6,.2,1);transform-origin:70% 30%}
.tl-open:hover .tl-ph::before{transform:scale(1.1)}
.tl-open .vig{position:absolute;inset:38px 0;background:linear-gradient(90deg,rgba(0,0,0,.88) 0%,rgba(0,0,0,.35) 52%,rgba(0,0,0,.1) 100%),radial-gradient(ellipse at 50% 50%,transparent 50%,rgba(0,0,0,.7) 100%)}
.tl-open .in{position:absolute;left:44px;top:38px;bottom:38px;display:flex;flex-direction:column;justify-content:center;gap:16px;z-index:3;max-width:640px}
.tl-open h2{margin:0;font-size:84px;font-weight:800;font-stretch:125%;text-transform:uppercase;line-height:.86;color:#fff;letter-spacing:.01em}
.tl-open .k{font-size:12px;font-weight:700;letter-spacing:.34em;text-transform:uppercase;color:var(--now)}
.tl-open .tc{position:absolute;right:18px;bottom:11px;z-index:4}
.tc{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.14em;color:#8b9199}
/* ---- carrossel ---- */
.cz{position:relative;height:690px;overflow:hidden;background:#000}
.cz__bg{position:absolute;inset:-40px;filter:blur(60px);opacity:0;transition:opacity 1.1s}
.cz__bg.on{opacity:.5}
.cz__top{position:absolute;left:48px;right:48px;top:26px;display:flex;justify-content:space-between;align-items:center;gap:20px;z-index:20}
.cz__track{position:absolute;left:0;top:104px;display:flex;gap:36px;transition:transform .9s cubic-bezier(.2,.7,.2,1);will-change:transform}
.sl{position:relative;flex:none;width:780px;height:440px;overflow:hidden;background:#000;opacity:.3;transform:scale(.86);filter:saturate(.5);transition:opacity .8s,transform .9s cubic-bezier(.2,.7,.2,1),filter .8s;cursor:pointer;border:0;padding:0;text-align:left;color:inherit;display:block}
.sl.on{opacity:1;transform:scale(1);filter:none;cursor:default;box-shadow:0 30px 90px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.08)}
.sl .tl-ph{position:absolute;inset:0;outline:0}
.sl .tl-ph::before{transform-origin:62% 38%}
.sl.on .tl-ph::before{animation:tl-kb 9s cubic-bezier(.2,.5,.3,1) forwards}
@keyframes tl-kb{from{transform:scale(1)}to{transform:scale(1.16)}}
.sl .vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 42%,transparent 44%,rgba(0,0,0,.78) 100%);pointer-events:none}
.sl .bar{position:absolute;left:0;right:0;height:0;background:#000;z-index:3;transition:height .7s .15s cubic-bezier(.2,.7,.2,1)}
.sl .bar.t{top:0}.sl .bar.b{bottom:0}
.sl.on .bar{height:34px}
.sl.on .streak{animation:tl-sweep 1.6s .35s cubic-bezier(.3,.6,.2,1) forwards}
.sl .tl-cap{bottom:34px;z-index:2;padding:60px 30px 22px}
.sl .tl-cap h3{font-size:34px}
.sl .tl-cap p{font-size:16px}
.sl .tl-cap>*,.sl .mid>*{opacity:0;transform:translateY(14px)}
.sl.on .tl-cap>*,.sl.on .mid>*{animation:tl-rise .7s cubic-bezier(.2,.7,.2,1) forwards}
.sl.on .tl-cap>*:nth-child(1),.sl.on .mid>*:nth-child(1){animation-delay:.45s}
.sl.on .tl-cap>*:nth-child(2),.sl.on .mid>*:nth-child(2){animation-delay:.6s}
.sl.on .tl-cap>*:nth-child(3),.sl.on .mid>*:nth-child(3){animation-delay:.75s}
.sl.on .mid>*:nth-child(4){animation-delay:.9s}
@keyframes tl-rise{to{opacity:1;transform:none}}
.sl .mid{position:absolute;inset:34px 0;display:flex;flex-direction:column;justify-content:center;gap:16px;padding:0 64px;z-index:2}
.sl.cap .mid{align-items:center;text-align:center}
.sl.cap::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(255,178,91,.16),transparent 60%)}
.sl.cap .rom{font-size:150px;font-weight:800;font-stretch:125%;line-height:.8;color:transparent;-webkit-text-stroke:1.5px var(--now)}
.sl.cap h3{margin:0;font-size:44px;font-weight:800;font-stretch:125%;text-transform:uppercase;letter-spacing:.1em;color:#fff}
.sl.txt{background:#0c0d0f}
.sl.txt .tl-q{font-size:34px;line-height:1.18}
.sl .tc{position:absolute;right:16px;bottom:10px;z-index:4;opacity:0;transition:opacity .5s .5s}
.sl.on .tc{opacity:1}
.cz__arrow{position:absolute;top:286px;z-index:20;width:60px;height:74px;border:1.5px solid var(--ink);background:rgba(5,5,6,.7);color:var(--ink);font-size:26px;font-weight:800;cursor:pointer;transform:skewX(-12deg);transition:background .2s,color .2s}
.cz__arrow:hover,.cz__arrow:focus-visible{background:var(--ink);color:var(--bg)}
.cz__arrow.l{left:150px}.cz__arrow.r{right:150px}
.cz__arrow:disabled{opacity:.25;cursor:default}
.cz__rule{position:absolute;left:120px;right:120px;bottom:34px;height:56px;z-index:20}
.cz__rule::before{content:"";position:absolute;left:0;right:0;top:17px;height:1px;background:var(--ln)}
.cz__fill{position:absolute;left:0;top:16px;height:3px;background:var(--now);box-shadow:0 0 12px 2px rgba(255,178,91,.5);transition:width .9s cubic-bezier(.2,.7,.2,1)}
.dot{position:absolute;top:4px;width:28px;height:28px;margin-left:-14px;border:0;background:none;padding:0;cursor:pointer}
.dot i{position:absolute;left:9px;top:9px;width:10px;height:10px;border:1.5px solid var(--mut);background:#000;transform:skewX(-22deg);transition:all .3s}
.dot.cp i{background:var(--ink);border-color:var(--ink)}
.dot.on i{background:var(--now);border-color:var(--now);width:16px;height:16px;left:6px;top:6px;box-shadow:0 0 14px 3px rgba(255,178,91,.6)}
.dot:hover i,.dot:focus-visible i{border-color:var(--ink)}
.dot span{position:absolute;top:32px;left:50%;transform:translateX(-50%);font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--fnt);white-space:nowrap}
.dot.on span{color:var(--now)}
.cz__count{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;letter-spacing:.14em;color:var(--mut)}
.cz__count b{color:var(--ink);font-size:20px}

/* ================= carrosséis com outros efeitos ================= */
.cz--stack .cz__track{left:250px;top:104px;width:780px;height:440px;display:block;transform:none!important}
.cz--stack .sl{position:absolute;inset:0;width:auto;height:auto}
.rays,.ring{display:none}
/* F · rolo de filme */
.v-film .cz__track{gap:16px;top:124px}
.v-film .cz__track::before,.v-film .cz__track::after{content:"";position:absolute;left:-3000px;right:-3000px;height:32px;background:#0e0e0f repeating-linear-gradient(90deg,#3b3934 0 18px,transparent 18px 44px) 0 9px/auto 14px repeat-x}
.v-film .cz__track::before{top:-40px}.v-film .cz__track::after{bottom:-40px}
.v-film .sl{width:700px;height:394px;transform:none;opacity:.6;filter:sepia(.9) brightness(.5) contrast(1.15);box-shadow:none}
.v-film .sl.on{opacity:1;filter:none;animation:f-weave .7s linear,f-grade 2s ease-out,f-flick .8s steps(1)}
.v-film .sl .bar,.v-film .sl>.streak{display:none}
.v-film .sl .tl-cap{bottom:0}
.v-film .sl .mid{inset:0}
@keyframes f-weave{0%{transform:translateY(-12px)}18%{transform:translateY(7px)}36%{transform:translateY(-5px)}54%{transform:translateY(3px)}72%{transform:translateY(-1px)}100%{transform:none}}
@keyframes f-grade{0%{filter:sepia(1) brightness(.6) contrast(1.3)}45%{filter:sepia(.7) brightness(.95) contrast(1.1)}100%{filter:none}}
@keyframes f-flick{0%{opacity:.55}12%{opacity:1}24%{opacity:.7}36%{opacity:1}52%{opacity:.82}64%{opacity:1}}
.leak{position:absolute;inset:0;z-index:6;pointer-events:none;opacity:0;mix-blend-mode:screen;background:radial-gradient(ellipse at 0% 50%,rgba(255,170,70,.95),rgba(255,90,30,.55) 28%,transparent 60%)}
.sl.on .leak{animation:f-leak 1.2s ease-out}
@keyframes f-leak{0%{opacity:0;transform:translateX(-45%)}22%{opacity:.95}100%{opacity:0;transform:translateX(125%)}}
.scr{position:absolute;top:0;bottom:0;left:37%;width:1px;background:rgba(255,255,255,.55);opacity:0;z-index:6}
.scr.b{left:71%}
.sl.on .scr{animation:f-scr .9s steps(1)}
.sl.on .scr.b{animation-delay:.15s}
@keyframes f-scr{0%{opacity:.7;transform:translateX(0)}20%{opacity:0}35%{opacity:.6;transform:translateX(9px)}50%{opacity:0}70%{opacity:.4;transform:translateX(-6px)}85%{opacity:0}}
.qd{position:absolute;left:16px;top:12px;z-index:4;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.2em;color:rgba(255,235,200,.75)}
/* G · profundidade */
.v-3d .cz__track{perspective:1500px;top:92px}
.v-3d .sl{opacity:0;transform:translateZ(-900px);filter:brightness(.45) saturate(.6);transition:transform 1s cubic-bezier(.2,.7,.2,1),opacity .8s,filter .9s;-webkit-box-reflect:below 12px linear-gradient(transparent 64%,rgba(0,0,0,.3))}
.v-3d .sl.p1{opacity:.92;z-index:4;transform:translateX(-470px) translateZ(-300px) rotateY(42deg)}
.v-3d .sl.n1{opacity:.92;z-index:4;transform:translateX(470px) translateZ(-300px) rotateY(-42deg)}
.v-3d .sl.p2{opacity:.5;z-index:3;transform:translateX(-770px) translateZ(-580px) rotateY(56deg)}
.v-3d .sl.n2{opacity:.5;z-index:3;transform:translateX(770px) translateZ(-580px) rotateY(-56deg)}
.v-3d .sl.on{opacity:1;z-index:6;transform:translateZ(60px);filter:none}
.v-3d .sl .bar{display:none}
.v-3d .sl .tl-cap{bottom:0}
.v-3d .sl .mid{inset:0}
.v-3d .sl.on .tl-ph::before{animation:g-pan 9s cubic-bezier(.2,.5,.3,1) forwards}
@keyframes g-pan{from{transform:scale(1.14) translateX(-3%)}to{transform:scale(1.14) translateX(3%)}}
.v-3d .sl.on .tl-cap>*{animation-name:g-rise}
@keyframes g-rise{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:none}}
.beam{position:absolute;left:8%;right:8%;top:0;height:100%;z-index:3;pointer-events:none;opacity:0;mix-blend-mode:screen;background:linear-gradient(180deg,rgba(255,238,205,.5),rgba(255,220,170,.12) 55%,transparent 82%);clip-path:polygon(38% 0,62% 0,100% 100%,0 100%)}
.sl.on .beam{animation:g-beam 1.6s .3s ease-out forwards}
@keyframes g-beam{0%{opacity:0}35%{opacity:.9}100%{opacity:.45}}
.v-3d::after{content:"";position:absolute;left:0;right:0;top:548px;height:1px;background:linear-gradient(90deg,transparent,var(--ln) 20%,var(--ln) 80%,transparent)}
/* H · corte em lâmina */
.v-blade .sl{opacity:0;transform:none;filter:none;transition:none;z-index:0;box-shadow:none}
.v-blade .sl.was{opacity:1;z-index:1;animation:h-out .9s ease-out forwards}
.v-blade .sl.on{opacity:1;z-index:2;animation:h-wipe .85s cubic-bezier(.7,0,.2,1) both}
@keyframes h-wipe{from{clip-path:polygon(0 0,0 0,-22.8% 100%,-22.8% 100%)}to{clip-path:polygon(0 0,122.8% 0,100% 100%,-22.8% 100%)}}
@keyframes h-out{to{filter:brightness(.35) saturate(.4);transform:translateX(-22px)}}
.edge{position:absolute;left:-14px;top:0;width:7px;height:100%;z-index:8;background:#FFD9A3;box-shadow:0 0 18px 6px rgba(255,178,91,.75),0 0 60px 18px rgba(255,150,60,.35);transform-origin:top;opacity:0;pointer-events:none}
.sl.on .edge{animation:h-edge .85s cubic-bezier(.7,0,.2,1) both}
@keyframes h-edge{0%{opacity:1;transform:translateX(0) skewX(-22deg)}92%{opacity:1}100%{opacity:0;transform:translateX(972px) skewX(-22deg)}}
.v-blade .sl.on .tl-cap>*,.v-blade .sl.on .mid>*{animation-name:h-rgb;animation-duration:.8s}
.v-blade .sl.on .tl-cap>*:nth-child(1),.v-blade .sl.on .mid>*:nth-child(1){animation-delay:.55s}
.v-blade .sl.on .tl-cap>*:nth-child(2),.v-blade .sl.on .mid>*:nth-child(2){animation-delay:.68s}
.v-blade .sl.on .tl-cap>*:nth-child(3),.v-blade .sl.on .mid>*:nth-child(3){animation-delay:.8s}
@keyframes h-rgb{0%{opacity:0;transform:translateX(-26px) skewX(-22deg);text-shadow:-16px 0 rgba(255,70,70,.85),16px 0 rgba(70,210,255,.85)}60%{opacity:1;text-shadow:-4px 0 rgba(255,70,70,.6),4px 0 rgba(70,210,255,.6)}100%{opacity:1;transform:none;text-shadow:none}}
.cuts{position:absolute;right:26px;top:52px;z-index:5;display:flex;gap:7px}
.cuts i{display:block;width:9px;height:34px;background:var(--now);transform:skewX(-22deg) scaleY(0);transform-origin:bottom}
.sl.on .cuts i{animation:h-cut .45s .7s cubic-bezier(.2,.8,.2,1) forwards}
.sl.on .cuts i:nth-child(2){animation-delay:.78s}.sl.on .cuts i:nth-child(3){animation-delay:.86s}
@keyframes h-cut{to{transform:skewX(-22deg) scaleY(1)}}
/* I · câmara escura */
.v-dark{background:#0a0606}
.v-dark .sl{background:#e9e2d3;opacity:.55;transform:scale(.84) rotate(-2.6deg);filter:brightness(.4);transition:opacity .8s,transform 1s cubic-bezier(.2,.7,.2,1),filter .9s;box-shadow:0 18px 50px rgba(0,0,0,.7)}
.v-dark .sl:nth-child(even){transform:scale(.84) rotate(2.2deg)}
.v-dark .sl.on{opacity:1;transform:none;filter:none}
.v-dark .sl .bar,.v-dark .sl>.streak,.v-dark .sl .vig{display:none}
.v-dark .sl .tl-ph{inset:16px 16px 92px}
.v-dark .sl.on .tl-ph::before{animation:d-dev 2.8s ease-out both}
@keyframes d-dev{0%{filter:grayscale(1) brightness(.12) contrast(.6) blur(7px)}45%{filter:grayscale(1) sepia(.5) brightness(.7) contrast(.9) blur(1px)}100%{filter:none}}
.safe{position:absolute;inset:0;z-index:5;pointer-events:none;background:radial-gradient(ellipse at 50% 40%,rgba(255,40,20,.5),rgba(140,10,0,.78));mix-blend-mode:multiply;opacity:0}
.sl.on .safe{animation:d-safe 2.6s ease-out both}
@keyframes d-safe{0%{opacity:1}55%{opacity:.75}100%{opacity:0}}
.hand{position:absolute;left:26px;right:26px;bottom:18px;z-index:4;display:flex;justify-content:space-between;align-items:baseline;gap:18px;font-family:'Caveat',cursive;font-size:34px;font-weight:600;line-height:1.05;color:#1b1a17}
.hand small{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.14em;color:#6b6457;white-space:nowrap}
.sl .hand span{clip-path:inset(0 100% 0 0)}
.sl.on .hand span{animation:d-write 1.5s 1.1s cubic-bezier(.4,0,.2,1) forwards}
@keyframes d-write{to{clip-path:inset(0 0 0 0)}}
.v-dark .sl .paper{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:14px;padding:0 70px;color:#1b1a17}
.v-dark .sl .paper .hq{font-family:'Caveat',cursive;font-size:50px;font-weight:600;line-height:1.08;clip-path:inset(0 100% 0 0)}
.v-dark .sl.on .paper .hq{animation:d-write 2s .5s cubic-bezier(.4,0,.2,1) forwards}
.v-dark .sl .paper .lb{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:#6b6457}
.v-dark .sl .paper.c{align-items:center;text-align:center}
.v-dark .sl .paper .stamp{font-size:120px;font-weight:800;font-stretch:125%;line-height:.82;color:#a8610f;opacity:0;transform:scale(1.5) rotate(-8deg)}
.v-dark .sl.on .paper .stamp{animation:d-stamp .35s .5s cubic-bezier(.2,1.4,.4,1) forwards}
@keyframes d-stamp{to{opacity:.9;transform:rotate(-4deg)}}
.v-dark .sl .paper h3{margin:0;font-size:36px;font-weight:800;font-stretch:125%;text-transform:uppercase;letter-spacing:.08em;color:#1b1a17}
/* J · mergulho */
.v-dive .sl{opacity:0;transform:scale(.3);filter:blur(12px);transition:none;z-index:0}
.v-dive .sl.on{z-index:2;animation:j-in 1s cubic-bezier(.2,.7,.2,1) both}
.v-dive .sl.was{z-index:3;pointer-events:none;animation:j-out .8s cubic-bezier(.6,0,.9,.5) both}
@keyframes j-in{0%{opacity:0;transform:scale(.28);filter:blur(14px)}100%{opacity:1;transform:none;filter:none}}
@keyframes j-out{0%{opacity:1;transform:none;filter:none}100%{opacity:0;transform:scale(2.9);filter:blur(18px)}}
.v-dive .rays{display:block;position:absolute;left:50%;top:324px;width:1700px;height:1700px;margin:-850px 0 0 -850px;z-index:1;pointer-events:none;opacity:0;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,236,205,.5) 0 .6deg,transparent .6deg 6deg);-webkit-mask:radial-gradient(circle,transparent 0 24%,#000 46%,transparent 70%);mask:radial-gradient(circle,transparent 0 24%,#000 46%,transparent 70%)}
.v-dive .rays.on{animation:j-rays 1s cubic-bezier(.2,.6,.2,1)}
@keyframes j-rays{0%{opacity:0;transform:scale(.35) rotate(0)}30%{opacity:.85}100%{opacity:0;transform:scale(1.5) rotate(8deg)}}
.v-dive .ring{display:block;position:absolute;left:50%;top:324px;border:1px solid var(--ln);transform:translate(-50%,-50%) skewX(-12deg);pointer-events:none}
.v-dive .ring.r1{width:900px;height:520px;opacity:.9}.v-dive .ring.r2{width:1040px;height:600px;opacity:.55}.v-dive .ring.r3{width:1200px;height:690px;opacity:.3}

/* ================= carrosséis, segunda leva ================= */
/* K · fita VHS */
.v-vhs .sl{border-radius:12px;filter:saturate(.35) brightness(.4);box-shadow:none}
.v-vhs .sl.on{filter:none;animation:k-on .55s cubic-bezier(.2,.8,.2,1),k-jit .5s .5s steps(1)}
.v-vhs .sl .bar,.v-vhs .sl>.streak{display:none}
.v-vhs .sl .tl-cap{bottom:0}.v-vhs .sl .mid{inset:0}
@keyframes k-on{0%{clip-path:inset(49.5% 0 49.5% 0);filter:brightness(4)}45%{clip-path:inset(49.5% 0 49.5% 0);filter:brightness(4)}100%{clip-path:inset(0);filter:none}}
@keyframes k-jit{0%{transform:translateX(-5px)}20%{transform:translateX(4px)}40%{transform:translateX(-2px) skewX(.6deg)}60%{transform:translateX(3px)}80%{transform:translateX(-1px)}100%{transform:none}}
.scan{position:absolute;inset:0;z-index:6;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.3) 0 2px,transparent 2px 4px);mix-blend-mode:multiply}
.trk{position:absolute;left:0;right:0;top:-70px;height:60px;z-index:7;pointer-events:none;opacity:0;background:linear-gradient(180deg,transparent,rgba(255,255,255,.22) 30%,rgba(255,255,255,.05) 50%,rgba(255,255,255,.3) 70%,transparent);box-shadow:0 0 0 1px rgba(255,255,255,.08);backdrop-filter:blur(3px) hue-rotate(40deg)}
.sl.on .trk{animation:k-trk 1.3s .45s cubic-bezier(.3,.2,.5,1)}
@keyframes k-trk{0%{opacity:1;transform:translateY(0)}100%{opacity:.9;transform:translateY(560px)}}
.osd{position:absolute;left:20px;top:16px;z-index:8;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:17px;font-weight:700;letter-spacing:.1em;color:#eafff0;text-shadow:2px 0 rgba(255,60,60,.8),-2px 0 rgba(60,220,255,.8);opacity:0}
.sl.on .osd{animation:k-osd 2.8s .5s steps(1) forwards}
@keyframes k-osd{0%{opacity:1}70%{opacity:1}78%{opacity:0}86%{opacity:1}100%{opacity:.75}}
.v-vhs .sl.on .tl-cap h3,.v-vhs .sl.on .mid h3,.v-vhs .sl.on .tl-q{text-shadow:1.5px 0 rgba(255,60,60,.7),-1.5px 0 rgba(60,220,255,.7)}
/* L · persiana 22° */
@property --pw{syntax:'<length>';inherits:false;initial-value:0px}
.v-strip .sl{opacity:0;transform:none;filter:none;transition:none;z-index:0;box-shadow:none}
.v-strip .sl.was{opacity:1;z-index:1;animation:h-out .9s ease-out forwards}
.v-strip .sl.on{opacity:1;z-index:2;-webkit-mask:repeating-linear-gradient(112deg,#000 0 var(--pw),transparent var(--pw) 78px);mask:repeating-linear-gradient(112deg,#000 0 var(--pw),transparent var(--pw) 78px);animation:l-open .95s cubic-bezier(.65,0,.2,1) both}
@keyframes l-open{from{--pw:0px}to{--pw:79px}}
.gl{position:absolute;inset:0;z-index:7;pointer-events:none;opacity:0;background:repeating-linear-gradient(112deg,#FFD9A3 0 2px,transparent 2px 78px);filter:drop-shadow(0 0 6px rgba(255,178,91,.9))}
.sl.on .gl{animation:l-gl .95s ease-out}
@keyframes l-gl{0%{opacity:1}70%{opacity:.8}100%{opacity:0}}
/* M · íris */
.v-iris .sl{opacity:0;transform:none;filter:none;transition:none;z-index:0;box-shadow:none}
.v-iris .sl.was{opacity:1;z-index:1;animation:h-out 1s ease-out forwards}
.v-iris .sl.on{opacity:1;z-index:2;animation:m-iris 1.05s cubic-bezier(.6,0,.2,1) both}
@keyframes m-iris{from{clip-path:circle(0% at 50% 50%)}to{clip-path:circle(75% at 50% 50%)}}
.irs{position:absolute;left:50%;top:50%;width:950px;height:950px;margin:-475px 0 0 -475px;border-radius:50%;border:4px solid #FFD9A3;box-shadow:0 0 26px 8px rgba(255,178,91,.7),inset 0 0 40px 10px rgba(255,178,91,.35);z-index:8;pointer-events:none;opacity:0}
.sl.on .irs{animation:m-ring 1.05s cubic-bezier(.6,0,.2,1) both}
@keyframes m-ring{0%{opacity:1;transform:scale(0)}85%{opacity:1}100%{opacity:0;transform:scale(.99)}}
.fl{position:absolute;inset:0;z-index:7;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 50%,rgba(255,244,220,.95),rgba(255,200,130,.4) 22%,transparent 46%);mix-blend-mode:screen}
.sl.on .fl{animation:m-fl .9s ease-out}
@keyframes m-fl{0%{opacity:1}100%{opacity:0}}
/* N · virar a página */
.v-page .cz__track{perspective:2200px}
.v-page .cz__track::after{content:"";position:absolute;inset:0;z-index:0;box-shadow:6px 6px 0 -1px #15171a,6px 6px 0 0 var(--ln),12px 12px 0 -1px #111316,12px 12px 0 0 var(--ln),18px 18px 0 -1px #0d0e10,18px 18px 0 0 var(--ln);pointer-events:none}
.v-page .sl{opacity:0;transform:none;filter:none;transition:none;z-index:1;transform-origin:left center;backface-visibility:hidden;box-shadow:none}
.v-page .sl.on{opacity:1;z-index:2}
.v-page .sl.was{opacity:1;z-index:3;pointer-events:none;animation:n-turn 1.15s cubic-bezier(.5,0,.3,1) forwards}
@keyframes n-turn{0%{transform:rotateY(0);filter:none}45%{transform:rotateY(-78deg) skewY(-2.5deg);filter:brightness(.55)}100%{transform:rotateY(-178deg);filter:brightness(.2)}}
.v-page .sl.on .tl-cap>*,.v-page .sl.on .mid>*{animation-delay:.75s}
.v-page .sl.on .tl-cap>*:nth-child(2),.v-page .sl.on .mid>*:nth-child(2){animation-delay:.9s}
.v-page .sl.on .tl-cap>*:nth-child(3),.v-page .sl.on .mid>*:nth-child(3){animation-delay:1.05s}
.spine{position:absolute;left:0;top:0;bottom:0;width:26px;z-index:6;pointer-events:none;background:linear-gradient(90deg,rgba(0,0,0,.75),rgba(0,0,0,.15) 60%,transparent)}
/* O · mosaico */
.v-mos .sl{opacity:0;transform:none;filter:none;transition:none;z-index:0;box-shadow:none}
.v-mos .sl.was{opacity:1;z-index:1}
.v-mos .sl.on{opacity:1;z-index:2}
.mz{position:absolute;inset:0;z-index:7;display:grid;grid-template-columns:repeat(12,1fr);grid-template-rows:repeat(7,1fr);pointer-events:none}
.mz i{display:block;background:#050506;outline:1px solid #050506}
.sl.on .mz i{animation:o-tile .5s var(--d) cubic-bezier(.4,0,.2,1) both}
@keyframes o-tile{0%{opacity:1;background:#050506;transform:none}45%{opacity:1;background:#FFB25B;transform:scale(.86)}100%{opacity:0;background:#FFB25B;transform:scale(.3)}}
/* P · mapa da jornada */
.v-map .cz__track{gap:140px;top:186px}
.v-map .cz__track::before{content:"";position:absolute;left:-3000px;right:-3000px;top:-900px;bottom:-900px;z-index:-1;background:repeating-linear-gradient(112deg,rgba(255,255,255,.035) 0 1px,transparent 1px 64px),repeating-linear-gradient(22deg,rgba(255,255,255,.03) 0 1px,transparent 1px 64px)}
.v-map .sl{width:560px;height:316px;transform:scale(.72);opacity:.5;filter:saturate(.4) brightness(.6);z-index:2}
.v-map .sl.on{transform:scale(1);opacity:1;filter:none;z-index:3}
.v-map .sl .bar,.v-map .sl>.streak{display:none}
.v-map .sl .tl-cap{bottom:0;padding:44px 22px 16px}.v-map .sl .tl-cap h3{font-size:24px}.v-map .sl .tl-cap p{font-size:14px}
.v-map .sl .mid{inset:0;padding:0 34px;gap:10px}
.v-map .sl.cap .rom{font-size:96px}.v-map .sl.cap h3{font-size:26px}
.v-map .sl.txt .tl-q{font-size:22px}
.v-map .sl .ttl{font-size:34px!important}
.lk{position:absolute;height:3px;z-index:1;transform-origin:left center;background:repeating-linear-gradient(90deg,var(--ln) 0 12px,transparent 12px 22px)}
.lk::after{content:"";position:absolute;left:0;top:0;bottom:0;width:0;background:var(--now);box-shadow:0 0 12px 2px rgba(255,178,91,.6);transition:width .95s cubic-bezier(.3,.6,.2,1)}
.lk.p1::after,.lk.p2::after,.lk.pf::after{width:100%}
.png{position:absolute;left:50%;top:50%;width:560px;height:316px;margin:-158px 0 0 -280px;border:2px solid var(--now);z-index:9;pointer-events:none;opacity:0}
.sl.on .png{animation:p-ping 1.1s .5s ease-out}
@keyframes p-ping{0%{opacity:.9;transform:scale(.96)}100%{opacity:0;transform:scale(1.22)}}
.flag{position:absolute;left:14px;top:12px;z-index:5}

/* ================= "Por região": quatro propostas ================= */
.rg h3{margin:0;font-size:44px;font-weight:800;font-stretch:125%;text-transform:uppercase;line-height:.95;color:#fff;text-wrap:balance}
.rg .fa{font-size:14px;color:#c9ced4}
.rg .kq{font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#c9ced4}
.rg .kq.now{color:var(--now)}
.ri{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.ri li{display:inline-flex;gap:8px;align-items:center;padding:7px 12px;font-size:13px;font-weight:600;background:rgba(5,5,6,.74);outline:1px solid rgba(255,255,255,.2);color:#e6e9ed}
.ri li small{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#9aa1aa}
.ri li.d{outline-color:#F2F4F6}
.ri li.d::before{content:"";width:8px;height:8px;background:#F2F4F6;transform:skewX(-22deg)}
.ri li.n{outline-color:var(--now);color:var(--now)}
.ri li.c{color:#8b9199;outline-style:dashed}
.pg{position:absolute;left:0;right:0;bottom:0;height:5px;background:rgba(255,255,255,.12);z-index:4}
.pg i{display:block;height:100%;background:#F2F4F6}
.sl.aqui .pg i{background:var(--now)}
.sl.oculta{background:#0b0c0e}
.sl.oculta .mid{align-items:center;text-align:center}
.sl.oculta h3{font-size:26px;color:#7d848d}
.dot b,.dot small{display:none}
/* Q · rota */
.v-map .sl .rg h3{font-size:26px}
.v-map .sl:not(.on) .ri,.v-map .sl:not(.on) .fa,.v-map .sl .ac{display:none}
.v-map .sl:not(.on) .mid>*{opacity:1;transform:none}
.v-map .ri li{padding:5px 9px;font-size:12px}
/* S · trilho lateral */
.v-rail .cz__track{left:372px;width:860px;top:104px;height:480px}
.v-rail .cz__rule{left:48px;right:auto;top:104px;bottom:auto;width:300px;height:480px;display:flex;flex-direction:column;gap:6px}
.v-rail .cz__rule::before,.v-rail .cz__fill,.v-rail .cz__arrow{display:none}
.v-rail .dot{position:static;margin:0;width:100%;height:auto;flex:1;display:grid;grid-template-columns:22px minmax(0,1fr) auto;align-items:center;gap:10px;padding:0 14px;text-align:left;background:#0c0d0f;outline:1px solid var(--ln);color:#c9ced4;transition:background .2s,outline-color .2s}
.v-rail .dot i{position:static;width:10px;height:10px}
.v-rail .dot span{display:none}
.v-rail .dot b{display:block;font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.v-rail .dot small{display:block;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.08em;color:#8b9199}
.v-rail .dot:hover,.v-rail .dot:focus-visible{outline-color:#F2F4F6;color:#fff}
.v-rail .dot.on{background:#17191c;outline:2px solid #F2F4F6;color:#fff}
.v-rail .dot.on i{left:auto;top:auto}
.v-rail .edge{animation-name:none}
.v-rail .sl.on .edge{animation:h-edge-r .85s cubic-bezier(.7,0,.2,1) both}
@keyframes h-edge-r{0%{opacity:1;transform:translateX(0) skewX(-22deg)}92%{opacity:1}100%{opacity:0;transform:translateX(1070px) skewX(-22deg)}}
/* T · mosaico */
.v-grid .cz__track{left:48px;top:100px;width:1184px;height:548px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:12px;transform:none!important}
.v-grid .sl{position:relative;width:auto;height:auto;opacity:1;transform:none;filter:none;transition:none;box-shadow:none}
.v-grid .sl .bar,.v-grid .sl>.streak{display:none}
.v-grid .sl .mid{inset:0;padding:0 22px;gap:6px}
.v-grid .sl:not(.on) .ri,.v-grid .sl:not(.on) .ac,.v-grid .sl:not(.on) .fa{display:none}
.v-grid .sl:not(.on) h3{font-size:21px}
.v-grid .sl:not(.on) .mid>*{opacity:1;transform:none}
.v-grid .sl:not(.on) .tl-ph::before{transition:transform 1.6s cubic-bezier(.2,.6,.2,1)}
.v-grid .sl:not(.on):hover .tl-ph::before{transform:scale(1.12)}
.v-grid .sl:not(.on):hover{outline:2px solid #F2F4F6;outline-offset:3px}
.v-grid .sl.aqui:not(.on){outline:2px solid var(--now);outline-offset:3px}
.v-grid .sl.on{position:absolute;inset:0;z-index:5;cursor:default;animation:h-wipe .85s cubic-bezier(.7,0,.2,1) both}
.v-grid .sl.on .mid{padding:0 72px;gap:16px}
.v-grid .sl.on .rg h3{font-size:58px}
.v-grid .cz__arrow,.v-grid .cz__rule{display:none}
.v-grid .sl.on .edge{animation:h-edge-g .85s cubic-bezier(.7,0,.2,1) both}
@keyframes h-edge-g{0%{opacity:1;transform:translateX(0) skewX(-22deg)}92%{opacity:1}100%{opacity:0;transform:translateX(1470px) skewX(-22deg)}}

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
    return f'<article class="tl-big" style="grid-column: span {span}; min-height: {h}px">{ph(tone)}<div class="vig"></div><i class="streak"></i>{extra}{cap(day, title, text)}</article>'
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
    return (f'<section style="display: flex; flex-direction: column; gap: 26px"><header class="tl-tc"><i class="streak"></i><div class="tl-rom" aria-hidden="true">{rom}</div>'
            f'<div style="position: relative; display: flex; flex-direction: column; gap: 14px"><span class="tl-day">Capítulo {rom} · {dates}</span><h2>{name}</h2><i class="line"></i><p class="tl-sum">{summ}</p>'
            f'<div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center">{selos}</div></div></header>'
            f'<div class="tl-grid">{cards}</div></section>')

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
           f'<div style="display: flex; gap: 14px; flex-wrap: wrap">{btn("Ver em carrossel", "sec")}{btn("Compartilhar", "sec")}</div></div>'
           + f'<section class="tl-open">{ph("ouro")}<div class="vig"></div><i class="streak"></i><div class="in"><span class="k">Uma história de 10 dias</span><h2>Elden Ring</h2>'
             f'<p class="lead" style="color: #d5d9de">De Limgrave à Capital das Cinzas, em três capítulos.</p><div>{btn("▶ Rever a jornada", "pri", "lg")}</div></div><span class="tc tc">12 OUT 2026 → HOJE · 04:05:00</span></section>'
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
          f'<div class="tl-big" style="min-height: 280px">{ph("mata")}<div class="vig"></div><i class="streak"></i>{cap("12 out", "O primeiro dia")}</div><div class="ar" aria-hidden="true">→</div>'
          f'<div class="tl-big" style="min-height: 280px">{ph("ouro")}<div class="vig"></div><i class="streak"></i>{cap("5 nov", "A foto mais recente")}</div></div></section>')
    return header('Jornada') + '<div class="cine">' + top + wrap(c1 + c2 + c3 + ba, pad='48px 48px 56px', gap=64) + '</div>', 4160

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

# 5 · Em carrossel (como a linha de hoje), com os efeitos de cinema. Funciona: setas, pontos da régua e Passeio.
SLIDES = [
 ('cap', 'ouro', '12 out', 'I', 'Limgrave', 'Capítulo I · 12 – 17 out', ''),
 ('foto', 'mata', '12 out', 'seg 12 out · começo', 'A primeira vez', 'O primeiro passo fora da caverna.', '00:00:00'),
 ('txt', 'mata', '14 out', 'qua 14 out · 2 h 08 · seu recado', '“Explorar as ruínas ao sul antes de enfrentar o primeiro chefe.”', 'Sua maior sessão', '00:42:10'),
 ('foto', 'rubro', '16 out', 'sex 16 out · momento', 'Margit, o Presságio Temido', 'Sete tentativas. Na oitava, foi.', '01:55:30'),
 ('cap', 'neve', '18 out', 'II', 'Montanhas dos Gigantes', 'Capítulo II · 18 – 22 out', ''),
 ('foto', 'neve', '20 out', 'ter 20 out · momento', 'O que estava acontecendo aqui?', 'Esta foto ainda não tem legenda.', '02:31:00'),
 ('foto', 'noite', '22 out', 'qui 22 out · momento', 'O gigante de fogo', 'Quase desisti na segunda fase.', '03:10:45'),
 ('cap', 'cinza', '5 nov', 'III', 'Leyndell, Capital das Cinzas', 'Capítulo III · 5 nov – hoje', ''),
 ('txt', 'ouro', '5 nov', 'qui 5 nov · seu recado', '“Abrir o portão principal e subir pela muralha da esquerda.”', 'Voltou depois de 14 dias', '03:48:20'),
 ('hoje', 'ouro', 'hoje', 'Hoje', 'O próximo instante', '', '04:05:00'),
]
QUADRO = {'cap': '', 'foto': '', 'txt': '', 'hoje': ''}
def slide_padrao(i, sd, extra):
    kind, tone, _d, a, b, c, tcode = sd
    bars = '<i class="bar t"></i><i class="bar b"></i><i class="streak"></i>' + extra
    if kind == 'cap':
        return 'cap', bars + f'<div class="mid"><span class="rom" aria-hidden="true">{a}</span><h3>{b}</h3><span class="tl-day">{c}</span></div>'
    if kind == 'foto':
        return 'foto', bars + ph(tone) + f'<div class="vig"></div><div class="tl-cap"><span class="tl-day">{a}</span><h3>{b}</h3><p>{c}</p></div><span class="tc">{tcode}</span>'
    if kind == 'txt':
        return 'txt', bars + f'<div class="mid"><span class="tl-day">{a}</span><p class="tl-q">{b}</p><div>{selo(c)}</div></div><span class="tc">{tcode}</span>'
    return 'txt', bars + f'<div class="mid" style="align-items: flex-start">{kick(a, "now")}<h3 class="ttl" style="font-size: 54px; color: #fff">{b}</h3><span class="meta">Leyndell, Capital das Cinzas · 39%</span><div>{btn("Começar sessão", "pri", "lg")}</div></div>'
def slide_papel(i, sd, extra):
    kind, tone, d, a, b, c, tcode = sd
    if kind == 'cap':
        return 'cap', f'<div class="paper c"><span class="stamp" aria-hidden="true">{a}</span><h3>{b}</h3><span class="lb">{c}</span></div>'
    if kind == 'foto':
        return 'foto', ph(tone) + '<i class="safe"></i>' + f'<div class="hand"><span>{b}</span><small>{d}</small></div>'
    if kind == 'txt':
        return 'txt', f'<div class="paper"><span class="lb">{a}</span><p class="hq" style="margin: 0">{b}</p><span class="lb">{c}</span></div>'
    return 'txt', f'<div class="paper"><span class="lb">Hoje · Leyndell, Capital das Cinzas · 39%</span><p class="hq" style="margin: 0">O próximo instante…</p><div>{btn("Começar sessão", "sec", "lg")}</div></div>'

def carrossel(variant='', stack=False, step=816, half=390, extra='', render=slide_padrao, numerar=False, ys=None, links=False, mosaic=False, cy=158):
    def fn():
        n = len(SLIDES)
        bgs = ''.join(f'<div class="cz__bg {{{{k{i}}}}}" style="background: {SC[s[1]]}"></div><i class="rays {{{{k{i}}}}}"></i>' for i, s in enumerate(SLIDES))
        import random, math
        yy = ys or [0] * n
        sl = []
        if links:
            for i in range(n - 1):
                dy = yy[i + 1] - yy[i]
                sl.append(f'<i class="lk {{{{k{i}}}}}" style="left: {i * step + half}px; top: {cy + yy[i]}px; width: {math.hypot(step, dy):.1f}px; transform: rotate({math.degrees(math.atan2(dy, step)):.2f}deg)"></i>')
        for i, sd in enumerate(SLIDES):
            cls, inner = render(i, sd, extra)
            q = f'<span class="qd">QUADRO {i + 1:02d}</span>' if numerar else ''
            if mosaic:
                rnd = random.Random(i * 7 + 3)
                q += '<div class="mz" aria-hidden="true">' + ''.join(f'<i style="--d: {0.05 + rnd.random() * 0.75:.2f}s"></i>' for _ in range(84)) + '</div>'
            st = f' style="translate: 0 {yy[i]}px"' if ys else ''
            sl.append(f'<div class="sl {cls} {{{{k{i}}}}}"{st} onClick="{{{{go{i}}}}}">{inner}{q}</div>')
        dots = ''.join(f'<button type="button" class="dot {"cp" if s[0] == "cap" else ""} {{{{k{i}}}}}" style="left: {i / (n - 1) * 100:.2f}%" onClick="{{{{go{i}}}}}" aria-label="Ir para {s[2]}: {s[4] if s[0] != "txt" else "recado"}"><i></i>'
                       + (f'<span>{s[2]}</span>' if s[0] in ('cap', 'hoje') else '') + '</button>' for i, s in enumerate(SLIDES))
        stage = (f'<section class="cz {variant}{" cz--stack" if stack else ""}">' + bgs + '<i class="ring r3"></i><i class="ring r2"></i><i class="ring r1"></i>'
                 + '<div class="cz__top"><div style="display: flex; flex-direction: column; gap: 6px"><a href="#" class="meta">← Elden Ring</a><h1 class="ttl" style="font-size: 30px">Linha do tempo</h1></div>'
                   '<div style="display: flex; gap: 14px; align-items: center"><span class="cz__count"><b>{{num}}</b> / ' + f'{n:02d}' + '</span>'
                   '<button type="button" class="btn pri" onClick="{{toggle}}"><i class="btn__led"></i><span class="btn__t"><span>{{playLabel}}</span><span aria-hidden="true">{{playLabel}}</span></span><i class="btn__ar"></i></button>'
                   + btn('Tela cheia', 'sec') + '</div></div>'
                 + '<div class="cz__track" style="transform: {{tx}}">' + ''.join(sl) + '</div>'
                 + '<button type="button" class="cz__arrow l" onClick="{{prev}}" aria-label="Anterior">‹</button><button type="button" class="cz__arrow r" onClick="{{next}}" aria-label="Próximo">›</button>'
                 + '<div class="cz__rule"><i class="cz__fill" style="width: {{fill}}"></i>' + dots + '</div></section>')
        return header('Jornada') + stage, 790, n, step, half, yy
    return fn
b_carrossel = carrossel()

LOGIC = """class Component extends DCLogic {
  state = { i: INITI, was: -1, play: false };
  go(n) { const c = Math.max(MINI, Math.min(NN - 1, n)); if (c !== this.state.i) this.setState({ i: c, was: this.state.i }); }
  stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
  componentWillUnmount() { this.stop(); }
  renderVals() {
    const i = this.state.i, was = this.state.was;
    const v = {
      tx: 'translate(' + (640 - (Math.max(0, i) * STEP + HALF)) + 'px,' + (-YSARR[Math.max(0, i)]) + 'px)',
      fill: (i / (NN - 1) * 100).toFixed(2) + '%',
      num: String(i + 1).padStart(2, '0'),
      playLabel: this.state.play ? '❚❚ Pausar' : '▶ Passeio',
      all: () => { this.stop(); this.setState({ play: false, was: this.state.i, i: -1 }); },
      prev: () => { this.stop(); this.setState({ play: false }); this.go(this.state.i - 1); },
      next: () => { this.stop(); this.setState({ play: false }); this.go(this.state.i + 1); },
      toggle: () => {
        if (this.state.play) { this.stop(); this.setState({ play: false }); return; }
        if (this.state.i >= NN - 1) this.setState({ play: true, i: 0, was: this.state.i }); else this.setState({ play: true });
        this.timer = setInterval(() => {
          if (this.state.i >= NN - 1) { this.stop(); this.setState({ play: false }); return; }
          this.go(this.state.i + 1);
        }, 4600);
      },
    };
    for (let k = 0; k < NN; k++) {
      const d = k - i;
      v['k' + k] = (d === 0 ? 'on' : d === -1 ? 'p1' : d === 1 ? 'n1' : d === -2 ? 'p2' : d === 2 ? 'n2' : d < 0 ? 'pf' : 'nf') + (k === was && k !== i ? ' was' : '');
      v['go' + k] = () => { this.stop(); this.setState({ play: false }); this.go(k); };
    }
    return v;
  }
}"""

BOARDS = [
 ('Main.dc.html', 'A · Página do jogo: o botão e o cartão da linha do tempo', b_jornada, 1280),
 ('Linha-Jogo.dc.html', 'B · A página própria da linha do tempo do jogo', b_linha, 1280),
 ('Linha-Geral.dc.html', 'C · A linha do tempo geral, por mês e por jogo', b_geral, 1280),
 ('Linha-Celular.dc.html', 'D · A linha do tempo do jogo no celular', b_cel, 390),
 ('Linha-Carrossel.dc.html', 'E · Em carrossel, como a de hoje (funciona: setas, régua e Passeio)', b_carrossel, 1280),
]
EXTRAS = [
 ('Carrossel-Filme.dc.html', 'F · Rolo de filme', carrossel('v-film', False, 716, 350, '<i class="leak"></i><i class="scr"></i><i class="scr b"></i>', numerar=True), 0, 0),
 ('Carrossel-Profundidade.dc.html', 'G · Profundidade', carrossel('v-3d', True, 0, 0, '<i class="beam"></i>'), 1360, 0),
 ('Carrossel-Lamina.dc.html', 'H · Corte em lâmina', carrossel('v-blade', True, 0, 0, '<i class="edge"></i><span class="cuts" aria-hidden="true"><i></i><i></i><i></i></span>'), 2720, 0),
 ('Carrossel-Camara.dc.html', 'I · Câmara escura', carrossel('v-dark', False, 816, 390, '', render=slide_papel), 0, 910),
 ('Carrossel-Mergulho.dc.html', 'J · Mergulho', carrossel('v-dive', True, 0, 0, ''), 1360, 910),
]
# ---- "Por região": as mesmas regiões em quatro desenhos (funcionam no Play) ----
REG = [
 ('Limgrave', 'mata', 1, 4, '16 – 17 out · 2 dias de jogo', [('área', 'Limgrave', 'd'), ('chefe', '', 'c'), ('chefe', '', 'c'), ('masmorra', '', 'c')]),
 ('Liurnia dos Lagos', 'neve', 0, 3, 'Ainda sem sessões aqui', [('área', 'Liurnia dos Lagos', ''), ('masmorra', '', 'c'), ('chefe', '', 'c')]),
 ('Caelid', 'rubro', 0, 2, 'Ainda sem sessões aqui', [('área', 'Caelid', ''), ('chefe', '', 'c')]),
 ('Planalto Altus', 'ouro', 0, 1, 'Ainda sem sessões aqui', [('área', 'Planalto Altus', '')]),
 ('Leyndell', 'ouro', 1, 3, '16 – 17 out · 1 dia de jogo', [('chefe', 'Morgott, o Rei Presságio', 'd'), ('chefe', '', 'c'), ('masmorra', '', 'c')]),
 ('Montanhas dos Gigantes', 'neve', 1, 2, '18 out · 1 dia de jogo', [('área', 'Montanhas dos Gigantes', 'd'), ('chefe', '', 'c')]),
 ('Farum Azula', 'cinza', 1, 3, '16 out · 1 dia de jogo', [('masmorra', 'Farum Azula em Ruínas', 'd'), ('chefe', '', 'c'), ('chefe', '', 'c')]),
 ('Leyndell, Capital das Cinzas', 'rubro', 0, 5, 'Desde 5 nov · você está aqui', [('área', 'o próximo', 'n'), ('chefe', '', 'c'), ('chefe', '', 'c'), ('chefe', '', 'c'), ('chefe', '', 'c')]),
 (None, 'cinza', 0, 0, '', []),
]
AQUI = 7
def regioes(variant='', stack=False, step=816, half=390, extra='', ys=None, links=False, init=AQUI, mini=0, todas=False, cy=158):
    def fn():
        import math
        n = len(REG)
        yy = ys or [0] * n
        bgs = ''.join(f'<div class="cz__bg {{{{k{i}}}}}" style="background: {SC[r[1]]}"></div>' for i, r in enumerate(REG))
        sl = []
        if links:
            for i in range(n - 1):
                dy = yy[i + 1] - yy[i]
                sl.append(f'<i class="lk {{{{k{i}}}}}" style="left: {i * step + half}px; top: {cy + yy[i]}px; width: {math.hypot(step, dy):.1f}px; transform: rotate({math.degrees(math.atan2(dy, step)):.2f}deg)"></i>')
        for i, (nome, tone, feito, total, fatos, itens) in enumerate(REG):
            st = f' style="translate: 0 {yy[i]}px"' if ys else ''
            if nome is None:
                sl.append(f'<div class="sl oculta {{{{k{i}}}}}"{st} onClick="{{{{go{i}}}}}"><i class="bar t"></i><i class="bar b"></i>{extra}<div class="mid rg"><span class="kq">Mais regiões à frente</span><h3>Ainda não apareceu para você</h3><span class="fa">Escondidas até você chegar.</span></div></div>')
                continue
            aqui = i == AQUI
            li = ''.join(f'<li class="{c}"><small>{t}</small>{nm if c != "c" else "com spoiler · tocar para ver"}</li>' for t, nm, c in itens)
            ac = f'<div class="ac">{btn("Começar sessão", "pri")}</div>' if aqui else ''
            sl.append(f'<div class="sl foto {"aqui " if aqui else ""}{{{{k{i}}}}}"{st} onClick="{{{{go{i}}}}}"><i class="bar t"></i><i class="bar b"></i><i class="streak"></i>{extra}{ph(tone)}<div class="vig"></div>'
                      f'<div class="mid rg"><span class="kq {"now" if aqui else ""}">Região {i + 1} de 8 · {"você está aqui" if aqui else (f"{feito} de {total} feitos")}</span><h3>{nome}</h3><span class="fa">{fatos}</span><ul class="ri">{li}</ul>{ac}</div>'
                      f'<span class="pg"><i style="width: {(feito / total * 100) if total else 0:.0f}%"></i></span></div>')
        dots = ''.join(f'<button type="button" class="dot {"cp" if r[2] else ""} {{{{k{i}}}}}" style="left: {i / (n - 1) * 100:.2f}%" onClick="{{{{go{i}}}}}" aria-label="Região {i + 1}{": " + r[0] if r[0] else ""}"><i></i><span>{i + 1}</span>'
                       f'<b>{r[0] or "À frente"}</b><small>{f"{r[2]} de {r[3]}" if r[0] else "?"}{" · aqui" if i == AQUI else ""}</small></button>' for i, r in enumerate(REG))
        tod = '<button type="button" class="btn sec" onClick="{{all}}"><i class="btn__led"></i><span class="btn__t"><span>Todas as regiões</span><span aria-hidden="true">Todas as regiões</span></span><i class="btn__ar"></i></button>' if todas else ''
        stage = (f'<section class="cz {variant}{" cz--stack" if stack else ""}">' + bgs
                 + '<div class="cz__top"><div style="display: flex; flex-direction: column; gap: 6px"><a href="#" class="meta">← Elden Ring · Linha do tempo</a><h1 class="ttl" style="font-size: 30px">Por região</h1></div>'
                   '<div style="display: flex; gap: 14px; align-items: center"><span class="meta">4 de 23 feitos · 39%</span>' + tod + btn('Por data', 'sec') + '</div></div>'
                 + '<div class="cz__track" style="transform: {{tx}}">' + ''.join(sl) + '</div>'
                 + '<button type="button" class="cz__arrow l" onClick="{{prev}}" aria-label="Região anterior">‹</button><button type="button" class="cz__arrow r" onClick="{{next}}" aria-label="Próxima região">›</button>'
                 + '<div class="cz__rule"><i class="cz__fill" style="width: {{fill}}"></i>' + dots + '</div></section>')
        return header('Jornada') + stage, 790, n, step, half, yy, init, mini
    return fn
EXTRAS3 = [
 ('Regiao-Cenas.dc.html', 'R · Por região em cenas, com o corte em lâmina', regioes('v-blade', True, 0, 0, '<i class="edge"></i>'), 0, 0),
 ('Regiao-Rota.dc.html', 'Q · Rota: as regiões num caminho', regioes('v-map', False, 700, 280, '<i class="png"></i>', ys=[0, -70, 60, -50, 70, -60, 50, -70, 40], links=True), 1360, 0),
 ('Regiao-Trilho.dc.html', 'S · Trilho lateral: a lista de regiões ao lado da cena', regioes('v-blade v-rail', True, 0, 0, '<i class="edge"></i>'), 0, 910),
 ('Regiao-Mosaico.dc.html', 'T · Mosaico: todas as regiões de uma vez', regioes('v-grid', False, 0, 0, '<i class="edge"></i>', init=-1, mini=-1, todas=True), 1360, 910),
]

EXTRAS2 = [
 ('Carrossel-VHS.dc.html', 'K · Fita VHS', carrossel('v-vhs', False, 816, 390, '<i class="scan"></i><i class="trk"></i><span class="osd">▶ PLAY</span>'), 0, 0),
 ('Carrossel-Persiana.dc.html', 'L · Persiana 22°', carrossel('v-strip', True, 0, 0, '<i class="gl"></i>'), 1360, 0),
 ('Carrossel-Iris.dc.html', 'M · Íris', carrossel('v-iris', True, 0, 0, '<i class="irs"></i><i class="fl"></i>'), 2720, 0),
 ('Carrossel-Pagina.dc.html', 'N · Virar a página', carrossel('v-page', True, 0, 0, '<i class="spine"></i>'), 0, 910),
 ('Carrossel-Mosaico.dc.html', 'O · Mosaico', carrossel('v-mos', True, 0, 0, '', mosaic=True), 1360, 910),
 ('Carrossel-Mapa.dc.html', 'P · Mapa da jornada', carrossel('v-map', False, 700, 280, '<i class="png"></i>', ys=[0, -70, 60, -50, 70, -60, 50, -70, 60, 0], links=True), 2720, 910),
]
def main():
    boards, order, x = {}, [], 0
    for fname, title, fn, w in BOARDS:
        r = fn(); body, h = r[0], r[1]
        html = gen.page_file('U', 'dark', body, h, title).replace('</style>', CSS.replace('</', '<\\/') + '</style>', 1)
        if len(r) > 2:
            a = html.index('class Component extends DCLogic'); b = html.index('</script>', a)
            html = html[:a] + LOGIC.replace('NN', str(r[2])).replace('STEP', str(r[3])).replace('HALF', str(r[4])).replace('YSARR', json.dumps(r[5])).replace('INITI', str(r[6] if len(r) > 6 else 1)).replace('MINI', str(r[7] if len(r) > 7 else 0)) + '\n' + html[b:]
        if w != 1280:
            html = html.replace('style="width: 1280px;', f'style="width: {w}px;', 1).replace('"width":1280', f'"width":{w}', 1)
        open(os.path.join(OUT, fname), 'w', encoding='utf-8').write(html)
        boards[fname] = {'x': x, 'y': 0, 'w': w, 'h': h, 'title': title}
        if len(r) > 2: boards[fname]['is_interactive'] = True
        order.append(fname); x += w + 80
    def escreve(fname, title, fn, w):
        r = fn(); body, h = r[0], r[1]
        html = gen.page_file('U', 'dark', body, h, title).replace('</style>', CSS.replace('</', '<\\/') + '</style>', 1)
        a = html.index('class Component extends DCLogic'); b = html.index('</script>', a)
        html = html[:a] + LOGIC.replace('NN', str(r[2])).replace('STEP', str(r[3])).replace('HALF', str(r[4])).replace('YSARR', json.dumps(r[5])).replace('INITI', str(r[6] if len(r) > 6 else 1)).replace('MINI', str(r[7] if len(r) > 7 else 0)) + '\n' + html[b:]
        open(os.path.join(OUT, fname), 'w', encoding='utf-8').write(html)
        return h
    for pg, lista in (('carrosseis', EXTRAS), ('carrosseis2', EXTRAS2), ('regioes', EXTRAS3)):
        for fname, title, fn, ex, ey in lista:
            h = escreve(fname, title, fn, 1280)
            boards[fname] = {'x': ex, 'y': ey, 'w': 1280, 'h': h, 'title': title, 'page': pg, 'is_interactive': True}
            order.append(fname)
    notes = {
      'titulo': {'x': 0, 'y': -300, 'text': 'Linha do tempo nova · modelo', 'kind': 'title1', 'maxW': 4200},
      'n1': {'x': 0, 'y': 1400, 'w': 620, 'fill': 'orange', 'text': 'A · O que muda na página do jogo\n\n• Botão "Linha do tempo" no topo, ao lado de Começar sessão\n• Cartão grande de entrada, com as suas fotos\n• "Neste dia" quando houver lembrança\n• As abas ficam só com Diário e Detalhes'},
      'n2': {'x': 1360, 'y': 4300, 'w': 620, 'fill': 'green', 'text': 'B · A página própria\n\n• Um cartão por dia\n• Três tamanhos: foto grande, recado médio, dia sem anotação vira um traço\n• Capítulo com o nome da região e resumo\n• Selos automáticos (maior sessão, voltou depois de 14 dias)\n• Foto sem legenda pergunta "o que estava acontecendo aqui?"\n• Antes e depois no fim\n• Cinema: faixas pretas, grão de filme, cartela de título por capítulo\n• Passe o mouse numa foto: zoom lento e um risco de luz\n• "Rever a jornada" abre o passeio em tela cheia'},
      'n3': {'x': 2720, 'y': 2380, 'w': 620, 'fill': 'blue', 'text': 'C · A linha geral\n\n• Agrupada por mês e, dentro do mês, por jogo\n• "Zerou" ganha cartão grande\n• Filtro "Só momentos"\n• O que entrou na coleção vira uma linha discreta'},
      'n5': {'x': 4550, 'y': 910, 'w': 620, 'fill': 'purple', 'text': 'E · Em carrossel\n\nAperte Play no quadro para testar.\n• Setas e pontos da régua trocam de cena\n• "Passeio" avança sozinho\n• A cena do centro ganha faixas pretas, zoom lento, risco de luz e o texto subindo\n• As outras ficam apagadas ao lado\n• Os efeitos tocam uma vez por cena, sem ficar em repetição'},
      'c0': {'x': 0, 'y': -300, 'text': 'Carrosséis · cinco efeitos (aperte Play em cada um)', 'kind': 'title1', 'maxW': 4000, 'page': 'carrosseis'},
      'c1': {'x': 2720, 'y': 910, 'w': 760, 'fill': 'purple', 'page': 'carrosseis', 'text': 'F · Rolo de filme: tira de película, o quadro treme e assenta, vazamento de luz laranja, a cor sai do sépia.\n\nG · Profundidade: as cenas ficam em arco, em 3D, com reflexo no chão e um facho de luz na cena do centro.\n\nH · Corte em lâmina: a cena nova entra cortando na diagonal de 22°, com o fio da lâmina aceso; o texto chega com as cores separadas.\n\nI · Câmara escura: fotos em papel; a imagem se revela sob a luz vermelha e a legenda é escrita à mão.\n\nJ · Mergulho: a cena atual passa por você e a próxima vem do fundo, com riscos de velocidade.'},
      'd0': {'x': 0, 'y': -300, 'text': 'Carrosséis 2 · mais seis efeitos (aperte Play em cada um)', 'kind': 'title1', 'maxW': 4000, 'page': 'carrosseis2'},
      'd1': {'x': 4080, 'y': 0, 'w': 700, 'fill': 'teal', 'page': 'carrosseis2', 'text': 'K · Fita VHS: a cena liga como TV antiga, com linhas, faixa de rastreio descendo e "PLAY" na tela.\n\nL · Persiana 22°: a cena abre em tiras diagonais, com os fios acesos.\n\nM · Íris: a cena abre num círculo a partir do centro, com um anel de luz, como nos filmes antigos.\n\nN · Virar a página: cada cena é uma página de um livro que vira.\n\nO · Mosaico: a cena aparece atrás de ladrilhos que acendem e somem, em ordem sorteada.\n\nP · Mapa da jornada: as cenas são paradas num caminho; a câmera viaja de uma a outra e a linha vai acendendo.'},
      'r0': {'x': 0, 'y': -300, 'text': 'Por região · quatro propostas (aperte Play em cada uma)', 'kind': 'title1', 'maxW': 2640, 'page': 'regioes'},
      'r1': {'x': 2720, 'y': 0, 'w': 700, 'fill': 'orange', 'page': 'regioes', 'text': 'R · Em cenas: cada região é uma cena grande, igual à linha do tempo aprovada, com o corte em lâmina. A régua embaixo são as regiões.\n\nQ · Rota: as regiões são paradas num caminho; a câmera viaja e a linha acende pelo trecho já percorrido.\n\nS · Trilho lateral: a lista de regiões fica à esquerda, com o que já foi feito em cada uma; a cena troca à direita com o corte em lâmina.\n\nT · Mosaico: todas as regiões de uma vez, como um quadro do mundo; tocar numa abre em tela inteira com o corte em lâmina.\n\nEm todas: item com spoiler fica coberto, a região atual fica em âmbar e as regiões à frente ficam escondidas.'},
      'n4': {'x': 4080, 'y': 1920, 'w': 390, 'fill': 'gray', 'text': 'As fotos aqui são só manchas de cor no lugar das suas capturas de verdade.'},
    }
    idx = {'v': 3, 'createdOnFiles': {'v': 1, 'at': datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%dT%H:%M:%SZ')}, 'title': 'WinnerZ · Linha do tempo nova (modelo)',
           'launch': {'view': 'canvas', 'page': 'regioes'}, 'pages': [{'id': 'modelo', 'name': 'Modelo'}, {'id': 'carrosseis', 'name': 'Carrosséis'}, {'id': 'carrosseis2', 'name': 'Carrosséis 2'}, {'id': 'regioes', 'name': 'Por região'}], 'boards': boards, 'order': order, 'notes': notes, 'designSystems': []}
    json.dump(idx, open(os.path.join(OUT, 'canvas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(boards), 'quadros')
main()
