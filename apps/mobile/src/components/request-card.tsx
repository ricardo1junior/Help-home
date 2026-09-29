import { formatDate, formatDistance, type ServiceRequestWithCategory } from '@helphome/shared';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { colors, space } from '@/lib/theme';
import { RequestStatusBadge } from './badges';
import { Badge, Card, Muted } from './ui';

export function RequestCard({
  request,
  distanceKm,
  alreadyQuoted,
  showStatus = true,
}: {
  request: ServiceRequestWithCategory;
  distanceKm?: number | null;
  alreadyQuoted?: boolean;
  showStatus?: boolean;
}) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/pedido/[id]', params: { id: request.id } })}
      style={({ pressed }) => pressed && { opacity: 0.7 }}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
          <Muted style={{ flex: 1 }}>
            {request.category.icon} {request.category.name}
          </Muted>
          {showStatus && <RequestStatusBadge status={request.status} />}
        </View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{request.title}</Text>
        <Muted numberOfLines={2}>{request.description}</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' }}>
          <Muted style={{ fontSize: 13 }}>
            📍 {request.city}
            {distanceKm != null && ` · ${formatDistance(distanceKm)}`}
            {request.preferred_date && ` · ${formatDate(request.preferred_date)}`}
          </Muted>
          {alreadyQuoted && <Badge label="Orçamento enviado" bg="#dcfce7" fg="#166534" />}
        </View>
      </Card>
    </Pressable>
  );
}

export function EmptyState({ icon, title, text }: { icon: string; title: string; text?: string }) {
  return (
    <View style={{ alignItems: 'center', padding: space.xl, gap: space.sm }}>
      <Text style={{ fontSize: 40 }}>{icon}</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' }}>{title}</Text>
      {text && <Muted style={{ textAlign: 'center' }}>{text}</Muted>}
    </View>
  );
}
