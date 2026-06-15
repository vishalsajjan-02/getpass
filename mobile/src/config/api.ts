import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** Default API roots for local development per platform. */
const devDefaults: Record<string, string> = {
  android: 'http://10.0.2.2:3001/api',
  ios: 'http://localhost:3001/api',
  default: 'http://localhost:3001/api',
};

export const getApiBaseUrl = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const platform = Platform.OS;
  return devDefaults[platform] ?? devDefaults.default;
};

export const APP_NAME = Constants.expoConfig?.name ?? 'Gatepass Nexus';
