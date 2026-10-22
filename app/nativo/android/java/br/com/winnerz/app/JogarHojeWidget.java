package br.com.winnerz.app;

import android.content.Context;
import android.widget.RemoteViews;

/** O que jogar hoje: uma sugestão da sua estante, com o motivo. */
public class JogarHojeWidget extends WidgetBase {
    @Override
    RemoteViews montar(Context c) { return Widgets.jogarHoje(c); }
}
