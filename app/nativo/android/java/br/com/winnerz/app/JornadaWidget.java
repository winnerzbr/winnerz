package br.com.winnerz.app;

import android.content.Context;
import android.widget.RemoteViews;

/** Jornada: o jogo atual e a sessão inteira (jogar, momentos, pontos, finalizar) sem abrir o app. */
public class JornadaWidget extends WidgetBase {
    @Override
    RemoteViews montar(Context c) { return Widgets.jornada(c); }
}
