import { formatDateTime, formatPrice, PAYMENT_STATUS_LABEL } from '@helphome/shared';
import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { Button, Card, Muted, SectionTitle } from '@/components/ui';
import { colors } from '@/lib/theme';
import type { RequestDetail } from './load';

export function PaymentSection({ detail }: { detail: RequestDetail }) {
  const router = useRouter();
  const { request, payment, isClient, isChosenProvider, isParty } = detail;
  if (!isParty) return null;

  if (request.status === 'awaiting_payment') {
    return (
      <Card style={{ borderColor: colors.brand }}>
        {isClient ? (
          <>
            <SectionTitle>Falta pagar para confirmar o serviço</SectionTitle>
            <Muted>
              O valor fica retido com o Help Home e só vai para o prestador quando você confirmar que o serviço foi feito.
            </Muted>
            {payment && (
              <Button
                title={`Pagar ${formatPrice(payment.amount_cents)}`}
                onPress={() => router.push({ pathname: '/pagamento/[id]', params: { id: payment.id } })}
              />
            )}
          </>
        ) : (
          <>
            <SectionTitle>Seu orçamento foi aceito! 🎉</SectionTitle>
            <Muted>Aguardando o cliente pagar pelo app para você iniciar o serviço.</Muted>
          </>
        )}
      </Card>
    );
  }

  if (!payment || payment.status === 'pending') return null;
  return (
    <Card>
      <SectionTitle>Pagamento</SectionTitle>
      <Text style={{ color: colors.success, fontWeight: '600' }}>{PAYMENT_STATUS_LABEL[payment.status]}</Text>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>{formatPrice(payment.amount_cents)}</Text>
      {isChosenProvider && (
        <Muted>
          Você recebe {formatPrice(payment.provider_amount_cents)} (taxa Help Home de {formatPrice(payment.platform_fee_cents)}),
          liberado quando o cliente confirmar o serviço.
        </Muted>
      )}
      {payment.paid_at && <Muted style={{ fontSize: 12 }}>Pago em {formatDateTime(payment.paid_at)}</Muted>}
    </Card>
  );
}
