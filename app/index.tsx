import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';
import 'react-native-url-polyfill/auto';

export default function Index() {
  const { user, loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Redirect based on authentication status
  if (user) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/login" />;
  }
} 