package br.com.winnerz.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;
import android.widget.RemoteViews;

/** Base dos widgets do WinnerZ: desenha com o painel guardado e, se ele estiver velho, busca outro. */
public abstract class WidgetBase extends AppWidgetProvider {
    abstract RemoteViews montar(Context c);

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, montar(c));
        if (Conta.ligada(c) && Painel.velho(c, 5 * 60_000L)) Painel.atualizarAsync(c, goAsync());
    }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle opcoes) {
        m.updateAppWidget(id, montar(c));
    }
}
