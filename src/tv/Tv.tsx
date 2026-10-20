/**
 * Modo TV: o painel do WinnerZ para a tela grande, controlado pelo joystick (ou pelas setas do controle remoto).
 * Em cima, as seções (LB e RB trocam); embaixo, os botões do seu controle; o item escolhido ganha a linha do
 * horizonte acesa embaixo dele, que desliza de um item para o outro. As páginas do site continuam as mesmas: o painel
 * só troca o menu e deixa tudo navegável pelo controle.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, navigate } from '../lib/router';
import { useStore } from '../data/store';
import { BrandMark } from '../components/Brand';
import { Sheet } from '../components/Sheet';
import { controles, ouvirControle, tipoDoControle, vibrar, type Botao } from './gamepad';
import { escopo, focado, focar, itens, proximo, type Direcao } from './foco';
import { setTv, setTvPrefs, tvRecusado, useTvPrefs, type Glifos } from './mode';
import { som } from './sons';

export const TV_SECOES = [
  { to: '/tv', nome: 'Continuar' },
  { to: '/tv/estante', nome: 'Estante' },
  { to: '/album/pacotes', nome: 'Pacotes' },
  { to: '/eventos/awards', nome: 'Awards' },
  { to: '/comunidade', nome: 'Comunidade' },
];
const secaoDe = (path: string) => {
  const p = path.split('?')[0];
  const i = TV_SECOES.findIndex((s, k) => (k === 0 ? p === '/tv' : p === s.to || p.startsWith(`${s.to}/`)));
  return i >= 0 ? i : p.startsWith('/album') ? 2 : p.startsWith('/eventos') ? 3 : p.startsWith('/comunidade') || p.startsWith('/conversa') ? 4 : p.startsWith('/colecao') || p.startsWith('/jogos') ? 1 : 0;
};

/* ---- Os botões do controle na tela ------------------------------------------------------------------------------ */
type Tipo = 'xbox' | 'playstation';
const NOMES: Record<Tipo, Record<'a' | 'b' | 'lb' | 'rb' | 'menu', string>> = {
  xbox: { a: 'A', b: 'B', lb: 'LB', rb: 'RB', menu: '☰' },
  playstation: { a: '✕', b: '○', lb: 'L1', rb: 'R1', menu: 'OPTIONS' },
};
export function Glifo({ b, tipo }: { b: 'a' | 'b' | 'lb' | 'rb' | 'menu'; tipo: Tipo }) {
  return <span className={`tv-g tv-g--${b} tv-g--${tipo}`} aria-hidden="true">{NOMES[tipo][b]}</span>;
}
function useTipo(): Tipo {
  const { glifos } = useTvPrefs();
  const [auto, setAuto] = useState<Tipo>(() => tipoDoControle(controles()[0]));
  useEffect(() => ouvirControle(() => setAuto(tipoDoControle())), []);
  return glifos === 'auto' ? auto : glifos;
}

