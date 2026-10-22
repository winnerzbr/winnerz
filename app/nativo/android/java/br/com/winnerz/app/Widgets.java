package br.com.winnerz.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Monta os widgets. Jornada, O que jogar hoje, Sua semana, Próxima jogatina, Atalho, Álbum, Awards, Avisos e Live
 * usam o painel que o app busca no WinnerZ (Painel); o Radar usa o que o site guarda (atualizarWidgets).
 */
final class Widgets {
    static final int TINTA = 0xFFE6E9ED;
    static final int APAGADO = 0xFF9AA1AA;
    static final int AGORA = 0xFFFFB25B;
    static final int OURO = 0xFFE2BE84;
    static final int ESCURO = 0xFF07080A;

    private static final String[][] INTENCOES = {
        { "descansar", "Descansar", "descansar" },
        { "divertir", "Me divertir", "me divertir" },
        { "avancar", "Avançar", "avançar" },
        { "desafio", "Desafio", "desafio" },
    };

    private Widgets() {}

    private interface Montador { RemoteViews montar(Context c); }

    static void atualizarTodos(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        desenhar(c, m, JornadaWidget.class, Widgets::jornada);
        desenhar(c, m, RadarWidget.class, Widgets::radar);
        desenhar(c, m, JogarHojeWidget.class, Widgets::jogarHoje);
        desenhar(c, m, SemanaWidget.class, Widgets::semana);
        desenhar(c, m, JogatinaWidget.class, Widgets::jogatina);
        desenhar(c, m, AtalhoWidget.class, Widgets::atalho);
        desenhar(c, m, AlbumWidget.class, Widgets::album);
        desenhar(c, m, AwardsWidget.class, Widgets::awards);
        desenhar(c, m, AvisosWidget.class, Widgets::avisos);
        desenhar(c, m, LiveWidget.class, Widgets::live);
    }

