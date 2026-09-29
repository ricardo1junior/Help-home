import {
  CLAIM_STATUS_LABEL,
  createReview,
  createWarrantyClaim,
  formatDate,
  formatDateTime,
  resolveWarrantyClaim,
} from '@helphome/shared';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Stars } from '@/components/badges';
import { StarsInput } from '@/components/stars-input';
import { Button, Card, ErrorText, Input, Muted, Row, SectionTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { toMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors, space } from '@/lib/theme';
import type { RequestDetail } from './load';

type Act = (fn: () => Promise<unknown>) => Promise<void>;

export function WarrantySection({ detail, act }: { detail: RequestDetail; act: Act }) {
  const { profile } = useAuth();
  const { request, claims, isClient, isChosenProvider, isParty } = detail;
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  if (request.status !== 'completed' || !isParty || !request.warranty_until) return null;
  const active = new Date(`${request.warranty_until}T23:59:59`) >= new Date();

  async function submit() {
    setError(null);
    setSending(true);
    try {
      await createWarrantyClaim(supabase, profile!.id, request.id, { description });
      setDescription('');
      await act(async () => {});
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <SectionTitle>Garantia</SectionTitle>
      <Muted>
        {active
          ? `Serviço garantido até ${formatDate(request.warranty_until)}.`
          : `Garantia encerrada em ${formatDate(request.warranty_until)}.`}
      </Muted>
      {claims.map((c) => (
        <View key={c.id} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: space.md, gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Muted style={{ fontSize: 12 }}>{formatDateTime(c.created_at)}</Muted>
            <Text style={{ fontSize: 12, fontWeight: '600', color: c.status === 'open' ? colors.warning : colors.success }}>
              {CLAIM_STATUS_LABEL[c.status]}
            </Text>
          </Row>
          <Text style={{ color: colors.text }}>{c.description}</Text>
          {isChosenProvider && c.status === 'open' && (
            <Button
              small
              variant="secondary"
              title="Marcar como resolvido"
              onPress={async () => {
                if (await confirm('Marcar como resolvido?')) await act(() => resolveWarrantyClaim(supabase, c.id));
              }}
            />
          )}
        </View>
      ))}
      {isClient && active && (
        <>
          <Input
            label="Deu problema? Acione a garantia"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Conte o que aconteceu depois do serviço"
          />
          <ErrorText message={error} />
          <Button variant="secondary" title="Acionar garantia" onPress={submit} loading={sending} />
        </>
      )}
    </Card>
  );
}

export function ReviewsSection({ detail, act }: { detail: RequestDetail; act: Act }) {
  const { profile } = useAuth();
  const { request, reviews, otherParty, isClient, isParty } = detail;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  if (request.status !== 'completed' || !isParty || !otherParty) return null;
  const mine = reviews.find((r) => r.reviewer_id === profile?.id);
  const aboutMe = reviews.find((r) => r.reviewee_id === profile?.id);
  const name = isClient ? otherParty.company_name || otherParty.full_name : otherParty.full_name;

  async function submit() {
    setError(null);
    setSending(true);
    try {
      await createReview(supabase, profile!.id, otherParty!.id, request.id, { rating, comment });
      await act(async () => {});
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <SectionTitle>Avaliações</SectionTitle>
      {mine ? (
        <View style={{ gap: 2 }}>
          <Muted style={{ fontSize: 13 }}>Sua avaliação</Muted>
          <Stars value={mine.rating} size={20} />
          {mine.comment ? <Text style={{ color: colors.text }}>“{mine.comment}”</Text> : null}
        </View>
      ) : (
        <>
          <Text style={{ color: colors.text }}>Como foi com {name}?</Text>
          <StarsInput value={rating} onChange={setRating} />
          <Input label="Comentário (opcional)" value={comment} onChangeText={setComment} multiline />
          <ErrorText message={error} />
          <Button title="Enviar avaliação" onPress={submit} loading={sending} />
        </>
      )}
      {aboutMe && (
        <View style={{ gap: 2, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm }}>
          <Muted style={{ fontSize: 13 }}>Avaliação que você recebeu</Muted>
          <Stars value={aboutMe.rating} size={20} />
          {aboutMe.comment ? <Text style={{ color: colors.text }}>“{aboutMe.comment}”</Text> : null}
        </View>
      )}
    </Card>
  );
}
