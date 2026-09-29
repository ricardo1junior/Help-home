import type { ConfigContext, ExpoConfig } from 'expo/config';

// Mapas: no iOS usa o Apple Maps. No Android, o Google Maps precisa de uma chave
// (GOOGLE_MAPS_ANDROID_KEY) no build de produção; no Expo Go funciona sem ela.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY }],
  ],
});
