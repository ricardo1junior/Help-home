import {
  countUnreadNotifications,
  registerPushToken,
  subscribeToNotifications,
  unregisterPushToken,
  type AppNotification,
} from '@helphome/shared';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from './auth';
import { supabase } from './supabase';

// Com o app aberto, o aviso aparece no próprio app (faixa no topo), não como push.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });
}

interface NotificationsState {
  unread: number;
  /** Última notificação recebida com o app aberto (para mostrar a faixa). */
  latest: AppNotification | null;
  /** Muda a cada notificação nova: as telas usam para recarregar sozinhas. */
  version: number;
  refreshUnread: () => Promise<void>;
  dismissLatest: () => void;
}

const NotificationsContext = createContext<NotificationsState>({
  unread: 0,
  latest: null,
  version: 0,
  refreshUnread: async () => {},
  dismissLatest: () => {},
});

let currentPushToken: string | null = null;

/** Tira o aparelho da conta (chamar antes de sair). */
export async function forgetPushToken() {
  if (currentPushToken) await unregisterPushToken(supabase, currentPushToken).catch(() => {});
  currentPushToken = null;
}

async function registerForPush() {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Help Home',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return;
  // O push precisa do projeto no EAS (veja o README do app).
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  currentPushToken = token;
  await registerPushToken(supabase, token, Platform.OS);
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { profile } = useAuth();
  const userId = profile?.id;
  const [unread, setUnread] = useState(0);
  const [latest, setLatest] = useState<AppNotification | null>(null);
  const [version, setVersion] = useState(0);
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  });

  const refreshUnread = useCallback(async () => {
    if (!userId) return;
    setUnread(await countUnreadNotifications(supabase, userId).catch(() => 0));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    countUnreadNotifications(supabase, userId)
      .then(setUnread)
      .catch(() => {});
    registerForPush().catch(() => {});
    return subscribeToNotifications(supabase, userId, (n) => {
      setLatest(n);
      setUnread((u) => u + 1);
      setVersion((v) => v + 1);
    });
  }, [userId]);

  // Tocar no push abre o pedido.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const requestId = response.notification.request.content.data?.request_id;
      if (typeof requestId === 'string') routerRef.current.push({ pathname: '/pedido/[id]', params: { id: requestId } });
    });
    return () => sub.remove();
  }, []);

  return (
    <NotificationsContext.Provider
      value={{ unread, latest, version, refreshUnread, dismissLatest: () => setLatest(null) }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
