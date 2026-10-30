"""Vôlei em desenho animado com a arte pintada (imagens geradas): monta verao_cartoon/volei.html."""
import pathlib, re, subprocess
HERE = pathlib.Path(__file__).resolve().parent
VC = HERE.parent / 'verao_cartoon'
js = (VC / 'cartoon.js').read_text(encoding='utf-8')
def sub1(old, new, text):
    assert text.count(old) == 1, (old[:80], text.count(old)); return text.replace(old, new)
pint = (HERE / 'pintado.js').read_text(encoding='utf-8') + '\n' + (HERE / 'inteiro.js').read_text(encoding='utf-8') + '\n' + (HERE / 'anim4.js').read_text(encoding='utf-8')
js = sub1("  /* ---------------------------------------------------------- desenho principal do vôlei */", pint + "\n  /* ---------------------------------------------------------- desenho principal do vôlei */", js)
js = sub1("function heldPos(v, i) { const p = v.P[i], f = i ? -1 : 1; return { x: p.x + f * 15.5 * CHAR_K, y: p.y - (v.charging ? 24 : 18) * CHAR_K }; }",
          "function heldPos(v, i) { const p = v.P[i], f = i ? -1 : 1, a2 = ART2(); if (a2 && i === 0 && (INTEIRO() || MVOK())) return heldIA(p, f); return { x: p.x + f * (a2 ? 13 : 15.5) * CHAR_K, y: p.y - (v.charging ? (a2 ? 30 : 24) : (a2 ? 25 : 18)) * CHAR_K }; }", js)
js = sub1("    scene(this, tt);\n", "    const A2 = ART2(); (A2 ? scene2 : scene)(this, tt);\n", js)
js = sub1("    net();\n", "    (A2 ? net2 : net)();\n", js)
js = sub1("    this.P.forEach((p, i) => { if (i === 0) drawIA(this, p, i, tt, base); else drawBlob(this, p, i, tt, base); });",
          """    this.P.forEach((p, i) => { if (i === 0) (A2 ? (MVOK() ? drawIA4 : INTEIRO() ? drawIA3 : drawIA2) : drawIA)(this, p, i, tt, base); else (A2 ? drawBlob2 : drawBlob)(this, p, i, tt, base); });
    if (A2) {
      // areia levantando: pouso, peixinho e bola no chão
      const st = stOf('spl'), dts = clamp(tt - (st.tt || tt), 0, .05); st.tt = tt; st.g = st.g || [true, true];
      this.P.forEach((p, i) => { if (p.g && !st.g[i]) splash(p.x + (p.dv ? p.dv.dir * 6 : 0), !!p.dv); st.g[i] = p.g; });
      const onG = b.y + VRB >= VGY - 1; if (onG && !st.bg) splash(b.x, true); st.bg = onG;
      drawSplashes(dts);
    }""", js)
js = sub1("    drawBall(bv.x, bv.y, VRB, b.ang, ", "    (A2 ? drawBall2 : drawBall)(bv.x, bv.y, VRB, b.ang, ", js)
js = sub1("      drawBall(b.x, b.y, VRB, b.ang);\n", "      (A2 ? drawBall2 : drawBall)(b.x, b.y, VRB, b.ang);\n", js)
js = sub1("    scoreboard(this);\n", "    (A2 ? scoreboard2 : scoreboard)(this);\n", js)
(HERE / 'cartoon2.js').write_text((HERE / 'assets.js').read_text() + '\n' + (HERE / 'iaposes.js').read_text() + '\n' + (HERE / 'mvset.js').read_text() + '\n' + js, encoding='utf-8')
# reaproveita o montador da versão vetorial, trocando só o desenho
b = (VC / 'build.py').read_text(encoding='utf-8')
b = b.replace("HERE = pathlib.Path(__file__).resolve().parent", "HERE = pathlib.Path(%r)" % str(VC))
b = b.replace("js = (HERE / 'cartoon.js').read_text(encoding='utf-8')", "js = pathlib.Path(%r).read_text(encoding='utf-8')" % str(HERE / 'cartoon2.js'))
b = b.replace("(HERE / 'volei.html').write_text(s, encoding='utf-8')", "pathlib.Path(%r).write_text(s, encoding='utf-8')" % str(HERE / 'volei2.html'))
b = b.replace("mesmos adversários do vôlei de praia, com tudo redesenhado em vetor.", "mesmos adversários do vôlei de praia, com a arte pintada (imagens geradas) e braços e pernas de borracha.")
exec(compile(b, 'build', 'exec'))
