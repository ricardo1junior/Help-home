import { formatDate, getProviderPublicProfile } from '@helphome/shared';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Stars, VerifiedBadge } from '@/components/badges';
import { timeAgo } from '@/components/notification-ui';
import { EmptyState } from '@/components/request-card';
import { Badge, Card, ErrorText, Loading, Muted, Row, Screen, SectionTitle } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, radius, space } from '@/lib/theme';
import { useData } from '@/lib/use-data';

export default function Profissional() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading } = useData(() => getProviderPublicProfile(supabase, id), [id]);

  if (loading) return <Loading />;
  if (!data) {
    return (
      <Screen>
        <ErrorText message={error} />
        {!error && <EmptyState icon="🔍" title="Profissional não encontrado" />}
      </Screen>
    );
  }
  const { profile, rating, categories, reviews } = data;
  const name = profile.company_name || profile.full_name;
  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: radius.full,
            backgroundColor: colors.brandLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 36, fontWeight: '800', color: colors.brandDark }}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' }}>{name}</Text>
        {profile.company_name && <Muted>{profile.full_name}</Muted>}
        <Row style={{ justifyContent: 'center' }}>
          <VerifiedBadge verified={profile.cnpj_verified} />
        </Row>
      </View>

      <Row style={{ flexWrap: 'nowrap' }}>
        <Stat value={rating?.total ? rating.average.toFixed(1) : 'Novo'} label={rating?.total ? '★ nota' : 'sem avaliações'} />
        <Stat value={String(rating?.jobs ?? 0)} label="serviços feitos" />
        <Stat
          value={rating?.jobs ? `${Math.round(((rating.jobs - rating.late_jobs) / rating.jobs) * 100)}%` : '—'}
          label="no prazo"
        />
      </Row>

      {profile.bio ? (
        <Card>
          <SectionTitle>Sobre</SectionTitle>
          <Text style={{ color: colors.text, lineHeight: 21 }}>{profile.bio}</Text>
        </Card>
      ) : null}

      <Card>
        <SectionTitle>Atende</SectionTitle>
        <Row>
          {categories.map((c) => (
            <Badge key={c.id} label={`${c.icon} ${c.name}`} bg={colors.brandLight} fg={colors.brandDark} />
          ))}
        </Row>
        <Muted style={{ fontSize: 12 }}>
          {profile.city ? `${profile.city} · ` : ''}No Help Home desde {formatDate(profile.created_at)}
        </Muted>
      </Card>

      <Card>
        <SectionTitle>Avaliações ({reviews.length})</SectionTitle>
        {reviews.length === 0 && <Muted>Ainda sem avaliações.</Muted>}
        {reviews.map((r) => (
          <View key={r.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm, gap: 2 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Stars value={r.rating} />
              <Muted style={{ fontSize: 11 }}>{timeAgo(r.created_at)}</Muted>
            </Row>
            {r.comment ? <Text style={{ color: colors.text }}>“{r.comment}”</Text> : null}
          </View>
        ))}
      </Card>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', gap: 2, padding: space.md }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{value}</Text>
      <Muted style={{ fontSize: 11, textAlign: 'center' }}>{label}</Muted>
    </Card>
  );
}
