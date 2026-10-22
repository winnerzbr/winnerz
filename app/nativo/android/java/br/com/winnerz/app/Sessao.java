package br.com.winnerz.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import androidx.core.app.NotificationCompat;

/** A sessão aberta da Jornada fica fixa na barra de avisos, com o cronômetro correndo sozinho. */
final class Sessao {
    static final String CANAL = "sessao";
    static final int ID = 7001;

    private Sessao() {}

    static void mostrar(Context c, String titulo, long inicio) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CANAL, "Sessão aberta", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("O cronômetro da sessão que está aberta na Jornada.");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CANAL)
            .setSmallIcon(R.drawable.ic_stat_winnerz)
            .setColor(0xFFFFB25B)
            .setContentTitle(titulo)
            .setContentText("Sessão aberta")
            .setWhen(inicio)
            .setShowWhen(true)
            .setUsesChronometer(true)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setContentIntent(Links.abrir(c, "/sessao", 31))
            // Com o widget ligado, os botões abrem a folha por cima de tudo (sem sair do jogo).
            .addAction(0, "Guardar momento", Conta.ligada(c) ? FolhaActivity.abrir(c, "momento", true) : Links.abrir(c, "/sessao?acao=momento", 32))
            .addAction(0, "Voltar aqui", Conta.ligada(c) ? FolhaActivity.abrir(c, "ponto", true) : Links.abrir(c, "/sessao", 34))
            .addAction(0, "Finalizar", Conta.ligada(c) ? FolhaActivity.abrir(c, "finalizar", false) : Links.abrir(c, "/sessao?finalizar=1", 33));
        try {
            nm.notify(ID, b.build());
        } catch (SecurityException semPermissao) {
            // Sem permissão de avisos: a sessão continua normal no app.
        }
    }

    static void esconder(Context c) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(ID);
    }
}
