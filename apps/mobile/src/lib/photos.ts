import { uploadRequestPhoto } from '@helphome/shared';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { supabase } from './supabase';

export type PhotoSource = 'camera' | 'library';

/** Abre a câmera ou a galeria. Retorna as fotos escolhidas (vazio se cancelar). */
export async function pickPhotos(source: PhotoSource, max = 1): Promise<ImagePicker.ImagePickerAsset[]> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      'Permissão necessária',
      source === 'camera'
        ? 'Libere o acesso à câmera nas configurações do celular.'
        : 'Libere o acesso às fotos nas configurações do celular.',
    );
    return [];
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: 'images',
    quality: 0.7,
    allowsMultipleSelection: source === 'library' && max > 1,
    selectionLimit: max,
  };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? [] : result.assets.slice(0, max);
}

/** Pergunta se a foto vem da câmera ou da galeria. */
export function askPhotoSource(): Promise<PhotoSource | null> {
  return new Promise((resolve) =>
    Alert.alert('Adicionar foto', undefined, [
      { text: 'Tirar foto', onPress: () => resolve('camera') },
      { text: 'Escolher da galeria', onPress: () => resolve('library') },
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
    ]),
  );
}

/** Envia a foto para o armazenamento do Supabase e devolve a URL pública. */
export async function uploadAsset(userId: string, asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const data = await fetch(asset.uri).then((r) => r.arrayBuffer());
  const contentType = asset.mimeType ?? 'image/jpeg';
  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  return uploadRequestPhoto(supabase, userId, data, ext, contentType);
}
