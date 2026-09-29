import {
  addServicePhoto,
  deadlineFrom,
  deleteServicePhoto,
  formatDate,
  formatDateTime,
  formatHours,
  type PhotoKind,
  type RequestStatus,
} from '@helphome/shared';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { VerifiedBadge } from '@/components/badges';
import { PhotoStrip } from '@/components/photo-strip';
import { Button, Card, Label, Muted, Row, SectionTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { askPhotoSource, pickPhotos, uploadAsset } from '@/lib/photos';
import { supabase } from '@/lib/supabase';
import { colors, radius, space } from '@/lib/theme';
import type { RequestDetail } from './load';

type Act = (fn: () => Promise<unknown>) => Promise<void>;

export function ServiceSection({
  detail,
  act,
  setStatus,
}: {
  detail: RequestDetail;
  act: Act;
  setStatus: (s: RequestStatus) => Promise<void>;
}) {
  const { request, isClient, isChosenProvider, isParty, paid, otherParty, quotes } = detail;
  if (!paid || !otherParty || !isParty) return null;
  const accepted = quotes.find((q) => q.status === 'accepted');
  const deadline = request.started_at && accepted ? deadlineFrom(request.started_at, accepted.estimated_hours) : null;
  const finishedOrNow = request.finished_at ? new Date(request.finished_at) : new Date();
  const isLate = deadline ? finishedOrNow > deadline : false;
  const phone = otherParty.phone?.replace(/\D/g, '') ?? '';

  return (
    <Card>
      <SectionTitle>{isClient ? 'Profissional' : 'Cliente'}</SectionTitle>
      <Row>
        <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>
          {isClient ? otherParty.company_name || otherParty.full_name : otherParty.full_name}
        </Text>
        {isClient && <VerifiedBadge verified={otherParty.cnpj_verified} />}
      </Row>
      {isClient && otherParty.company_name && <Muted>{otherParty.full_name}</Muted>}
      {otherParty.city && <Muted>{otherParty.city}</Muted>}
      {phone && (
        <Button
          small
          variant="secondary"
          title={`WhatsApp: ${otherParty.phone}`}
          onPress={() => Linking.openURL(`https://wa.me/${phone.length <= 11 ? `55${phone}` : phone}`)}
        />
      )}
      {accepted && (
        <View style={{ backgroundColor: colors.background, borderRadius: radius.md, padding: space.md, gap: 6 }}>
          <Fact label="Tempo estimado" value={formatHours(accepted.estimated_hours)} />
          <Fact
            label={request.started_at ? 'Prazo final' : 'Início'}
            value={deadline ? `${formatDateTime(deadline.toISOString())}${isLate ? ' · atrasado' : ''}` : 'Ainda não iniciado'}
            danger={isLate}
          />
          <Fact
            label="Garantia"
            value={
              request.warranty_until ? `até ${formatDate(request.warranty_until)}` : `${accepted.warranty_days} dias após a conclusão`
            }
          />
        </View>
      )}
      {isChosenProvider && request.status === 'assigned' && (
        <>
          <Button title="Iniciar serviço (começa a contar o prazo)" onPress={() => setStatus('in_progress')} />
          <Muted style={{ fontSize: 12 }}>Envie pelo menos uma foto de antes para iniciar.</Muted>
        </>
      )}
      {isChosenProvider && request.status === 'in_progress' && (
        <>
          <Button
            title="Finalizar serviço"
            onPress={async () => {
              if (await confirm('Finalizar o serviço?', 'O cliente vai confirmar para liberar o pagamento.', 'Finalizar'))
                await setStatus('awaiting_confirmation');
            }}
          />
          <Muted style={{ fontSize: 12 }}>Envie pelo menos uma foto de depois para finalizar.</Muted>
        </>
      )}
      {isClient && request.status === 'awaiting_confirmation' && (
        <Button
          title="Confirmar serviço e liberar pagamento"
          onPress={async () => {
            if (
              await confirm(
                'Confirmar que o serviço foi feito?',
                'O pagamento será liberado ao prestador.',
                'Confirmar',
              )
            )
              await setStatus('completed');
          }}
        />
      )}
      <ServicePhotos detail={detail} act={act} />
    </Card>
  );
}

function Fact({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
      <Muted style={{ fontSize: 13 }}>{label}</Muted>
      <Text style={{ fontWeight: '600', color: danger ? colors.danger : colors.text, flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

const PHOTO_LABEL: Record<PhotoKind, string> = { before: 'Fotos de antes', after: 'Fotos de depois' };

function ServicePhotos({ detail, act }: { detail: RequestDetail; act: Act }) {
  const { profile } = useAuth();
  const [busy, setBusy] = useState<PhotoKind | null>(null);
  const { request, photos, isChosenProvider } = detail;
  const canUpload = isChosenProvider && ['assigned', 'in_progress', 'awaiting_confirmation'].includes(request.status);

  async function add(kind: PhotoKind) {
    const source = await askPhotoSource();
    if (!source) return;
    const picked = await pickPhotos(source, 5);
    if (!picked.length) return;
    setBusy(kind);
    await act(async () => {
      for (const asset of picked) {
        const url = await uploadAsset(profile!.id, asset);
        await addServicePhoto(supabase, profile!.id, request.id, kind, url);
      }
    });
    setBusy(null);
  }

  return (
    <View style={{ gap: space.md, marginTop: space.sm }}>
      {(['before', 'after'] as const).map((kind) => {
        const list = photos.filter((p) => p.kind === kind);
        return (
          <View key={kind} style={{ gap: 6 }}>
            <Label>{PHOTO_LABEL[kind]}</Label>
            {list.length === 0 && !canUpload ? (
              <Muted style={{ fontSize: 13 }}>Nenhuma foto ainda.</Muted>
            ) : (
              <PhotoStrip
                uris={list.map((p) => p.url)}
                onAdd={canUpload ? () => add(kind) : undefined}
                adding={busy === kind}
                onRemove={
                  canUpload
                    ? async (i) => {
                        if (await confirm('Remover esta foto?', undefined, 'Remover', true))
                          await act(() => deleteServicePhoto(supabase, list[i].id));
                      }
                    : undefined
                }
              />
            )}
          </View>
        );
      })}
    </View>
  );
}
