create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  allowed_tabs text[] not null default '{}',
  avatar_url text,
  foto_perfil text,
  tema_cor text default 'azul',
  modo_exibicao text default 'claro',
  telefone text,
  cargo text,
  senha_fj text,
  last_updated timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.has_admin_profile()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where role = 'admin'
  );
$$;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles
for select
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin
on public.profiles
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin
on public.profiles
for delete
using (public.is_admin());

do $$
declare
  table_name text;
  entity_tables text[] := array[
    'acao_corretiva_12_semanas',
    'administrativo_inss',
    'agenda',
    'agenda_comercial',
    'agendamento_adm_inss',
    'agendamento_inss',
    'agendamento_inss_admin',
    'aguardando_documento',
    'alerta',
    'andamento_administrativo',
    'atendimento',
    'auditoria',
    'blocos_de_notas_usuario',
    'central_admin_inss',
    'ciclo_12_semanas',
    'cliente',
    'clube_do_livro',
    'conclusao_adm_inss',
    'conclusao_inss',
    'configuracao_agenda',
    'configuracao_ia',
    'controle_processo_execucao',
    'copias_pa',
    'credencial_inss',
    'deferido_adm_inss',
    'deferido_inss',
    'documento_gerado',
    'documento_vinculado',
    'exigencia_adm_inss',
    'exigencia_inss',
    'feedback_12_semanas',
    'folha_de_ponto',
    'historico_agenda',
    'historico_atendimento',
    'indeferido_adm_inss',
    'indeferido_inss',
    'indicador_12_semanas',
    'instagram_canal',
    'lancamento_financeiro',
    'landing_page',
    'lead_comercial',
    'lead_marketing',
    'livro_venda',
    'manual_escritorio',
    'mentoria_modulo',
    'meta_ciclo_12_semanas',
    'meta_produtividade',
    'metodo_result',
    'modelo_documento',
    'monitoramento_processual',
    'notificacao',
    'pessoa',
    'post_marketing',
    'processo',
    'processo_administrativo_inss',
    'protocolo_adm_inss',
    'protocolo_inss',
    'retorno_cliente',
    'revisao_estrategica_12_semanas',
    'setor',
    'snapshot_produtividade',
    'social_selling',
    'tarefa',
    'tarefa_inss',
    'template_minuta'
  ];
begin
  foreach table_name in array entity_tables loop
    execute format($create_table$
      create table if not exists public.%I (
        id uuid primary key default gen_random_uuid(),
        user_id uuid references auth.users(id) on delete set null default auth.uid(),
        data jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    $create_table$, table_name);

    execute format('alter table public.%I enable row level security', table_name);

    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name
    );

    execute format('create index if not exists %I on public.%I (user_id)', table_name || '_user_id_idx', table_name);
    execute format('create index if not exists %I on public.%I using gin (data)', table_name || '_data_idx', table_name);

    execute format('drop policy if exists %I on public.%I', table_name || '_select', table_name);
    execute format(
      'create policy %I on public.%I for select using (public.is_admin() or user_id = auth.uid())',
      table_name || '_select',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_insert', table_name);
    execute format(
      'create policy %I on public.%I for insert with check (public.is_admin() or user_id = auth.uid())',
      table_name || '_insert',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_update', table_name);
    execute format(
      'create policy %I on public.%I for update using (public.is_admin() or user_id = auth.uid()) with check (public.is_admin() or user_id = auth.uid())',
      table_name || '_update',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_delete', table_name);
    execute format(
      'create policy %I on public.%I for delete using (public.is_admin() or user_id = auth.uid())',
      table_name || '_delete',
      table_name
    );
  end loop;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_admin_profile() to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do update set public = true;

drop policy if exists uploads_public_read on storage.objects;
create policy uploads_public_read
on storage.objects
for select
using (bucket_id = 'uploads');

drop policy if exists uploads_insert_own_folder on storage.objects;
create policy uploads_insert_own_folder
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists uploads_update_own_or_admin on storage.objects;
create policy uploads_update_own_or_admin
on storage.objects
for update
to authenticated
using (
  bucket_id = 'uploads'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
)
with check (
  bucket_id = 'uploads'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists uploads_delete_own_or_admin on storage.objects;
create policy uploads_delete_own_or_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'uploads'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
