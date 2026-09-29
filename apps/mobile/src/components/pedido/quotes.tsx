import {
  acceptQuote,
  formatHours,
  formatPrice,
  MIN_WARRANTY_DAYS,
  parsePriceToCents,
  sendQuote,
  withdrawQuote,
} from '@helphome/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { QuoteStatusBadge, ratingText, VerifiedBadge } from '@/components/badges';
import { Button, Card, ErrorText, Input, Muted, Row, SectionTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { toMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors, space } from '@/lib/theme';
import type { RequestDetail } from './load';

type Act = (fn: () => Promise<unknown>) => Promise<void>;

/** Cliente: compara os orçamentos e aceita um. */
export function ClientQuotes({ detail, act }: { detail: RequestDetail; act: Act }) {
  const router = useRouter();
  const { request, quotes, ratings } = detail;
  const visible = quotes.filter((q) => q.status !== 'withdrawn');
  if (request.status !== 'open' && visible.length === 0) return null;

  async function accept(quoteId: string, priceCents: number) {
    const ok = await confirm(
      'Aceitar este orçamento?',
      `Você vai pagar ${formatPrice(priceCents)} pelo app. O valor fica retido até você confirmar o serviço.`,
      'Aceitar e pagar',
    );
    if (!ok) return;
    let paymentId: string | null = null;
    await act(async () => {
      paymentId = await acceptQuote(supabase, quoteId);
    });
    if (paymentId) router.push({ pathname: '/pagamento/[id]', params: { id: paymentId } });
  }

  return (
    <Card>
      <SectionTitle>Orçamentos ({visible.length})</SectionTitle>
      {visible.length === 0 && (
        <Muted>Ainda não chegaram orçamentos. Os profissionais da sua região já podem ver seu pedido.</Muted>
      )}
      {visible.map((q) => {
        const rating = ratings.get(q.provider_id);
        return (
          <View key={q.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.md, gap: 4 }}>
            <Row>
              <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>
                {q.provider.company_name || q.provider.full_name}
              </Text>
              <VerifiedBadge verified={q.provider.cnpj_verified} />
            </Row>
            <Text style={{ color: colors.text }}>{ratingText(rating?.average, rating?.total ?? 0, rating?.late_jobs)}</Text>
            <Muted style={{ fontSize: 13 }}>
              Leva cerca de {formatHours(q.estimated_hours)} · garantia de {q.warranty_days} dias
            </Muted>
            {q.message ? <Muted>{q.message}</Muted> : null}
            <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{formatPrice(q.price_cents)}</Text>
              {request.status === 'open' && q.status === 'pending' ? (
                <Button small title="Aceitar e pagar" onPress={() => accept(q.id, q.price_cents)} />
              ) : (
                <QuoteStatusBadge status={q.status} />
              )}
            </Row>
          </View>
        );
      })}
    </Card>
  );
}

/** Prestador: envia, vê ou retira o seu orçamento. */
export function ProviderQuote({ detail, act }: { detail: RequestDetail; act: Act }) {
  const { profile } = useAuth();
  const { request, quotes } = detail;
  const mine = quotes.find((q) => q.provider_id === profile?.id);
  const [form, setForm] = useState({ price: '', hours: '', warranty: String(MIN_WARRANTY_DAYS), message: '' });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function submit() {
    setError(null);
    const price = parsePriceToCents(form.price);
    if (!price) return setError('Informe um valor válido.');
    const hours = Number(form.hours.replace(',', '.'));
    if (!hours || hours <= 0) return setError('Informe quanto tempo o serviço vai levar.');
    setSending(true);
    try {
      await sendQuote(supabase, profile!.id, request.id, {
        price_cents: price,
        estimated_hours: hours,
        warranty_days: Number(form.warranty),
        message: form.message,
      });
      await act(async () => {});
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <SectionTitle>Seu orçamento</SectionTitle>
      {mine && mine.status !== 'withdrawn' ? (
        <>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{formatPrice(mine.price_cents)}</Text>
            <QuoteStatusBadge status={mine.status} />
          </Row>
          <Muted style={{ fontSize: 13 }}>
            {formatHours(mine.estimated_hours)} · garantia de {mine.warranty_days} dias
          </Muted>
          {mine.message ? <Muted>{mine.message}</Muted> : null}
          {mine.status === 'pending' && request.status === 'open' && (
            <Button
              small
              variant="secondary"
              title="Retirar orçamento"
              onPress={async () => {
                if (await confirm('Retirar seu orçamento?', undefined, 'Retirar', true))
                  await act(() => withdrawQuote(supabase, mine.id));
              }}
            />
          )}
        </>
      ) : request.status === 'open' && !mine ? (
        <>
          <Input label="Valor (R$)" value={form.price} onChangeText={set('price')} keyboardType="decimal-pad" placeholder="150,00" />
          <Input
            label="Tempo estimado (horas)"
            value={form.hours}
            onChangeText={set('hours')}
            keyboardType="decimal-pad"
            placeholder="2"
            hint="Se passar do tempo, sua nota cai 0,5 a cada 50% de atraso."
          />
          <Input
            label="Garantia (dias)"
            value={form.warranty}
            onChangeText={set('warranty')}
            keyboardType="number-pad"
            hint={`Mínimo de ${MIN_WARRANTY_DAYS} dias pelo Código de Defesa do Consumidor.`}
          />
          <Input
            label="Mensagem (opcional)"
            value={form.message}
            onChangeText={set('message')}
            multiline
            placeholder="O que está incluso, material, disponibilidade…"
          />
          <ErrorText message={error} />
          <Button title="Enviar orçamento" onPress={submit} loading={sending} />
        </>
      ) : (
        <Muted>
          {mine?.status === 'withdrawn'
            ? 'Você retirou seu orçamento para este pedido.'
            : 'Este pedido não está mais recebendo orçamentos.'}
        </Muted>
      )}
    </Card>
  );
}
