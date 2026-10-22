package br.com.winnerz.app;

import android.content.Context;
import android.widget.RemoteViews;

/** Sua semana: horas, sessões e os dias em que você jogou. */
public class SemanaWidget extends WidgetBase {
    @Override
    RemoteViews montar(Context c) { return Widgets.semana(c); }
}
