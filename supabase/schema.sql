-- Produtividade Ponderada — estrutura do banco (Supabase / Postgres)
-- Rode este arquivo inteiro uma vez em: Supabase → SQL Editor → New query → Run.

create extension if not exists pgcrypto;

-- ---------- Tabelas ----------
create table if not exists public.prioridades (
  nome  text primary key,
  sla   int  not null check (sla >= 0),
  pts   int  not null check (pts >= 0),
  ordem int  not null default 0
);
insert into public.prioridades (nome, sla, pts, ordem) values
  ('Alta', 1, 3, 1), ('Média', 2, 2, 2), ('Baixa', 5, 1, 3)
on conflict (nome) do nothing;

create table if not exists public.gestores (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  nome       text not null default '',
  email      text,
  papel      text not null default 'pendente' check (papel in ('admin','gestor','lideranca','pendente')),
  gestor_id  uuid references public.gestores(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.clientes (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  gestor_id  uuid references public.gestores(id) on delete set null,
  status     text not null default 'Ativo' check (status in ('Ativo','Em risco','Pausado','Churn')),
  obs        text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.oneonones (
  id         uuid primary key default gen_random_uuid(),
  gestor_id  uuid not null references public.gestores(id) on delete cascade,
  data       date not null,
  resumo     text not null default '',
  atencao    text not null default '',
  combinados text not null default '',
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demandas (
  id           uuid primary key default gen_random_uuid(),
  gestor_id    uuid references public.gestores(id) on delete set null,
  cliente_id   uuid references public.clientes(id) on delete set null,
  cliente_nome text not null default '',
  oneonone_id  uuid references public.oneonones(id) on delete set null,
  data         date not null,
  problema     text not null default '',
  acao         text not null default '',
  prioridade   text references public.prioridades(nome) on update cascade on delete set null,
  conclusao    date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists demandas_gestor_idx on public.demandas (gestor_id);
create index if not exists demandas_data_idx   on public.demandas (data);
create index if not exists clientes_gestor_idx on public.clientes (gestor_id);
create index if not exists oneonones_gestor_idx on public.oneonones (gestor_id, data desc);

-- ---------- Funções de apoio ----------
create or replace function public.my_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from public.profiles where id = auth.uid()
$$;

create or replace function public.my_gestor() returns uuid
language sql stable security definer set search_path = public as $$
  select gestor_id from public.profiles where id = auth.uid()
$$;

-- Novo usuário: o primeiro a se cadastrar vira administrador; os demais ficam pendentes
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nome, papel)
  values (
    new.id, new.email, coalesce(new.raw_user_meta_data->>'nome', ''),
    case when not exists (select 1 from public.profiles) then 'admin' else 'pendente' end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Proteção extra: quem não é coordenador (admin) não altera dados da demanda
create or replace function public.guard_demanda_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.my_papel(), '') <> 'admin' then
    if (new.gestor_id, new.cliente_id, new.cliente_nome, new.oneonone_id, new.data, new.problema, new.acao, new.prioridade)
       is distinct from
       (old.gestor_id, old.cliente_id, old.cliente_nome, old.oneonone_id, old.data, old.problema, old.acao, old.prioridade) then
      raise exception 'Somente coordenadores alteram as demandas.';
    end if;
  end if;
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists demandas_guard on public.demandas;
create trigger demandas_guard before update on public.demandas
  for each row execute function public.guard_demanda_update();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists oneonones_touch on public.oneonones;
create trigger oneonones_touch before update on public.oneonones
  for each row execute function public.touch_updated_at();

-- ---------- Segurança (RLS) ----------
alter table public.prioridades enable row level security;
alter table public.gestores    enable row level security;
alter table public.profiles    enable row level security;
alter table public.clientes    enable row level security;
alter table public.oneonones   enable row level security;
alter table public.demandas    enable row level security;

-- prioridades: todos os usuários liberados leem; só admin altera
drop policy if exists prio_read on public.prioridades;
create policy prio_read on public.prioridades for select to authenticated
  using (public.my_papel() in ('admin','gestor','lideranca'));
drop policy if exists prio_admin on public.prioridades;
create policy prio_admin on public.prioridades for all to authenticated
  using (public.my_papel() = 'admin') with check (public.my_papel() = 'admin');

-- gestores: admin e liderança veem todos; gestor vê a si mesmo
drop policy if exists gest_read on public.gestores;
create policy gest_read on public.gestores for select to authenticated
  using (public.my_papel() in ('admin','lideranca') or id = public.my_gestor());
drop policy if exists gest_admin on public.gestores;
create policy gest_admin on public.gestores for all to authenticated
  using (public.my_papel() = 'admin') with check (public.my_papel() = 'admin');

-- profiles: cada um lê o próprio; admin lê e altera todos
drop policy if exists prof_read on public.profiles;
create policy prof_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.my_papel() = 'admin');
drop policy if exists prof_admin on public.profiles;
create policy prof_admin on public.profiles for update to authenticated
  using (public.my_papel() = 'admin') with check (public.my_papel() = 'admin');

-- clientes e 1:1: admin e liderança veem tudo; gestor vê o que é dele; só admin altera
drop policy if exists cli_read on public.clientes;
create policy cli_read on public.clientes for select to authenticated
  using (public.my_papel() in ('admin','lideranca') or gestor_id = public.my_gestor());
drop policy if exists cli_admin on public.clientes;
create policy cli_admin on public.clientes for all to authenticated
  using (public.my_papel() = 'admin') with check (public.my_papel() = 'admin');

drop policy if exists oo_read on public.oneonones;
create policy oo_read on public.oneonones for select to authenticated
  using (public.my_papel() in ('admin','lideranca') or gestor_id = public.my_gestor());
drop policy if exists oo_admin on public.oneonones;
create policy oo_admin on public.oneonones for all to authenticated
  using (public.my_papel() = 'admin') with check (public.my_papel() = 'admin');

-- demandas: leitura igual; só coordenadores (admin) alteram
drop policy if exists dem_read on public.demandas;
create policy dem_read on public.demandas for select to authenticated
  using (public.my_papel() in ('admin','lideranca') or gestor_id = public.my_gestor());
drop policy if exists dem_admin on public.demandas;
create policy dem_admin on public.demandas for all to authenticated
  using (public.my_papel() = 'admin') with check (public.my_papel() = 'admin');
drop policy if exists dem_gestor_update on public.demandas;

-- ---------- Gestores iniciais (os 14 da planilha; edite ou apague à vontade) ----------
insert into public.gestores (nome)
select n from unnest(array['Adolfo','Brendo','Carlos','Enzo','Gabriel','Icaro','Jonh','Juan','Júcio','Matheus','Paulo','Pedro','Rosa','Wesley']) as n
where not exists (select 1 from public.gestores);
