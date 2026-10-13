import type { ReactNode } from 'react';
import { Link } from '../lib/router';

const FEATURES: { title: string; text: string; icon: ReactNode; lit?: boolean }[] = [
  {
    title: 'Feed e discussões',
    text: 'Conversas por jogo, sem algoritmo decidindo o que você vê.',
    icon: <path d="M4 5h16v10H9l-5 4z" />,
  },
  {
    title: 'Proteção de spoiler pelo seu progresso',
    text: 'Se você está em 46%, o que vem depois fica coberto. Você decide quando ver.',
    icon: <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />,
    lit: true,
  },
  {
    title: 'Jornada em dupla',
    text: 'Duas pessoas, uma História. As sessões de cada um aparecem na mesma linha do tempo.',
    icon: <><circle cx="8" cy="9" r="3.6" /><circle cx="16.5" cy="9" r="3.6" /><path d="M2 21c1-4 3.6-6 6-6s5 2 6 6M13.4 15.4c1-.3 2-.4 3.1-.4 2.6 0 5 2 5.5 6" /></>,
  },
];

/** Pilar Comunidade: ainda não chegou. A página conta o que vem. */
export function CommunityPage() {
  return (
    <main className="community">
      <section className="cmh">
        <div className="cmh__line" aria-hidden="true" />
        <div className="cmh__glow" aria-hidden="true" />
        <span className="cmh__dot" aria-hidden="true" />
        <div className="page cmh__inner">
          <span className="kicker kicker--now">Em breve</span>
          <h1 className="t cmh__title">Comunidade</h1>
          <p className="cmh__lead">Um lugar para jogar perto de quem joga o mesmo que você. Lobby, comunidades, jogatinas e Jornadas em dupla.</p>
          <Link className="btn ghost cmh__cta" to="/jornada">Enquanto isso, abrir sua Jornada</Link>
        </div>
      </section>
      <section className="page cmf">
        {FEATURES.map((f) => (
          <article key={f.title} className={`cmf__card${f.lit ? ' is-lit' : ''}`}>
            <span className="cmf__ic" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">{f.icon}</svg></span>
            <h2 className="t cmf__title">{f.title}</h2>
            <p>{f.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
