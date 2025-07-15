import { useCallback, useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../../components/ThemedText';

interface LessonPart {
  title: string;
  content: string;
  mcq?: {
    id: number;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  };
}

interface LessonData {
  title: string;
  content: string;
  definitionBox?: string;
  keyConcepts: string[];
  example: string;
  hint: string;
  commonMistake: string;
  funFact?: string;
  parts?: LessonPart[];
}

interface TeachingPageProps {
  lessonData: LessonData | null;
  currentPartIndex: number;
  onStartQuiz: () => void;
  onPartComplete: (partIndex: number) => void;
}

export default function TeachingPage({
  lessonData,
  currentPartIndex,
  onStartQuiz,
  onPartComplete
}: TeachingPageProps) {
  console.log('🎨 Rendering teaching page with lessonData:', lessonData);
  console.log('🎨 lessonData?.parts:', lessonData?.parts);
  console.log('🎨 currentPartIndex:', currentPartIndex);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Memoize the current part to prevent unnecessary re-renders
  const currentPart = useMemo(() => {
    return lessonData?.parts?.[currentPartIndex] || null;
  }, [lessonData?.parts, currentPartIndex]);

  // Handle part completion
  const handlePartComplete = useCallback(() => {
    if (currentPartIndex < (lessonData?.parts?.length || 0) - 1) {
      onPartComplete(currentPartIndex);
    } else {
      onStartQuiz();
    }
  }, [currentPartIndex, lessonData?.parts?.length, onPartComplete, onStartQuiz]);

  // Render lesson content with memoization
  const renderLessonContent = useCallback((content: string) => {
    if (!content || typeof content !== 'string') {
      return [<ThemedText key="no-content" style={styles.lessonText}>No content available</ThemedText>];
    }

    const lines = content.split(/\r?\n/);
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('## ')) {
        return (
          <ThemedText key={`header-${index}`} style={styles.lessonHeader}>
            {trimmedLine.replace(/^## /, '')}
          </ThemedText>
        );
      } else if (trimmedLine.startsWith('### ')) {
        return (
          <ThemedText key={`subheader-${index}`} style={[styles.lessonHeader, { fontSize: 17, color: '#453d83' }]}>
            {trimmedLine.replace(/^### /, '')}
          </ThemedText>
        );
      } else if (trimmedLine.length > 0) {
        return (
          <ThemedText key={`text-${index}`} style={styles.lessonText}>
            {trimmedLine}
          </ThemedText>
        );
      } else {
        return <ThemedText key={`space-${index}`} style={{ marginBottom: 8 }}>{' '}</ThemedText>;
      }
    });
  }, []);

  // Render the current part's content
  const renderedContent = useMemo(() => {
    return currentPart?.content ? renderLessonContent(currentPart.content) : null;
  }, [currentPart?.content, renderLessonContent]);

  return (
    <ScrollView style={styles.container}>
      {/* Title */}
      {lessonData?.title && (
        <ThemedText style={styles.title}>{lessonData.title}</ThemedText>
      )}

      {/* Current Part */}
      {currentPart && (
        <Animated.View style={[styles.partContainer, { opacity: fadeAnim }]}>
          <ThemedText style={styles.partTitle}>{currentPart.title}</ThemedText>
          <View style={styles.contentContainer}>
            {renderedContent}
          </View>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handlePartComplete}
          >
            <ThemedText style={styles.nextButtonText}>
              {currentPartIndex < (lessonData?.parts?.length || 0) - 1 ? 'Next Part' : 'Start Quiz'}
            </ThemedText>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  partContainer: {
    marginBottom: 16,
  },
  partTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  contentContainer: {
    marginBottom: 16,
  },
  lessonHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#453d83',
  },
  lessonText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  nextButton: {
    backgroundColor: '#6564c7',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 