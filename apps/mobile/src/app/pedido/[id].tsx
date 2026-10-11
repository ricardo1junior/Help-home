import { markNotificationsRead, setRequestStatus, type RequestStatus } from '@helphome/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, RefreshControl } from 'react-native';
import { ReviewsSection, WarrantySection } from '@/components/pedido/after';
import { loadRequestDetail } from '@/components/pedido/load';
import { PaymentSection } from '@/components/pedido/payment';
import { ClientQuotes, ProviderQuote } from '@/components/pedido/quotes';
import { ServiceSection } from '@/components/pedido/service';
import { RequestSummary, Stepper } from '@/components/pedido/summary';
import { ClientTracking, ProviderTrip } from '@/components/pedido/tracking';
import { EmptyState } from '@/components/request-card';
import { Button, ErrorText, Loading, Screen } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useNotifications } from '@/lib/notifications';
import { useData } from '@/lib/use-data';
import { useRealtime } from '@/lib/use-realtime';

export default function Pedido() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { version, refreshUnread } = useNotifications();
  const { data: detail, error, reload, refresh, refreshing, loading } = useData(
    () => (profile ? loadRequestDetail(id, profile) : Promise.resolve(null)),
    [id, profile?.id],
  );

  // Tudo o que muda no pedido aparece na hora, sem puxar a tela.
  useRealtime(
    `pedido-${id}`,
    [
      { table: 'service_requests', filter: `id=eq.${id}` },
      { table: 'quotes', filter: `request_id=eq.${id}` },
      { table: 'payments', filter: `request_id=eq.${id}` },
      { table: 'service_photos', filter: `request_id=eq.${id}` },
    ],
    () => void reload(),
  );

  // Avisos deste pedido contam como lidos ao abrir a tela (e recarrega se chegar outro).
  useEffect(() => {
    if (!profile) return;
    if (version) void reload();
    markNotificationsRead(supabase, profile.id, id)
      .then(refreshUnread)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, profile?.id, version]);

  /** Executa uma ação, mostra o erro se houver e recarrega a tela. */
  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (err) {
      Alert.alert('Não deu certo', toMessage(err));
    }
    await reload();
  }

  const setStatus = (status: RequestStatus) => act(() => setRequestStatus(supabase, id, status));
  const cancel = () => act(() => apiFetch(`/api/app/pedidos/${id}/cancelar`, { method: 'POST' }));

  if (loading || !profile) return <Loading />;
  if (!detail) {
    return (
      <Screen>
        <ErrorText message={error} />
        {!error && <EmptyState icon="🔍" title="Pedido não encontrado" />}
      </Screen>
    );
  }

  const { request, isClient, isParty } = detail;
  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Stepper request={request} />
      <ErrorText message={error} />
      <RequestSummary detail={detail} me={profile} onCancel={cancel} />
      {isClient ? <ClientTracking detail={detail} /> : <ProviderTrip detail={detail} act={act} />}
      <PaymentSection detail={detail} />
      {isParty && request.provider_id && request.status !== 'cancelled' && (
        <Button
          variant="secondary"
          title="💬 Conversar"
          onPress={() => router.push({ pathname: '/chat/[id]', params: { id } })}
        />
      )}
      <ServiceSection detail={detail} act={act} setStatus={setStatus} />
      <WarrantySection detail={detail} act={act} />
      <ReviewsSection detail={detail} act={act} />
      {isClient ? <ClientQuotes detail={detail} act={act} /> : <ProviderQuote detail={detail} act={act} />}
    </Screen>
  );
}
