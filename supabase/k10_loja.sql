-- K10 Delivery · Pausar loja (27/11/2026)
-- Rodar uma vez no Supabase (SQL Editor). Pode rodar de novo sem problema.
--
-- k10_loja: uma linha só (id = 1) dizendo se a loja está pausada.
--   Qualquer um pode LER (o site dos clientes precisa saber).
--   Só o ADM logado no Portal da Equipe pode MUDAR.
-- Gatilho k10_trava_loja_pausada: com a loja pausada, o banco recusa pedido novo
--   que não venha do ADM. Assim nenhum pedido entra, mesmo com o site aberto antigo.

create table if not exists public.k10_loja (
  id smallint primary key default 1 check (id = 1),
  pausada boolean not null default false,
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);
insert into public.k10_loja (id) values (1) on conflict (id) do nothing;

alter table public.k10_loja enable row level security;
revoke all on public.k10_loja from anon, authenticated;
grant select on public.k10_loja to anon, authenticated;
grant update (pausada, atualizado_em, atualizado_por) on public.k10_loja to authenticated;

drop policy if exists k10_loja_ler on public.k10_loja;
create policy k10_loja_ler on public.k10_loja
  for select to anon, authenticated using (true);

drop policy if exists k10_loja_adm on public.k10_loja;
create policy k10_loja_adm on public.k10_loja
  for update to authenticated
  using (public.k10_papel() = 'admin')
  with check (public.k10_papel() = 'admin');

create or replace function public.k10_trava_loja_pausada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  papel text;
begin
  if exists (select 1 from public.k10_loja where id = 1 and pausada) then
    begin
      papel := public.k10_papel();
    exception when others then
      papel := null;
    end;
    if coalesce(papel, '') <> 'admin' then
      raise exception 'A K10 está fechada agora. Voltamos já!' using errcode = 'P0001';
    end if;
  end if;
  return new;
end
$$;
revoke all on function public.k10_trava_loja_pausada() from public, anon, authenticated;

drop trigger if exists k10_trava_loja_pausada on public.k10_pedidos;
create trigger k10_trava_loja_pausada
  before insert on public.k10_pedidos
  for each row execute function public.k10_trava_loja_pausada();
