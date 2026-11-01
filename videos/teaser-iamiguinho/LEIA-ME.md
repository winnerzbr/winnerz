# Teaser do IAmiguinho

Os programas que montam o vídeo a partir das peças pintadas pelo dono. O plano e as decisões estão em `docs/memoria/ideias.md`.

- `render.py 16x9` ou `render.py 9x16`: monta o vídeo sem som (as peças ficam em `pecas/`, fora do repositório).
- `render.py 16x9 12 30.4`: só salva fotos desses instantes (em `fotos/`), para conferir antes de montar tudo.
- `sound.py`: faz o som (`teaser_som.wav`). A risada do cientista entra em 19,9 s quando houver o áudio gravado.
- Juntar: `ffmpeg -i teaser_16x9_video.mp4 -i teaser_som.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest teaser_iamiguinho_16x9.mp4`.