/* ---- O painel ------------------------------------------------------------------------------------------------------ */
export function TvShell({ path, children, semSecoes = false }: { path: string; children: ReactNode; semSecoes?: boolean }) {
  const profile = useStore((s) => s.profile);
  const tipo = useTipo();
  const [opcoes, setOpcoes] = useState(false);
  const [hora, setHora] = useState(() => new Date());
  const linha = useRef<HTMLDivElement>(null);
  const secao = secaoDe(path);
  const estado = useRef({ path, secao, opcoes });
  const semSecoesRef = useRef(semSecoes); semSecoesRef.current = semSecoes;
  estado.current = { path, secao, opcoes };

  useEffect(() => { const t = setInterval(() => setHora(new Date()), 15000); return () => clearInterval(t); }, []);
  useEffect(() => { document.documentElement.classList.add('is-tv'); return () => document.documentElement.classList.remove('is-tv'); }, []);

  // Ao trocar de página: o foco vai para o primeiro item do conteúdo (ou o marcado como primeiro).
  useEffect(() => {
    const t = setTimeout(() => {
      const box = document.querySelector<HTMLElement>('.tv__conteudo');
      if (!box || escopo() !== document.body) return;
      const alvo = box.querySelector<HTMLElement>('[data-tv-primeiro]') ?? proximo(null, 'baixo', itens(box));
      if (alvo) focar(alvo);
    }, 350);
    return () => clearTimeout(t);
  }, [path]);

  // A linha do horizonte segue o item escolhido (inclusive enquanto a página rola). E o foco nunca se perde: se o item
  // some (o botão virou outro), ou se abre/fecha uma janela, ele vai para o primeiro item de onde a pessoa está.
  useEffect(() => {
    let raf = 0;
    let janela: HTMLElement | null = null;
    let antes: HTMLElement | null = null;
    let ultimo: HTMLElement | null = null;
    const primeiro = (raiz: HTMLElement) => raiz.querySelector<HTMLElement>('[data-tv-primeiro]') ?? proximo(null, 'baixo', itens(raiz));
    const passo = () => {
      const agora = escopo();
      const nova = agora === document.body ? null : agora;
      if (nova !== janela) {
        const saiu = janela;
        janela = nova;
        setTimeout(() => {
          if (nova) { antes = document.querySelector<HTMLElement>('.tv-foco'); const p = primeiro(nova); if (p) focar(p); }
          else if (saiu) { const volta = antes?.isConnected ? antes : primeiro(document.querySelector<HTMLElement>('.tv__conteudo') ?? document.body); if (volta) focar(volta); }
        }, 80);
      }
      // O item escolhido saiu da tela (ex.: "Começar" virou "Encerrar"): o foco vai para o primeiro de onde a pessoa está.
      // O React trocou a classe do item (o mesmo botão mudou de estilo): a marca volta para ele.
      if (ultimo?.isConnected && !document.querySelector('.tv-foco')) ultimo.classList.add('tv-foco');
      if (ultimo && !ultimo.isConnected) {
        ultimo = null;
        const raiz = janela ?? document.querySelector<HTMLElement>('.tv__conteudo');
        const p = raiz ? primeiro(raiz) : null;
        if (p) focar(p);
      }
      const el = document.querySelector<HTMLElement>('.tv-foco');
      if (el) ultimo = el;
      const l = linha.current;
      if (l) {
        if (el && el.isConnected) {
          const r = el.getBoundingClientRect();
          l.style.opacity = '1';
          l.style.transform = `translate(${Math.round(r.left)}px, ${Math.round(r.bottom + 6)}px)`;
          l.style.width = `${Math.round(r.width)}px`;
        } else l.style.opacity = '0';
      }
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const mover = (d: Direcao) => {
      const atual = focado();
      const lista = itens();
      const n = proximo(atual && lista.includes(atual) ? atual : null, d, lista);
      if (n) { focar(n); som('mover'); return; }
      // Nada naquela direção: embaixo, rola a página; em cima, volta para as seções.
      if (d === 'baixo') { window.scrollBy({ top: innerHeight * 0.45, behavior: 'smooth' }); som('limite'); return; }
      if (d === 'cima' && escopo() === document.body) { const tab = document.querySelector<HTMLElement>('.tv__tab[aria-current="page"]'); if (tab && tab !== atual) { focar(tab); som('mover'); return; } }
      som('limite');
    };
    const escolher = () => {
      const el = focado();
      if (!el) return;
      if (el instanceof HTMLSelectElement) {
        el.selectedIndex = (el.selectedIndex + 1) % Math.max(1, el.options.length);
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (el instanceof HTMLInputElement && /^(checkbox|radio)$/.test(el.type)) el.click();
      else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.focus();
      else el.click();
      som('ok');
    };
    const voltar = () => {
      if (estado.current.opcoes) { setOpcoes(false); som('voltar'); return; }
      if (escopo() !== document.body) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); som('voltar'); return; }
      if (estado.current.path !== '/tv') { history.back(); som('voltar'); }
    };
    const trocar = (k: number) => {
      const i = (estado.current.secao + k + TV_SECOES.length) % TV_SECOES.length;
      navigate(TV_SECOES[i].to); som('secao'); window.scrollTo({ top: 0 });
    };
    const agir = (b: Botao) => {
      if (b === 'cima' || b === 'baixo' || b === 'esquerda' || b === 'direita') mover(b);
      else if (b === 'a') escolher();
      else if (b === 'b') voltar();
      else if (b === 'lb' && !semSecoesRef.current) trocar(-1);
      else if (b === 'rb' && !semSecoesRef.current) trocar(1);
      else if (b === 'menu') { setOpcoes((v) => !v); som('ok'); }
    };
    const pare = ouvirControle(agir);
    const tecla = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const digitando = !!t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !/^(checkbox|radio|range|button|submit)$/.test((t as HTMLInputElement).type)) || t.isContentEditable);
      const mapa: Record<string, Botao> = { ArrowUp: 'cima', ArrowDown: 'baixo', ArrowLeft: 'esquerda', ArrowRight: 'direita', PageUp: 'lb', PageDown: 'rb', ContextMenu: 'menu' };
      if (mapa[e.key] && !digitando) { e.preventDefault(); agir(mapa[e.key]); return; }
      // Voltar pelo teclado (controle remoto): só quando não há janela aberta, porque a janela já fecha com Esc.
      if ((e.key === 'Backspace' || e.key === 'BrowserBack') && !digitando) { e.preventDefault(); voltar(); }
    };
    addEventListener('keydown', tecla);
    // Clique com o mouse também move a linha (o painel funciona com mouse e controle juntos).
    const clique = (e: Event) => { const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [data-tv]'); if (el) { document.querySelectorAll('.tv-foco').forEach((x) => x.classList.remove('tv-foco')); el.classList.add('tv-foco'); } };
    addEventListener('focusin', clique);
    // As figurinhas raras fazem o controle tremer (os sons do álbum avisam o que saiu).
    const fx = (e: Event) => {
      const n = (e as CustomEvent<string>).detail;
      if (n === 'rare') vibrar(0.6, 0.4, 260); else if (n === 'legend') { vibrar(1, 0.8, 700); setTimeout(() => vibrar(0.7, 1, 500), 800); } else if (n === 'rip') vibrar(0.2, 0.5, 120); else if (n === 'inc') vibrar(0.15, 0.3, 90);
    };
    addEventListener('wz:sfx', fx);
    return () => { pare(); removeEventListener('keydown', tecla); removeEventListener('focusin', clique); removeEventListener('wz:sfx', fx); };
  }, []);

  return (
    <div className="tv">
      <header className="tv__top">
        <Link to="/tv" className="tv__marca" aria-label="WinnerZ, Continuar"><BrandMark width={64} /></Link>
        {semSecoes && <span />}
        {!semSecoes && <nav className="tv__tabs" aria-label="Seções">
          <Glifo b="lb" tipo={tipo} />
          {TV_SECOES.map((s, i) => <Link key={s.to} to={s.to} className="tv__tab" aria-current={i === secao ? 'page' : undefined}>{s.nome}</Link>)}
          <Glifo b="rb" tipo={tipo} />
        </nav>}
        <div className="tv__dir">
          <span className="tv__hora">{hora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          {profile && <span className="tv__eu">{profile.avatar ? <img src={profile.avatar} alt="" /> : <b>{profile.initial}</b>}</span>}
          <button className="tv__opt" onClick={() => setOpcoes(true)}><Glifo b="menu" tipo={tipo} />Opções</button>
        </div>
      </header>
      <div className="tv__conteudo">{children}</div>
      <footer className="tv__dicas" aria-hidden="true">
        <span><Glifo b="a" tipo={tipo} />Escolher</span>
        <span><Glifo b="b" tipo={tipo} />Voltar</span>
        {!semSecoes && <span><Glifo b="lb" tipo={tipo} /><Glifo b="rb" tipo={tipo} />Seções</span>}
        <span><Glifo b="menu" tipo={tipo} />Opções</span>
      </footer>
      <div className="tv__linha" ref={linha} aria-hidden="true" />
      {opcoes && <Opcoes onClose={() => setOpcoes(false)} />}
    </div>
  );
}

