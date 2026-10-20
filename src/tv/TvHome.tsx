/**
 * Modo TV · Continuar: o jogo em foco em tela cheia, com a Retomada em letras grandes ("da última vez, você parou
 * em…"), começar e encerrar a sessão pelo controle, e a fila dos jogos em andamento embaixo.
 * Encerrar é de escolhas rápidas (como foi; zerou?), sem digitar; o recado fica para o celular, pelo QR.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { actions, currentHistory, lastNote, lastSession, openSession, useStore, focusJourneys } from '../data/store';
import { Backdrop } from '../components/Backdrop';
import { FEELINGS } from '../pages/SessionFinish';
import { packAfterFinish } from '../components/album/afterFinish';
import { discordApi } from '../data/discordApi';
import { qrSvg } from '../lib/qr';
import { som } from './sons';
import { vibrar } from './gamepad';
import { focar } from './foco';

const doisDigitos = (n: number) => String(n).padStart(2, '0');
function Relogio({ desde }: { desde: string }) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 1000); return () => clearInterval(t); }, []);
  const s = Math.max(0, Math.floor((agora - Date.parse(desde)) / 1000));
  return <span className="tvh__relogio" role="timer">{doisDigitos(Math.floor(s / 3600))}:{doisDigitos(Math.floor((s % 3600) / 60))}:{doisDigitos(s % 60)}</span>;
}

export function TvHome() {
  const s = useStore((x) => x);
  const aberta = openSession(s);
  const pedido = new URLSearchParams(location.search).get('jogo');
  // Em andamento: a sessão aberta primeiro, depois os em foco, depois pela última sessão.
  const fila = useMemo(() => {
    const foco = focusJourneys(s).map((f) => f.journey.id);
    return s.journeys
      .map((j) => ({ j, h: currentHistory(s, j.id), g: s.games[j.gameId], ult: lastSession(s, j.id)?.startedAt ?? j.createdAt ?? '' }))
      .filter((x) => x.g && x.h && (x.h.state === 'ativa' || x.h.state === 'pausada'))
      .sort((a, b) => Number(b.j.id === aberta?.journeyId) - Number(a.j.id === aberta?.journeyId) || (foco.indexOf(a.j.id) + 1 || 99) - (foco.indexOf(b.j.id) + 1 || 99) || b.ult.localeCompare(a.ult))
      .slice(0, 12);
  }, [s, aberta?.journeyId]);
  const [jid, setJid] = useState<string | null>(() => fila.find((x) => x.g.id === pedido)?.j.id ?? null);
  // Um jogo da Estante que ainda não está em andamento: aparece para começar daqui.
  const extra = pedido && !jid && !fila.some((x) => x.g.id === pedido) ? s.games[pedido] : undefined;
  const atual: { j?: (typeof fila)[number]['j']; h?: (typeof fila)[number]['h']; g: (typeof fila)[number]['g'] } | undefined = extra ? { g: extra } : fila.find((x) => x.j.id === jid) ?? fila[0];
  // O painel de encerrar guarda a sessão de quando abriu (ela fecha no meio, e o painel continua para o fim).
  const [fim, setFim] = useState<{ sessaoId: string; historyId: string; gameId: string; slug: string; titulo: string } | null>(null);

  if (!atual) return (
    <section className="tvh tvh--vazio">
      <h1 className="tvh__titulo">Nada em andamento</h1>
      <p className="tvh__retomada">Comece uma Jornada pelo site ou pela Estante, e ela aparece aqui para continuar da TV.</p>
      <Link className="btn primary lg" data-tv-primeiro to="/tv/estante">Abrir a Estante</Link>
    </section>
  );

  const { j, h, g } = atual;
  const sess = aberta && j && aberta.journeyId === j.id ? aberta : null;
  const outra = aberta && !sess ? s.games[s.journeys.find((x) => x.id === aberta.journeyId)?.gameId ?? ''] : null;
  const recado = j ? lastNote(s, j.id) : null;
  const onde = h?.capsule?.where || (j ? lastSession(s, j.id)?.whereStopped : undefined) || recado?.whereStopped;
  const nota = recado?.note;

  return (
    <section className="tvh">
      <div className="tvh__fundo" aria-hidden="true"><Backdrop game={g} className="tvh__bg" /><div className="tvh__sombra" /></div>
      <div className="tvh__info">
        <span className="tvh__k">{sess ? <><i className="tvh__ponto" />Jogando agora · <Relogio desde={sess.startedAt} /></> : !j ? 'Da sua estante' : h?.state === 'pausada' ? 'Pausado' : 'Continuar'}</span>
        <h1 className="tvh__titulo">{g.title}</h1>
        {(onde || nota) ? (
          <div className="tvh__retomada">
            <span className="tvh__rk">Da última vez</span>
            {onde && <p className="tvh__onde">Você parou em {onde}.</p>}
            {nota && <p className="tvh__nota">“{nota}”</p>}
          </div>
        ) : <p className="tvh__retomada tvh__retomada--vazia">{j ? 'Sem recado da última vez. Bom jogo!' : 'Ainda não começou. A primeira sessão abre a Jornada deste jogo.'}</p>}
        <div className="tvh__acoes">
          {sess
            ? <button className="btn now lg" data-tv-primeiro onClick={() => h && setFim({ sessaoId: sess.id, historyId: h.id, gameId: g.id, slug: g.slug, titulo: g.title })}>Encerrar a sessão</button>
            : <button className="btn primary lg" data-tv-primeiro disabled={!!outra} title={outra ? `Há uma sessão aberta de ${outra.title}` : undefined} onClick={() => { actions.play(g.id); som('ok'); vibrar(0.2, 0.4, 140); }}>Começar a sessão</button>}
          {sess && <button className="btn ghost lg" onClick={() => { actions.addMoment(sess.id, { kind: 'ponto', title: 'Marcado pela TV' }); som('ok'); vibrar(0.1, 0.3, 80); }}>Quero voltar aqui</button>}
          <Link className="btn ghost lg" to={j ? `/jornada/${g.slug}` : `/jogos/${g.slug}`}>{j ? 'Ver a Jornada' : 'Ver a ficha'}</Link>
        </div>
        {outra && <p className="tvh__aviso">Há uma sessão aberta de {outra.title}. Encerre aquela para começar esta.</p>}
      </div>
      {fila.length > (extra ? 0 : 1) && (
        <div className="tvh__fila">
          <h2 className="tvh__fk">Em andamento</h2>
          <div className="tvh__capas">
            {fila.map((x) => (
              <button key={x.j.id} className="tvh__capa" aria-pressed={x.j.id === j?.id} onClick={() => { setJid(x.j.id); window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => { const p = document.querySelector<HTMLElement>('[data-tv-primeiro]'); if (p) focar(p); }, 60); }}>
                {x.g.cover ? <img src={x.g.cover} alt="" loading="lazy" /> : <span className="tvh__semcapa">{x.g.title}</span>}
                <span className="tvh__ct">{x.g.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {fim && <Encerrar {...fim} onClose={() => setFim(null)} />}
    </section>
  );
}

/** Encerrar pela TV: como foi (um toque), e se zerou. O recado escrito fica para o celular. */
function Encerrar({ sessaoId, historyId, gameId, slug, titulo, onClose }: { sessaoId: string; historyId: string; gameId: string; slug: string; titulo: string; onClose: () => void }) {
  const [feito, setFeito] = useState<'sessao' | 'zerado' | null>(null);
  useEffect(() => { const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc); }, [onClose]);
  const fechar = (feeling?: string) => { actions.finishSession(sessaoId, { feeling }); som('ok'); vibrar(0.3, 0.5, 200); setFeito('sessao'); };
  const zerei = () => { actions.finishSession(sessaoId, {}); actions.completeHistory(historyId); discordApi.publish('zerou', historyId); packAfterFinish(historyId, gameId); som('ok'); vibrar(1, 1, 600); setFeito('zerado'); };
  const url = `${location.origin}/jornada/${slug}#capsula`;
  useEffect(() => { const t = setTimeout(() => { const p = document.querySelector<HTMLElement>('.tv-painel [data-tv-primeiro]'); if (p) focar(p); }, 60); return () => clearTimeout(t); }, [feito]);
  return (
    <div className="tv-painel" role="dialog" aria-modal="true" aria-labelledby="tv-fim-t">
      <div className="tv-painel__box">
        {!feito ? (
          <>
            <h2 id="tv-fim-t" className="tv-painel__t">Como foi a sessão?</h2>
            <div className="tv-painel__ops">
              {FEELINGS.map((f, i) => <button key={f} className="btn ghost lg" data-tv-primeiro={i === 0 ? '' : undefined} onClick={() => fechar(f)}>{f}</button>)}
            </div>
            <div className="tv-painel__ops">
              <button className="btn now lg" onClick={zerei}>Zerei {titulo}!</button>
              <button className="btn quiet lg" onClick={() => fechar()}>Encerrar sem responder</button>
              <button className="btn quiet lg" onClick={onClose}>Voltar a jogar</button>
            </div>
          </>
        ) : (
          <>
            <h2 id="tv-fim-t" className="tv-painel__t">{feito === 'zerado' ? `${titulo} zerado!` : 'Sessão guardada'}</h2>
            <p className="tv-painel__p">{feito === 'zerado' ? 'Que jornada. Se a Jornada te deu um pacote de figurinhas, ele está em Pacotes.' : 'Quer deixar um recado para a próxima vez? Aponte o celular para o código e escreva por lá.'}</p>
            <div className="tv-painel__qr">
              <span className="tv-qr" dangerouslySetInnerHTML={{ __html: qrSvg(url) }} />
              <span className="muted">Abre a Jornada de {titulo} no celular.</span>
            </div>
            <div className="tv-painel__ops">
              <button className="btn primary lg" data-tv-primeiro onClick={onClose}>Pronto</button>
              {feito === 'zerado' && <Link className="btn ghost lg" to="/album/pacotes" onClick={onClose}>Ver Pacotes</Link>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
