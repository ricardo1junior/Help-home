import { getClientRating, listReviewsAbout } from '@helphome/shared';
import { Text, View } from 'react-native';
import { SignOutButton } from '@/components/account';
import { ratingText, Stars } from '@/components/badges';
import { Card, Muted, Screen, SectionTitle, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import { useData } from '@/lib/use-data';

export default function Conta() {
  const { session, profile } = useAuth();
  const { data } = useData(
    async () => ({
      rating: await getClientRating(supabase, profile!.id),
      reviews: await listReviewsAbout(supabase, profile!.id),
    }),
    [profile?.id],
  );

  return (
    <Screen>
      <View>
        <Title>{profile?.full_name}</Title>
        <Muted>{session?.user.email}</Muted>
        {profile?.city && <Muted>{profile.city}</Muted>}
      </View>
      <Card>
        <SectionTitle>Sua nota como cliente</SectionTitle>
        <Text style={{ color: colors.text, fontWeight: '600' }}>
          {ratingText(data?.rating?.average, data?.rating?.total ?? 0)}
        </Text>
        <Muted style={{ fontSize: 13 }}>Os profissionais também avaliam os clientes de 0 a 5 depois de cada serviço.</Muted>
        {data?.reviews.map((r) => (
          <View key={r.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
            <Stars value={r.rating} />
            {r.comment ? <Text style={{ color: colors.text }}>“{r.comment}”</Text> : null}
          </View>
        ))}
      </Card>
      <SignOutButton />
    </Screen>
  );
}