    private static void desenhar(Context c, AppWidgetManager m, Class<?> k, Montador f) {
        try {
            int[] ids = m.getAppWidgetIds(new ComponentName(c, k));
            if (ids == null || ids.length == 0) return;
            RemoteViews v = f.montar(c);
            for (int id : ids) m.updateAppWidget(id, v);
        } catch (Exception e) {
            // Um widget com problema não derruba os outros.
        }
    }

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(WinnerzNativoPlugin.PREFS, Context.MODE_PRIVATE);
    }

    // ── Peças ─────────────────────────────────────────────────────────────────
    /** 0 = normal, 1 = agora (âmbar), 2 = ouro (só o Awards). */
    private static void cabeca(RemoteViews v, int traco, int rotulo, String texto, int tom) {
        v.setImageViewResource(traco, tom == 1 ? R.drawable.traco_agora : tom == 2 ? R.drawable.traco_ouro : R.drawable.traco);
        v.setTextViewText(rotulo, texto);
        v.setTextColor(rotulo, tom == 1 ? AGORA : APAGADO);
    }

    private static void botao(RemoteViews v, int id, String texto, PendingIntent pi) {
        if (texto == null) { v.setViewVisibility(id, View.GONE); return; }
        v.setViewVisibility(id, View.VISIBLE);
        v.setTextViewText(id, texto);
        if (pi != null) v.setOnClickPendingIntent(id, pi);
    }

    private static void estilo(RemoteViews v, int id, boolean principal) {
        v.setInt(id, "setBackgroundResource", principal ? R.drawable.botao_principal : R.drawable.botao_sec);
        v.setTextColor(id, principal ? ESCURO : TINTA);
    }

    private static void capa(Context c, RemoteViews v, int caixa, int img, int txt, JSONObject jogo) {
        if (jogo == null) { v.setViewVisibility(caixa, View.GONE); return; }
        v.setViewVisibility(caixa, View.VISIBLE);
        Bitmap b = Painel.capa(c, jogo.optString("gameId"));
        if (b != null) {
            v.setImageViewBitmap(img, b);
            v.setTextViewText(txt, "");
        } else {
            v.setImageViewResource(img, R.drawable.capa_vazia);
            v.setTextViewText(txt, Painel.iniciais(jogo.optString("titulo")));
        }
    }

    private static PendingIntent abrir(Context c, String caminho, int codigo) { return Links.abrir(c, caminho, codigo); }
    private static PendingIntent acao(Context c, String acao, String a, String b) { return AcoesReceiver.botao(c, acao, a, b); }

    private static PendingIntent externo(Context c, String url, int codigo) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(c, codigo, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static int modulo(int n, int t) { return t <= 0 ? 0 : ((n % t) + t) % t; }

    private static JSONObject jornadaDe(JSONObject p) { return p == null ? null : p.optJSONObject("jornada"); }
    private static JSONObject abertaDe(JSONObject p) { JSONObject j = jornadaDe(p); return j == null ? null : j.optJSONObject("aberta"); }

    private static String rotuloIntencao(String id) {
        for (String[] i : INTENCOES) if (i[0].equals(id)) return i[2];
        return "";
    }

    private static String plural(long n, String um, String varios) { return n + " " + (n == 1 ? um : varios); }

    // ── Jornada: a sessão inteira pelo widget ───────────────────────────────────
    static RemoteViews jornada(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_jornada);
        v.setViewVisibility(R.id.wj_chips, View.GONE);
        v.setViewVisibility(R.id.wj_cronometro, View.GONE);
        v.setViewVisibility(R.id.wj_ant, View.GONE);
        v.setViewVisibility(R.id.wj_prox, View.GONE);
        for (int b : new int[] { R.id.wj_b1, R.id.wj_b2, R.id.wj_b3 }) v.setViewVisibility(b, View.GONE);
        v.setTextViewText(R.id.wj_canto, "");
        v.setTextViewText(R.id.wj_resumo, "");
        v.setOnClickPendingIntent(R.id.wj_raiz, abrir(c, "/jornada", 11));
        String flash = Conta.flash(c);

        JSONObject p = Conta.painel(c);
        if (!Conta.ligada(c) || p == null) {
            cabeca(v, R.id.wj_traco, R.id.wj_rotulo, "Jornada", 0);
            v.setViewVisibility(R.id.wj_capa_caixa, View.GONE);
            boolean ligada = Conta.ligada(c);
            v.setTextViewText(R.id.wj_titulo, ligada ? "Carregando sua Jornada…" : "Entre no app para ligar este widget.");
            v.setTextViewText(R.id.wj_sub, ligada ? "" : "Depois, a sessão inteira se faz por aqui: jogar, momentos, pontos e o fim.");
            if (!ligada) botao(v, R.id.wj_b1, "Abrir o app", abrir(c, "/jornada", 12));
            return v;
        }

        JSONObject j = jornadaDe(p);
        JSONObject ab = abertaDe(p);
        if (ab != null) {
            long inicio = Painel.ms(ab.optString("inicio"));
            if (inicio <= 0) inicio = System.currentTimeMillis();
            String intencao = Painel.txt(ab, "intencao"), objetivo = Painel.txt(ab, "objetivo");
            String chaveSessao = ab.optString("id", ab.optString("gameId") + "@" + inicio);
            boolean comecou = intencao.isEmpty() && !chaveSessao.equals(Conta.texto(c, "pulou")) && System.currentTimeMillis() - inicio < 15 * 60_000L;

            cabeca(v, R.id.wj_traco, R.id.wj_rotulo, intencao.isEmpty() ? "Sessão aberta" : "Sessão aberta · " + rotuloIntencao(intencao), 1);
            v.setViewVisibility(R.id.wj_cronometro, View.VISIBLE);
            v.setChronometer(R.id.wj_cronometro, SystemClock.elapsedRealtime() - Math.max(0, System.currentTimeMillis() - inicio), null, true);
            v.setTextViewText(R.id.wj_titulo, Painel.txt(ab, "titulo"));
            v.setOnClickPendingIntent(R.id.wj_raiz, abrir(c, "/sessao", 13));

            if (comecou) {
                // Nos primeiros minutos: para que é a sessão de hoje? (um toque escolhe; dá para pular)
                v.setViewVisibility(R.id.wj_capa_caixa, View.GONE);
                v.setTextViewText(R.id.wj_sub, "Hoje é para…");
                v.setViewVisibility(R.id.wj_chips, View.VISIBLE);
                int[] chips = { R.id.wj_chip1, R.id.wj_chip2, R.id.wj_chip3, R.id.wj_chip4 };
                for (int i = 0; i < chips.length; i++) {
                    v.setTextViewText(chips[i], INTENCOES[i][1]);
                    v.setOnClickPendingIntent(chips[i], acao(c, "intencao", INTENCOES[i][0], null));
                }
                botao(v, R.id.wj_b2, objetivo.isEmpty() ? "+ Objetivo" : "Objetivo", FolhaActivity.abrir(c, "objetivo"));
                botao(v, R.id.wj_b3, "Pular", acao(c, "pular", chaveSessao, null));
                v.setTextViewText(R.id.wj_resumo, "");
                return v;
            }

            capa(c, v, R.id.wj_capa_caixa, R.id.wj_capa, R.id.wj_capa_txt, ab);
            v.setTextViewText(R.id.wj_sub, !flash.isEmpty() ? flash : objetivo.isEmpty() ? "Guarde momentos e pontos para voltar enquanto joga." : "Objetivo: " + objetivo);
            botao(v, R.id.wj_b1, "Momento", FolhaActivity.abrir(c, "momento"));
            botao(v, R.id.wj_b2, "Ponto", FolhaActivity.abrir(c, "ponto"));
            botao(v, R.id.wj_b3, "Finalizar", FolhaActivity.abrir(c, "finalizar"));
            if (objetivo.isEmpty()) {
                v.setTextViewText(R.id.wj_resumo, "+ Objetivo");
                v.setOnClickPendingIntent(R.id.wj_resumo, FolhaActivity.abrir(c, "objetivo"));
            }
            return v;
        }

        JSONArray jogos = j == null ? null : j.optJSONArray("jogos");
        int n = jogos == null ? 0 : jogos.length();
        if (n == 0) {
            cabeca(v, R.id.wj_traco, R.id.wj_rotulo, flash.isEmpty() ? "Jornada" : flash, 0);
            v.setViewVisibility(R.id.wj_capa_caixa, View.GONE);
            v.setTextViewText(R.id.wj_titulo, "Nada em andamento agora.");
            v.setTextViewText(R.id.wj_sub, "Escolha um jogo para começar uma Jornada.");
            botao(v, R.id.wj_b1, "Escolher um jogo", abrir(c, "/jornada", 14));
            return v;
        }

        int idx = modulo(Conta.numero(c, "jogo"), n);
        JSONObject g = jogos.optJSONObject(idx);
        JSONObject ultima = j.optJSONObject("ultima");
        String topo = flash;
        if (topo.isEmpty() && ultima != null && System.currentTimeMillis() - Painel.ms(ultima.optString("fim")) < 20 * 60_000L) {
            String h = Painel.horas(ultima.optLong("minutos", 0));
            topo = h.isEmpty() ? "Sessão guardada agora" : "Sessão de " + h + " guardada agora";
        }
        cabeca(v, R.id.wj_traco, R.id.wj_rotulo, topo.isEmpty() ? "Jornada" : topo, 0);
        if (!topo.isEmpty()) v.setTextColor(R.id.wj_rotulo, 0xFFC9CED4);
        long quando = Painel.ms(g.optString("ultima"));
        String canto = (n > 1 ? (idx + 1) + " de " + n : "");
        String ha = quando > 0 ? Painel.ha(quando) : "";
        v.setTextViewText(R.id.wj_canto, canto.isEmpty() ? ha : ha.isEmpty() ? canto : canto + " · " + ha);
        v.setTextViewText(R.id.wj_titulo, g.optString("titulo"));
        capa(c, v, R.id.wj_capa_caixa, R.id.wj_capa, R.id.wj_capa_txt, g);
        String recado = Painel.txt(g, "recado");
        v.setTextViewText(R.id.wj_sub, !recado.isEmpty() ? "Seu recado: “" + recado + "”"
            : "pausada".equals(g.optString("estado")) ? "Em pausa. Quando quiser, é só voltar."
            : g.optInt("sessoes", 0) == 0 ? "Ainda sem sessão. Que tal a primeira?" : "Sem recado da última vez.");
        botao(v, R.id.wj_b1, "▶ Jogar agora", acao(c, "jogar", g.optString("gameId"), null));
        if (n > 1) {
            v.setViewVisibility(R.id.wj_ant, View.VISIBLE);
            v.setViewVisibility(R.id.wj_prox, View.VISIBLE);
            v.setOnClickPendingIntent(R.id.wj_ant, acao(c, "anterior", null, null));
            v.setOnClickPendingIntent(R.id.wj_prox, acao(c, "proximo", null, null));
        }
        v.setTextViewText(R.id.wj_resumo, Painel.horas(g.optLong("minutos", 0)));
        String slug = g.optString("slug");
        if (!slug.isEmpty()) v.setOnClickPendingIntent(R.id.wj_raiz, abrir(c, "/jornada/" + slug, 15));
        return v;
    }

    // ── Cartão (O que jogar hoje, Próxima jogatina, Live) ──────────────────────
    private static RemoteViews cartao(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_cartao);
        for (int b : new int[] { R.id.wc_b1, R.id.wc_b2, R.id.wc_b3 }) { v.setViewVisibility(b, View.GONE); }
        estilo(v, R.id.wc_b1, true);
        estilo(v, R.id.wc_b2, false);
        estilo(v, R.id.wc_b3, false);
        v.setViewVisibility(R.id.wc_capa_caixa, View.GONE);
        v.setTextViewText(R.id.wc_canto, "");
        return v;
    }

    /** Sem chave (ainda não entrou no app) ou painel ainda não chegou. */
    private static boolean semPainel(Context c, RemoteViews v, int titulo, int linha, int b1, String caminho) {
        if (Conta.ligada(c) && Conta.painel(c) != null) return false;
        boolean ligada = Conta.ligada(c);
        v.setTextViewText(titulo, ligada ? "Carregando…" : "Entre no app para ligar este widget.");
        if (linha != 0) v.setTextViewText(linha, "");
        if (!ligada && b1 != 0) botao(v, b1, "Abrir o app", abrir(c, caminho, 16));
        return true;
    }

    static RemoteViews jogarHoje(Context c) {
        RemoteViews v = cartao(c);
        cabeca(v, R.id.wc_traco, R.id.wc_rotulo, "O que jogar hoje", 0);
        v.setOnClickPendingIntent(R.id.wc_raiz, abrir(c, "/jornada", 41));
        if (semPainel(c, v, R.id.wc_titulo, R.id.wc_linha, R.id.wc_b1, "/jornada")) return v;
        JSONObject p = Conta.painel(c);
        JSONArray sg = p.optJSONArray("sugestoes");
        int n = sg == null ? 0 : sg.length();
        v.setTextViewText(R.id.wc_canto, "da sua estante");
        if (n == 0) {
            v.setTextViewText(R.id.wc_titulo, "Nada parado na estante.");
            v.setTextViewText(R.id.wc_linha, "Quando um jogo ficar uns dias sem sessão, ele aparece aqui.");
            botao(v, R.id.wc_b1, "Ver a coleção", abrir(c, "/colecao", 42));
            return v;
        }
        JSONObject s = sg.optJSONObject(modulo(Conta.numero(c, "sugestao"), n));
        capa(c, v, R.id.wc_capa_caixa, R.id.wc_capa, R.id.wc_capa_txt, s);
        v.setTextViewText(R.id.wc_titulo, s.optString("titulo"));
        v.setTextViewText(R.id.wc_linha, s.optString("motivo"));
        if (abertaDe(p) != null) botao(v, R.id.wc_b1, "Sessão aberta", abrir(c, "/sessao", 43));
        else botao(v, R.id.wc_b1, "▶ Jogar este", acao(c, "jogar", s.optString("gameId"), null));
        if (n > 1) botao(v, R.id.wc_b2, "Outra ideia", acao(c, "outra", null, null));
        String slug = s.optString("slug");
        if (!slug.isEmpty()) v.setOnClickPendingIntent(R.id.wc_raiz, abrir(c, "/jogos/" + slug, 44));
        return v;
    }

    static RemoteViews jogatina(Context c) {
        RemoteViews v = cartao(c);
        cabeca(v, R.id.wc_traco, R.id.wc_rotulo, "Próxima jogatina", 0);
        v.setOnClickPendingIntent(R.id.wc_raiz, abrir(c, "/comunidade/clubes", 51));
        if (semPainel(c, v, R.id.wc_titulo, R.id.wc_linha, R.id.wc_b1, "/comunidade/clubes")) return v;
        JSONObject jg = Conta.painel(c).optJSONObject("jogatina");
        if (jg == null) {
            v.setTextViewText(R.id.wc_titulo, "Nenhuma jogatina marcada.");
            v.setTextViewText(R.id.wc_linha, "Quando você for convidado ou um clube seu marcar uma, ela aparece aqui.");
            botao(v, R.id.wc_b1, "Marcar uma", abrir(c, "/jogatina/criar", 52));
            estilo(v, R.id.wc_b1, false);
            return v;
        }
        long inicio = Painel.ms(jg.optString("inicio"));
        boolean jaComecou = inicio > 0 && inicio <= System.currentTimeMillis();
        boolean perto = inicio > 0 && inicio - System.currentTimeMillis() < 3 * 3600_000L;
        cabeca(v, R.id.wc_traco, R.id.wc_rotulo, jaComecou ? "Jogatina · agora" : "Jogatina · " + Painel.quando(inicio), perto ? 1 : 0);
        String clube = Painel.txt(jg, "clube");
        v.setTextViewText(R.id.wc_canto, clube.isEmpty() ? "" : "clube " + clube);
        String jogo = Painel.txt(jg, "jogo"), titulo = Painel.txt(jg, "titulo");
        v.setTextViewText(R.id.wc_titulo, titulo.isEmpty() ? jogo : jogo.isEmpty() || titulo.toLowerCase().contains(jogo.toLowerCase()) ? titulo : jogo + " · " + titulo);
        StringBuilder quem = new StringBuilder();
        JSONArray q = jg.optJSONArray("quem");
        for (int i = 0; q != null && i < q.length(); i++) quem.append(i == 0 ? "" : " ").append(q.optString(i).toUpperCase());
        int vao = jg.optInt("vao"), talvez = jg.optInt("talvez");
        String conta = plural(vao, "vai", "vão") + (talvez > 0 ? " · " + talvez + " talvez" : "");
        v.setTextViewText(R.id.wc_linha, (quem.length() > 0 ? quem + "   " : "") + conta);
        String id = jg.optString("id"), resp = Painel.txt(jg, "resposta");
        botao(v, R.id.wc_b1, "vou".equals(resp) ? "Vou ✓" : "Vou", acao(c, "rsvp", id, "vou"));
        botao(v, R.id.wc_b2, "talvez".equals(resp) ? "Talvez ✓" : "Talvez", acao(c, "rsvp", id, "talvez"));
        botao(v, R.id.wc_b3, "Não vou", acao(c, "rsvp", id, "nao"));
        estilo(v, R.id.wc_b1, resp.isEmpty() || "vou".equals(resp));
        estilo(v, R.id.wc_b2, "talvez".equals(resp));
        v.setOnClickPendingIntent(R.id.wc_raiz, abrir(c, "/jogatina/" + id, 53));
        return v;
    }

    static RemoteViews live(Context c) {
        RemoteViews v = cartao(c);
        cabeca(v, R.id.wc_traco, R.id.wc_rotulo, "Live do WinnerZ", 0);
        v.setOnClickPendingIntent(R.id.wc_raiz, abrir(c, "/agora", 61));
        if (semPainel(c, v, R.id.wc_titulo, R.id.wc_linha, R.id.wc_b1, "/agora")) return v;
        JSONObject l = Conta.painel(c).optJSONObject("live");
        if (l == null || !l.optBoolean("aoVivo")) {
            v.setTextViewText(R.id.wc_titulo, "Fora do ar agora");
            v.setTextViewText(R.id.wc_linha, "Quando a live começar, ela aparece aqui.");
            if (l != null && !Painel.txt(l, "url").isEmpty()) {
                botao(v, R.id.wc_b1, "Canal na Twitch", externo(c, l.optString("url"), 62));
                estilo(v, R.id.wc_b1, false);
            }
            return v;
        }
        cabeca(v, R.id.wc_traco, R.id.wc_rotulo, "Ao vivo agora", 1);
        int viewers = l.isNull("viewers") ? -1 : l.optInt("viewers", -1);
        v.setTextViewText(R.id.wc_canto, viewers >= 0 ? "Twitch · " + viewers + " assistindo" : "Twitch");
        String titulo = Painel.txt(l, "titulo");
        v.setTextViewText(R.id.wc_titulo, titulo.isEmpty() ? "A live está no ar" : titulo);
        String jogo = Painel.txt(l, "jogo");
        long inicio = Painel.ms(l.optString("inicio"));
        String linha = jogo;
        if (inicio > 0) linha = (linha.isEmpty() ? "" : linha + " · ") + "começou às " + Painel.hora(inicio);
        v.setTextViewText(R.id.wc_linha, linha);
        botao(v, R.id.wc_b1, "Assistir", externo(c, l.optString("url"), 63));
        botao(v, R.id.wc_b2, "Chat", abrir(c, "/agora", 64));
        return v;
    }

    // ── Sua semana ─────────────────────────────────────────────────────────────
    static RemoteViews semana(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_semana);
        cabeca(v, R.id.ws_traco, R.id.ws_rotulo, "Sua semana", 0);
        v.setOnClickPendingIntent(R.id.ws_raiz, abrir(c, "/jornada/retrospectivas", 71));
        v.setTextViewText(R.id.ws_canto, "");
        if (semPainel(c, v, R.id.ws_grande, R.id.ws_linha, 0, "")) {
            v.setTextViewText(R.id.ws_rodape, Conta.ligada(c) ? "" : "Entre no app para ligar este widget.");
            v.setTextViewText(R.id.ws_grande, "");
            return v;
        }
        JSONObject s = Conta.painel(c).optJSONObject("semana");
        if (s == null) return v;
        long ini = Painel.ms(s.optString("inicio"));
        if (ini > 0) v.setTextViewText(R.id.ws_canto, Painel.semanaCurta(ini) + " " + Painel.dia(ini).split(" ")[0] + " – " + Painel.semanaCurta(ini + 6 * 86400_000L) + " " + Painel.dia(ini + 6 * 86400_000L).split(" ")[0]);
        long min = s.optLong("minutos");
        v.setTextViewText(R.id.ws_grande, min > 0 ? Painel.horas(min) : "0 h");
        long ses = s.optLong("sessoes"), jogos = s.optLong("jogos");
        v.setTextViewText(R.id.ws_linha, ses == 0 ? "nenhuma sessão ainda" : plural(ses, "sessão", "sessões") + " · " + plural(jogos, "jogo", "jogos"));
        JSONArray dias = s.optJSONArray("dias");
        long[] m = new long[7];
        for (int i = 0; i < 7; i++) m[i] = dias == null ? 0 : dias.optLong(i);
        v.setImageViewBitmap(R.id.ws_barras, barras(c, m, s.optInt("hoje", 0)));
        JSONObject topo = s.optJSONObject("topo");
        v.setTextViewText(R.id.ws_rodape, topo != null && topo.optLong("minutos") > 0
            ? "Mais jogado: " + topo.optString("titulo") + " · " + Painel.horas(topo.optLong("minutos"))
            : "Sem meta nem cobrança: a semana é sua.");
        return v;
    }

    /** As barras dos sete dias (seg a dom). Dia com jogo em claro, hoje em âmbar, dia sem jogo baixinho. */
    private static Bitmap barras(Context c, long[] min, int hoje) {
        float d = c.getResources().getDisplayMetrics().density;
        int w = Math.round(200 * d), h = Math.round(60 * d);
        Bitmap b = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(b);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        Paint t = new Paint(Paint.ANTI_ALIAS_FLAG);
        t.setColor(0xFF7D848D);
        t.setTextSize(9.5f * d);
        t.setTextAlign(Paint.Align.CENTER);
        t.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        String[] letras = { "S", "T", "Q", "Q", "S", "S", "D" };
        long max = 1;
        for (long x : min) max = Math.max(max, x);
        float gap = 7 * d, bw = (w - gap * 6) / 7f, base = h - 14 * d, alto = base - 2 * d;
        for (int i = 0; i < 7; i++) {
            float x = i * (bw + gap);
            float frac = min[i] <= 0 ? 0.06f : Math.max(0.12f, min[i] / (float) max);
            p.setColor(i + 1 == hoje && min[i] > 0 ? AGORA : min[i] > 0 ? TINTA : 0xFF2C3036);
            cv.drawRect(x, base - alto * frac, x + bw, base, p);
            t.setColor(i + 1 == hoje ? AGORA : 0xFF7D848D);
            cv.drawText(letras[i], x + bw / 2, h - 2 * d, t);
        }
        return b;
    }

    // ── Atalho 1x1 ─────────────────────────────────────────────────────────────
    static RemoteViews atalho(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_atalho);
        v.setViewVisibility(R.id.wt_traco, View.GONE);
        v.setViewVisibility(R.id.wt_cronometro, View.GONE);
        v.setViewVisibility(R.id.wt_rotulo, View.VISIBLE);
        v.setImageViewResource(R.id.wt_capa, 0);
        v.setTextViewText(R.id.wt_rotulo, "WinnerZ");
        v.setOnClickPendingIntent(R.id.wt_raiz, abrir(c, "/jornada", 81));
        JSONObject p = Conta.ligada(c) ? Conta.painel(c) : null;
        if (p == null) return v;
        JSONObject ab = abertaDe(p);
        if (ab != null) {
            long inicio = Painel.ms(ab.optString("inicio"));
            if (inicio <= 0) inicio = System.currentTimeMillis();
            Bitmap b = Painel.capa(c, ab.optString("gameId"));
            if (b != null) v.setImageViewBitmap(R.id.wt_capa, b);
            v.setViewVisibility(R.id.wt_traco, View.VISIBLE);
            v.setViewVisibility(R.id.wt_rotulo, View.GONE);
            v.setViewVisibility(R.id.wt_cronometro, View.VISIBLE);
            v.setChronometer(R.id.wt_cronometro, SystemClock.elapsedRealtime() - Math.max(0, System.currentTimeMillis() - inicio), null, true);
            v.setOnClickPendingIntent(R.id.wt_raiz, FolhaActivity.abrir(c, "finalizar"));
            return v;
        }
        JSONObject j = jornadaDe(p);
        JSONArray jogos = j == null ? null : j.optJSONArray("jogos");
        if (jogos == null || jogos.length() == 0) return v;
        JSONObject g = jogos.optJSONObject(0);
        Bitmap b = Painel.capa(c, g.optString("gameId"));
        if (b != null) v.setImageViewBitmap(R.id.wt_capa, b);
        v.setTextViewText(R.id.wt_rotulo, "▶ " + Painel.iniciais(g.optString("titulo")));
        v.setOnClickPendingIntent(R.id.wt_raiz, acao(c, "jogar", g.optString("gameId"), null));
        return v;
    }

    // ── Álbum e Awards (2x2) ───────────────────────────────────────────────────
    static RemoteViews album(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_mini);
        cabeca(v, R.id.wm_traco, R.id.wm_rotulo, "Álbum", 0);
        v.setOnClickPendingIntent(R.id.wm_raiz, abrir(c, "/album", 91));
        v.setViewVisibility(R.id.wm_progresso, View.GONE);
        v.setTextViewText(R.id.wm_rodape, "");
        if (semPainel(c, v, R.id.wm_linha, 0, 0, "")) { v.setTextViewText(R.id.wm_grande, ""); return v; }
        JSONObject a = Conta.painel(c).optJSONObject("album");
        if (a == null) return v;
        int pacotes = a.optInt("pacotes"), total = a.optInt("total"), coladas = a.optInt("coladas");
        if (pacotes > 0) {
            cabeca(v, R.id.wm_traco, R.id.wm_rotulo, "Álbum", 1);
            v.setTextViewText(R.id.wm_grande, String.valueOf(pacotes));
            v.setTextViewText(R.id.wm_linha, pacotes == 1 ? "pacote para abrir" : "pacotes para abrir");
            v.setOnClickPendingIntent(R.id.wm_raiz, abrir(c, "/album/pacotes", 92));
        } else {
            v.setTextViewText(R.id.wm_grande, total > 0 ? Math.round(coladas * 100f / total) + "%" : "—");
            v.setTextViewText(R.id.wm_linha, total > 0 && coladas >= total ? "álbum completo!" : "do álbum colado");
        }
        if (total > 0) {
            v.setTextViewText(R.id.wm_rodape, coladas + " de " + total + " coladas");
            v.setViewVisibility(R.id.wm_progresso, View.VISIBLE);
            v.setProgressBar(R.id.wm_progresso, 100, Math.round(coladas * 100f / total), false);
        }
        return v;
    }

    /** Só datas e os votos da própria pessoa: o resultado nunca passa por aqui antes da revelação. */
    static RemoteViews awards(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_mini_ouro);
        cabeca(v, R.id.wm_traco, R.id.wm_rotulo, "WinnerZ Awards", 2);
        v.setOnClickPendingIntent(R.id.wm_raiz, abrir(c, "/eventos/awards", 101));
        v.setViewVisibility(R.id.wm_progresso, View.GONE);
        v.setTextViewText(R.id.wm_rodape, "");
        if (semPainel(c, v, R.id.wm_linha, 0, 0, "")) { v.setTextViewText(R.id.wm_grande, ""); return v; }
        JSONObject aw = Conta.painel(c).optJSONObject("awards");
        if (aw == null) {
            v.setTextViewText(R.id.wm_grande, "—");
            v.setTextViewText(R.id.wm_linha, "Nenhuma edição aberta agora.");
            return v;
        }
        int ano = aw.optInt("ano", 0);
        if (ano > 0) cabeca(v, R.id.wm_traco, R.id.wm_rotulo, "Awards " + ano, 2);
        String fase = aw.optString("fase");
        int cats = aw.optInt("categorias"), votos = aw.optInt("votos");
        switch (fase) {
            case "em_breve": {
                int d = Math.max(0, Painel.diasAte(Painel.ms(aw.optString("abre"))));
                v.setTextViewText(R.id.wm_grande, d == 0 ? "Hoje" : String.valueOf(d));
                v.setTextViewText(R.id.wm_linha, d == 0 ? "a votação abre hoje" : d == 1 ? "dia para a votação abrir" : "dias para a votação abrir");
                v.setTextViewText(R.id.wm_rodape, plural(cats, "categoria", "categorias"));
                break;
            }
            case "votacao": {
                int d = Math.max(0, Painel.diasAte(Painel.ms(aw.optString("fecha"))));
                v.setTextViewText(R.id.wm_grande, d == 0 ? "Hoje" : String.valueOf(d));
                v.setTextViewText(R.id.wm_linha, d == 0 ? "último dia de votação" : d == 1 ? "dia de votação" : "dias de votação");
                v.setTextViewText(R.id.wm_rodape, votos >= cats && cats > 0 ? "Você votou em tudo" : "Você votou em " + votos + " de " + cats);
                if (cats > 0) {
                    v.setViewVisibility(R.id.wm_progresso, View.VISIBLE);
                    v.setProgressBar(R.id.wm_progresso, 100, Math.round(votos * 100f / cats), false);
                }
                break;
            }
            case "revelacao": {
                long rev = Painel.ms(aw.optString("revela"));
                int d = Math.max(0, Painel.diasAte(rev));
                v.setTextViewText(R.id.wm_grande, d == 0 ? Painel.hora(rev) : String.valueOf(d));
                v.setTextViewText(R.id.wm_linha, d == 0 ? "a revelação é hoje" : d == 1 ? "dia para a revelação" : "dias para a revelação");
                v.setTextViewText(R.id.wm_rodape, "Ao vivo, na live");
                break;
            }
            default:
                v.setTextViewText(R.id.wm_grande, "★");
                v.setTextViewText(R.id.wm_linha, "Os vencedores já foram revelados.");
                v.setTextViewText(R.id.wm_rodape, "Toque para ver");
                break;
        }
        return v;
    }

    // ── Avisos ─────────────────────────────────────────────────────────────────
    static RemoteViews avisos(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_avisos);
        cabeca(v, R.id.wa_traco, R.id.wa_rotulo, "Avisos", 0);
        v.setOnClickPendingIntent(R.id.wa_raiz, abrir(c, "/avisos", 111));
        v.setTextViewText(R.id.wa_canto, "");
        v.setViewVisibility(R.id.wa_b1, View.GONE);
        int[] l = { R.id.wa_l1, R.id.wa_l2, R.id.wa_l3, R.id.wa_l4 };
        int[] t = { R.id.wa_t1, R.id.wa_t2, R.id.wa_t3, R.id.wa_t4 };
        int[] q = { R.id.wa_q1, R.id.wa_q2, R.id.wa_q3, R.id.wa_q4 };
        int[] co = { R.id.wa_c1, R.id.wa_c2, R.id.wa_c3, R.id.wa_c4 };
        int[] fio = { 0, R.id.wa_fio2, R.id.wa_fio3, R.id.wa_fio4 };
        for (int i = 0; i < 4; i++) { v.setViewVisibility(l[i], View.GONE); if (fio[i] != 0) v.setViewVisibility(fio[i], View.GONE); }
        v.setViewVisibility(R.id.wa_vazio, View.GONE);
        if (!Conta.ligada(c) || Conta.painel(c) == null) {
            v.setViewVisibility(R.id.wa_vazio, View.VISIBLE);
            v.setTextViewText(R.id.wa_vazio, Conta.ligada(c) ? "Carregando…" : "Entre no app para ligar este widget.");
            return v;
        }
        JSONObject av = Conta.painel(c).optJSONObject("avisos");
        int nao = av == null ? 0 : av.optInt("naoLidos");
        JSONArray it = av == null ? null : av.optJSONArray("itens");
        cabeca(v, R.id.wa_traco, R.id.wa_rotulo, "Avisos", nao > 0 ? 1 : 0);
        v.setTextViewText(R.id.wa_canto, nao > 0 ? (nao == 1 ? "1 novo" : nao + " novos") : "tudo lido");
        if (it == null || it.length() == 0) {
            v.setViewVisibility(R.id.wa_vazio, View.VISIBLE);
            v.setTextViewText(R.id.wa_vazio, "Nada por aqui. Respostas, jogatinas e amigos aparecem aqui.");
            return v;
        }
        for (int i = 0; i < Math.min(4, it.length()); i++) {
            JSONObject a = it.optJSONObject(i);
            if (a == null) continue;
            v.setViewVisibility(l[i], View.VISIBLE);
            if (fio[i] != 0) v.setViewVisibility(fio[i], View.VISIBLE);
            v.setTextViewText(t[i], a.optString("texto"));
            v.setTextColor(t[i], a.optBoolean("lido") ? 0xFFC9CED4 : TINTA);
            v.setTextViewText(q[i], a.optString("quando"));
            v.setTextColor(q[i], a.optBoolean("lido") ? APAGADO : AGORA);
            String corpo = Painel.txt(a, "corpo");
            v.setViewVisibility(co[i], corpo.isEmpty() ? View.GONE : View.VISIBLE);
            v.setTextViewText(co[i], corpo);
            String link = Painel.txt(a, "link");
            v.setOnClickPendingIntent(l[i], abrir(c, link.startsWith("/") ? link : "/avisos", 112 + i));
        }
        if (nao > 0) botao(v, R.id.wa_b1, "Marcar como lidos", acao(c, "lidos", null, null));
        return v;
    }

    // ── Radar ───────────────────────────────────────────────────────────────
    static RemoteViews radar(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_radar);
        v.setOnClickPendingIntent(R.id.wr_raiz, Links.abrir(c, "/jogos/radar", 21));
        JSONArray lista;
        try { lista = new JSONArray(prefs(c).getString("radar", "[]")); } catch (Exception e) { lista = new JSONArray(); }

        int[][] linhas = { { R.id.wr_linha2, R.id.wr_jogo2, R.id.wr_quando2 }, { R.id.wr_linha3, R.id.wr_jogo3, R.id.wr_quando3 } };
        if (lista.length() == 0) {
            v.setTextViewText(R.id.wr_grande, "");
            v.setTextViewText(R.id.wr_unidade, "");
            v.setTextViewText(R.id.wr_jogo1, "Nada no seu Radar ainda.");
            v.setTextViewText(R.id.wr_quando1, "Toque para acompanhar lançamentos.");
            v.setImageViewResource(R.id.wr_traco, R.drawable.traco);
            for (int[] l : linhas) v.setViewVisibility(l[0], View.GONE);
            return v;
        }
        JSONObject p = lista.optJSONObject(0);
        boolean agora = p.optBoolean("agora", false);
        v.setImageViewResource(R.id.wr_traco, agora ? R.drawable.traco_agora : R.drawable.traco);
        v.setTextViewText(R.id.wr_grande, p.optString("grande", ""));
        v.setTextColor(R.id.wr_grande, agora ? AGORA : TINTA);
        v.setTextViewText(R.id.wr_unidade, p.optString("unidade", ""));
        v.setTextViewText(R.id.wr_jogo1, p.optString("titulo", ""));
        v.setTextViewText(R.id.wr_quando1, p.optString("data", ""));
        for (int i = 0; i < linhas.length; i++) {
            JSONObject o = lista.optJSONObject(i + 1);
            if (o == null) { v.setViewVisibility(linhas[i][0], View.GONE); continue; }
            v.setViewVisibility(linhas[i][0], View.VISIBLE);
            v.setTextViewText(linhas[i][1], o.optString("titulo", ""));
            v.setTextViewText(linhas[i][2], o.optString("quando", ""));
            v.setTextColor(linhas[i][2], o.optBoolean("agora", false) ? AGORA : APAGADO);
        }
        return v;
    }
}
