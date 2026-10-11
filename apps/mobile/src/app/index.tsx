import { Redirect, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Loading, Muted, Notice, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { isConfigured } from '@/lib/config';
import { colors, space } from '@/lib/theme';

export default function Index() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();

  if (loading) return <Loading />;
  if (session && profile) return <Redirect href={profile.role === 'provider' ? '/disponiveis' : '/inicio'} />;
  if (session && !profile) return <Loading />;

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: space.md, marginTop: 64 }}>
        <Text style={{ fontSize: 56 }}>🏠</Text>
        <Text style={{ fontSize: 32, fontWeight: '800', color: colors.text }}>
          Help <Text style={{ color: colors.brand }}>Home</Text>
        </Text>
        <Muted style={{ textAlign: 'center', fontSize: 16 }}>
          Encanador, eletricista, marceneiro e mais. Receba orçamentos de profissionais com CNPJ e pague com segurança pelo
          app.
        </Muted>
      </View>
      {!isConfigured && (
        <Notice>O app ainda não foi configurado. Preencha o arquivo .env com os dados do Supabase e do site.</Notice>
      )}
      <View style={{ gap: space.md, marginTop: space.xl }}>
        <Button title="Criar conta" onPress={() => router.push('/cadastro')} />
        <Button title="Já tenho conta" variant="secondary" onPress={() => router.push('/entrar')} />
      </View>
      <View style={{ gap: space.sm, marginTop: space.xl }}>
        <Feature icon="🔒" text="Pagamento retido até você confirmar o serviço" />
        <Feature icon="🛡️" text="Garantia mínima de 90 dias em todo serviço" />
        <Feature icon="⭐" text="Notas de 0 a 5 para profissionais e clientes" />
      </View>
    </Screen>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={{ color: colors.text, flex: 1 }}>{text}</Text>
    </View>
  );
}
