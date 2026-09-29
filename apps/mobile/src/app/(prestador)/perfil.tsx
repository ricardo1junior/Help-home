import {
  getProviderCategoryIds,
  getProviderRatings,
  listCategories,
  listReviewsAbout,
  RADIUS_OPTIONS_KM,
  updateProviderProfile,
  type LatLng,
} from '@helphome/shared';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SignOutButton } from '@/components/account';
import { ratingText, Stars, VerifiedBadge } from '@/components/badges';
import { LocationPicker } from '@/components/location-picker';
import { Button, Card, Chip, ErrorText, Input, Label, Loading, Muted, Notice, Row, Screen, SectionTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { toMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors, space } from '@/lib/theme';
import { useData } from '@/lib/use-data';

export default function Perfil() {
  const { session, profile, refreshProfile } = useAuth();
  const { data, loading } = useData(
    async () => ({
      categories: await listCategories(supabase),
      mine: await getProviderCategoryIds(supabase, profile!.id),
      rating: (await getProviderRatings(supabase, [profile!.id])).get(profile!.id),
      reviews: await listReviewsAbout(supabase, profile!.id),
    }),
    [profile?.id],
  );
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    city: profile?.city ?? '',
    bio: profile?.bio ?? '',
  });
  const [selected, setSelected] = useState<number[] | null>(null);
  const [base, setBase] = useState<LatLng | null>(
    profile?.base_lat != null && profile.base_lng != null ? { lat: profile.base_lat, lng: profile.base_lng } : null,
  );
  const [radiusKm, setRadiusKm] = useState(profile?.service_radius_km ?? 20);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const chosen = selected ?? data?.mine ?? [];

  function toggle(id: number) {
    setSelected(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);
  }

  async function save() {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await updateProviderProfile(supabase, profile!.id, {
        ...form,
        category_ids: chosen,
        base_lat: base?.lat ?? null,
        base_lng: base?.lng ?? null,
        service_radius_km: radiusKm,
      });
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile) return <Loading />;
  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{profile.company_name || profile.full_name}</Text>
        <Muted>{session?.user.email}</Muted>
        <Row>
          <VerifiedBadge verified={profile.cnpj_verified} />
          {profile.cnpj && <Muted style={{ fontSize: 12 }}>CNPJ {profile.cnpj}</Muted>}
        </Row>
        <Text style={{ color: colors.text, fontWeight: '600' }}>
          {ratingText(data?.rating?.average, data?.rating?.total ?? 0, data?.rating?.late_jobs)}
        </Text>
        <Muted style={{ fontSize: 12 }}>
          Sua nota é a média das avaliações menos 0,5 ponto a cada 50% de atraso sobre o tempo estimado (até 2 pontos por
          serviço).
        </Muted>
      </Card>

      <SectionTitle>Seus dados</SectionTitle>
      <Input label="Nome" value={form.full_name} onChangeText={set('full_name')} />
      <Input label="WhatsApp" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      <Input label="Cidade" value={form.city} onChangeText={set('city')} />
      <Input
        label="Sobre você"
        value={form.bio}
        onChangeText={set('bio')}
        multiline
        placeholder="Experiência, especialidades, horários…"
      />

      <View style={{ gap: space.sm }}>
        <Label>Categorias que você atende</Label>
        <Row>
          {data?.categories.map((c) => (
            <Chip key={c.id} label={`${c.icon} ${c.name}`} selected={chosen.includes(c.id)} onPress={() => toggle(c.id)} />
          ))}
        </Row>
      </View>

      <View style={{ gap: space.sm }}>
        <Label>Base e raio de atendimento</Label>
        <Muted style={{ fontSize: 13 }}>Marque de onde você sai. Usamos para mostrar os pedidos mais próximos.</Muted>
        <Row>
          {RADIUS_OPTIONS_KM.map((km) => (
            <Chip key={km} label={`${km} km`} selected={radiusKm === km} onPress={() => setRadiusKm(km)} />
          ))}
        </Row>
        <LocationPicker value={base} onChange={setBase} radiusKm={radiusKm} height={260} />
      </View>

      <ErrorText message={error} />
      {saved && <Notice tone="success">Perfil salvo!</Notice>}
      <Button title="Salvar perfil" onPress={save} loading={saving} />

      {!!data?.reviews.length && (
        <Card>
          <SectionTitle>Avaliações recebidas</SectionTitle>
          {data.reviews.map((r) => (
            <View key={r.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
              <Stars value={r.rating} />
              {r.comment ? <Text style={{ color: colors.text }}>“{r.comment}”</Text> : null}
            </View>
          ))}
        </Card>
      )}
      <SignOutButton />
    </Screen>
  );
}
