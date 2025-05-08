import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://kqhkprbujcmfgfhlhxud.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxaGtwcmJ1amNtZmdmaGxoeHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2OTE4NjYsImV4cCI6MjA2MjI2Nzg2Nn0.7cOjyRfag-U2V9EefU-lk-LJzZB7cYxOTuktxxMvsdI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 