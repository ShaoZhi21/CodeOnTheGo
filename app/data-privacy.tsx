import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function DataPrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backButtonText}>← Back</ThemedText>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <ThemedText style={styles.headerTitle}>Data & Privacy</ThemedText>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          
          {/* Privacy Policy Section */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Privacy Policy</ThemedText>
            <ThemedText style={styles.sectionText}>
              CodeOnTheGo is committed to protecting your privacy and ensuring the security of your personal information. 
              This Privacy Policy explains how we collect, use, and safeguard your data when you use our coding practice application.
            </ThemedText>
          </View>

          {/* Data Collection */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Data We Collect</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Profile information (name, skill level, preferences)</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Coding progress and performance statistics</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Solution attempts and completion history</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Usage patterns and app interaction data</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Device information for app optimization</ThemedText>
          </View>

          {/* How We Use Data */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>How We Use Your Data</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Personalize your learning experience</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Track your coding progress and achievements</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Provide relevant hints and recommendations</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Improve app performance and features</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Send practice reminders (if enabled)</ThemedText>
          </View>

          {/* Data Protection */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Data Protection & Security</ThemedText>
            <ThemedText style={styles.sectionText}>
              We implement industry-standard security measures to protect your data:
            </ThemedText>
            <ThemedText style={styles.bulletPoint}>• End-to-end encryption for sensitive data</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Secure cloud storage with Supabase</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Regular security audits and updates</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Limited access to personal information</ThemedText>
          </View>

          {/* Your Rights */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Your Privacy Rights</ThemedText>
            <ThemedText style={styles.sectionText}>
              Under GDPR, CCPA, and other privacy laws, you have the right to:
            </ThemedText>
            <ThemedText style={styles.bulletPoint}>• Access your personal data</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Correct inaccurate information</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Delete your account and data</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Export your data</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Opt-out of data processing</ThemedText>
          </View>

          {/* Data Sharing */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Data Sharing</ThemedText>
            <ThemedText style={styles.sectionText}>
              We do not sell, rent, or share your personal information with third parties for marketing purposes. 
              Data may only be shared in the following circumstances:
            </ThemedText>
            <ThemedText style={styles.bulletPoint}>• With your explicit consent</ThemedText>
            <ThemedText style={styles.bulletPoint}>• To comply with legal obligations</ThemedText>
            <ThemedText style={styles.bulletPoint}>• To protect our rights and safety</ThemedText>
            <ThemedText style={styles.bulletPoint}>• With trusted service providers (under strict agreements)</ThemedText>
          </View>

          {/* Cookies & Tracking */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Cookies & Tracking</ThemedText>
            <ThemedText style={styles.sectionText}>
              We use minimal tracking technologies to improve your experience:
            </ThemedText>
            <ThemedText style={styles.bulletPoint}>• Essential cookies for app functionality</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Analytics to understand usage patterns</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Performance monitoring for bug fixes</ThemedText>
            <ThemedText style={styles.sectionText}>
              You can disable non-essential tracking in your device settings.
            </ThemedText>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Contact Us</ThemedText>
            <ThemedText style={styles.sectionText}>
              If you have questions about this Privacy Policy or want to exercise your privacy rights, contact us at:
            </ThemedText>
            <ThemedText style={styles.contactInfo}>Email: privacy@codeonthego.app</ThemedText>
            <ThemedText style={styles.contactInfo}>Address: [Your Company Address]</ThemedText>
          </View>

          {/* Last Updated */}
          <View style={styles.section}>
            <ThemedText style={styles.lastUpdated}>
              Last updated: {new Date().toLocaleDateString()}
            </ThemedText>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 80,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6564c7',
    fontWeight: '600',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 80,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 8,
  },
  contactInfo: {
    fontSize: 14,
    color: '#6564c7',
    fontWeight: '600',
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
}); 