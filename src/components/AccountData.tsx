import { notifApi } from '../data/notifApi';
import { useEffect, useState } from 'react';
import { Link } from '../lib/router';
import { getState, useStore } from '../data/store';
import { buildExport, collectionCsv, download } from '../lib/exportData';

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' });

async function call(method: 'GET' | 'POST', body?: unknown): Promise<{ deleteAfter: string | null }> {
  const { accessToken } = await import('../data/supabaseAdapter');
  const r = await fetch('/api/conta', { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken()}` }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Não consegui falar com o servidor.');
  return j;
}

/** O prazo de exclusão desta conta (null = nenhum). Compartilhado entre o aviso do topo e a tela de conta. */
let cached: string | null | undefined;
const listeners = new Set<(v: string | null) => void>();
const publish = (v: string | null) => { cached = v; listeners.forEach((f) => f(v)); };
function useDeletion() {
  const mode = useStore((s) => s.mode);
  const profile = useStore((s) => s.profile);
  const [when, setWhen] = useState<string | null | undefined>(cached);
  useEffect(() => {
    listeners.add(setWhen);
    if (mode === 'supabase' && profile && cached === undefined) call('GET').then((r) => publish(r.deleteAfter)).catch(() => publish(null));
    return () => { listeners.delete(setWhen); };
  }, [mode, profile]);
  return when;
}

/** Aviso no topo enquanto a conta está marcada para ser apagada. */
export function DeletionBanner() {
  const when = useDeletion();
  if (!when) return null;
  return (
    <div className="del-banner" role="status">
      Sua conta será apagada em {fmtDate(when)}. <Link to="/preferencias#conta">Desistir de apagar</Link>
    </div>
  );
}

/** Baixar tudo o que você registrou (LGPD). */
export function ExportData() {
  const [busy, setBusy] = useState<string>('');
  const [note, setNote] = useState('');
  const all = async () => {
    setNote(''); setBusy('Juntando seus dados…');
    try {
      // O que você escreveu nas comunidades e nos clubes vem do servidor (sem a migração 0029, fica de fora).
      const { communityApi, communityImage } = await import('../data/communityApi');
      const base = await communityApi.myData().catch(() => null);
      // Os avisos também (sem a migração 0034, ficam de fora).
      const avisos = await notifApi.myData().catch(() => null);
      const comunidade = base || avisos ? { ...(base ?? {}), ...(avisos ? { avisos } : {}) } : null;
      const { blob, missing } = await buildExport(getState(), (d, t) => setBusy(`Juntando as fotos: ${d} de ${t}…`), comunidade, communityImage);
      download(blob, `winnerz-dados-${today()}.zip`);
      setNote(missing ? `Pronto. ${missing} ${missing === 1 ? 'foto não baixou' : 'fotos não baixaram'} (conexão); tente de novo para incluí-las.` : 'Pronto. O arquivo foi baixado.');
    } catch { setNote('Não consegui montar o arquivo. Tente de novo.'); }
    setBusy('');
  };
  const csv = () => download(new Blob([collectionCsv(getState())], { type: 'text/csv;charset=utf-8' }), `winnerz-colecao-${today()}.csv`);
  return (
    <div className="acct">
      <p className="muted prefs__p">Um arquivo .zip com tudo o que você registrou: Jornadas, sessões, momentos com as fotos, coleção, desejos, notas, preferências e o que você escreveu nas comunidades e nos clubes. Em formato aberto, para guardar ou levar para onde quiser.</p>
      <div className="acct__row">
        <button className="btn primary" onClick={all} disabled={!!busy}>{busy || 'Baixar tudo'}</button>
        <button className="btn ghost" onClick={csv} disabled={!!busy}>Só a coleção (planilha)</button>
      </div>
      {note && <p className="acct__note" role="status">{note}</p>}
    </div>
  );
}

/** Apagar a conta: 7 dias para desistir; no modo demonstração, apaga na hora o que está neste navegador. */
export function DeleteAccount() {
  const mode = useStore((s) => s.mode);
  const profile = useStore((s) => s.profile);
  const when = useDeletion();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Na demonstração não há conta: "Recomeçar a demonstração", logo acima, já apaga tudo deste navegador.
  if (mode === 'demo' || !profile) return null;

  const act = async (action: 'agendar' | 'cancelar') => {
    setBusy(true); setError('');
    try { const r = await call('POST', { action }); publish(r.deleteAfter); setOpen(false); setTyped(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não deu certo.'); }
    setBusy(false);
  };

  if (when) return (
    <div className="acct acct--danger acct--scheduled">
      <p className="acct__title">Sua conta será apagada em {fmtDate(when)}.</p>
      <p className="muted prefs__p">Até lá, tudo continua funcionando normalmente. Depois dessa data, apagamos suas fotos, sua coleção, suas Jornadas, notas, votos e o que você escreveu nas comunidades, e não há como recuperar.</p>
      <div className="acct__row"><button className="btn primary" onClick={() => act('cancelar')} disabled={busy}>{busy ? 'Um instante…' : 'Desistir de apagar'}</button></div>
      {error && <p className="awards__error" role="alert">{error}</p>}
    </div>
  );

  return (
    <div className="acct acct--danger">
      {!open ? (
        <div className="acct__row"><button className="btn ghost danger" onClick={() => setOpen(true)}>Apagar minha conta</button></div>
      ) : (
        <div className="acct__confirm">
          <p className="acct__title">Apagar a conta e tudo o que está nela</p>
          <ul className="acct__list">
            <li>Some tudo: Jornadas, sessões, momentos e fotos, coleção, desejos, notas, análises, votos do Awards, postagens e respostas.</li>
            <li>Onde outras pessoas já responderam a você, a conversa delas fica, mas sem o seu nome, o seu texto e as suas imagens (aparece “Conta apagada”).</li>
            <li>Você tem 7 dias para desistir. Nesse tempo a conta continua funcionando.</li>
            <li>Antes, vale <b>baixar tudo</b> logo acima, para guardar uma cópia.</li>
          </ul>
          <label className="acct__type">Para confirmar, digite <b>APAGAR</b>
            <input className="field" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" aria-label="Digite APAGAR para confirmar" />
          </label>
          <div className="acct__row">
            <button className="btn danger-solid" disabled={typed.trim().toUpperCase() !== 'APAGAR' || busy} onClick={() => act('agendar')}>{busy ? 'Um instante…' : 'Apagar em 7 dias'}</button>
            <button className="btn quiet" onClick={() => { setOpen(false); setTyped(''); }}>Cancelar</button>
          </div>
          {error && <p className="awards__error" role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
