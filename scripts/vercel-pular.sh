#!/bin/sh
# Decide se o Vercel monta uma versão nova do site (regra "ignoreCommand" do vercel.json).
# Saída 0 = pular (nada do site mudou desde a última versão no ar); saída 1 = montar.
# Pular evita guardar no Vercel cópias iguais do site (o plano grátis tem 10 GB para todas as versões).
# Atenção: a "versão anterior" pode ser uma prévia de outro ramo. Se uma mudança do site passou antes por uma prévia
# e o último commit enviado ao main só muda docs/, o Vercel pula e o site no ar não muda. Nesse caso, mandar o código
# e a memória no mesmo commit, ou um commit que mexa em algo do site.
A="$VERCEL_GIT_PREVIOUS_SHA"
# Sem versão anterior conhecida, ou republicação do mesmo commit: monta sempre.
if [ -z "$A" ] || [ "$A" = "$VERCEL_GIT_COMMIT_SHA" ]; then exit 1; fi
# Só estas pastas e arquivos entram no site. Mudanças em docs/, jogos/, art/, videos/ etc. não publicam.
# Se o commit anterior não estiver na cópia do Vercel, o git dá erro e o site é montado (lado seguro).
git diff --quiet "$A" HEAD -- src public api index.html package.json package-lock.json vite.config.ts tsconfig.json vercel.json scripts/vercel-pular.sh
