/**
 * Pontes (J4) no site:
 *  - BridgeSync: ao abrir o site (e a cada 15 minutos, ou ao voltar para a aba) pede a busca, registra sozinho o que
 *    cabe numa Jornada em andamento e mostra o aviso "jogando agora".
 *  - BridgeInbox: "Vindo das pontes", o que chegou e ainda espera a sua escolha (Registrar ou Ignorar).
 *  - BridgeSettings: ligar e desligar a Steam e o RetroAchievements nas Preferências.
 */
import { useEffect, useRef, useState } from 'react';
import { actions, getState, useStore, openSession, journeyForGame, currentHistory } from '../data/store';
import { bridgeApi, achievementApi, useBridges, BY, PROVIDER_NAME, PLAYNITE_DOWNLOAD, type BridgeItem, type Provider, type NowPlaying } from '../data/bridgeApi';
import { outlineApi } from '../data/outlineApi';
import { twitchApi, type MyTwitch } from '../data/twitchApi';
import { pickMove, isOpenWorld, type PartMove } from '../lib/outline';
import { refreshGame } from './AddGameDialog';
import { navigate } from '../lib/router';
import { durLabel, hourMin, dayMonth } from '../lib/format';
import { CoverArt } from './CoverArt';
import { Icon } from './Icon';
import type { Game } from '../data/types';
import { setupNote } from '../lib/setupNote';

const EVERY = 15 * 60_000;

/** O jogo do WinnerZ para uma sessão vinda da ponte (pela confirmação, pela ficha já conhecida ou buscando no IGDB). */
async function gameFor(it: { gameId?: string | null; igdbId?: number | null }): Promise<Game | null> {
  const s = getState();
  if (it.gameId && s.games[it.gameId]) return s.games[it.gameId];
  if (it.igdbId) {
    const known = Object.values(s.games).find((g) => g.igdbId === it.igdbId);
    if (known) return known;
    const g = await refreshGame(it.igdbId);
    if (g) { actions.mergeGames([g]); return g; }
  }
  return null;
}

/** Registra o que entra sozinho: jogo conhecido (Steam, ou RetroAchievements já confirmado) com História em andamento. */
async function autoRegister() {
  const b = bridgeApi.peek();
  if (!b) return;
  for (const it of b.items) {
    const acc = b.accounts.find((a) => a.provider === it.provider);
    const s = getState();
    // Continuação de uma sessão já registrada: estende a mesma.
    if (it.sessionId && s.sessions.some((x) => x.id === it.sessionId)) {
      actions.extendInferredSession(it.sessionId, { endedAt: it.endedAt, minutes: it.minutes, detail: it.detail, whereStopped: it.presence });
      await bridgeApi.mark(it.id, 'registrada', it.sessionId).catch(() => null);
      continue;
    }
    if (!acc?.auto) continue;
    const mapped = b.maps[`${it.provider}:${it.extGame}`];
    const gameId = mapped ?? (it.provider === 'steam' ? it.gameId : null);
    if (!gameId || !s.games[gameId]) continue;
    const j = journeyForGame(s, gameId);
    const h = j ? currentHistory(s, j.id) : null;
    if (!h || h.state !== 'ativa') continue;
    const sid = actions.addInferredSession(gameId, { startedAt: it.startedAt, endedAt: it.endedAt, minutes: it.minutes, source: it.provider, detail: it.detail, whereStopped: it.presence }, { onlyOpen: true });
    if (sid) await bridgeApi.mark(it.id, 'registrada', sid, gameId).catch(() => null);
  }
}

/**
 * C3: os avanços que vieram das conquistas. Vão para a História em andamento (ou em pausa) do jogo; o que não serve
 * (sem História, jogo zerado, conquista atrás de onde a pessoa está) é marcado como visto e não volta.
 */
