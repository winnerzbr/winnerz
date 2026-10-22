package br.com.winnerz.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/** Monta os widgets a partir do que o site guardou (WinnerzNativoPlugin.atualizarWidgets). */
final class Widgets {
    static final int TINTA = 0xFFE6E9ED;
    static final int APAGADO = 0xFF9AA1AA;
    static final int AGORA = 0xFFFFB25B;

    private Widgets() {}

    static void atualizarTodos(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] js = m.getAppWidgetIds(new ComponentName(c, JornadaWidget.class));
        for (int id : js) m.updateAppWidget(id, jornada(c));
        int[] rs = m.getAppWidgetIds(new ComponentName(c, RadarWidget.class));
        for (int id : rs) m.updateAppWidget(id, radar(c));
    }

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(WinnerzNativoPlugin.PREFS, Context.MODE_PRIVATE);
    }

    // ── Jornada ─────────────────────────────────────────────────────────────
    static RemoteViews jornada(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_jornada);
        JSONObject j = null;
        try {
            String s = prefs(c).getString("jornada", "");
            if (s != null && !s.isEmpty()) j = new JSONObject(s);
        } catch (Exception ignorado) { j = null; }

        String estado = j == null ? "vazio" : j.optString("estado", "vazio");
        v.setOnClickPendingIntent(R.id.wj_raiz, Links.abrir(c, "/jornada", 11));

        if ("vazio".equals(estado)) {
            v.setTextViewText(R.id.wj_rotulo, "Jornada");
            v.setTextColor(R.id.wj_rotulo, APAGADO);
            v.setImageViewResource(R.id.wj_traco, R.drawable.traco);
            v.setTextViewText(R.id.wj_quando, "");
            v.setTextViewText(R.id.wj_titulo, j == null ? "Abra o app para ver sua Jornada aqui." : "Nada em andamento agora.");
            v.setTextViewText(R.id.wj_recado, "Toque para escolher o que jogar hoje.");
            v.setViewVisibility(R.id.wj_cronometro, View.GONE);
            v.setViewVisibility(R.id.wj_botao, View.GONE);
            v.setTextViewText(R.id.wj_resumo, "");
            return v;
        }

        String titulo = j.optString("titulo", "");
        v.setTextViewText(R.id.wj_titulo, titulo);
        v.setViewVisibility(R.id.wj_botao, View.VISIBLE);

        if ("aberta".equals(estado)) {
            v.setTextViewText(R.id.wj_rotulo, "Sessão aberta");
            v.setTextColor(R.id.wj_rotulo, AGORA);
            v.setImageViewResource(R.id.wj_traco, R.drawable.traco_agora);
            v.setTextViewText(R.id.wj_quando, "");
            long inicio = (long) j.optDouble("inicio", System.currentTimeMillis());
            long base = SystemClock.elapsedRealtime() - Math.max(0, System.currentTimeMillis() - inicio);
            v.setViewVisibility(R.id.wj_cronometro, View.VISIBLE);
            v.setChronometer(R.id.wj_cronometro, base, null, true);
            String objetivo = j.optString("objetivo", "");
            v.setTextViewText(R.id.wj_recado, objetivo.isEmpty() ? "" : "Objetivo de hoje: " + objetivo);
            v.setTextViewText(R.id.wj_botao, "Abrir a sessão");
            v.setOnClickPendingIntent(R.id.wj_botao, Links.abrir(c, "/sessao", 12));
            v.setTextViewText(R.id.wj_resumo, "");
            v.setOnClickPendingIntent(R.id.wj_raiz, Links.abrir(c, "/sessao", 13));
        } else {
            v.setTextViewText(R.id.wj_rotulo, "Jornada");
            v.setTextColor(R.id.wj_rotulo, APAGADO);
            v.setImageViewResource(R.id.wj_traco, R.drawable.traco);
            v.setTextViewText(R.id.wj_quando, j.optString("quando", ""));
            v.setViewVisibility(R.id.wj_cronometro, View.GONE);
            String recado = j.optString("recado", "");
            v.setTextViewText(R.id.wj_recado, recado.isEmpty() ? "" : "Seu recado: “" + recado + "”");
            v.setTextViewText(R.id.wj_botao, "Continuar");
            String gameId = j.optString("gameId", "");
            v.setOnClickPendingIntent(R.id.wj_botao, Links.abrir(c, "/app/jogar/" + gameId, 14));
            v.setTextViewText(R.id.wj_resumo, j.optString("resumo", ""));
            String slug = j.optString("slug", "");
            if (!slug.isEmpty()) v.setOnClickPendingIntent(R.id.wj_raiz, Links.abrir(c, "/jornada/" + slug, 15));
        }
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
