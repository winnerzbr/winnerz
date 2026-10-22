package br.com.winnerz.app;

import android.content.Context;
import android.widget.RemoteViews;

/** Próxima jogatina: quando é, quem vai, e responder ali mesmo. */
public class JogatinaWidget extends WidgetBase {
    @Override
    RemoteViews montar(Context c) { return Widgets.jogatina(c); }
}
