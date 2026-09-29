import { formatPrice, getPayment } from '@helphome/shared';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, ErrorText, Loading, Muted, Notice, Screen, SectionTitle } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { toMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors, space } from '@/lib/theme';
import { useData } from '@/lib/use-data';

export default function Pagamento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: payment, error, reload, loading } = useData(() => getPayment(supabase, id), [id]);
  const [testMode, setTestMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function done() {
    if (payment) router.replace({ pathname: '/pedido/[id]', params: { id: payment.request_id } });
  }

  async function pay() {
    setActionError(null);
    setBusy(true);
    try {
      const res = await apiFetch<{ url?: string; testMode?: boolean }>(`/api/app/pagamentos/${id}/checkout`, {
        method: 'POST',
      });
      if (res.testMode) {
        setTestMode(true);
        return;
      }
      if (res.url) {
        // Abre o checkout do Mercado Pago. Ao terminar, o site manda de volta para o app.
        await WebBrowser.openAuthSessionAsync(res.url, 'helphome://');
        const updated = await getPayment(supabase, id);
        if (updated && updated.status !== 'pending') done();
        else await reload();
      }
    } catch (err) {
      setActionError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function approveTest() {
    setActionError(null);
    setBusy(true);
    try {
      await apiFetch(`/api/app/pagamentos/${id}/simular`, { method: 'POST' });
      done();
    } catch (err) {
      setActionError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;
  if (!payment) return <Screen><ErrorText message={error ?? 'Pagamento não encontrado.'} /></Screen>;

  return (
    <Screen>
      <Card>
        <Muted>Total do serviço</Muted>
        <Text style={{ fontSize: 32, fontWeight: '800', color: colors.text }}>{formatPrice(payment.amount_cents)}</Text>
        <Muted style={{ fontSize: 13 }}>Pix, cartão ou boleto pelo Mercado Pago.</Muted>
      </Card>
      <Card>
        <SectionTitle>Como funciona</SectionTitle>
        <Step n={1} text="Você paga pelo app e o valor fica retido com segurança." />
        <Step n={2} text="O profissional faz o serviço, com fotos de antes e depois." />
        <Step n={3} text="Você confirma e só então o pagamento é liberado." />
        <Step n={4} text="O serviço fica registrado no app com garantia de pelo menos 90 dias." />
      </Card>
      {payment.status !== 'pending' ? (
        <>
          <Notice tone="success">Pagamento recebido! 🎉</Notice>
          <Button title="Voltar para o pedido" onPress={done} />
        </>
      ) : testMode ? (
        <>
          <Notice>
            Modo de teste: o Mercado Pago ainda não foi configurado no site. Nenhum valor será cobrado.
          </Notice>
          <Button title="Aprovar pagamento de teste" onPress={approveTest} loading={busy} />
        </>
      ) : (
        <Button title={`Pagar ${formatPrice(payment.amount_cents)}`} onPress={pay} loading={busy} />
      )}
      <ErrorText message={actionError} />
    </Screen>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <Text style={{ color: colors.brandDark, fontWeight: '800' }}>{n}.</Text>
      <Text style={{ color: colors.text, flex: 1 }}>{text}</Text>
    </View>
  );
}
