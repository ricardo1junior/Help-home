import { signOut } from '@helphome/shared';
import { Alert } from 'react-native';
import { Button } from './ui';
import { supabase } from '@/lib/supabase';

export function SignOutButton() {
  return (
    <Button
      title="Sair da conta"
      variant="danger"
      onPress={() =>
        Alert.alert('Sair da conta?', undefined, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sair', style: 'destructive', onPress: () => void signOut(supabase) },
        ])
      }
    />
  );
}
