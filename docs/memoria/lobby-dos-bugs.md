# Lobby dos Bugs: jogo para o Steam

Jogo próprio a partir do minijogo Lobby dos Bugs do Arcade do IAmiguinho, para vender no Steam. Corre em paralelo aos Jogos de Verão.

**Documento do jogo:** "Lobby dos Bugs: documento do jogo" (página no Claude, artefato a59fb9dc-3875-42a6-a7c6-d1b4aab39290, https://claude.ai/artifact/MTDMfMah9pmy7Vkt1nzBUK). É a referência completa; aqui fica o resumo.

## Decidido pelo dono (07/11/2026)
- **Mistura:** jogo de hordas no estilo de Vampire Survivors (só andar, ataque automático, escolher melhorias quando a barra enche) com a estrutura de Left 4 Dead (fases do começo até um ponto seguro).
- **Ponto seguro com troca:** lá aparecem itens prontos, e para levar um é preciso entregar algo que já se tem. Exemplo do dono: pistola de 3 tiros com cadência nível 2 contra pistola de 2 tiros com cadência nível 5.
- **Sorteio sempre equilibrado:** os itens são sorteados, mas balanceados.
- **Muitos itens e inimigos:** centenas de itens e grande variedade de inimigos.
- **Fases e chefes:** fases fixas, não sorteadas. Chefão difícil no fim de cada fase, antes do ponto seguro, e subchefes durante a fase.
- **Visual:** estilo 8 bits. Os gráficos começam gerados por código, e o dono ajusta e faz os sprites dele.
- **Editor de sprites:** um programa de pintura de pixel art em que o dono redesenha cada elemento e personagem, com o botão "Trocar no jogo".
- **Ordem:** começar pelo documento do jogo.
- **Nome:** "Lobby dos Bugs" é provisório; o nome definitivo será escolhido mais para frente.
- **Lançamento:** sem Acesso Antecipado; o jogo sai completo e com mais fases. Precisa durar: não pode dar para zerar em menos de 2 horas e pedir reembolso. O jogo terá mecanismos para jogar por muito tempo sem ver tudo dentro do prazo de reembolso.
- **Ateliê:** nunca será liberado para os jogadores; é ferramenta só do dono (sem Oficina Steam). As skins são desenhadas pelo dono e desbloqueadas jogando.
- **Primeira campanha:** tema "a internet de casa caiu" (5 fases: lan house abandonada, ruas do bairro à noite, esgoto de cabos, data center, servidor central).
- **Trocas no ponto seguro:** começa com 1 troca por ponto seguro e a 2ª é desbloqueada depois.
- **Dash:** além de andar, a pessoa tem um dash (arrancada rápida com tempo de recarga).
- **Jogar junto:** até 4 pessoas no mesmo PC entra já no lançamento.
- **Prioridade:** os dois jogos (este e os Jogos de Verão) recebem a mesma atenção. Este será lançado antes, por ser mais fácil de animar; os Jogos de Verão exigem mais trabalho e mecânicas.

## Proposto no documento (aguarda o dono)
- **Itens:** cerca de 30 armas base e 30 acessórios base, com variações sorteadas e uma "nota de poder" que mantém o sorteio justo.
- **Inimigos:** comportamentos combinados com aparências, inimigos especiais avisados pelo som e um "Diretor" que dosa as hordas.
- **Campanhas:** 3 campanhas de 5 fases (15 fases) liberadas em sequência, mais uma fase secreta; fases de 6 a 10 minutos.
- **Feito para durar:** itens liberados por desafios (150), versões jogáveis do IAmiguinho, "Níveis de Lag" (rejogar com regras extras, até 20), chefões corrompidos, segredos, desafio da semana, conquistas e compêndio. Meta: em 2 horas ver a 1ª campanha e o começo da 2ª; tudo em 30 a 40 horas.
- **Ateliê:** o editor de sprites fica dentro do próprio jogo (Godot), com os botões "Trocar no jogo", "Voltar ao padrão" e "Tornar oficial". O Godot consegue ler desenhos novos de uma pasta e trocar na hora.
- **Arte gerada por IA:** nenhuma dentro do jogo. O Steam exige aviso na página e parte do público rejeita.
- **Jogar junto:** até 4 pessoas no mesmo PC. Online fica para depois; o Remote Play Together do Steam cobre parte.
- **Plano de produção:**
  1. Protótipo de uma fase completa.
  2. Teste com o Discord.
  3. Base do jogo.
  4. Página no Steam.
  5. Demo no Next Fest.
  6. Lançamento.
- **Decisões em aberto:** estão listadas no fim do documento.

## Onde fica o código
- Ainda não existe. Será um repositório próprio no GitHub, feito no Godot.
