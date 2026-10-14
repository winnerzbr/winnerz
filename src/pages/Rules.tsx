import { useEffect } from 'react';
import { Link } from '../lib/router';
import { BrandMark } from '../components/Brand';
import { RULES, RULES_CONSEQUENCES, RULES_UPDATED } from '../lib/rules';

const updated = new Date(`${RULES_UPDATED}T12:00:00Z`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });

/** Regras da comunidade: curtas, no tom do site, com o que acontece quando alguém descumpre. */
export function RulesPage({ standalone = false }: { standalone?: boolean }) {
  useEffect(() => { document.title = 'Regras da comunidade · WinnerZ'; }, []);
  return (
    <main className={`page pad narrow privacy rules${standalone ? ' privacy--alone' : ''}`}>
      {standalone && <Link to="/" className="privacy__brand" aria-label="WinnerZ"><BrandMark width={48} /></Link>}
      <p className="kicker kicker--now">Atualizadas em {updated}</p>
      <h1 className="t privacy__title">Regras da comunidade</h1>
      <p className="privacy__lead">O WinnerZ é um lugar para guardar histórias com jogos e, se você quiser, mostrar algumas delas. Para isso funcionar para todo mundo, combinamos cinco coisas.</p>

      <ol className="rules__list">
        {RULES.map((r, i) => (
          <li key={r.title} className="rules__item">
            <span className="rules__n mono" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h2 className="t rules__t">{r.title}</h2>
              <p>{r.text}</p>
              {r.examples && <ul className="rules__ex">{r.examples.map((x) => <li key={x}>{x}</li>)}</ul>}
            </div>
          </li>
        ))}
      </ol>

      <section>
        <h2 className="t">Se alguém descumprir</h2>
        <dl className="privacy__dl">
          {RULES_CONSEQUENCES.map((c) => <div key={c.title} style={{ display: 'contents' }}><dt>{c.title}</dt><dd>{c.text}</dd></div>)}
        </dl>
      </section>

      <section>
        <h2 className="t">O que você pode fazer</h2>
        <ul>
          <li><b>Denunciar:</b> nos perfis, nas Jornadas, nas fotos, nas vitrines e nos Museus há um botão “Denunciar”. Ninguém fica sabendo quem denunciou.</li>
          <li><b>Silenciar:</b> o que é da pessoa deixa de aparecer para você. Ela não fica sabendo.</li>
          <li><b>Bloquear:</b> a pessoa deixa de ver o seu perfil enquanto estiver na conta dela. Ela também não é avisada.</li>
          <li>Quem você bloqueou ou silenciou fica em <Link to="/preferencias#perfil">Preferências</Link>, e dá para desfazer quando quiser.</li>
        </ul>
      </section>

      <p className="muted">O que é só seu (o diário, a coleção, as notas que você não publicou) não passa pela moderação. Ela só olha o que você escolheu mostrar. Veja também a página de <Link to="/privacidade">Privacidade</Link>.</p>
    </main>
  );
}
