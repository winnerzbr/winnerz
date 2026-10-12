# WinnerZ

Onde jogos viram histórias. Coleção, Jogos, **Jornada**, Comunidade e Eventos.

Esta é a primeira etapa do site: Início, Jornada (com linha do tempo em modo Cinema e Simples, tela cheia e barra de progresso arrastável), Sessão (pensada para o celular), Coleção, ficha do jogo com análises e escala de notas, e Preferências (tema claro/escuro, intensidade do preto, escala 0–10 ou 5 estrelas, nível das animações).

Sem nenhuma chave configurada, o site roda em **modo demonstração**: tudo fica no navegador de quem acessa. Quando as chaves do Supabase existem, ele passa a usar contas e banco de verdade.

## Rodar no computador

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes das regras de nota
npm run typecheck  # checagem de tipos
```

## Colocar no ar (Vercel + Supabase)

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **SQL Editor**, cole e rode os arquivos de `supabase/migrations/` em ordem (`0001_winnerz.sql`, `0002_midia_e_traducao.sql`, `0003_fotos_no_storage.sql`). Eles criam as tabelas, as regras de acesso (RLS), a visão `review_stats`, os campos de vídeos e tradução e a pasta privada `momentos` do Storage, onde ficam as fotos das sessões.
3. Em **Authentication → URL Configuration**, coloque o endereço do site (ex.: `https://winnerz.vercel.app`) em *Site URL* e em *Redirect URLs*. O login é por link no e-mail, sem senha.
4. Em **Project Settings → API Keys**, copie a chave *Publishable* (`sb_publishable_...`) e a *Secret* (`sb_secret_...`). A *Project URL* é `https://<id-do-projeto>.supabase.co` (o id aparece no endereço do painel).
5. O e-mail de login padrão do Supabase só envia para membros do projeto, no máximo 2 por hora. Antes de abrir o site para outras pessoas, configure um SMTP próprio em **Authentication → Emails → SMTP Settings** (ex.: Resend ou Brevo).

### 2. IGDB (fichas e capas dos jogos)

1. Entre em [dev.twitch.tv/console](https://dev.twitch.tv/console) e registre um aplicativo (categoria *Website Integration*, OAuth redirect `http://localhost`).
2. Copie o *Client ID* e gere um *Client Secret*.

### 3. Vercel

1. Importe o repositório `winnerzbr/winnerz` em [vercel.com/new](https://vercel.com/new). O Vercel reconhece o Vite sozinho.
2. Em **Settings → Environment Variables**, cadastre:

| Variável | Valor | Onde é usada |
|---|---|---|
| `VITE_SUPABASE_URL` | Project URL | navegador |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | chave *Publishable* | navegador |
| `SUPABASE_URL` | Project URL | função `/api/igdb` |
| `SUPABASE_SECRET_KEY` | chave *Secret* | função `/api/igdb` (guarda as fichas dos jogos) |
| `TWITCH_CLIENT_ID` | Client ID da Twitch | função `/api/igdb` |
| `TWITCH_CLIENT_SECRET` | Client Secret da Twitch | função `/api/igdb` |
| `DEEPL_API_KEY` *(opcional)* | chave da API gratuita da DeepL | tradução das sinopses (melhor qualidade) |
| `TRANSLATE_EMAIL` *(opcional)* | um e-mail seu | aumenta o limite diário da tradução gratuita (MyMemory) |

As sinopses do IGDB são traduzidas para o português uma única vez, quando a ficha é aberta pela primeira vez, e ficam guardadas no banco. Sem `DEEPL_API_KEY`, a tradução usa o MyMemory, gratuito e sem cadastro. Gêneros, temas e modos de jogo são traduzidos por dicionário no próprio site.

> Nunca coloque o prefixo `VITE_` na chave *Secret* nem no segredo da Twitch: tudo que começa com `VITE_` vai para o navegador.

3. Faça o deploy. A busca de jogos passa a consultar o IGDB, e cada jogo aberto fica guardado na tabela `games`.

### 4. Domínio (winnerz.com.br, DNS no Registro.br)

1. No Vercel: **Settings → Domains → Add Domain** → `www.winnerz.com.br`, aceitando o redirecionamento de `winnerz.com.br` para o `www`.
2. No Registro.br: **Domínios → winnerz.com.br → DNS → Editar Zona**. Troque o `www` (CNAME) pelo valor que o Vercel mostrar e crie um registro **A** sem nome com o IP que o Vercel mostrar. **Salvar**.
3. No Supabase, **Authentication → URL Configuration**: *Site URL* `https://www.winnerz.com.br` e, em *Redirect URLs*, `https://www.winnerz.com.br/**`.

## Como está organizado

```
api/igdb.ts                 busca e ficha do IGDB (função do Vercel)
supabase/migrations/        banco, regras de acesso e médias das notas
src/data/                   estado do site, demonstração e Supabase
src/lib/rating.ts           regras das notas (0..1000, sem arredondar notas individuais)
src/pages/                  telas
src/components/             cabeçalho, celebração, capa com favorito, barra da sessão
src/styles/                 tokens do visual Atlas, componentes e páginas
public/demo, public/brand   imagens da demonstração e da marca
```

### Regras que o código segue

- Nota guardada de 0 a 1000; cada pessoa vê na escala que escolheu. 8,5/10 aparece como 4,25 estrelas. Médias com uma casa decimal. A escala original de cada análise é preservada.
- Ter o jogo não é o mesmo que ter uma Jornada. “Começou → Zerou” já é uma Jornada completa.
- O progresso é informado pela pessoa; chegar a 100% não marca Zerou sozinho.
- Sem cronômetro de aba aberta e sem sequências que punem quem para de jogar.

## Próximas etapas

- Comunidade: Lobby, comunidades w/tema, jogatinas, Jornada em dupla.
- Eventos: álbum de figurinhas com pacotes, códigos das lives, WinnerZ Awards.
- Livreto da Jornada para imprimir ou compartilhar.
