import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanOutline } from '../../api/retomada';

test('Capítulos da IA: confere nomes, % e spoiler', () => {
  const r = cleanOutline([
    { name: '  Prólogo ', pct: 5, minutes: 30, spoiler: true },
    { name: 'Capítulo 1', pct: 10, minutes: 9999 },
    { name: 'capítulo 1', pct: 12 },
    { name: 'Capítulo 2', pct: 8, stop: 'fim' },
    { name: '', pct: 50 },
    { name: 'Final', pct: 'x', spoiler: true, stop: 'talvez' },
  ]);
  assert.deepEqual(r.map((p) => [p.name, p.pct]), [['Prólogo', 0], ['Capítulo 1', 10], ['Capítulo 2', 11], ['Final', 12]]);
  assert.equal(r[0].spoiler, undefined);
  assert.equal(r[1].minutes, 600);
  assert.equal(r[2].stop, 'fim');
  assert.equal(r[3].spoiler, true);
  assert.equal(r[3].stop, undefined);
  assert.deepEqual(cleanOutline('x'), []);
});

import { logPart, partsTimeline } from './outline';
import { weaveParts, type TLItem } from './chapters';

test('Capítulos na linha do tempo: chegadas, correções e os à frente', () => {
  const parts = [{ id: 'a', name: 'A', pct: 0 }, { id: 'b', name: 'B', pct: 30 }, { id: 'c', name: 'C', pct: 60 }, { id: 'd', name: 'D', pct: 90 }];
  let log = logPart(undefined, parts, parts[0], '2026-10-01T10:00:00Z');
  log = logPart(log, parts, parts[1], '2026-10-05T10:00:00Z');
  log = logPart(log, parts, parts[1], '2026-10-06T10:00:00Z');
  assert.deepEqual(log.map((e) => e.id), ['a', 'b']);
  log = logPart(log, parts, parts[2], '2026-10-08T10:00:00Z');
  log = logPart(log, parts, parts[1], '2026-10-09T10:00:00Z');
  assert.deepEqual(log.map((e) => [e.id, e.at.slice(8, 10)]), [['a', '01'], ['b', '09']]);
  const rows = partsTimeline(parts, log, parts[1]);
  assert.deepEqual(rows.map((r) => r.state), ['passou', 'atual', 'frente', 'frente']);
  const ev = (id: string, at: string): TLItem => ({ type: 'event', id, chapter: 1, e: { id, journeyId: 'j', historyId: 'h', kind: 'sessao', at, title: id } });
  const items: TLItem[] = [ev('e1', '2026-10-02T00:00:00Z'), ev('e2', '2026-10-10T00:00:00Z'), { type: 'today', id: 'hoje' }];
  const out = weaveParts(items, rows).map((x) => (x.type === 'gpart' ? `${x.state}:${x.part.id}` : x.id));
  assert.deepEqual(out, ['passou:a', 'e1', 'atual:b', 'e2', 'hoje', 'frente:c', 'frente:d']);
  const noToday = weaveParts(items.slice(0, 2), rows).map((x) => (x.type === 'gpart' ? x.part.id : x.id));
  assert.deepEqual(noToday, ['a', 'e1', 'b', 'e2']);
});

import { lastJson, wikiHints, linkOk } from '../../api/retomada';

test('Estrutura da IA: pega o último JSON e guarda grupo e tipo', () => {
  const t = 'Pesquisei na wiki {"nota": 1}. Aqui está:\n```json\n{"known": true, "structure": "etapas", "parts": [{"name": "Limgrave", "pct": 0}, {"name": "Margit", "pct": 5, "group": "Limgrave", "kind": "Chefe"}]}\n```';
  const j = lastJson(t);
  assert.equal(j?.structure, 'etapas');
  const parts = cleanOutline(j?.parts);
  assert.deepEqual(parts.map((p) => [p.name, p.group ?? '', p.kind ?? '']), [['Limgrave', '', ''], ['Margit', 'Limgrave', 'chefe']]);
  assert.equal(lastJson('sem json aqui'), null);
  assert.deepEqual(wikiHints(['https://eldenring.fandom.com/wiki/Elden_Ring', 'https://en.wikipedia.org/wiki/Elden_Ring', 'https://twitter.com/x']), ['https://eldenring.fandom.com/wiki/Elden_Ring', 'https://en.wikipedia.org/wiki/Elden_Ring']);
});

test('link da wiki: só sites conhecidos, sem senha nem porta', () => {
  assert.equal(linkOk('https://eldenring.wiki.fextralife.com/Bosses'), 'https://eldenring.wiki.fextralife.com/Bosses');
  assert.equal(linkOk('http://thelastofus.fandom.com/wiki/The_Last_of_Us_Part_II#Chapters'), 'https://thelastofus.fandom.com/wiki/The_Last_of_Us_Part_II');
  assert.equal(linkOk('https://pt.wikipedia.org/wiki/Rayman_Legends'), 'https://pt.wikipedia.org/wiki/Rayman_Legends');
  assert.equal(linkOk('https://fandom.com.evil.example/wiki/x'), null);
  assert.equal(linkOk('https://user:pw@x.fandom.com/wiki/x'), null);
  assert.equal(linkOk('https://x.fandom.com:8443/wiki/x'), null);
  assert.equal(linkOk('javascript:alert(1)'), null);
  assert.equal(linkOk(42), null);
});
