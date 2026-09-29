import { DEFAULT_CENTER, type LatLng } from '@helphome/shared';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Circle, MapView, Marker } from '@/components/native-map';
import { currentLocation, deltaForRadius, findAddress, toRegion } from '@/lib/location';
import { colors, radius, space } from '@/lib/theme';
import { Button, ErrorText, Muted, Row } from './ui';

/**
 * Mapa para marcar um ponto: toque no mapa, arraste o pino, use a localização
 * atual ou procure o endereço digitado.
 */
export function LocationPicker({
  value,
  onChange,
  addressQuery,
  radiusKm,
  height = 240,
}: {
  value: LatLng | null;
  onChange: (point: LatLng) => void;
  addressQuery?: string;
  radiusKm?: number;
  height?: number;
}) {
  const map = useRef<MapView>(null);
  const [busy, setBusy] = useState<'gps' | 'search' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const delta = radiusKm ? deltaForRadius(radiusKm) : 0.02;

  function move(point: LatLng) {
    onChange(point);
    map.current?.animateToRegion(toRegion(point, delta));
  }

  async function locateMe() {
    setError(null);
    setBusy('gps');
    try {
      const point = await currentLocation();
      if (point) move(point);
    } catch {
      setError('Não foi possível pegar sua localização.');
    } finally {
      setBusy(null);
    }
  }

  async function search() {
    if (!addressQuery?.trim()) {
      setError('Digite o endereço acima para procurar.');
      return;
    }
    setError(null);
    setBusy('search');
    try {
      const point = await findAddress(addressQuery);
      if (point) move(point);
      else setError('Endereço não encontrado. Toque no mapa para marcar o local.');
    } catch {
      setError('Não foi possível procurar o endereço. Toque no mapa para marcar o local.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ gap: space.sm }}>
      <View style={[styles.mapBox, { height }]}>
        <MapView
          ref={map}
          style={StyleSheet.absoluteFill}
          initialRegion={toRegion(value ?? DEFAULT_CENTER, value ? delta : 0.3)}
          onPress={(e) => onChange({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}>
          {value && (
            <Marker
              coordinate={{ latitude: value.lat, longitude: value.lng }}
              draggable
              pinColor={colors.brand}
              onDragEnd={(e) => onChange({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
            />
          )}
          {value && radiusKm && (
            <Circle
              center={{ latitude: value.lat, longitude: value.lng }}
              radius={radiusKm * 1000}
              strokeColor={colors.brand}
              fillColor="rgba(249,115,22,0.12)"
            />
          )}
        </MapView>
      </View>
      <Row>
        <Button small variant="secondary" title="📍 Minha localização" onPress={locateMe} loading={busy === 'gps'} />
        {addressQuery !== undefined && (
          <Button small variant="secondary" title="🔎 Achar endereço" onPress={search} loading={busy === 'search'} />
        )}
      </Row>
      <Muted style={{ fontSize: 12 }}>
        {value ? 'Toque no mapa ou arraste o pino para ajustar.' : 'Toque no mapa para marcar o local.'}
      </Muted>
      <ErrorText message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  mapBox: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
});
