import { useCallback, useEffect, useMemo, useState } from 'react';
import { discordApi } from '../data/discordApi';
import { Link, navigate } from '../lib/router';
import { useStore } from '../data/store';
import { communityApi, type Community, type GameMini } from '../data/communityApi';
import { clubApi, type Club } from '../data/clubApi';
import {
  JOG_ACCESS, RSVP_LABEL, clubLabel, downloadIcs, jogatinaApi, jogatinaEnd, jogatinaNow,
  type JogPerson, type Jogatina, type JogatinaDraft, type JogatinaFull, type JogatinaLocked, type Rsvp,
} from '../data/jogatinaApi';
import { ensureRules } from '../data/moderationApi';
import { refreshNotifs } from '../data/notifApi';
import { ReportButton } from '../components/Moderation';
import { GroupChat, type ChatCtx } from '../components/GroupChat';
import { InviteBox, inviteSummary } from '../components/InviteBox';
import { GameSearchPick, PersonAvatar, PersonLink } from '../components/Posts';
import { PlayButton } from '../components/PlayButton';
import { Icon } from '../components/Icon';
import { gameBySlug } from '../components/AddGameDialog';
import { plainText } from '../lib/postText';
import { dayLong, hourLabel, localInput, relDay, spanLabel, whenLabel } from '../lib/when';

const errOf = (e: unknown) => (e instanceof Error ? e.message : 'Não deu certo agora.');
/** Recado que a tela de marcar deixa para a página da jogatina (resultado dos convites). */
const FLASH = 'wz.jogatina.recado';
const setFlash = (t: string) => { try { sessionStorage.setItem(FLASH, t); } catch { /* sem armazenamento: segue sem recado */ } };
const takeFlash = () => { try { const t = sessionStorage.getItem(FLASH); sessionStorage.removeItem(FLASH); return t ?? ''; } catch { return ''; } };
const SEAT_COLORS = ['#e2c08d', '#a6d8c8', '#ffb35c', '#a8d4ff', '#b8e6a0', '#f2a8a8', '#d3b8f5', '#f5d77a'];
const seatColor = (h?: string | null) => SEAT_COLORS[[...(h ?? '?')].reduce((a, c) => a + c.charCodeAt(0), 0) % SEAT_COLORS.length];

/** Status da jogatina em uma linha: "Faltam 1 h 20 · até 23h", "Acontecendo agora · até 23h", "Aconteceu ontem". */
function statusLine(j: Jogatina, now: number): string {
  const s = Date.parse(j.startsAt), e = jogatinaEnd(j);
  const until = j.durationMin ? `até ${hourLabel(new Date(e).toISOString())}` : 'sem hora para acabar';
  if (j.canceled) return 'Cancelada por quem marcou';
  if (now > e) return `Aconteceu ${relDay(j.startsAt) ?? `em ${whenLabel(j.startsAt).split(',').slice(0, -1).join(',')}`}`;
  if (now >= s - 15 * 60_000) return `Acontecendo agora · ${until}`;
  return `Faltam ${spanLabel(s - now)} · ${until}`;
}

/* ------------------------------------------------------------------ */
/* Cartão da jogatina (listas, Praça, agenda do clube)                  */
/* ------------------------------------------------------------------ */
export function JogatinaTile({ j, compact = false }: { j: Jogatina; compact?: boolean }) {
  const live = jogatinaNow(j);
  const art = j.game?.backdrop ?? j.game?.cover ?? null;
  return (
    <Link to={`/jogatina/${j.id}`} className={`jog-card${live ? ' is-now' : ''}${j.ended ? ' is-past' : ''}${compact ? ' jog-card--compact' : ''}`}>
      <span className="jog-card__art" aria-hidden="true">{art && <img src={art} alt="" loading="lazy" />}</span>
      <span className="jog-card__when">
        {live ? <><span className="praca__live" aria-hidden="true" /><b>Agora</b></> : <><b>{hourLabel(j.startsAt).toUpperCase()}</b><small>{relDay(j.startsAt) ?? whenLabel(j.startsAt).split(',').slice(0, -1).join(',')}</small></>}
      </span>
      <span className="jog-card__tx">
        <b className="jog-card__t">{j.title}</b>
        <small className="muted">{j.game?.title}{j.platform ? ` · ${j.platform}` : ''}</small>
        <small className="faint">
          {j.ended ? `${j.wasThere || j.going} ${(j.wasThere || j.going) === 1 ? 'estava lá' : 'estavam lá'}` : `${j.going} ${j.going === 1 ? 'vai' : 'vão'}${j.maxPeople ? ` de ${j.maxPeople}` : ''}`}
          {j.club ? ` · ${clubLabel(j.club.name)}` : j.community ? ` · w/${j.community.slug}` : ''}
          {j.me && !j.ended ? ` · você: ${RSVP_LABEL[j.me.rsvp].toLowerCase()}` : ''}
        </small>
      </span>
    </Link>
  );
}

