"""Gravador mínimo de PSD (RGB 8 bits, camadas com transparência, compressão RLE/PackBits)."""
import struct, numpy as np


def packbits_row(row):
    row = np.asarray(row, np.uint8); n = len(row); out = bytearray()
    if n == 0: return bytes(out)
    # trechos de valor repetido
    ch = np.flatnonzero(np.diff(row)) + 1; st = np.concatenate(([0], ch)); ln = np.diff(np.concatenate((st, [n])))
    lit_start = 0; i = 0
    def flush_lit(a, b):
        while a < b:
            k = min(128, b - a); out.append(k - 1); out.extend(row[a:a + k].tobytes()); a += k
    for s, l in zip(st.tolist(), ln.tolist()):
        if l >= 3:
            flush_lit(lit_start, s)
            v = int(row[s]); r = l
            while r > 0:
                k = min(128, r)
                if k >= 2: out.append((257 - k) & 255); out.append(v); r -= k
                else: out.append(0); out.append(v); r -= 1
            lit_start = s + l
    flush_lit(lit_start, n)
    return bytes(out)


def rle_channel(ch):
    rows = [packbits_row(r) for r in ch]
    return b''.join(struct.pack('>H', len(r)) for r in rows), b''.join(rows)


def pascal(name):
    b = name.encode('latin-1', 'replace')[:255]; s = bytes([len(b)]) + b
    while len(s) % 4: s += b'\0'
    return s


def luni(name):
    u = name.encode('utf-16-be'); d = struct.pack('>I', len(name)) + u
    while len(d) % 4: d += b'\0'
    return b'8BIM' + b'luni' + struct.pack('>I', len(d)) + d


def write_psd(path, W, H, layers):
    """layers: lista de baixo para cima: dict(name, rgba (H,W,4) uint8, opacity 0-255, visible)"""
    recs, datas = b'', b''
    for L in layers:
        a = L['rgba']; ys, xs = np.where(a[..., 3] > 0)
        if len(ys): t, l, b, r = ys.min(), xs.min(), ys.max() + 1, xs.max() + 1
        else: t = l = b = r = 0
        sub = a[t:b, l:r]
        chans = []
        for cid, ci in ((-1, 3), (0, 0), (1, 1), (2, 2)):
            if b > t:
                cnt, dat = rle_channel(sub[..., ci]); blob = struct.pack('>H', 1) + cnt + dat
            else:
                blob = struct.pack('>H', 0)
            chans.append((cid, blob))
        rec = struct.pack('>4i', int(t), int(l), int(b), int(r)) + struct.pack('>H', 4)
        for cid, blob in chans: rec += struct.pack('>hI', cid, len(blob))
        flags = 0 if L.get('visible', True) else 2
        rec += b'8BIM' + b'norm' + struct.pack('>BBBB', L.get('opacity', 255), 0, flags, 0)
        extra = struct.pack('>I', 0) + struct.pack('>I', 0) + pascal(L['name']) + luni(L['name'])
        rec += struct.pack('>I', len(extra)) + extra
        recs += rec; datas += b''.join(blob for _, blob in chans)
    info = struct.pack('>h', len(layers)) + recs + datas
    if len(info) % 2: info += b'\0'
    lmi = struct.pack('>I', len(info)) + info + struct.pack('>I', 0)
    # imagem achatada (para visualizadores sem suporte a camadas)
    comp = np.zeros((H, W, 3), float); comp[:] = 255
    for L in layers:
        if not L.get('visible', True): continue
        a = L['rgba'].astype(float); al = a[..., 3:4] / 255 * L.get('opacity', 255) / 255
        comp = comp * (1 - al) + a[..., :3] * al
    comp = comp.round().clip(0, 255).astype(np.uint8)
    cnts, dats = b'', b''
    for c in range(3):
        cnt, dat = rle_channel(comp[..., c]); cnts += cnt; dats += dat
    with open(path, 'wb') as f:
        f.write(b'8BPS' + struct.pack('>H', 1) + b'\0' * 6 + struct.pack('>HIIHH', 3, H, W, 8, 3))
        f.write(struct.pack('>I', 0)); f.write(struct.pack('>I', 0))
        f.write(struct.pack('>I', len(lmi)) + lmi)
        f.write(struct.pack('>H', 1) + cnts + dats)
    return comp
