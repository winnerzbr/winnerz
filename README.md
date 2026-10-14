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
2. Em **SQL Editor**, cole e rode os arquivos de `supabase/migrations/` em ordem (`0001_winnerz.sql`, `0002_midia_e_traducao.sql`, `0003_fotos_no_storage.sql`, `0004_etapa2.sql`, `0005_ligar_jogos_em_lote.sql`). Eles criam as tabelas, as regras de acesso (RLS), a visão `review_stats`, os campos de vídeos e tradução, a pasta privada `momentos` do Storage (fotos das sessões) e, na 0004, os ids próprios de jogos, as datas com precisão, a ficha completa da cópia, a tabela `my_games` (prioridade, tempo estimado, “não vou jogar”) e as métricas de uso anônimas (`usage_counts`). Todas podem rodar de novo sem problema.
3. Em **Authentication → URL Configuration**, coloque o endereço do site (ex.: `https://winnerz.vercel.app`) em *Site URL* e em *Redirect URLs*. O login é por link no e-mail, sem senha.
4. Em **Project Settings → API Keys**, copie a chave *Publishable* (`sb_publishable_...`) e a *Secret* (`sb_secret_...`). A *Project URL* é `https://<id-do-projeto>.supabase.co` (o id aparece no endereço do painel).
5. O e-mail de login padrão do Supabase só envia para membros do projeto, no máximo 2 por hora. Antes de abrir o site para outras pessoas, configure o Resend (seção 5 abaixo).

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
| `ANTHROPIC_API_KEY` *(opcional)* | chave da API da Anthropic | Retomada Inteligente e foto das capas |
| `CRON_SECRET` | um texto aleatório longo | rotina diária que apaga as contas com exclusão vencida |
| `RESEND_API_KEY` *(opcional)* | chave da API do Resend | e-mails de exclusão de conta |
| `MAIL_FROM` *(opcional)* | `WinnerZ <entrar@winnerz.com.br>` | remetente desses e-mails |
| `VITE_SITE_PRIVATE` | `1` (fechado) ou `0` (aberto) | modo privado: fechado, só a administração vê o site |

As sinopses do IGDB são traduzidas para o português uma única vez, quando a ficha é aberta pela primeira vez, e ficam guardadas no banco. Sem `DEEPL_API_KEY`, a tradução usa o MyMemory, gratuito e sem cadastro. Gêneros, temas e modos de jogo são traduzidos por dicionário no próprio site.

> Nunca coloque o prefixo `VITE_` na chave *Secret* nem no segredo da Twitch: tudo que começa com `VITE_` vai para o navegador.

3. Faça o deploy. A busca de jogos passa a consultar o IGDB, e cada jogo aberto fica guardado na tabela `games`.

### 4. Domínio (winnerz.com.br, DNS no Registro.br)

1. No Vercel: **Settings → Domains → Add Domain** → `www.winnerz.com.br`, aceitando o redirecionamento de `winnerz.com.br` para o `www`.
2. No Registro.br: **Domínios → winnerz.com.br → DNS → Editar Zona**. Troque o `www` (CNAME) pelo valor que o Vercel mostrar e crie um registro **A** sem nome com o IP que o Vercel mostrar. **Salvar**.
3. No Supabase, **Authentication → URL Configuration**: *Site URL* `https://www.winnerz.com.br` e, em *Redirect URLs*, `https://www.winnerz.com.br/**`.

### 5. E-mail (Resend)

Sem isto, ninguém de fora da equipe recebe o link de entrada.

