import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { tabIcon } from '@/components/tab-icon';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function PrestadorLayout() {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/" />;
  if (profile?.role === 'client') return <Redirect href="/pedidos" />;

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.brandDark, headerTitleStyle: { color: colors.text } }}>
      <Tabs.Screen
        name="disponiveis"
        options={{ title: 'Pedidos perto de você', tabBarLabel: 'Disponíveis', tabBarIcon: tabIcon('🗺️') }}
      />
      <Tabs.Screen name="servicos" options={{ title: 'Meus serviços', tabBarLabel: 'Serviços', tabBarIcon: tabIcon('🧰') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Meu perfil', tabBarLabel: 'Perfil', tabBarIcon: tabIcon('👤') }} />
    </Tabs>
  );
}
