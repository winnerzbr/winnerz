package br.com.winnerz.app;

import android.content.Context;
import android.widget.RemoteViews;

/** Live do WinnerZ: quando a live está no ar. */
public class LiveWidget extends WidgetBase {
    @Override
    RemoteViews montar(Context c) { return Widgets.live(c); }
}
