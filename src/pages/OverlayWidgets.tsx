/**
 * Sistema de live, etapa 3a: os widgets do overlay (mortes, metas, enquete e sorteio) e a cena dos créditos.
 * O painel vem do banco (live_painel_ler, sem login) a cada 2 s; a Central da live muda, o chat vota e entra no
 * sorteio (o servidor conta), e o overlay só mostra.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Figura } from '../components/IAmiguinho';
import { liveApi, TITULO_META, type Creditos, type Enquete, type Meta, type Painel, type Sorteio } from '../data/liveApi';
import type { SomWidget } from '../lib/sonsLive';

const relogio = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const num = (n: number) => n.toLocaleString('pt-BR');

/** O painel, perguntando a cada 2 s. Toca o som quando alguém morre, a meta bate ou sai o ganhador do sorteio. */
export function usePainel(ligado: boolean, tocar?: (s: SomWidget) => void): { p: Painel | null; desvio: number } {
  const [p, setP] = useState<Painel | null>(null);
  const [desvio, setDesvio] = useState(0);
  const antes = useRef<Painel | null>(null);
  const somRef = useRef(tocar); somRef.current = tocar;
  useEffect(() => {
    if (!ligado) return;
    let vivo = true;
    const ler = async () => {
      try {
        const n = await liveApi.painel();
        if (!vivo || !n) return;
        setDesvio(Date.parse(n.agora) - Date.now());
        const a = antes.current;
        if (a) {
          if (n.mostrarMortes && n.mortes > a.mortes) somRef.current?.('morte');
          else if (n.sorteio?.ganhador && n.sorteio.sorteadoEm && n.sorteio.sorteadoEm !== a.sorteio?.sorteadoEm && n.sorteio.mostrar) somRef.current?.('ganhador');
          else if (n.metas.some((m) => m.mostrar && m.atual >= m.alvo && (a.metas.find((x) => x.id === m.id)?.atual ?? m.alvo) < m.alvo)) somRef.current?.('meta');
        }
        antes.current = n;
        setP(n);
      } catch { /* sem rede: tenta de novo */ }
    };
    void ler();
    const t = setInterval(ler, 2000);
    return () => { vivo = false; clearInterval(t); };
  }, [ligado]);
  return { p, desvio };
}

/** O relógio de agora, acertado pela hora do servidor (para o tempo da enquete bater em todas as cenas). */
function useAgora(desvio: number) {
  const [t, setT] = useState(() => Date.now() + desvio);
  useEffect(() => { const i = setInterval(() => setT(Date.now() + desvio), 250); return () => clearInterval(i); }, [desvio]);
  return t;
}

function Mortes({ n, rotulo }: { n: number; rotulo: string | null }) {
  return (
    <div className="lv-w lv-mortes">
      <span className="lv-mortes__txt"><span className="lv-k">Mortes</span>{rotulo && <span className="lv-mortes__rotulo">{rotulo}</span>}</span>
      <b className="lv-mortes__n" key={n}>{num(n)}</b>
    </div>
  );
}

function MetaBarra({ m }: { m: Meta }) {
  const feito = m.atual >= m.alvo;
  const pct = Math.min(100, (m.atual / Math.max(1, m.alvo)) * 100);
  return (
    <div className={`lv-w lv-meta${feito ? ' is-feita' : ''}`}>
      <span className="lv-meta__topo">
        <span className="lv-k">{feito ? 'Meta batida' : m.titulo || TITULO_META[m.tipo]}</span>
        <span className="lv-meta__n"><b>{num(m.atual)}</b><i aria-hidden="true">/</i>{num(m.alvo)}</span>
      </span>
      <span className="lv-meta__barra" aria-hidden="true"><i style={{ width: `${pct}%` } as CSSProperties} /></span>
      {feito && m.titulo && <span className="lv-meta__nome">{m.titulo}</span>}
    </div>
  );
}

