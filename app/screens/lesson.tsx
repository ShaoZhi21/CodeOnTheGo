import { ThemedText } from '@/components/ThemedText';
import { apiCall } from '@/lib/api-config';
import { decodeHtmlEntities } from '@/lib/utils/textUtils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface LessonContent {
  title: string;
  content: string;
  keyConcepts: string[];
  examples: string[];
}

export default function LessonScreen() {
  const params = useLocalSearchParams();
  const { questionId, questionTitle, questionDescription } = params;
  const router = useRouter();
  
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateLessonContent();
  }, []);

  const generateLessonContent = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiCall('/generate-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: questionTitle,
          description: questionDescription,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLessonContent(data);
      } else {
        setError('Failed to generate lesson content');
      }
    } catch (error) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    router.push({
      pathname: '/screens/quiz',
      params: {
        questionId,
        questionTitle,
        questionDescription,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6564c7" />
          <ThemedText style={styles.loadingText}>Generating lesson content...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={generateLessonContent}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
          <ThemedText>Back</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {lessonContent && (
          <>
            <View style={styles.titleContainer}>
              <ThemedText style={styles.title}>{decodeHtmlEntities(String(questionTitle))}</ThemedText>
              <View style={styles.lessonBadge}>
                <Image source={require('@/assets/images/icons/book-icon.png')} style={styles.lessonIcon} />
                <ThemedText style={styles.lessonBadgeText}>Lesson</ThemedText>
              </View>
            </View>

            <View style={styles.contentSection}>
              <ThemedText style={styles.contentText}>{lessonContent.content}</ThemedText>
            </View>

            {lessonContent.keyConcepts && lessonContent.keyConcepts.length > 0 && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Key Concepts</ThemedText>
                {lessonContent.keyConcepts.map((concept, index) => (
                  <View key={index} style={styles.conceptItem}>
                    <View style={styles.bulletPoint} />
                    <ThemedText style={styles.conceptText}>{concept}</ThemedText>
                  </View>
                ))}
              </View>
            )}

            {lessonContent.examples && lessonContent.examples.length > 0 && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Examples</ThemedText>
                {lessonContent.examples.map((example, index) => (
                  <View key={index} style={styles.exampleItem}>
                    <ThemedText style={styles.exampleText}>{example}</ThemedText>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.quizButton} onPress={handleStartQuiz}>
          <Image source={require('@/assets/images/icons/quiz-icon.png')} style={styles.quizIcon} />
          <ThemedText style={styles.quizButtonText}>Take Quiz</ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6564c7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d2d2d',
    marginBottom: 12,
  },
  lessonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  lessonIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  lessonBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976d2',
  },
  contentSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2d2d2d',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d2d2d',
    marginBottom: 16,
  },
  conceptItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6564c7',
    marginTop: 8,
    marginRight: 12,
  },
  conceptText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#2d2d2d',
  },
  exampleItem: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#2d2d2d',
    fontStyle: 'italic',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  quizButton: {
    backgroundColor: '#6564c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  quizIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  quizButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 