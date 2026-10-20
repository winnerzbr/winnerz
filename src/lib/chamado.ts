/**
 * Etapa 4b da live: achar o "Ô iamiguinho!" no que o reconhecimento de voz do navegador escreveu. Ele escreve do jeito
 * que ouve ("o amiguinho", "ia amiguinho", "iamiguinho", "e aí amiguinho"), então vale qualquer "amiguinho" com ou sem
 * o "ia" na frente. Devolve o que veio depois do nome (a pergunta), sem vírgula e sem o "ô".
 */
const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function acharChamado(texto: string): { chamou: boolean; resto: string } {
  const p = plano(texto);
  const m = /(?:^|[^a-z])(?:i\s?a\s+|i\s?)?a\s?miguinh[oa]s?(?![a-z])/.exec(p);
  if (!m) return { chamou: false, resto: '' };
  // O mesmo pedaço no texto original (a normalização não muda o tamanho das letras comuns do português).
  const fim = m.index + m[0].length;
  const resto = texto.slice(fim).replace(/^[\s,.!?:;-]+/, '').trim();
  return { chamou: true, resto };
}

/** Uma frase pequena demais (só "oi", "e aí") não é pergunta: ele espera a próxima. */
export const perguntaCompleta = (t: string) => t.replace(/[^\p{L}\p{N}\s]/gu, '').trim().split(/\s+/).filter(Boolean).length >= 2;
