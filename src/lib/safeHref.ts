/**
 * Links colados pelas pessoas (posts, clubes, jogatinas, perfis, correções): só viram link se forem endereços
 * web normais (http ou https). "javascript:", "data:" e afins não abrem nada.
 */
export function safeHref(u: unknown): string | undefined {
  if (typeof u !== 'string' || !u.trim()) return undefined;
  try {
    const x = new URL(u.trim());
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : undefined;
  } catch {
    return undefined;
  }
}
