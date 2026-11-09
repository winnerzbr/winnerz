#!/usr/bin/env python3
"""Monta P.css (Pincel) e S.css (Figurinha) a partir dos modelos .tpl: calcula as máscaras de pincelada e o contorno recortado do título."""
import math, os, random
from urllib.parse import quote
HERE = os.path.dirname(os.path.abspath(__file__))

def uri(path):
    svg = f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='{path}'/></svg>"
    return 'url("data:image/svg+xml,' + quote(svg, safe="/:=' ") + '")'

def brush(seed, rag=5.0, jit=7.0, teeth=7, vertical=False):
    """Pincelada: bordas de cima e de baixo onduladas (curvas) e pontas com fios de cerdas de comprimentos diferentes."""
    r = random.Random(seed)
    def edge(y0, sign, n=7):
        return [(rag * 2.2 + (100 - 4.4 * rag) * i / n, y0 + sign * r.uniform(0, jit)) for i in range(n + 1)]
    def end(x0, sign, up):
        pts, y = [], 0.0
        while y < 100:
            h = r.uniform(11, 26); tip = x0 + sign * r.uniform(0, rag * .8)
            y2 = min(100, y + h)
            pts += [(tip, y + 1.2), (tip, y2 - 1.2)]
            if y2 < 100:
                nh = r.uniform(2.5, 6); pts.append((x0 + sign * r.uniform(rag * 1.2, rag * 3.2), y2 + nh / 2)); y2 += nh
            y = y2
        if up: pts = [(x, 100 - yy) for x, yy in pts]
        return pts
    top = edge(0, 1); bot = edge(100, -1)[::-1]
    def curve(ps):
        d = f'L{ps[0][0]:.1f} {ps[0][1]:.1f}'
        for i in range(1, len(ps) - 1):
            mx, my = (ps[i][0] + ps[i + 1][0]) / 2, (ps[i][1] + ps[i + 1][1]) / 2
            d += f' Q{ps[i][0]:.1f} {ps[i][1]:.1f} {mx:.1f} {my:.1f}'
        return d + f' L{ps[-1][0]:.1f} {ps[-1][1]:.1f}'
    def line(ps): return ' '.join(f'L{x:.1f} {y:.1f}' for x, y in ps)
    sw = (lambda ps: [(y, x) for x, y in ps]) if vertical else (lambda ps: ps)
    d = 'M' + curve(sw(top))[1:] + ' ' + line(sw(end(100, -1, False))) + ' ' + curve(sw(bot)) + ' ' + line(sw(end(0, 1, True))) + 'Z'
    return uri(d)

def rough(seed, j=.9, n=16):
    """Retângulo de borda levemente irregular (tela cortada à mão)."""
    r = random.Random(seed); pts = []
    for i in range(n): pts.append((100 * i / n, r.uniform(0, j)))
    for i in range(n): pts.append((100 - r.uniform(0, j * .6), 100 * i / n))
    for i in range(n): pts.append((100 - 100 * i / n, 100 - r.uniform(0, j)))
    for i in range(n): pts.append((r.uniform(0, j * .6), 100 - 100 * i / n))
    return uri('M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in pts) + 'Z')

def ring(rad, color, n=28):
    return ','.join(f'{rad * math.cos(2 * math.pi * i / n):.1f}px {rad * math.sin(2 * math.pi * i / n):.1f}px 0 {color}' for i in range(n))

SUB = {
    '@@BR1@@': brush(11, 3.2, 9), '@@BR2@@': brush(23, 4.2, 12), '@@BR3@@': brush(37, 6, 34, teeth=5),
    '@@BV@@': brush(41, 6, 22, teeth=4, vertical=True), '@@RR@@': rough(5),
    '@@RING@@': ring(7, '#F2F4F6') + ',' + ring(4, '#F2F4F6', 16) + ',0 14px 0 rgba(0,0,0,.45)',
}
for t in ('P', 'S'):
    s = open(os.path.join(HERE, f'themes/{t}.tpl'), encoding='utf-8').read()
    for k, v in SUB.items():
        s = s.replace(k, v)
    assert '@@' not in s, t
    open(os.path.join(HERE, f'themes/{t}.css'), 'w', encoding='utf-8').write(s)
    print(t, len(s))
