package br.com.winnerz.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Rect;
import android.graphics.RectF;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Calendar;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/** O painel que os widgets mostram: busca no WinnerZ, guarda, baixa as capas e redesenha tudo. */
final class Painel {
    private static final Object TRAVA = new Object();

    private Painel() {}

    /** Busca o painel agora (bloqueia: chame fora da linha principal). */
    static boolean atualizar(Context c) {
        c = c.getApplicationContext();
        synchronized (TRAVA) {
            try {
                JSONObject p = Api.acao(c, "painel");
                Conta.salvarPainel(c, p);
                baixarCapas(c, p);
                sincronizarBarra(c, p);
                Widgets.atualizarTodos(c);
                return true;
            } catch (Api.SemChave e) {
                Widgets.atualizarTodos(c);
                return false;
            } catch (Exception e) {
                return false;
            }
        }
    }

    static void atualizarAsync(Context c, BroadcastReceiver.PendingResult pr) {
        final Context app = c.getApplicationContext();
        new Thread(() -> {
            try { atualizar(app); } finally { if (pr != null) pr.finish(); }
        }, "winnerz-painel").start();
    }

    static boolean velho(Context c, long idade) {
        return System.currentTimeMillis() - Conta.painelEm(c) > idade;
    }

    /** A sessão aberta fica na barra de avisos (se a pessoa deixou ligado em Preferências). */
    static void sincronizarBarra(Context c, JSONObject p) {
        JSONObject j = p.optJSONObject("jornada");
        JSONObject a = j == null ? null : j.optJSONObject("aberta");
        if (a == null) { Sessao.esconder(c); return; }
        if (Conta.barra(c)) Sessao.mostrar(c, a.optString("titulo", "Sessão aberta"), ms(a.optString("inicio")));
    }

    // ── Capas ──────────────────────────────────────────────────────────────────
    private static File pastaCapas(Context c) {
        File d = new File(c.getFilesDir(), "capas");
        if (!d.exists()) d.mkdirs();
        return d;
    }

    private static String nomeCapa(String gameId) {
        return gameId.replaceAll("[^A-Za-z0-9_-]", "_") + ".png";
    }

    static Bitmap capa(Context c, String gameId) {
        if (gameId == null || gameId.isEmpty()) return null;
        File f = new File(pastaCapas(c), nomeCapa(gameId));
        return f.exists() ? BitmapFactory.decodeFile(f.getAbsolutePath()) : null;
    }

    private static void baixarCapas(Context c, JSONObject p) {
        Map<String, String> quer = new LinkedHashMap<>();
        JSONObject j = p.optJSONObject("jornada");
        if (j != null) {
            JSONObject a = j.optJSONObject("aberta");
            if (a != null) quer.put(a.optString("gameId"), a.optString("capa"));
            JSONArray js = j.optJSONArray("jogos");
            for (int i = 0; js != null && i < js.length(); i++) {
                JSONObject o = js.optJSONObject(i);
                if (o != null) quer.put(o.optString("gameId"), o.optString("capa"));
            }
        }
        JSONArray sg = p.optJSONArray("sugestoes");
        for (int i = 0; sg != null && i < Math.min(5, sg.length()); i++) {
            JSONObject o = sg.optJSONObject(i);
            if (o != null) quer.put(o.optString("gameId"), o.optString("capa"));
        }
        File pasta = pastaCapas(c);
        for (Map.Entry<String, String> e : quer.entrySet()) {
            String id = e.getKey(), url = e.getValue();
            if (id.isEmpty() || url == null || url.isEmpty() || url.equals("null")) continue;
            File f = new File(pasta, nomeCapa(id));
            if (f.exists()) continue;
            try { baixarCapa(url, f); } catch (Exception ignorado) { /* sem capa: o widget mostra as iniciais */ }
        }
    }

