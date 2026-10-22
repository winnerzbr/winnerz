package br.com.winnerz.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/** Tela principal do app: o site do WinnerZ, com a ponte para as partes nativas (widgets, sessão, avisos). */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WinnerzNativoPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
