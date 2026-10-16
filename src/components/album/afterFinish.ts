import { albumApi } from '../../data/albumApi';
import { celebrateSmall } from '../MiniCelebration';

/** Depois de zerar: se a Jornada deu (ou guardou) um pacote, avisa com um toque leve. Nunca atrapalha o zerar. */
export function packAfterFinish(historyId: string, gameId: string) {
  void albumApi.afterFinish(historyId, gameId).then((p) => {
    if (!p) return;
    setTimeout(() => celebrateSmall(p.state === 'fechado' ? 'Pacote de figurinhas' : 'Pacote guardado',
      p.state === 'fechado' ? 'Você ganhou um pacote por este jogo. Abra no Álbum.' : 'Ele ficou guardado para revisão. Veja em Álbum, Pacotes.'), 1500);
  }).catch(() => { /* o álbum nunca atrapalha a Jornada */ });
}
