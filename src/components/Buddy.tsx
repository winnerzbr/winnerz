import { useState } from 'react';

/**
 * IAmiguinho: o mascote aparece pouco e sempre com motivo. As falas são escritas por nós;
 * ele não conversa, não finge ser gente e não dá conselho sério. Cada motivo tem um intervalo mínimo.
 */
export type BuddyReason = 'indeciso' | 'voltou' | 'primeiro-zerado' | 'radar' | 'cofre';

const LINES: Record<BuddyReason, string[]> = {
  indeciso: [
    'Três ideias e nada? Eu escolho jogo pelo tamanho da caixa. Funciona metade das vezes.',
    'Indeciso também é um estado de jogo. Pausado na tela de seleção.',
  ],
  voltou: [
    'Faz tempo! Eu guardei tudo direitinho. Até o recado que você nem lembra que escreveu.',
    'Que bom te ver de volta. O jogo não andou sem você, juro.',
  ],
  'primeiro-zerado': ['Primeira História no mural! Vou polir a moldura.'],
  radar: ['Lançamento chegando. Eu já separei o lanche.'],
  cofre: ['Coleção grande, hein? Eu só tenho um cartucho, e é de hélice.'],
};

const COOLDOWN_DAYS: Record<BuddyReason, number> = { indeciso: 1, voltou: 7, 'primeiro-zerado': 36500, radar: 3, cofre: 30 };
const KEY = 'wz.iamiguinho.v1';

function read(): Record<string, number> { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } }

/** Decide uma vez (ao abrir a tela) se o mascote aparece por este motivo, e marca o horário. */
export function useBuddy(reason: BuddyReason, when: boolean, scope = ''): string | null {
  const [line] = useState(() => {
    if (!when) return null;
    const k = `${reason}${scope ? `:${scope}` : ''}`;
    const seen = read();
    if (seen[k] && Date.now() - seen[k] < COOLDOWN_DAYS[reason] * 86400000) return null;
    seen[k] = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch { /* sem memória: aparece de novo, tudo bem */ }
    const list = LINES[reason];
    return list[Math.floor(Math.random() * list.length)];
  });
  return line;
}

export function Buddy({ line, className = '' }: { line: string | null; className?: string }) {
  const [gone, setGone] = useState(false);
  if (!line || gone) return null;
  return (
    <div className={`buddy buddy--pop ${className}`}>
      <img src="/brand/iamiguinho-icon.webp" alt="" />
      <p><span className="buddy__name">IAmiguinho</span> <span className="buddy__tag">mascote</span>{line}</p>
      <button className="buddy__close" aria-label="Dispensar o IAmiguinho" onClick={() => setGone(true)}>×</button>
    </div>
  );
}
