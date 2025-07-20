import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export function useProtectedRoute() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // User is not authenticated, redirect to login
      router.replace('/login');
    }
  }, [user, loading, router]);

  return { user, loading };
} 