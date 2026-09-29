-- Help Home: CNPJ do prestador, pagamento retido no app, garantia,
-- prazo estimado com penalidade na nota, fotos de antes/depois e
-- avaliações nos dois sentidos (0 a 5 estrelas).

-- ---------------------------------------------------------------------------
-- CNPJ obrigatório para prestadores
-- ---------------------------------------------------------------------------

-- Valida os dígitos verificadores do CNPJ (recebe só números ou com máscara).
create function public.is_valid_cnpj(p_cnpj text)
returns boolean
language plpgsql immutable
as $$
declare
  d text := regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g');
  w1 int[] := array[5,4,3,2,9,8,7,6,5,4,3,2];
  w2 int[] := array[6,5,4,3,2,9,8,7,6,5,4,3,2];
  s int;
  r int;
begin
  if length(d) <> 14 or d ~ '^(\d)\1{13}$' then
    return false;
  end if;
  s := 0;
  for i in 1..12 loop s := s + substr(d, i, 1)::int * w1[i]; end loop;
  r := s % 11;
  if substr(d, 13, 1)::int <> (case when r < 2 then 0 else 11 - r end) then return false; end if;
  s := 0;
  for i in 1..13 loop s := s + substr(d, i, 1)::int * w2[i]; end loop;
  r := s % 11;
  return substr(d, 14, 1)::int = (case when r < 2 then 0 else 11 - r end);
end;
$$;

alter table public.profiles
  add column cnpj text unique check (cnpj ~ '^\d{14}$'),
  add column company_name text,
  -- marcado pelo servidor depois de consultar a Receita (BrasilAPI)
  add column cnpj_verified boolean not null default false;

-- NOT VALID: vale para novos cadastros sem travar prestadores antigos (de teste) sem CNPJ.
alter table public.profiles
  add constraint provider_has_cnpj check (role <> 'provider' or cnpj is not null) not valid;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_role public.user_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'client');
  v_cnpj text := nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'cnpj', ''), '\D', '', 'g'), '');
begin
  if v_role = 'provider' and not public.is_valid_cnpj(v_cnpj) then
    raise exception 'CNPJ inválido';
  end if;
  insert into public.profiles (id, role, full_name, phone, city, cnpj)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'city',
    case when v_role = 'provider' then v_cnpj end
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Orçamento: prazo estimado e garantia
-- ---------------------------------------------------------------------------

alter table public.quotes
  add column estimated_hours numeric(6, 1) not null default 1 check (estimated_hours > 0),
  -- O Código de Defesa do Consumidor garante no mínimo 90 dias para serviços.
  add column warranty_days integer not null default 90 check (warranty_days >= 90);

-- ---------------------------------------------------------------------------
-- Novo ciclo do pedido
-- open → awaiting_payment → assigned → in_progress → awaiting_confirmation → completed
-- ---------------------------------------------------------------------------

-- (os novos status estão na migração 20260929010000_novos_status.sql)

alter table public.service_requests
  add column started_at timestamptz,     -- prestador iniciou
  add column finished_at timestamptz,    -- prestador marcou como pronto
  add column completed_at timestamptz,   -- cliente confirmou
  add column warranty_until date;

-- ---------------------------------------------------------------------------
-- Pagamentos (valor retido até o cliente confirmar o serviço)
-- ---------------------------------------------------------------------------

create type public.payment_status as enum (
  'pending',        -- aguardando o cliente pagar
  'held',           -- pago, retido pela plataforma
  'released',       -- repassado ao prestador
  'refund_pending', -- cancelado, aguardando estorno no gateway
  'refunded'        -- estornado ao cliente
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  quote_id uuid not null unique references public.quotes (id) on delete cascade,
  client_id uuid not null references public.profiles (id),
  provider_id uuid not null references public.profiles (id),
  amount_cents integer not null check (amount_cents > 0),
  platform_fee_cents integer not null check (platform_fee_cents >= 0),
  provider_amount_cents integer generated always as (amount_cents - platform_fee_cents) stored,
  status public.payment_status not null default 'pending',
  gateway text not null default 'simulado',
  gateway_ref text,
  method text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz
);

