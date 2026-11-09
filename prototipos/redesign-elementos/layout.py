import json
live = json.loads(open('/dev/stdin').read())
made = json.load(open('made.json'))
d = live
d['pages'] = [{"id":"fresta","name":"Fresta 2"},{"id":"mono","name":"Monolito"},{"id":"letreiro","name":"Letreiro"},{"id":"anamorfico","name":"Anamórfico (cinema)"},{"id":"impacto","name":"Impacto (cinema)"}]
B = d['boards']; N = d['notes']
for k in ['Main.dc.html','Botoes.dc.html','Cards.dc.html','Filtros.dc.html','Campos.dc.html','Aplicado.dc.html']: B[k]['page']='fresta'
for k in ['titulo','forte','fraco1','fraco2']: N[k]['page']='fresta'
B['Mono.dc.html'].update(x=0,y=0,page='mono'); B['MonoAplicado.dc.html'].update(x=1360,y=0,page='mono')
B['Letreiro.dc.html'].update(x=0,y=0,page='letreiro'); B['LetreiroAplicado.dc.html'].update(x=1360,y=0,page='letreiro')
N['t_mono'].update(y=-300,page='mono'); N['n_mono'].update(y=0,page='mono')
N['t_let'].update(y=-300,page='letreiro'); N['n_let'].update(y=0,page='letreiro')
pid = {'F':'fresta','M':'mono','L':'letreiro','N':'anamorfico','I':'impacto'}
keys = ['Elementos','Inicio','Colecao','Jornada','Comunidade','Awards','Perfil','Preferencias','Jogo']
top = {'F':4400,'M':2040,'L':2040,'N':0,'I':0}
order = list(d['order'])
for t in 'FMLNI':
    y0 = top[t]
    if t in 'NI':
        for m,x in (('dark',0),('light',1360)):
            fn = [f for f,v in made.items() if v['theme']==t and v['mode']==m and v['key']=='Elementos'][0]
            B[fn] = {"x":x,"y":0,"w":1280,"h":made[fn]['h'],"title":made[fn]['title'],"page":pid[t]}; order.append(fn)
        N['t_'+t] = {"x":0,"y":-300,"kind":"title1","maxW":2640,"text":("Direção 4 · Anamórfico: luz de cinema" if t=='N' else "Direção 5 · Impacto: a vinheta como interface"),"page":pid[t]}
        y0 = 1980+600
    for m in ('dark','light'):
        fs = [(keys.index(v['key']),f) for f,v in made.items() if v['theme']==t and v['mode']==m and v['key']!='Elementos']
        fs.sort()
        hmax = max(made[f]['h'] for _,f in fs)
        N[f'r_{t}_{m}'] = {"x":0,"y":y0-280,"kind":"title1","maxW":1360*len(fs)-80,"text":("Modo escuro · páginas do site" if m=='dark' else "Modo claro · páginas do site"),"page":pid[t]}
        for i,(_,f) in enumerate(fs):
            B[f] = {"x":i*1360,"y":y0,"w":1280,"h":made[f]['h'],"title":made[f]['title'],"page":pid[t]}; order.append(f)
        y0 += hmax + 120 + 300
N['n_N'] = {"x":-500,"y":0,"w":420,"size":"m","fill":"teal","page":"anamorfico","text":"Anamórfico\n\nCinema de autor: o site parece um filme bem fotografado.\n\n• Luz de cena que se move devagar no fundo\n• Reflexo de lente anamórfica: uma linha de luz horizontal que nasce no botão principal e cresce com o mouse\n• Granulado de filme e cantos escurecidos na tela toda\n• Faixas pretas de cinema no topo das páginas e a foto do jogo em zoom lento\n• Foco que muda: ao passar o mouse numa capa, as outras saem de foco\n• Cards de vidro escuro, iluminados de cima"}
N['n_I'] = {"x":-500,"y":0,"w":420,"size":"m","fill":"red","page":"impacto","text":"Impacto\n\nA vinheta do WinnerZ (W e Z se cravando, pulso e luz diagonal) vira o jeito de tudo se mexer.\n\n• Peças inclinadas a 22°\n• No principal: luz diagonal que corta, pulso que sai da borda e faíscas\n• No secundário: a cor invade na diagonal\n• Cards com fita de LEDs na lateral que corre com o mouse\n• Títulos do topo entram se cravando, com um leve desvio de cor\n• Partículas sobem e feixes de luz passam no fundo\n• O logo do menu dá um pulso de tempos em tempos"}
N['n_light'] = {"x":-500,"y":top['F'],"w":420,"size":"m","fill":"gray","page":"fresta","text":"Como ler as páginas\n\nCada direção tem duas fileiras: o modo escuro em cima e o modo claro embaixo.\n\nAs áreas com foto do jogo continuam escuras no modo claro, como no site de hoje.\n\nTodos os textos, números e capas são de exemplo."}
d['order'] = order
d['noteOrder'] = list(N.keys())
print(json.dumps(d, ensure_ascii=False))
