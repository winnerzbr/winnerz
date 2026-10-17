import { test } from 'node:test';
import assert from 'node:assert/strict';
import { icsFile, icsText, googleLink } from './ics';

test('agenda: o .ics tem início, fim (2 h por padrão), texto escapado e linhas curtas', () => {
  const f = icsFile({ id: 'e1', title: 'Live; Elden Ring, parte 2', start: '2026-10-20T22:00:00.000Z', details: 'Linha 1\nLinha 2' }, new Date('2026-10-17T10:00:00Z'));
  assert.match(f, /DTSTART:20261020T220000Z/);
  assert.match(f, /DTEND:20261021T000000Z/);
  assert.match(f, /SUMMARY:Live\; Elden Ring\\, parte 2/);
  assert.match(f, /DESCRIPTION:Linha 1\\nLinha 2/);
  assert.ok(f.split('\r\n').every((l) => l.length <= 75));
  assert.equal(icsText('a\\b'), 'a\\\\b');
});

test('agenda: o link do Google Agenda leva título e datas', () => {
  const u = new URL(googleLink({ id: 'x', title: 'Noite do Awards', start: '2026-12-12T23:00:00Z', end: '2026-12-13T01:00:00Z', url: 'https://winnerz.com.br/eventos' }));
  assert.equal(u.searchParams.get('text'), 'Noite do Awards');
  assert.equal(u.searchParams.get('dates'), '20261212T230000Z/20261213T010000Z');
  assert.match(u.searchParams.get('details') ?? '', /winnerz\.com\.br/);
});