create index payments_request_idx on public.payments (request_id);

-- Taxa da plataforma sobre cada serviço (em %). Ajuste aqui quando definir o modelo de negócio.
create function public.platform_fee_percent()
returns numeric
language sql immutable
as $$ select 10.0 $$;

-- ---------------------------------------------------------------------------
-- Fotos de antes e depois
-- ---------------------------------------------------------------------------

create type public.photo_kind as enum ('before', 'after');

create table public.service_photos (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  kind public.photo_kind not null,
  url text not null,
  created_at timestamptz not null default now()
);

create index service_photos_request_idx on public.service_photos (request_id);

-- ---------------------------------------------------------------------------
-- Garantia
-- ---------------------------------------------------------------------------

create type public.claim_status as enum ('open', 'resolved');

create table public.warranty_claims (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  description text not null check (char_length(description) between 10 and 2000),
  status public.claim_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index warranty_claims_request_idx on public.warranty_claims (request_id);

-- ---------------------------------------------------------------------------
-- Avaliações nos dois sentidos (0 a 5)
-- ---------------------------------------------------------------------------

drop view public.provider_ratings;
drop policy "cliente avalia serviço concluído" on public.reviews;

alter table public.reviews rename column client_id to reviewer_id;
alter table public.reviews rename column provider_id to reviewee_id;
alter table public.reviews drop constraint reviews_request_id_key;
alter table public.reviews drop constraint reviews_rating_check;
alter table public.reviews
  add constraint reviews_rating_check check (rating between 0 and 5),
  add constraint reviews_one_per_side unique (request_id, reviewer_id),
  add constraint reviews_not_self check (reviewer_id <> reviewee_id);

alter index reviews_provider_idx rename to reviews_reviewee_idx;

create policy "avaliar a outra parte de um serviço concluído" on public.reviews
  for insert to authenticated with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.service_requests r
      where r.id = request_id
        and r.status = 'completed'
        and (
          (r.client_id = auth.uid() and r.provider_id = reviews.reviewee_id)
          or (r.provider_id = auth.uid() and r.client_id = reviews.reviewee_id)
        )
    )
  );

-- Penalidade de atraso de um serviço: a cada 50% acima do prazo estimado,
-- perde 0,5 ponto (no máximo 2). Serviços em andamento já atrasados também contam.
create function public.delay_penalty(p_estimated_hours numeric, p_started_at timestamptz, p_finished_at timestamptz)
returns numeric
language sql stable
as $$
  select case
    when p_started_at is null or p_estimated_hours is null then 0
    else least(
      2,
      0.5 * greatest(
        0,
        ceil(
          (extract(epoch from coalesce(p_finished_at, now()) - p_started_at) / 3600.0 / p_estimated_hours - 1) / 0.5
        )
      )
    )
  end;
$$;

-- Nota do prestador = média das avaliações − penalidade média por atraso (mínimo 0).
create view public.provider_ratings
with (security_invoker = true) as
with jobs as (
  select r.provider_id,
         public.delay_penalty(q.estimated_hours, r.started_at, r.finished_at) as penalty
  from public.service_requests r
  join public.quotes q on q.request_id = r.id and q.provider_id = r.provider_id and q.status = 'accepted'
  where r.started_at is not null and r.status <> 'cancelled'
),
job_stats as (
  select provider_id,
         avg(penalty) as avg_penalty,
         count(*) filter (where penalty > 0)::int as late_jobs,
         count(*)::int as jobs
  from jobs
  group by provider_id
),
review_stats as (
  select rv.reviewee_id as provider_id, avg(rv.rating) as average, count(*)::int as total
  from public.reviews rv
  join public.profiles p on p.id = rv.reviewee_id and p.role = 'provider'
  group by rv.reviewee_id
)
select coalesce(rs.provider_id, js.provider_id) as provider_id,
       round(greatest(0, coalesce(rs.average, 5) - coalesce(js.avg_penalty, 0))::numeric, 1) as average,
       round(coalesce(rs.average, 0)::numeric, 1) as reviews_average,
       coalesce(rs.total, 0) as total,
       coalesce(js.late_jobs, 0) as late_jobs,
       coalesce(js.jobs, 0) as jobs
