import { BlurView } from 'expo-blur';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';

// Password validation rules
const PASSWORD_RULES = {
  minLength: 6,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
};

const validatePassword = (password: string) => {
  const errors = [];
  
  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`Password must be at least ${PASSWORD_RULES.minLength} characters long`);
  }
  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (PASSWORD_RULES.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (PASSWORD_RULES.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return errors;
};

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const colorScheme = useColorScheme();

  const handlePasswordChange = (text: string) => {
    setPassword(text);
  };

  const handleSignup = async () => {
    setFormErrors([]);
    setPasswordErrors([]);
    
    const errors: string[] = [];
    if (!email || !password || !name) {
      errors.push('Please fill in all fields');
    }

    if (!validateEmail(email)) {
      errors.push('Please enter a valid email address');
    }

    const pwErrors = validatePassword(password);
    setPasswordErrors(pwErrors);
    
    if (errors.length > 0 || pwErrors.length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setLoading(true);
      
      // Create a proper redirect URL with explicit scheme and path
      const redirectUrl = 'codeonthego://auth-callback';
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        setFormErrors([error.message]);
        return;
      }

      if (data.user) {
        // Check if email confirmation is required
        if (data.session === null) {
          router.replace({
            pathname: '/login',
            params: {
              message: 'Please check your email for the verification link. After verifying, you can log in.',
            },
          });
        } else {
          // If email confirmation is not required, redirect to home
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      setFormErrors([error.message]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <BlurView intensity={80} style={styles.blurContainer}>
        <View style={styles.formContainer}>
          <ThemedText style={styles.title}>Create Account</ThemedText>
          
          {formErrors.length > 0 && (
            <View style={styles.errorContainer}>
              {formErrors.map((error, index) => (
                <ThemedText key={index} style={styles.errorText}>
                  • {error}
                </ThemedText>
              ))}
            </View>
          )}
          
          <TextInput
            style={[
              styles.input,
              { color: Colors[colorScheme ?? 'light'].text }
            ]}
            placeholder="Full Name"
            placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
            value={name}
            onChangeText={setName}
            editable={!loading}
          />

          <TextInput
            style={[
              styles.input,
              { color: Colors[colorScheme ?? 'light'].text }
            ]}
            placeholder="Email"
            placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
          
          <TextInput
            style={[
              styles.input,
              { color: Colors[colorScheme ?? 'light'].text }
            ]}
            placeholder="Password"
            placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry
            editable={!loading}
          />

          {passwordErrors.length > 0 && (
            <View style={styles.errorContainer}>
              {passwordErrors.map((error, index) => (
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
                backgroundColor: Colors[colorScheme ?? 'light'].tint,
                opacity: loading ? 0.7 : 1
              }
            ]}
            onPress={handleSignup}
            disabled={loading}
          >
            <ThemedText style={styles.buttonText}>
              {loading ? 'Signing up...' : 'Sign Up'}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.footer}>
            <ThemedText>Already have an account? </ThemedText>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <ThemedText style={styles.link}>Login</ThemedText>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </BlurView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  blurContainer: {
    borderRadius: 20,
  },
  formContainer: {
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    height: 40,
    lineHeight: 40,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
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
    color: '#007AFF',
    fontWeight: '600',
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
}); 