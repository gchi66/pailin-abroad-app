import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { assertSupabaseEnv, env } from '@/src/config/env';

const storageKeyPrefix = 'pailin-abroad-auth';
const authStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.localStorage.getItem(key);
    }

    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
      return;
    }

    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
      return;
    }

    await AsyncStorage.removeItem(key);
  },
};

assertSupabaseEnv();

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: authStorage,
    storageKey: storageKeyPrefix,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
