import {
  distanceKm,
  formatDistance,
  formatEta,
  getProviderTracking,
  markArrived,
  startEnRoute,
  subscribeToTracking,
  updateProviderLocation,
  type LatLng,
  type ProviderTracking,
} from '@helphome/shared';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { timeAgo } from '@/components/notification-ui';
import { MapView, Marker } from '@/components/native-map';
import { Button, Card, Muted, Notice, SectionTitle } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { supabase } from '@/lib/supabase';
import { colors, radius, space } from '@/lib/theme';
import type { RequestDetail } from './load';

type Act = (fn: () => Promise<unknown>) => Promise<void>;

/** Região do mapa que mostra os dois pontos. */
function regionFor(a: LatLng, b: LatLng) {
  const latDelta = Math.abs(a.lat - b.lat) * 1.8 + 0.01;
  const lngDelta = Math.abs(a.lng - b.lng) * 1.8 + 0.01;
  return {
    latitude: (a.lat + b.lat) / 2,
    longitude: (a.lng + b.lng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

/** Cliente acompanha o prestador chegando, como num app de corrida. */
export function ClientTracking({ detail }: { detail: RequestDetail }) {
  const { request, exactLocation, otherParty } = detail;
  const onTheWay = request.status === 'assigned' && !!request.en_route_at && !request.arrived_at;
  const [tracking, setTracking] = useState<ProviderTracking | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!onTheWay) return;
    getProviderTracking(supabase, request.id).then(setTracking).catch(() => {});
    const stop = subscribeToTracking(supabase, request.id, setTracking);
    // Atualiza o "há X min" da última posição.
    const timer = setInterval(() => setTick((t) => t + 1), 15000);
    return () => {
      stop();
      clearInterval(timer);
    };
  }, [onTheWay, request.id]);

  if (request.status === 'assigned' && request.arrived_at) {
    return <Notice tone="success">🏠 {otherParty?.company_name || otherParty?.full_name} chegou ao local do serviço.</Notice>;
  }
  if (!onTheWay) return null;

  const here = tracking ? { lat: tracking.lat, lng: tracking.lng } : null;
  const km = here && exactLocation ? distanceKm(here, exactLocation) : null;
  return (
    <Card style={{ borderColor: colors.brand, padding: 0, overflow: 'hidden', gap: 0 }}>
      <View style={{ padding: space.lg, gap: 4 }}>
        <Muted style={{ fontSize: 12, fontWeight: '700', color: colors.brandDark }}>A CAMINHO</Muted>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
          {km != null ? `Chega em ~${formatEta(km)}` : 'Saiu para o seu endereço'}
        </Text>
        <Muted>
          {otherParty?.company_name || otherParty?.full_name}
          {km != null && ` · a ${formatDistance(km)}`}
          {tracking && ` · atualizado ${timeAgo(tracking.updated_at)}`}
        </Muted>
      </View>
      {exactLocation && (
        <View style={styles.map}>
          <MapView
            style={StyleSheet.absoluteFill}
            region={here ? regionFor(here, exactLocation) : regionFor(exactLocation, exactLocation)}>
            <Marker coordinate={{ latitude: exactLocation.lat, longitude: exactLocation.lng }} title="Seu endereço">
              <Text style={{ fontSize: 30 }}>🏠</Text>
            </Marker>
            {here && (
              <Marker coordinate={{ latitude: here.lat, longitude: here.lng }} title="Profissional" anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.car}>
                  <Text style={{ fontSize: 22 }}>🚗</Text>
                </View>
              </Marker>
            )}
          </MapView>
        </View>
      )}
    </Card>
  );
}

/** Prestador avisa que saiu, compartilha a posição e avisa que chegou. */
export function ProviderTrip({ detail, act }: { detail: RequestDetail; act: Act }) {
  const { request, exactLocation } = detail;
  const sharing = request.status === 'assigned' && !!request.en_route_at && !request.arrived_at;
  const [lastSent, setLastSent] = useState<LatLng | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Envia a posição enquanto esta tela estiver aberta.
  useEffect(() => {
    if (!sharing) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setGpsError('Libere a localização para o cliente acompanhar você.');
        return;
      }
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 20 },
        (pos) => {
          const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          updateProviderLocation(supabase, request.id, point, pos.coords.heading)
            .then(() => setLastSent(point))
            .catch(() => {});
        },
      );
      if (cancelled) sub.remove();
    })().catch(() => setGpsError('Não foi possível usar o GPS.'));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [sharing, request.id]);

  if (request.status !== 'assigned') return null;

  if (request.arrived_at) {
    return <Notice tone="success">Você chegou. Tire a foto de antes e inicie o serviço.</Notice>;
  }
  if (!request.en_route_at) {
    return (
      <Card>
        <SectionTitle>Combinou o horário?</SectionTitle>
        <Muted>Quando sair, avise o cliente. Ele acompanha você no mapa até chegar.</Muted>
        <Button title="🚗 Estou a caminho" onPress={() => act(() => startEnRoute(supabase, request.id))} />
      </Card>
    );
  }
  const km = lastSent && exactLocation ? distanceKm(lastSent, exactLocation) : null;
  return (
    <Card style={{ borderColor: colors.brand }}>
      <Muted style={{ fontSize: 12, fontWeight: '700', color: colors.brandDark }}>A CAMINHO</Muted>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
        {km != null ? `Faltam ${formatDistance(km)} (~${formatEta(km)})` : 'Compartilhando sua localização…'}
      </Text>
      <Muted style={{ fontSize: 13 }}>O cliente vê você no mapa. Mantenha esta tela aberta durante o trajeto.</Muted>
      {gpsError && <Notice>{gpsError}</Notice>}
      <Button
        title="📍 Cheguei"
        onPress={async () => {
          if (await confirm('Avisar que chegou?', 'O cliente recebe o aviso e o mapa é encerrado.', 'Cheguei'))
            await act(() => markArrived(supabase, request.id));
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  map: { height: 220, borderTopWidth: 1, borderTopColor: colors.border },
  car: {
    backgroundColor: '#fff',
    borderRadius: radius.full,
    padding: 4,
    borderWidth: 2,
    borderColor: colors.brand,
  },
});
