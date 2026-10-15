/**
 * Central de avisos: o sino do topo (com o painel dos mais recentes) e o item de aviso, usado também em /avisos.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, navigate, usePath } from '../lib/router';
import { useStore } from '../data/store';
import { REACTIONS } from '../data/communityApi';
import { notifApi, refreshNotifs, useNotifCount, type Notif } from '../data/notifApi';
import { PersonAvatar, ago } from './Posts';
import { Icon } from './Icon';
import { hourLabel, whenLabel } from '../lib/when';
import { plainText } from '../lib/postText';

const who = (n: Notif): ReactNode => {
  const a = n.actors[0];
  const first = a ? (a.handle ? `@${a.handle}` : a.gone ? 'Uma conta apagada' : 'Alguém') : 'Alguém';
  const rest = n.actorCount - 1;
  return <b>{first}{rest > 0 ? ` e mais ${rest}` : ''}</b>;
};
const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** A frase do aviso. */
export function notifLine(n: Notif): ReactNode {
  const t = <b>{n.title ?? ''}</b>;
  const many = n.actorCount > 1;
  switch (n.kind) {
    case 'resposta': return <>{who(n)} respondeu você em {t}</>;
    case 'acompanhando': return <>{who(n)} respondeu em {t}, que você acompanha</>;
    case 'mencao': return <>{who(n)} mencionou você em {t}</>;
    case 'reacao': {
      const labels = n.reactions.map((k) => REACTIONS.find((r) => r.k === k)?.label).filter(Boolean).join(', ');
      return <>{who(n)} {many ? 'reagiram' : 'reagiu'} à sua {n.data.target === 'resposta' ? 'resposta' : 'mensagem'} em {t}{labels ? <span className="faint"> · {labels}</span> : null}</>;
    }
    case 'clube_resposta': return <>{who(n)} respondeu você no clube {t}</>;
    case 'clube_mencao': return <>{who(n)} mencionou você no clube {t}</>;
    case 'clube_convite': return <>{who(n)} convidou você para o clube {t}</>;
    case 'clube_jogo': return <>O clube {t} começou um jogo novo{n.excerpt ? <>: <b>{n.excerpt}</b></> : ''}</>;
    case 'clube_jogatina': return <>{who(n)} marcou <b>{n.excerpt}</b> na agenda do clube {t}{str(n.data.startsAt) ? `, ${whenLabel(str(n.data.startsAt))}` : ''}</>;
    case 'parte': return <>Abriu a parte <b>{n.excerpt}</b> no clube {t}</>;
    case 'jogatina_resposta': return <>{who(n)} respondeu você na jogatina {t}</>;
    case 'jogatina_mencao': return <>{who(n)} mencionou você na jogatina {t}</>;
    case 'jogatina_convite': return <>{who(n)} convidou você para a jogatina {t}{str(n.data.startsAt) ? `, ${whenLabel(str(n.data.startsAt))}` : ''}</>;
    case 'jogatina_lembrete': {
      const s = str(n.data.startsAt);
      return <>A jogatina {t} {s && Date.parse(s) <= Date.now() ? 'está começando' : s ? `começa às ${hourLabel(s)}` : 'começa daqui a pouco'}</>;
    }
    case 'jogatina_mudou': return n.data.what === 'cancelada'
      ? <>A jogatina {t} foi cancelada</>
      : <>A jogatina {t} mudou para <b>{whenLabel(str(n.data.startsAt))}</b></>;
    case 'seguiu': return n.data.friends ? <>{who(n)} seguiu você de volta: agora vocês são amigos</> : <>{who(n)} começou a seguir você</>;
    case 'lancamento': return <>Saiu {t}, que está na sua lista de desejos ou no Radar</>;
    case 'retomada': { const d = str(n.data.lastAt) ? Math.floor((Date.now() - Date.parse(str(n.data.lastAt))) / 86_400_000) : 14; return <>Faz {d} dias que você não volta a {t}. Quer ver onde parou?</>; }
    case 'moderacao': return <><b>Moderação</b></>;
    case 'site': return <><b>WinnerZ</b> · {t}</>;
    default: return <>{t}</>;
  }
}
const ICON: Record<string, string> = { jogatina_lembrete: 'calendario', jogatina_mudou: 'calendario', parte: 'jornada', lancamento: 'radar', retomada: 'jornada', moderacao: 'escudo', site: 'sino', clube_jogo: 'jogos' };
/** Texto extra embaixo da frase (trecho da mensagem, aviso da moderação). */
const showExcerpt = (n: Notif) => !!n.excerpt && !['clube_jogo', 'clube_jogatina', 'parte'].includes(n.kind);

