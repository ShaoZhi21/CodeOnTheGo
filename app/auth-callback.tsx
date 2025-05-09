import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

export default function AuthCallback() {
  const params = useLocalSearchParams();
  const [message, setMessage] = useState('Processing your verification...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Debug: Log all params received
        console.log('Auth callback params:', JSON.stringify(params));
        
        // Get the tokens from URL params
        const { access_token, refresh_token } = params;
        
        if (access_token && refresh_token) {
          setMessage('Setting up your account...');
          
          const { error } = await supabase.auth.setSession({
            access_token: access_token as string,
            refresh_token: refresh_token as string,
          });
          
          if (error) {
            console.error('Session error:', error.message);
            throw error;
          }
          
          setMessage('Verification successful!');
          
          // Redirect to the main app after successful verification
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 1000);
        } else {
          // Alternative method: try to extract token from URL
          const url = await Linking.getInitialURL();
          console.log('Initial URL:', url);
          
          if (url) {
            // Try to parse tokens from URL if they exist
            const regex = /access_token=([^&]+).*refresh_token=([^&]+)/;
            const match = url.match(regex);
            
            if (match && match.length >= 3) {
              const extractedAccessToken = match[1];
              const extractedRefreshToken = match[2];
              
              setMessage('Setting up your account using URL tokens...');
              
              const { error } = await supabase.auth.setSession({
                access_token: extractedAccessToken,
                refresh_token: extractedRefreshToken,
              });
              
              if (error) throw error;
              
              setMessage('Verification successful!');
              
              // Redirect to the main app
              setTimeout(() => {
                router.replace('/(tabs)');
              }, 1000);
              return;
            }
          }
          
          throw new Error('No authentication tokens found in URL parameters');
        }
      } catch (error: any) {
        console.error('Auth callback error:', error.message);
        setMessage(`Error: ${error.message}`);
        
        setTimeout(() => {
          Alert.alert('Authentication Error', 'There was a problem verifying your email. Please try logging in again.', [
            { text: 'OK', onPress: () => router.replace('/login') }
          ]);
        }, 1000);
      }
    };

    handleAuthCallback();
  }, [params]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <ActivityIndicator size="large" />
      <ThemedText style={{ marginTop: 20, textAlign: 'center' }}>{message}</ThemedText>
    </View>
  );
} 