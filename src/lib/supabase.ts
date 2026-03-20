import 'react-native-url-polyfill/auto';

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { assertSupabaseEnv, env } from '@/src/config/env';

const storageKeyPrefix = 'pailin-abroad-auth';

const secureStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.localStorage.getItem(key);
    }

    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
      return;
    }

    await SecureStore.deleteItemAsync(key);
  },
};

assertSupabaseEnv();

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    storageKey: storageKeyPrefix,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
