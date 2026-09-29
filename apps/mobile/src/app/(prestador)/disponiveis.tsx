import {
  getProviderCategoryIds,
  listNearbyRequests,
  listOpenRequestsForProvider,
  RADIUS_OPTIONS_KM,
  type LatLng,
  type NearbyRequest,
} from '@helphome/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { EmptyState, RequestCard } from '@/components/request-card';
import { RequestsMap } from '@/components/requests-map';
import { Button, Chip, ErrorText, Loading, Muted, Notice, Row } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { currentLocation } from '@/lib/location';
import { supabase } from '@/lib/supabase';
import { colors, space } from '@/lib/theme';
import { useData } from '@/lib/use-data';

type View_ = 'lista' | 'mapa';

export default function Disponiveis() {
  const router = useRouter();
  const { profile } = useAuth();
  const base = profile?.base_lat != null && profile.base_lng != null ? { lat: profile.base_lat, lng: profile.base_lng } : null;
  const [gps, setGps] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number | null>(profile?.service_radius_km ?? 20);
  const [view, setView] = useState<View_>('lista');
  const origin = gps ?? base;

  const { data, error, refresh, refreshing, loading } = useData(async () => {
    const categories = await getProviderCategoryIds(supabase, profile!.id);
    const requests: NearbyRequest[] = origin
      ? await listNearbyRequests(supabase, profile!.id, origin, radiusKm)
      : (await listOpenRequestsForProvider(supabase, profile!.id, profile?.city ?? undefined)).map((r) => ({
          ...r,
          distance_km: null,
        }));
    return { hasCategories: categories.length > 0, requests };
  }, [profile?.id, origin?.lat, origin?.lng, radiusKm]);

  async function locateMe() {
    setLocating(true);
    const point = await currentLocation().catch(() => null);
    if (point) setGps(point);
    setLocating(false);
  }

  const header = (
    <View style={{ gap: space.sm, padding: space.lg, paddingBottom: space.sm, backgroundColor: colors.background }}>
      {data && !data.hasCategories && (
        <Notice>Escolha as categorias que você atende no seu perfil para ver os pedidos.</Notice>
      )}
      {!origin && (
        <Notice tone="brand">
          Mostrando pedidos em {profile?.city}. Marque sua base no perfil ou use sua localização para ver os mais próximos e o
          mapa.
        </Notice>
      )}
      <Row>
        <Chip label="📋 Lista" selected={view === 'lista'} onPress={() => setView('lista')} />
        <Chip label="🗺️ Mapa" selected={view === 'mapa'} onPress={() => (origin ? setView('mapa') : void locateMe())} />
        <Button
          small
          variant="secondary"
          title={gps ? '📍 Usando sua localização' : '📍 Usar minha localização'}
          onPress={locateMe}
          loading={locating}
        />
      </Row>
      {origin && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {RADIUS_OPTIONS_KM.map((km) => (
            <Chip key={km} label={`Até ${km} km`} selected={radiusKm === km} onPress={() => setRadiusKm(km)} />
          ))}
          <Chip label="Qualquer distância" selected={radiusKm === null} onPress={() => setRadiusKm(null)} />
        </ScrollView>
      )}
      {origin && (
        <Muted style={{ fontSize: 12 }}>
          Distâncias a partir {gps ? 'da sua localização atual' : 'da sua base'}. Os pontos são aproximados (cerca de 1 km).
        </Muted>
      )}
      <ErrorText message={error} />
    </View>
  );

  if (loading) return <Loading />;
  const requests = data?.requests ?? [];

  if (view === 'mapa' && origin) {
    return (
      <View style={{ flex: 1 }}>
        {header}
        <RequestsMap origin={origin} radiusKm={radiusKm} requests={requests} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      {header}
      <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
        {requests.length === 0 ? (
          <>
            <EmptyState
              icon="🔍"
              title="Nenhum pedido aberto por aqui"
              text={origin && radiusKm ? 'Tente aumentar a distância.' : 'Assim que chegar um pedido nas suas categorias, ele aparece aqui.'}
            />
            {!data?.hasCategories && <Button title="Escolher categorias" onPress={() => router.push('/perfil')} />}
          </>
        ) : (
          requests.map((r) => (
            <RequestCard key={r.id} request={r} distanceKm={r.distance_km} alreadyQuoted={r.already_quoted} showStatus={false} />
          ))
        )}
      </View>
    </ScrollView>
  );
}
