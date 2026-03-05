export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
};

export const assertSupabaseEnv = () => {
  if (!env.supabaseUrl || env.supabaseUrl.trim().length === 0) {
    throw new Error('Missing required env var: EXPO_PUBLIC_SUPABASE_URL');
  }
  if (!env.supabaseAnonKey || env.supabaseAnonKey.trim().length === 0) {
    throw new Error('Missing required env var: EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }
};
