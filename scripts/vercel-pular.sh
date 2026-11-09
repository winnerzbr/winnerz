#!/bin/sh
# Decide se o Vercel monta uma versão nova do site (regra "ignoreCommand" do vercel.json).
# Saída 0 = pular (nada do site mudou desde a última versão no ar); saída 1 = montar.
# Pular evita guardar no Vercel cópias iguais do site (o plano grátis tem 10 GB para todas as versões).
A="$VERCEL_GIT_PREVIOUS_SHA"
# Sem versão anterior conhecida, ou republicação do mesmo commit: monta sempre.
if [ -z "$A" ] || [ "$A" = "$VERCEL_GIT_COMMIT_SHA" ]; then exit 1; fi
# Se o commit anterior não estiver na cópia do Vercel (ele baixa só os envios mais recentes), monta. Qualquer saída que
# não seja 0 ou 1 o Vercel trata como erro e não publica (foi o que travou o site de 05/11 a 09/11/2026).
git cat-file -e "$A^{commit}" 2>/dev/null || exit 1
# Só estas pastas e arquivos entram no site. Mudanças em docs/, jogos/, art/, videos/ etc. não publicam.
if git diff --quiet "$A" HEAD -- src public api index.html package.json package-lock.json vite.config.ts tsconfig.json vercel.json scripts/vercel-pular.sh; then exit 0; fi
exit 1
