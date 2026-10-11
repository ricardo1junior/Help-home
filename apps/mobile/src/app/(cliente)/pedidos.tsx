import { listClientRequests } from '@helphome/shared';
import { useRouter } from 'expo-router';
import { RefreshControl } from 'react-native';
import { EmptyState, RequestCard } from '@/components/request-card';
import { Button, ErrorText, Loading, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useNotifications } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useData } from '@/lib/use-data';

export default function MeusPedidos() {
  const router = useRouter();
  const { profile } = useAuth();
  const { version } = useNotifications();
  const { data, error, refresh, refreshing, loading } = useData(
    () => listClientRequests(supabase, profile!.id),
    [profile?.id, version],
  );

  if (loading) return <Loading />;
  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <ErrorText message={error} />
      {data?.length === 0 ? (
        <>
          <EmptyState
            icon="🧰"
            title="Você ainda não fez nenhum pedido"
            text="Descreva o que precisa e receba orçamentos de profissionais com CNPJ perto de você."
          />
          <Button title="Pedir um serviço" onPress={() => router.push('/novo')} />
        </>
      ) : (
        data?.map((r) => <RequestCard key={r.id} request={r} />)
      )}
    </Screen>
  );
}
