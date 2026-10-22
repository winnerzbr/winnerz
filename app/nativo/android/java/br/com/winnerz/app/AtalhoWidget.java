package br.com.winnerz.app;

import android.content.Context;
import android.widget.RemoteViews;

/** Atalho: um toque abre a sessão do seu jogo; com ela aberta, mostra o tempo. */
public class AtalhoWidget extends WidgetBase {
    @Override
    RemoteViews montar(Context c) { return Widgets.atalho(c); }
}
