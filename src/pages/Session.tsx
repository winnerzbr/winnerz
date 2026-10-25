import { ShareCardButton } from '../components/ShareCard';
import { TrailerButton } from '../components/Trailer';
import { discordApi } from '../data/discordApi';
import { packAfterFinish } from '../components/album/afterFinish';
import { WhatNext } from '../components/WhatNext';
import { useEffect, useRef, useState } from 'react';
import { Link, navigate, usePath } from '../lib/router';
import { actions, useStore, openSession, sessionsOf, lastNote, currentHistory, uid, knownCompanions, hasV8, hasV43, hasV95, knownTags, sessionMinutes } from '../data/store';
import { SUPABASE_ON } from '../lib/env';
import { Icon } from '../components/Icon';
import { Toast } from '../components/Toast';
import { PhotoViewer } from '../components/MediaGallery';
import { Celebration, PersonalSticker, SealedLetter } from '../components/Celebration';
import { dayMonthYear, hourMin, longDay, durLabel } from '../lib/format';
import { CoverArt } from '../components/CoverArt';
import { Backdrop, useBackdrop } from '../components/Backdrop';
import { BrandMark } from '../components/Brand';
import { shrink, toDataUrl } from '../lib/image';
import { say as toneLine } from '../lib/tone';
import { celebrateSmall } from '../components/MiniCelebration';
import { marcarZerado } from '../lib/iamiguinho';
import { Previously, CapsuleSheet } from '../components/Retomada';
import { PlanCard, StopCard } from '../components/Outline';
import { StartPartCard } from '../components/PartPicker';
import { recapFor, wantsRecap } from '../lib/recap';
import { FinishFlow } from './SessionFinish';
import { noticeSaved } from '../components/SavedNotice';

type Draft = { kind: 'momento' | 'ponto'; blob?: Blob; preview?: string; title: string; note: string };

/** Folha que sobe depois da foto (ou sem foto): tipo, nome e nota, tudo opcional. */
function MomentSheet({ draft, onChange, onPhoto, onCancel, onSave }: { draft: Draft; onChange: (d: Draft) => void; onPhoto: () => void; onCancel: () => void; onSave: () => void }) {
  const ponto = draft.kind === 'ponto';
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onCancel]);
  return (
    <div className="sheet-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <form className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <div className="sheet__grip" aria-hidden="true" />
        <h2 id="sheet-title" className="t sheet__title">{ponto ? 'Quero voltar aqui' : 'Guardar momento'}</h2>
        <div className="seg sheet__kind" role="group" aria-label="Tipo">
          <button type="button" aria-pressed={!ponto} onClick={() => onChange({ ...draft, kind: 'momento' })}><Icon name="camera" size={15} />Momento</button>
          <button type="button" aria-pressed={ponto} onClick={() => onChange({ ...draft, kind: 'ponto' })}><Icon name="pin" size={15} />Quero voltar aqui</button>
        </div>
        {draft.preview ? (
          <div className="sheet__photo"><img src={draft.preview} alt="Sua foto" /><button type="button" className="btn quiet sm" onClick={onPhoto}>Trocar foto</button></div>
        ) : (
          <button type="button" className="sheet__addphoto" onClick={onPhoto}><Icon name="camera" size={20} />Adicionar uma foto (opcional)</button>
        )}
        <label htmlFor="m-title" className="finish__label">{ponto ? 'Que lugar é esse?' : 'Dê um nome'} <span className="faint">(opcional)</span></label>
        <input id="m-title" className="field" value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} placeholder={ponto ? 'Ex.: Quarto trancado, segundo andar' : 'Ex.: A porta iluminada'} maxLength={80} />
        <label htmlFor="m-note" className="finish__label">{ponto ? 'Por que voltar?' : 'Nota'} <span className="faint">(opcional)</span></label>
        <textarea id="m-note" className="field" rows={3} value={draft.note} onChange={(e) => onChange({ ...draft, note: e.target.value })} placeholder={ponto ? 'Ex.: preciso da chave que fica no cofre' : 'O que você quer lembrar deste instante?'} />
        <div className="sheet__actions">
          <button type="submit" className="btn primary lg">{ponto ? 'Criar ponto para voltar' : 'Guardar momento'}</button>
          <button type="button" className="btn quiet" onClick={onCancel}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}


