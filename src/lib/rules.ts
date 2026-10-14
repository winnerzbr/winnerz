/** Regras da comunidade WinnerZ: as mesmas na página /regras e no aceite antes de deixar algo público. */
export const RULES_UPDATED = '2026-10-14';

export interface Rule { title: string; short: string; text: string; examples?: string[] }

export const RULES: Rule[] = [
  {
    title: 'Respeito acima de tudo',
    short: 'Nada de ofensa, ódio ou perseguição.',
    text: 'Discordar faz parte; atacar não. Xingamentos, preconceito de qualquer tipo, ameaças e perseguição a alguém não entram no WinnerZ, nem em tom de brincadeira.',
    examples: ['Ofender alguém pelo gosto em jogos', 'Piadas com raça, gênero, religião, orientação ou deficiência', 'Ficar indo atrás de alguém que já pediu para parar'],
  },
  {
    title: 'Spoiler só com aviso',
    short: 'Avise antes de contar o que acontece.',
    text: 'Cada pessoa está num ponto diferente da jornada. Se for contar reviravolta, final ou surpresa, marque como spoiler. Na comunidade, o que vem depois do seu progresso fica coberto.',
  },
  {
    title: 'O que é seu, com o seu nome',
    short: 'Sem se passar por outra pessoa.',
    text: 'Seu @, sua foto e sua bio são seus. Não use o nome de outra pessoa, de um criador de conteúdo ou do próprio WinnerZ para enganar ninguém.',
  },
  {
    title: 'Nada impróprio',
    short: 'Sem conteúdo sexual, violência real ou dados de terceiros.',
    text: 'Cenas de jogo fazem parte; conteúdo sexual explícito, violência real, golpes e dados pessoais de outras pessoas (endereço, telefone, documentos) não.',
  },
  {
    title: 'Sem spam',
    short: 'Nada de propaganda ou repetição.',
    text: 'Divulgação sem contexto, links suspeitos, correntes e conteúdo repetido em série atrapalham todo mundo.',
  },
];

export const RULES_CONSEQUENCES: { title: string; text: string }[] = [
  { title: 'Denúncia', text: 'Qualquer pessoa com conta pode denunciar um perfil, uma Jornada, uma foto, uma vitrine ou um Museu. Quem foi denunciado não sabe quem denunciou.' },
  { title: 'Revisão', text: 'A moderação olha cada denúncia com calma. Denúncia sem motivo é arquivada e nada acontece.' },
  { title: 'O que pode acontecer', text: 'Um aviso; o conteúdo sai do perfil público (continua no seu diário, só para você); trocar o @ ou apagar a bio; suspensão do perfil público por um tempo. Em casos graves e repetidos, a conta pode ser encerrada.' },
  { title: 'Você é avisado', text: 'Sempre que a moderação agir sobre algo seu, um aviso aparece no topo do site explicando o que foi feito.' },
];
