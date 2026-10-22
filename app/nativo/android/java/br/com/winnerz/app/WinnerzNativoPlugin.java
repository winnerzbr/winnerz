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
        call.resolve();
    }

    /** { titulo, inicio (ms desde 1970) }: mostra a sessão aberta fixa na barra de avisos, com o tempo correndo. */
    @PluginMethod
    public void sessaoAbrir(PluginCall call) {
        String titulo = call.getString("titulo", "Sessão aberta");
        Double inicio = call.getDouble("inicio");
        Sessao.mostrar(getContext(), titulo, inicio == null ? System.currentTimeMillis() : inicio.longValue());
        call.resolve();
    }

    @PluginMethod
    public void sessaoFechar(PluginCall call) {
        Sessao.esconder(getContext());
        call.resolve();
    }
}
