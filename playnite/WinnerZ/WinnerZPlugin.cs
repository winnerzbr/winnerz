// Extensão do WinnerZ para o Playnite.
// Quando um jogo abre pelo Playnite, avisa o WinnerZ ("jogando agora"); quando fecha, manda a sessão (início e fim).
// Usa a chave pessoal gerada em Preferências → Pontes → Playnite. Sem a chave, não manda nada.
// Se a internet cair, guarda os avisos num arquivo e tenta de novo no próximo jogo.
using Playnite.SDK;
using Playnite.SDK.Data;
using Playnite.SDK.Events;
using Playnite.SDK.Models;
using Playnite.SDK.Plugins;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;

namespace WinnerZ
{
    public class WinnerZSettings : ObservableObject
    {
        private string token = string.Empty;
        public string Token { get => token; set => SetValue(ref token, value?.Trim() ?? string.Empty); }

        private string endpoint = "https://www.winnerz.com.br/api/pontes";
        public string Endpoint { get => endpoint; set => SetValue(ref endpoint, value?.Trim() ?? string.Empty); }
    }

    public class WinnerZSettingsViewModel : ObservableObject, ISettings
    {
        private readonly WinnerZPlugin plugin;
        private WinnerZSettings editing;
        private WinnerZSettings settings;
        public WinnerZSettings Settings { get => settings; set => SetValue(ref settings, value); }

        public WinnerZSettingsViewModel(WinnerZPlugin plugin)
        {
            this.plugin = plugin;
            Settings = plugin.LoadPluginSettings<WinnerZSettings>() ?? new WinnerZSettings();
        }

        public void BeginEdit() { editing = Serialization.GetClone(Settings); }
        public void CancelEdit() { Settings = editing; }
        public void EndEdit() { plugin.SavePluginSettings(Settings); }

        public bool VerifySettings(out List<string> errors)
        {
            errors = new List<string>();
            if (!string.IsNullOrEmpty(Settings.Token) && !Settings.Token.StartsWith("wzpn_"))
                errors.Add("A chave do WinnerZ começa com wzpn_. Copie de novo em Preferências → Pontes → Playnite.");
            if (!Uri.TryCreate(Settings.Endpoint, UriKind.Absolute, out _))
                errors.Add("O endereço do WinnerZ não é válido.");
            return errors.Count == 0;
        }
    }

    public class WinnerZPlugin : GenericPlugin
    {
        private static readonly ILogger logger = LogManager.GetLogger();
        private static readonly HttpClient http = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
        private readonly Dictionary<Guid, DateTime> started = new Dictionary<Guid, DateTime>();
        private readonly object pendingLock = new object();
        private WinnerZSettingsViewModel settings;

        public override Guid Id { get; } = Guid.Parse("a62502bd-8cdc-42bd-8d90-f88ef137393a");

        public WinnerZPlugin(IPlayniteAPI api) : base(api)
        {
            ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
            settings = new WinnerZSettingsViewModel(this);
            Properties = new GenericPluginProperties { HasSettings = true };
        }

        private string PendingFile => Path.Combine(GetPluginUserDataPath(), "pendentes.json");

        public override ISettings GetSettings(bool firstRunSettings) => settings;

        public override UserControl GetSettingsView(bool firstRunView)
        {
            var panel = new StackPanel { Margin = new Thickness(20) };
            panel.Children.Add(new TextBlock
            {
                Text = "Cole aqui a chave gerada no site do WinnerZ, em Preferências → Pontes → Playnite. " +
                       "Com ela, cada jogo aberto pelo Playnite vira sessão na sua Jornada.",
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 0, 0, 10)
            });
            panel.Children.Add(new TextBlock { Text = "Chave pessoal", FontWeight = FontWeights.Bold, Margin = new Thickness(0, 0, 0, 4) });
            var token = new TextBox { Margin = new Thickness(0, 0, 0, 14) };
            token.SetBinding(TextBox.TextProperty, new Binding("Settings.Token") { Mode = BindingMode.TwoWay, UpdateSourceTrigger = UpdateSourceTrigger.PropertyChanged });
            panel.Children.Add(token);
            panel.Children.Add(new TextBlock { Text = "Endereço do WinnerZ (não precisa mudar)", Margin = new Thickness(0, 0, 0, 4) });
            var endpoint = new TextBox();
            endpoint.SetBinding(TextBox.TextProperty, new Binding("Settings.Endpoint") { Mode = BindingMode.TwoWay, UpdateSourceTrigger = UpdateSourceTrigger.PropertyChanged });
            panel.Children.Add(endpoint);
            return new UserControl { Content = panel, DataContext = settings };
        }

