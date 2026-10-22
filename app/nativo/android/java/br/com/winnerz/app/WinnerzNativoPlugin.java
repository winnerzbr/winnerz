package br.com.winnerz.app;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ponte entre o site (dentro do app) e o Android.
 * O site manda os dados já prontos para exibir; aqui só guardamos e redesenhamos os widgets.
 */
@CapacitorPlugin(name = "WinnerzNativo")
public class WinnerzNativoPlugin extends Plugin {
    static final String PREFS = "winnerz_widgets";

    /** { jornada: {...} | null, radar: [...] } */
    @PluginMethod
    public void atualizarWidgets(PluginCall call) {
        JSObject jornada = call.getObject("jornada");
        JSArray radar = call.getArray("radar");
        SharedPreferences.Editor e = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        e.putString("jornada", jornada == null ? "" : jornada.toString());
        e.putString("radar", radar == null ? "[]" : radar.toString());
        e.putLong("atualizado", System.currentTimeMillis());
        e.apply();
        Widgets.atualizarTodos(getContext());
        // O site mudou algo (sessão, jogo novo…): os widgets do painel também buscam o estado novo.
        if (Conta.ligada(getContext()) && Painel.velho(getContext(), 5000)) Painel.atualizarAsync(getContext(), null);
        call.resolve();
    }

    /** { chave, site, barra }: a chave do app (app_parear), para os widgets funcionarem sem abrir o site. */
    @PluginMethod
    public void configurar(PluginCall call) {
        String chave = call.getString("chave", "");
        String site = call.getString("site", Links.SITE);
        Boolean barra = call.getBoolean("barra", true);
        if (chave == null || !chave.matches("[0-9a-f]{64}")) { call.reject("chave"); return; }
        Conta.guardar(getContext(), chave, site == null ? Links.SITE : site, barra == null || barra);
        Painel.atualizarAsync(getContext(), null);
        call.resolve();
    }

    /** { ligada, ultimaAcao }: o app tem chave? e quando foi a última ação feita pelos widgets (ms). */
    @PluginMethod
    public void estado(PluginCall call) {
        JSObject r = new JSObject();
        r.put("ligada", Conta.ligada(getContext()));
        r.put("ultimaAcao", Conta.ultimaAcao(getContext()));
        call.resolve(r);
    }

    /** { barra }: a preferência "Sessão aberta na barra" (Preferências do site). */
    @PluginMethod
    public void preferencias(PluginCall call) {
        Boolean barra = call.getBoolean("barra", true);
        Conta.barra(getContext(), barra == null || barra);
        call.resolve();
    }

    /** Saiu da conta: esquece a chave e limpa os widgets. Devolve { chave } para o site desligá-la no servidor. */
    @PluginMethod
    public void esquecer(PluginCall call) {
        String chave = Conta.chave(getContext());
        Conta.esquecer(getContext());
        Sessao.esconder(getContext());
        Widgets.atualizarTodos(getContext());
        JSObject r = new JSObject();
        r.put("chave", chave);
        call.resolve(r);
    }

    /** { titulo, inicio (ms desde 1970) }: mostra a sessão aberta fixa na barra de avisos, com o tempo correndo. */
    @PluginMethod
    public void sessaoAbrir(PluginCall call) {
        String titulo = call.getString("titulo", "Sessão aberta");
        Double inicio = call.getDouble("inicio");
        Sessao.mostrar(getContext(), titulo, inicio == null ? System.currentTimeMillis() : inicio.longValue());
        call.resolve();
    }

    /** { ok }: o Firebase está configurado neste build? (sem ele, pedir o token de avisos derrubaria o app) */
    @PluginMethod
    public void temPush(PluginCall call) {
        boolean ok = false;
        try {
            Class<?> fb = Class.forName("com.google.firebase.FirebaseApp");
            Object apps = fb.getMethod("getApps", android.content.Context.class).invoke(null, getContext());
            ok = apps instanceof java.util.List && !((java.util.List<?>) apps).isEmpty();
        } catch (Throwable semFirebase) {
            ok = false;
        }
        JSObject r = new JSObject();
        r.put("ok", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void sessaoFechar(PluginCall call) {
        Sessao.esconder(getContext());
        call.resolve();
    }
}
