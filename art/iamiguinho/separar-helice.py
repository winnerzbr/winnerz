# Separa as pás da hélice de cada imagem do IAmiguinho (para girar no site, M6).
# Uso: python3 separar-helice.py public/brand/iamiguinho public/brand/iamiguinho/anim
# As pás são componentes azuis alongados no topo; o eixo (azul escuro) e o boné (listras com branco) param o preenchimento.
# Saída: <nome>-helice.webp (só as pás), <nome>-corpo.webp (o resto) e helice.json (eixo em %).
import sys, json, glob, os, colorsys
from collections import deque
from PIL import Image, ImageFilter
src, out = sys.argv[1], sys.argv[2]
VMIN = float(sys.argv[3]) if len(sys.argv) > 3 else 0.42
meta = {}
for path in sorted(glob.glob(os.path.join(src, '*.webp'))):
    name = os.path.basename(path)[:-5]
    if not (name.startswith('pose-') or name.startswith('cara-')): continue
    im = Image.open(path).convert('RGBA'); W, H = im.size; px = im.load()
    def hsv(p): return colorsys.rgb_to_hsv(p[0]/255, p[1]/255, p[2]/255)
    def blade(x, y):
        p = px[x, y]
        if p[3] < 30: return False
        h, s, v = hsv(p)
        return 0.55 < h < 0.72 and s > 0.4 and v > VMIN
    lim = int(H * (0.25 if name.startswith('pose-') else 0.45))
    def fill(seed):
        q = deque([seed]); seen = {seed}
        while q:
            x, y = q.popleft()
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx, ny = x+dx, y+dy
                if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in seen and blade(nx, ny):
                    seen.add((nx, ny)); q.append((nx, ny))
        return seen
    # Pás: componentes azuis alongados (bem mais largos que altos) no topo da imagem. Até duas.
    visited = set(); comps = []
    for y in range(lim):
        for x in range(W):
            if (x, y) in visited or not blade(x, y): continue
            c = fill((x, y)); visited |= c
            xs = [p[0] for p in c]; ys = [p[1] for p in c]
            w, h = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
            if len(c) > 300 and w > 0.18 * W and w > 1.8 * h:
                cy = sum(ys) / len(ys)
                if not comps or abs(cy - comps[0][1]) < 0.12 * H: comps.append((c, cy))
            if len(comps) == 2: break
        if len(comps) == 2: break
    if not comps: meta[name] = None; print('sem pás', name); continue
    mask = set().union(*[c for c, _ in comps])
    # Borda suave: inclui vizinhos opacos (antisserrilhado) até 2 px, desde que não sejam do boné (branco).
    m = Image.new('L', (W, H), 0); mp = m.load()
    for (x, y) in mask: mp[x, y] = 255
    m = m.filter(ImageFilter.MaxFilter(5)); mp = m.load()
    hel = Image.new('RGBA', (W, H)); hp = hel.load(); body = im.copy(); bp = body.load()
    n = 0
    for y in range(H):
        for x in range(W):
            if mp[x, y] and px[x, y][3] > 0:
                p = px[x, y]; h, s, v = hsv(p)
                if (x, y) not in mask and (s < 0.25 and v > 0.7): continue  # branco do boné ou fumaça
                if (x, y) not in mask and not (0.5 < h < 0.75): continue
                hp[x, y] = p; bp[x, y] = (0, 0, 0, 0); n += 1
    # Restos soltos no corpo (bordas das pás, de poucos pixels) vão para a hélice: senão aparecem como cisco quando ela gira.
    vis = set()
    for y0 in range(lim):
        for x0 in range(W):
            if (x0, y0) in vis or bp[x0, y0][3] <= 8: continue
            comp = []; q = deque([(x0, y0)]); vis.add((x0, y0))
            while q and len(comp) <= 400:
                x, y = q.popleft(); comp.append((x, y))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = x+dx, y+dy
                        if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in vis and bp[nx, ny][3] > 8:
                            vis.add((nx, ny)); q.append((nx, ny))
            if len(comp) <= 400 and not q:
                for (x, y) in comp: hp[x, y] = bp[x, y]; bp[x, y] = (0, 0, 0, 0)
    ys = [y for (x, y) in mask]; xs = [x for (x, y) in mask]
    # eixo: ponto entre as duas pás (o meio da faixa mais estreita entre elas)
    # Eixo: o pino escuro que sobra no corpo logo abaixo do miolo da hélice (o ponto escuro mais alto no terço do meio).
    x0, x1 = min(xs), max(xs); y0 = min(ys)
    def escuro(x, y):
        p = bp[x, y]
        return p[3] > 200 and hsv(p)[2] < 0.42
    cand = [(y, x) for y in range(y0, min(H, max(ys) + int(H * 0.08))) for x in range(int(x0 + (x1 - x0) * 0.25), int(x0 + (x1 - x0) * 0.75)) if escuro(x, y)]
    if cand:
        yt = min(cand)[0]; linha = [x for (y, x) in cand if yt <= y <= yt + 3]
        cx = sum(linha) / len(linha); cy = yt
    else:
        cx = sum(xs) / len(xs); cy = sum(ys) / len(ys)
    # Inclinação das pás (eixo principal dos pixels): o giro acontece nessa direção, não sempre na horizontal.
    import math
    mx = sum(xs) / len(xs); my = sum(ys) / len(ys)
    sxx = sum((x - mx) ** 2 for x in xs); syy = sum((y - my) ** 2 for y in ys); sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    ang = 0.5 * math.degrees(math.atan2(2 * sxy, sxx - syy))
    meta[name] = {'x': round(cx / W * 100, 2), 'y': round(cy / H * 100, 2), 'a': round(ang, 1), 'n': n}
    hel.save(os.path.join(out, name + '-helice.webp'), quality=92); body.save(os.path.join(out, name + '-corpo.webp'), quality=92)
json.dump(meta, open(os.path.join(out, 'helice.json'), 'w'))
print({k: v and v['n'] for k, v in meta.items()})
