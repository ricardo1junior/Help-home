import { distanceKm, formatDate, formatDistance, type LatLng, type Profile, type RequestStatus } from '@helphome/shared';
import { Image } from 'expo-image';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Circle, MapView, Marker } from '@/components/native-map';
import { ratingText, RequestStatusBadge } from '@/components/badges';
import { Button, Card, Muted } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { toRegion } from '@/lib/location';
import { colors, radius, space } from '@/lib/theme';
import type { RequestDetail } from './load';

const STEPS: { status: RequestStatus; label: string }[] = [
  { status: 'open', label: 'Orçamentos' },
  { status: 'awaiting_payment', label: 'Pagamento' },
  { status: 'assigned', label: 'Agendado' },
  { status: 'in_progress', label: 'Em andamento' },
  { status: 'awaiting_confirmation', label: 'Confirmação' },
  { status: 'completed', label: 'Concluído' },
];

export function Stepper({ status }: { status: RequestStatus }) {
  if (status === 'cancelled') return null;
  const current = STEPS.findIndex((s) => s.status === status);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
      {STEPS.map((s, i) => (
        <Text
          key={s.status}
          style={[
            styles.step,
            i < current && { backgroundColor: '#ffedd5', color: colors.brandDark },
            i === current && { backgroundColor: colors.brand, color: '#fff' },
          ]}>
          {s.label}
        </Text>
      ))}
    </ScrollView>
  );
}

export function RequestSummary({
  detail,
  me,
  onCancel,
}: {
  detail: RequestDetail;
  me: Profile;
  onCancel: () => Promise<void>;
}) {
  const { request, isClient, isParty, isChosenProvider, exactLocation, clientRating } = detail;
  const approx =
    request.approx_lat != null && request.approx_lng != null ? { lat: request.approx_lat, lng: request.approx_lng } : null;
  const point = exactLocation ?? approx;
  const base = me.role === 'provider' && me.base_lat != null && me.base_lng != null ? { lat: me.base_lat, lng: me.base_lng } : null;
  const fromBase = base && point ? distanceKm(base, point) : null;
  const canCancel = isClient && ['open', 'awaiting_payment', 'assigned'].includes(request.status);

  async function cancel() {
    const ok = await confirm(
      'Cancelar pedido?',
      request.status === 'assigned' ? 'O valor pago será estornado.' : undefined,
      'Cancelar pedido',
      true,
    );
    if (ok) await onCancel();
  }

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
        <Muted style={{ flex: 1 }}>
          {request.category.icon} {request.category.name}
        </Muted>
        <RequestStatusBadge status={request.status} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{request.title}</Text>
      <Text style={{ color: '#334155', fontSize: 15, lineHeight: 21 }}>{request.description}</Text>
      <Info label="Local" value={isParty ? `${request.address}, ${request.city}` : request.city} />
      <Info label="Data preferida" value={request.preferred_date ? formatDate(request.preferred_date) : 'A combinar'} />
      {isClient ? (
        <Info label="Publicado em" value={formatDate(request.created_at)} />
      ) : (
        <Info label="Cliente" value={ratingText(clientRating?.average, clientRating?.total ?? 0)} />
      )}
      {point && <LocationPreview exact={exactLocation} approx={approx} icon={request.category.icon} />}
      {point && (
        <Muted style={{ fontSize: 12 }}>
          {exactLocation ? 'Local exato do serviço' : 'Região aproximada. O endereço exato aparece se o cliente escolher você.'}
          {fromBase != null && ` · a ${formatDistance(fromBase)} da sua base`}
        </Muted>
      )}
      {exactLocation && isChosenProvider && (
        <Button small variant="secondary" title="🧭 Como chegar" onPress={() => openDirections(exactLocation)} />
      )}
      {request.photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {request.photos.map((url) => (
            <Image key={url} source={{ uri: url }} style={styles.photo} contentFit="cover" />
          ))}
        </ScrollView>
      )}
      {canCancel && (
        <Button
          variant="danger"
          title={request.status === 'assigned' ? 'Cancelar e pedir estorno' : 'Cancelar pedido'}
          onPress={cancel}
          style={{ marginTop: space.sm }}
        />
      )}
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Muted style={{ fontSize: 12 }}>{label}</Muted>
      <Text style={{ color: colors.text, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

function LocationPreview({ exact, approx, icon }: { exact: LatLng | null; approx: LatLng | null; icon: string }) {
  const point = (exact ?? approx)!;
  return (
    <View style={styles.map}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={toRegion(point, exact ? 0.01 : 0.03)}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}>
        {exact ? (
          <Marker coordinate={{ latitude: exact.lat, longitude: exact.lng }} title={icon} pinColor={colors.brand} />
        ) : (
          <Circle
            center={{ latitude: point.lat, longitude: point.lng }}
            radius={900}
            strokeColor={colors.brand}
            fillColor="rgba(249,115,22,0.15)"
          />
        )}
      </MapView>
    </View>
  );
}

function openDirections({ lat, lng }: LatLng) {
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  void Linking.openURL(url);
}

const styles = StyleSheet.create({
  step: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    color: colors.muted,
  },
  map: { height: 170, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  photo: { width: 96, height: 96, borderRadius: radius.md },
});
