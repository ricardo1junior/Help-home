import { Text } from 'react-native';

export function tabIcon(emoji: string) {
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
  }
  return TabIcon;
}