export async function applyPartMoves() {
  const moves = await achievementApi.moves().catch(() => [] as PartMove[]);
  if (!moves.length) return;
  const byGame = new Map<string, PartMove[]>();
  for (const m of moves) byGame.set(m.gameId, [...(byGame.get(m.gameId) ?? []), m]);
  const seen: string[] = [];
  for (const [gameId, list] of byGame) {
    const s = getState();
    const j = journeyForGame(s, gameId);
    const h = j ? currentHistory(s, j.id) : null;
    if (!h || (h.state !== 'ativa' && h.state !== 'pausada')) { seen.push(...list.map((m) => m.id)); continue; }
    const o = await outlineApi.get(gameId).catch(() => null);
    if (!o) continue; // a lista não carregou agora: tenta na próxima
    const parts = [...o.parts].sort((a, b) => a.pct - b.pct);
    const m = pickMove(parts, isOpenWorld(o), h, list);
    const p = m ? parts.find((x) => x.id === m.partId) : undefined;
    if (m && p) {
      if (isOpenWorld(o)) actions.markOpenPart(h.id, p.id);
      else actions.setHistoryPart(h.id, { id: p.id, pct: p.pct }, parts, { at: m.at, src: m.provider });
    }
    seen.push(...list.map((x) => x.id));
  }
  await achievementApi.movesDone(seen).catch(() => null);
}