/** Ficha do jogo: jogatinas marcadas e clubes deste jogo (o GameClubs do Clubs.tsx usa). */
export function GameJogatinas({ gameId }: { gameId: string }) {
  const [list, setList] = useState<Jogatina[] | null>(null);
  useEffect(() => {
    let alive = true;
    jogatinaApi.list('proximas', { game: gameId, limit: 6 }).then((l) => alive && setList(l)).catch(() => alive && setList([]));
    return () => { alive = false; };
  }, [gameId]);
  if (!list?.length) return null;
  return <div className="jog-cards">{list.map((j) => <JogatinaTile key={j.id} j={j} compact />)}</div>;
}

/* ------------------------------------------------------------------ */
/* A página da jogatina (painel)                                        */
/* ------------------------------------------------------------------ */
export function JogatinaPage({ id }: { id: string }) {
  const code = new URLSearchParams(location.search).get('c');
  const [j, setJ] = useState<JogatinaFull | JogatinaLocked | null | undefined>(undefined);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try { setJ(await jogatinaApi.get(id, code)); } catch (e) { setErr(errOf(e)); setJ(null); }
  }, [id, code]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (j) document.title = `${j.title} · Jogatina · WinnerZ`; }, [j]);
  useEffect(() => {
    if (!j || j.locked || !location.hash.startsWith('#m-')) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150);
  }, [j]);
  if (j === undefined) return <main className="page pad"><p className="faint">Carregando…</p></main>;
  if (!j) return <main className="page pad narrow"><h1 className="t big">Jogatina</h1><p className="muted lead">{err || 'Essa jogatina não existe (ou saiu do ar).'}</p><Link to="/comunidade?c=jogatinas">Ver as jogatinas</Link></main>;
  if (j.locked) return (
    <main className="page pad narrow club-locked">
      <span className="club-chip">Jogatina · {whenLabel(j.startsAt)}</span>
      <h1 className="t big">{j.title}</h1>
      {j.game && <p className="muted">{j.game.title}</p>}
      <div className="soc-empty"><b>{j.access === 'amigos' ? `Esta jogatina é só para os amigos de @${j.owner?.handle ?? 'quem marcou'}.` : 'Esta jogatina é por convite.'}</b>
        <p className="muted">{j.access === 'amigos' ? 'Quando vocês se seguirem, você consegue ver e confirmar.' : 'Peça o link a quem marcou.'}</p>
        {j.access === 'amigos' && j.owner?.handle && <Link className="btn ghost sm" to={`/@${j.owner.handle.toLowerCase()}`}>Ver o perfil de @{j.owner.handle}</Link>}
      </div>
    </main>
  );
  return <JogatinaView j={j} code={code} reload={load} />;
}

