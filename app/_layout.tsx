import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import StreakAnimation from '@/components/StreakAnimation';
import { StreakProvider, useStreak } from '@/contexts/StreakContext';
import { useColorScheme } from '@/hooks/useColorScheme';

function AppContent() {
  const colorScheme = useColorScheme();
  const { streakAnimationVisible, currentStreakCount, hideStreakAnimation } = useStreak();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
      <StatusBar style="auto" />
      
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
      <StreakProvider>
        <AppContent />
      </StreakProvider>
    </GestureHandlerRootView>
  );
}
