/* ============================================================ trilha gravada (músicas do dono, 01/11/2026)
   Cada tela e cada prova toca uma das faixas da pasta musica/. Se uma faixa não carregar, volta a música feita em código.
   As vinhetas de medalha continuam as de código, por cima.
   Volume (01/11, pedido do dono: a música não pode cobrir os efeitos): as faixas são igualadas em -18 LUFS (musica.py),
   tocam a 25% no volume padrão (cerca de -30 LUFS) e os efeitos sonoros ficaram 2x mais altos (SFX_GANHO). */
const SFX_GANHO = 2;
beep = ((b) => (f, d, type, v, slide) => b(f, d, type, (v === undefined ? .05 : v) * SFX_GANHO, slide))(beep);
const TRILHA = (() => {
  const V = '2';                    // trocar quando uma faixa for substituída (o navegador baixa de novo)
  const BASE = 0.25;                // volume das faixas no padrão (o volume da música nas opções, o botão e o "abaixar" da pausa multiplicam por cima)
  const VPAD = 0.4;                 // o volume de música padrão das opções (5 de 10)
  const PROVA = {                   // prova -> faixa
    volei: 'volei', pingue: 'pingue', basquete: 'basquete',
    surfe: 'surfe', canoagem: 'canoagem', natacao: 'natacao', jetski: 'jetski', duelo: 'duelo',
    halfpipe: 'skate', patins: 'patins', bmx: 'bmx', bugue: 'bugue',
    embaixadinha: 'embaixadinha', futebol: 'futebol', bocha: 'bocha', frisbee: 'frisbee',
    obstaculos: 'corrida', arco: 'arco',
  };
  const NOMES = { tema: 'Carnaval na Areia', menu: 'Disco do Caranguejo', volei: 'Forró do Coqueiro', surfe: 'Onda Gigante', skate: 'Skate no Calçadão', festa: 'Soca do Coco', podio: 'Mambo do Pódio',
    embaixadinha: 'Samba da Embaixadinha', patins: 'Rinque Neon', basquete: 'Cesta de Três', pingue: 'Tic-Tac Swing', bmx: 'Manobra Radical',
    corrida: 'Kuduro na Areia', frisbee: 'Disco Voador', arco: 'Na Mosca', duelo: 'Guerra de Água', canoagem: 'Remada Polinésia',
    futebol: 'Gol de Bicicleta', bocha: 'Tarantela da Bocha', natacao: 'Braçada Turbo', jetski: 'Turbo Jet', bugue: 'Bugue Turbo' };
  const els = {}, bad = {};
  let faixa = '', nome = '', duck = 1, vol = VPAD, abriu = false, timer = null;
  const orig = { play: Music.play, stop: Music.stop, duck: Music.duck, setOn: Music.setOn, setVol: Music.setVol };
  Music.define('__mudo', { bpm: 120 });
  // no iPhone e no iPad o volume de uma faixa não muda pelo código: lá a troca é seca e a pausa não abaixa a música
  const VOLOK = (() => { try { const t = new Audio(); t.volume = .5; return Math.abs(t.volume - .5) < .01; } catch { return false; } })();     // mantém o som das vinhetas ligado sem tocar notas
  function qual(n) {
    if (n === 'podio') return 'podio';
    if (n === 'orla') return abriu ? 'menu' : 'tema';   // a abertura toca o tema; depois da 1ª prova, os menus tocam o Disco
    return PROVA[n] || '';
  }
  function el(f) {
    if (els[f]) return els[f];
    const a = new Audio(); a.loop = true; a.preload = 'auto'; a.volume = VOLOK ? 0 : 1;
    a.addEventListener('error', () => { bad[f] = true; if (faixa === f) { faixa = ''; if (nome) Music.play(nome); } });
    a.src = `musica/${f}.mp3?v=${V}`; els[f] = a; return a;
  }
  function alvo() { return Music.on && !document.hidden ? Math.min(1, BASE * duck * vol / VPAD) : 0; }
  function rampa() {   // volume vai até o alvo aos poucos; faixas que saíram vão a zero e param
    if (!VOLOK) { for (const [f, a] of Object.entries(els)) if (f !== faixa || !alvo()) a.pause(); else a.volume = 1; return; }
    if (timer) return;
    timer = setInterval(() => {
      let mexeu = false;
      for (const [f, a] of Object.entries(els)) {
        const t = f === faixa ? alvo() : 0, v = a.volume, nv = Math.abs(t - v) < .03 ? t : v + Math.sign(t - v) * .03;
        if (nv !== v) { a.volume = Math.max(0, Math.min(1, nv)); mexeu = true; }
        if (f !== faixa && nv === 0 && !a.paused) a.pause();
      }
      if (!mexeu) { clearInterval(timer); timer = null; }
    }, 20);
  }
  function tocar(a) { if (Music.on && !document.hidden && a.paused) a.play().catch(() => {}); }
  Music.play = (n) => {
    if (n === '__mudo') n = nome;
    if (!n) return;
    if (n !== 'orla' && n !== 'podio') abriu = true;
    const f = qual(n);
    if (!f || bad[f]) {   // sem faixa: prova sem música gravada continua a que estava; se a faixa falhou, música de código
      if (!f && faixa) { nome = n; return; }
      faixa = ''; nome = n; rampa(); return orig.play(Music.songs[n] ? n : 'orla');
    }
    nome = n;
    if (!Music.on) { faixa = f; return; }
    orig.play('__mudo');
    const a = el(f);
    if (faixa !== f) { faixa = f; if (n !== 'orla' || f === 'tema') a.currentTime = 0; }
    tocar(a); rampa();
  };
  Music.stop = () => { orig.stop(); faixa = ''; nome = ''; rampa(); };
  Music.duck = (d) => { duck = d; orig.duck(d); rampa(); };
  Music.setVol = (v) => { vol = v; orig.setVol(v); rampa(); };
  Music.setOn = (v) => {
    const n = nome; orig.setOn(v); nome = n;
    if (!v) { for (const a of Object.values(els)) { if (VOLOK) a.volume = 0; a.pause(); } } else if (n) { faixa = ''; Music.play(n); }
  };
  Object.defineProperty(Music, 'current', { get: () => nome, configurable: true });
  document.addEventListener('visibilitychange', () => {
    const a = faixa && els[faixa];
    if (document.hidden) { for (const x of Object.values(els)) x.pause(); }
    else if (a) { tocar(a); rampa(); }
  });
  return {
    get faixa() { return faixa; }, get nome() { return faixa ? NOMES[faixa] : ''; },
    el: (f) => els[f], PROVA, NOMES,
  };
})();
