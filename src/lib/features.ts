/**
 * Recursos escondidos enquanto o site é pequeno (Etapa 1 da revisão, outubro de 2026).
 * O código continua aqui; para trazer um de volta, troque para true e publique.
 * A decisão de trazer de volta vem do painel "Uso por recurso" do Studio, depois dos primeiros convites.
 */
export const FEATURES = {
  /** Clubes: grupos que duram semanas. Voltam quando houver gente para manter um grupo vivo. */
  clubes: false,
  /** Pactos: metas combinadas com amigos para um jogo. */
  pactos: false,
  /** "Amigos agora": quem está on-line ou jogando. Desligado por padrão e de mão dupla; com poucas pessoas fica vazio. */
  presenca: false,
  /** Trilhas: sequências de jogos montadas pela administração. Voltam quando houver a primeira publicada. */
  trilhas: false,
  /** Ligar conquistas da Steam e do RetroAchievements aos capítulos de um jogo. */
  conquistasCapitulos: false,
  /** Narração dos capítulos por IA (divide a cota de IA com a Retomada e a foto das capas). */
  narracaoIA: false,
} as const;
