import { useEffect } from 'react';
import { Link } from '../lib/router';
import { BrandMark } from '../components/Brand';

const UPDATED = '13 de outubro de 2026';

/** Privacidade em linguagem simples: o que o WinnerZ guarda, por quê, quem vê e o que você pode fazer. */
export function PrivacyPage({ standalone = false }: { standalone?: boolean }) {
  useEffect(() => { document.title = 'Privacidade · WinnerZ'; }, []);
  return (
    <main className={`page pad narrow privacy${standalone ? ' privacy--alone' : ''}`}>
      {standalone && <Link to="/" className="privacy__brand" aria-label="WinnerZ"><BrandMark width={48} /></Link>}
      <p className="kicker">Atualizada em {UPDATED}</p>
      <h1 className="t privacy__title">Privacidade</h1>
      <p className="privacy__lead">O WinnerZ guarda as suas histórias com jogos. Elas são suas: você vê tudo o que guardamos, leva tudo embora quando quiser e apaga quando quiser.</p>

      <section>
        <h2 className="t">Em resumo</h2>
        <ul>
          <li>Não vendemos seus dados e não há anúncios.</li>
          <li>O que você registra é só seu. Nada aparece para outras pessoas sem você escolher publicar.</li>
          <li>Você pode baixar tudo e apagar a conta a qualquer momento, em <Link to="/preferencias#dados">Preferências</Link>.</li>
        </ul>
      </section>

      <section>
        <h2 className="t">O que guardamos</h2>
        <dl className="privacy__dl">
          <dt>Sua conta</dt><dd>O e-mail com que você entra e o nome que aparece no site. O e-mail serve só para o login.</dd>
          <dt>Sua Jornada</dt><dd>Jogos que você começou, sessões, momentos, pontos para voltar, recados, fotos que você envia, progresso, com quem jogou (os nomes que você escrever) e como se sentiu.</dd>
          <dt>Sua coleção</dt><dd>Os jogos que você tem, plataformas, edições, estado e, se você informar, quanto pagou e onde comprou. Também seus desejos e favoritos.</dd>
          <dt>Notas e análises</dt><dd>As notas e os textos que você escreve sobre os jogos.</dd>
          <dt>Votos do Awards</dt><dd>Um voto por categoria. Ninguém vê o voto de ninguém: no resultado só aparecem os totais.</dd>
          <dt>Perfil</dt><dd>O endereço e a apresentação que você escolher, e quem pode ver cada parte.</dd>
          <dt>Preferências</dt><dd>Tema, escala de notas, animações e os jogos em foco.</dd>
        </dl>
      </section>

      <section>
        <h2 className="t">Por quê</h2>
        <p>Só para o site funcionar para você: lembrar onde você parou, montar sua linha do tempo, sugerir o que jogar e mostrar sua coleção. Nada é usado para propaganda.</p>
      </section>

      <section>
        <h2 className="t">Quem vê</h2>
        <ul>
          <li><b>Só você</b> vê sua Jornada, sua coleção, suas fotos e seus votos.</li>
          <li><b>Números anônimos dos jogos:</b> a ficha de cada jogo e a sua Jornada mostram contas de todo mundo que registrou aquele jogo (quantos zeraram, quanto tempo levaram, onde costumam pausar). Nunca aparecem nomes, listas de pessoas, recados, fotos ou textos, e nada é mostrado com menos de 5 pessoas.</li>
          <li><b>As análises que você publica</b> aparecem na ficha do jogo com o seu nome, para quem visita o site.</li>
          <li><b>O que você escreve nas comunidades</b> (postagens, respostas e reações) aparece com o seu @ para quem abre a comunidade. Nos clubes, só para quem pode ver o clube.</li>
          <li><b>Seu perfil</b> (winnerz.com.br/@seunome) mostra só o que você liberar, pilar por pilar: para todo mundo, só para quem tem o seu link, ou para ninguém. Tudo começa privado. Se você marcar uma Jornada para aparecer no perfil, ela mostra o início, as datas das sessões, os momentos (com legenda e foto) e os marcos daquele jogo; recados, pontos para voltar, cartas, preços e com quem você jogou nunca aparecem. "Jogando agora" (a sessão aberta) só aparece se você ligar.</li>
        </ul>
      </section>

      <section>
        <h2 className="t">Onde fica e quem ajuda</h2>
        <ul>
          <li><b>Supabase</b> guarda o banco de dados, o login e as fotos.</li>
          <li><b>Vercel</b> hospeda o site.</li>
          <li><b>IGDB</b> fornece as informações públicas dos jogos (capas, datas, estúdios). Não recebe nada seu. Mais em <Link to="/sobre">Sobre</Link>.</li>
          <li><b>Retomada Inteligente:</b> quando você pede para a IA ler uma foto da tela, a imagem vai para a Anthropic (Claude), que lê e devolve a sugestão. O WinnerZ não guarda essa foto; ela só vira registro se você confirmar.</li>
          <li><b>Importar da Steam:</b> quando você pede, lemos a lista de jogos e horas do seu perfil público da Steam.</li>
        </ul>
      </section>

      <section>
        <h2 className="t">Contagem de uso</h2>
        <p>Para saber quais partes do site são usadas, contamos o nome do recurso e o dia (por exemplo, "linha do tempo aberta hoje"). A contagem não leva seu nome, seu e-mail nem nada que identifique você.</p>
        <p>Neste aparelho, o navegador guarda suas preferências de aparência e o seu login, para você não precisar entrar de novo a cada visita.</p>
      </section>

      <section>
        <h2 className="t">O que você pode fazer</h2>
        <ul>
          <li><b>Ver e corrigir:</b> qualquer registro pode ser editado ou apagado onde ele aparece.</li>
          <li><b>Levar embora:</b> "Baixar tudo" entrega um arquivo com todos os seus dados e fotos.</li>
          <li><b>Apagar a conta:</b> você tem 7 dias para desistir; depois apagamos tudo, inclusive as fotos e as imagens das conversas. Onde outras pessoas já responderam a você, a conversa delas fica, sem o seu nome, o seu texto e as suas imagens.</li>
        </ul>
        <p>Esses são direitos seus pela Lei Geral de Proteção de Dados (LGPD). Dúvidas: fale com a gente pelas redes do canal WinnerZ.</p>
      </section>
    </main>
  );
}
