import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) throw error;

        // If we get here, the session is valid
        Alert.alert('Success', 'Email verified successfully!', [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)'),
          },
        ]);
      } catch (error: any) {
        Alert.alert('Error', error.message);
        router.replace('/login');
      }
    };

    handleEmailConfirmation();
  }, []);

  return null;
} 