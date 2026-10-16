import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ytParse, videosOf, clock, type PartVideo } from './ytLink';

test('link do YouTube colado: código e minuto', () => {
  assert.deepEqual(ytParse('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s'), { id: 'dQw4w9WgXcQ', start: 90 });
  assert.deepEqual(ytParse('https://youtu.be/dQw4w9WgXcQ?t=754'), { id: 'dQw4w9WgXcQ', start: 754 });
  assert.deepEqual(ytParse('https://m.youtube.com/watch?v=dQw4w9WgXcQ'), { id: 'dQw4w9WgXcQ', start: 0 });
  assert.deepEqual(ytParse('https://www.youtube.com/live/dQw4w9WgXcQ?t=1:02:03'), { id: 'dQw4w9WgXcQ', start: 3723 });
  assert.equal(ytParse('https://vimeo.com/123'), null);
  assert.equal(ytParse('https://www.youtube.com/watch?v=<script>'), null);
  assert.equal(ytParse('não é link'), null);
});

test('qual vídeo mostrar primeiro: canal, pessoa, pt, en', () => {
  const v = (source: PartVideo['source'], lang: PartVideo['lang'], id: string): PartVideo => ({ partId: 'a', source, lang, videoId: id, start: 0 });
  const all = [v('auto', 'en', 'en1'), v('auto', 'pt', 'pt1'), v('pessoa', '?', 'p1'), { ...v('canal', 'pt', 'c1'), partId: 'b' }];
  assert.deepEqual(videosOf(all, 'a').map((x) => x.videoId), ['p1', 'pt1', 'en1']);
  assert.deepEqual(videosOf(all, 'b').map((x) => x.videoId), ['c1']);
  assert.equal(clock(754), '12:34');
  assert.equal(clock(3723), '1:02:03');
});
