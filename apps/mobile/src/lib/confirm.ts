import { Alert } from 'react-native';

/** Pergunta de sim ou não. */
export function confirm(title: string, message?: string, okText = 'Confirmar', destructive = false): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Voltar', style: 'cancel', onPress: () => resolve(false) },
      { text: okText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]),
  );
}
