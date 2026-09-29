import { Pressable, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

/** Escolha de nota de 0 a 5 (tocar na mesma estrela de novo zera). */
export function StarsInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          accessibilityRole="button"
          accessibilityLabel={`${n} estrela${n > 1 ? 's' : ''}`}
          hitSlop={6}
          onPress={() => onChange(value === n ? n - 1 : n)}>
          <Text style={{ fontSize: 34, color: n <= value ? colors.star : '#cbd5e1' }}>★</Text>
        </Pressable>
      ))}
      <Text style={{ marginLeft: 8, color: colors.muted, fontWeight: '600' }}>{value} de 5</Text>
    </View>
  );
}
