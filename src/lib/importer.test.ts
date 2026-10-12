import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planSheet, buildItems, pickBest, titleKey, simplerTitle, parseStatus, parseKind, parseRating, parsePriority, similarity } from './importer';
import { readCsv } from './xlsx';
import { canonicalPlatform, shortPlatform } from './platforms';
import { parseLooseDate, whenLabel } from './dates';

const backlog = { name: 'Backlog', rows: [
  ['Nome do Jogo', 'Gênero', 'Plataforma', 'Tempo estimado para zerar', 'Prioridade', 'Status', 'Formato'],
  ['Astrobot', 'Plataforma', 'PS5', 10, 1, 'Zerado', 'Físico'],
  ['Outlast', 'Terror', 'PC', 5, 2, 'Dropado', 'Digital'],
  ['Crysis 2', 'FPS', 'PS3', 9, 2, 'Não iniciado', 'Físico'],
  ['Crysis 2', 'FPS', 'PS3', 9, 2, 'Não iniciado', 'Físico'],
] };
const zerados = { name: 'Zerados', rows: [
  ['Nome do Jogo', 'Gênero', 'Plataforma', 'Data', 'Tempo de jogo', 'Nota', 'Comentários'],
  ['Astrobot', 'Plataforma', 'PS5', 43850, 10, 9.5, 'Lindo'],
  ['Hades', 'Roguelike', 'Switch', '2021', 30, 9, null],
] };
const detalhes = { name: 'Coleção Mídia Física', rows: [
  ['Nome do Jogo', 'Gênero', 'Plataforma', 'Ano de Lançamento', 'Região', 'Edição', 'Condição da Mídia', 'Condição da Caixa/Encarte', 'Itens Inclusos', 'Data da Compra', 'Local da Compra', 'Valor Pago', 'Valor Atual (Estimado)'],
  ['Crysis 2', 'FPS', 'PS3', 2011, 'BR', 'Limited', 'Bom', 'Ótimo', 'Manual', '15/03/2012', 'Loja X', 'R$ 99,90', 50],
] };

test('reconhece as abas pelo nome das colunas', () => {
  const plans = [backlog, zerados, detalhes].map(planSheet);
  assert.deepEqual(plans.map((p) => p.role), ['lista', 'zerados', 'detalhes']);
  assert.equal(plans[0].map.estHours, 3);
  assert.equal(plans[2].map.condition, 6);
  assert.equal(plans[2].map.boxCondition, 7);
  assert.equal(plans[2].map.priceNow, 12);
  assert.equal(planSheet({ name: 'Randomização', rows: [['PRÓXIMO JOGO'], ['Plataforma', 'Qualquer']] }).role, 'ignorar');
});

test('junta as abas num item por jogo e plataforma', () => {
  const sheets = [backlog, zerados, detalhes];
  const { items } = buildItems(sheets, sheets.map(planSheet));
  const astro = items.find((i) => i.title === 'Astrobot')!;
  assert.equal(astro.kind, 'fisico');
  assert.equal(astro.priority, 1);
  assert.equal(astro.finish?.state, 'concluida');
  assert.equal(astro.finish?.when?.precision, 'dia');
  assert.equal(astro.finish?.when?.iso.slice(0, 10), '2020-01-20');
  assert.equal(astro.rating, 9.5);
  assert.equal(astro.comment, 'Lindo');
  const crysis = items.find((i) => i.title === 'Crysis 2')!;
  assert.equal(crysis.duplicates, 1);
  assert.equal(crysis.detail?.pricePaid, 99.9);
  assert.equal(crysis.detail?.purchasedOn, '2012-03-15');
  assert.equal(items.find((i) => i.title === 'Outlast')!.finish?.state, 'dropada');
  const hades = items.find((i) => i.title === 'Hades')!;
  assert.equal(hades.kind, undefined, 'zerado fora da lista não vira cópia');
  assert.equal(hades.finish?.when?.precision, 'ano');
});

test('interpreta status, formato, nota e prioridade', () => {
  assert.equal(parseStatus('Não iniciado').finish, undefined);
  assert.equal(parseStatus('Platinado').finish, 'concluida');
  assert.equal(parseStatus('Jogando').finish, 'ativa');
  assert.equal(parseStatus('Não vou jogar').wontPlay, true);
  assert.equal(parseKind('Físico'), 'fisico');
  assert.equal(parseKind('Game Pass'), 'assinatura');
  assert.equal(parseKind('Steam'), 'digital');
  assert.equal(parseRating(87), 8.5);
  assert.equal(parseRating('7,3'), 7.5);
  assert.equal(parsePriority('Alta'), 1);
});

test('títulos parecidos casam com o IGDB', () => {
  assert.equal(titleKey('Final Fantasy VII'), titleKey('Final Fantasy 7'));
  assert.ok(similarity('Astrobot', 'Astro Bot') >= 0.97);
  assert.equal(simplerTitle('Shadow of the Colossus Remake'), 'Shadow of the Colossus');
  const m = pickBest('Killzone 2', ['PlayStation 3'], [
    { igdbId: 1, slug: 'killzone', title: 'Killzone', cover: 'x', platforms: ['PlayStation 2'] },
    { igdbId: 2, slug: 'killzone-2', title: 'Killzone 2', cover: 'x', platforms: ['PlayStation 3'] },
  ]);
  assert.equal(m.chosen, 2);
  assert.equal(m.confidence, 'alta');
  assert.equal(pickBest('Jogo Inexistente', [], [{ igdbId: 9, slug: 'x', title: 'Outra Coisa Total', cover: '', platforms: [] }]).chosen, null);
});

test('plataformas e datas', () => {
  assert.equal(canonicalPlatform('PS2'), 'PlayStation 2');
  assert.equal(canonicalPlatform('Switch 2'), 'Nintendo Switch 2');
  assert.equal(shortPlatform('PC (Microsoft Windows)'), 'PC');
  assert.equal(parseLooseDate('03/2019')?.precision, 'mes');
  assert.equal(whenLabel(parseLooseDate('03/2019')!.iso, 'mes'), 'março de 2019');
  assert.equal(whenLabel('2010-07-01T12:00:00-03:00', 'aprox'), 'por volta de 2010');
  assert.equal(whenLabel('2010-07-01T12:00:00-03:00', 'desconhecida'), 'data não informada');
});

test('lê CSV com ponto e vírgula e aspas', () => {
  const [sh] = readCsv('Nome;Plataforma;Nota\n"Jogo; com ponto e vírgula";PS4;8,5\n');
  assert.deepEqual(sh.rows[1], ['Jogo; com ponto e vírgula', 'PS4', 8.5]);
});

test('datas impossíveis são ignoradas, sem quebrar a importação', () => {
  assert.equal(parseLooseDate('12/25/2020'), null);
  assert.equal(parseLooseDate('31/02/2020'), null);
  assert.equal(parseLooseDate('29/02/2020')?.precision, 'dia');
  assert.equal(whenLabel('não é data', 'dia'), 'data não informada');
});
