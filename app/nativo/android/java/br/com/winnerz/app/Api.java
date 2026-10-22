package br.com.winnerz.app;

import android.content.Context;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/** Conversa com o WinnerZ (POST /api/app) usando a chave do app. Sempre fora da linha principal. */
final class Api {
    /** Sem chave, ou a chave não vale mais (saiu da conta em outro lugar). */
    static final class SemChave extends Exception {}

    private Api() {}

    static JSONObject chamar(Context c, JSONObject corpo) throws Exception {
        String chave = Conta.chave(c);
        if (chave.isEmpty()) throw new SemChave();
        HttpURLConnection h = (HttpURLConnection) new URL(Conta.site(c) + "/api/app").openConnection();
        try {
            h.setConnectTimeout(12000);
            h.setReadTimeout(25000);
            h.setRequestMethod("POST");
            h.setDoOutput(true);
            h.setInstanceFollowRedirects(false);
            h.setRequestProperty("Content-Type", "application/json");
            h.setRequestProperty("Accept", "application/json");
            h.setRequestProperty("x-winnerz-chave", chave);
            byte[] b = corpo.toString().getBytes(StandardCharsets.UTF_8);
            h.setFixedLengthStreamingMode(b.length);
            try (OutputStream o = h.getOutputStream()) { o.write(b); }
            int code = h.getResponseCode();
            String s = ler(code >= 400 ? h.getErrorStream() : h.getInputStream());
            if (code == 401) {
                Conta.esquecer(c);
                throw new SemChave();
            }
            if (code >= 300) throw new IOException("WinnerZ respondeu " + code);
            return s.isEmpty() ? new JSONObject() : new JSONObject(s);
        } finally {
            h.disconnect();
        }
    }

    static JSONObject acao(Context c, String acao) throws Exception {
        return chamar(c, new JSONObject().put("acao", acao));
    }

    static String ler(InputStream in) throws IOException {
        if (in == null) return "";
        try (InputStream i = in; ByteArrayOutputStream o = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = i.read(buf)) > 0) o.write(buf, 0, n);
            return o.toString("UTF-8");
        }
    }
}