        public override void OnGameStarted(OnGameStartedEventArgs args)
        {
            var game = args.Game;
            started[game.Id] = DateTime.UtcNow;
            Send(new Dictionary<string, object> { ["event"] = "start", ["game"] = Describe(game) });
        }

        public override void OnGameStopped(OnGameStoppedEventArgs args)
        {
            var game = args.Game;
            var end = DateTime.UtcNow;
            var start = started.TryGetValue(game.Id, out var s) ? s : end.AddSeconds(-(double)args.ElapsedSeconds);
            started.Remove(game.Id);
            Send(new Dictionary<string, object>
            {
                ["event"] = "stop",
                ["game"] = Describe(game),
                ["startedAt"] = start.ToString("o"),
                ["endedAt"] = end.ToString("o")
            });
        }

        private static Dictionary<string, object> Describe(Game game) => new Dictionary<string, object>
        {
            ["id"] = game.Id.ToString(),
            ["name"] = game.Name ?? string.Empty,
            ["platform"] = game.Platforms?.FirstOrDefault()?.Name ?? string.Empty,
            ["source"] = game.Source?.Name ?? string.Empty,
            ["gameId"] = game.GameId ?? string.Empty
        };

        private void Send(Dictionary<string, object> ev)
        {
            var conf = settings.Settings;
            if (string.IsNullOrEmpty(conf.Token)) return;
            var body = Serialization.ToJson(new Dictionary<string, object> { ["playnite"] = ev });
            Task.Run(async () =>
            {
                // Primeiro o que ficou para trás (sem internet), depois o aviso de agora.
                foreach (var old in TakePending()) { if (!await Post(conf, old)) { Keep(old); } }
                if (!await Post(conf, body) && (string)ev["event"] == "stop") Keep(body);
            });
        }

        private static async Task<bool> Post(WinnerZSettings conf, string body)
        {
            try
            {
                using (var req = new HttpRequestMessage(HttpMethod.Post, conf.Endpoint))
                {
                    req.Headers.Add("X-WinnerZ-Token", conf.Token);
                    req.Content = new StringContent(body, Encoding.UTF8, "application/json");
                    using (var res = await http.SendAsync(req).ConfigureAwait(false))
                    {
                        if ((int)res.StatusCode == 401) { logger.Warn("WinnerZ: chave recusada. Gere outra no site."); return true; } // não adianta guardar
                        return res.IsSuccessStatusCode;
                    }
                }
            }
            catch (Exception e)
            {
                logger.Warn(e, "WinnerZ: não deu para avisar agora; fica guardado.");
                return false;
            }
        }

        private List<string> TakePending()
        {
            lock (pendingLock)
            {
                try
                {
                    if (!File.Exists(PendingFile)) return new List<string>();
                    var list = Serialization.FromJson<List<string>>(File.ReadAllText(PendingFile)) ?? new List<string>();
                    File.Delete(PendingFile);
                    return list;
                }
                catch { return new List<string>(); }
            }
        }

        private void Keep(string body)
        {
            lock (pendingLock)
            {
                try
                {
                    var list = File.Exists(PendingFile) ? Serialization.FromJson<List<string>>(File.ReadAllText(PendingFile)) ?? new List<string>() : new List<string>();
                    list.Add(body);
                    File.WriteAllText(PendingFile, Serialization.ToJson(list.Skip(Math.Max(0, list.Count - 200)).ToList()));
                }
                catch (Exception e) { logger.Error(e, "WinnerZ: não deu para guardar o aviso."); }
            }
        }
    }
}
