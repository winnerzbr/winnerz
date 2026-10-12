import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';

/** Roteador mínimo baseado no History API (sem dependências). */

function subscribe(cb: () => void) {
  window.addEventListener('popstate', cb);
  return () => window.removeEventListener('popstate', cb);
}

export function usePath() {
  return useSyncExternalStore(subscribe, () => location.pathname + location.search, () => '/');
}

export function navigate(to: string, opts: { replace?: boolean; keepScroll?: boolean } = {}) {
  if (opts.replace) history.replaceState(null, '', to);
  else history.pushState(null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
  if (!opts.keepScroll) window.scrollTo({ top: 0 });
}

export function match(pattern: string, path: string): Record<string, string> | null {
  const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
  const p = pattern.split('/');
  const s = clean.split('/');
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

export function Link({ to, onClick, ...rest }: LinkProps) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (to.startsWith('#')) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handle} {...rest} />;
}
