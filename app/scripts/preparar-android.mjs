// Coloca as partes nativas do WinnerZ no projeto Android gerado pelo Capacitor (npx cap add android):
// código Java (plugin, widgets, sessão), layouts e desenhos, os widgets no AndroidManifest e a assinatura do app.
// Uso (na pasta app/): node scripts/preparar-android.mjs
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const nativo = path.join(raiz, 'nativo', 'android');
const main = path.join(raiz, 'android', 'app', 'src', 'main');
if (!fs.existsSync(main)) throw new Error('Rode antes: npx cap add android');

function copiar(de, para) {
  for (const nome of fs.readdirSync(de)) {
    const a = path.join(de, nome), b = path.join(para, nome);
    if (fs.statSync(a).isDirectory()) { fs.mkdirSync(b, { recursive: true }); copiar(a, b); }
    else fs.copyFileSync(a, b);
  }
}
copiar(path.join(nativo, 'java'), path.join(main, 'java'));
copiar(path.join(nativo, 'res'), path.join(main, 'res'));

// ── AndroidManifest: widgets e permissão de avisos ──
const mf = path.join(main, 'AndroidManifest.xml');
let m = fs.readFileSync(mf, 'utf8');
const receptor = (classe, rotulo, info) => `
        <receiver android:name=".${classe}" android:label="${rotulo}" android:exported="false">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/${info}" />
        </receiver>`;
if (!m.includes('.JornadaWidget')) {
  m = m.replace('</application>', `${receptor('JornadaWidget', 'WinnerZ · Jornada', 'widget_jornada_info')}${receptor('RadarWidget', 'WinnerZ · Radar', 'widget_radar_info')}
    </application>`);
}
if (!m.includes('android.permission.POST_NOTIFICATIONS')) {
  m = m.replace('</manifest>', '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n</manifest>');
}
fs.writeFileSync(mf, m);

// ── Assinatura: a chave vem dos segredos do GitHub (nunca fica no repositório) ──
const gradle = path.join(raiz, 'android', 'app', 'build.gradle');
let g = fs.readFileSync(gradle, 'utf8');
if (!g.includes('signingConfigs')) {
  g = g.replace(/android\s*\{/, `android {
    signingConfigs {
        release {
            if (System.getenv("WZ_KEYSTORE")) {
                storeFile file(System.getenv("WZ_KEYSTORE"))
                storePassword System.getenv("WZ_KEYSTORE_SENHA")
                keyAlias "winnerz"
                keyPassword System.getenv("WZ_KEYSTORE_SENHA")
            }
        }
    }`);
  g = g.replace(/buildTypes\s*\{\s*release\s*\{/, (s) => `${s}
            if (System.getenv("WZ_KEYSTORE")) signingConfig signingConfigs.release`);
}
// Número da versão: cresce a cada build do GitHub, para o Android aceitar a atualização por cima.
const numero = process.env.WZ_VERSAO ? Number(process.env.WZ_VERSAO) : null;
if (numero) g = g.replace(/versionCode\s+\d+/, `versionCode ${numero}`).replace(/versionName\s+"[^"]*"/, `versionName "1.0.${numero}"`);
fs.writeFileSync(gradle, g);
console.log('Partes nativas do WinnerZ aplicadas no Android.');