function EnqueteCard({ e, agora }: { e: Enquete; agora: number }) {
  const total = e.votos.reduce((a, b) => a + b, 0);
  const max = Math.max(...e.votos, 0);
  const falta = e.aberta && e.fechaEm ? Date.parse(e.fechaEm) - agora : null;
  const aberta = e.aberta && (falta == null || falta > 0);
  const nums = e.opcoes.map((_, i) => i + 1);
  return (
    <div className={`lv-w lv-enquete${aberta ? ' is-aberta' : ''}`}>
      <span className={`lv-k${aberta ? ' lv-k--agora' : ''}`}>{aberta && <i aria-hidden="true" />}{aberta ? 'Enquete · vote agora' : 'Enquete encerrada'}</span>
      {e.pergunta && <span className="lv-enquete__p">{e.pergunta}</span>}
      <ol className="lv-enquete__ops">
        {e.opcoes.map((o, i) => {
          const v = e.votos[i] ?? 0;
          const pct = total ? Math.round((v / total) * 100) : 0;
          const vence = !aberta && total > 0 && v === max;
          return (
            <li key={i} className={vence ? 'is-vence' : ''}>
              <i className="lv-enquete__fundo" style={{ width: `${pct}%` } as CSSProperties} aria-hidden="true" />
              <b className="lv-enquete__num">{i + 1}</b>
              <span className="lv-enquete__op">{o}</span>
              <span className="lv-enquete__pct">{pct}%</span>
            </li>
          );
        })}
      </ol>
      <span className="lv-enquete__pe">
        {aberta ? <>Digite {nums.length > 2 ? `${nums.slice(0, -1).join(', ')} ou ${nums[nums.length - 1]}` : nums.join(' ou ')} no chat</> : <>{num(total)} {total === 1 ? 'voto' : 'votos'}</>}
        {aberta && falta != null && <b className="lv-mono">{relogio(falta)}</b>}
        {aberta && falta == null && <b className="lv-mono">{num(total)} {total === 1 ? 'voto' : 'votos'}</b>}
      </span>
    </div>
  );
}

function SorteioCard({ s }: { s: Sorteio }) {
  if (s.ganhador) return (
    <div className="lv-w lv-sorteio is-ganhou" key={s.sorteadoEm ?? s.ganhador}>
      <Figura img="cara-sorriso-confiante" expressao="berrando" className="lv-sorteio__cara iam-reage--berrando" width={88} height={77} lazy={false} enfeite={false} />
      <span className="lv-sorteio__txt">
        <span className="lv-k">Ganhou o sorteio</span>
        <span className="lv-sorteio__nome">{s.ganhador}</span>
        <span className="lv-sorteio__sub">entre {num(s.participantes)} {s.participantes === 1 ? 'pessoa' : 'pessoas'}</span>
      </span>
    </div>
  );
  return (
    <div className={`lv-w lv-sorteio${s.aberto ? ' is-aberto' : ''}`}>
      <span className={`lv-k${s.aberto ? ' lv-k--agora' : ''}`}>{s.aberto && <i aria-hidden="true" />}{s.aberto ? 'Sorteio · entre agora' : 'Sorteio · inscrições fechadas'}</span>
      {s.aberto ? <span className="lv-sorteio__como">Digite <b>{s.palavra}</b> no chat</span> : <span className="lv-sorteio__como">Sorteando daqui a pouco</span>}
      <span className="lv-sorteio__sub"><b className="lv-mono">{num(s.participantes)}</b> {s.participantes === 1 ? 'pessoa participando' : 'pessoas participando'}</span>
    </div>
  );
}

/**
 * A coluna de widgets. Na Conversa, sem o contador de mortes. Com "limite" (a altura livre, em px do palco): se tudo
 * junto passar dela, a enquete e o sorteio vão para uma segunda coluna, à esquerda (para não cobrir a câmera).
 */
