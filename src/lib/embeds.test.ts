import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embedOf, heightFromMessage, linksIn } from './embeds';

const H = 'winnerz.com.br';
const e = (u: string) => embedOf(u, H);

test('YouTube: watch, curto, shorts, live, tempo e playlist', () => {
  assert.equal(e('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.src, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&playsinline=1');
  assert.equal(e('https://youtu.be/dQw4w9WgXcQ?t=90')?.src, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&playsinline=1&start=90');
  assert.equal(e('https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s')?.src.endsWith('&start=90'), true);
  assert.equal(e('https://youtube.com/shorts/abcdefghijk')?.shape, 'vertical');
  assert.equal(e('https://www.youtube.com/live/abcdefghijk?si=x')?.provider, 'youtube');
  assert.match(e('https://www.youtube.com/playlist?list=PL123')?.src ?? '', /videoseries\?list=PL123/);
  assert.equal(e('https://www.youtube.com/@winnerz'), null);
});

test('Twitch com o domínio do site (com e sem www)', () => {
  const c = e('https://www.twitch.tv/winnerz/clip/AbcDef-123');
  assert.match(c?.src ?? '', /clip=AbcDef-123/);
  assert.match(c?.src ?? '', /parent=winnerz\.com\.br&parent=www\.winnerz\.com\.br/);
  assert.match(e('https://twitch.tv/videos/123456')?.src ?? '', /video=123456/);
  assert.match(e('https://twitch.tv/winnerz')?.src ?? '', /channel=winnerz/);
  assert.match(embedOf('https://twitch.tv/winnerz', 'localhost')?.src ?? '', /parent=localhost&autoplay/);
});

test('redes sociais', () => {
  assert.equal(e('https://www.instagram.com/p/C1a2B3c4D5e/?igsh=abc')?.src, 'https://www.instagram.com/p/C1a2B3c4D5e/embed/captioned/');
  assert.equal(e('https://www.instagram.com/reel/C1a2B3c4D5e/')?.src, 'https://www.instagram.com/reel/C1a2B3c4D5e/embed/captioned/');
  assert.equal(e('https://www.instagram.com/reels/C1a2B3c4D5e/')?.src, 'https://www.instagram.com/reel/C1a2B3c4D5e/embed/captioned/');
  assert.equal(e('https://www.instagram.com/winnerz/'), null);
  assert.match(e('https://www.tiktok.com/@winnerz/video/7312345678901234567?lang=pt')?.src ?? '', /player\/v1\/7312345678901234567/);
  assert.match(e('https://x.com/winnerz/status/1790000000000000000')?.src ?? '', /Tweet\.html\?id=1790000000000000000/);
  assert.match(e('https://twitter.com/winnerz/status/1790000000000000000?s=20')?.src ?? '', /id=1790000000000000000/);
  assert.match(e('https://www.threads.net/@winnerz/post/C9abc')?.src ?? '', /@winnerz\/post\/C9abc\/embed/);
  assert.match(e('https://www.reddit.com/r/gaming/comments/abc123/titulo/')?.src ?? '', /embed\.reddit\.com\/r\/gaming\/comments\/abc123/);
  assert.equal(e('https://www.facebook.com/winnerz/videos/123456/')?.provider, 'facebook');
});

test('vídeos, música e Steam', () => {
  assert.equal(e('https://vimeo.com/76979871')?.src, 'https://player.vimeo.com/video/76979871');
  assert.match(e('https://www.dailymotion.com/video/x8abcd_titulo')?.src ?? '', /video=x8abcd$/);
  assert.equal(e('https://streamable.com/abc123')?.src, 'https://streamable.com/e/abc123');
  assert.equal(e('https://kick.com/winnerz')?.provider, 'kick');
  assert.equal(e('https://open.spotify.com/intl-pt/track/4uLU6hMCjMI75M1A2tKUQC')?.src, 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC?theme=0');
  assert.equal(e('https://soundcloud.com/artista/musica')?.provider, 'soundcloud');
  assert.equal(e('https://store.steampowered.com/app/1245620/ELDEN_RING/')?.src, 'https://store.steampowered.com/widget/1245620/');
  assert.equal(e('https://winnerz.com.br/w/retro'), null);
  assert.equal(e('javascript:alert(1)'), null);
});

test('links do texto e altura pedida pelos posts', () => {
  assert.deepEqual(linksIn('veja https://a.com/x, e https://b.com/y. e https://a.com/x'), ['https://a.com/x', 'https://b.com/y']);
  assert.equal(heightFromMessage('instagram', JSON.stringify({ type: 'MEASURE', details: { height: 812 } })), 812);
  assert.equal(heightFromMessage('x', { 'twttr.embed': { method: 'twttr.private.resize', params: [{ height: '640.5' }] } }), 641);
  assert.equal(heightFromMessage('x', 'lixo'), null);
});