1. Crie a conta em [resend.com](https://resend.com). Em **Domains → Add domain**, digite `winnerz.com.br`.
2. O Resend mostra alguns registros (TXT e MX). No Registro.br, em **DNS → Editar Zona**, crie cada um exatamente como aparece e salve. Espere o domínio ficar *Verified* (de minutos a algumas horas).
3. Em **API Keys → Create API Key**, crie uma chave com permissão *Sending access*. Ela aparece uma vez só: copie direto para o Supabase (passo 4) e para a Vercel (`RESEND_API_KEY`). Não mande essa chave por chat nem e-mail.
4. No Supabase, **Authentication → Emails → SMTP Settings**: ligue *Enable custom SMTP*. Remetente `entrar@winnerz.com.br`, nome `WinnerZ`, host `smtp.resend.com`, porta `465`, usuário `resend`, senha = a chave do Resend. **Save**.
5. Ainda em **Authentication → Emails → Templates**, cole os modelos em português da pasta `supabase/emails/` (o assunto está na primeira linha de cada arquivo): `entrar.html` em *Magic Link*, `confirmar-conta.html` em *Confirm signup*, `trocar-email.html` em *Change Email Address* e `confirmar-acao.html` em *Reauthentication*.
6. Em **Authentication → Rate Limits**, o envio começa em 30 e-mails por hora. O Resend gratuito manda até 100 por dia e 3.000 por mês.
7. Teste numa janela anônima com um e-mail que não é da equipe: o link deve chegar, abrir o site e o código de 6 números também deve funcionar.

### 6. Backup semanal

O plano gratuito do Supabase não tem backup. Todo domingo de madrugada, o GitHub faz um (banco + fotos), tranca com uma senha e guarda por 90 dias em **Actions**.

1. No Supabase, clique em **Connect** (no topo do painel) e copie a *Session pooler* connection string (a que termina em `:5432/postgres`; o GitHub não alcança a conexão direta). Troque `[YOUR-PASSWORD]` pela senha do banco.
2. No GitHub, **Settings → Secrets and variables → Actions → New repository secret**, crie:
   - `SUPABASE_DB_URL`: a connection string do passo 1;
   - `BACKUP_PASSPHRASE`: uma frase longa (20 caracteres ou mais) só para o backup. **Guarde num gerenciador de senhas**: sem ela, o backup não abre;
   - `SUPABASE_URL` e `SUPABASE_SECRET_KEY`: as mesmas da Vercel (para copiar as fotos).
3. Em **Actions → Backup semanal → Run workflow**, rode a primeira vez e confira que fica verde.

Para restaurar (num computador com `openssl` e `psql`):

```bash
# 1. Baixe o arquivo em Actions → Backup semanal → (execução) → Artifacts e descompacte o .zip
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in winnerz-backup-AAAA-MM-DD.tar.gz.enc -out backup.tar.gz
mkdir backup && tar -xzf backup.tar.gz -C backup && cd backup
# 2. Banco: num projeto Supabase novo (connection string do novo projeto)
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file roles.sql --file schema.sql \
  --command 'SET session_replication_role = replica' --file data.sql \
  --dbname "postgresql://..."
# 3. Fotos: a pasta storage/ tem uma subpasta por bucket (momentos, avatares), com os mesmos caminhos.
```

### 7. Abrir o site

O site nasce fechado: só a conta com `is_admin` vê o conteúdo e as outras pessoas veem "Em breve". A lista completa, com o que já foi feito, fica em **Studio** (menu Mais, ou Preferências → Administração). Para abrir: **Vercel → Settings → Environment Variables → `VITE_SITE_PRIVATE` = `0`** e depois **Deployments → Redeploy**. Para fechar de novo, volte para `1`.

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

## Importar uma planilha

Em **Coleção → Importar planilha**, escolha um .xlsx ou .csv. O site lê o arquivo no navegador, reconhece as abas pelo nome das colunas (lista de jogos, zerados, detalhes das cópias), procura cada título no IGDB em lotes e mostra os casos duvidosos para conferir antes de gravar. Importar de novo não duplica o que já existe. Jogos sem ficha do IGDB entram com capa de texto e podem ser ligados à ficha depois, na página do jogo.

## Métricas de uso

A tabela `usage_counts` guarda só o nome do recurso e o dia (nada sobre a pessoa). Para ver no SQL Editor:

```sql
select event, count(*) from usage_counts where day > current_date - 30 group by 1 order by 2 desc;
```