    private static void baixarCapa(String url, File destino) throws Exception {
        if (url.startsWith("//")) url = "https:" + url;
        if (!url.startsWith("https://")) return;
        url = url.replace("/t_cover_big/", "/t_cover_small_2x/").replace("/t_1080p/", "/t_cover_small_2x/");
        HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
        h.setConnectTimeout(8000);
        h.setReadTimeout(12000);
        Bitmap orig;
        try (InputStream in = h.getInputStream()) { orig = BitmapFactory.decodeStream(in); } finally { h.disconnect(); }
        if (orig == null) return;
        // Capa pequena com a quina de baixo cortada, como as capas do site.
        int w = 120, hh = 160, corte = 26;
        Bitmap out = Bitmap.createBitmap(w, hh, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(out);
        Path recorte = new Path();
        recorte.moveTo(0, 0); recorte.lineTo(w, 0); recorte.lineTo(w, hh); recorte.lineTo(corte, hh); recorte.lineTo(0, hh - corte); recorte.close();
        cv.clipPath(recorte);
        float esc = Math.max(w / (float) orig.getWidth(), hh / (float) orig.getHeight());
        float dw = orig.getWidth() * esc, dh = orig.getHeight() * esc;
        Paint pt = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        cv.drawBitmap(orig, new Rect(0, 0, orig.getWidth(), orig.getHeight()), new RectF((w - dw) / 2, (hh - dh) / 2, (w + dw) / 2, (hh + dh) / 2), pt);
        orig.recycle();
        File tmp = new File(destino.getPath() + ".tmp");
        try (FileOutputStream o = new FileOutputStream(tmp)) { out.compress(Bitmap.CompressFormat.PNG, 100, o); }
        out.recycle();
        tmp.renameTo(destino);
    }

    // ── Datas e textos ─────────────────────────────────────────────────────────
    private static final Pattern ISO = Pattern.compile("(\\d{4})-(\\d{2})-(\\d{2})(?:[T ](\\d{2}):(\\d{2})(?::(\\d{2})(\\.\\d+)?)?)?(Z|[+-]\\d{2}(?::?\\d{2})?)?");
    private static final String[] MESES = { "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez" };
    private static final String[] SEMANA = { "dom", "seg", "ter", "qua", "qui", "sex", "sáb" };

    /** Instante de um texto ISO (como o banco manda), em ms desde 1970; 0 se não der para ler. */
    static long ms(String iso) {
        if (iso == null || iso.isEmpty() || iso.equals("null")) return 0;
        Matcher m = ISO.matcher(iso);
        if (!m.find()) return 0;
        try {
            boolean soDia = m.group(4) == null;
            Calendar cal = Calendar.getInstance(soDia ? TimeZone.getDefault() : TimeZone.getTimeZone("UTC"));
            cal.clear();
            cal.set(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)) - 1, Integer.parseInt(m.group(3)),
                soDia ? 0 : Integer.parseInt(m.group(4)), soDia ? 0 : Integer.parseInt(m.group(5)), m.group(6) == null ? 0 : Integer.parseInt(m.group(6)));
            long t = cal.getTimeInMillis();
            String frac = m.group(7);
            if (frac != null) t += Integer.parseInt((frac.substring(1) + "000").substring(0, 3));
            String z = m.group(8);
            if (!soDia && z != null && !z.equals("Z")) {
                int sinal = z.charAt(0) == '-' ? -1 : 1;
                String d = z.substring(1).replace(":", "");
                int hh = Integer.parseInt(d.substring(0, 2)), mm = d.length() >= 4 ? Integer.parseInt(d.substring(2, 4)) : 0;
                t -= sinal * (hh * 60L + mm) * 60000L;
            }
            return t;
        } catch (Exception e) { return 0; }
    }

    static String iso(long t) {
        java.text.SimpleDateFormat f = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.ROOT);
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        return f.format(new java.util.Date(t));
    }

    /** "40 min", "1 h 05", "18 h". */
    static String horas(long min) {
        if (min <= 0) return "";
        if (min < 60) return min + " min";
        long h = min / 60, m = min % 60;
        return m == 0 ? h + " h" : h + " h " + (m < 10 ? "0" + m : String.valueOf(m));
    }

    private static Calendar cal(long t) { Calendar c = Calendar.getInstance(); c.setTimeInMillis(t); return c; }

    private static long diaDe(long t) {
        Calendar c = cal(t);
        c.set(Calendar.HOUR_OF_DAY, 12); c.set(Calendar.MINUTE, 0); c.set(Calendar.SECOND, 0); c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis() / 86400000L;
    }

    /** Dias de calendário de hoje até t (negativo = passado). */
    static int diasAte(long t) { return (int) (diaDe(t) - diaDe(System.currentTimeMillis())); }

    /** "hoje", "ontem", "há 3 dias", "há 2 meses". */
    static String ha(long t) {
        if (t <= 0) return "";
        int d = -diasAte(t);
        if (d <= 0) return "hoje";
        if (d == 1) return "ontem";
        if (d < 45) return "há " + d + " dias";
        int meses = Math.round(d / 30f);
        return meses < 12 ? "há " + meses + (meses == 1 ? " mês" : " meses") : "há mais de um ano";
    }

    /** "21h", "21h30". */
    static String hora(long t) {
        Calendar c = cal(t);
        int h = c.get(Calendar.HOUR_OF_DAY), m = c.get(Calendar.MINUTE);
        return h + "h" + (m == 0 ? "" : (m < 10 ? "0" + m : String.valueOf(m)));
    }

    /** "hoje 21h", "amanhã 20h", "sáb 21h", "21 nov 20h". */
    static String quando(long t) {
        int d = diasAte(t);
        if (d == 0) return "hoje " + hora(t);
        if (d == 1) return "amanhã " + hora(t);
        Calendar c = cal(t);
        if (d > 1 && d < 7) return SEMANA[c.get(Calendar.DAY_OF_WEEK) - 1] + " " + hora(t);
        return c.get(Calendar.DAY_OF_MONTH) + " " + MESES[c.get(Calendar.MONTH)] + " " + hora(t);
    }

    /** "21 nov". */
    static String dia(long t) {
        Calendar c = cal(t);
        return c.get(Calendar.DAY_OF_MONTH) + " " + MESES[c.get(Calendar.MONTH)];
    }

    static String semanaCurta(long t) {
        return SEMANA[cal(t).get(Calendar.DAY_OF_WEEK) - 1];
    }

    static String iniciais(String titulo) {
        if (titulo == null) return "";
        StringBuilder b = new StringBuilder();
        for (String p : titulo.split("[\\s:–—-]+")) {
            if (p.isEmpty() || !Character.isLetterOrDigit(p.charAt(0))) continue;
            b.append(Character.toUpperCase(p.charAt(0)));
            if (b.length() == 2) break;
        }
        return b.toString().toUpperCase(Locale.ROOT);
    }

    static String txt(JSONObject o, String k) {
        if (o == null || o.isNull(k)) return "";
        return o.optString(k, "");
    }
}
