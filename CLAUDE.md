# WinnerZ — leia antes de qualquer trabalho

Este arquivo é a memória dos projetos do WinnerZ: o site, as lives e os jogos. O Claude lê este arquivo no começo de toda sessão neste repositório. Os detalhes ficam em `docs/memoria/`.

## Antes de começar
1. Leia `docs/memoria/README.md` (índice) e o arquivo do projeto da tarefa:
   - `site.md`: o site;
   - `jogos-de-verao.md`: o jogo;
   - `lives.md`: as lives e o IAmiguinho.
2. Leia as últimas entradas de `docs/memoria/historico.md`.
3. O que estiver escrito ali já foi decidido. Não pergunte de novo e não refaça.

## Ao terminar
Atualize a memória antes de encerrar o trabalho (detalhes em `docs/memoria/README.md`):
- uma entrada nova no `historico.md`, com o que foi feito, decidido ou mudado;
- os arquivos de projeto que mudaram.

Faça o commit junto com o trabalho.

## Quem é o dono
- Heverton, dono do WinnerZ: canal de games no YouTube e na Twitch, site e evento WinnerZ Awards.
- Artista: pintura digital no Procreate e na Huion, além de acrílica e óleo.
- Não é programador:
  - explicar tudo em português simples, sem termos técnicos;
  - sempre mostrar o resultado (demo, imagem, página).

## Regras que valem sempre
- Pode publicar mudanças do site e das páginas sem perguntar antes.
- Só planos gratuitos (Vercel, Supabase, GitHub etc.).
- Linguagem neutra de gênero nos textos do site e dos jogos.
- Nada com "cara de IA": nada de layout genérico de site feito por IA nem arte com aparência de IA.
- Jogos funcionam igual no computador, no controle e no celular.
- Nada de tutorial na tela durante o jogo.

## Segurança (nunca quebrar)
- A chave secreta do Supabase nunca vai em variável `VITE_` nem no navegador.
- Nunca republicar o JSON antigo de exportação do site.
- Nunca pedir que o dono cole chaves ou segredos na conversa:
  - segredos de OAuth ele cadastra direto nos painéis;
  - a chave da conta de serviço do Firebase fica só no Vercel.
- Logs nunca mostram segredos.
- O e-mail do dono não vai para o repositório nem para serviços externos.
- O resultado do WinnerZ Awards não pode vazar antes da data de revelação. Isso vale para código, logs, páginas e conversas.
- `VITE_GOOGLE_CLIENT_ID` é público e pode ficar no navegador.
