import type { LatLng } from '@helphome/shared';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

/** Localização atual do celular (pede permissão). Retorna null se negada. */
export async function currentLocation(): Promise<LatLng | null> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) {
    Alert.alert('Localização desligada', 'Libere o acesso à localização nas configurações do celular.');
    return null;
  }
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

/** Procura um endereço e devolve o ponto no mapa. */
export async function findAddress(query: string): Promise<LatLng | null> {
  const results = await Location.geocodeAsync(query);
  const first = results[0];
  return first ? { lat: first.latitude, lng: first.longitude } : null;
}

export const toRegion = ({ lat, lng }: LatLng, delta = 0.05) => ({
  latitude: lat,
  longitude: lng,
  latitudeDelta: delta,
  longitudeDelta: delta,
});

/** Zoom do mapa para caber um raio em km. */
export const deltaForRadius = (km: number) => Math.min(60, (km * 2.4) / 111);
