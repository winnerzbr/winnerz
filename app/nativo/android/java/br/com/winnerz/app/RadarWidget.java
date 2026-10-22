package br.com.winnerz.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

/** Widget do Radar: o próximo lançamento que você acompanha e os seguintes. */
public class RadarWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, Widgets.radar(c));
    }
}
