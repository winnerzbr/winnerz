# WinnerZ — instruções para o Codex (ChatGPT) e outros agentes

Este repositório é o site do WinnerZ (www.winnerz.com.br). O Claude também trabalha aqui, e os dois seguem as mesmas regras e a mesma memória.

## Antes de qualquer trabalho
1. Leia o `CLAUDE.md` da raiz. As regras e a segurança de lá valem para você também, sem exceção.
2. Leia `docs/memoria/README.md`, `docs/memoria/site.md` e as últimas entradas de `docs/memoria/historico.md`.
3. O que estiver escrito ali já foi decidido. Não pergunte de novo e não refaça.
4. O jogo IAmiguinho: Jogos de Verão não é feito aqui (está no Godot, em outro repositório). Não mexa em `jogos/` nem em `public/demo/jogos-verao/`.

## Como entregar
- Nunca envie direto para o `main`. Cada mudança vai num pull request, que o dono aprova.
- Comece do `main` mais novo. Se o pull request ficar com conflito, atualize a partir do `main` e mantenha as mudanças dos dois lados.
- Junte as mudanças de um assunto num pull request só: cada pull request gera uma prévia no Vercel, e o plano grátis tem 10 GB para todas as versões.
- Antes de abrir o pull request, rode `npm run typecheck` e `npm test`.
- Para testar as telas, rode `npm run dev`. Sem chaves, o site roda em modo demonstração. Não cadastre chaves no ambiente.

## Ao terminar
- Escreva uma entrada nova no topo de `docs/memoria/historico.md`, com a data, "(ChatGPT)" no título, o que o dono pediu, o que foi feito, as decisões e o que ficou pendente.
- Atualize `docs/memoria/site.md`, trocando o que mudou em vez de só acrescentar linhas.
- Ponha tudo no mesmo pull request.

## Com o dono
- O Heverton não é programador. Explique em português simples, sem termos técnicos, e mostre o resultado: o link da prévia do Vercel ou uma imagem.
- Nunca peça chaves, senhas ou segredos na conversa. Ele cadastra os segredos direto nos painéis.
- Quando a mudança trouxer uma migração nova em `supabase/migrations/`, diga a ele qual arquivo rodar no SQL Editor do Supabase.
