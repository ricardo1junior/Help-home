import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors, radius, space } from '@/lib/theme';

/** Fileira de fotos com botão de adicionar e, opcionalmente, de remover. */
export function PhotoStrip({
  uris,
  onAdd,
  onRemove,
  size = 84,
  adding,
}: {
  uris: string[];
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  size?: number;
  adding?: boolean;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
      {uris.map((uri, i) => (
        <View key={uri}>
          <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius.md }} contentFit="cover" />
          {onRemove && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remover foto"
              onPress={() => onRemove(i)}
              hitSlop={8}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                backgroundColor: 'rgba(15,23,42,0.7)',
                borderRadius: radius.full,
                width: 24,
                height: 24,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>×</Text>
            </Pressable>
          )}
        </View>
      ))}
      {onAdd && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar foto"
          onPress={onAdd}
          disabled={adding}
          style={{
            width: size,
            height: size,
            borderRadius: radius.md,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: '#94a3b8',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
          }}>
          <Text style={{ fontSize: 24, color: colors.muted }}>{adding ? '…' : '📷'}</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>{adding ? 'Enviando' : 'Adicionar'}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
