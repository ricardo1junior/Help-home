import { listCategories, listClientRequests, REQUEST_STATUS_LABEL } from '@helphome/shared';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, Text, View } from 'react-native';
import { RequestCard } from '@/components/request-card';
import { Card, ErrorText, Loading, Muted, Screen, SectionTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useNotifications } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { colors, radius, space } from '@/lib/theme';
import { useData } from '@/lib/use-data';

export default function Inicio() {
  const router = useRouter();
  const { profile } = useAuth();
  const { version } = useNotifications();
  const { data, error, refresh, refreshing, loading } = useData(async () => {
    const [categories, requests] = await Promise.all([
      listCategories(supabase),
      listClientRequests(supabase, profile!.id),
    ]);
    return { categories, active: requests.filter((r) => !['completed', 'cancelled'].includes(r.status)) };
  }, [profile?.id, version]);

  if (loading) return <Loading />;
  const firstName = profile?.full_name.split(' ')[0];
  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>Olá, {firstName}! 👋</Text>
        <Muted style={{ fontSize: 15 }}>Do que sua casa precisa hoje?</Muted>
      </View>
      <ErrorText message={error} />

      {!!data?.active.length && (
        <View style={{ gap: space.md }}>
          <SectionTitle>Acontecendo agora</SectionTitle>
          {data.active.map((r) => (
            <View key={r.id} style={{ gap: 4 }}>
              <Muted style={{ fontSize: 12, fontWeight: '700', color: colors.brandDark }}>
                {r.en_route_at && !r.arrived_at && r.status === 'assigned'
                  ? '🚗 Profissional a caminho'
                  : REQUEST_STATUS_LABEL[r.status]}
              </Muted>
              <RequestCard request={r} showStatus={false} />
            </View>
          ))}
        </View>
      )}

      <View style={{ gap: space.md }}>
        <SectionTitle>Categorias</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {data?.categories.map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/novo', params: { categoria: String(c.id) } })}
              style={({ pressed }) => ({
                width: '31.5%',
                aspectRatio: 1,
                backgroundColor: pressed ? colors.brandLight : colors.card,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                padding: space.sm,
                gap: 6,
              })}>
              <Text style={{ fontSize: 34 }}>{c.icon}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center' }} numberOfLines={2}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Card style={{ backgroundColor: colors.brandLight, borderColor: colors.brandBorder }}>
        <Text style={{ fontWeight: '800', color: colors.brandDark }}>Por que pedir pelo Help Home?</Text>
        <Muted>🔒 Você só libera o pagamento depois do serviço feito.</Muted>
        <Muted>🧾 Profissionais com CNPJ conferido na Receita.</Muted>
        <Muted>🛡️ Garantia mínima de 90 dias registrada no app.</Muted>
        <Muted>🚗 Acompanhe o profissional chegando, como num app de corrida.</Muted>
      </Card>
    </Screen>
  );
}
