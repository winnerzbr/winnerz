import { useEffect, useState } from 'react';
import { useStore } from '../data/store';
import { canReview, fixesApi } from '../data/fixesApi';
import { FREE, fmtBytes, loadUsage, type Usage } from '../data/usageApi';
import { SITE_PRIVATE } from '../lib/env';
import { Link } from '../lib/router';
import { ConfirmButton } from '../components/Sheet';
import { invitesApi, inviteLink, type Invite } from '../data/invitesApi';

const LAUNCH_KEY = 'wz.launch.v1';
const STEPS: { k: string; t: string; how: string }[] = [
  { k: 'dominio', t: 'Domínio verificado no Resend', how: 'resend.com → Domains → Add domain (winnerz.com.br). Copie os registros que ele mostrar para o Registro.br (DNS → Editar Zona) e espere ficar "Verified".' },
  { k: 'smtp', t: 'Supabase mandando e-mail pelo Resend', how: 'Supabase → Authentication → Emails → SMTP Settings: host smtp.resend.com, porta 465, usuário resend, senha = uma chave da API do Resend. Remetente: entrar@winnerz.com.br, nome WinnerZ.' },
  { k: 'modelos', t: 'E-mails em português', how: 'Supabase → Authentication → Emails → Templates: cole os modelos da pasta supabase/emails do repositório (assunto e corpo de cada um).' },
  { k: 'teste', t: 'Teste com um e-mail de fora', how: 'Numa janela anônima, peça o link de entrada para um e-mail que não é da equipe (de alguém da família, por exemplo). Confira se chega, se o link abre e se o código funciona.' },
  { k: 'limite', t: 'Limite de e-mails por hora conferido', how: 'Supabase → Authentication → Rate Limits. Com SMTP próprio começa em 30 por hora; no dia da abertura, suba para 100 se o Resend for o gratuito (100 por dia).' },
  { k: 'backup', t: 'Backup semanal ligado', how: 'GitHub → Settings → Secrets and variables → Actions: crie SUPABASE_DB_URL, BACKUP_PASSPHRASE, SUPABASE_URL e SUPABASE_SECRET_KEY. Depois, em Actions → Backup semanal → Run workflow, rode uma vez e confira que ficou verde.' },
  { k: 'senha', t: 'Senha do backup guardada fora do computador', how: 'Sem a BACKUP_PASSPHRASE o backup não abre. Guarde num gerenciador de senhas.' },
  { k: 'abrir', t: 'Abrir o site', how: 'Vercel → Settings → Environment Variables: VITE_SITE_PRIVATE = 0. Depois Deployments → Redeploy. Para fechar de novo, volte para 1.' },
];

