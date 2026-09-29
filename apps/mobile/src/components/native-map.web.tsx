// Na versão web do app (só usada para testes) o mapa nativo não existe:
// mostra um quadro no lugar para o resto da tela funcionar.
import { forwardRef, useImperativeHandle } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

type AnyProps = { children?: React.ReactNode; style?: StyleProp<ViewStyle> } & Record<string, any>;

export const MapView = forwardRef<{ animateToRegion: () => void }, AnyProps>(function MapView({ style }, ref) {
  useImperativeHandle(ref, () => ({ animateToRegion: () => {} }));
  return (
    <View style={[style, { backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: '#64748b' }}>🗺️ Mapa disponível no app para celular</Text>
    </View>
  );
});

export const Marker = (_: AnyProps) => null;
export const Circle = (_: AnyProps) => null;
