import { Tabs } from 'expo-router';
import React from 'react';
import { Image, Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6564c7',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            paddingTop: 4,
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ focused }) => (
            <Image 
              source={require('@/assets/images/icons/codeonthego-bird-icon.png')}
              style={{
                width: 28,
                height: 28,
                opacity: focused ? 1 : 0.5,
                tintColor: '#6564c7',
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="duel"
        options={{
          title: 'Duel',
          tabBarIcon: ({ focused }) => (
            <Image 
              source={require('@/assets/images/icons/codeonthego-bird-icon.png')}
              style={{
                width: 28,
                height: 28,
                opacity: focused ? 1 : 0.5,
                tintColor: '#6564c7',
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <Image 
              source={require('@/assets/images/icons/codeonthego-bird-icon.png')}
              style={{
                width: 28,
                height: 28,
                opacity: focused ? 1 : 0.5,
                tintColor: '#6564c7',
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="questions"
        options={{
          title: 'Questions',
          tabBarIcon: ({ focused }) => (
            <Image 
              source={require('@/assets/images/icons/codeonthego-bird-icon.png')}
              style={{
                width: 28,
                height: 28,
                opacity: focused ? 1 : 0.5,
                tintColor: '#6564c7',
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <Image 
              source={require('@/assets/images/icons/codeonthego-bird-icon.png')}
              style={{
                width: 28,
                height: 28,
                opacity: focused ? 1 : 0.5,
                tintColor: '#6564c7',
              }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
