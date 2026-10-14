/**
 * Links que viram conteúdo dentro da postagem: vídeos, clipes, posts de redes sociais e músicas.
 * Tudo por iframe oficial de cada site, sem script de terceiros e sem baixar nada pelo servidor.
 * O que não for reconhecido continua como link (com um cartão simples mostrando o site).
 */
export type EmbedShape = 'video' | 'vertical' | 'post' | 'audio' | 'wide';
export interface Embed {
  provider: string;
  /** Nome para mostrar ("YouTube", "Instagram"…). */
  label: string;
  src: string;
  shape: EmbedShape;
  /** Altura inicial (px) para posts e áudio; vídeos usam a proporção. */
  height?: number;
  /** O site avisa a altura certa por mensagem (Instagram, X, Reddit…). */
  resizes?: boolean;
  /** Miniatura conhecida sem precisar buscar nada (YouTube). */
  thumb?: string;
  url: string;
}

const yt = (id: string, start?: number | null) =>
  `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1${start ? `&start=${start}` : ''}`;
const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** "1h2m3s", "90", "1:30" → segundos. */
function seconds(t: string | null): number | null {
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  if (m && (m[1] || m[2] || m[3])) return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return null;
}

/** Reconhece o link e devolve como mostrar dentro da página. host: o domínio do site (a Twitch exige). */
export function embedOf(raw: string, host: string): Embed | null {
  const bare = host.replace(/^www\./, '');
  const parent = [...new Set([host, bare, bare.includes('.') && bare !== 'localhost' ? `www.${bare}` : bare])].map((x) => `parent=${encodeURIComponent(x)}`).join('&');
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const h = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
  const p = u.pathname;
  const seg = p.split('/').filter(Boolean);
  const url = u.toString();
  const ID = /^[\w-]{6,20}$/;

  // YouTube: watch, youtu.be, shorts, live, embed, music
  if (h === 'youtu.be' && ID.test(seg[0] ?? '')) return { provider: 'youtube', label: 'YouTube', src: yt(seg[0], seconds(u.searchParams.get('t'))), shape: 'video', thumb: ytThumb(seg[0]), url };
  if (h === 'youtube.com' || h === 'music.youtube.com' || h === 'youtube-nocookie.com') {
    const v = u.searchParams.get('v');
    if (v && ID.test(v)) return { provider: 'youtube', label: 'YouTube', src: yt(v, seconds(u.searchParams.get('t'))), shape: 'video', thumb: ytThumb(v), url };
    if (['shorts', 'live', 'embed', 'v'].includes(seg[0]) && ID.test(seg[1] ?? '')) {
      return { provider: 'youtube', label: 'YouTube', src: yt(seg[1], seconds(u.searchParams.get('t'))), shape: seg[0] === 'shorts' ? 'vertical' : 'video', thumb: ytThumb(seg[1]), url };
    }
    const list = u.searchParams.get('list');
    if (p === '/playlist' && list) return { provider: 'youtube', label: 'YouTube', src: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(list)}`, shape: 'video', url };
    return null;
  }

  // Twitch: clipe, vídeo, canal ao vivo
  if (h === 'clips.twitch.tv' && seg[0] && seg[0] !== 'embed') return { provider: 'twitch', label: 'Twitch', src: `https://clips.twitch.tv/embed?clip=${encodeURIComponent(seg[0])}&${parent}&autoplay=false`, shape: 'video', url };
  if (h === 'twitch.tv') {
    if (seg[1] === 'clip' && seg[2]) return { provider: 'twitch', label: 'Twitch', src: `https://clips.twitch.tv/embed?clip=${encodeURIComponent(seg[2])}&${parent}&autoplay=false`, shape: 'video', url };
    if (seg[0] === 'videos' && /^\d+$/.test(seg[1] ?? '')) return { provider: 'twitch', label: 'Twitch', src: `https://player.twitch.tv/?video=${seg[1]}&${parent}&autoplay=false`, shape: 'video', url };
    if (seg.length === 1 && /^[A-Za-z0-9_]{3,25}$/.test(seg[0]) && !['directory', 'videos', 'settings', 'p', 'search'].includes(seg[0])) {
      return { provider: 'twitch', label: 'Twitch', src: `https://player.twitch.tv/?channel=${seg[0]}&${parent}&autoplay=false`, shape: 'video', url };
    }
    return null;
  }

  // Kick
  if (h === 'kick.com' && seg.length === 1 && /^[A-Za-z0-9_-]{3,30}$/.test(seg[0])) return { provider: 'kick', label: 'Kick', src: `https://player.kick.com/${seg[0]}?autoplay=false`, shape: 'video', url };

  // Instagram: post, reel, IGTV
  if (h === 'instagram.com') {
    const i = seg.findIndex((s) => ['p', 'reel', 'reels', 'tv'].includes(s));
    const code = i >= 0 ? seg[i + 1] : undefined;
    if (code && /^[\w-]{5,40}$/.test(code)) {
      const kind = seg[i] === 'reels' ? 'reel' : seg[i];
      return { provider: 'instagram', label: 'Instagram', src: `https://www.instagram.com/${kind}/${code}/embed/captioned/`, shape: 'post', height: kind === 'p' ? 640 : 760, resizes: true, url };
    }
    return null;
  }

  // TikTok: vídeo (o link curto vm.tiktok.com não dá para abrir sem o servidor)
  if (h === 'tiktok.com') {
    const i = seg.indexOf('video');
    const id = i >= 0 ? seg[i + 1] : undefined;
    if (id && /^\d{8,25}$/.test(id)) return { provider: 'tiktok', label: 'TikTok', src: `https://www.tiktok.com/player/v1/${id}?music_info=1&description=1&rel=0`, shape: 'vertical', url };
    return null;
  }

  // X / Twitter
  if (h === 'x.com' || h === 'twitter.com' || h === 'fxtwitter.com' || h === 'vxtwitter.com') {
    const i = seg.indexOf('status');
    const id = i >= 0 ? seg[i + 1] : undefined;
    if (id && /^\d{5,25}$/.test(id)) return { provider: 'x', label: 'X', src: `https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=dark&dnt=true&lang=pt`, shape: 'post', height: 560, resizes: true, url };
    return null;
  }

  // Threads
  if (h === 'threads.net' || h === 'threads.com') {
    const i = seg.indexOf('post');
    if (seg[0]?.startsWith('@') && i > 0 && seg[i + 1]) return { provider: 'threads', label: 'Threads', src: `https://www.threads.net/${seg[0]}/post/${seg[i + 1]}/embed`, shape: 'post', height: 560, resizes: true, url };
    return null;
  }

  // Facebook: vídeo, reel ou post
  if (h === 'facebook.com' || h === 'fb.watch') {
    const isVideo = h === 'fb.watch' || /\/(videos|reel|watch)\b/.test(p) || u.searchParams.has('v');
    const isPost = /\/(posts|permalink|photo|story\.php)/.test(p);
    if (isVideo) return { provider: 'facebook', label: 'Facebook', src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`, shape: 'video', url };
    if (isPost) return { provider: 'facebook', label: 'Facebook', src: `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500`, shape: 'post', height: 620, url };
    return null;
  }

  // Reddit
  if (h === 'reddit.com' || h === 'old.reddit.com' || h === 'new.reddit.com') {
    if (seg[0] === 'r' && seg[2] === 'comments' && seg[3]) {
      return { provider: 'reddit', label: 'Reddit', src: `https://embed.reddit.com/r/${seg[1]}/comments/${seg[3]}/${seg[4] ?? ''}?embed=true&theme=dark&showmedia=true`, shape: 'post', height: 520, resizes: true, url };
    }
    return null;
  }

  // Vimeo, Dailymotion, Streamable
  if (h === 'vimeo.com' && /^\d+$/.test(seg[0] ?? '')) return { provider: 'vimeo', label: 'Vimeo', src: `https://player.vimeo.com/video/${seg[0]}${seg[1] && /^[\da-f]+$/.test(seg[1]) ? `?h=${seg[1]}` : ''}`, shape: 'video', url };
  if (h === 'player.vimeo.com' && seg[0] === 'video' && /^\d+$/.test(seg[1] ?? '')) return { provider: 'vimeo', label: 'Vimeo', src: url, shape: 'video', url };
  if ((h === 'dailymotion.com' && seg[0] === 'video' && seg[1]) || (h === 'dai.ly' && seg[0])) {
    const id = h === 'dai.ly' ? seg[0] : seg[1].split('_')[0];
    return { provider: 'dailymotion', label: 'Dailymotion', src: `https://geo.dailymotion.com/player.html?video=${encodeURIComponent(id)}`, shape: 'video', url };
  }
  if (h === 'streamable.com' && /^[a-z0-9]{4,12}$/i.test(seg[seg[0] === 'e' ? 1 : 0] ?? '')) return { provider: 'streamable', label: 'Streamable', src: `https://streamable.com/e/${seg[seg[0] === 'e' ? 1 : 0]}`, shape: 'video', url };

  // Música: Spotify e SoundCloud
  if (h === 'open.spotify.com') {
    const s = seg[0]?.startsWith('intl-') ? seg.slice(1) : seg;
    if (['track', 'album', 'playlist', 'episode', 'show', 'artist'].includes(s[0]) && s[1]) {
      return { provider: 'spotify', label: 'Spotify', src: `https://open.spotify.com/embed/${s[0]}/${s[1]}?theme=0`, shape: 'audio', height: s[0] === 'track' || s[0] === 'episode' ? 152 : 352, url };
    }
    return null;
  }
  if (h === 'soundcloud.com' && seg.length >= 2) return { provider: 'soundcloud', label: 'SoundCloud', src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ffb25b&visual=false&show_comments=false`, shape: 'audio', height: seg[1] === 'sets' ? 360 : 166, url };

  // Loja da Steam: o cartão do jogo
  if (h === 'store.steampowered.com' && seg[0] === 'app' && /^\d+$/.test(seg[1] ?? '')) return { provider: 'steam', label: 'Steam', src: `https://store.steampowered.com/widget/${seg[1]}/`, shape: 'wide', height: 190, url };

  return null;
}

/** Todos os links do texto, na ordem, sem repetir. */
export function linksIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/https?:\/\/[^\s<>"')\]|]+[^\s<>"')\].,;:!?|]/g)) if (!out.includes(m[0])) out.push(m[0]);
  return out;
}

/** Domínio para mostrar no cartão de um link comum. */
export function siteOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

/** A altura que o site do post pediu, pela mensagem que ele manda para a página (Instagram, X, Reddit, Threads). */
export function heightFromMessage(provider: string, data: unknown): number | null {
  let d: unknown = data;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return null; } }
  if (!d || typeof d !== 'object') return null;
  const o = d as Record<string, any>;
  let h: unknown = null;
  if (provider === 'instagram' && o.type === 'MEASURE') h = o.details?.height;
  else if (provider === 'x') h = o['twttr.embed']?.method === 'twttr.private.resize' ? o['twttr.embed'].params?.[0]?.height : null;
  else if (provider === 'reddit' && o.type === 'resize.embed') h = o.data;
  else if (provider === 'threads') h = o.height ?? o.details?.height ?? null;
  const n = typeof h === 'string' ? parseFloat(h) : h;
  return typeof n === 'number' && Number.isFinite(n) && n > 80 && n < 4000 ? Math.ceil(n) : null;
}
