import type { NotificationKind } from '@helphome/shared';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '@/lib/notifications';
import { colors, radius, space } from '@/lib/theme';

export const NOTIFICATION_ICON: Record<NotificationKind, string> = {
  new_request: '📍',
  new_quote: '💰',
  quote_accepted: '🎉',
  quote_rejected: '🙁',
  paid: '🔒',
  en_route: '🚗',
  arrived: '🏠',
  started: '🛠️',
  finished: '✅',
  completed: '⭐',
  cancelled: '✖️',
  message: '💬',
  review: '⭐',
  warranty: '🛡️',
};

/** Sino com o número de avisos não lidos (fica no topo das abas). */
export function NotificationBell() {
  const router = useRouter();
  const { unread } = useNotifications();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread ? `Avisos, ${unread} não lidos` : 'Avisos'}
      onPress={() => router.push('/notificacoes')}
      hitSlop={10}
      style={{ marginRight: space.lg }}>
      <Text style={{ fontSize: 22 }}>🔔</Text>
      {unread > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: -8,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: colors.danger,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
          }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Faixa que desce no topo quando chega um aviso com o app aberto. */
export function NotificationBanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { latest, dismissLatest } = useNotifications();

  useEffect(() => {
    if (!latest) return;
    const timer = setTimeout(dismissLatest, 5000);
    return () => clearTimeout(timer);
  }, [latest, dismissLatest]);

  if (!latest) return null;
  return (
    <Animated.View
      key={latest.id}
      entering={SlideInUp}
      exiting={SlideOutUp}
      style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, zIndex: 100 }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          dismissLatest();
          if (latest.request_id) router.push({ pathname: '/pedido/[id]', params: { id: latest.request_id } });
        }}
        style={{
          flexDirection: 'row',
          gap: space.md,
          alignItems: 'center',
          backgroundColor: colors.text,
          borderRadius: radius.lg,
          padding: space.md,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}>
        <Text style={{ fontSize: 26 }}>{NOTIFICATION_ICON[latest.kind] ?? '🔔'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }} numberOfLines={1}>
            {latest.title}
          </Text>
          {latest.body ? (
            <Text style={{ color: '#cbd5e1', fontSize: 13 }} numberOfLines={2}>
              {latest.body}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** "agora", "há 5 min", "há 2 h", "ontem"… */
export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 172800) return 'ontem';
  return new Date(iso).toLocaleDateString('pt-BR');
}
