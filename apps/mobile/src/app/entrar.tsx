import { signIn } from '@helphome/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, ErrorText, Input, Muted, Screen, Title } from '@/components/ui';
import { toMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export default function Entrar() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      await signIn(supabase, { email, password });
      router.replace('/');
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title>Bem-vindo de volta</Title>
      <Input
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <Input label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      <ErrorText message={error} />
      <Button title="Entrar" onPress={submit} loading={loading} />
      <Muted style={{ textAlign: 'center' }} >
        Não tem conta?{' '}
        <Muted style={{ color: '#c2410c', fontWeight: '700' }} onPress={() => router.replace('/cadastro')}>
          Criar conta
        </Muted>
      </Muted>
    </Screen>
  );
}