/** Studio: a área da administração. Correções, uso dos planos gratuitos e a lista para abrir o site. */
export function StudioPage() {
  useStore((s) => s.isAdmin);
  const mode = useStore((s) => s.mode);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [err, setErr] = useState('');
  const [queue, setQueue] = useState<number | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(LAUNCH_KEY) || '{}'); } catch { return {}; } });

  useEffect(() => {
    if (!canReview()) return;
    loadUsage().then(setUsage).catch((e) => setErr(e instanceof Error ? e.message : 'Não deu certo agora.'));
    fixesApi.queue('aberta').then((l) => setQueue(l.length)).catch(() => setQueue(null));
  }, [mode]);

  if (!canReview()) return (
    <main className="page pad narrow"><h1 className="t big">Studio</h1><p className="muted lead">Esta área é só da administração do WinnerZ.</p><Link className="btn ghost" to="/">Ir para o início</Link></main>
  );

  const tick = (k: string, v: boolean) => { const n = { ...done, [k]: v }; setDone(n); try { localStorage.setItem(LAUNCH_KEY, JSON.stringify(n)); } catch { /* sem armazenamento */ } };
  const isOpen = !SITE_PRIVATE;
  const auto: Record<string, boolean | undefined> = { abrir: isOpen };
  const storage = usage ? usage.buckets.reduce((a, b) => a + b.bytes, 0) : 0;
  const meters = usage ? [
    { k: 'db', label: 'Banco de dados', value: usage.dbBytes, max: FREE.dbBytes, show: `${fmtBytes(usage.dbBytes)} de 500 MB`, note: `${usage.games} fichas de jogos, ${usage.copies} exemplares, ${usage.journeys} Jornadas.` },
    { k: 'st', label: 'Fotos e imagens', value: storage, max: FREE.storageBytes, show: `${fmtBytes(storage)} de 1 GB`, note: usage.buckets.length ? usage.buckets.map((b) => `${b.bucket}: ${fmtBytes(b.bytes)} (${b.files} arquivos)`).join(' · ') : 'Nenhum arquivo ainda.' },
    { k: 'mau', label: 'Pessoas ativas no mês', value: usage.active30d, max: FREE.mau, show: `${usage.active30d.toLocaleString('pt-BR')} de 50.000`, note: `${usage.users.toLocaleString('pt-BR')} ${usage.users === 1 ? 'conta' : 'contas'} no total, ${usage.new7d} ${usage.new7d === 1 ? 'nova' : 'novas'} nos últimos 7 dias.` },
    { k: 'mail', label: 'Entradas nas últimas 24 h', value: usage.signins24h, max: FREE.emailsDay, show: `${usage.signins24h} ${usage.signins24h === 1 ? 'entrada' : 'entradas'} (o Resend gratuito manda 100 e-mails por dia)`, note: 'Cada entrada costuma gastar um e-mail de link. Se passar de 70 por dia com frequência, é hora do plano pago do Resend.' },
    { k: 'fn', label: 'Funções na Vercel', value: FREE.functionsUsed, max: FREE.functions, show: `${FREE.functionsUsed} de 12`, note: 'O plano gratuito da Vercel aceita até 12 funções por projeto.' },
  ] : [];
  const hot = meters.filter((m) => m.value / m.max >= 0.7);

  return (
    <main className="page pad studio">
      <header className="studio__head">
        <span className="kicker">Administração</span>
        <h1 className="t big">Studio</h1>
        <p className={`studio__state${isOpen ? ' is-open' : ''}`}><b>{isOpen ? 'Site aberto' : 'Site fechado'}</b> {isOpen ? 'Qualquer pessoa pode criar conta e usar o site.' : 'Só a sua conta vê o conteúdo; as outras pessoas veem "Em breve".'}</p>
        {mode === 'demo' && <p className="faint">Na demonstração, os números abaixo são de exemplo.</p>}
      </header>

      <nav className="studio__cards" aria-label="Ferramentas">
        <Link to="/studio/correcoes" className="studio__card"><b>Correções</b><span className="muted">{queue == null ? 'Fila do "Algo errado nesta ficha?" e qualidade dos dados.' : queue ? `${queue} ${queue === 1 ? 'sugestão esperando' : 'sugestões esperando'} revisão.` : 'Fila vazia. Painel de qualidade dos dados.'}</span></Link>
        <Link to="/eventos/awards/admin" className="studio__card"><b>WinnerZ Awards</b><span className="muted">Montar edições, categorias e indicados.</span></Link>
      </nav>

      <InvitesPanel open={isOpen} />

      <section className="studio__sec" aria-labelledby="uso">
        <h2 id="uso" className="t">Uso dos planos gratuitos</h2>
        {err ? <p className="awards__error" role="alert">{err}</p> : !usage ? <p className="faint">Carregando…</p> : (
          <>
            <p className={`studio__verdict${hot.length ? ' is-hot' : ''}`} role="status">
              {hot.length ? <><b>Atenção:</b> {hot.map((m) => m.label.toLowerCase()).join(' e ')} {hot.length === 1 ? 'passou' : 'passaram'} de 70% do gratuito.</> : <><b>Tudo dentro do gratuito.</b> Nada perto do limite.</>}
            </p>
            <ul className="meters">
              {meters.map((m) => {
                const p = Math.min(1, m.value / m.max);
                return (
                  <li key={m.k} className={`meter${p >= 0.7 ? ' is-hot' : ''}`}>
                    <span className="meter__top"><b>{m.label}</b><span className="mono">{Math.round(p * 100)}%</span></span>
                    <span className="meter__bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)} aria-label={m.label}><i style={{ width: `${Math.max(p * 100, p > 0 ? 1.5 : 0)}%` }} /></span>
                    <span className="meter__v">{m.show}{p >= 0.7 && <span className="meter__warn"> · perto do limite</span>}</span>
                    <small className="faint">{m.note}</small>
                  </li>
                );
              })}
            </ul>
            <div className="studio__notes">
              <p><b>IA neste mês:</b> {usage.aiMonth} {usage.aiMonth === 1 ? 'leitura' : 'leituras'} (Retomada e foto das capas). O custo aparece no painel da Anthropic.</p>
              <p><b>O que não dá para ver daqui:</b> o tráfego de saída do Supabase (5 GB por mês no gratuito) e da Vercel. Confira de vez em quando em Supabase → Usage e Vercel → Usage.</p>
              <p><b>Quando pagar:</b> o primeiro a apertar costuma ser o e-mail (100 por dia). Depois, as fotos (1 GB). O Supabase Pro também traz backup diário e não pausa o projeto. Enquanto tudo estiver abaixo de 70%, não há motivo para pagar.</p>
            </div>
          </>
        )}
      </section>

      <section className="studio__sec" aria-labelledby="abrir">
        <h2 id="abrir" className="t">Antes de abrir o site</h2>
        <p className="muted">Marque cada passo quando terminar (fica guardado neste navegador). O último só vale depois de todos os outros.</p>
        <ol className="launch">
          {STEPS.map((st, i) => {
            const on = auto[st.k] ?? !!done[st.k];
            return (
              <li key={st.k} className={`launch__i${on ? ' is-done' : ''}`}>
                <label className="launch__check">
                  <input type="checkbox" checked={on} disabled={auto[st.k] !== undefined} onChange={(e) => tick(st.k, e.target.checked)} />
                  <span className="launch__n mono">{String(i + 1).padStart(2, '0')}</span>
                  <b>{st.t}</b>
                </label>
                <p className="faint">{st.how}</p>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}

const whenBR = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '') : '');

/** Convites: links que liberam o site para pessoas escolhidas enquanto ele está fechado. */
function InvitesPanel({ open }: { open: boolean }) {
  const [list, setList] = useState<Invite[] | null>(null);
  const [label, setLabel] = useState('');
  const [max, setMax] = useState(1);
  const [days, setDays] = useState<number | null>(14);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const reload = () => invitesApi.list().then(setList).catch((e) => setErr(e instanceof Error ? e.message : 'Não deu certo agora.'));
  useEffect(() => { reload(); }, []);

  const create = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!label.trim()) { setErr('Escreva para quem é o convite (só para você lembrar).'); return; }
    setBusy(true); setErr('');
    try { const code = await invitesApi.create(label.trim(), max, days); setFresh(code); setLabel(''); await reload(); }
    catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Não deu certo agora.'); }
    setBusy(false);
  };
  const message = (code: string) => `Oi! Quero te mostrar o WinnerZ antes de abrir para todo mundo. Entra por este convite: ${inviteLink(code)}`;
  const copy = async (code: string, what: 'link' | 'msg') => {
    try { await navigator.clipboard.writeText(what === 'link' ? inviteLink(code) : message(code)); setCopied(`${code}-${what}`); setTimeout(() => setCopied(null), 2000); }
    catch { setErr('Não consegui copiar. Selecione o link e copie à mão.'); }
  };
  const share = (code: string) => navigator.share?.({ title: 'Convite para o WinnerZ', text: message(code) }).catch(() => null);
  const status = (i: Invite) => (i.revoked ? 'Cancelado' : i.expiresAt && Date.parse(i.expiresAt) < Date.now() ? 'Vencido' : i.uses >= i.maxUses ? 'Todo usado' : 'Ativo');

  return (
    <section className="studio__sec" aria-labelledby="conv">
      <h2 id="conv" className="t">Convites</h2>
      <p className="muted">{open ? 'O site está aberto, então os convites não fazem diferença agora. Eles voltam a valer se você fechar o site.' : 'Com o site fechado, só entra quem tiver um convite. Crie um link, mande para quem quiser e acompanhe quem já entrou.'}</p>
      <form className="invform" onSubmit={create}>
        <label className="invform__f"><span>Para quem</span><input className="field" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} placeholder="Ex.: Lucas, ou Galera do Discord" /></label>
        <label className="invform__f invform__f--s"><span>Quantas pessoas</span>
          <select className="field" value={max} onChange={(e) => setMax(Number(e.target.value))}>{[1, 2, 3, 5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        </label>
        <label className="invform__f invform__f--s"><span>Vale por</span>
          <select className="field" value={days ?? 0} onChange={(e) => setDays(Number(e.target.value) || null)}>
            <option value={7}>7 dias</option><option value={14}>14 dias</option><option value={30}>30 dias</option><option value={0}>Sem prazo</option>
          </select>
        </label>
        <button className="btn primary" disabled={busy}>{busy ? 'Criando…' : 'Criar convite'}</button>
      </form>
      {err && <p className="awards__error" role="alert">{err}</p>}
      {fresh && (
        <div className="invnew" role="status">
          <b>Convite criado.</b> Mande o link para a pessoa:
          <code className="invnew__link">{inviteLink(fresh)}</code>
          <div className="acct__row">
            <button className="btn primary sm" onClick={() => copy(fresh, 'msg')}>{copied === `${fresh}-msg` ? 'Copiado!' : 'Copiar mensagem com o link'}</button>
            <button className="btn ghost sm" onClick={() => copy(fresh, 'link')}>{copied === `${fresh}-link` ? 'Copiado!' : 'Copiar só o link'}</button>
            {typeof navigator !== 'undefined' && 'share' in navigator && <button className="btn ghost sm" onClick={() => share(fresh)}>Compartilhar</button>}
          </div>
        </div>
      )}
      {list == null ? <p className="faint">Carregando…</p> : list.length === 0 ? <p className="faint">Nenhum convite ainda.</p> : (
        <ul className="invlist">
          {list.map((i) => {
            const st = status(i);
            return (
              <li key={i.code} className={`invitem${st === 'Ativo' ? '' : ' is-off'}`}>
                <div className="invitem__top">
                  <b>{i.label}</b>
                  <span className={`invitem__st${st === 'Ativo' ? ' is-on' : ''}`}>{st}</span>
                  <span className="faint">{i.uses} de {i.maxUses} {i.maxUses === 1 ? 'pessoa' : 'pessoas'}{i.expiresAt ? ` · até ${whenBR(i.expiresAt)}` : ' · sem prazo'}</span>
                </div>
                {st === 'Ativo' && (
                  <div className="invitem__acts">
                    <button className="btn quiet sm" onClick={() => copy(i.code, 'msg')}>{copied === `${i.code}-msg` ? 'Copiado!' : 'Copiar convite'}</button>
                    <ConfirmButton className="btn quiet sm" label="Cancelar link" confirm="Toque de novo para cancelar" onConfirm={() => invitesApi.revoke(i.code).then(reload)} />
                  </div>
                )}
                {i.guests.length > 0 && (
                  <ul className="invitem__guests">
                    {i.guests.map((g) => (
                      <li key={g.userId}>
                        <span>{g.handle ? <Link to={`/@${g.handle}`}>@{g.handle}</Link> : g.name ?? 'Sem apelido ainda'}<small className="faint"> · entrou {whenBR(g.joinedAt)}</small></span>
                        <ConfirmButton className="btn quiet sm" label="Tirar acesso" confirm="Toque de novo para tirar" onConfirm={() => invitesApi.removeGuest(g.userId).then(reload)} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