function JogatinaView({ j, code, reload }: { j: JogatinaFull; code: string | null; reload: () => Promise<void> }) {
  const isAdmin = useStore((s) => !!s.isAdmin);
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const meId = useStore((s) => (s.mode === 'demo' ? 'demo-me' : s.profile?.id ?? null));
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [handles, setHandles] = useState<string[]>([]);
  const [note, setNote] = useState(takeFlash);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const me = j.me;
  const owner = j.owner?.id === meId;
  const live = jogatinaNow(j, now);
  const started = Date.parse(j.startsAt) <= now;
  const going = j.people.filter((p) => p.rsvp === 'vou');
  const maybe = j.people.filter((p) => p.rsvp === 'talvez');
  const full = !!j.maxPeople && j.going >= j.maxPeople;
  const art = j.game?.backdrop ?? j.game?.cover ?? null;
  const act = async (f: () => Promise<unknown>) => {
    if (signedOut) return navigate('/entrar');
    setErr('');
    if (!(await ensureRules())) return;
    setBusy(true);
    try { await f(); await reload(); void refreshNotifs(); } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  const answer = (r: Rsvp | null) => act(() => jogatinaApi.rsvp(j.id, code, r));
  const invite = j.inviteCode ? `${location.origin}/jogatina/${j.id}?c=${j.inviteCode}` : `${location.origin}/jogatina/${j.id}`;
  const canInvite = !j.ended && !j.canceled && (owner || isAdmin || (!!me && me.rsvp !== 'nao'));
  const sendInvites = async () => {
    setErr(''); setBusy(true);
    try { const r = await jogatinaApi.invite(j.id, handles); setNote(inviteSummary(r)); setHandles([]); if (r.sent.length) setInviting(false); await reload(); }
    catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(invite); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt('Copie o link:', invite); } };
  const tops = j.messages.filter((m) => !m.parentId);
  const questions = tops.filter((m) => m.question);
  const memories = j.ended || started ? tops.filter((m) => Date.parse(m.createdAt) >= Date.parse(j.startsAt)) : [];
  const before = tops.filter((m) => !memories.includes(m));
  const people = useMemo(() => j.people.filter((p) => p.handle && !p.gone && p.id !== meId).map((p) => p.handle!), [j.people, meId]);
  const ctx: ChatCtx = {
    where: `Jogatina ${j.title}`, report: { jogatina: j.id }, game: j.game, canWrite: !!me || isAdmin, people,
    linkFor: (m) => `${location.origin}/jogatina/${j.id}#m-${m}`,
    send: (parent, body, q, images) => jogatinaApi.message(j.id, parent, body, q, images),
    edit: (id, body) => jogatinaApi.editMessage(id, body), del: (id) => jogatinaApi.deleteMessage(id), reload,
  };
  const seats = j.maxPeople ? Math.max(0, Math.min(j.maxPeople, 12) - going.length) : going.length < 4 ? 4 - going.length : 0;
  const kicker = j.canceled ? 'Jogatina · cancelada' : live ? 'Jogatina · agora' : j.ended ? 'Jogatina · aconteceu' : `Jogatina · ${relDay(j.startsAt) ?? whenLabel(j.startsAt).split(',')[0]}`;

  return (
    <main className={`jog${live ? ' is-now' : ''}${j.ended ? ' is-past' : ''}${j.canceled ? ' is-canceled' : ''}`}>
      <div className="page jog__in">
        <Link to={j.club ? `/clube/${j.club.slug}` : '/comunidade?c=jogatinas'} className="back jog__back">← {j.club ? clubLabel(j.club.name) : 'Jogatinas'}</Link>
        {j.hidden && <p className="cm-hero__hidden">Fora do ar por decisão da moderação. Só você ainda consegue abrir.</p>}
        <div className="jog-bento">
          <section className="jog-tile jog-when" aria-label="Quando">
            <span className="kicker kicker--now">{kicker}</span>
            <b className="jog-when__big">{live ? 'AGORA' : hourLabel(j.startsAt).toUpperCase()}</b>
            <span className="jog-when__day"><b>{dayLong(j.startsAt)}{live ? `, ${hourLabel(j.startsAt)}` : ''}</b><small className="muted">{statusLine(j, now)}</small></span>
          </section>
          <section className="jog-tile jog-art">
            {art && <img className="jog-art__img" src={art} alt="" aria-hidden="true" />}
            <div className="jog-art__shade" aria-hidden="true" />
            <div className="jog-art__tx">
              <span className="jog-art__chips">
                <span className="club-chip club-chip--jog">Jogatina</span>
                <span className="club-chip">{JOG_ACCESS.find((a) => a.k === j.access)?.label}</span>
                {j.community && <Link to={`/w/${j.community.slug}`} className="club-chip">w/{j.community.slug}</Link>}
                {j.club && <Link to={`/clube/${j.club.slug}`} className="club-chip">{clubLabel(j.club.name)}</Link>}
              </span>
              <h1 className="t jog-art__t">{j.title}</h1>
              {j.description && <p className="jog-art__d">{j.description}</p>}
              {j.game && <Link to={`/jogos/${j.game.slug}`} className="jog-art__game">{j.game.title}{j.platform ? ` · ${j.platform}` : ''}</Link>}
            </div>
          </section>

          <section className="jog-tile jog-seats" aria-labelledby="jog-seats-t">
            <span className="kicker" id="jog-seats-t">{j.ended ? `Quem estava lá · ${j.wasThere || going.length}` : `Quem vai · ${j.going}${j.maxPeople ? ` de ${j.maxPeople}` : ''}`}</span>
            <ul className="jog-seats__grid">
              {(j.ended && j.wasThere ? j.people.filter((p) => p.wasThere) : going).map((p) => <Seat key={p.id} p={p} owner={p.id === j.owner?.id} />)}
              {!j.ended && Array.from({ length: seats }, (_, i) => <li key={`v${i}`} className="jog-seat is-empty"><small>vaga</small></li>)}
            </ul>
            {maybe.length > 0 && !j.ended && <p className="jog-seats__maybe faint">Talvez: {maybe.map((p, i) => <span key={p.id}>{i > 0 && ', '}<PersonLink p={p} avatar={false} /></span>)}</p>}
            {j.going > going.length && <small className="faint">e mais {j.going - going.length}</small>}
            {!j.ended && !j.canceled && j.invites.length > 0 && (
              <p className="jog-seats__maybe faint">Convidados, sem resposta ainda: {j.invites.map((p, i) => <span key={p.id}>{i > 0 && ', '}<PersonLink p={p} avatar={false} /></span>)}</p>
            )}
          </section>

          <section className="jog-tile jog-answer" aria-labelledby="jog-answer-t">
            <span className="kicker" id="jog-answer-t">{j.ended ? 'Depois da noite' : 'Sua resposta'}</span>
            {j.canceled ? (
              <>
                <p className="muted">{owner ? 'Você cancelou esta jogatina. Quem confirmou vê o aviso aqui.' : 'Quem marcou cancelou esta jogatina.'}</p>
                {(owner || isAdmin) && <button className="btn ghost" disabled={busy} onClick={() => void act(() => jogatinaApi.cancel(j.id, false))}>Desfazer o cancelamento</button>}
              </>
            ) : j.ended ? (
              <>
                {me ? (
                  <button className={`btn ${me.wasThere ? 'ghost' : 'primary'} jog-answer__big`} aria-pressed={me.wasThere} disabled={busy} onClick={() => void act(() => jogatinaApi.wasThere(j.id, !me.wasThere))}>
                    {me.wasThere ? <><Icon name="check" size={16} /> Eu estava lá</> : 'Eu estava lá'}
                  </button>
                ) : <p className="muted">Foi uma noite de {j.game?.title ?? 'jogo'}. Quem estava lá guarda aqui as memórias.</p>}
                <Link className="btn ghost" to={`/comunidade/clubes/criar?jogo=${encodeURIComponent(j.game?.slug ?? '')}&formato=recorrente&nome=${encodeURIComponent(j.title)}`}>Repetir: virar clube</Link>
                <Link className="btn ghost" to={`/jogatina/criar?jogo=${encodeURIComponent(j.game?.slug ?? '')}${j.club ? `&clube=${j.club.slug}` : ''}`}>Marcar outra</Link>
              </>
            ) : (
              <>
                {!me && j.invitedBy && <p className="jog-answer__invited"><PersonAvatar p={j.invitedBy} size={22} /><span><b>@{j.invitedBy.handle ?? 'alguém'}</b> convidou você.</span></p>}
                <div className="jog-answer__opts" role="group" aria-label="Você vai?">
                  <button className={`btn ${me?.rsvp === 'vou' ? 'primary is-on' : !me ? 'primary' : 'ghost'} jog-answer__big`} aria-pressed={me?.rsvp === 'vou'} disabled={busy || (full && me?.rsvp !== 'vou')} onClick={() => void answer('vou')}>
                    {me?.rsvp === 'vou' ? <><Icon name="check" size={16} /> Você vai</> : full ? 'Vagas esgotadas' : 'Vou participar'}
                  </button>
                  <button className={`btn ghost${me?.rsvp === 'talvez' ? ' is-on' : ''}`} aria-pressed={me?.rsvp === 'talvez'} disabled={busy} onClick={() => void answer('talvez')}>Talvez</button>
                  {me && !owner && <button className={`btn ghost${me.rsvp === 'nao' ? ' is-on' : ''}`} aria-pressed={me.rsvp === 'nao'} disabled={busy} onClick={() => void answer('nao')}>Não vou</button>}
                </div>
                <button className="btn ghost" onClick={() => downloadIcs(j)}><Icon name="calendario" size={15} /> Agenda</button>
                {canInvite
                  ? <button className="btn ghost" aria-expanded={inviting} onClick={() => setInviting((x) => !x)}>Convidar</button>
                  : <button className="btn ghost" onClick={() => void copy()}>{copied ? 'Link copiado' : 'Copiar o link'}</button>}
                {live && me && j.game && <PlayButton gameId={j.game.id} className="btn" idle="Abrir a sessão" />}
                {j.liveUrl && <a className="btn ghost" href={j.liveUrl} target="_blank" rel="noopener noreferrer nofollow">{/twitch|youtube|kick/.test(j.liveUrl) ? 'Abrir a live' : /discord/.test(j.liveUrl) ? 'Abrir o Discord' : 'Abrir o link'} ↗</a>}
              </>
            )}
            {err && <p className="awards__error" role="alert">{err}</p>}
          </section>

          <section className="jog-tile jog-ask" aria-labelledby="jog-ask-t">
            <span className="kicker" id="jog-ask-t">{j.ended ? 'Memórias' : 'Perguntas'}</span>
            {(j.ended ? memories : questions.length ? questions : before).slice(-3).map((m) => (
              <a key={m.id} href={`#m-${m.id}`} className="jog-ask__q"><PersonAvatar p={m.author} size={22} /><span>{m.deleted ? <i className="faint">Apagada</i> : plainText(m.body).slice(0, 120)}</span></a>
            ))}
            {!(j.ended ? memories : tops).length && <p className="faint">{j.ended ? 'Ninguém guardou memória ainda.' : 'Nenhuma pergunta ainda.'}</p>}
            <a href="#conversa" className="cm-link jog-ask__go">{j.ended ? (me ? 'Guardar uma memória' : 'Ver a conversa') : me ? 'Perguntar' : 'Ver a conversa'} ↓</a>
          </section>

          {(inviting || note) && (
            <section className="jog-tile jog-invite" aria-labelledby="jog-invite-t">
              <span className="kicker" id="jog-invite-t">Convidar</span>
              {note && <p className="jog-invite__note" role="status"><Icon name="check" size={14} /> {note}</p>}
              {inviting && (
                <>
                  <p className="muted">Digite o @ de quem você quer chamar. A pessoa recebe o aviso no site e passa a ver a jogatina{j.access !== 'aberto' ? ', mesmo sendo ' + (j.access === 'amigos' ? 'só para amigos' : 'por convite') : ''}.</p>
                  <InviteBox value={handles} onChange={setHandles} exclude={[...j.people, ...j.invites].map((p) => (p.handle ?? '').toLowerCase())} />
                  <div className="jog-invite__acts">
                    <button className="btn primary sm" disabled={busy || !handles.length} onClick={() => void sendInvites()}>{handles.length > 1 ? `Convidar ${handles.length} pessoas` : 'Enviar convite'}</button>
                    <button className="btn ghost sm" onClick={() => void copy()}>{copied ? 'Link copiado' : 'Copiar o link'}</button>
                    <button className="btn quiet sm" onClick={() => { setInviting(false); setHandles([]); }}>Fechar</button>
                  </div>
                </>
              )}
              {!inviting && note && <button className="cm-link" onClick={() => setNote('')}>Ok</button>}
            </section>
          )}

          <section className="jog-tile jog-after">
            <span className="kicker">{j.ended ? 'Como foi' : 'Depois da noite'}</span>
            <p className="muted">{j.ended
              ? `${j.wasThere || going.length} ${(j.wasThere || going.length) === 1 ? 'pessoa marcou' : 'pessoas marcaram'} “eu estava lá”. Fotos, prints e o momento da noite ficam aqui embaixo.`
              : 'Quem foi guarda a memória (fotos, o momento, “eu estava lá”). Se quiserem repetir, a jogatina vira um clube com ritmo Encontro recorrente.'}</p>
            <small className="faint">{[j.platform, j.owner?.handle ? `organiza @${j.owner.handle}` : null, durLabel(j.durationMin)].filter(Boolean).join(' · ')}</small>
          </section>
        </div>

        <div className="jog__below">
          <section className="cm-thread club-thread" id="conversa" aria-labelledby="jog-conv-t">
            <h2 id="jog-conv-t" className="club__h">{j.ended ? 'Memórias da noite' : 'Perguntas e conversa'}</h2>
            {!me && !isAdmin && <p className="cm-thread__login">{j.ended ? 'Só quem estava na lista escreve aqui.' : 'Responda Vou ou Talvez para perguntar e conversar.'}</p>}
            <GroupChat ctx={ctx} messages={j.messages}
              composer={{ placeholder: j.ended || started ? 'Conte como foi: o momento da noite, uma foto, um print' : 'Pergunte ou combine algo antes da noite', questionToggle: !started }}
              sections={j.ended || started
                ? [{ key: 'mem', tops: memories, className: 'club-mural' }, { key: 'antes', title: 'Antes da noite', tops: before }]
                : [{ key: 'q', title: questions.length && before.length > questions.length ? 'Perguntas' : undefined, tops: questions }, { key: 'c', title: questions.length && before.length > questions.length ? 'Conversa' : undefined, tops: before.filter((m) => !m.question) }]}
              empty={j.ended ? 'Ninguém guardou memória ainda.' : 'Nada por aqui ainda.'} />
          </section>
          <aside className="jog__side">
            <section className="cm-side">
              <span className="kicker">Detalhes</span>
              <dl className="jog-facts">
                <div><dt>Quando</dt><dd>{whenLabel(j.startsAt)}</dd></div>
                <div><dt>Duração</dt><dd>{durLabel(j.durationMin)}</dd></div>
                {j.platform && <div><dt>Onde</dt><dd>{j.platform}</dd></div>}
                <div><dt>Vagas</dt><dd>{j.maxPeople ? `${j.maxPeople} lugares` : 'Sem limite'}</dd></div>
                {j.owner && <div><dt>Marcou</dt><dd><PersonLink p={j.owner} /></dd></div>}
                <div><dt>Entrada</dt><dd>{JOG_ACCESS.find((a) => a.k === j.access)?.hint}</dd></div>
              </dl>
              {(owner || isAdmin) && (
                <div className="jog__owner">
                  <Link className="btn ghost sm" to={`/jogatina/${j.id}/editar`}>Editar</Link>
                  {!j.canceled && !j.ended && (confirmCancel
                    ? <><button className="btn ghost sm cm-link--danger" disabled={busy} onClick={() => void act(() => jogatinaApi.cancel(j.id, true))}>Cancelar de vez</button><button className="btn quiet sm" onClick={() => setConfirmCancel(false)}>Voltar</button></>
                    : <button className="btn quiet sm" onClick={() => setConfirmCancel(true)}>Cancelar a jogatina</button>)}
                </div>
              )}
            </section>
            <section className="cm-side cm-side--quiet">
              <p className="faint">Valem as <Link to="/regras">regras do WinnerZ</Link>. Só quem respondeu Vou ou Talvez escreve na conversa.</p>
              {me && !owner && !j.ended && <button className="cm-link" onClick={() => void answer(null)} disabled={busy}>Sair da lista</button>}
              {!owner && j.owner?.handle && <ReportButton kind="jogatina" handle={j.owner.handle} refId={j.id} snapshot={{ title: j.title, description: j.description, game: j.game?.title, startsAt: j.startsAt }} what={`A jogatina “${j.title}”: o nome e a descrição.`} label="Denunciar a jogatina" className="cm-side__report" />}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Seat({ p, owner }: { p: JogPerson; owner: boolean }) {
  return (
    <li className="jog-seat" style={{ background: seatColor(p.handle) }}>
      <Link to={p.handle && !p.gone ? `/@${p.handle.toLowerCase()}` : '#'} title={owner ? 'Marcou a jogatina' : undefined}>
        <PersonAvatar p={p} size={34} />
        <small>@{p.handle ?? 'conta apagada'}</small>
        {owner && <span className="jog-seat__star" aria-label="Marcou">★</span>}
      </Link>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Marcar e editar                                                      */
/* ------------------------------------------------------------------ */
/** 0 = sem hora para acabar. */
const DURATIONS = [60, 90, 120, 150, 180, 240, 360, 480, 0];
function durLabel(m: number | null): string {
  if (!m) return 'Sem hora para acabar';
  return m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60} h`;
}

function JogatinaForm({ initial, editing, busy, err, onSubmit }: { initial: JogatinaDraft & { game?: GameMini | null }; editing?: Jogatina; busy: boolean; err: string; onSubmit: (d: JogatinaDraft, invites: string[]) => void }) {
  const [invites, setInvites] = useState<string[]>([]);
  const [game, setGame] = useState<GameMini | null>(initial.game ?? null);
  const [title, setTitle] = useState(initial.title);
  const [titleTouched, setTitleTouched] = useState(!!initial.title);
  const [description, setDescription] = useState(initial.description);
  const [startsAt, setStartsAt] = useState(localInput(initial.startsAt));
  const [duration, setDuration] = useState(initial.durationMin ?? 0);
  const [platform, setPlatform] = useState(initial.platform ?? '');
  const [max, setMax] = useState(initial.maxPeople ? String(initial.maxPeople) : '');
  const [access, setAccess] = useState(initial.access);
  const [live, setLive] = useState(initial.liveUrl ?? '');
  const [clubId, setClubId] = useState(initial.clubId ?? '');
  const [communityId, setCommunityId] = useState(initial.communityId ?? '');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [comms, setComms] = useState<Community[]>([]);
  useEffect(() => { clubApi.list('meus').then(setClubs).catch(() => {}); communityApi.mine().then(setComms).catch(() => {}); }, []);
  useEffect(() => { if (!game && initial.game) setGame(initial.game); }, [initial.game]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = titleTouched ? title : title || (game ? `Noite de ${game.title}` : '');
  const liveBad = live.trim() !== '' && !/^https:\/\/\S{4,}$/.test(live.trim());
  const maxBad = max !== '' && (Number(max) < 2 || Number(max) > 64);
  const past = !editing && !!startsAt && new Date(startsAt).getTime() < Date.now() - 3_600_000;
  const ready = t.trim().length >= 3 && !!game && !!startsAt && !liveBad && !maxBad && !past;
  const club = clubs.find((c) => c.id === clubId);
  return (
    <form className="cm-form club-form" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({ title: t.trim(), description, gameId: game?.id ?? null, startsAt: startsAt ? new Date(startsAt).toISOString() : null, durationMin: duration || null, platform: platform.trim() || null,
        maxPeople: max ? Number(max) : null, access, liveUrl: live.trim() || null, communityId: communityId || null, clubId: clubId || null }, invites);
    }}>
      <div className="cm-form__f"><span className="kicker">Jogo</span>
        {editing ? <p className="muted">{editing.game?.title} (não muda)</p> : <GameSearchPick value={game} onChange={setGame} label="Jogo da jogatina" />}
      </div>
      <label className="cm-form__f"><span className="kicker">Nome</span>
        <input className="field" value={t} maxLength={80} onChange={(e) => { setTitleTouched(true); setTitle(e.target.value); }} placeholder="Ex.: Noite de Astro Bot" />
      </label>
      <div className="club-form__row">
        <label className="cm-form__f"><span className="kicker">Dia e hora</span><input className="field" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} aria-invalid={past} />
          {past && <small className="awards__error">Essa data já passou.</small>}
        </label>
        <label className="cm-form__f"><span className="kicker">Duração</span>
          <select className="field" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>{DURATIONS.map((m) => <option key={m} value={m}>{durLabel(m)}</option>)}</select>
        </label>
      </div>
      <label className="cm-form__f"><span className="kicker">Combinado</span>
        <textarea className="field" rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que vai rolar, como entrar, se precisa ter zerado." />
      </label>
      <div className="club-form__row">
        <label className="cm-form__f"><span className="kicker">Onde (opcional)</span><input className="field" value={platform} maxLength={40} onChange={(e) => setPlatform(e.target.value)} placeholder="PS5, PC, Switch…" /></label>
        <label className="cm-form__f"><span className="kicker">Vagas (opcional)</span><input className="field" type="number" min={2} max={64} value={max} onChange={(e) => setMax(e.target.value)} placeholder="Sem limite" aria-invalid={maxBad} />
          {maxBad && <small className="awards__error">De 2 a 64.</small>}
        </label>
      </div>
      <label className="cm-form__f"><span className="kicker">Link da live ou do Discord (opcional)</span>
        <input className="field" value={live} onChange={(e) => setLive(e.target.value)} placeholder="https://twitch.tv/… ou https://discord.gg/…" inputMode="url" aria-invalid={liveBad} />
        {liveBad && <small className="awards__error">Cole o endereço completo, começando com https://</small>}
      </label>
      <fieldset className="cm-form__f cm-spoil"><legend className="kicker">Quem pode vir</legend>
        {JOG_ACCESS.map((a) => <label key={a.k} className={`cm-spoil__o${access === a.k ? ' is-on' : ''}`}><input type="radio" name="acc" checked={access === a.k} onChange={() => setAccess(a.k)} /><b>{a.label}</b><small>{a.hint}{a.k !== 'aberto' && club ? ' Quem está no clube também vê.' : ''}</small></label>)}
      </fieldset>
      {!editing && (
        <div className="cm-form__f"><span className="kicker">Convidar pessoas (opcional)</span>
          <small className="faint">Quem você chamar pelo @ recebe o aviso no site e vê a jogatina, qualquer que seja a entrada escolhida.</small>
          <InviteBox value={invites} onChange={setInvites} />
        </div>
      )}
      {!editing && (clubs.length > 0 || comms.length > 0) && (
        <div className="club-form__row">
          {clubs.length > 0 && (
            <label className="cm-form__f"><span className="kicker">Na agenda de um clube (opcional)</span>
              <select className="field" value={clubId} onChange={(e) => setClubId(e.target.value)}><option value="">Nenhum: jogatina solta</option>{clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </label>
          )}
          {comms.length > 0 && (
            <label className="cm-form__f"><span className="kicker">De uma comunidade (opcional)</span>
              <select className="field" value={communityId} onChange={(e) => setCommunityId(e.target.value)}><option value="">Nenhuma</option>{comms.map((c) => <option key={c.id} value={c.id}>w/{c.slug}</option>)}</select>
            </label>
          )}
        </div>
      )}
      {err && <p className="awards__error" role="alert">{err}</p>}
      <div className="cm-form__acts"><button className="btn primary" disabled={busy || !ready}>{busy ? 'Gravando…' : editing ? 'Salvar' : 'Marcar a jogatina'}</button></div>
    </form>
  );
}

/** O jogo pedido no endereço (?jogo=slug): da coleção, se estiver lá; senão, da busca. */
function useGameFromQuery(slug: string | null): GameMini | null | undefined {
  const games = useStore((s) => s.games);
  const local = slug ? Object.values(games).find((g) => g.slug === slug) : undefined;
  const [found, setFound] = useState<GameMini | null | undefined>(local ? { id: local.id, slug: local.slug, title: local.title, cover: local.cover, backdrop: local.backdrop ?? null } : slug ? undefined : null);
  useEffect(() => {
    if (!slug || local) return;
    let alive = true;
    gameBySlug(slug).then((g) => alive && setFound(g ? { id: g.id, slug: g.slug, title: g.title, cover: g.cover, backdrop: g.backdrop ?? null } : null)).catch(() => alive && setFound(null));
    return () => { alive = false; };
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  return found;
}

export function JogatinaNewPage() {
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const q = new URLSearchParams(location.search);
  const game = useGameFromQuery(q.get('jogo'));
  const [clubId, setClubId] = useState<string | null | undefined>(q.get('clube') ? undefined : null);
  const [commId, setCommId] = useState<string | null | undefined>(q.get('w') ? undefined : null);
  useEffect(() => { document.title = 'Marcar jogatina · WinnerZ'; }, []);
  useEffect(() => {
    const k = q.get('clube'); if (!k) return;
    clubApi.get(k).then((c) => setClubId(c && 'id' in c ? c.id : null)).catch(() => setClubId(null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const w = q.get('w'); if (!w) return;
    communityApi.get(w).then((c) => setCommId(c?.id ?? null)).catch(() => setCommId(null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (signedOut) return <main className="page pad narrow"><h1 className="t big">Marcar jogatina</h1><p className="muted lead">Entre na sua conta para marcar uma jogatina.</p><Link className="btn primary" to="/entrar">Entrar</Link></main>;
  if (game === undefined || clubId === undefined || commId === undefined) return <main className="page pad"><p className="faint">Carregando…</p></main>;
  const submit = async (d: JogatinaDraft, invites: string[]) => {
    setErr('');
    if (!(await ensureRules())) return;
    setBusy(true);
    let j: Jogatina;
    try { j = await jogatinaApi.create(d); } catch (e) { setErr(errOf(e)); setBusy(false); return; }
    if (j.access === 'aberto') discordApi.publish('jogatina', j.id);
    // A jogatina já existe: se os convites falharem, o recado aparece na página dela.
    if (invites.length) {
      try { setFlash(inviteSummary(await jogatinaApi.invite(j.id, invites))); } catch (e) { setFlash(`A jogatina foi marcada, mas os convites não foram: ${errOf(e)} Use “Convidar” para tentar de novo.`); }
    }
    navigate(`/jogatina/${j.id}`);
  };
  return (
    <main className="page pad narrow cm-new">
      <header className="studio__head">
        <Link to="/comunidade?c=jogatinas" className="back">← Jogatinas</Link>
        <h1 className="t big">Marcar jogatina</h1>
        <p className="muted lead">Um jogo, um dia e uma hora. Quem vai confirma; antes, as perguntas; depois, as memórias de quem estava lá.</p>
      </header>
      <JogatinaForm initial={{ title: '', description: '', gameId: game?.id ?? null, game, startsAt: null, durationMin: 120, platform: null, maxPeople: null, access: 'aberto', liveUrl: null, communityId: commId, clubId }}
        busy={busy} err={err} onSubmit={(d, inv) => void submit(d, inv)} />
    </main>
  );
}

export function JogatinaEditPage({ id }: { id: string }) {
  const isAdmin = useStore((s) => !!s.isAdmin);
  const meId = useStore((s) => (s.mode === 'demo' ? 'demo-me' : s.profile?.id ?? null));
  const [j, setJ] = useState<JogatinaFull | JogatinaLocked | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { jogatinaApi.get(id).then(setJ).catch(() => setJ(null)); }, [id]);
  if (j === undefined) return <main className="page pad"><p className="faint">Carregando…</p></main>;
  if (!j || j.locked || (j.owner?.id !== meId && !isAdmin)) return <main className="page pad narrow"><h1 className="t big">Editar</h1><p className="muted lead">Só quem marcou a jogatina pode editar.</p><Link to={`/jogatina/${id}`}>Voltar</Link></main>;
  const submit = async (d: JogatinaDraft) => {
    setBusy(true); setErr('');
    try { await jogatinaApi.update(j.id, d); navigate(`/jogatina/${j.id}`); } catch (e) { setErr(errOf(e)); setBusy(false); }
  };
  return (
    <main className="page pad narrow cm-new">
      <header className="studio__head"><Link to={`/jogatina/${j.id}`} className="back">← {j.title}</Link><h1 className="t big">Editar jogatina</h1></header>
      <JogatinaForm initial={{ title: j.title, description: j.description, gameId: j.game?.id ?? null, game: j.game, startsAt: j.startsAt, durationMin: j.durationMin, platform: j.platform ?? null, maxPeople: j.maxPeople ?? null, access: j.access, liveUrl: j.liveUrl ?? null, communityId: null, clubId: null }}
        editing={j} busy={busy} err={err} onSubmit={(d) => void submit(d)} />
    </main>
  );
}