function Opcoes({ onClose }: { onClose: () => void }) {
  const p = useTvPrefs();
  const glifos: { id: Glifos; nome: string }[] = [{ id: 'auto', nome: 'Pelo controle' }, { id: 'xbox', nome: 'Xbox' }, { id: 'playstation', nome: 'PlayStation' }];
  return (
    <Sheet title="Modo TV" onClose={onClose} labelId="tv-opcoes">
      <div className="tv-opcoes">
        <label className="motion motion--switch" data-on={p.sons}>
          <input type="checkbox" role="switch" className="switch" checked={p.sons} onChange={(e) => setTvPrefs({ sons: e.target.checked })} />
          <span><strong>Sons do painel</strong><span className="muted">Navegar, escolher, voltar e trocar de seção.</span></span>
        </label>
        <div className="glr-f"><span className="glr-f__l">Botões na tela</span>
          <div className="seg" role="group" aria-label="Botões na tela">{glifos.map((g) => <button key={g.id} aria-pressed={p.glifos === g.id} onClick={() => setTvPrefs({ glifos: g.id })}>{g.nome}</button>)}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button className="btn primary" data-tv-primeiro onClick={onClose}>Continuar no Modo TV</button>
          <button className="btn ghost" onClick={() => { setTv(false); onClose(); navigate('/'); }}>Sair do Modo TV</button>
        </div>
      </div>
    </Sheet>
  );
}

/* ---- Abre sozinho quando um controle aparece ----------------------------------------------------------------------- */
/**
 * Fora do Modo TV: o primeiro botão apertado num controle abre o aviso "Modo TV em 3". Em 3 segundos o painel abre;
 * B (ou o botão do aviso) fica no site como está, e o controle não insiste de novo nesta aba.
 */
export function TvAutoOpen() {
  const [conta, setConta] = useState<number | null>(null);
  const [tipo, setTipo] = useState<Tipo>('xbox');
  const contando = useRef(false);
  useEffect(() => {
    if (tvRecusado()) return;
    return ouvirControle((b) => {
      if (tvRecusado()) return;
      if (!contando.current) { contando.current = true; setTipo(tipoDoControle()); setConta(3); return; }
      if (b === 'b') { setTv(false); contando.current = false; setConta(null); }
      else if (b === 'a') { setConta(0); }
    });
  }, []);
  useEffect(() => {
    if (conta == null) return;
    if (conta <= 0) { contando.current = false; setConta(null); setTv(true); navigate('/tv'); return; }
    const t = setTimeout(() => setConta((c) => (c == null ? c : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [conta]);
  if (conta == null) return null;
  return (
    <div className="tv-aviso" role="status">
      <strong>Controle conectado</strong>
      <span>Abrindo o Modo TV em {conta}…</span>
      <span className="tv-aviso__bts"><span><Glifo b="a" tipo={tipo} />Abrir já</span><span><Glifo b="b" tipo={tipo} />Ficar aqui</span></span>
      <button className="btn quiet sm" onClick={() => { setTv(false); contando.current = false; setConta(null); }}>Ficar aqui</button>
    </div>
  );
}
