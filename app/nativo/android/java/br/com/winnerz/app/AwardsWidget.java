package br.com.winnerz.app;

import android.content.Context;
import android.widget.RemoteViews;

/** WinnerZ Awards: a contagem da votação e da revelação (nunca o resultado antes da hora). */
public class AwardsWidget extends WidgetBase {
    @Override
    RemoteViews montar(Context c) { return Widgets.awards(c); }
}