export function SessionPage() {
  const path = usePath();
  const s = useStore((x) => x);
  const session = openSession(s);
  const [finishing, setFinishing] = useState<boolean | 'recado'>(path.includes('finalizar=1'));
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [celebrate, setCelebrate] = useState<{ historyId: string } | null>(null);
  // Vindo da barra da sessão ("Momento" / "Quero voltar aqui"): abre a folha direto.
  const [draft, setDraft] = useState<Draft | null>(() => {
    const acao = new URLSearchParams(location.search).get('acao');
    return acao === 'momento' || acao === 'ponto' ? { kind: acao, title: '', note: '' } : null;
  });
  useEffect(() => { if (location.search.includes('acao=')) navigate('/sessao', { replace: true }); }, []);
  const [viewer, setViewer] = useState<number | null>(null);
  const [capsuleOpen, setCapsuleOpen] = useState(false);
  const photoKind = useRef<'momento' | 'ponto'>('momento');
  const prefill = useRef('');
  const fileInput = useRef<HTMLInputElement>(null);
  // No celular "Guardar momento" abre a câmera direto. Se a pessoa fechar a câmera sem foto, a folha abre do mesmo jeito,
  // para anotar só com texto (por isso não precisa de um botão "Anotar sem foto").
  useEffect(() => {
    const el = fileInput.current;
    if (!el) return;
    const semFoto = () => setDraft((d) => d ?? { kind: photoKind.current, title: prefill.current, note: '' });
    el.addEventListener('cancel', semFoto);
    return () => el.removeEventListener('cancel', semFoto);
  });

  // Depois de zerar a sessão fecha; a celebração continua na tela.
  if (celebrate) return <Celebrated historyId={celebrate.historyId} onClose={() => { marcarZerado(celebrate.historyId); const h = s.histories.find((x) => x.id === celebrate.historyId); const j = h && s.journeys.find((x) => x.id === h.journeyId); navigate(j ? `/jornada/${s.games[j.gameId].slug}` : '/'); }} />;

  if (!session) {
    return (
      <main className="session session--empty">
        <Link to="/" className="session__back" aria-label="Voltar ao início"><Icon name="voltar" size={20} /></Link>
        <h1 className="t">Nenhuma sessão aberta</h1>
        <p className="muted">Escolha um jogo para começar. Você pode também só jogar: o WinnerZ não precisa estar aberto.</p>
        <div className="session__pick">
          {s.journeys.map((j) => s.games[j.gameId] && (
            <button key={j.id} onClick={() => actions.play(j.gameId)}><CoverArt game={s.games[j.gameId]} /><span>{s.games[j.gameId].title}</span></button>
          ))}
        </div>
      </main>
    );
  }

  const j = s.journeys.find((x) => x.id === session.journeyId)!;
  const g = s.games[j.gameId];
  const h = s.histories.find((x) => x.id === session.historyId)!;
  const n = sessionsOf(s, h.id).findIndex((x) => x.id === session.id) + 1;
  const prevNote = lastNote(s, j.id);
  const recap = recapFor(s, j.id);
  const here = s.events.filter((e) => e.sessionId === session.id);
  const say = (text: string) => setToast({ id: Date.now(), text });

  // A foto vem primeiro (câmera abre na hora); a nota é opcional, numa folha logo em seguida.
  const onFile = async (f?: File) => {
    if (!f) return;
    let blob: Blob;
    try { blob = await shrink(f); } catch { say('Não consegui abrir essa imagem. Tente outra foto.'); return; }
    setDraft((d) => {
      if (d?.preview) URL.revokeObjectURL(d.preview);
      const title = d?.title ?? prefill.current; prefill.current = '';
      return { kind: d?.kind ?? photoKind.current, blob, preview: URL.createObjectURL(blob), title, note: d?.note ?? '' };
    });
  };
  const pickPhoto = (kind: 'momento' | 'ponto') => { photoKind.current = kind; fileInput.current?.click(); };
  // No celular, os botões grandes abrem a câmera (foto da TV). No computador, abrem a folha; a foto fica opcional nela.
  const touch = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
  const capture = (kind: 'momento' | 'ponto') => (touch ? pickPhoto(kind) : setDraft({ kind, title: '', note: '' }));

  const saveDraft = async (d: Draft) => {
    setDraft(null);
    const kind = d.kind;
    const title = d.title.trim() || undefined;
    const note = d.note.trim() || undefined;
    const fields = kind === 'ponto' ? { title, text: note } : { title, quote: note };
    const done = toneLine(kind === 'ponto' ? 'ponto' : 'momento', s.prefs.tone, Date.now());
    if (!d.blob) { actions.addMoment(session.id, { ...fields, kind }); say(done); return; }
    const sb = SUPABASE_ON && s.profile ? await import('../data/supabaseAdapter') : null;
    if (sb?.photoStorageReady()) {
      // A foto aparece na hora; o envio para o Storage acontece em segundo plano.
      const id = uid();
      const path = sb.photoPath(s.profile!.id, id);
      actions.addMoment(session.id, { id, ...fields, kind, image: d.preview, imagePath: path });
      say(done);
      sb.uploadPhoto(path, d.blob).catch(() => {
        actions.updateEventPhoto(id, { imagePath: '', image: undefined });
        say('A foto não subiu (sem conexão?). O momento ficou guardado sem ela.');
      });
    } else {
      actions.addMoment(session.id, { ...fields, kind, image: await toDataUrl(d.blob) });
      say(done);
    }
  };
  const herePhotos = here.filter((e) => e.image);

  return (
    <main className={`session${finishing ? ' is-finishing' : ''}`}>
      <section className="session__stage on-photo">
        <Backdrop game={g} className="session__bg" />
        <div className="session__shade" aria-hidden="true" />
        <header className="session__bar">
          <Link to={`/jornada/${g.slug}`} className="session__back-link"><Icon name="voltar" size={18} />Voltar à Jornada</Link>
          <BrandMark width={44} className="session__brand" />
          <span className="session__live"><span className="session-pill__dot" aria-hidden="true" />Sessão aberta</span>
        </header>
        <div className="session__center">
          <span className="session__cover"><CoverArt game={g} /></span>
          <span className="kicker">{h.ordinal > 1 ? `${h.title} · ` : ''}Sessão {n}</span>
          <h1 className="t session__name">{g.title}</h1>
          <Elapsed since={session.startedAt} />
          {h.progress != null && <div className="hline session__line" aria-hidden="true"><i style={{ width: `${h.progress}%` }} /><b style={{ left: `${h.progress}%` }} /></div>}
          <p className="session__hint">Começou às {hourMin(session.startedAt)}. Jogue à vontade: o WinnerZ não precisa ficar aberto.</p>
          <input ref={fileInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
          <div className="session__main-actions">
            <button className="btn primary lg" onClick={() => capture('momento')}><Icon name="camera" size={20} />Guardar momento</button>
            <button className="btn ghost lg" onClick={() => capture('ponto')}><Icon name="pin" size={20} />Quero voltar aqui</button>
          </div>
          <div className="session__cards">
            <StartPartCard game={g} history={h} session={session} />
            <PlanCard game={g} history={h} session={session} intents={hasV43(s)} />
            <StopCard game={g} history={h} />
          </div>
          <div className="session__more">
            <Link className="btn quiet sm" to={`/jogos/${g.slug}/traduzir`}><Icon name="mensagem" size={16} />Traduzir a tela</Link>
            <button className="btn quiet sm" onClick={() => setCapsuleOpen(true)}><Icon name="pin" size={16} />Cápsula de Retomada</button>
          </div>
        </div>
        <div className="session__foot">
          {recap && wantsRecap(recap) ? <div className="session__recap"><Previously journeyId={j.id} always onEditCapsule={() => setCapsuleOpen(true)} /></div> : prevNote?.note && (
            <div className="session__note"><div className="kicker kicker--now">Seu recado de {longDay(prevNote.startedAt).split(',')[0]}</div><div className="quote">“{prevNote.note}”</div></div>
          )}
          <div className="session__foot-row">
            {here.length > 0 ? (
              <div className="session__here">
                <div className="kicker session__k">Nesta sessão</div>
                <div className="session__thumbs">
                  {here.map((e) => e.image
                    ? <button key={e.id} className="session__thumb" onClick={() => setViewer(herePhotos.indexOf(e))} aria-label={`Ver foto: ${e.title}`}><img src={e.image} alt="" />{e.kind === 'ponto' && <span className="session__thumb-pin"><Icon name="pin" size={12} /></span>}</button>
                    : <span key={e.id} className="session__mark" title={[e.title, e.quote ?? e.text].filter(Boolean).join(': ')}>{e.kind === 'ponto' ? <Icon name="pin" /> : <Icon name="caneta" />}<span>{e.title}</span></span>)}
                </div>
              </div>
            ) : <span />}
            {!finishing && <button className="btn now lg session__finish" onClick={() => setFinishing(true)}>Finalizar sessão</button>}
          </div>
        </div>
      </section>

      {finishing && (
        <FinishFlow
          game={g}
          history={h}
          sessionNumber={n}
          onSavePhoto={(blob, title) => saveDraft({ kind: 'momento', blob, preview: URL.createObjectURL(blob), title, note: '' })}
          progress={h.progress ?? 0}
          startedAt={session.startedAt}
          goal={session.goal}
          intent={session.intent}
          startAt={finishing === 'recado' ? 'recado' : undefined}
          onPhoto={(where) => { prefill.current = where.trim() ? `Onde parei: ${where.trim()}` : 'Onde parei'; pickPhoto('momento'); }}
          onCancel={() => setFinishing(false)}
          companions={knownCompanions(s)}
          canWho={hasV8(s)}
          tagsOn={hasV95(s)}
          knownTags={knownTags(s)}
          onFinish={(data) => {
            // Marcos do caminho: primeira sessão, dez sessões, metade do progresso. Festa pequena, sem cobrança.
            const nth = sessionsOf(s, h.id).filter((x) => x.endedAt).length + 1;
            const before = h.progress ?? 0, after = data.progress ?? before;
            const mins = data.minutes ?? sessionMinutes(session.startedAt, new Date().toISOString());
            for (const t of data.points ?? []) actions.addMoment(session.id, { kind: 'ponto', text: t });
            actions.finishSession(session.id, data);
            discordApi.publish('sessao', session.id);
            const tone = s.prefs.tone;
            if (nth === 1 && h.ordinal === 1) celebrateSmall('Primeira sessão', toneLine('primeira', tone));
            else if (before < 50 && after >= 50 && after < 100) celebrateSmall('Metade do caminho', toneLine('metade', tone));
            else if (nth === 10) celebrateSmall('Dez sessões', toneLine('dez', tone));
            // Sem tela de resumo: volta para a Jornada com um aviso de que a sessão foi guardada.
            else noticeSaved('Sessão guardada', [g.title, mins ? durLabel(mins) : '', after ? `progresso ${after}%` : ''].filter(Boolean).join(' · '));
            navigate(`/jornada/${g.slug}`);
          }}
          onZerei={(data) => { for (const t of data.points ?? []) actions.addMoment(session.id, { kind: 'ponto', text: t }); actions.finishSession(session.id, data); actions.completeHistory(h.id); discordApi.publish('zerou', h.id); packAfterFinish(h.id, g.id); setCelebrate({ historyId: h.id }); }}
        />
      )}
      {capsuleOpen && <CapsuleSheet historyId={h.id} gameTitle={g.title} onClose={() => setCapsuleOpen(false)} />}
      {draft && <MomentSheet draft={draft} onChange={setDraft} onPhoto={() => fileInput.current?.click()} onCancel={() => { if (draft.preview) URL.revokeObjectURL(draft.preview); setDraft(null); }} onSave={() => saveDraft(draft)} />}
      {viewer !== null && herePhotos.length > 0 && <PhotoViewer title={g.title} items={herePhotos.map((e) => ({ kind: 'image' as const, src: e.image!, label: e.title }))} start={Math.max(0, viewer)} onClose={() => setViewer(null)} />}
      {toast && <Toast key={toast.id} text={toast.text} />}
    </main>
  );
}

/** Tempo desde o começo da sessão, contando ao vivo. */
function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const sec = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  const txt = `${p(Math.floor(sec / 3600))}:${p(Math.floor((sec % 3600) / 60))}:${p(sec % 60)}`;
  return <div className="session__clock" role="timer" aria-label={`Tempo de sessão: ${Math.floor(sec / 3600)} horas e ${Math.floor((sec % 3600) / 60)} minutos`}>{txt}</div>;
}

