import { Tabs } from 'expo-router';
import { Image, Platform, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';

export default function TabLayout() {
  // Always use light theme instead of detecting system theme
  const colorScheme = 'light';
  
  // Protect all tab routes
  const { loading } = useProtectedRoute();

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen message="Loading app..." />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6564c7',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 80,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E9ECEF',
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 16,
          paddingTop: 12,
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
          flex: 1,
          marginHorizontal: -2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <View style={{
              padding: 8,
              borderRadius: 16,
              backgroundColor: focused ? '#F4EEFF' : 'transparent',
            }}>
              <Image 
                source={require('@/assets/images/icons/codeonthego-bird-icon.png')}
                style={{
                  width: 32,
                  height: 32,
                  tintColor: focused ? '#6564c7' : '#9CA3AF',
                }}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="learn"
        options={{
          title: 'Plans',
          tabBarIcon: ({ focused }) => (
            <View style={{
              padding: 8,
              borderRadius: 16,
              backgroundColor: focused ? '#F4EEFF' : 'transparent',
            }}>
              <Image 
                source={require('@/assets/images/icons/book-icon.png')}
                style={{
                  width: 32,
                  height: 32,
                  tintColor: focused ? '#6564c7' : '#9CA3AF',
                }}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="questions"
        options={{
          title: 'Questions',
          tabBarIcon: ({ focused }) => (
            <View style={{
              padding: 8,
              borderRadius: 16,
              backgroundColor: focused ? '#F4EEFF' : 'transparent',
            }}>
              <Image 
                source={require('@/assets/images/icons/question-icon.png')}
                style={{
                  width: 32,
                  height: 32,
                  tintColor: focused ? '#6564c7' : '#9CA3AF',
                }}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <View style={{
              padding: 8,
              borderRadius: 16,
              backgroundColor: focused ? '#F4EEFF' : 'transparent',
            }}>
              <Image 
                source={require('@/assets/images/icons/profile-icon.png')}
                style={{
                  width: 32,
                  height: 32,
                  tintColor: focused ? '#6564c7' : '#9CA3AF',
                }}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
