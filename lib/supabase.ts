import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

// Check if required environment variables are set
if (!supabaseUrl) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL');
}
if (!supabaseAnonKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
}
if (!supabaseServiceKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY - This is required for admin operations');
}

// Detect SSR/Node during bundling (EAS Update export runs in Node with no window)
const isSSR = typeof window === 'undefined';

// Regular client for normal operations with session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Avoid using AsyncStorage during SSR/export to prevent "window is not defined"
    storage: isSSR ? undefined : AsyncStorage,
    autoRefreshToken: !isSSR,
    persistSession: !isSSR,
    detectSessionInUrl: false
  }
});

// Admin client for admin operations (user creation, etc.)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Log configuration status
if (!isSSR) {
  console.log('Supabase Configuration:');
  console.log('- URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('- Anon Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
  console.log('- Service Key:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  console.log('- Admin Client:', supabaseAdmin ? '✅ Available' : '❌ Not Available');
}