package br.com.winnerz.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/** Tela principal do app: o site do WinnerZ, com a ponte para as partes nativas (widgets, sessão, avisos). */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WinnerzNativoPlugin.class);
        super.onCreate(savedInstanceState);
        // O tamanho de fonte do sistema (comum em celulares Samsung) aumentava todo o texto do site
        // e empurrava o layout para fora da tela. O app mostra o texto no tamanho do desenho do site.
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().getSettings().setTextZoom(100);
        }
    }
}
