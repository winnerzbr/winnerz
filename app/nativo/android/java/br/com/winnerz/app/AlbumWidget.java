package br.com.winnerz.app;

import android.content.Context;
import android.widget.RemoteViews;

/** Álbum: pacotes esperando e quanto falta para completar. */
public class AlbumWidget extends WidgetBase {
    @Override
    RemoteViews montar(Context c) { return Widgets.album(c); }
}
