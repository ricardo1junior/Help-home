import { listNotifications, markNotificationsRead } from '@helphome/shared';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';
import { NOTIFICATION_ICON, timeAgo } from '@/components/notification-ui';
import { EmptyState } from '@/components/request-card';
import { ErrorText, Loading, Muted, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useNotifications } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { colors, radius, space } from '@/lib/theme';
import { useData } from '@/lib/use-data';

export default function Notificacoes() {
  const router = useRouter();
  const { profile } = useAuth();
  const { version, refreshUnread } = useNotifications();
  const { data, error, refresh, refreshing, loading } = useData(
    () => listNotifications(supabase, profile!.id),
    [profile?.id, version],
  );

  // Ao abrir, marca tudo como lido (o destaque continua nesta visita).
  useEffect(() => {
    if (!profile) return;
    markNotificationsRead(supabase, profile.id)
      .then(refreshUnread)
      .catch(() => {});
  }, [profile, version, refreshUnread]);

  if (loading) return <Loading />;
  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <ErrorText message={error} />
      {data?.length === 0 && (
        <EmptyState icon="🔔" title="Nenhum aviso ainda" text="Orçamentos, pagamentos, mensagens e o andamento dos serviços aparecem aqui." />
      )}
      {data?.map((n) => (
        <Pressable
          key={n.id}
          accessibilityRole="button"
          disabled={!n.request_id}
          onPress={() => n.request_id && router.push({ pathname: '/pedido/[id]', params: { id: n.request_id } })}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              gap: space.md,
              padding: space.md,
              borderRadius: radius.lg,
              backgroundColor: n.read_at ? colors.card : colors.brandLight,
              borderWidth: 1,
              borderColor: n.read_at ? colors.border : colors.brandBorder,
            },
            pressed && { opacity: 0.7 },
          ]}>
          <Text style={{ fontSize: 24 }}>{NOTIFICATION_ICON[n.kind] ?? '🔔'}</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>{n.title}</Text>
            {n.body ? <Muted style={{ fontSize: 13 }}>{n.body}</Muted> : null}
            <Muted style={{ fontSize: 11 }}>{timeAgo(n.created_at)}</Muted>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}
