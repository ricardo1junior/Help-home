import {
  QUOTE_STATUS_LABEL,
  REQUEST_STATUS_LABEL,
  type QuoteStatus,
  type RequestStatus,
} from '@helphome/shared';
import { Text } from 'react-native';
import { colors } from '@/lib/theme';
import { Badge } from './ui';

const REQUEST_TONE: Record<RequestStatus, [string, string]> = {
  open: ['#fef3c7', '#92400e'],
  awaiting_payment: ['#ffedd5', '#9a3412'],
  assigned: ['#dbeafe', '#1e40af'],
  in_progress: ['#e0e7ff', '#3730a3'],
  awaiting_confirmation: ['#f3e8ff', '#6b21a8'],
  completed: ['#dcfce7', '#166534'],
  cancelled: ['#e2e8f0', '#475569'],
};

const QUOTE_TONE: Record<QuoteStatus, [string, string]> = {
  pending: ['#fef3c7', '#92400e'],
  accepted: ['#dcfce7', '#166534'],
  rejected: ['#e2e8f0', '#475569'],
  withdrawn: ['#e2e8f0', '#475569'],
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const [bg, fg] = REQUEST_TONE[status];
  return <Badge label={REQUEST_STATUS_LABEL[status]} bg={bg} fg={fg} />;
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const [bg, fg] = QUOTE_TONE[status];
  return <Badge label={QUOTE_STATUS_LABEL[status]} bg={bg} fg={fg} />;
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge label="CNPJ verificado" bg="#dcfce7" fg="#166534" />
  ) : (
    <Badge label="CNPJ informado" bg="#f1f5f9" fg="#475569" />
  );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <Text style={{ fontSize: size, color: colors.star }} accessibilityLabel={`${value} de 5 estrelas`}>
      {'★'.repeat(full)}
      <Text style={{ color: '#cbd5e1' }}>{'★'.repeat(5 - full)}</Text>
    </Text>
  );
}

export function ratingText(average: number | null | undefined, total: number, lateJobs = 0) {
  if (!total && !lateJobs) return 'Novo no Help Home';
  let text = `★ ${average?.toFixed(1)}`;
  if (total) text += ` (${total} avaliaç${total === 1 ? 'ão' : 'ões'})`;
  if (lateJobs) text += ` · ${lateJobs} fora do prazo`;
  return text;
}