from review_stats rs
full join job_stats js on js.provider_id = rs.provider_id;

create view public.client_ratings
with (security_invoker = true) as
select rv.reviewee_id as client_id,
       round(avg(rv.rating)::numeric, 1) as average,
       count(*)::int as total
from public.reviews rv
join public.profiles p on p.id = rv.reviewee_id and p.role = 'client'
group by rv.reviewee_id;

-- ---------------------------------------------------------------------------
-- Fluxo do pedido
-- ---------------------------------------------------------------------------

-- Cliente aceita um orçamento: gera o pagamento e aguarda o pagamento.
drop function public.accept_quote(uuid);
create function public.accept_quote(p_quote_id uuid)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_quote public.quotes;
  v_req public.service_requests;
  v_payment_id uuid;
begin
  select * into v_quote from public.quotes where id = p_quote_id for update;
  if not found then
    raise exception 'Orçamento não encontrado';
  end if;

  select * into v_req from public.service_requests
  where id = v_quote.request_id and client_id = auth.uid() and status = 'open'
  for update;
  if not found then
    raise exception 'Pedido não está aberto ou não pertence a você';
  end if;

  if v_quote.status <> 'pending' then
    raise exception 'Este orçamento não está mais disponível';
  end if;

  update public.quotes set status = 'accepted' where id = v_quote.id;
  update public.service_requests
    set status = 'awaiting_payment', provider_id = v_quote.provider_id
    where id = v_req.id;

  insert into public.payments (request_id, quote_id, client_id, provider_id, amount_cents, platform_fee_cents)
  values (
    v_req.id, v_quote.id, v_req.client_id, v_quote.provider_id, v_quote.price_cents,
    round(v_quote.price_cents * public.platform_fee_percent() / 100)
  )
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;

