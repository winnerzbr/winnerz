package br.com.winnerz.app;

import android.content.Context;
import android.widget.RemoteViews;

/** Avisos: os últimos avisos do sino e marcar como lidos. */
public class AvisosWidget extends WidgetBase {
    @Override
    RemoteViews montar(Context c) { return Widgets.avisos(c); }
}
