/* Pincel: tudo pintado à mão. Cada peça é uma pincelada de borda irregular; no hover, uma segunda demão passa por cima.
   Os rótulos pequenos são anotações à mão (fonte Caveat, que o site já carrega). */
.A.dark,.A .photo{--bg:#09090a;--b1:#111214;--b2:#191b1e;--b3:#26292e;--s2:#191b1e;--ink:#F2F4F6;--ink2:#C9CED4;--mut:#9AA1AA;--fnt:#7D848D;--ln:#33373d;--hair:rgba(242,244,246,.1);--pA:#DADEE3;--pB:#C2C8CF;--pW:#FFFFFF;--onP:#07080A;--now:#FFB25B;--nowW:#FFD9A8;--nowI:#FFB25B;--onNow:#1b1206;--au1:#FFF0CC;--au2:#C9985C;--auI:#E2BE84;--dan:#F0A496;--weave:rgba(255,255,255,.016);--lg1:#FFF0CC;--lg2:#C9985C}
.A.light{--bg:#eceef1;--b1:#ffffff;--b2:#f4f5f7;--b3:#dcdfe4;--s2:#dcdfe4;--ink:#07080A;--ink2:#2a2f36;--mut:#555c66;--fnt:#636a74;--ln:#bfc5cc;--hair:rgba(7,8,10,.1);--pA:#343941;--pB:#22262c;--pW:#000000;--onP:#FFFFFF;--now:#D97A12;--nowW:#F2A94E;--nowI:#9A5205;--onNow:#1b1206;--au1:#C9985C;--au2:#7A5427;--auI:#8A6234;--dan:#A8322A;--weave:rgba(7,8,10,.02);--lg1:#B7884E;--lg2:#6E4A20}
.A{--br1:@@BR1@@;--br2:@@BR2@@;--br3:@@BR3@@;--bv:@@BV@@;--rr:@@RR@@;--blob:58% 42% 55% 45%/48% 56% 44% 52%}

.fx{display:block;position:absolute;inset:0;z-index:-1;pointer-events:none;background:repeating-linear-gradient(0deg,var(--weave) 0 1px,transparent 1px 3px),repeating-linear-gradient(90deg,var(--weave) 0 1px,transparent 1px 3px)}

.kick{gap:9px;font:700 21px/1 'Caveat',cursive;color:var(--mut)}
.kick::before{content:'';width:10px;height:10px;border-radius:var(--blob);background:var(--ln)}
.kick.now{color:var(--nowI)}.kick.now::before{background:var(--now);animation:pWet 2.4s ease-in-out infinite}
.kick.au{color:var(--auI)}.kick.au::before{background:linear-gradient(170deg,var(--au1),var(--au2))}
.A.awards .kick{text-transform:none;letter-spacing:0}
@keyframes pWet{0%,100%{box-shadow:0 0 0 rgba(255,178,91,0);transform:scale(1)}50%{box-shadow:0 0 12px 2px rgba(255,178,91,.6);transform:scale(1.2)}}
@keyframes pIn{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}

/* botões: uma pincelada; no hover, a segunda demão é pintada da esquerda para a direita */
.btn{height:48px;padding:0 28px;font:700 15px/1 'Archivo';font-stretch:108%;transition:color .3s .1s,transform .15s}
.btn::before,.btn::after{content:'';position:absolute;z-index:-1;inset:-1px -9px;pointer-events:none}
.btn::before{background:var(--st,var(--b3));-webkit-mask:var(--br1) center/100% 100% no-repeat;mask:var(--br1) center/100% 100% no-repeat}
.btn::after{background:var(--st2,var(--ink));-webkit-mask:var(--br2) center/100% 100% no-repeat;mask:var(--br2) center/100% 100% no-repeat;clip-path:inset(0 100% 0 0);transition:clip-path .5s cubic-bezier(.6,0,.2,1)}
.btn:hover::after{clip-path:inset(0 0 0 0)}
.btn:hover{color:var(--hc,var(--bg))}
.btn:active{transform:scale(.97)}
.btn.pri{--st:linear-gradient(180deg,var(--pA),var(--pB));--st2:var(--pW);--hc:var(--onP);color:var(--onP)}
.btn.now{--st:var(--now);--st2:var(--nowW);--hc:#1b1206;color:#1b1206}
.btn.now::after{animation:pIn 2.6s cubic-bezier(.6,0,.2,1) infinite alternate}
.btn.au{--st:linear-gradient(170deg,#E9CF9C,#B98A4E);--st2:#FFF0CC;--hc:#1b1206;color:#1b1206}
.btn.dan{--st2:var(--dan);--hc:#1b0b08;color:var(--dan)}
.btn.quiet{height:auto;padding:8px 2px 12px;color:var(--ink2)}
.btn.quiet::before,.btn.quiet::after{inset:auto -5px 0 -5px;height:7px;-webkit-mask-image:var(--br3);mask-image:var(--br3)}
.btn.quiet::before{background:var(--ln)}
.btn.quiet:hover{color:var(--ink)}
.btn.off,.btn.off:hover{--st:var(--b2);color:var(--fnt);cursor:not-allowed}
.btn.off::before{-webkit-mask-image:var(--br3);mask-image:var(--br3);opacity:.75}
.btn.off::after{display:none}
.btn.icon{width:48px;padding:0}.btn.icon.lg{width:56px}
.btn.icon::before,.btn.icon::after{inset:0;-webkit-mask:none;mask:none;border-radius:var(--blob)}
.btn.icon::after{clip-path:circle(0 at 30% 70%);transition:clip-path .45s cubic-bezier(.6,0,.2,1)}
.btn.icon:hover::after{clip-path:circle(120% at 30% 70%)}
.btn.lg{height:56px;padding:0 34px;font-size:16px}
.btn.sm{height:38px;padding:0 20px;font-size:13px}

/* abas: um traço seco embaixo; a escolhida recebe o traço cheio */
.tabs{gap:8px 30px}
.tabs a{height:48px;color:var(--fnt);font:700 15px/1 'Archivo';transition:color .3s}
.tabs a::before,.tabs a::after{content:'';position:absolute;left:-7px;right:-7px;bottom:3px;height:8px}
.tabs a::before{background:var(--ln);-webkit-mask:var(--br3) center/100% 100% no-repeat;mask:var(--br3) center/100% 100% no-repeat}
.tabs a::after{height:10px;background:var(--ink);-webkit-mask:var(--br1) center/100% 100% no-repeat;mask:var(--br1) center/100% 100% no-repeat;clip-path:inset(0 100% 0 0);transition:clip-path .45s cubic-bezier(.6,0,.2,1)}
.tabs a:hover{color:var(--ink)}
.tabs a:hover::after{clip-path:inset(0 45% 0 0)}
.tabs a.on{color:var(--ink)}
.tabs a.on::after{clip-path:inset(0 0 0 0)}
.tabs__c{min-width:21px;height:20px;padding:0 6px;justify-content:center;border-radius:var(--blob);background:var(--now);color:#1b1206;font:800 11px/1 'Archivo'}

.chips{gap:8px 12px;padding:0 4px}
.chip{isolation:isolate;height:36px;padding:0 14px;color:var(--ink2);font:600 13.5px/1 'Archivo';transition:color .2s}
.chip::before{content:'';position:absolute;z-index:-1;inset:0 -4px;background:var(--b2);-webkit-mask:var(--br2) center/100% 100% no-repeat;mask:var(--br2) center/100% 100% no-repeat;transition:background .2s}
.chip:hover{color:var(--ink)}
.chip:hover::before{background:var(--b3)}
.chip.on{color:var(--onP);font-weight:700}
.chip.on::before{background:linear-gradient(180deg,var(--pA),var(--pB))}
.chip.on small{color:var(--onP);opacity:.6}
.chips.vert .chip{height:44px;justify-content:space-between}

.tag{isolation:isolate;height:24px;padding:0 11px;color:var(--ink2);font:700 12px/1 'Archivo'}
.tag::before{content:'';position:absolute;z-index:-1;inset:0 -3px;background:var(--tg,var(--b3));-webkit-mask:var(--br1) center/100% 100% no-repeat;mask:var(--br1) center/100% 100% no-repeat}
.tag.z{--tg:linear-gradient(180deg,var(--pA),var(--pB));color:var(--onP)}
.tag.j{--tg:var(--now);color:#1b1206}
.tag.j::after{content:'';position:absolute;z-index:-1;inset:0 -3px;background:var(--nowW);-webkit-mask:var(--br2) center/100% 100% no-repeat;mask:var(--br2) center/100% 100% no-repeat;animation:pIn 2.6s cubic-bezier(.6,0,.2,1) infinite alternate}
.tag.s{--tg:rgba(224,138,122,.22);color:var(--dan)}
.tag.p{color:var(--fnt)}
.tag.p::before{-webkit-mask-image:var(--br3);mask-image:var(--br3)}
.tag.au{--tg:linear-gradient(170deg,#E9CF9C,#B98A4E);color:#1b1206}
.cover__img .tag{left:10px}

/* cards: telas de borda cortada à mão, com uma pincelada na lateral; no hover, a demão desce de cima para baixo */
.card{background:var(--b1);-webkit-mask:var(--rr) center/100% 100% no-repeat;mask:var(--rr) center/100% 100% no-repeat;transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.card::before,.card::after{content:'';position:absolute;left:9px;top:16px;bottom:28%;width:8px;-webkit-mask:var(--bv) center/100% 100% no-repeat;mask:var(--bv) center/100% 100% no-repeat}
.card::before{background:var(--b3)}
.card::after{background:var(--cs,var(--ink));clip-path:inset(0 0 100% 0);transition:clip-path .6s cubic-bezier(.6,0,.2,1)}
.card:hover{transform:translateY(-4px) rotate(-.35deg)}
.card:hover::after{clip-path:inset(0 0 0 0)}
.part{padding-left:32px}
.part + .part{border-top:1px solid var(--hair)}
.card .part.head,.card .part.foot{flex-direction:row;align-items:center;justify-content:space-between}
.card.now{--cs:var(--now)}
.card.now::after{animation:pDn 2.8s cubic-bezier(.6,0,.2,1) infinite alternate}
@keyframes pDn{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}
.card.au{--cs:linear-gradient(180deg,#FFF0CC,#C9985C);background:#0b0b0c}
.card.au::after{clip-path:inset(0 0 0 0)}
.card.au .ttl{padding:.18em 0 .08em;margin:-.18em 0 -.08em;background:linear-gradient(180deg,#FFF0CC,#C9985C);-webkit-background-clip:text;background-clip:text;color:transparent}
.card.au .txt{color:#C9CED4}
.card.empty{background:repeating-linear-gradient(112deg,transparent 0 9px,var(--hair) 9px 10px)}
.card.empty::before{opacity:.5}

/* capas: uma passada de verniz cruza a capa e o nome é sublinhado a pincel */
.cover{gap:12px}
.cover__img{-webkit-mask:var(--rr) center/100% 100% no-repeat;mask:var(--rr) center/100% 100% no-repeat;transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.cover__img::before{content:'';position:absolute;z-index:3;inset:0;background:linear-gradient(112deg,transparent 38%,rgba(255,255,255,.42) 50%,transparent 62%) 130% 0/300% 100% no-repeat;pointer-events:none}
.cover:hover .cover__img{transform:translateY(-5px) rotate(-1.2deg)}
.cover:hover .cover__img::before{animation:pVar .8s cubic-bezier(.4,0,.2,1)}
@keyframes pVar{from{background-position:130% 0}to{background-position:-30% 0}}
.cover__info{position:relative;padding-bottom:9px}
.cover__info::after{content:'';position:absolute;left:-3px;right:20%;bottom:0;height:6px;background:var(--ink);-webkit-mask:var(--br3) center/100% 100% no-repeat;mask:var(--br3) center/100% 100% no-repeat;clip-path:inset(0 100% 0 0);transition:clip-path .45s cubic-bezier(.6,0,.2,1)}
.cover:hover .cover__info::after{clip-path:inset(0 0 0 0)}

/* nota: cinco toques de pincel */
.rate__bar{gap:7px}
.rate__bar i{width:17px;height:42px;background:var(--b3);-webkit-mask:var(--bv) center/100% 100% no-repeat;mask:var(--bv) center/100% 100% no-repeat}
.rate__bar i:nth-child(odd){rotate:-5deg}.rate__bar i:nth-child(even){rotate:4deg}
.rate__bar i.on{background:var(--now)}
.rate__bar i.half{background:linear-gradient(0deg,var(--now) 50%,var(--b3) 50%)}
.rate__avg b{color:var(--ink2)}

.meter{position:relative;height:12px;gap:0}
.meter i{display:none}
.meter::before{content:'';position:absolute;inset:2px 0;background:var(--b3);-webkit-mask:var(--br3) center/100% 100% no-repeat;mask:var(--br3) center/100% 100% no-repeat}
.meter::after{content:'';position:absolute;left:0;top:0;bottom:0;width:var(--p);background:var(--mc,var(--ink));-webkit-mask:var(--br1) center/100% 100% no-repeat;mask:var(--br1) center/100% 100% no-repeat}
.meter.now{--mc:var(--now)}
.meter.au{--mc:linear-gradient(170deg,#FFF0CC,#C9985C)}

/* campos: escreve-se sobre uma linha pintada */
.field__w{height:46px;padding:0 4px}
.field__w::before,.field__w::after{content:'';position:absolute;left:-5px;right:-5px;bottom:0;height:8px}
.field__w::before{background:var(--ln);-webkit-mask:var(--br3) center/100% 100% no-repeat;mask:var(--br3) center/100% 100% no-repeat}
.field__w::after{background:var(--fc,var(--ink));-webkit-mask:var(--br1) center/100% 100% no-repeat;mask:var(--br1) center/100% 100% no-repeat;clip-path:inset(0 100% 0 0);transition:clip-path .5s cubic-bezier(.6,0,.2,1)}
.field.foc .field__w::after,.field__w:focus-within::after,.field.err .field__w::after{clip-path:inset(0 0 0 0)}
.field.err{--fc:var(--dan)}

.sw__t{width:58px;height:30px;background:var(--b3);-webkit-mask:var(--br1) center/100% 100% no-repeat;mask:var(--br1) center/100% 100% no-repeat}
.sw__k{left:6px;width:20px;height:20px;top:5px;border-radius:var(--blob);background:var(--fnt);transition:left .3s cubic-bezier(.3,1.4,.5,1),background .3s}
.sw.on .sw__k{left:32px;background:var(--ink)}

.toast{position:relative;display:flex;align-items:center;gap:14px;padding:14px 20px 16px 42px;background:var(--b2);-webkit-mask:var(--rr) center/100% 100% no-repeat;mask:var(--rr) center/100% 100% no-repeat}
.toast::before{content:'';position:absolute;left:18px;top:50%;width:12px;height:12px;margin-top:-7px;border-radius:var(--blob);background:var(--ink)}
.toast::after{content:'';position:absolute;left:0;bottom:0;height:6px;background:var(--ink);-webkit-mask:var(--br3) center/100% 100% no-repeat;mask:var(--br3) center/100% 100% no-repeat;animation:pTm 6s linear infinite}
@keyframes pTm{from{width:100%}to{width:0}}

.hdr{background:var(--bg)}
.hdr::after{content:'';position:absolute;left:44px;right:44px;bottom:0;height:5px;background:var(--ln);-webkit-mask:var(--br3) center/100% 100% no-repeat;mask:var(--br3) center/100% 100% no-repeat}
.hdr nav a{font-size:15px;font-weight:600;transition:color .3s}
.hdr nav a:hover{color:var(--ink)}
.hdr nav a.on::after{content:'';position:absolute;left:-7px;right:-7px;bottom:19px;height:9px;background:var(--ink);-webkit-mask:var(--br1) center/100% 100% no-repeat;mask:var(--br1) center/100% 100% no-repeat}
.pill{isolation:isolate;position:relative;color:#1b1206}
.pill::before{content:'';position:absolute;z-index:-1;inset:0 -4px;background:var(--now);-webkit-mask:var(--br2) center/100% 100% no-repeat;mask:var(--br2) center/100% 100% no-repeat}

/* topo das páginas: trama de tela sobre a imagem e uma pincelada sob o título */
.photo::after{content:'';position:absolute;z-index:1;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 1px,transparent 1px 3px),repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 1px,transparent 1px 3px);mix-blend-mode:overlay;pointer-events:none}
.photo .ttl::after{content:'';display:block;width:min(100%,560px);height:18px;margin-top:14px;background:var(--ink);-webkit-mask:var(--br1) center/100% 100% no-repeat;mask:var(--br1) center/100% 100% no-repeat;animation:pIn 1.1s .35s cubic-bezier(.6,0,.2,1) both}

.hz__line{top:9px;height:7px;background:var(--ln);-webkit-mask:var(--br3) center/100% 100% no-repeat;mask:var(--br3) center/100% 100% no-repeat}
.hz::before{content:'';position:absolute;left:0;top:8px;width:26%;height:9px;background:var(--now);-webkit-mask:var(--br1) center/100% 100% no-repeat;mask:var(--br1) center/100% 100% no-repeat}
.hz__dot{top:-29px;width:14px;height:14px;border-radius:var(--blob);background:var(--mut)}
.hz__p.now .hz__dot{background:var(--now);animation:pWet 2.4s ease-in-out infinite}
.hz__d{font:700 20px/1 'Caveat',cursive}
.list__it{padding:9px 0}
.list__it + .list__it{border-top:1px solid var(--hair)}
.list__th{border-radius:2px}
