import { WhatNext } from '../components/WhatNext';
import { useEffect, useRef, useState } from 'react';
import { Link, navigate, usePath } from '../lib/router';
import { actions, useStore, openSession, sessionsOf, lastNote, currentHistory, uid } from '../data/store';
import { SUPABASE_ON } from '../lib/env';
import { Icon } from '../components/Icon';
import { Toast } from '../components/Toast';
import { PhotoViewer } from '../components/MediaGallery';
import { Celebration, PersonalSticker, SealedLetter } from '../components/Celebration';
import { dayMonthYear, hourMin, longDay } from '../lib/format';
import { CoverArt } from '../components/CoverArt';
import { Backdrop, useBackdrop } from '../components/Backdrop';

/** Reduz a foto antes de enviar: 1080 px no lado maior, JPEG ~150 KB. */
async function shrink(file: File, max = 1080): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error('foto'))), 'image/jpeg', 0.8));
  } finally { URL.revokeObjectURL(url); }
}

const toDataUrl = (b: Blob) => new Promise<string>((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(b); });

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

const FEELINGS = ['Adorei', 'Quero continuar', 'Foi suficiente por hoje', 'Não encaixou'];

export function SessionPage() {
  const path = usePath();
  const s = useStore((x) => x);
  const session = openSession(s);
  const [finishing, setFinishing] = useState(path.includes('finalizar=1'));
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [celebrate, setCelebrate] = useState<{ historyId: string } | null>(null);
  // Vindo da barra da sessão ("Momento" / "Quero voltar aqui"): abre a folha direto.
  const [draft, setDraft] = useState<Draft | null>(() => {
    const acao = new URLSearchParams(location.search).get('acao');
    return acao === 'momento' || acao === 'ponto' ? { kind: acao, title: '', note: '' } : null;
  });
  useEffect(() => { if (location.search.includes('acao=')) navigate('/sessao', { replace: true }); }, []);
  const [viewer, setViewer] = useState<number | null>(null);
  const photoKind = useRef<'momento' | 'ponto'>('momento');
  const fileInput = useRef<HTMLInputElement>(null);

  // Depois de zerar a sessão fecha; a celebração continua na tela.
  if (celebrate) return <Celebrated historyId={celebrate.historyId} onClose={() => { const h = s.histories.find((x) => x.id === celebrate.historyId); const j = h && s.journeys.find((x) => x.id === h.journeyId); navigate(j ? `/jornada/${s.games[j.gameId].slug}` : '/'); }} />;

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
  const here = s.events.filter((e) => e.sessionId === session.id);
  const say = (text: string) => setToast({ id: Date.now(), text });

  // A foto vem primeiro (câmera abre na hora); a nota é opcional, numa folha logo em seguida.
  const onFile = async (f?: File) => {
    if (!f) return;
    let blob: Blob;
    try { blob = await shrink(f); } catch { say('Não consegui abrir essa imagem. Tente outra foto.'); return; }
    setDraft((d) => {
      if (d?.preview) URL.revokeObjectURL(d.preview);
      return { kind: d?.kind ?? photoKind.current, blob, preview: URL.createObjectURL(blob), title: d?.title ?? '', note: d?.note ?? '' };
    });
  };
  const pickPhoto = (kind: 'momento' | 'ponto') => { photoKind.current = kind; fileInput.current?.click(); };

  const saveDraft = async (d: Draft) => {
    setDraft(null);
    const kind = d.kind;
    const title = d.title.trim() || undefined;
    const note = d.note.trim() || undefined;
    const fields = kind === 'ponto' ? { title, text: note } : { title, quote: note };
    const done = kind === 'ponto' ? 'Ponto para voltar criado. Ele aparece na retomada.' : 'Momento guardado na sua linha do tempo.';
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
    <main className="session">
      <div className="session__hero on-photo">
        <Backdrop game={g} />
        <div className="session__shade" aria-hidden="true" />
        <div className="session__bar">
          <Link to={`/jornada/${g.slug}`} className="session__back" aria-label="Voltar para a Jornada"><Icon name="voltar" size={20} /></Link>
          <span className="session__live"><span className="session-pill__dot" aria-hidden="true" />Sessão aberta desde {hourMin(session.startedAt)}</span>
        </div>
        <div className="session__title">
          <div className="muted">Sessão {n}{h.ordinal > 1 ? `, sua ${h.title}` : ''}</div>
          <h1 className="t">{g.title}</h1>
        </div>
      </div>

      {!finishing ? (
        <div className="session__body">
          {prevNote?.note && (
            <div className="session__note"><div className="session__note-k">Seu recado de {longDay(prevNote.startedAt).split(',')[0]}</div><div className="quote">“{prevNote.note}”</div></div>
          )}
          <input ref={fileInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
          <div className="tiles">
            <button className="tile" onClick={() => pickPhoto('momento')}><Icon name="camera" size={24} />Guardar momento</button>
            <button className="tile" onClick={() => pickPhoto('ponto')}><Icon name="pin" size={24} />Quero voltar aqui</button>
            <button className="tile" onClick={() => setDraft({ kind: 'momento', title: '', note: '' })}><Icon name="caneta" size={24} />Anotar sem foto</button>
            <button className="tile" onClick={() => setFinishing(true)}><Icon name="mensagem" size={24} />Recado para a próxima vez</button>
          </div>
          {here.length > 0 && (
            <div>
              <div className="muted session__k">Nesta sessão</div>
              <div className="session__thumbs">
                {here.map((e) => e.image
                  ? <button key={e.id} className="session__thumb" onClick={() => setViewer(herePhotos.indexOf(e))} aria-label={`Ver foto: ${e.title}`}><img src={e.image} alt="" />{e.kind === 'ponto' && <span className="session__thumb-pin"><Icon name="pin" size={12} /></span>}</button>
                  : <span key={e.id} className="session__mark" title={[e.title, e.quote ?? e.text].filter(Boolean).join(': ')}>{e.kind === 'ponto' ? <Icon name="pin" /> : <Icon name="caneta" />}<span>{e.title}</span></span>)}
              </div>
            </div>
          )}
          <div className="session__end">
            <button className="btn session__finish" onClick={() => setFinishing(true)}>Finalizar sessão</button>
            <p className="faint">Pode fechar o site. A sessão fica aberta até você finalizar.</p>
          </div>
        </div>
      ) : (
        <FinishForm
          progress={h.progress ?? 0}
          onCancel={() => setFinishing(false)}
          onFinish={(data) => { actions.finishSession(session.id, data); navigate(`/jornada/${g.slug}`); }}
          onZerei={(data) => { actions.finishSession(session.id, data); actions.completeHistory(h.id); setCelebrate({ historyId: h.id }); }}
        />
      )}
      {draft && <MomentSheet draft={draft} onChange={setDraft} onPhoto={() => fileInput.current?.click()} onCancel={() => { if (draft.preview) URL.revokeObjectURL(draft.preview); setDraft(null); }} onSave={() => saveDraft(draft)} />}
      {viewer !== null && herePhotos.length > 0 && <PhotoViewer title={g.title} items={herePhotos.map((e) => ({ kind: 'image' as const, src: e.image!, label: e.title }))} start={Math.max(0, viewer)} onClose={() => setViewer(null)} />}
      {toast && <Toast key={toast.id} text={toast.text} />}
    </main>
  );
}

function FinishForm({ progress, onFinish, onZerei, onCancel }: { progress: number; onFinish: (d: { note?: string; whereStopped?: string; feeling?: string; progress?: number }) => void; onZerei: (d: { note?: string }) => void; onCancel: () => void }) {
  const [p, setP] = useState(progress);
  const [where, setWhere] = useState('');
  const [note, setNote] = useState('');
  const [feel, setFeel] = useState<string | undefined>();
  return (
    <div className="finish">
      <div className="finish__head"><h2 className="t">Fim da sessão</h2><button className="btn quiet sm" onClick={onCancel}>Voltar</button></div>
      <p className="muted">Tudo aqui é opcional.</p>
      <label htmlFor="prog-f" className="finish__label"><span>Seu progresso</span><span className="t">{p}%</span></label>
      <input id="prog-f" className="range" type="range" min={0} max={100} value={p} style={{ ['--p' as string]: `${p}%` }} onChange={(e) => setP(Number(e.target.value))} />
      <label htmlFor="parei" className="finish__label">Onde você parou?</label>
      <input id="parei" className="field" placeholder="Ex.: entrei no teatro" value={where} onChange={(e) => setWhere(e.target.value)} />
      <label htmlFor="recado" className="finish__label">Recado para a próxima vez</label>
      <textarea id="recado" className="field" rows={2} placeholder="O que você quer lembrar quando voltar?" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="finish__label">Como foi hoje?</div>
      <div className="chips" role="group" aria-label="Como foi hoje">
        {FEELINGS.map((f) => <button key={f} className="chip" aria-pressed={feel === f} onClick={() => setFeel(feel === f ? undefined : f)}>{f}</button>)}
      </div>
      <button className="finish__zerei" onClick={() => onZerei({ note: note || undefined })}>Zerei a campanha nesta sessão</button>
      <div className="finish__actions">
        <button className="btn primary lg" onClick={() => onFinish({ note, whereStopped: where, feeling: feel, progress: p !== progress ? p : undefined })}>Salvar e finalizar</button>
        <button className="btn quiet" onClick={() => onFinish({})}>Finalizar sem adicionar nada</button>
      </div>
    </div>
  );
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
    <Celebration title="História concluída" subtitle={`${g.title}. De ${dayMonthYear(h.startedAt)} a hoje.`} onClose={onClose}>
      <div className="celebration__gifts">
        <PersonalSticker image={img} title={h.ordinal > 1 ? `Fim da ${h.title}` : 'Primeira vez'} />
        {h.letter && <SealedLetter text={h.letter.text} date={dayMonthYear(h.startedAt)} opened={false} onOpen={() => actions.openLetter(h.id)} />}
      </div>
      <div className="celebration__actions"><Link className="btn primary lg" to={`/jogos/${g.slug}#analise`}>{s.reviews.some((r) => r.gameId === g.id && r.mine) ? 'Rever sua análise' : 'Escrever uma análise'}</Link></div>
      <WhatNext game={g} />
    </Celebration>
  );
}
