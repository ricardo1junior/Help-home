import { createRequest, listCategories, MAX_PHOTOS, type LatLng } from '@helphome/shared';
import type { ImagePickerAsset } from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { LocationPicker } from '@/components/location-picker';
import { PhotoStrip } from '@/components/photo-strip';
import { Button, Chip, ErrorText, Input, Label, Loading, Muted, Row, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { maskBrDate, parseBrDate } from '@/lib/dates';
import { toMessage } from '@/lib/errors';
import { askPhotoSource, pickPhotos, uploadAsset } from '@/lib/photos';
import { supabase } from '@/lib/supabase';
import { space } from '@/lib/theme';
import { useData } from '@/lib/use-data';

const EMPTY = { title: '', description: '', address: '', date: '' };

export default function NovoPedido() {
  const router = useRouter();
  const { profile } = useAuth();
  const categories = useData(() => listCategories(supabase), []);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY, city: profile?.city ?? '' });
  const [photos, setPhotos] = useState<ImagePickerAsset[]>([]);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function addPhoto() {
    const source = await askPhotoSource();
    if (!source) return;
    const picked = await pickPhotos(source, MAX_PHOTOS - photos.length);
    setPhotos((p) => [...p, ...picked].slice(0, MAX_PHOTOS));
  }

  async function submit() {
    setError(null);
    const preferred = parseBrDate(form.date);
    if (!categoryId) return setError('Escolha uma categoria.');
    if (preferred === null) return setError('Data inválida. Use o formato dd/mm/aaaa.');
    if (!location) return setError('Marque no mapa onde vai ser o serviço.');
    setSaving(true);
    try {
      const urls = await Promise.all(photos.map((p) => uploadAsset(profile!.id, p)));
      const { id } = await createRequest(
        supabase,
        profile!.id,
        {
          category_id: categoryId,
          title: form.title,
          description: form.description,
          address: form.address,
          city: form.city,
          preferred_date: preferred,
        },
        urls,
        location,
      );
      setForm({ ...EMPTY, city: profile?.city ?? '' });
      setPhotos([]);
      setLocation(null);
      setCategoryId(null);
      router.push({ pathname: '/pedido/[id]', params: { id } });
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (categories.loading) return <Loading />;
  return (
    <Screen>
      <View style={{ gap: space.sm }}>
        <Label>Que tipo de serviço?</Label>
        <Row>
          {categories.data?.map((c) => (
            <Chip
              key={c.id}
              label={`${c.icon} ${c.name}`}
              selected={categoryId === c.id}
              onPress={() => setCategoryId(c.id)}
            />
          ))}
        </Row>
      </View>
      <Input label="Título" value={form.title} onChangeText={set('title')} placeholder="Ex.: Torneira da cozinha pingando" />
      <Input
        label="Descreva o problema"
        value={form.description}
        onChangeText={set('description')}
        multiline
        placeholder="Conte o que está acontecendo, desde quando, o que já tentou…"
      />
      <View style={{ gap: space.sm }}>
        <Label>Fotos (até {MAX_PHOTOS})</Label>
        <PhotoStrip
          uris={photos.map((p) => p.uri)}
          onAdd={photos.length < MAX_PHOTOS ? addPhoto : undefined}
          onRemove={(i) => setPhotos((p) => p.filter((_, j) => j !== i))}
        />
      </View>
      <Input
        label="Endereço"
        value={form.address}
        onChangeText={set('address')}
        placeholder="Rua, número, bairro"
        hint="O endereço completo só aparece para o profissional que você escolher."
      />
      <Input label="Cidade" value={form.city} onChangeText={set('city')} />
      <View style={{ gap: space.sm }}>
        <Label>Local no mapa</Label>
        <LocationPicker
          value={location}
          onChange={setLocation}
          addressQuery={[form.address, form.city].filter(Boolean).join(', ')}
        />
        <Muted style={{ fontSize: 12 }}>Os profissionais veem só a região aproximada (cerca de 1 km).</Muted>
      </View>
      <Input
        label="Data preferida (opcional)"
        value={form.date}
        onChangeText={(v) => set('date')(maskBrDate(v))}
        keyboardType="number-pad"
        placeholder="dd/mm/aaaa"
      />
      <ErrorText message={error ?? categories.error} />
      <Button title="Publicar pedido" onPress={submit} loading={saving} />
    </Screen>
  );
}
