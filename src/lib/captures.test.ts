import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateFromName, dateFromExif } from './captures';

const now = Date.parse('2026-10-12T12:00:00Z');
const fmt = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : null);

test('nomes de captura dos consoles e do PC', () => {
  assert.equal(fmt(dateFromName('ELDEN RING_20220304231512.jpg', now)), '2022-03-04 23:15');
  assert.equal(fmt(dateFromName('20231005123456_1.jpg', now)), '2023-10-05 12:34');
  assert.equal(fmt(dateFromName('2023100512345600-0123456789ABCDEF.jpg', now)), '2023-10-05 12:34');
  assert.equal(fmt(dateFromName('Hades 2021-07-02 21-10-03.png', now)), '2021-07-02 21:10');
  assert.equal(fmt(dateFromName('Screenshot 2024-01-15 at 09.08.07.png', now)), '2024-01-15 09:08');
  assert.equal(fmt(dateFromName('IMG_20190830_224512.jpg', now)), '2019-08-30 22:45');
  assert.equal(fmt(dateFromName('foto.jpg', now)), null);
  assert.equal(dateFromName('20991231235959.jpg', now), null);
  assert.equal(dateFromName('20231345123456.jpg', now), null);
});

test('data do EXIF', () => {
  const bytes = new TextEncoder().encode('Exif\0\0MM...2020:12:24 19:05:11\0...');
  assert.equal(fmt(dateFromExif(bytes, now)), '2020-12-24 19:05');
});
