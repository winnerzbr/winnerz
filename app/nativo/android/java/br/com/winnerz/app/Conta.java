package br.com.winnerz.app;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;

/**
 * O que o app guarda para os widgets funcionarem sozinhos: a chave do app (o site entrega depois do login),
 * o último painel que veio do servidor e uns detalhes de tela (qual jogo está à mostra, a sugestão da vez).
 * A chave só vale para os widgets e pode ser desligada a qualquer momento (sair da conta apaga).
 */
final class Conta {
    static final String PREFS = "winnerz_app";

    private Conta() {}

    static SharedPreferences p(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static String chave(Context c) { return p(c).getString("chave", ""); }
    static boolean ligada(Context c) { return !chave(c).isEmpty(); }

    static String site(Context c) {
        String s = p(c).getString("site", "");
        return s == null || !s.startsWith("https://") ? Links.SITE : s;
    }

    static boolean barra(Context c) { return p(c).getBoolean("barra", true); }

    static void guardar(Context c, String chave, String site, boolean barra) {
        p(c).edit().putString("chave", chave).putString("site", site).putBoolean("barra", barra).apply();
    }

    static void barra(Context c, boolean barra) { p(c).edit().putBoolean("barra", barra).apply(); }

    /** Saiu da conta (ou a chave não vale mais): o app esquece tudo o que era da pessoa. */
    static void esquecer(Context c) {
        p(c).edit().remove("chave").remove("painel").remove("painelEm").remove("flash").remove("flashAte")
            .remove("jogo").remove("sugestao").remove("pulou").apply();
    }

    // ── Painel ──
    static JSONObject painel(Context c) {
        try {
            String s = p(c).getString("painel", "");
            return s == null || s.isEmpty() ? null : new JSONObject(s);
        } catch (Exception e) { return null; }
    }

    static void salvarPainel(Context c, JSONObject j) {
        p(c).edit().putString("painel", j.toString()).putLong("painelEm", System.currentTimeMillis()).apply();
    }

    static long painelEm(Context c) { return p(c).getLong("painelEm", 0); }

    // ── O site recarrega quando o app volta para a frente depois de uma ação feita pelo widget ──
    static void marcarAcao(Context c) { p(c).edit().putLong("acao", System.currentTimeMillis()).apply(); }
    static long ultimaAcao(Context c) { return p(c).getLong("acao", 0); }

    // ── Estado da tela dos widgets ──
    static int numero(Context c, String k) { return p(c).getInt(k, 0); }
    static void numero(Context c, String k, int v) { p(c).edit().putInt(k, v).apply(); }
    static String texto(Context c, String k) { return p(c).getString(k, ""); }
    static void texto(Context c, String k, String v) { p(c).edit().putString(k, v).apply(); }

    /** Um recado curto no topo da Jornada por alguns minutos ("Sessão de 1 h 12 guardada agora"). */
    static void flash(Context c, String texto, long duracaoMs) {
        p(c).edit().putString("flash", texto).putLong("flashAte", System.currentTimeMillis() + duracaoMs).apply();
    }

    static String flash(Context c) {
        return p(c).getLong("flashAte", 0) > System.currentTimeMillis() ? p(c).getString("flash", "") : "";
    }
}
