"""Trilha gravada dos Jogos de Verão: prepara as músicas do dono para o jogo.
Entrada: cart2/musica_src/<nome>.mp3 (os arquivos originais, 320 kbps).
Saída: jogos_verao/musica/<nome>.mp3 (128 kbps, sem o silêncio do fim, volume igualado entre as faixas (-18 LUFS; no jogo ficam bem abaixo dos efeitos)).
O silêncio do fim sai para a música recomeçar sem buraco quando chega ao final."""
import pathlib, re, subprocess
HERE = pathlib.Path(__file__).resolve().parent
SRC, OUT = HERE / 'musica_src', HERE.parent / 'jogos_verao' / 'musica'
OUT.mkdir(parents=True, exist_ok=True)
for f in sorted(SRC.glob('*.mp3')):
    log = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(f), '-af', 'silencedetect=n=-45dB:d=0.3', '-f', 'null', '-'], capture_output=True, text=True).stderr
    dur = float(re.search(r'Duration: (\d+):(\d+):([\d.]+)', log).group(3)) + 60 * int(re.search(r'Duration: (\d+):(\d+)', log).group(2))
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)]
    end = starts[-1] + .5 if starts and starts[-1] > dur - 6 else dur
    af = f'atrim=0:{end:.3f},afade=t=out:st={end - .45:.3f}:d=0.45,loudnorm=I=-18:TP=-2:LRA=11'
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', str(f), '-af', af, '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '128k', str(OUT / f.name)], check=True)
    print(f'{f.name}: {dur:.1f}s -> {end:.1f}s, {(OUT / f.name).stat().st_size // 1024} KB')
