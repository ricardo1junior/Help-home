-- Help Home: experiência em tempo real (estilo Uber/iFood).
--
-- * Notificações no app (central com não lidas) e no celular (push pela Expo),
--   geradas pelo próprio banco a cada evento importante do pedido.
-- * Prestador "a caminho": posição ao vivo visível só para o cliente do pedido.
-- * Prestador disponível ou não para receber pedidos novos perto dele.
-- * Tabelas do pedido publicadas no Realtime para as telas se atualizarem sozinhas.

create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Notificações
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  request_id uuid references public.service_requests (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Aparelhos que recebem push (token da Expo).
create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text,
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

create policy "ver as próprias notificações" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "marcar as próprias notificações como lidas" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "ver os próprios aparelhos" on public.push_tokens
  for select to authenticated using (user_id = auth.uid());
create policy "registrar o próprio aparelho" on public.push_tokens
  for insert to authenticated with check (user_id = auth.uid());
create policy "atualizar o próprio aparelho" on public.push_tokens
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "remover o próprio aparelho" on public.push_tokens
  for delete to authenticated using (user_id = auth.uid());

-- Registra o aparelho (o mesmo token pode trocar de conta no mesmo celular).
create function public.register_push_token(p_token text, p_platform text)
returns void
language sql
security definer set search_path = ''
as $$
  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (p_token, auth.uid(), p_platform, now())
  on conflict (token) do update set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
$$;

-- Cria a notificação e manda o push para os aparelhos da pessoa.
create function public.notify(p_user uuid, p_request uuid, p_kind text, p_title text, p_body text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_tokens text[];
begin
  if p_user is null then
    return;
  end if;
  insert into public.notifications (user_id, request_id, kind, title, body)
  values (p_user, p_request, p_kind, p_title, coalesce(p_body, ''));

  select array_agg(token) into v_tokens from public.push_tokens where user_id = p_user;
  if v_tokens is null then
    return;
  end if;
  -- Push pela Expo. Se falhar, a notificação continua no app.
  begin
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
      body := (
        select jsonb_agg(jsonb_build_object(
          'to', t,
          'title', p_title,
          'body', coalesce(p_body, ''),
          'sound', 'default',
          'data', jsonb_build_object('request_id', p_request, 'kind', p_kind)
        ))
        from unnest(v_tokens) as t
      )
    );
  exception when others then
    raise warning 'push não enviado: %', sqlerrm;
  end;
end;
$$;
revoke execute on function public.notify(uuid, uuid, text, text, text) from public, anon, authenticated;

create function public.display_name(p_id uuid)
returns text
language sql stable
security definer set search_path = ''
as $$
  select coalesce(nullif(company_name, ''), full_name) from public.profiles where id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- Prestador disponível e "a caminho"
-- ---------------------------------------------------------------------------

alter table public.profiles add column available boolean not null default true;
grant update (available) on public.profiles to authenticated;

alter table public.service_requests
  add column en_route_at timestamptz,
  add column arrived_at timestamptz;

-- Última posição do prestador indo para o serviço.
create table public.provider_tracking (
  request_id uuid primary key references public.service_requests (id) on delete cascade,
  provider_id uuid not null references public.profiles (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  heading double precision,
  updated_at timestamptz not null default now()
);
alter table public.provider_tracking enable row level security;

create policy "partes veem a posição do prestador" on public.provider_tracking
  for select to authenticated using (public.is_request_party(request_id));

-- O prestador escolhido avisa que saiu.
create function public.start_en_route(p_request_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_req public.service_requests;
begin
  select * into v_req from public.service_requests where id = p_request_id for update;
  if not found or v_req.provider_id is distinct from auth.uid() or v_req.status <> 'assigned' then
    raise exception 'Não é possível sair para este serviço';
  end if;
  update public.service_requests set en_route_at = now(), arrived_at = null where id = p_request_id;
  perform public.notify(v_req.client_id, p_request_id, 'en_route',
    public.display_name(v_req.provider_id) || ' está a caminho',
    'Acompanhe pelo mapa em tempo real.');
end;
$$;

-- O prestador avisa que chegou.
create function public.mark_arrived(p_request_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_req public.service_requests;
begin
  select * into v_req from public.service_requests where id = p_request_id for update;
  if not found or v_req.provider_id is distinct from auth.uid() or v_req.status <> 'assigned' or v_req.en_route_at is null then
    raise exception 'Não é possível marcar a chegada';
  end if;
  update public.service_requests set arrived_at = now() where id = p_request_id;
  delete from public.provider_tracking where request_id = p_request_id;
  perform public.notify(v_req.client_id, p_request_id, 'arrived',
    public.display_name(v_req.provider_id) || ' chegou',
    'O profissional está no local do serviço.');
end;
$$;

-- Atualiza a posição enquanto está a caminho.
create function public.update_provider_location(p_request_id uuid, p_lat double precision, p_lng double precision, p_heading double precision default null)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_req public.service_requests;
begin
  select * into v_req from public.service_requests where id = p_request_id;
  if not found or v_req.provider_id is distinct from auth.uid() or v_req.status <> 'assigned'
     or v_req.en_route_at is null or v_req.arrived_at is not null then
    raise exception 'Localização só pode ser enviada a caminho do serviço';
  end if;
  insert into public.provider_tracking (request_id, provider_id, lat, lng, heading, updated_at)
  values (p_request_id, auth.uid(), p_lat, p_lng, p_heading, now())
  on conflict (request_id) do update
    set lat = excluded.lat, lng = excluded.lng, heading = excluded.heading, updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- Gatilhos que geram as notificações
-- ---------------------------------------------------------------------------

-- Novo orçamento → cliente.
create function public.on_quote_change()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_req public.service_requests;
begin
  select * into v_req from public.service_requests where id = new.request_id;
  if tg_op = 'INSERT' then
    perform public.notify(v_req.client_id, new.request_id, 'new_quote',
      'Novo orçamento: R$ ' || replace(to_char(new.price_cents / 100.0, 'FM999999990.00'), '.', ','),
      public.display_name(new.provider_id) || ' quer fazer "' || v_req.title || '".');
  -- Recusado porque o cliente pagou outro orçamento (no cancelamento não avisa).
  elsif old.status = 'pending' and new.status = 'rejected'
        and exists (select 1 from public.payments p where p.request_id = new.request_id and p.status = 'held') then
    perform public.notify(new.provider_id, new.request_id, 'quote_rejected',
      'O cliente escolheu outro orçamento', '"' || v_req.title || '"');
  end if;
  return new;
end;
$$;
create trigger quotes_notify after insert or update of status on public.quotes
  for each row execute function public.on_quote_change();

-- Mudanças de status do pedido → a outra parte.
create function public.on_request_status_change()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_provider text := public.display_name(new.provider_id);
begin
  if new.status = old.status then
    return new;
  end if;
  case new.status
    when 'awaiting_payment' then
      perform public.notify(new.provider_id, new.id, 'quote_accepted',
        'Seu orçamento foi aceito! 🎉', 'Assim que o cliente pagar, o serviço "' || new.title || '" é seu.');
    when 'assigned' then
      perform public.notify(new.provider_id, new.id, 'paid',
        'Pagamento confirmado', 'Combine o horário com o cliente e avise quando sair para "' || new.title || '".');
      perform public.notify(new.client_id, new.id, 'paid',
        'Pagamento confirmado', 'O valor fica retido até você confirmar o serviço.');
    when 'in_progress' then
      perform public.notify(new.client_id, new.id, 'started',
        'Serviço iniciado', v_provider || ' começou "' || new.title || '".');
    when 'awaiting_confirmation' then
      perform public.notify(new.client_id, new.id, 'finished',
        'Serviço finalizado', 'Confira as fotos e confirme para liberar o pagamento.');
    when 'completed' then
      perform public.notify(new.provider_id, new.id, 'completed',
        'Pagamento liberado', 'O cliente confirmou "' || new.title || '". Avalie o cliente!');
      perform public.notify(new.client_id, new.id, 'completed',
        'Serviço concluído', 'Como foi com ' || v_provider || '? Deixe sua avaliação.');
    when 'cancelled' then
      perform public.notify(new.provider_id, new.id, 'cancelled',
        'Pedido cancelado', 'O cliente cancelou "' || new.title || '".');
    else
      null;
  end case;
  return new;
end;
$$;
create trigger service_requests_notify after update of status on public.service_requests
  for each row execute function public.on_request_status_change();

-- Pedido novo com local → prestadores disponíveis da categoria dentro do raio.
create function public.on_request_located()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_req public.service_requests;
  v_provider record;
begin
  select * into v_req from public.service_requests where id = new.request_id;
  if v_req.status <> 'open' then
    return new;
  end if;
  for v_provider in
    select p.id,
           public.distance_km(p.base_lat, p.base_lng, new.lat, new.lng) as km
    from public.profiles p
    join public.provider_categories pc on pc.provider_id = p.id and pc.category_id = v_req.category_id
    where p.role = 'provider' and p.available and p.base_lat is not null and p.id <> v_req.client_id
      and public.distance_km(p.base_lat, p.base_lng, new.lat, new.lng) <= p.service_radius_km
      and not exists (
        select 1 from public.notifications n
        where n.user_id = p.id and n.request_id = new.request_id and n.kind = 'new_request'
      )
  loop
    perform public.notify(v_provider.id, new.request_id, 'new_request',
      'Novo pedido a ' || replace(round(v_provider.km::numeric, 1)::text, '.', ',') || ' km',
      v_req.title || ' · ' || v_req.city);
  end loop;
  return new;
end;
$$;
create trigger request_locations_notify after insert on public.request_locations
  for each row execute function public.on_request_located();

-- Nova mensagem → a outra parte.
create function public.on_message()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_req public.service_requests;
  v_to uuid;
begin
  select * into v_req from public.service_requests where id = new.request_id;
  v_to := case when new.sender_id = v_req.client_id then v_req.provider_id else v_req.client_id end;
  perform public.notify(v_to, new.request_id, 'message',
    public.display_name(new.sender_id), left(new.body, 140));
  return new;
end;
$$;
create trigger messages_notify after insert on public.messages
  for each row execute function public.on_message();

-- Avaliação recebida.
create function public.on_review()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.notify(new.reviewee_id, new.request_id, 'review',
    'Você recebeu ' || new.rating || ' estrela' || case when new.rating = 1 then '' else 's' end,
    coalesce(nullif(new.comment, ''), 'Veja no pedido.'));
  return new;
end;
$$;
create trigger reviews_notify after insert on public.reviews
  for each row execute function public.on_review();

-- Garantia acionada → prestador.
create function public.on_warranty_claim()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_req public.service_requests;
begin
  select * into v_req from public.service_requests where id = new.request_id;
  perform public.notify(v_req.provider_id, new.request_id, 'warranty',
    'Garantia acionada', left(new.description, 140));
  return new;
end;
$$;
create trigger warranty_claims_notify after insert on public.warranty_claims
  for each row execute function public.on_warranty_claim();

-- ---------------------------------------------------------------------------
-- Realtime: as telas escutam estas tabelas (o RLS continua valendo)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.notifications,
      public.service_requests,
      public.quotes,
      public.payments,
      public.service_photos,
      public.provider_tracking;
  end if;
end;
$$;
