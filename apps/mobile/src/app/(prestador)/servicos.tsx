import { formatPrice, listProviderJobs, listProviderPayments, listProviderQuotes } from '@helphome/shared';
import { RefreshControl, Text, View } from 'react-native';
import { QuoteStatusBadge } from '@/components/badges';
import { EmptyState, RequestCard } from '@/components/request-card';
import { Card, ErrorText, Loading, Muted, Row, Screen, SectionTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useNotifications } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { colors, space } from '@/lib/theme';
import { useData } from '@/lib/use-data';

export default function Servicos() {
  const { profile } = useAuth();
  const { version } = useNotifications();
  const { data, error, refresh, refreshing, loading } = useData(async () => {
    const [jobs, quotes, payments] = await Promise.all([
      listProviderJobs(supabase, profile!.id),
      listProviderQuotes(supabase, profile!.id),
      listProviderPayments(supabase, profile!.id),
    ]);
    const sum = (status: string) =>
      payments.filter((p) => p.status === status).reduce((t, p) => t + p.provider_amount_cents, 0);
    return {
      active: jobs.filter((j) => !['completed', 'cancelled'].includes(j.status)),
      done: jobs.filter((j) => ['completed', 'cancelled'].includes(j.status)),
      held: sum('held'),
      released: sum('released'),
      quotes: quotes.filter((q) => q.status === 'pending' || (q.status !== 'accepted' && q.request.status === 'open')),
    };
  }, [profile?.id, version]);

  if (loading) return <Loading />;
  const empty = data && !data.active.length && !data.done.length && !data.quotes.length;
  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <ErrorText message={error} />
      {data && (data.held > 0 || data.released > 0) && (
        <Row style={{ flexWrap: 'nowrap' }}>
          <Card style={{ flex: 1 }}>
            <Muted style={{ fontSize: 12 }}>A receber</Muted>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{formatPrice(data.held)}</Text>
            <Muted style={{ fontSize: 11 }}>Liberado quando o cliente confirmar</Muted>
          </Card>
          <Card style={{ flex: 1 }}>
            <Muted style={{ fontSize: 12 }}>Ganhos liberados</Muted>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.success }}>{formatPrice(data.released)}</Text>
            <Muted style={{ fontSize: 11 }}>Já descontada a taxa</Muted>
          </Card>
        </Row>
      )}
      {empty && (
        <EmptyState
          icon="🧰"
          title="Nenhum serviço ainda"
          text="Envie orçamentos na aba Disponíveis. Quando um cliente aceitar e pagar, o serviço aparece aqui."
        />
      )}
      {!!data?.active.length && (
        <View style={{ gap: space.md }}>
          <SectionTitle>Em andamento</SectionTitle>
          {data.active.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </View>
      )}
      {!!data?.quotes.length && (
        <View style={{ gap: space.md }}>
          <SectionTitle>Orçamentos enviados</SectionTitle>
          {data.quotes.map((q) => (
            <View key={q.id} style={{ gap: 6 }}>
              <Row>
                <Muted style={{ fontWeight: '700' }}>{formatPrice(q.price_cents)}</Muted>
                <QuoteStatusBadge status={q.status} />
              </Row>
              <RequestCard request={q.request} showStatus={false} />
            </View>
          ))}
        </View>
      )}
      {!!data?.done.length && (
        <View style={{ gap: space.md }}>
          <SectionTitle>Concluídos e cancelados</SectionTitle>
          {data.done.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </View>
      )}
    </Screen>
  );
}