-- Chamado só pelo servidor (webhook do gateway) quando o pagamento é aprovado.
create function public.mark_payment_held(p_payment_id uuid, p_gateway text, p_gateway_ref text, p_method text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_pay public.payments;
begin
  select * into v_pay from public.payments where id = p_payment_id for update;
  if not found or v_pay.status <> 'pending' then
    raise exception 'Pagamento não está pendente';
  end if;

  update public.payments
    set status = 'held', gateway = p_gateway, gateway_ref = p_gateway_ref, method = p_method, paid_at = now()
    where id = p_payment_id;
  update public.service_requests set status = 'assigned'
    where id = v_pay.request_id and status = 'awaiting_payment';
  update public.quotes set status = 'rejected'
    where request_id = v_pay.request_id and status = 'pending';
end;
$$;

-- Chamado só pelo servidor depois de o gateway confirmar o estorno.
create function public.mark_payment_refunded(p_payment_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.payments set status = 'refunded', refunded_at = now()
    where id = p_payment_id and status = 'refund_pending';
  if not found then
    raise exception 'Pagamento não está aguardando estorno';
  end if;
end;
$$;

revoke execute on function public.mark_payment_held(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.mark_payment_refunded(uuid) from public, anon, authenticated;

drop function public.set_request_status(uuid, public.request_status);

-- Mudança de status do pedido, validando quem pode fazer cada transição.
create function public.set_request_status(p_request_id uuid, p_status public.request_status)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_req public.service_requests;
  v_warranty integer;
begin
  select * into v_req from public.service_requests where id = p_request_id for update;
  if not found then
    raise exception 'Pedido não encontrado';
  end if;

  if p_status = 'cancelled' then
    -- O cliente pode cancelar até o prestador iniciar o serviço; se já pagou, é estornado.
    if v_req.client_id <> auth.uid() or v_req.status not in ('open', 'awaiting_payment', 'assigned') then
      raise exception 'Não é possível cancelar este pedido';
    end if;
    update public.quotes set status = 'rejected'
      where request_id = p_request_id and status in ('pending', 'accepted');
    update public.payments set status = 'refund_pending'
      where request_id = p_request_id and status = 'held';
    delete from public.payments where request_id = p_request_id and status = 'pending';
    update public.service_requests set status = 'cancelled' where id = p_request_id;

  elsif p_status = 'in_progress' then
    if v_req.provider_id is distinct from auth.uid() or v_req.status <> 'assigned' then
      raise exception 'Não é possível iniciar este serviço';
    end if;
    if not exists (select 1 from public.service_photos where request_id = p_request_id and kind = 'before') then
      raise exception 'Envie pelo menos uma foto de antes para iniciar o serviço';
    end if;
    update public.service_requests set status = 'in_progress', started_at = now() where id = p_request_id;

  elsif p_status = 'awaiting_confirmation' then
    if v_req.provider_id is distinct from auth.uid() or v_req.status <> 'in_progress' then
      raise exception 'Não é possível finalizar este serviço';
    end if;
    if not exists (select 1 from public.service_photos where request_id = p_request_id and kind = 'after') then
      raise exception 'Envie pelo menos uma foto de depois para finalizar o serviço';
    end if;
    update public.service_requests set status = 'awaiting_confirmation', finished_at = now() where id = p_request_id;

  elsif p_status = 'completed' then
    -- Só o cliente confirma; nesse momento o pagamento é liberado ao prestador e começa a garantia.
    if v_req.client_id <> auth.uid() or v_req.status <> 'awaiting_confirmation' then
      raise exception 'Não é possível confirmar este serviço';
    end if;
    select warranty_days into v_warranty from public.quotes
      where request_id = p_request_id and provider_id = v_req.provider_id and status = 'accepted';
    update public.service_requests
      set status = 'completed', completed_at = now(),
          warranty_until = (now() + make_interval(days => coalesce(v_warranty, 90)))::date
      where id = p_request_id;
    update public.payments set status = 'released', released_at = now()
      where request_id = p_request_id and status = 'held';

  else
    raise exception 'Transição de status inválida';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Segurança (RLS) das novas tabelas
-- ---------------------------------------------------------------------------

alter table public.payments enable row level security;
alter table public.service_photos enable row level security;
alter table public.warranty_claims enable row level security;

-- CNPJ e verificação não podem ser alterados pelo próprio usuário.
revoke update on public.profiles from authenticated;
grant update (full_name, phone, city, avatar_url, bio) on public.profiles to authenticated;

create policy "ver pagamentos do próprio pedido" on public.payments
  for select to authenticated using (client_id = auth.uid() or provider_id = auth.uid());

create policy "ver fotos do serviço" on public.service_photos
  for select to authenticated using (public.is_request_participant(request_id));
create policy "prestador envia fotos de antes e depois" on public.service_photos
  for insert to authenticated with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.service_requests r
      where r.id = request_id
        and r.provider_id = auth.uid()
        and r.status in ('assigned', 'in_progress', 'awaiting_confirmation')
    )
  );
create policy "prestador remove as próprias fotos" on public.service_photos
  for delete to authenticated using (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.service_requests r
      where r.id = request_id and r.status in ('assigned', 'in_progress', 'awaiting_confirmation')
    )
  );

create policy "ver acionamentos de garantia" on public.warranty_claims
  for select to authenticated using (public.is_request_party(request_id));
create policy "cliente aciona garantia" on public.warranty_claims
  for insert to authenticated with check (
    client_id = auth.uid()
    and status = 'open'
    and exists (
      select 1 from public.service_requests r
      where r.id = request_id
        and r.client_id = auth.uid()
        and r.status = 'completed'
        and current_date <= r.warranty_until
    )
  );
create policy "prestador resolve garantia" on public.warranty_claims
  for update to authenticated
  using (
    status = 'open'
    and exists (select 1 from public.service_requests r where r.id = request_id and r.provider_id = auth.uid())
  )
  with check (status = 'resolved');
