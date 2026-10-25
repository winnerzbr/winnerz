/**
 * Etapa 8 da revisão: como você dá notas. A distribuição das suas notas (na sua escala) e, com a migração 0096,
 * a comparação com a média das outras pessoas nos mesmos jogos (só jogos com 3 notas ou mais de outras pessoas).
 */
import { useEffect, useState } from 'react';
import { useStore } from '../data/store';
import { SUPABASE_ON } from '../lib/env';

type Linha = { game_id: string; mine: number; others: number; n: number };

export function SuasNotas() {
  const s = useStore((x) => x);
  const scale = s.prefs.scale;
  const mine = s.reviews.filter((r) => r.mine);
  const [cmp, setCmp] = useState<Linha[] | null>(null);
  useEffect(() => {
    if (!SUPABASE_ON || s.mode !== 'supabase' || !s.profile) return;
    let vivo = true;
    import('../data/supabaseAdapter').then(async ({ getClient }) => {
      const { data, error } = await (await getClient()).rpc('my_notes_vs_community');
      if (vivo && !error && Array.isArray(data)) setCmp(data as Linha[]);
    }).catch(() => null);
    return () => { vivo = false; };
  }, [s.mode, s.profile?.id, mine.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (mine.length < 3) return null;
  const cinco = scale === 'FIVE_STAR';
  const rot = cinco ? ['5 ★', '4 ★', '3 ★', '2 ★', '1 ★'] : ['9 a 10', '7 a 8', '5 a 6', '3 a 4', '0 a 2'];
  const bins = [0, 0, 0, 0, 0];
  for (const r of mine) {
    const v = r.rating.normalized;
    const i = cinco ? 5 - Math.min(5, Math.max(1, Math.round(v / 200))) : v >= 900 ? 0 : v >= 700 ? 1 : v >= 500 ? 2 : v >= 300 ? 3 : 4;
    bins[i]++;
  }
  const max = Math.max(1, ...bins);
  let frase = '';
  if (cmp && cmp.length >= 3) {
    const d = cmp.reduce((a, x) => a + (x.mine - Number(x.others)), 0) / cmp.length;
    const v = Math.abs(d) / (cinco ? 200 : 100);
    const un = cinco ? (Math.abs(v - 0.5) < 0.13 ? 'meia estrela' : `${v.toFixed(1).replace('.', ',')} ${v >= 1.95 ? 'estrelas' : 'estrela'}`) : `${v.toFixed(1).replace('.', ',')} ${v >= 1.95 ? 'pontos' : 'ponto'}`;
    frase = v < (cinco ? 0.15 : 0.3) ? `Suas notas ficam perto das da comunidade nos ${cmp.length} jogos que dá para comparar.` : `Você dá, em média, ${un} ${d > 0 ? 'a mais' : 'a menos'} que a comunidade (em ${cmp.length} jogos com notas de 3 ou mais pessoas).`;
  }
  return (
    <section className="card rhythm__card rhythm__card--wide notas" aria-labelledby="notas-h">
      <div className="rhythm__head"><h2 id="notas-h" className="kicker">Suas notas · {mine.length} jogos</h2></div>
      <div className="notas__bars" role="img" aria-label={`Distribuição das suas notas: ${rot.map((r, i) => `${r}, ${bins[i]}`).join('; ')}`}>
        {rot.map((r, i) => (
          <div key={r} className="notas__row"><span>{r}</span><i style={{ width: `${(bins[i] / max) * 100}%` }} /><b>{bins[i]}</b></div>
        ))}
      </div>
      {frase && <p className="notas__frase">{frase}</p>}
    </section>
  );
}
