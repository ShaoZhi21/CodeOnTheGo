import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export function useProtectedRoute() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const authDisabled = process.env.EXPO_PUBLIC_DISABLE_AUTH === 'true';

  useEffect(() => {
    if (authDisabled) return;
    if (!loading && !user) {
      // User is not authenticated, redirect to login
      router.replace('/login');
    }
  }, [user, loading, router, authDisabled]);

  return { user, loading: authDisabled ? false : loading };
} 