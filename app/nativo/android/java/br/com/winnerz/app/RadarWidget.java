package br.com.winnerz.app;

import android.content.Context;
import android.widget.RemoteViews;

/** Radar: o próximo lançamento que você acompanha e os seguintes. */
public class RadarWidget extends WidgetBase {
    @Override
    RemoteViews montar(Context c) { return Widgets.radar(c); }
}
