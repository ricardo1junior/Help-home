import { signOut } from '@helphome/shared';
import { Alert } from 'react-native';
import { Button } from './ui';
import { forgetPushToken } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

export function SignOutButton() {
  return (
    <Button
      title="Sair da conta"
      variant="danger"
      onPress={() =>
        Alert.alert('Sair da conta?', undefined, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sair', style: 'destructive', onPress: () => void forgetPushToken().then(() => signOut(supabase)) },
        ])
      }
    />
  );
}
