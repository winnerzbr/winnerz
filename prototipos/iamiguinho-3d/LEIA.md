# IAmiguinho 3D no site

- Origem: `IAmiguinho_3D_Final.glb` (Tripo, 27 MB, o modelo dos jogos). Não fica no repositório.
- `preparo/prep.py`: pinta de laranja as partes brancas embaixo da aba do boné, nivela a hélice (veio inclinada 19°),
  corta a emenda entre os pés e afasta as pernas, e calcula os 16 ossos e os pesos.
- `preparo/leve.py 0.0065`: versão leve (cerca de 53 mil vértices, cores por vértice) em `public/modelos/iamiguinho.bin` (formato IAM1).
- `preparo/pose.py`: imagens de conferência (pesos coloridos e uma pose de teste).
- No site: `src/lib/iamiguinho3d.js` (WebGL, animações, rosto) e `src/components/IAmiguinho3D.tsx` (aparição com balão).
