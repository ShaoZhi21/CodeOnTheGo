import { Tabs } from 'expo-router';
import { Image, Platform, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { LoadingScreen } from '@/components/LoadingScreen';
import TabBarBackground from '@/components/ui/TabBarBackground';
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
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            height: 88,
            paddingTop: 10,
            paddingBottom: 6,
            paddingHorizontal: 20,
            position: 'absolute',
          },
          default: {
            height: 73,
            paddingTop: 10,
            paddingBottom: 4,
            paddingHorizontal: 20,
          },
        }),
        tabBarLabelStyle: {
          marginTop: 10,
          fontSize: 12,
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
              borderRadius: 12,
              borderWidth: focused ? 2 : 1,
              borderColor: focused ? '#6564c7' : 'rgba(101, 100, 199, 0.3)',
              backgroundColor: focused ? 'rgba(101, 100, 199, 0.1)' : 'transparent',
            }}>
              <Image 
                source={require('@/assets/images/icons/codeonthego-bird-icon.png')}
                style={{
                  width: 26,
                  height: 26,
                  opacity: focused ? 1 : 0.7,
                  tintColor: focused ? '#6564c7' : '#8E8E93',
                }}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ focused }) => (
            <View style={{
              padding: 8,
              borderRadius: 12,
              borderWidth: focused ? 2 : 1,
              borderColor: focused ? '#6564c7' : 'rgba(101, 100, 199, 0.3)',
              backgroundColor: focused ? 'rgba(101, 100, 199, 0.1)' : 'transparent',
            }}>
              <Image 
                source={require('@/assets/images/icons/book-icon.png')}
                style={{
                  width: 26,
                  height: 26,
                  opacity: focused ? 1 : 0.7,
                  tintColor: focused ? '#6564c7' : '#8E8E93',
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
              borderRadius: 12,
              borderWidth: focused ? 2 : 1,
              borderColor: focused ? '#6564c7' : 'rgba(101, 100, 199, 0.3)',
              backgroundColor: focused ? 'rgba(101, 100, 199, 0.1)' : 'transparent',
            }}>
              <Image 
                source={require('@/assets/images/icons/question-icon.png')}
                style={{
                  width: 26,
                  height: 26, 
                  opacity: focused ? 1 : 0.7,
                  tintColor: focused ? '#6564c7' : '#8E8E93',
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
              borderRadius: 12,
              borderWidth: focused ? 2 : 1,
              borderColor: focused ? '#6564c7' : 'rgba(101, 100, 199, 0.3)',
              backgroundColor: focused ? 'rgba(101, 100, 199, 0.1)' : 'transparent',
            }}>
              <Image 
                source={require('@/assets/images/icons/profile-icon.png')}
                style={{
                  width: 26,
                  height: 26,
                  opacity: focused ? 1 : 0.7,
                  tintColor: focused ? '#6564c7' : '#8E8E93',
                }}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
