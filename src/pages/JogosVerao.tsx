import { useEffect, useRef, useState } from 'react';
import { Link } from '../lib/router';
import { getState, useStore } from '../data/store';
import { getClient } from '../data/supabaseAdapter';
import { criaPonte } from '../lib/jogosPonte';

/**
 * IAmiguinho: Jogos de Verão no site. O jogo é uma página pronta em /demo/jogos-verao/ (feita fora do site,
 * em jogos/jogos-de-verao/cart2/build3.py) e roda numa moldura de tela inteira. A moldura recebe a ponte
 * (`window.claude`) que liga o editor do jogo ao Supabase. Em /studio/jogos-de-verao o editor abre sozinho.
 */
const ehAdmin = async () => {
  for (let i = 0; i < 150 && !getState().ready; i++) await new Promise((r) => setTimeout(r, 100));
  return !!getState().isAdmin;
};

export function JogosVeraoPage({ editor = false }: { editor?: boolean }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const mode = useStore((s) => s.mode);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'supabase') return;
    const ponte = criaPonte(getClient, ehAdmin);
    // a moldura troca de "janela" quando a página do jogo carrega: confere de pouco em pouco e liga a ponte nela
    let n = 0;
    const t = window.setInterval(() => {
      n++;
      const w = ref.current?.contentWindow as (Window & { claude?: unknown }) | null | undefined;
      try { if (w && w.location.pathname.includes('/demo/jogos-verao/') && !w.claude) w.claude = ponte; } catch { /* ainda carregando */ }
      if (n > 1200) window.clearInterval(t);
    }, 50);
    // falta a migração 0097? avisa só a administração
    ehAdmin().then(async (adm) => {
      if (!adm) return;
      const sb = await getClient();
      const { error } = await sb.from('jogo_dados').select('caminho').limit(1);
      if (error) setAviso('O editor ainda não consegue guardar no banco: falta rodar a migração 0097_jogos_de_verao.sql no Supabase (SQL Editor).');
    }).catch(() => { /* sem aviso */ });
    return () => window.clearInterval(t);
  }, [mode]);

  return (
    <div className="jogo-cheio">
      <iframe ref={ref} title="IAmiguinho: Jogos de Verão" src={`/demo/jogos-verao/index.html${editor ? '?editor=1' : ''}`} allow="fullscreen; autoplay; gamepad" />
      <Link className="jogo-cheio__sair" to={editor ? '/studio' : '/'} aria-label="Voltar ao WinnerZ">WinnerZ</Link>
      {aviso && <p className="jogo-cheio__aviso" role="alert">{aviso}</p>}
    </div>
  );
}
