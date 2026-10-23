package br.com.winnerz.app;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.speech.RecognizerIntent;
import android.text.InputType;
import android.util.Base64;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.Chronometer;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONObject;

/**
 * A folha que sobe por cima da tela inicial quando o widget precisa de texto: guardar um momento (com foto),
 * marcar um ponto para voltar, o objetivo pequeno e o fim da sessão. Guardou, ela fecha e a pessoa volta ao jogo.
 */
public class FolhaActivity extends Activity {
    static final String[] SENTIMENTOS = { "Adorei", "Quero continuar", "Foi suficiente por hoje", "Não encaixou" };
    private static final int FOTO = 41, GALERIA = 42, VOZ = 43;

    /** camera = abre a câmera na hora (foto da TV), como os botões grandes do site no celular. */
    static PendingIntent abrir(Context c, String modo, boolean camera) {
        Intent i = new Intent(c, FolhaActivity.class);
        i.setData(Uri.parse("winnerz-folha://" + modo + (camera ? "/camera" : "")));
        i.putExtra("modo", modo);
        i.putExtra("camera", camera);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        return PendingIntent.getActivity(c, 900 + Math.abs((modo + camera).hashCode() % 90), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private String modo = "momento";
    private JSONObject aberta;
    private EditText nome, nota, onde, recado, objetivo;
    private ImageView previa;
    private TextView guardar, rotuloProgresso;
    private Bitmap foto;
    private File arquivoFoto;
    private Uri fonteFoto;
    private TextView botaoFoto;
    private EditText falandoEm;
    private String sentimento = "", objetivoFeito = "", intencaoFeita = "";
    private int progresso = -1;
    private boolean enviando;

    // ── Medidas e peças ─────────────────────────────────────────────────────────
    private int dp(float v) { return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics())); }

