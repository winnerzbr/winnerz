import { useEffect, useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import { socialApi } from '../data/socialApi';
import { communityApi, useReplyNews, type Community, type Post } from '../data/communityApi';
import { FriendsActivity, GoToProfile } from '../components/Social';
import { PersonAvatar, PostCard, ago } from '../components/Posts';
import { CommunityTile } from './Communities';
import { ClubsSection } from './Clubs';

/** Pilar Comunidade: respostas novas, o que saiu nas suas comunidades, comunidades para participar e os amigos. */
export function CommunityPage() {
  useEffect(() => { document.title = 'Comunidade · WinnerZ'; }, []);
  return (
    <main className="community">
      <section className="cmh">
        <div className="cmh__line" aria-hidden="true" />
        <div className="cmh__glow" aria-hidden="true" />
        <span className="cmh__dot" aria-hidden="true" />
        <div className="page cmh__inner">
          <span className="kicker kicker--now">Comunidades no ar</span>
          <h1 className="t cmh__title">Comunidade</h1>
          <p className="cmh__lead">Um lugar para jogar perto de quem joga o mesmo que você. Comunidades por assunto, clubes para jogar junto, conversas com spoiler coberto pelo seu progresso e os seus amigos. Jogatinas e Jornadas em dupla vêm a seguir.</p>
          <div className="cmh__ctas">
            <Link className="btn primary cmh__cta" to="/comunidade/comunidades">Ver as comunidades</Link>
            <Link className="btn ghost cmh__cta" to="/comunidade/clubes">Clubes</Link>
            <Link className="btn ghost cmh__cta" to="/comunidade/pessoas">Encontrar pessoas</Link>
          </div>
        </div>
      </section>
      <ReplyNewsBox />
      <MyCommunities />
      <ClubsSection />
      <Friends />
    </main>
  );
}

/** Respostas novas nas suas postagens e nas suas respostas. */
function ReplyNewsBox() {
  const news = useReplyNews();
  if (!news || news.count === 0) return null;
  return (
    <section className="page cm-news" aria-labelledby="cm-news-t">
      <div className="cm-news__head">
        <h2 id="cm-news-t" className="cm-news__t"><span className="nav-badge">{news.count}</span>{news.count === 1 ? 'Novidade' : 'Novidades'} para você</h2>
        <button className="btn quiet sm" onClick={() => void communityApi.seen()}>Marcar como vistas</button>
      </div>
      <ul className="cm-news__list">
        {news.items.map((n) => {
          const href = n.kind === 'resposta' ? `/w/${n.slug}/${n.ref}#r-${n.id}` : n.kind === 'clube_resposta' ? `/clube/${n.slug}#m-${n.id}` : `/clube/${n.slug}`;
          const who = n.author?.handle ? `@${n.author.handle}` : 'Alguém';
          const line = n.kind === 'resposta' ? <><b>{who}</b> respondeu em <b>{n.title}</b></>
            : n.kind === 'clube_resposta' ? <><b>{who}</b> respondeu você no clube <b>{n.title}</b></>
            : n.kind === 'encontro' ? <>Encontro <b>{n.title}</b> {Date.parse(n.at) + 12 * 3600_000 <= Date.now() ? 'está acontecendo' : 'é hoje'}</>
            : <>Abriu a parte <b>{n.excerpt}</b> no clube <b>{n.title}</b></>;
          return (
            <li key={`${n.kind}-${n.id}`}>
              <Link to={href} className={`cm-news__it${n.new === false ? ' is-old' : ''}`}>
                {n.author ? <PersonAvatar p={n.author} size={32} /> : <span className="soc-av cm-news__ic" style={{ width: 32, height: 32 }} aria-hidden="true">{n.kind === 'encontro' ? '◷' : '▸'}</span>}
                <span className="cm-news__tx"><span>{line}</span>{(n.kind === 'resposta' || n.kind === 'clube_resposta') && n.excerpt && <small className="muted">{n.excerpt}</small>}</span>
                <small className="faint mono">{ago(n.at)}</small>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** O que saiu nas comunidades de que você participa, e comunidades para participar. */
function MyCommunities() {
  const mode = useStore((s) => s.mode);
  const signed = useStore((s) => !!s.profile);
  const [feed, setFeed] = useState<Post[] | null>(null);
  const [mine, setMine] = useState<Community[]>([]);
  const [all, setAll] = useState<Community[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    const can = mode === 'demo' || signed;
    Promise.all([can ? communityApi.feed() : Promise.resolve([]), can ? communityApi.mine() : Promise.resolve([]), communityApi.list()])
      .then(([f, m, a]) => { if (alive) { setFeed(f); setMine(m); setAll(a); } })
      .catch((e) => { if (alive) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); setFeed([]); } });
    return () => { alive = false; };
  }, [mode, signed]);
  const suggest = all.filter((c) => !c.role).slice(0, 6);
  return (
    <section className="page cm-mine" aria-labelledby="cm-mine-t">
      <div className="cm-friends__head">
        <div>
          <span className="kicker kicker--now">Suas comunidades</span>
          <h2 id="cm-mine-t" className="t cm-friends__t">O que saiu de novo</h2>
        </div>
        <Link to="/comunidade/comunidades" className="cm-friends__people">Todas as comunidades →</Link>
      </div>
      <div className="cm-friends__grid">
        <div className="cm-list">
          {err && <p className="awards__error" role="alert">{err}</p>}
          {feed == null ? <p className="faint">Carregando…</p> : feed.length === 0 ? (
            <div className="soc-empty"><b>{mine.length ? 'Nada novo nas suas comunidades.' : 'Você ainda não participa de nenhuma comunidade.'}</b><p className="muted">Entre em uma comunidade (ou crie a sua) e o que sair nela aparece aqui, do mais novo para o mais antigo.</p></div>
          ) : feed.map((p) => <PostCard key={p.id} post={p} showCommunity />)}
        </div>
        <aside className="cm-friends__side cm-mine__side">
          {mine.length > 0 && <>
            <span className="kicker">Você participa</span>
            <ul className="cm-mine__list">{mine.map((c) => <li key={c.id}><Link to={`/w/${c.slug}`}><span className="mono faint">w/</span>{c.slug}{c.role === 'dono' && <small className="faint"> · sua</small>}</Link></li>)}</ul>
          </>}
          <Link className="btn ghost sm" to="/comunidade/criar">Criar comunidade</Link>
        </aside>
      </div>
      {suggest.length > 0 && (
        <div className="cm-suggest">
          <span className="kicker">Para participar</span>
          <div className="cm-tiles">{suggest.map((c) => <CommunityTile key={c.id} c={c} />)}</div>
        </div>
      )}
    </section>
  );
}

/** Seus amigos: o que andaram jogando, e o atalho para as listas de pessoas. */
function Friends() {
  const mode = useStore((s) => s.mode);
  const signed = useStore((s) => !!s.profile);
  const [n, setN] = useState<{ friends: number; followers: number; following: number } | null>(null);
  useEffect(() => {
    if (mode === 'supabase' && !signed) return;
    socialApi.people().then((p) => setN({ friends: p.following.filter((x) => x.mutual).length, followers: p.followers.length, following: p.following.length })).catch(() => setN(null));
  }, [mode, signed]);
  if (mode === 'supabase' && !signed) return null;
  return (
    <section className="page cm-friends" aria-labelledby="cm-f-t">
      <div className="cm-friends__head">
        <div>
          <span className="kicker kicker--now">Seus amigos</span>
          <h2 id="cm-f-t" className="t cm-friends__t">O que andaram jogando</h2>
        </div>
        <Link to="/comunidade/pessoas" className="cm-friends__people">
          {n ? <><b>{n.friends}</b> {n.friends === 1 ? 'amigo' : 'amigos'} · <b>{n.following}</b> seguindo · <b>{n.followers}</b> {n.followers === 1 ? 'seguidor' : 'seguidores'}</> : 'Pessoas'} →
        </Link>
      </div>
      <div className="cm-friends__grid">
        <FriendsActivity />
        <aside className="cm-friends__side">
          <span className="kicker">Achar alguém</span>
          <GoToProfile />
          <p className="faint">Só aparece aqui o que cada pessoa deixou ver: o pilar Jornada aberto para todos ou só para amigos.</p>
        </aside>
      </div>
    </section>
  );
}
