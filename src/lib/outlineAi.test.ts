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
