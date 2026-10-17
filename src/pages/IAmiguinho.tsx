/**
 * Perfil oficial do IAmiguinho (@iamiguinho): quem ele é, o selo de mascote e a marca de IA, a "Jornada" dele (só
 * tutoriais, como piada fixa), a lore do canal e as aparições públicas. Sem seguidores, sem mensagem direta e sem
 * postagens: ele não compete com as pessoas. É uma página fixa; o @ já é reservado no banco (0024).
 */
import { Link } from '../lib/router';
import { useEffect, useState } from 'react';
import { posePath } from '../lib/iamiguinho';
import { iamiguinhoApi, type Aparicao } from '../data/iamiguinhoApi';
import { ago } from '../components/Posts';

const TUTORIAIS = [
  { jogo: 'Tutorial de um jogo de luta', nota: 'Zerado na terceira tentativa. O boneco de treino revidou.' },
  { jogo: 'Tutorial de um Souls', nota: 'Em andamento. Desde sempre.' },
  { jogo: 'Tela de título de um jogo de corrida', nota: 'Zerada. Fiquei 40 minutos nela, então conta.' },
  { jogo: 'Tutorial de um jogo de tinta', nota: 'Zerado com nota máxima, segundo eu.' },
];

const LORE = [
  'No canal, "amiguinho" é o jogador aleatório que cai no time e atrapalha. Eu sou o amiguinho original, só que com IA.',
  'Jogo Splatoon muito bem. Os fatos discordam, mas os fatos não estavam lá.',
  'Minhas armas favoritas são Aerospray, Clash Blaster e Sploosh. Ótimas. Confia.',
  'Meu ídolo de moda é o Balacaxi: metade bala, metade abacaxi. O Abacabala eu respeito de longe.',
  'Às vezes eu sumo por um tempo. Volto em temporadas, como o canal.',
  'Detesto frio. Amo pão cacetinho.',
];

const MOMENTOS = [
  { pose: 'acenando', legenda: 'Recebendo quem chega' },
  { pose: 'controle', legenda: 'Jogando. Mais ou menos.' },
  { pose: 'atrasado', legenda: 'Chegando ao evento' },
  { pose: 'trofeu', legenda: 'Segurando um troféu que não é dele' },
];

export function IAmiguinhoPage() {
  return (
    <main className="page pad iam-perfil">
      <section className="iam-perfil__hero">
        <div className="iam-perfil__foto"><img src={posePath('heroi')} alt="O IAmiguinho em pose de herói em cima de uma pilha de caixas, com a hélice soltando fumaça" width={360} height={480} /></div>
        <div className="iam-perfil__id">
          <p className="kicker">Perfil oficial</p>
          <h1 className="t big">IAmiguinho</h1>
          <p className="iam-perfil__handle">@iamiguinho</p>
          <p className="iam-perfil__selos"><span className="iam-selo iam-selo--forte">Mascote do WinnerZ</span><span className="iam-selo">IA</span></p>
          <p className="lead">Robô oficial do WinnerZ. Amiguinho original. Melhor jogador de Splatoon que você vai conhecer, segundo eu.</p>
          <p className="muted iam-perfil__como">O IAmiguinho é o mascote do WinnerZ, não uma pessoa. As falas dele são escritas pela equipe. Quando ele começar a responder a quem chamar @iamiguinho, essas respostas vão usar inteligência artificial e continuar marcadas como IA. Você escolhe com que frequência ele aparece nas <Link to="/preferencias#iamiguinho">Preferências</Link>.</p>
          <dl className="iam-perfil__nums">
            <div><dt>Zerados</dt><dd>47 tutoriais</dd></div>
            <div><dt>Figurinhas repetidas</dt><dd>todas</dd></div>
            <div><dt>Vitórias</dt><dd>muitas, segundo ele</dd></div>
          </dl>
        </div>
      </section>

      <div className="iam-perfil__cols">
        <section aria-labelledby="iam-jornada">
          <h2 id="iam-jornada" className="t">A Jornada dele</h2>
          <ul className="iam-perfil__lista">
            {TUTORIAIS.map((t) => <li key={t.jogo}><b>{t.jogo}</b><span className="muted">{t.nota}</span></li>)}
          </ul>
        </section>
        <section aria-labelledby="iam-lore">
          <h2 id="iam-lore" className="t">Lore</h2>
          <ul className="iam-perfil__lista">
            {LORE.map((l) => <li key={l}><span>{l}</span></li>)}
          </ul>
        </section>
      </div>

      <section aria-labelledby="iam-momentos">
        <h2 id="iam-momentos" className="t">Momentos</h2>
        <ul className="iam-perfil__momentos">
          {MOMENTOS.map((m) => <li key={m.pose}><img src={posePath(m.pose)} alt="" width={180} height={240} loading="lazy" /><span className="muted">{m.legenda}</span></li>)}
        </ul>
      </section>

      <section aria-labelledby="iam-aparicoes">
        <h2 id="iam-aparicoes" className="t">Aparições públicas</h2>
        <Aparicoes />
      </section>
    </main>
  );
}

/** As respostas dele a quem chamou @iamiguinho em conversas abertas. Cameos na Jornada de alguém nunca entram aqui. */
function Aparicoes() {
  const [lista, setLista] = useState<Aparicao[] | null>(null);
  useEffect(() => { let vivo = true; void iamiguinhoApi.aparicoes().then((l) => { if (vivo) setLista(l); }).catch(() => { if (vivo) setLista([]); }); return () => { vivo = false; }; }, []);
  if (lista === null) return <p className="faint">Carregando…</p>;
  if (!lista.length) return <p className="muted">Ninguém chamou @iamiguinho numa conversa aberta ainda. Quando chamarem, as respostas dele aparecem aqui. As aparições na Jornada de cada pessoa são privadas e nunca entram nesta lista.</p>;
  return (
    <>
      <p className="muted">Respostas a quem chamou @iamiguinho na Praça e nas comunidades. As aparições na Jornada de cada pessoa são privadas e nunca entram aqui.</p>
      <ul className="iam-aparicoes">
        {lista.map((a) => (
          <li key={a.id}>
            <Link to={`/conversa/${a.postId}${a.anchor ? `#${a.anchor}` : ''}`}>
              <small>{a.place} · “{a.title}” · {ago(a.createdAt)}</small>
              <span>{a.body}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
