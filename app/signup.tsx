import { Link, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';

const validatePassword = (password: string) => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
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

  const handlePasswordChange = (text: string) => {
    setPassword(text);
  };

  const handleSignup = async () => {
    setLoading(true);
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
      setLoading(false);
      return;
    }

    try {
      // Navigate to onboarding. Account creation is done on the backend to keep service-role keys off the client.
      router.push({
        pathname: '/onboarding',
        params: {
          email,
          password,
          name,
        },
      });

    } catch (error: any) {
      setFormErrors(['Network error. Please check your connection and try again.']);
      console.error('Signup validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <ThemedText style={styles.title}>Create Account</ThemedText>
        
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#687076"
          value={name}
          onChangeText={setName}
          editable={!loading}
        />

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
          onChangeText={handlePasswordChange}
          secureTextEntry
          editable={!loading}
        />

        {(formErrors.length > 0 || passwordErrors.length > 0) && (
          <View style={styles.errorContainer}>
            {formErrors.map((error, index) => (
              <ThemedText key={`form-${index}`} style={styles.errorText}>
                • {error}
              </ThemedText>
            ))}
            {passwordErrors.map((error, index) => (
              <ThemedText key={`password-${index}`} style={styles.errorText}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  formContainer: {
    padding: 20,
    justifyContent: 'center',
    backgroundColor: 'white',
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
}); 