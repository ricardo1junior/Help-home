import { formatDistance, type LatLng, type NearbyRequest } from '@helphome/shared';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Circle, MapView, Marker } from '@/components/native-map';
import { deltaForRadius, toRegion } from '@/lib/location';
import { colors } from '@/lib/theme';

/** Mapa dos pedidos abertos em volta do prestador. Toque no balão para abrir o pedido. */
export function RequestsMap({
  origin,
  radiusKm,
  requests,
}: {
  origin: LatLng;
  radiusKm: number | null;
  requests: NearbyRequest[];
}) {
  const router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <MapView
        key={`${origin.lat},${origin.lng},${radiusKm}`}
        style={StyleSheet.absoluteFill}
        initialRegion={toRegion(origin, deltaForRadius(radiusKm ?? 50))}>
        <Marker coordinate={{ latitude: origin.lat, longitude: origin.lng }} title="Você" pinColor="#2563eb" />
        {radiusKm && (
          <Circle
            center={{ latitude: origin.lat, longitude: origin.lng }}
            radius={radiusKm * 1000}
            strokeColor={colors.brand}
            fillColor="rgba(249,115,22,0.08)"
          />
        )}
        {requests
          .filter((r) => r.approx_lat != null && r.approx_lng != null)
          .map((r) => (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.approx_lat!, longitude: r.approx_lng! }}
              pinColor={r.already_quoted ? colors.success : colors.brand}
              title={`${r.category.icon} ${r.title}`}
              description={`${r.category.name}${r.distance_km != null ? ` · ${formatDistance(r.distance_km)}` : ''} · toque para abrir`}
              onCalloutPress={() => router.push({ pathname: '/pedido/[id]', params: { id: r.id } })}
            />
          ))}
      </MapView>
    </View>
  );
}
