import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const params = useLocalSearchParams();
  const { user } = useAuth();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  useEffect(() => {
    if (params.message) {
      setSuccessMessage(params.message as string);
    }
  }, [params.message]);

  const handleLogin = async () => {
    setFormErrors([]);
    
    const errors: string[] = [];
    if (!email || !password) {
      errors.push('Please fill in all fields');
    }

    if (!validateEmail(email)) {
      errors.push('Please enter a valid email address');
    }
    
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setFormErrors([error.message]);
        return;
      }

      // Check if the user's email is verified
      if (!data.user?.email_confirmed_at) {
        await supabase.auth.signOut();
        setFormErrors(['Email not verified. Please verify your email before logging in.']);
        return;
      }

      // Navigation will be handled by the auth context
      router.replace('/(tabs)');
    } catch (error: any) {
      setFormErrors([error.message]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Image 
          source={require('@/assets/images/icons/codeonthego-bird-icon.png')}
          style={styles.logo}
        />
        <ThemedText style={styles.title}>CodeOnTheGo</ThemedText>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#687076"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#687076"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        {successMessage ? (
          <View style={styles.successContainer}>
            <ThemedText style={styles.successText}>
              {successMessage}
            </ThemedText>
          </View>
        ) : null}

        {formErrors.length > 0 && (
          <View style={styles.errorContainer}>
            {formErrors.map((error, index) => (
              <ThemedText key={index} style={styles.errorText}>
                • {error}
              </ThemedText>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            { 
              backgroundColor: '#6564c7',
              opacity: loading ? 0.7 : 1
            }
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          <ThemedText style={styles.buttonText}>
            {loading ? 'Logging in...' : 'Login'}
          </ThemedText>
        </TouchableOpacity>

        <View style={styles.footer}>
          <ThemedText>Don&apos;t have an account? </ThemedText>
          <Link href="/signup" asChild>
            <TouchableOpacity>
              <ThemedText style={styles.link}>Sign Up</ThemedText>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#faf5fd',
  },
  formContainer: {
    padding: 20,
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    height: 40,
    lineHeight: 40,
    color: '#6564c7',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#11181C',
  },
  button: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  link: {
    color: '#6564c7',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorContainer: {
    marginTop: 5,
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 2,
  },
  successContainer: {
    marginTop: 5,
    marginBottom: 15,
    backgroundColor: '#e7f3e8',
    padding: 10,
    borderRadius: 8,
  },
  successText: {
    color: '#2d862e',
    fontSize: 14,
    textAlign: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
    alignSelf: 'center',
  },
}); 