-- 0061 · A sessão na estrutura do jogo (S1)
--
-- Cada sessão guarda onde começou e onde terminou na lista do jogo (capítulo, missão, área, etapa…), com o nome
-- daquele momento (a lista pode mudar depois) e como a pessoa chegou nele: pela lista, pelo texto ou pela foto.
-- Formato: {"from": {"id", "name", "src"}, "to": {...}, "done": [{...}]} ("done" fica para os jogos abertos, S2).
-- A sessão continua sendo gravada pela própria pessoa (as regras de acesso de sessions não mudam).
-- Pode rodar mais de uma vez. Precisa da 0043.

alter table public.sessions add column if not exists part_marks jsonb;
do $$ begin
  alter table public.sessions add constraint sessions_part_marks_check
    check (part_marks is null or (jsonb_typeof(part_marks) = 'object' and pg_column_size(part_marks) <= 8000));
exception when duplicate_object then null; end $$;
