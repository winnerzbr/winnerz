package br.com.winnerz.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

/** Widget da Jornada: o jogo atual, o seu recado e um toque para continuar (ou o tempo da sessão aberta). */
public class JornadaWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, Widgets.jornada(c));
    }
}
