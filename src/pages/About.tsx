import { useEffect } from 'react';
import { Link } from '../lib/router';
import { BrandMark } from '../components/Brand';

/** Sobre o WinnerZ: o que é e de onde vêm as informações dos jogos (o único lugar que nomeia a fonte). */
export function AboutPage({ standalone = false }: { standalone?: boolean }) {
  useEffect(() => { document.title = 'Sobre · WinnerZ'; }, []);
  return (
    <main className={`page pad narrow privacy about${standalone ? ' privacy--alone' : ''}`}>
      {standalone && <Link to="/" className="privacy__brand" aria-label="WinnerZ"><BrandMark width={48} /></Link>}
      <p className="kicker kicker--now">Sobre</p>
      <h1 className="t privacy__title">Sobre o WinnerZ</h1>
      <p className="privacy__lead">O WinnerZ é onde jogos viram histórias: a Jornada de cada jogo que você joga, a coleção que você tem e o que você achou de cada um, tudo num lugar só.</p>

      <section>
        <h2 className="t">De onde vêm as informações dos jogos</h2>
        <p>
          Os jogos do catálogo e as suas informações (nomes, capas, artes, capturas de tela, vídeos, datas de lançamento, plataformas, estúdios,
          gêneros, temas, modos de jogo, sinopses, notas gerais e o tempo médio para zerar) vêm do{' '}
          <a href="https://www.igdb.com" target="_blank" rel="noopener noreferrer">IGDB</a>, uma base de dados de jogos mantida pela Twitch.
          As sinopses são traduzidas automaticamente para o português.
        </p>
        <p>Capas, artes e marcas dos jogos pertencem aos seus donos. O WinnerZ usa os dados do IGDB, mas não é endossado nem certificado pelo IGDB ou pela Twitch.</p>
      </section>

      <section>
        <h2 className="t">Como ler as marcações</h2>
        <dl className="privacy__dl">
          <dt>Sem marcação</dt><dd>Informação da ficha do jogo, como modos de jogo, temas e tempo para zerar.</dd>
          <dt>Inferido</dt><dd>O WinnerZ deduziu a partir do gênero, do tema e dos modos de jogo. Serve para ajudar a escolher o momento, não para julgar o jogo.</dd>
          <dt>Você</dt><dd>Veio de você: a sua estimativa, a sua planilha ou o que você registrou.</dd>
        </dl>
      </section>

      <section>
        <h2 className="t">O que é seu</h2>
        <p>A sua Jornada, a sua coleção, as suas notas e fotos são suas. O que guardamos, quem vê e como levar tudo embora está em <Link to="/privacidade">Privacidade</Link>.</p>
      </section>
    </main>
  );
}
