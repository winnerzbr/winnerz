package br.com.winnerz.app;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Os botões dos widgets que fazem a ação ali mesmo, sem abrir o app: jogar, para que é a sessão,
 * trocar de jogo, outra sugestão, responder à jogatina, marcar avisos como lidos.
 * O widget muda na hora (o que se espera que aconteça) e depois confere com o WinnerZ.
 */
public class AcoesReceiver extends BroadcastReceiver {
    static final String ACAO = "br.com.winnerz.app.WIDGET_ACAO";

    /** Botão de widget que dispara uma ação aqui. O endereço único separa um botão do outro. */
    static PendingIntent botao(Context c, String acao, String a, String b) {
        Intent i = new Intent(c, AcoesReceiver.class);
        i.setAction(ACAO);
        i.setData(Uri.parse("winnerz-acao://" + acao + "/" + Uri.encode(a == null ? "" : a) + "/" + Uri.encode(b == null ? "" : b)));
        i.putExtra("acao", acao);
        i.putExtra("a", a == null ? "" : a);
        i.putExtra("b", b == null ? "" : b);
        return PendingIntent.getBroadcast(c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        if (!ACAO.equals(intent.getAction())) return;
        final Context c = ctx.getApplicationContext();
        final String acao = intent.getStringExtra("acao"), a = intent.getStringExtra("a"), b = intent.getStringExtra("b");
        if (acao == null) return;

        // Só mexe na tela: não precisa do servidor.
        switch (acao) {
            case "proximo": case "anterior": {
                int n = Conta.numero(c, "jogo") + ("proximo".equals(acao) ? 1 : -1);
                Conta.numero(c, "jogo", n);
                Widgets.atualizarTodos(c);
                return;
            }
            case "outra":
                Conta.numero(c, "sugestao", Conta.numero(c, "sugestao") + 1);
                Widgets.atualizarTodos(c);
                return;
            case "pular":
                Conta.texto(c, "pulou", a);
                Widgets.atualizarTodos(c);
                return;
            default:
                break;
        }

        // O widget já mostra o resultado; o servidor confirma em seguida.
        final JSONObject antes = Conta.painel(c);
        final boolean mudou = otimista(c, acao, a, b);
        if (mudou) Widgets.atualizarTodos(c);
        final PendingResult pr = goAsync();
        new Thread(() -> {
            try {
                JSONObject corpo = new JSONObject().put("acao", "atualizar".equals(acao) ? "painel" : acao);
                switch (acao) {
                    case "jogar": corpo.put("gameId", a); break;
                    case "intencao": corpo.put("intencao", a); break;
                    case "plano":
                        // Uma escolha só: a intenção apaga o objetivo e "só um pouco" (que é objetivo) apaga a intenção.
                        boolean pouco = "pouco".equals(a);
                        Api.chamar(c, new JSONObject().put("acao", "intencao").put("intencao", pouco ? "" : a));
                        corpo.put("acao", "objetivo").put("objetivo", pouco ? Widgets.POUCO : "");
                        break;
                    case "rsvp": corpo.put("id", a).put("resposta", b); break;
                    default: break;
                }
                if (!"atualizar".equals(acao)) {
                    Api.chamar(c, corpo);
                    Conta.marcarAcao(c);
                }
                Painel.atualizar(c);
            } catch (Api.SemChave e) {
                Widgets.atualizarTodos(c);
            } catch (Exception e) {
                // Não deu (sem internet?): volta o widget como estava e avisa no topo dele.
                if (antes != null) Conta.salvarPainel(c, antes);
                if ("jogar".equals(acao)) Sessao.esconder(c);
                Conta.flash(c, "Não deu agora. Confira a internet e toque de novo.", 60_000);
                Widgets.atualizarTodos(c);
            } finally {
                pr.finish();
            }
        }, "winnerz-acao").start();
    }

    /** Aplica a ação no painel guardado, para o widget responder na hora. */
    private static boolean otimista(Context c, String acao, String a, String b) {
        JSONObject p = Conta.painel(c);
        if (p == null) return false;
        try {
            switch (acao) {
                case "jogar": {
                    JSONObject j = p.optJSONObject("jornada");
                    if (j == null || j.optJSONObject("aberta") != null) return false;
                    JSONObject jogo = acharJogo(p, a);
                    JSONObject ab = new JSONObject();
                    ab.put("gameId", a);
                    ab.put("titulo", jogo == null ? "" : jogo.optString("titulo"));
                    ab.put("slug", jogo == null ? "" : jogo.optString("slug"));
                    ab.put("capa", jogo == null ? "" : jogo.optString("capa"));
                    if (jogo != null && jogo.has("progresso")) ab.put("progresso", jogo.opt("progresso"));
                    ab.put("inicio", Painel.iso(System.currentTimeMillis()));
                    j.put("aberta", ab);
                    Conta.texto(c, "pulou", "");
                    Conta.salvarPainel(c, p);
                    if (Conta.barra(c)) Sessao.mostrar(c, ab.optString("titulo", "Sessão aberta"), System.currentTimeMillis());
                    return true;
                }
                case "intencao": case "plano": {
                    JSONObject j = p.optJSONObject("jornada");
                    JSONObject ab = j == null ? null : j.optJSONObject("aberta");
                    if (ab == null) return false;
                    boolean pouco = "plano".equals(acao) && "pouco".equals(a);
                    ab.put("intencao", pouco ? JSONObject.NULL : a);
                    if ("plano".equals(acao)) ab.put("objetivo", pouco ? Widgets.POUCO : JSONObject.NULL);
                    Conta.salvarPainel(c, p);
                    return true;
                }
                case "rsvp": {
                    JSONObject jg = p.optJSONObject("jogatina");
                    if (jg == null) return false;
                    String antes = jg.optString("resposta", "");
                    if ("vou".equals(antes)) jg.put("vao", Math.max(0, jg.optInt("vao") - 1));
                    if ("talvez".equals(antes)) jg.put("talvez", Math.max(0, jg.optInt("talvez") - 1));
                    if ("vou".equals(b)) jg.put("vao", jg.optInt("vao") + 1);
                    if ("talvez".equals(b)) jg.put("talvez", jg.optInt("talvez") + 1);
                    jg.put("resposta", b);
                    Conta.salvarPainel(c, p);
                    return true;
                }
                case "lidos": {
                    JSONObject av = p.optJSONObject("avisos");
                    if (av == null) return false;
                    av.put("naoLidos", 0);
                    JSONArray it = av.optJSONArray("itens");
                    for (int i = 0; it != null && i < it.length(); i++) it.optJSONObject(i).put("lido", true);
                    Conta.salvarPainel(c, p);
                    return true;
                }
                default:
                    return false;
            }
        } catch (Exception e) {
            return false;
        }
    }

    static JSONObject acharJogo(JSONObject p, String gameId) {
        JSONObject j = p.optJSONObject("jornada");
        JSONArray js = j == null ? null : j.optJSONArray("jogos");
        for (int i = 0; js != null && i < js.length(); i++) {
            JSONObject o = js.optJSONObject(i);
            if (o != null && gameId.equals(o.optString("gameId"))) return o;
        }
        JSONArray sg = p.optJSONArray("sugestoes");
        for (int i = 0; sg != null && i < sg.length(); i++) {
            JSONObject o = sg.optJSONObject(i);
            if (o != null && gameId.equals(o.optString("gameId"))) return o;
        }
        return null;
    }
}