function Celebrated({ historyId, onClose }: { historyId: string; onClose: () => void }) {
  const s = useStore((x) => x);
  const h = s.histories.find((x) => x.id === historyId)!;
  const j = s.journeys.find((x) => x.id === h.journeyId)!;
  const g = s.games[j.gameId];
  const bg = useBackdrop(g);
  const img = [...s.events].filter((e) => e.journeyId === j.id && e.image).sort((a, b) => b.at.localeCompare(a.at))[0]?.image ?? bg ?? g.cover;
  void currentHistory;
  return (
    <Celebration title={toneLine('zerou', s.prefs.tone)} subtitle={`${g.title}. De ${dayMonthYear(h.startedAt)} a hoje. ${toneLine('zerouSub', s.prefs.tone)}`} onClose={onClose}>
      <div className="celebration__gifts">
        <PersonalSticker image={img} title={h.ordinal > 1 ? `Fim da ${h.title}` : 'Primeira vez'} />
        {h.letter && <SealedLetter text={h.letter.text} date={dayMonthYear(h.startedAt)} opened={false} onOpen={() => actions.openLetter(h.id)} />}
      </div>
      <div className="celebration__actions"><Link className="btn primary lg" to={`/jogos/${g.slug}#analise`}>{s.reviews.some((r) => r.gameId === g.id && r.mine) ? 'Rever sua análise' : 'Escrever uma análise'}</Link><ShareCardButton game={g} history={h} /><TrailerButton game={g} history={h} /></div>
      <WhatNext game={g} />
    </Celebration>
  );
}