    private TextView texto(String s, float sp, int cor, boolean forte) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setTextColor(cor);
        if (forte) t.setTypeface(Typeface.create("sans-serif-condensed", Typeface.BOLD));
        return t;
    }

    private TextView rotulo(String s) {
        TextView t = texto(s, 12.5f, 0xFF9AA1AA, false);
        t.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        return t;
    }

    private TextView botao(String s, boolean principal) {
        TextView b = texto(s, 14, principal ? 0xFF07080A : 0xFFE6E9ED, false);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setBackgroundResource(principal ? R.drawable.botao_principal : R.drawable.botao_sec);
        b.setGravity(Gravity.CENTER_VERTICAL);
        b.setPadding(dp(14), 0, dp(principal ? 36 : 22), 0);
        b.setMinHeight(dp(40));
        b.setClickable(true);
        b.setFocusable(true);
        return b;
    }

    private EditText campo(String dica, boolean varias) {
        EditText e = new EditText(this);
        e.setHint(dica);
        e.setHintTextColor(0xFF5D646D);
        e.setTextColor(0xFFE6E9ED);
        e.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14.5f);
        e.setBackgroundResource(R.drawable.campo);
        e.setPadding(dp(11), dp(9), dp(11), dp(9));
        e.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES | (varias ? InputType.TYPE_TEXT_FLAG_MULTI_LINE : 0));
        if (varias) { e.setMinLines(2); e.setMaxLines(5); e.setGravity(Gravity.TOP | Gravity.START); }
        else { e.setSingleLine(true); e.setImeOptions(EditorInfo.IME_ACTION_NEXT); }
        return e;
    }

    /** Rótulo + campo + "Falar" (ditado por voz) quando dá. */
    private LinearLayout bloco(LinearLayout pai, String titulo, EditText e) {
        LinearLayout b = new LinearLayout(this);
        b.setOrientation(LinearLayout.VERTICAL);
        LinearLayout topo = new LinearLayout(this);
        topo.setGravity(Gravity.CENTER_VERTICAL);
        topo.addView(rotulo(titulo), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        TextView falar = texto("Falar", 12.5f, 0xFFC9CED4, false);
        falar.setTypeface(Typeface.DEFAULT_BOLD);
        falar.setPadding(dp(10), dp(6), 0, dp(6));
        falar.setOnClickListener(v -> falar(e));
        falar.setContentDescription("Falar em vez de digitar: " + titulo);
        topo.addView(falar);
        b.addView(topo);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(2);
        b.addView(e, lp);
        espaco(pai, 12);
        pai.addView(b);
        return b;
    }

    private void espaco(LinearLayout pai, int alto) {
        pai.addView(new View(this), new LinearLayout.LayoutParams(1, dp(alto)));
    }

    /** Fileira de opções (uma escolhida por vez; tocar de novo desmarca). */
    private interface Escolha { void escolheu(String id); }

    private void opcoes(LinearLayout pai, String titulo, String[] ids, String[] nomes, int porLinha, Escolha cb) {
        espaco(pai, 12);
        pai.addView(rotulo(titulo));
        final List<TextView> todas = new ArrayList<>();
        final String[] atual = { "" };
        LinearLayout linha = null;
        for (int i = 0; i < ids.length; i++) {
            if (i % porLinha == 0) {
                linha = new LinearLayout(this);
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                lp.topMargin = dp(6);
                pai.addView(linha, lp);
            }
            final String id = ids[i];
            TextView c = texto(nomes[i], 13, 0xFFC9CED4, false);
            c.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
            c.setBackgroundResource(R.drawable.chip);
            c.setGravity(Gravity.CENTER_VERTICAL);
            c.setPadding(dp(10), 0, dp(14), 0);
            c.setMinHeight(dp(36));
            c.setMaxLines(1);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
            if ((i + 1) % porLinha != 0 && i + 1 < ids.length) lp.rightMargin = dp(6);
            linha.addView(c, lp);
            todas.add(c);
            c.setOnClickListener(v -> {
                atual[0] = atual[0].equals(id) ? "" : id;
                for (int k = 0; k < todas.size(); k++) {
                    boolean on = ids[k].equals(atual[0]);
                    todas.get(k).setBackgroundResource(on ? R.drawable.chip_on : R.drawable.chip);
                    todas.get(k).setTextColor(on ? 0xFF07080A : 0xFFC9CED4);
                }
                cb.escolheu(atual[0]);
            });
        }
        // Preenche a última fileira para as opções manterem a mesma largura.
        int sobra = ids.length % porLinha == 0 ? 0 : porLinha - ids.length % porLinha;
        for (int i = 0; i < sobra && linha != null; i++) {
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, 1, 1);
            lp.leftMargin = dp(6);
            linha.addView(new View(this), lp);
        }
    }

    // ── Tela ────────────────────────────────────────────────────────────────────
    @Override
    protected void onCreate(Bundle salvo) {
        super.onCreate(salvo);
        String m = getIntent().getStringExtra("modo");
        if (m != null) modo = m;

        if (!Conta.ligada(this)) { abrirNoApp("/sessao"); return; }
        JSONObject p = Conta.painel(this);
        JSONObject j = p == null ? null : p.optJSONObject("jornada");
        aberta = j == null ? null : j.optJSONObject("aberta");
        if (aberta == null) {
            Toast.makeText(this, "Nenhuma sessão aberta agora.", Toast.LENGTH_SHORT).show();
            Painel.atualizarAsync(this, null);
            finish();
            return;
        }
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE | WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN);
        boolean abrirCamera = getIntent().getBooleanExtra("camera", false);
        if (salvo != null) {
            // Voltou depois de o Android fechar a folha enquanto a câmera estava aberta.
            modo = salvo.getString("modo", modo);
            String a = salvo.getString("arquivo"), f = salvo.getString("fonte");
            if (a != null) arquivoFoto = new File(a);
            if (f != null) fonteFoto = Uri.parse(f);
            abrirCamera = false;
        }
        montar();
        if (fonteFoto != null) mostrarFoto(fonteFoto);
        if (abrirCamera && ("momento".equals(modo) || "ponto".equals(modo))) tirarFoto();
    }

    @Override
    protected void onSaveInstanceState(Bundle b) {
        super.onSaveInstanceState(b);
        b.putString("modo", modo);
        if (arquivoFoto != null) b.putString("arquivo", arquivoFoto.getAbsolutePath());
        if (fonteFoto != null) b.putString("fonte", fonteFoto.toString());
    }

    private void montar() {
        LinearLayout raiz = new LinearLayout(this);
        raiz.setOrientation(LinearLayout.VERTICAL);
        View fora = new View(this);
        fora.setOnClickListener(v -> finish());
        fora.setContentDescription("Fechar");
        raiz.addView(fora, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        ScrollView rolo = new ScrollView(this);
        rolo.setBackgroundResource(R.drawable.folha);
        rolo.setFillViewport(false);
        LinearLayout f = new LinearLayout(this);
        f.setOrientation(LinearLayout.VERTICAL);
        f.setPadding(dp(18), dp(10), dp(18), dp(18));
        rolo.addView(f, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        raiz.addView(rolo, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        // Puxador e título
        View puxa = new View(this);
        puxa.setBackgroundResource(R.drawable.puxador);
        LinearLayout.LayoutParams lpp = new LinearLayout.LayoutParams(dp(36), dp(4));
        lpp.gravity = Gravity.CENTER_HORIZONTAL;
        lpp.bottomMargin = dp(12);
        f.addView(puxa, lpp);

        long inicio = Painel.ms(aberta.optString("inicio"));
        long minutos = Math.max(1, (System.currentTimeMillis() - inicio) / 60000);
        String titulo;
        switch (modo) {
            case "ponto": titulo = "Quero voltar aqui"; break;
            case "objetivo": titulo = "Hoje é para…"; break;
            case "finalizar": titulo = "Fim da sessão · " + Painel.horas(minutos); break;
            default: titulo = "Momento"; break;
        }
        LinearLayout topo = new LinearLayout(this);
        topo.setGravity(Gravity.CENTER_VERTICAL);
        topo.addView(texto(titulo, 20, 0xFFE6E9ED, true), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        if (!"finalizar".equals(modo)) {
            Chronometer cr = new Chronometer(this);
            cr.setTextColor(0xFFFFB25B);
            cr.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
            cr.setTypeface(Typeface.DEFAULT_BOLD);
            cr.setBase(SystemClock.elapsedRealtime() - Math.max(0, System.currentTimeMillis() - inicio));
            cr.start();
            topo.addView(cr);
        }
        f.addView(topo);
        TextView jogo = texto(Painel.txt(aberta, "titulo"), 13, 0xFF9AA1AA, false);
        jogo.setMaxLines(1);
        f.addView(jogo);

        switch (modo) {
            case "objetivo": montarObjetivo(f); break;
            case "finalizar": montarFinalizar(f); break;
            default: montarCaptura(f); break;
        }

        // Botões
        espaco(f, 18);
        LinearLayout pe = new LinearLayout(this);
        pe.setGravity(Gravity.CENTER_VERTICAL | Gravity.END);
        if ("finalizar".equals(modo)) {
            TextView zerei = texto("Zerei!", 13.5f, 0xFFC9CED4, false);
            zerei.setTypeface(Typeface.DEFAULT_BOLD);
            zerei.setPadding(0, dp(10), dp(10), dp(10));
            zerei.setContentDescription("Zerei: abrir o fim da sessão no app, com a comemoração");
            zerei.setOnClickListener(v -> abrirNoApp("/sessao?finalizar=1"));
            pe.addView(zerei);
            pe.addView(new View(this), new LinearLayout.LayoutParams(0, 1, 1));
        }
        TextView cancelar = botao("finalizar".equals(modo) ? "Voltar" : "Cancelar", false);
        cancelar.setOnClickListener(v -> finish());
        LinearLayout.LayoutParams lc = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lc.rightMargin = dp(8);
        pe.addView(cancelar, lc);
        guardar = botao("finalizar".equals(modo) ? "Finalizar sessão" : "ponto".equals(modo) ? "Criar ponto" : "Guardar momento", true);
        guardar.setOnClickListener(v -> enviar());
        pe.addView(guardar);
        f.addView(pe);

        // Desenho de ponta a ponta (Android 15): a folha fica acima da barra de navegação e do teclado.
        raiz.setOnApplyWindowInsetsListener((v, ins) -> {
            int baixo, cima;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bar = ins.getInsets(WindowInsets.Type.systemBars());
                android.graphics.Insets tec = ins.getInsets(WindowInsets.Type.ime());
                baixo = Math.max(bar.bottom, tec.bottom);
                cima = bar.top;
            } else {
                baixo = ins.getSystemWindowInsetBottom();
                cima = ins.getSystemWindowInsetTop();
            }
            v.setPadding(0, cima, 0, baixo);
            return ins;
        });
        setContentView(raiz);
    }

    /** Momento e "Quero voltar aqui" (o ponto): foto opcional, nome e nota. Dá para trocar o tipo ali mesmo. */
    private void montarCaptura(LinearLayout f) {
        final boolean ponto = "ponto".equals(modo);
        espaco(f, 12);
        LinearLayout tipo = new LinearLayout(this);
        String[][] tipos = { { "momento", "Momento" }, { "ponto", "Quero voltar aqui" } };
        for (int i = 0; i < tipos.length; i++) {
            final String id = tipos[i][0];
            boolean on = id.equals(modo);
            TextView t = texto(tipos[i][1], 13.5f, on ? 0xFF07080A : 0xFFC9CED4, false);
            t.setTypeface(Typeface.DEFAULT_BOLD);
            t.setBackgroundResource(on ? R.drawable.chip_on : R.drawable.chip);
            t.setGravity(Gravity.CENTER_VERTICAL);
            t.setPadding(dp(10), 0, dp(14), 0);
            t.setMinHeight(dp(38));
            t.setCompoundDrawablesRelativeWithIntrinsicBounds("momento".equals(id) ? (on ? R.drawable.ic_camera_escuro : R.drawable.ic_camera_claro) : (on ? R.drawable.ic_pin_escuro : R.drawable.ic_pin_claro), 0, 0, 0);
            t.setCompoundDrawablePadding(dp(7));
            t.setOnClickListener(v -> trocarModo(id));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
            if (i == 0) lp.rightMargin = dp(6);
            tipo.addView(t, lp);
        }
        f.addView(tipo);

        espaco(f, 12);
        previa = new ImageView(this);
        previa.setScaleType(ImageView.ScaleType.CENTER_CROP);
        previa.setVisibility(foto == null ? View.GONE : View.VISIBLE);
        if (foto != null) previa.setImageBitmap(foto);
        previa.setContentDescription("Sua foto");
        previa.setOnClickListener(v -> tirarFoto());
        LinearLayout.LayoutParams lpv = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(170));
        lpv.bottomMargin = dp(8);
        f.addView(previa, lpv);
        LinearLayout fotos = new LinearLayout(this);
        botaoFoto = botao(foto == null ? "Tirar foto" : "Trocar foto", false);
        botaoFoto.setCompoundDrawablesRelativeWithIntrinsicBounds(R.drawable.ic_camera_claro, 0, 0, 0);
        botaoFoto.setCompoundDrawablePadding(dp(8));
        botaoFoto.setOnClickListener(v -> tirarFoto());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.rightMargin = dp(8);
        fotos.addView(botaoFoto, lp);
        TextView galeria = botao("Galeria", false);
        galeria.setOnClickListener(v -> escolherFoto());
        fotos.addView(galeria);
        f.addView(fotos);

        String n = v(nome), o = v(nota);
        nome = campo(ponto ? "Ex.: Quarto trancado, segundo andar" : "Ex.: A porta iluminada", false);
        nome.setText(n);
        bloco(f, ponto ? "Que lugar é esse? (opcional)" : "Dê um nome (opcional)", nome);
        nota = campo(ponto ? "Ex.: preciso da chave que fica no cofre" : "O que você quer lembrar deste instante?", true);
        nota.setText(o);
        bloco(f, ponto ? "Por que voltar? (opcional)" : "Nota (opcional)", nota);
    }

    private void trocarModo(String novo) {
        if (novo.equals(modo)) return;
        modo = novo;
        montar();
    }

    private void montarObjetivo(LinearLayout f) {
        objetivo = campo("Ex.: achar a chave do porão", false);
        String atual = Painel.txt(aberta, "objetivo");
        objetivo.setText(Widgets.POUCO.equals(atual) ? "" : atual);
        objetivo.setImeOptions(EditorInfo.IME_ACTION_DONE);
        bloco(f, "O que você quer desta sessão?", objetivo);
    }

    private void montarFinalizar(LinearLayout f) {
        onde = campo("Banco da Ponte de Ossos", false);
        bloco(f, "Onde parou?", onde);

        opcoes(f, "Como foi?", SENTIMENTOS, SENTIMENTOS, 2, id -> sentimento = id);

        String intencao = Painel.txt(aberta, "intencao");
        if (!intencao.isEmpty()) {
            String pergunta;
            switch (intencao) {
                case "descansar": pergunta = "Descansou?"; break;
                case "divertir": pergunta = "Se divertiu?"; break;
                case "avancar": pergunta = "Avançou?"; break;
                default: pergunta = "Valeu o desafio?"; break;
            }
            opcoes(f, pergunta, new String[] { "sim", "meio", "nao" }, new String[] { "Sim", "Mais ou menos", "Não" }, 3, id -> intencaoFeita = id);
        }
        String obj = Painel.txt(aberta, "objetivo");
        if (!obj.isEmpty()) {
            opcoes(f, Widgets.POUCO.equals(obj) ? "Deu para parar na hora?" : "Cumpriu o objetivo? “" + obj + "”", new String[] { "sim", "quase", "nao" }, Widgets.POUCO.equals(obj) ? new String[] { "Sim", "Passei um pouco", "Não deu" } : new String[] { "Cumpri", "Quase", "Não" }, 3, id -> objetivoFeito = id);
        }

        espaco(f, 14);
        LinearLayout lin = new LinearLayout(this);
        lin.addView(rotulo("Quanto do jogo você já fez?"), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        final int antes = aberta.isNull("progresso") ? -1 : aberta.optInt("progresso", -1);
        rotuloProgresso = texto(antes >= 0 ? antes + "%" : "—", 13, 0xFFE6E9ED, false);
        rotuloProgresso.setTypeface(Typeface.DEFAULT_BOLD);
        lin.addView(rotuloProgresso);
        f.addView(lin);
        SeekBar barra = new SeekBar(this);
        barra.setMax(100);
        barra.setProgress(Math.max(0, antes));
        barra.setContentDescription("Quanto do jogo você já fez, em porcentagem");
        barra.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override public void onProgressChanged(SeekBar s, int v, boolean doUsuario) {
                if (!doUsuario) return;
                progresso = v;
                rotuloProgresso.setText(v + "%");
            }
            @Override public void onStartTrackingTouch(SeekBar s) {}
            @Override public void onStopTrackingTouch(SeekBar s) {}
        });
        LinearLayout.LayoutParams lb = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lb.topMargin = dp(4);
        f.addView(barra, lb);

        recado = campo("Pegar o atalho do elevador antes do chefe.", true);
        bloco(f, "Recado para a próxima vez", recado);
    }

    // ── Foto, galeria e voz ─────────────────────────────────────────────────────
    private void tirarFoto() {
        try {
            File pasta = new File(getCacheDir(), "momentos");
            if (!pasta.exists()) pasta.mkdirs();
            arquivoFoto = new File(pasta, "foto-" + System.currentTimeMillis() + ".jpg");
            Uri u = FileProvider.getUriForFile(this, getPackageName() + ".winnerz.fotos", arquivoFoto);
            Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            i.putExtra(MediaStore.EXTRA_OUTPUT, u);
            i.setClipData(ClipData.newRawUri("", u));
            i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(i, FOTO);
        } catch (Exception e) {
            Toast.makeText(this, "Não deu para abrir a câmera. Tente a galeria.", Toast.LENGTH_SHORT).show();
        }
    }

    private void escolherFoto() {
        Intent i = new Intent(Intent.ACTION_GET_CONTENT);
        i.setType("image/*");
        i.addCategory(Intent.CATEGORY_OPENABLE);
        try { startActivityForResult(i, GALERIA); }
        catch (ActivityNotFoundException e) { Toast.makeText(this, "Não achamos a galeria neste celular.", Toast.LENGTH_SHORT).show(); }
    }

    private void falar(EditText alvo) {
        falandoEm = alvo;
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR");
        i.putExtra(RecognizerIntent.EXTRA_PROMPT, "Pode falar");
        try { startActivityForResult(i, VOZ); }
        catch (ActivityNotFoundException e) { Toast.makeText(this, "Este celular não tem ditado por voz.", Toast.LENGTH_SHORT).show(); }
    }

    @Override
    protected void onActivityResult(int pedido, int resultado, Intent dados) {
        super.onActivityResult(pedido, resultado, dados);
        if (resultado != RESULT_OK) return;
        if (pedido == VOZ && dados != null && falandoEm != null) {
            ArrayList<String> r = dados.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (r == null || r.isEmpty()) return;
            String dito = r.get(0).trim();
            if (dito.isEmpty()) return;
            String ja = falandoEm.getText().toString().trim();
            String novo = ja.isEmpty() ? Character.toUpperCase(dito.charAt(0)) + dito.substring(1) : ja + " " + dito;
            falandoEm.setText(novo);
            falandoEm.setSelection(novo.length());
            return;
        }
        Uri u = null;
        if (pedido == FOTO && arquivoFoto != null && arquivoFoto.length() > 0) u = Uri.fromFile(arquivoFoto);
        if (pedido == GALERIA && dados != null) u = dados.getData();
        if (u == null) return;
        fonteFoto = u;
        mostrarFoto(u);
    }

    private void mostrarFoto(Uri fonte) {
        new Thread(() -> {
            Bitmap b = carregar(fonte);
            runOnUiThread(() -> {
                if (b == null) { Toast.makeText(this, "Não deu para abrir essa foto.", Toast.LENGTH_SHORT).show(); return; }
                foto = b;
                if (previa != null) { previa.setImageBitmap(b); previa.setVisibility(View.VISIBLE); }
                if (botaoFoto != null) botaoFoto.setText("Trocar foto");
            });
        }).start();
    }

    /** Abre a foto já do tamanho certo (lado maior até 1600 px) e de pé, como foi tirada. */
    private Bitmap carregar(Uri u) {
        try {
            BitmapFactory.Options o = new BitmapFactory.Options();
            o.inJustDecodeBounds = true;
            try (InputStream in = getContentResolver().openInputStream(u)) { BitmapFactory.decodeStream(in, null, o); }
            if (o.outWidth <= 0) return null;
            int amostra = 1;
            while (Math.max(o.outWidth, o.outHeight) / (amostra * 2) >= 1600) amostra *= 2;
            BitmapFactory.Options o2 = new BitmapFactory.Options();
            o2.inSampleSize = amostra;
            Bitmap b;
            try (InputStream in = getContentResolver().openInputStream(u)) { b = BitmapFactory.decodeStream(in, null, o2); }
            if (b == null) return null;
            int giro = 0;
            if (Build.VERSION.SDK_INT >= 24) {
                try (InputStream in = getContentResolver().openInputStream(u)) {
                    android.media.ExifInterface ex = new android.media.ExifInterface(in);
                    int or = ex.getAttributeInt(android.media.ExifInterface.TAG_ORIENTATION, android.media.ExifInterface.ORIENTATION_NORMAL);
                    giro = or == android.media.ExifInterface.ORIENTATION_ROTATE_90 ? 90 : or == android.media.ExifInterface.ORIENTATION_ROTATE_180 ? 180 : or == android.media.ExifInterface.ORIENTATION_ROTATE_270 ? 270 : 0;
                } catch (Exception semExif) { giro = 0; }
            }
            float esc = Math.min(1f, 1600f / Math.max(b.getWidth(), b.getHeight()));
            if (giro != 0 || esc < 1f) {
                Matrix mx = new Matrix();
                mx.postScale(esc, esc);
                mx.postRotate(giro);
                Bitmap r = Bitmap.createBitmap(b, 0, 0, b.getWidth(), b.getHeight(), mx, true);
                if (r != b) b.recycle();
                b = r;
            }
            return b;
        } catch (Exception e) {
            return null;
        }
    }

    // ── Guardar ─────────────────────────────────────────────────────────────────
    private static String v(EditText e) { return e == null ? "" : e.getText().toString().trim(); }

    private void enviar() {
        if (enviando) return;
        final JSONObject corpo = new JSONObject();
        try {
            switch (modo) {
                case "momento":
                case "ponto":
                    corpo.put("acao", "momento").put("tipo", modo).put("titulo", v(nome)).put("nota", v(nota));
                    break;
                case "objetivo":
                    corpo.put("acao", "objetivo").put("objetivo", v(objetivo));
                    if (!v(objetivo).isEmpty()) corpo.put("limparIntencao", true);
                    break;
                default:
                    corpo.put("acao", "finalizar").put("onde", v(onde)).put("sentimento", sentimento).put("recado", v(recado))
                        .put("objetivoFeito", objetivoFeito).put("intencaoFeita", intencaoFeita);
                    if (progresso >= 0) corpo.put("progresso", progresso);
                    break;
            }
        } catch (Exception e) { return; }

        enviando = true;
        final String antes = guardar.getText().toString();
        guardar.setText("Guardando…");
        final Context app = getApplicationContext();
        final Bitmap aEnviar = foto;
        new Thread(() -> {
            try {
                if (aEnviar != null) {
                    ByteArrayOutputStream o = new ByteArrayOutputStream();
                    aEnviar.compress(Bitmap.CompressFormat.JPEG, 82, o);
                    corpo.put("imagem", Base64.encodeToString(o.toByteArray(), Base64.NO_WRAP));
                }
                if (corpo.optBoolean("limparIntencao")) { corpo.remove("limparIntencao"); Api.chamar(app, new JSONObject().put("acao", "intencao").put("intencao", "")); }
                JSONObject r = Api.chamar(app, corpo);
                Conta.marcarAcao(app);
                final String ok;
                if ("finalizar".equals(modo)) {
                    Sessao.esconder(app);
                    String h = Painel.horas(r.optInt("minutos", 0));
                    Conta.flash(app, h.isEmpty() ? "Sessão guardada agora" : "Sessão de " + h + " guardada agora", 20 * 60_000);
                    // O widget já sai da sessão; o painel novo confirma.
                    JSONObject p = Conta.painel(app);
                    if (p != null && p.optJSONObject("jornada") != null) { p.optJSONObject("jornada").put("aberta", JSONObject.NULL); Conta.salvarPainel(app, p); }
                    Widgets.atualizarTodos(app);
                    ok = "Sessão guardada.";
                } else if ("objetivo".equals(modo)) {
                    ok = v(objetivo).isEmpty() ? "Objetivo tirado." : "Objetivo marcado.";
                } else {
                    ok = "ponto".equals(modo) ? "Ponto marcado." : "Momento guardado.";
                }
                if (arquivoFoto != null) arquivoFoto.delete();
                Painel.atualizar(app);
                runOnUiThread(() -> { Toast.makeText(app, ok, Toast.LENGTH_SHORT).show(); finish(); });
            } catch (Api.SemChave e) {
                runOnUiThread(() -> { Toast.makeText(app, "Entre de novo no app para usar o widget.", Toast.LENGTH_LONG).show(); finish(); });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    enviando = false;
                    guardar.setText(antes);
                    Toast.makeText(app, "Não deu para guardar agora. Confira a internet e tente de novo.", Toast.LENGTH_LONG).show();
                });
            }
        }, "winnerz-folha").start();
    }

    private void abrirNoApp(String caminho) {
        Intent i = new Intent(this, MainActivity.class);
        i.setAction(Intent.ACTION_VIEW);
        i.setData(Uri.parse(Links.SITE + caminho));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(i);
        finish();
    }
}
