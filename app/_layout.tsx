import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import StreakAnimation from '@/components/StreakAnimation';
import { AuthProvider } from '@/contexts/AuthContext';
import { StreakProvider, useStreak } from '@/contexts/StreakContext';

function AppContent() {
  // Always use light theme instead of detecting system theme
  const colorScheme = 'light';
  const { streakAnimationVisible, currentStreakCount, hideStreakAnimation } = useStreak();

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
      
      {/* Global Streak Animation */}
      <StreakAnimation 
        visible={streakAnimationVisible}
        streakCount={currentStreakCount}
        onComplete={hideStreakAnimation}
      />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StreakProvider>
          <AppContent />
        </StreakProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