export function BridgeSync() {
  const mode = useStore((s) => s.mode);
  const logged = useStore((s) => !!s.profile);
  const ready = useStore((s) => s.ready);
  const last = useRef(0);
  useEffect(() => {
    if (!ready || (mode === 'supabase' && !logged)) return;
    let live = true;
    const run = async () => {
      if (Date.now() - last.current < EVERY - 1000) return;
      last.current = Date.now();
      await bridgeApi.sync();
      if (!live) return;
      const b = await bridgeApi.status().catch(() => null);
      if (b && live) await autoRegister();
      if (live) await applyPartMoves();
    };
    const t0 = setTimeout(run, 2500);
    const t = setInterval(run, EVERY);
    const vis = () => { if (document.visibilityState === 'visible') run(); };
    document.addEventListener('visibilitychange', vis);
    return () => { live = false; clearTimeout(t0); clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [ready, mode, logged]);
  return <NowPlayingBanner />;
}

const NP_KEY = 'wz.np.dismissed';
function NowPlayingBanner() {
  const b = useBridges();
  const open = useStore((s) => !!openSession(s));
  const [dismissed, setDismissed] = useState<string | null>(() => { try { return sessionStorage.getItem(NP_KEY); } catch { return null; } });
  const [busy, setBusy] = useState(false);
  const np: NowPlaying | undefined = b?.accounts.map((a) => a.nowPlaying).find((x): x is NowPlaying => !!x);
  if (!np || open) return null;
  const key = `${np.provider}:${np.extGame}:${new Date().toDateString()}`;
  if (dismissed === key) return null;
  const mapped = b?.maps[`${np.provider}:${np.extGame}`];
  const canOpen = !!(mapped || np.gameId || np.igdbId);
  const hide = () => { try { sessionStorage.setItem(NP_KEY, key); } catch { /* nada */ } setDismissed(key); };
  const start = async () => {
    setBusy(true);
    const g = await gameFor({ gameId: mapped ?? np.gameId, igdbId: np.igdbId });
    setBusy(false);
    if (!g) { hide(); return; }
    actions.play(g.id); hide(); navigate('/sessao');
  };
  return (
    <aside className="forgotten nowplaying" role="region" aria-label="Jogando agora">
      <div className="page forgotten__row">
        <p><strong>{np.provider === 'steam' ? 'A Steam' : np.provider === 'playnite' ? 'O Playnite' : 'O RetroAchievements'} diz que você está jogando {np.title} agora.</strong>{np.detail ? ` ${np.detail}.` : ''} {canOpen ? 'Quer abrir a sessão aqui?' : ''}</p>
        <div className="forgotten__actions">
          {canOpen && <button className="btn sm primary" disabled={busy} onClick={start}><Icon name="play" size={13} />{busy ? 'Abrindo…' : 'Abrir a sessão'}</button>}
          <button className="btn sm quiet" onClick={hide}>Agora não</button>
        </div>
      </div>
    </aside>
  );
}

/** "Vindo das pontes": o que chegou da Steam e do RetroAchievements e espera a sua escolha. */
export function BridgeInbox() {
  const b = useBridges();
  const s = useStore((x) => x);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const items = (b?.items ?? []).filter((it) => !(it.sessionId && s.sessions.some((x) => x.id === it.sessionId)));
  if (!items.length) return null;
  const register = async (it: BridgeItem, gameId?: string | null) => {
    setBusy(it.id); setErr('');
    try {
      const g = await gameFor({ gameId: gameId ?? b?.maps[`${it.provider}:${it.extGame}`] ?? it.gameId, igdbId: it.igdbId });
      if (!g) throw new Error('Não achei este jogo no catálogo. Ignore e registre pela página do jogo.');
      const sid = actions.addInferredSession(g.id, { startedAt: it.startedAt, endedAt: it.endedAt, minutes: it.minutes, source: it.provider, detail: it.detail, whereStopped: it.presence });
      await bridgeApi.mark(it.id, 'registrada', sid, g.id);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu para registrar.'); }
    setBusy(null);
  };
  return (
    <section className="card bridge-inbox" aria-labelledby="bridge-h">
      <div className="bridge-inbox__head">
        <h2 id="bridge-h" className="kicker">Vindo das pontes</h2>
        <p className="muted">Sessões que a Steam e o RetroAchievements viram. Registre na Jornada ou ignore.</p>
      </div>
      <ul className="bridge-list">
        {items.slice(0, 8).map((it) => {
          const mapped = b?.maps[`${it.provider}:${it.extGame}`];
          const game = s.games[mapped ?? it.gameId ?? ''] ?? Object.values(s.games).find((g) => it.igdbId && g.igdbId === it.igdbId);
          const guess = it.provider !== 'steam' && !mapped && !it.confirmed;
          return (
            <li key={it.id} className="bridge-item">
              <span className="bridge-item__cover">{game ? <CoverArt game={game} /> : <Icon name="jogos" size={20} />}</span>
              <div className="bridge-item__body">
                <span className="kicker">{BY[it.provider]} · {dayMonth(it.endedAt)}, {hourMin(it.startedAt)}–{hourMin(it.endedAt)} · {durLabel(it.minutes)}</span>
                <b>{it.title}{it.console ? <span className="faint"> · {it.console}</span> : null}</b>
                {it.detail && <span className="bridge-item__detail">{it.detail}</span>}
                {it.presence && <span className="bridge-item__detail">Status: {it.presence}</span>}
                {guess && (game ? <span className="bridge-item__ask">É este jogo? <b>{game.title}</b>{game.year ? ` (${game.year})` : ''}</span> : it.igdbId ? <span className="bridge-item__ask">Vamos procurar a ficha no catálogo ao registrar.</span> : <span className="bridge-item__ask">Não achei a ficha deste jogo.</span>)}
              </div>
              <div className="bridge-item__actions">
                <button className="btn sm primary" disabled={busy === it.id || (!game && !it.igdbId)} onClick={() => register(it, game?.id)}>{busy === it.id ? 'Registrando…' : guess ? 'É este, registrar' : 'Registrar'}</button>
                <button className="btn sm quiet" disabled={busy === it.id} onClick={() => bridgeApi.mark(it.id, 'ignorada').catch((e) => setErr(e.message))}>Ignorar</button>
              </div>
            </li>
          );
        })}
      </ul>
      {err && <p className="form-error" role="alert">{err}</p>}
    </section>
  );
}

/** Preferências → Pontes. */
export function BridgeSettings() {
  const b = useBridges();
  const mode = useStore((s) => s.mode);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { bridgeApi.status().finally(() => setLoaded(true)); }, []);
  if (!loaded) return null;
  if (!b && mode === 'supabase') return (
    <section aria-labelledby="pontes" className="prefs__section">
      <h2 id="pontes" className="t">Pontes</h2>
      <p className="muted prefs__p">{setupNote('Falta rodar a migração 0039 no Supabase para ligar a Steam e o RetroAchievements.')}</p>
    </section>
  );
  return (
    <section aria-labelledby="pontes" className="prefs__section">
      <h2 id="pontes" className="t">Pontes</h2>
      <p className="muted prefs__p">Ligue suas contas e o WinnerZ registra as sessões sozinho, pelo tempo jogado (Steam) ou pelas conquistas (RetroAchievements). Ninguém mais vê essas contas. O que você jogou antes de ligar não entra.</p>
      <BridgeRow provider="steam" placeholder="Link do seu perfil (steamcommunity.com/id/…)" hint="O perfil e os “Detalhes do jogo” precisam estar públicos nas configurações de privacidade da Steam." />
      <BridgeRow provider="ra" placeholder="Seu usuário no RetroAchievements" hint="Conquistas desbloqueadas viram sessões; o status do jogo vira a sugestão de onde você parou." />
      <PlayniteRow />
      <TwitchRow />
    </section>
  );
}

function BridgeRow({ provider, placeholder, hint }: { provider: Provider; placeholder: string; hint: string }) {
  const b = useBridges();
  const acc = b?.accounts.find((a) => a.provider === provider);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const run = async (f: () => Promise<unknown>, ok?: string) => { setBusy(true); setMsg(''); try { await f(); if (ok) setMsg(ok); } catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu.'); } setBusy(false); };
  return (
    <div className={`bridge-row${acc ? ' is-on' : ''}`}>
      <div className="bridge-row__head">
        <strong>{PROVIDER_NAME[provider]}</strong>
        {acc ? <span className="chip chip--static">Ligada{acc.display ? ` como ${acc.display}` : ''}</span> : <span className="faint">Desligada</span>}
      </div>
      {acc ? (
        <>
          <p className="muted bridge-row__p">{acc.lastSyncAt ? `Última busca: ${dayMonth(acc.lastSyncAt)}, ${hourMin(acc.lastSyncAt)}.` : 'Ainda não buscou.'}{acc.error ? '' : ' Busca quando você abre o site e uma vez por dia.'}</p>
          {acc.error && <p className="form-error" role="alert">{acc.error}</p>}
          <label className="motion motion--switch" data-on={acc.auto}>
            <input type="checkbox" role="switch" className="switch" checked={acc.auto} onChange={(e) => run(() => bridgeApi.setAuto(provider, e.target.checked))} />
            <span><strong>Registrar sozinho nas Jornadas em andamento</strong><span className="muted">Desligado, tudo espera em “Vindo das pontes”, na Jornada, para você confirmar.</span></span>
          </label>
          <div className="bridge-row__actions">
            <button className="btn ghost sm" disabled={busy} onClick={() => run(async () => { const n = await bridgeApi.sync(true); await bridgeApi.status(); await autoRegister(); return n; }, 'Busca feita.')}>Buscar agora</button>
            <button className="btn quiet sm danger" disabled={busy} onClick={() => run(() => bridgeApi.unlink(provider), 'Desligada.')}>Desligar</button>
          </div>
        </>
      ) : (
        <form className="bridge-row__form" onSubmit={(e) => { e.preventDefault(); if (value.trim()) run(async () => { await bridgeApi.link(provider, value.trim()); setValue(''); }, 'Ligada. As próximas sessões chegam sozinhas.'); }}>
          <input className="field" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} aria-label={placeholder} maxLength={200} />
          <button className="btn primary sm" disabled={busy || !value.trim()}>{busy ? 'Ligando…' : 'Ligar'}</button>
        </form>
      )}
      <p className="faint bridge-row__hint">{hint}</p>
      {msg && <p className="muted bridge-row__msg" role="status">{msg}</p>}
    </div>
  );
}

/** Playnite: a extensão avisa sozinha; aqui só se gera a chave pessoal e se baixa a extensão. */
function PlayniteRow() {
  const b = useBridges();
  const acc = b?.accounts.find((a) => a.provider === 'playnite');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const gen = async () => { setBusy(true); setMsg(''); try { setToken(await bridgeApi.playniteToken()); } catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu.'); } setBusy(false); };
  const copy = async () => { try { await navigator.clipboard.writeText(token); setMsg('Chave copiada.'); } catch { setMsg('Selecione a chave e copie.'); } };
  return (
    <div className={`bridge-row${acc ? ' is-on' : ''}`}>
      <div className="bridge-row__head">
        <strong>Playnite</strong>
        {acc ? <span className="chip chip--static">Ligado</span> : <span className="faint">Desligado</span>}
      </div>
      <p className="muted bridge-row__p">O Playnite é o lançador de jogos do PC (Steam, Epic, GOG, emuladores). Com a extensão do WinnerZ, cada jogo aberto por ele vira sessão, com início e fim exatos.</p>
      {token ? (
        <div className="pn-token">
          <span className="finish__label">Sua chave (aparece só agora)</span>
          <div className="pn-token__row"><input className="field mono" readOnly value={token} onFocus={(e) => e.currentTarget.select()} aria-label="Chave do Playnite" /><button className="btn ghost sm" onClick={copy}>Copiar</button></div>
          <ol className="pn-steps">
            <li><a href={PLAYNITE_DOWNLOAD} target="_blank" rel="noopener noreferrer">Baixe a extensão WinnerZ.pext</a> e abra o arquivo com o Playnite aberto (ele pergunta se quer instalar).</li>
            <li>No Playnite: menu → Complementos → Configurações de extensões → WinnerZ. Cole a chave e salve.</li>
            <li>Abra um jogo pelo Playnite. Ao fechar, a sessão chega aqui.</li>
          </ol>
          <p className="faint">Guarde a chave só no Playnite. Se ela vazar, gere outra: a antiga para de funcionar.</p>
        </div>
      ) : acc ? (
        <>
          <p className="muted bridge-row__p">{acc.lastSyncAt ? `Último aviso da extensão: ${dayMonth(acc.lastSyncAt)}, ${hourMin(acc.lastSyncAt)}.` : 'A extensão ainda não avisou nada.'} <a href={PLAYNITE_DOWNLOAD} target="_blank" rel="noopener noreferrer">Baixar a extensão</a></p>
          <div className="bridge-row__actions">
            <button className="btn ghost sm" disabled={busy} onClick={gen}>Gerar nova chave</button>
            <button className="btn quiet sm danger" disabled={busy} onClick={async () => { setBusy(true); try { await bridgeApi.unlink('playnite'); setMsg('Desligado.'); } catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu.'); } setBusy(false); }}>Desligar</button>
          </div>
        </>
      ) : (
        <div className="bridge-row__actions"><button className="btn primary sm" disabled={busy} onClick={gen}>{busy ? 'Gerando…' : 'Gerar a chave e ligar'}</button></div>
      )}
      {msg && <p className="muted bridge-row__msg" role="status">{msg}</p>}
    </div>
  );
}

/** E7.3 · Twitch: a recompensa do canal ("Figurinha WinnerZ") resgatada com pontos vira pacote no Álbum. */
const TW_BACK: Record<string, string> = {
  ligada: 'Twitch ligada. Os próximos resgates da recompensa do canal viram pacotes no Álbum.',
  cancelado: 'Você cancelou o login da Twitch.',
  ocupada: 'Essa conta da Twitch já está ligada a outra conta do WinnerZ.',
  erro: 'A Twitch não confirmou o login. Tente de novo.',
};
function TwitchRow() {
  const mode = useStore((s) => s.mode);
  const [tw, setTw] = useState<MyTwitch | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(() => { try { return TW_BACK[new URLSearchParams(window.location.search).get('twitch') ?? ''] ?? ''; } catch { return ''; } });
  useEffect(() => { twitchApi.mine().then(setTw); }, []);
  if (!tw && mode === 'supabase') return null; // sem a 0069: a linha fica escondida
  const link = async () => { setBusy(true); setMsg(''); try { await twitchApi.link(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu.'); setBusy(false); } };
  const unlink = async () => { setBusy(true); try { await twitchApi.unlink(); setTw(await twitchApi.mine()); setMsg('Twitch desligada.'); } catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu.'); } setBusy(false); };
  return (
    <div className={`bridge-row${tw?.linked ? ' is-on' : ''}`}>
      <div className="bridge-row__head">
        <strong>Twitch</strong>
        {tw?.linked ? <span className="chip chip--static">Ligada como {tw.linked.display ?? tw.linked.login}</span> : <span className="faint">Desligada</span>}
      </div>
      <p className="muted bridge-row__p">
        Resgate a recompensa “{tw?.reward ?? 'Figurinha WinnerZ'}” com os pontos do canal{tw?.channel ? ` (twitch.tv/${tw.channel})` : ''} e ganhe um pacote no Álbum. Resgate feito antes de ligar fica guardado 30 dias.
        {tw?.linked && tw.packs > 0 ? ` Você já ganhou ${tw.packs} ${tw.packs === 1 ? 'pacote' : 'pacotes'} assim.` : ''}
      </p>
      <div className="bridge-row__actions">
        {tw?.linked
          ? <button className="btn quiet sm danger" disabled={busy} onClick={() => void unlink()}>Desligar</button>
          : <button className="btn primary sm" disabled={busy} onClick={() => void link()}>{busy ? 'Abrindo a Twitch…' : 'Ligar a Twitch'}</button>}
      </div>
      <p className="faint bridge-row__hint">O login é feito na própria Twitch; o WinnerZ só guarda o seu nome de usuário de lá.</p>
      {msg && <p className="muted bridge-row__msg" role="status">{msg}</p>}
    </div>
  );
}
