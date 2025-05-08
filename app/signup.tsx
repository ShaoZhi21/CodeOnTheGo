import { BlurView } from 'expo-blur';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const colorScheme = useColorScheme();

  const handleSignup = () => {
    // TODO: Implement signup logic
    router.replace('/(tabs)');
  };

  return (
    <ThemedView style={styles.container}>
      <BlurView intensity={80} style={styles.blurContainer}>
        <View style={styles.formContainer}>
          <ThemedText style={styles.title}>Create Account?!!!!!!</ThemedText>
          
          <TextInput
            style={[
              styles.input,
              { color: Colors[colorScheme ?? 'light'].text }
            ]}
            placeholder="Full Name"
            placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
            value={name}
            onChangeText={setName}
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
          />
          
          <TextInput
            style={[
              styles.input,
              { color: Colors[colorScheme ?? 'light'].text }
            ]}
            placeholder="Password"
            placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
            onPress={handleSignup}
          >
            <ThemedText style={styles.buttonText}>Sign Up</ThemedText>
          </TouchableOpacity>

          <View style={styles.footer}>
            <ThemedText>Already have an account? </ThemedText>
            <Link href = "/login" asChild>
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
}); 