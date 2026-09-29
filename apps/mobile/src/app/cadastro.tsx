import { formatCnpj, isValidCnpj, onlyDigits, signUp, type UserRole } from '@helphome/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Chip, ErrorText, Input, Label, Muted, Notice, Row, Screen, Title } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { toMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { space } from '@/lib/theme';

export default function Cadastro() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('client');
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', city: '', cnpj: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      if (role === 'provider') {
        if (!isValidCnpj(form.cnpj)) throw new Error('Informe um CNPJ válido.');
        // Confere na Receita Federal antes de criar a conta.
        const check = await apiFetch<{ ok: boolean; error?: string }>(
          `/api/app/cnpj?cnpj=${onlyDigits(form.cnpj)}`,
        ).catch(() => ({ ok: true, error: undefined }));
        if (!check.ok) throw new Error(check.error ?? 'CNPJ inválido.');
      }
      const data = await signUp(supabase, { ...form, role, cnpj: role === 'provider' ? form.cnpj : undefined });
      if (data.session) router.replace('/');
      else setConfirmEmail(true);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (confirmEmail) {
    return (
      <Screen>
        <Title>Confirme seu e-mail</Title>
        <Notice tone="success">
          Enviamos um link para {form.email}. Depois de confirmar, volte aqui e entre com seu e-mail e senha.
        </Notice>
        <Button title="Ir para o login" onPress={() => router.replace('/entrar')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Criar conta</Title>
      <View style={{ gap: space.sm }}>
        <Label>Você quer</Label>
        <Row>
          <Chip label="Contratar serviços" selected={role === 'client'} onPress={() => setRole('client')} />
          <Chip label="Oferecer serviços" selected={role === 'provider'} onPress={() => setRole('provider')} />
        </Row>
      </View>
      <Input label="Nome completo" value={form.full_name} onChangeText={set('full_name')} autoComplete="name" />
      <Input
        label="E-mail"
        value={form.email}
        onChangeText={set('email')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <Input
        label="Senha"
        value={form.password}
        onChangeText={set('password')}
        secureTextEntry
        autoComplete="new-password"
        hint="Pelo menos 6 caracteres"
      />
      <Input label="Cidade" value={form.city} onChangeText={set('city')} />
      <Input
        label="WhatsApp (opcional)"
        value={form.phone}
        onChangeText={set('phone')}
        keyboardType="phone-pad"
        autoComplete="tel"
        hint="Só aparece para quem fechar um serviço com você"
      />
      {role === 'provider' && (
        <Input
          label="CNPJ"
          value={form.cnpj}
          onChangeText={(v) => set('cnpj')(onlyDigits(v).length === 14 ? formatCnpj(v) : v)}
          keyboardType="number-pad"
          placeholder="00.000.000/0000-00"
          hint="Obrigatório para prestadores (MEI serve). Conferimos na Receita Federal."
        />
      )}
      <ErrorText message={error} />
      <Button title="Criar conta" onPress={submit} loading={loading} />
      <Muted style={{ textAlign: 'center' }}>
        Já tem conta?{' '}
        <Muted style={{ color: '#c2410c', fontWeight: '700' }} onPress={() => router.replace('/entrar')}>
          Entrar
        </Muted>
      </Muted>
    </Screen>
  );
}
