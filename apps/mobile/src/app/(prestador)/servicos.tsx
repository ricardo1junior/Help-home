import { formatPrice, listProviderJobs, listProviderQuotes } from '@helphome/shared';
import { RefreshControl, View } from 'react-native';
import { QuoteStatusBadge } from '@/components/badges';
import { EmptyState, RequestCard } from '@/components/request-card';
import { ErrorText, Loading, Muted, Row, Screen, SectionTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { space } from '@/lib/theme';
import { useData } from '@/lib/use-data';

export default function Servicos() {
  const { profile } = useAuth();
  const { data, error, refresh, refreshing, loading } = useData(async () => {
    const [jobs, quotes] = await Promise.all([
      listProviderJobs(supabase, profile!.id),
      listProviderQuotes(supabase, profile!.id),
    ]);
    return {
      active: jobs.filter((j) => !['completed', 'cancelled'].includes(j.status)),
      done: jobs.filter((j) => ['completed', 'cancelled'].includes(j.status)),
      quotes: quotes.filter((q) => q.status === 'pending' || (q.status !== 'accepted' && q.request.status === 'open')),
    };
  }, [profile?.id]);

  if (loading) return <Loading />;
  const empty = data && !data.active.length && !data.done.length && !data.quotes.length;
  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <ErrorText message={error} />
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
