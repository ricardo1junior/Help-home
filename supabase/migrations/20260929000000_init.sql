-- Help Home: esquema inicial do MVP
-- Clientes publicam pedidos de serviço, prestadores enviam orçamentos,
-- o cliente aceita um orçamento, os dois conversam e o cliente avalia no final.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('client', 'provider');

create type public.request_status as enum (
  'open',        -- aguardando orçamentos
  'assigned',    -- orçamento aceito, aguardando início
  'in_progress', -- prestador iniciou o serviço
  'completed',   -- serviço concluído
  'cancelled'    -- cancelado pelo cliente
);

create type public.quote_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'client',
  full_name text not null default '',
  phone text,
  city text,
  avatar_url text,
  -- campos usados só por prestadores
  bio text,
  created_at timestamptz not null default now()
);

create table public.categories (
  id smallserial primary key,
  slug text not null unique,
  name text not null,
  icon text not null default '🛠️'
);

create table public.provider_categories (
  provider_id uuid not null references public.profiles (id) on delete cascade,
  category_id smallint not null references public.categories (id) on delete cascade,
  primary key (provider_id, category_id)
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  category_id smallint not null references public.categories (id),
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 10 and 4000),
  address text not null,
  city text not null,
  preferred_date date,
  photos text[] not null default '{}',
  status public.request_status not null default 'open',
  provider_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_requests_open_idx
  on public.service_requests (category_id, city)
  where status = 'open';
create index service_requests_client_idx on public.service_requests (client_id);
create index service_requests_provider_idx on public.service_requests (provider_id);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  provider_id uuid not null references public.profiles (id) on delete cascade,
  price_cents integer not null check (price_cents > 0),
  message text not null default '',
  status public.quote_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (request_id, provider_id)
);

create index quotes_provider_idx on public.quotes (provider_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_request_idx on public.messages (request_id, created_at);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.service_requests (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

create index reviews_provider_idx on public.reviews (provider_id);

-- Média de avaliações por prestador
create view public.provider_ratings
with (security_invoker = true) as
select provider_id,
       round(avg(rating)::numeric, 1) as average,
       count(*)::int as total
from public.reviews
group by provider_id;

-- ---------------------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------------------

-- Cria o perfil automaticamente quando alguém se cadastra.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name, phone, city)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'client'),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'city'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger service_requests_touch
  before update on public.service_requests
  for each row execute function public.touch_updated_at();

create function public.is_provider()
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'provider'
  );
$$;

-- Prestador que atende a categoria do pedido.
create function public.serves_category(p_category_id smallint)
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.provider_categories
    where provider_id = auth.uid() and category_id = p_category_id
  );
$$;

-- Cliente dono do pedido, prestador escolhido ou prestador com orçamento ainda válido.
create function public.is_request_participant(p_request_id uuid)
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.service_requests r
    where r.id = p_request_id
      and (r.client_id = auth.uid() or r.provider_id = auth.uid())
  ) or exists (
    select 1 from public.quotes q
    where q.request_id = p_request_id and q.provider_id = auth.uid()
      and q.status in ('pending', 'accepted')
  );
$$;

-- Cliente dono do pedido ou prestador escolhido (quem pode usar o chat).
create function public.is_request_party(p_request_id uuid)
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.service_requests r
    where r.id = p_request_id
      and (r.client_id = auth.uid() or r.provider_id = auth.uid())
  );
$$;

