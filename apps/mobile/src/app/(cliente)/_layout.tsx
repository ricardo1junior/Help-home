import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { tabIcon } from '@/components/tab-icon';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function ClienteLayout() {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/" />;
  if (profile?.role === 'provider') return <Redirect href="/disponiveis" />;

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.brandDark, headerTitleStyle: { color: colors.text } }}>
      <Tabs.Screen name="pedidos" options={{ title: 'Meus pedidos', tabBarLabel: 'Pedidos', tabBarIcon: tabIcon('📋') }} />
      <Tabs.Screen name="novo" options={{ title: 'Novo pedido', tabBarLabel: 'Pedir serviço', tabBarIcon: tabIcon('➕') }} />
      <Tabs.Screen name="conta" options={{ title: 'Minha conta', tabBarLabel: 'Conta', tabBarIcon: tabIcon('👤') }} />
    </Tabs>
  );
}
