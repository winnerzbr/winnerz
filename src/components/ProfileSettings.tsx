import { useEffect, useState } from 'react';
import { Link } from '../lib/router';
import { actions, useStore } from '../data/store';
import { HANDLE_RE, PILLARS, linkLabel, profileApi, profileUrl, visOf, type MyProfile, type MyVisibility, type ProfileLink, type ProfileStage } from '../data/profileApi';
import { ensureRules } from '../data/moderationApi';
import { StageSettings, stageKey } from './StageSettings';
import { AvatarEditor } from './AvatarEditor';

const OPTS: { v: 'privado' | 'amigos' | 'link' | 'publico'; label: string }[] = [
  { v: 'privado', label: 'Só você' },
  { v: 'amigos', label: 'Só amigos' },
  { v: 'link', label: 'Quem tem o link' },
  { v: 'publico', label: 'Todo mundo' },
];

/** Preferências → Perfil e privacidade: endereço, apresentação e quem vê cada pilar. Tudo começa privado. */
export function ProfileSettings() {
  const mode = useStore((s) => s.mode);
  const profile = useStore((s) => s.profile);
  const [mine, setMine] = useState<MyProfile | null>(null);
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [vis, setVis] = useState<MyVisibility>({});
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [stage, setStage] = useState<ProfileStage>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (mode === 'supabase' && !profile) return;
    profileApi.mine().then((p) => {
      setMine(p); setHandle(p?.handle ?? ''); setBio(p?.bio ?? ''); setVis(p?.visibility ?? {}); setLinks(p?.links ?? []); setStage(p?.stage ?? {});
    }).catch((e) => setMsg({ err: e instanceof Error ? e.message : 'Não consegui carregar o perfil.' }));
  }, [mode, profile]);

  if (mode === 'supabase' && !profile) return <p className="muted prefs__p">Entre na sua conta para ter um perfil.</p>;

  const h = handle.trim();
  const badHandle = !!h && !HANDLE_RE.test(h);
  const cleanLinks = links.filter((l) => l.url.trim());
  const badLink = cleanLinks.some((l) => !/^https:\/\/\S{3,200}$/.test(l.url.trim()));
  const linksDirty = !!mine && JSON.stringify(cleanLinks.map((l) => l.url.trim())) !== JSON.stringify((mine.links ?? []).map((l) => l.url));
  const stageDirty = !!mine && stageKey(stage) !== stageKey(mine.stage);
  const dirty = !!mine && (stageDirty || h !== (mine.handle ?? '') || bio.trim() !== (mine.bio ?? '') || (vis.aoVivo ?? 'nao') !== (mine.visibility?.aoVivo ?? 'nao') || linksDirty || PILLARS.some((p) => (vis[p.key] ?? 'privado') !== visOf(mine, p.key)));
  const savedOpen = !!mine && PILLARS.some((p) => visOf(mine, p.key) !== 'privado');
  const usesLink = !!mine && PILLARS.some((p) => visOf(mine, p.key) === 'link');
  const url = mine && savedOpen ? profileUrl(mine) : null;

  const save = async () => {
    if (!h) { setMsg({ err: 'Escolha o seu @.' }); return; }
    // Abrir qualquer pilar deixa algo público: antes, as regras da comunidade (só na primeira vez).
    if (PILLARS.some((x) => (vis[x.key] ?? 'privado') !== 'privado') && !(await ensureRules())) {
      setMsg({ err: 'Para abrir o perfil, é preciso aceitar as regras da comunidade.' }); return;
    }
    setBusy(true); setMsg({});
    try {
      let p = await profileApi.save(h, bio, { ...Object.fromEntries(PILLARS.map((x) => [x.key, vis[x.key] ?? 'privado'])), aoVivo: vis.aoVivo ?? 'nao' });
      if (linksDirty) p = await profileApi.setLinks(cleanLinks);
      if (stageDirty) p = await profileApi.setStage(stage);
      setMine(p); setHandle(p.handle ?? ''); setBio(p.bio ?? ''); setVis(p.visibility ?? {}); setLinks(p.links ?? []); setStage(p.stage ?? {});
      if (p.handle) actions.setProfileName(p.handle);
      setMsg({ ok: 'Perfil gravado.' });
    } catch (e) { setMsg({ err: e instanceof Error ? e.message : 'Não deu certo.' }); }
    setBusy(false);
  };
  const rotate = async () => {
    setBusy(true); setMsg({});
    try { setMine(await profileApi.rotateKey()); setMsg({ ok: 'Link trocado. O link antigo parou de funcionar.' }); }
    catch (e) { setMsg({ err: e instanceof Error ? e.message : 'Não deu certo.' }); }
    setBusy(false);
  };
  const copy = async () => { if (!url) return; try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* sem área de transferência */ } };

  return (
    <div className="pfs">
      <p className="muted prefs__p">Tudo começa só seu. Escolha, pilar por pilar, quem pode ver. Recados, fotos, sessões, preços e com quem você jogou nunca aparecem no perfil.</p>

      <AvatarEditor />

      <label className="pfs__field">
        <span>Seu @</span>
        <span className="pfs__handle"><span className="pfs__prefix">@</span><input className="field" value={handle} onChange={(e) => setHandle(e.target.value.replace(/\s/g, ''))} placeholder="SeuNick" maxLength={24} autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={badHandle} /></span>
        {badHandle ? <small className="pfs__err">De 3 a 24 letras, números ou _ (sem espaço nem acento).</small>
          : <small className="faint">É o seu nome no site inteiro. Seu perfil fica em winnerz.com.br/@{(h || 'seunick').toLowerCase()}.</small>}
      </label>

      <label className="pfs__field">
        <span>Apresentação <small className="faint">{bio.length}/160</small></span>
        <textarea className="field pfs__bio" value={bio} maxLength={160} rows={2} onChange={(e) => setBio(e.target.value)} placeholder="Uma linha sobre você e seus jogos." />
        <small className="faint">Aparece como a sua frase, logo abaixo do nome.</small>
      </label>

      <StageSettings stage={stage} onChange={setStage} />

      <div className="pfs__pillars">
        {PILLARS.map((p) => (
          <div key={p.key} className="pfs__pillar">
            <div className="pfs__ptext"><b>{p.label}</b><small>{p.hint}</small></div>
            <div className="seg pfs__seg" role="group" aria-label={`Quem vê: ${p.label}`}>
              {OPTS.map((o) => <button key={o.v} aria-pressed={(vis[p.key] ?? 'privado') === o.v} onClick={() => setVis((x) => ({ ...x, [p.key]: o.v }))}>{o.label}</button>)}
            </div>
          </div>
        ))}
      </div>

      <label className="pfs__check">
        <input type="checkbox" checked={vis.aoVivo === 'sim'} onChange={(e) => setVis((x) => ({ ...x, aoVivo: e.target.checked ? 'sim' : 'nao' }))} />
        <span><b>Mostrar quando estou jogando</b><small>Com uma sessão aberta, o perfil mostra "Jogando agora" com o jogo e desde quando. Bom para quem acompanha as lives. Só aparece para quem pode ver a sua Jornada.</small></span>
      </label>

      <div className="pfs__field pfs__links">
        <span>Links do canal</span>
        {links.map((l, i) => (
          <span key={i} className="pfs__link">
            <input className="field" value={l.url} placeholder="https://youtube.com/@seucanal" onChange={(e) => setLinks((x) => x.map((y, k) => (k === i ? { ...y, url: e.target.value } : y)))} aria-label={`Link ${i + 1}`} />
            <span className="pfs__ltag">{l.url.trim() ? linkLabel({ url: l.url.trim() }) : ''}</span>
            <button className="btn quiet sm" onClick={() => setLinks((x) => x.filter((_, k) => k !== i))} aria-label="Tirar link">Tirar</button>
          </span>
        ))}
        {links.length < 6 && <button className="btn ghost sm pfs__add" onClick={() => setLinks((x) => [...x, { url: '' }])}>Adicionar link</button>}
        {badLink && <small className="pfs__err">Os links precisam começar com https://</small>}
      </div>

      <div className="acct__row">
        <button className="btn primary" onClick={save} disabled={busy || !dirty || badHandle || badLink}>{busy ? 'Gravando…' : 'Gravar perfil'}</button>
      </div>
      {msg.err && <p className="awards__error" role="alert">{msg.err}</p>}
      {msg.ok && <p className="acct__note" role="status">{msg.ok}</p>}

      {url && (
        <div className="pfs__share">
          <span className="kicker">{usesLink ? 'Seu link (com o código para os pilares "quem tem o link")' : 'Seu perfil'}</span>
          <code className="pfs__url">{url}</code>
          <div className="acct__row">
            <button className="btn ghost sm" onClick={copy}>{copied ? 'Copiado' : 'Copiar link'}</button>
            <Link className="btn ghost sm" to={url.replace(location.origin, '')}>Ver como os outros veem</Link>
            {usesLink && <button className="btn quiet sm" onClick={rotate} disabled={busy}>Trocar o código do link</button>}
          </div>
        </div>
      )}
    </div>
  );
}