-- O cliente aceita um orçamento: o pedido passa para "assigned"
-- e os demais orçamentos são recusados.
create function public.accept_quote(p_quote_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_quote public.quotes;
begin
  select * into v_quote from public.quotes where id = p_quote_id for update;
  if not found then
    raise exception 'Orçamento não encontrado';
  end if;

  perform 1 from public.service_requests
  where id = v_quote.request_id and client_id = auth.uid() and status = 'open'
  for update;
  if not found then
    raise exception 'Pedido não está aberto ou não pertence a você';
  end if;

  if v_quote.status <> 'pending' then
    raise exception 'Este orçamento não está mais disponível';
  end if;

  update public.quotes set status = 'accepted' where id = v_quote.id;
  update public.quotes set status = 'rejected'
    where request_id = v_quote.request_id and id <> v_quote.id and status = 'pending';
  update public.service_requests
    set status = 'assigned', provider_id = v_quote.provider_id
    where id = v_quote.request_id;
end;
$$;

-- Mudança de status do pedido, validando quem pode fazer cada transição.
create function public.set_request_status(p_request_id uuid, p_status public.request_status)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_req public.service_requests;
begin
  select * into v_req from public.service_requests where id = p_request_id for update;
  if not found then
    raise exception 'Pedido não encontrado';
  end if;

  if p_status = 'cancelled' then
    if v_req.client_id <> auth.uid() or v_req.status not in ('open', 'assigned') then
      raise exception 'Não é possível cancelar este pedido';
    end if;
    update public.quotes set status = 'rejected'
      where request_id = p_request_id and status in ('pending', 'accepted');
  elsif p_status = 'in_progress' then
    if v_req.provider_id is distinct from auth.uid() or v_req.status <> 'assigned' then
      raise exception 'Não é possível iniciar este serviço';
    end if;
  elsif p_status = 'completed' then
    if auth.uid() not in (v_req.provider_id, v_req.client_id)
       or v_req.status not in ('assigned', 'in_progress') then
      raise exception 'Não é possível concluir este serviço';
    end if;
  else
    raise exception 'Transição de status inválida';
  end if;

  update public.service_requests set status = p_status where id = p_request_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Segurança (RLS)
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.provider_categories enable row level security;
alter table public.service_requests enable row level security;
alter table public.quotes enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;

-- Perfis: visíveis para usuários logados; cada um edita o seu (sem trocar o papel).
create policy "perfis visíveis" on public.profiles
  for select to authenticated using (true);
create policy "editar o próprio perfil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- O papel (cliente/prestador) é escolhido no cadastro e não pode ser alterado pelo usuário.
revoke update on public.profiles from authenticated;
grant update (full_name, phone, city, avatar_url, bio) on public.profiles to authenticated;

-- Categorias: públicas.
create policy "categorias públicas" on public.categories
  for select using (true);

-- Categorias do prestador.
create policy "categorias de prestadores visíveis" on public.provider_categories
  for select to authenticated using (true);
create policy "prestador escolhe categorias" on public.provider_categories
  for insert to authenticated with check (provider_id = auth.uid() and public.is_provider());
create policy "prestador remove categorias" on public.provider_categories
  for delete to authenticated using (provider_id = auth.uid());

-- Pedidos.
create policy "ver pedidos" on public.service_requests
  for select to authenticated using (
    client_id = auth.uid()
    or provider_id = auth.uid()
    or (status = 'open' and public.serves_category(category_id))
    or public.is_request_participant(id)
  );
create policy "cliente cria pedido" on public.service_requests
  for insert to authenticated with check (
    client_id = auth.uid() and status = 'open' and provider_id is null
  );
-- Edição direta só enquanto aberto; mudanças de status passam pelas funções acima.
create policy "cliente edita pedido aberto" on public.service_requests
  for update to authenticated
  using (client_id = auth.uid() and status = 'open')
  with check (client_id = auth.uid() and status = 'open' and provider_id is null);

-- Orçamentos.
create policy "ver orçamentos" on public.quotes
  for select to authenticated using (
    provider_id = auth.uid()
    or exists (
      select 1 from public.service_requests r
      where r.id = request_id and r.client_id = auth.uid()
    )
  );
create policy "prestador envia orçamento" on public.quotes
  for insert to authenticated with check (
    provider_id = auth.uid()
    and status = 'pending'
    and public.is_provider()
    and exists (
      select 1 from public.service_requests r
      where r.id = request_id and r.status = 'open'
        and r.client_id <> auth.uid()
        and public.serves_category(r.category_id)
    )
  );
create policy "prestador retira orçamento" on public.quotes
  for update to authenticated
  using (provider_id = auth.uid() and status = 'pending')
  with check (provider_id = auth.uid() and status = 'withdrawn');

-- Mensagens: só entre o cliente e o prestador escolhido.
create policy "ver mensagens" on public.messages
  for select to authenticated using (public.is_request_party(request_id));
create policy "enviar mensagem" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid() and public.is_request_party(request_id)
  );

-- Avaliações: públicas; só o cliente avalia um pedido concluído.
create policy "avaliações públicas" on public.reviews
  for select using (true);
create policy "cliente avalia serviço concluído" on public.reviews
  for insert to authenticated with check (
    client_id = auth.uid()
    and exists (
      select 1 from public.service_requests r
      where r.id = request_id
        and r.client_id = auth.uid()
        and r.provider_id = reviews.provider_id
        and r.status = 'completed'
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime para o chat e fotos dos pedidos
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('request-photos', 'request-photos', true)
    on conflict (id) do nothing;

    create policy "fotos: upload na própria pasta" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'request-photos' and (storage.foldername(name))[1] = auth.uid()::text);
    create policy "fotos: leitura pública" on storage.objects
      for select using (bucket_id = 'request-photos');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Categorias iniciais
-- ---------------------------------------------------------------------------

insert into public.categories (slug, name, icon) values
  ('encanador', 'Encanador', '🚰'),
  ('eletricista', 'Eletricista', '💡'),
  ('marceneiro', 'Marceneiro', '🪚'),
  ('pintor', 'Pintor', '🎨'),
  ('pedreiro', 'Pedreiro', '🧱'),
  ('chaveiro', 'Chaveiro', '🔑'),
  ('montador', 'Montador de móveis', '🛋️'),
  ('jardineiro', 'Jardineiro', '🌿'),
  ('limpeza', 'Limpeza', '🧽'),
  ('ar-condicionado', 'Ar-condicionado', '❄️'),
  ('dedetizacao', 'Dedetização', '🐜'),
  ('outros', 'Outros reparos', '🛠️');
