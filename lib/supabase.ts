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

// Regular client for normal operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
console.log('Supabase Configuration:');
console.log('- URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('- Anon Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
console.log('- Service Key:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
console.log('- Admin Client:', supabaseAdmin ? '✅ Available' : '❌ Not Available'); 