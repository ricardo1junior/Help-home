-- Help Home: localização dos pedidos e área de atendimento dos prestadores,
-- para o prestador achar os pedidos mais próximos em lista e no mapa.
--
-- Privacidade: o ponto exato do cliente fica numa tabela à parte, visível só
-- para o cliente e o prestador escolhido. Os demais prestadores veem um ponto
-- aproximado (arredondado para ~1 km), suficiente para calcular a distância.

-- Ponto exato do pedido.
create table public.request_locations (
  request_id uuid primary key references public.service_requests (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180)
);

-- Ponto aproximado, público para prestadores que podem ver o pedido.
alter table public.service_requests
  add column approx_lat double precision,
  add column approx_lng double precision;

-- Base e raio de atendimento do prestador.
alter table public.profiles
  add column base_lat double precision check (base_lat between -90 and 90),
  add column base_lng double precision check (base_lng between -180 and 180),
  add column service_radius_km integer not null default 20 check (service_radius_km between 1 and 200);

grant update (base_lat, base_lng, service_radius_km) on public.profiles to authenticated;

-- Mantém o ponto aproximado do pedido sincronizado com o exato.
create function public.sync_approx_location()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.service_requests set approx_lat = null, approx_lng = null where id = old.request_id;
    return old;
  end if;
  update public.service_requests
    set approx_lat = round(new.lat::numeric, 2), approx_lng = round(new.lng::numeric, 2)
    where id = new.request_id;
  return new;
end;
$$;

create trigger request_locations_sync
  after insert or update or delete on public.request_locations
  for each row execute function public.sync_approx_location();

-- O cliente só edita os campos do texto do pedido; status, prestador e
-- ponto aproximado mudam apenas pelas funções e gatilhos do banco.
revoke update on public.service_requests from authenticated;
grant update (category_id, title, description, address, city, preferred_date, photos)
  on public.service_requests to authenticated;

alter table public.request_locations enable row level security;

create policy "ver local exato" on public.request_locations
  for select to authenticated using (public.is_request_party(request_id));
create policy "cliente define o local do pedido" on public.request_locations
  for insert to authenticated with check (
    exists (
      select 1 from public.service_requests r
      where r.id = request_id and r.client_id = auth.uid() and r.status = 'open'
    )
  );
create policy "cliente ajusta o local do pedido aberto" on public.request_locations
  for update to authenticated
  using (exists (select 1 from public.service_requests r where r.id = request_id and r.client_id = auth.uid() and r.status = 'open'))
  with check (exists (select 1 from public.service_requests r where r.id = request_id and r.client_id = auth.uid() and r.status = 'open'));

-- Distância em km entre dois pontos (fórmula de haversine).
create function public.distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision
language sql immutable
as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Pedidos abertos que o prestador pode ver, com a distância até um ponto.
-- Roda com as permissões de quem chama, então o RLS continua filtrando
-- pelas categorias que o prestador atende.
create function public.nearby_open_requests(p_lat double precision, p_lng double precision, p_radius_km double precision default null)
returns table (id uuid, distance_km double precision)
language sql stable
security invoker set search_path = ''
as $$
  select r.id, public.distance_km(p_lat, p_lng, r.approx_lat, r.approx_lng) as distance_km
  from public.service_requests r
  where r.status = 'open'
    and r.approx_lat is not null
    and r.client_id <> auth.uid()
    and (p_radius_km is null or public.distance_km(p_lat, p_lng, r.approx_lat, r.approx_lng) <= p_radius_km)
  order by distance_km;
$$;