/** Endereço do aviso; quem começou a seguir abre o perfil. */
export function notifHref(n: Notif): string | null {
  if (n.kind === 'seguiu') return n.actors[0]?.handle ? `/@${n.actors[0].handle.toLowerCase()}` : null;
  return n.link;
}

export function NotifItem({ n, onOpen, compact = false, onToggle }: { n: Notif; onOpen?: () => void; compact?: boolean; onToggle?: () => void }) {
  const href = notifHref(n);
  const open = () => { if (!n.read) void notifApi.read(n.ids); onOpen?.(); if (href) navigate(href); };
  const icon = ICON[n.kind];
  return (
    <li className={`notif${n.read ? '' : ' is-unread'}${compact ? ' notif--compact' : ''}`}>
      <button type="button" className="notif__main" onClick={open}>
        <span className="notif__av" aria-hidden="true">
          {n.actors.length > 0 ? <PersonAvatar p={n.actors[0]} size={compact ? 34 : 40} /> : <span className="notif__ic"><Icon name={icon ?? 'sino'} size={compact ? 16 : 18} /></span>}
          {n.actorCount > 1 && <span className="notif__more">+{n.actorCount - 1}</span>}
        </span>
        <span className="notif__tx">
          <span className="notif__line">{notifLine(n)}</span>
          {showExcerpt(n) && <small className="notif__ex">{plainText(n.excerpt ?? '')}</small>}
          <small className="notif__at faint">{ago(n.at)}</small>
        </span>
        {!n.read && <span className="notif__dot" aria-label="Não lido" />}
      </button>
      {onToggle && <button type="button" className="notif__toggle cm-link" onClick={onToggle} title={n.read ? 'Marcar como não lido' : 'Marcar como lido'}>{n.read ? 'Não lido' : 'Lido'}</button>}
    </li>
  );
}

/** O sino do topo. */
export function NotifBell() {
  const path = usePath();
  const signed = useStore((s) => s.mode === 'demo' || !!s.profile);
  const c = useNotifCount();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[] | null>(null);
  const [err, setErr] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  if (!signed) return null;
  const n = c?.new ?? 0;
  const toggle = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true); setItems(null); setErr('');
    try { const r = await notifApi.list('tudo', null, 12); setItems(r.items); if (n > 0) void notifApi.seen(); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu para carregar os avisos.'); setItems([]); }
  };
  const readAll = async () => { await notifApi.readAll('tudo'); setItems((l) => l?.map((x) => ({ ...x, read: true })) ?? l); };
  return (
    <div className="notif-bell" ref={box}>
      <button className="icon-btn notif-bell__btn" aria-label={n ? `Avisos: ${n} ${n === 1 ? 'novo' : 'novos'}` : 'Avisos'} aria-expanded={open} onClick={() => void toggle()}>
        <Icon name="sino" size={20} />
        {n > 0 && <span className="notif-bell__n">{n > 9 ? '9+' : n}</span>}
      </button>
      {open && (
        <div className="notif-pop" role="dialog" aria-label="Avisos">
          <div className="notif-pop__head">
            <b>Avisos</b>
            {(c?.unread ?? 0) > 0 && <button className="cm-link" onClick={() => void readAll()}>Marcar tudo como lido</button>}
          </div>
          {err && <p className="awards__error notif-pop__err">{err}</p>}
          {items == null ? <p className="faint notif-pop__empty">Carregando…</p>
            : items.length === 0 ? <p className="muted notif-pop__empty">Nenhum aviso por enquanto. Quando alguém responder, convidar ou seguir você, aparece aqui.</p>
              : <ul className="notif-list notif-list--pop">{items.map((x) => <NotifItem key={x.id} n={x} compact onOpen={() => setOpen(false)} />)}</ul>}
          <div className="notif-pop__foot">
            <Link to="/avisos" onClick={() => setOpen(false)}>Ver todos os avisos</Link>
            <Link to="/preferencias#avisos" onClick={() => setOpen(false)} className="faint">Escolher os avisos</Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** Para telas que mudam algo que gera aviso (responder um convite, por exemplo). */
export const recount = () => void refreshNotifs();
