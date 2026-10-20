/**
 * Preferências → Minha figurinha da Galera: prévia ao vivo, cenário, jogo marcante, nome e frase opcionais e o
 * retrato (a foto do perfil ou o avatar padrão do WinnerZ). Tudo passa pela aprovação do Studio antes de sair nos
 * pacotes. Dá para pausar, desistir de uma alteração e sair da Galera.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from '../../lib/router';
import { useStore } from '../../data/store';
import { ConfirmButton } from '../Sheet';
import { GaleraCard } from './GaleraCard';
import { GALERA_SCENES, galeraApi, galeraStatus, REFUSE_TEXT, type GaleraCard as Card, type GaleraDraft, type GaleraMine, type GaleraScene } from '../../data/galeraApi';

const STATUS_LABEL = { fora: 'Fora da Galera', analise: 'Em análise', recusada: 'Não aprovada', ativa: 'Na Galera', pausada: 'Pausada' } as const;

export function GaleraEditor() {
  const mode = useStore((s) => s.mode);
  const profile = useStore((s) => s.profile);
  const games = useStore((s) => s.games);
  const journeys = useStore((s) => s.journeys);
  const copies = useStore((s) => s.copies);
  const [me, setMe] = useState<GaleraMine | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [back, setBack] = useState(false);
  const [draft, setDraft] = useState<GaleraDraft | null>(null);

  useEffect(() => {
    let alive = true;
    galeraApi.me().then((m) => { if (!alive) return; setMe(m); }).catch((e) => { if (alive) setErr(e instanceof Error ? e.message : 'Não consegui abrir a sua figurinha agora.'); });
    return () => { alive = false; };
  }, [mode, profile?.id]);
  useEffect(() => {
    if (!me || draft) return;
    const v = me.card?.pending ?? me.card?.live;
    setDraft(v ? { scene: v.scene, game: v.game, name: v.name, phrase: v.phrase, useAvatar: !!v.portrait } : { scene: 'litoral', game: '', name: '', phrase: '', useAvatar: !!profile?.avatar });
  }, [me, draft, profile?.avatar]);
  // O jogo marcante é escrito; os da sua estante e da Jornada aparecem como sugestão.
  const titles = useMemo(() => {
    const ids = new Set([...journeys.map((j) => j.gameId), ...copies.map((c) => c.gameId)]);
    return [...ids].map((id) => games[id]?.title).filter((t): t is string => !!t).sort((a, b) => a.localeCompare(b, 'pt-BR')).slice(0, 200);
  }, [games, journeys, copies]);

  if (mode === 'supabase' && !profile) return <p className="muted prefs__p">Entre na sua conta para fazer a sua figurinha.</p>;
  if (err && !me) return <p className="awards__error" role="alert">{err}</p>;
  if (!me || !draft) return <p className="faint">Abrindo a sua figurinha…</p>;

  const st = galeraStatus(me);
  const set = (p: Partial<GaleraDraft>) => setDraft({ ...draft, ...p });
  const preview: Card = {
    owner: 'eu', handle: me.handle, number: me.number, fundador: me.fundador,
    scene: draft.scene, game: draft.game.trim(), name: draft.name.trim(), phrase: draft.phrase.trim(),
    portrait: draft.useAvatar ? (profile?.avatar ?? null) : null,
  };
  const run = async (f: () => Promise<GaleraMine>, ok: string) => {
    setBusy(true); setErr(''); setMsg('');
    try { setMe(await f()); setMsg(ok); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora. Tente de novo.'); } finally { setBusy(false); }
  };
  const editing = !!me.card?.pending && !!me.card?.live;
  const refused = me.card?.refused;

  return (
    <div className="glr-edit">
      <div className="glr-edit__preview">
        <GaleraCard card={preview} back={back} />
        <button className="btn quiet sm" onClick={() => setBack((b) => !b)}>{back ? 'Ver a frente' : 'Ver o verso'}</button>
      </div>
      <div className="glr-edit__form">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <span className={`glr-status is-${st}`}><i aria-hidden="true" />{STATUS_LABEL[st]}</span>
          {editing && <span className="glr-status is-analise"><i aria-hidden="true" />Alteração em análise</span>}
          {me.card?.hidden && <span className="glr-status is-analise"><i aria-hidden="true" />Em revisão</span>}
          <span className="faint">Seu número: nº {String(me.number ?? 0).padStart(3, '0')}{me.fundador ? ' · Fundador' : ''}</span>
        </div>
        {refused && st !== 'ativa' && <p className="awards__error" role="status" style={{ margin: 0 }}>{REFUSE_TEXT[refused.reason] ?? ''} {refused.note}</p>}
        {refused?.reason === 'denuncia' && st === 'ativa' && <p className="muted" style={{ margin: 0 }}>{REFUSE_TEXT.denuncia} Você pode enviar uma versão nova.</p>}
        {me.why === 'galera_handle' && <p className="muted" style={{ margin: 0 }}>Antes, escolha o seu @ em <a href="#perfil">Perfil e privacidade</a>: ele vai na figurinha e leva ao seu perfil.</p>}
        {me.why === 'galera_new' && <p className="muted" style={{ margin: 0 }}>Contas novas fazem a figurinha depois de 7 dias ou da primeira sessão registrada.</p>}

        <fieldset className="glr-f" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="glr-f__l">Cenário</legend>
          <div className="glr-edit__scenes">
            {GALERA_SCENES.map((s) => (
              <button key={s.id} type="button" className="glr-scene" aria-pressed={draft.scene === s.id} onClick={() => set({ scene: s.id as GaleraScene })}>
                <img src={`/galera/${s.id}.webp`} alt="" loading="lazy" /><span>{s.name}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="glr-f" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="glr-f__l">Retrato</legend>
          <label className="glr-radio"><input type="radio" name="glr-av" checked={draft.useAvatar} disabled={!profile?.avatar} onChange={() => set({ useAvatar: true })} /> A foto do meu perfil{!profile?.avatar && ' (você ainda não tem)'}</label>
          <label className="glr-radio"><input type="radio" name="glr-av" checked={!draft.useAvatar} onChange={() => set({ useAvatar: false })} /> O avatar padrão do WinnerZ</label>
          <span className="faint" style={{ fontSize: 13 }}>Só a sua foto ou o avatar padrão. Personagens e marcas de outras empresas não passam na aprovação.</span>
        </fieldset>

        <label className="glr-f"><span className="glr-f__l">Jogo marcante <span className="faint">(opcional, vai escrito)</span></span>
          <input className="field" list="glr-games" maxLength={80} value={draft.game} onChange={(e) => set({ game: e.target.value })} placeholder="Ex.: Elden Ring" />
          <datalist id="glr-games">{titles.map((t) => <option key={t} value={t} />)}</datalist>
        </label>
        <label className="glr-f"><span className="glr-f__l">Nome <span className="faint">(opcional, até 24)</span></span>
          <input className="field" maxLength={24} value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Como quer ser chamado" />
        </label>
        <label className="glr-f"><span className="glr-f__l">Frase <span className="faint">(opcional, {60 - draft.phrase.length} restantes)</span></span>
          <input className="field" maxLength={60} value={draft.phrase} onChange={(e) => set({ phrase: e.target.value })} placeholder="Ex.: Mais uma run e eu durmo." />
        </label>

        <p className="muted" style={{ margin: 0, fontSize: 14 }}>Sua figurinha, com o retrato escolhido e o seu @, pode sair nos pacotes de outras pessoas. Você pode pausar ou sair quando quiser. Ela passa por aprovação antes.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button className="btn now" disabled={busy || !!me.why} onClick={() => void run(() => galeraApi.submit(draft), st === 'fora' || st === 'recusada' ? 'Enviada! Você recebe um aviso quando for aprovada.' : 'Alteração enviada. A versão atual continua valendo até a aprovação.')}>
            {st === 'fora' || st === 'recusada' ? 'Enviar para aprovação' : st === 'analise' || editing ? 'Atualizar o envio' : 'Enviar alteração'}
          </button>
          {(st === 'analise' || editing) && <button className="btn quiet" disabled={busy} onClick={() => void run(() => galeraApi.cancel(), editing ? 'Alteração descartada.' : 'Envio cancelado.')}>{editing ? 'Desistir da alteração' : 'Cancelar o envio'}</button>}
          {st === 'ativa' && <button className="btn ghost" disabled={busy} onClick={() => void run(() => galeraApi.pause(true), 'Pausada. Ela não sai em pacotes novos; quem já tem continua vendo.')}>Pausar</button>}
          {st === 'pausada' && <button className="btn ghost" disabled={busy} onClick={() => void run(() => galeraApi.pause(false), 'Pronto, ela volta a sair nos pacotes.')}>Voltar a sair nos pacotes</button>}
          {(st === 'ativa' || st === 'pausada') && <ConfirmButton label="Sair da Galera" confirm="Sair mesmo? As cópias viram aposentadas" onConfirm={() => void run(() => galeraApi.leave(), 'Você saiu da Galera. As cópias viraram aposentadas, sem o seu nome nem retrato.')} />}
        </div>
        {msg && <p className="muted" role="status" style={{ margin: 0 }}>{msg}</p>}
        {err && <p className="awards__error" role="alert" style={{ margin: 0 }}>{err}</p>}
        <p className="faint" style={{ margin: 0, fontSize: 13 }}>As figurinhas que você tirou ficam em <Link to="/album/galera">Álbum → Galera</Link>. Os acenos chegam na próxima fase.</p>
      </div>
    </div>
  );
}