export function Widgets({ p, desvio, className, mortes = true, limite }: { p: Painel | null; desvio: number; className: string; mortes?: boolean; limite?: number }) {
  const agora = useAgora(desvio);
  const refA = useRef<HTMLDivElement>(null), refB = useRef<HTMLDivElement>(null);
  const [duas, setDuas] = useState(false);
  useLayoutEffect(() => {
    if (!limite) return;
    const medir = () => setDuas((refA.current?.offsetHeight ?? 0) + (refB.current?.offsetHeight ?? 0) + 10 > limite);
    medir();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    if (refA.current) ro?.observe(refA.current);
    if (refB.current) ro?.observe(refB.current);
    return () => ro?.disconnect();
  });
  if (!p) return null;
  const metas = p.metas.filter((m) => m.mostrar);
  const mostraMortes = mortes && p.mostrarMortes;
  const e = p.enquete?.mostrar ? p.enquete : null;
  const s = p.sorteio?.mostrar ? p.sorteio : null;
  if (!mostraMortes && !metas.length && !e && !s) return null;
  const a = mostraMortes || metas.length > 0, b = !!e || !!s;
  return (
    <div className={`lv-widgets ${className}${duas && a && b ? ' is-duas' : ''}`}>
      {a && (
        <div className="lv-widgets__col" ref={refA}>
          {mostraMortes && <Mortes n={p.mortes} rotulo={p.mortesRotulo} />}
          {metas.map((m) => <MetaBarra key={m.id} m={m} />)}
        </div>
      )}
      {b && (
        <div className="lv-widgets__col" ref={refB}>
          {e && <EnqueteCard key={e.id} e={e} agora={agora} />}
          {s && <SorteioCard key={s.id} s={s} />}
        </div>
      )}
    </div>
  );
}
/** Tem algum widget para mostrar? (a Conversa encolhe o chat quando tem) */
export const temWidget = (p: Painel | null, mortes = true) => !!p && ((mortes && p.mostrarMortes) || p.metas.some((m) => m.mostrar) || !!p.enquete?.mostrar || !!p.sorteio?.mostrar);

/* ---- Créditos: a rolagem do fim, como no cinema ---- */
const SECOES: { k: keyof Creditos; t: string }[] = [
  { k: 'raids', t: 'Raids' },
  { k: 'inscritos', t: 'Inscrições e membros' },
  { k: 'apoios', t: 'Bits e Super Chats' },
  { k: 'seguidores', t: 'Chegaram hoje' },
  { k: 'conversa', t: 'Quem mais falou no chat' },
];
export function useCreditos(ligado: boolean): Creditos | null {
  const [c, setC] = useState<Creditos | null>(null);
  useEffect(() => {
    if (!ligado) return;
    let vivo = true;
    const ler = async () => { try { const x = await liveApi.creditos(); if (vivo && x) setC(x); } catch { /* tenta de novo */ } };
    void ler();
    const t = setInterval(ler, 60_000);
    return () => { vivo = false; clearInterval(t); };
  }, [ligado]);
  return c;
}
export function Rolagem({ c, canal, jogo }: { c: Creditos | null; canal?: string | null; jogo?: string | null }) {
  const dentro = useRef<HTMLDivElement>(null);
  const [alt, setAlt] = useState(0);
  useLayoutEffect(() => {
    const el = dentro.current;
    if (!el) return;
    const medir = () => setAlt(el.scrollHeight);
    medir();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [c]);
  const secoes = SECOES.filter((x) => (c?.[x.k]?.length ?? 0) > 0);
  // 70 px por segundo: dá tempo de ler cada nome. A janela da rolagem tem 830 px de altura (live.css).
  const dur = Math.max(20, (alt + 830) / 70);
  return (
    <div className="lv-rola" aria-label="Créditos da live">
      <div className="lv-rola__dentro" ref={dentro} style={{ '--rola-dist': `${alt + 830}px`, animationDuration: `${dur}s` } as CSSProperties}>
        <div className="lv-rola__bloco lv-rola__bloco--topo">
          <span className="lv-k lv-k--g">Créditos</span>
          <span className="lv-rola__titulo">Obrigado por hoje</span>
        </div>
        <div className="lv-rola__bloco">
          <span className="lv-k">Apresentação</span>
          <span className="lv-rola__papel">{canal || 'O canal'}</span>
          <span className="lv-k">Comentários duvidosos</span>
          <span className="lv-rola__papel lv-rola__papel--iam">IAmiguinho</span>
          {jogo && <><span className="lv-k">Jogo</span><span className="lv-rola__papel">{jogo}</span></>}
        </div>
        {secoes.map((x) => (
          <div key={x.k} className="lv-rola__bloco">
            <span className="lv-k">{x.t}</span>
            <ul className="lv-rola__nomes">{c![x.k].map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        ))}
        {!secoes.length && <div className="lv-rola__bloco"><span className="lv-rola__papel">E você, que assistiu até aqui.</span></div>}
        <div className="lv-rola__bloco lv-rola__bloco--fim"><span className="lv-rola__papel">Até a próxima temporada.</span></div>
      </div>
    </div>
  );
}
