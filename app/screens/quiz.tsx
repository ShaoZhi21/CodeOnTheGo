import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import { Image, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface TopicQuiz {
  id: string;
  name: string;
  description: string;
  questionCount: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  color: string;
  icon: any;
}

const getTopicIcon = (topicName: string) => {
  const iconMap: { [key: string]: any } = {
    'Array': require('@/assets/images/icons/list-icon.png'),
    'String': require('@/assets/images/icons/code-icon.png'),
    'LinkedList': require('@/assets/images/icons/list-icon.png'),
    'Stack': require('@/assets/images/icons/list-icon.png'),
    'Tree': require('@/assets/images/icons/book-icon.png'),
    'Graph': require('@/assets/images/icons/shuffle-icon.png'),
    'Hash': require('@/assets/images/icons/magnifying-glass-icon.png'),
    'DP': require('@/assets/images/icons/fire-icon.png'),
    'Greedy': require('@/assets/images/icons/star-icon.png'),
    'Two Pointers': require('@/assets/images/icons/duel-icon.png'),
  };
  
  return iconMap[topicName] || require('@/assets/images/icons/code-icon.png');
};

export default function QuizScreen() {
  const router = useRouter();

  // Hardcoded topical quizzes
  const topicalQuizzes: TopicQuiz[] = [
    {
      id: 'array',
      name: 'Array',
      description: 'Test your array manipulation skills',
      questionCount: 10,
      difficulty: 'Easy',
      color: '#8B5CF6',
      icon: getTopicIcon('Array')
    },
    {
      id: 'string',
      name: 'String',
      description: 'String processing and algorithms',
      questionCount: 8,
      difficulty: 'Medium',
      color: '#F59E0B',
      icon: getTopicIcon('String')
    },
    {
      id: 'linkedlist',
      name: 'LinkedList',
      description: 'Linked list operations and patterns',
      questionCount: 7,
      difficulty: 'Medium',
      color: '#10B981',
      icon: getTopicIcon('LinkedList')
    },
    {
      id: 'tree',
      name: 'Tree',
      description: 'Binary trees and tree traversals',
      questionCount: 12,
      difficulty: 'Hard',
      color: '#3B82F6',
      icon: getTopicIcon('Tree')
    },
    {
      id: 'dp',
      name: 'DP',
      description: 'Dynamic programming challenges',
      questionCount: 15,
      difficulty: 'Hard',
      color: '#EF4444',
      icon: getTopicIcon('DP')
    },
    {
      id: 'graph',
      name: 'Graph',
      description: 'Graph algorithms and traversals',
      questionCount: 9,
      difficulty: 'Hard',
      color: '#8B5CF6',
      icon: getTopicIcon('Graph')
    }
  ];

  const handleTopicQuiz = (topic: TopicQuiz) => {
    // Navigate to actual quiz with topic
    console.log(`Starting ${topic.name} quiz`);
    // router.push(`/screens/topicquiz?topic=${topic.id}`);
  };

  const handlePastMistakesQuiz = () => {
    // Navigate to past mistakes quiz
    console.log('Starting past mistakes quiz');
    // router.push('/screens/mistakesquiz');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '#10B981';
      case 'Medium': return '#F59E0B';
      case 'Hard': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <ThemedText style={styles.mainTitle}>Quiz Center</ThemedText>
          <ThemedText style={styles.subtitle}>
            Test your knowledge with topic-based quizzes or review past mistakes
          </ThemedText>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Past Mistakes Quiz */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Review Your Mistakes</ThemedText>
          <TouchableOpacity style={styles.mistakesCard} onPress={handlePastMistakesQuiz}>
            <View style={styles.mistakesIconContainer}>
              <Image 
                source={require('@/assets/images/icons/retry-icon.png')} 
                style={styles.mistakesIcon}
              />
            </View>
            <View style={styles.mistakesContent}>
              <ThemedText style={styles.mistakesTitle}>Past Mistakes Quiz</ThemedText>
              <ThemedText style={styles.mistakesDescription}>
                Practice problems you have gotten wrong before
              </ThemedText>
              <View style={styles.mistakesBadge}>
                <ThemedText style={styles.mistakesBadgeText}>12 Questions Available</ThemedText>
              </View>
            </View>
            <View style={styles.mistakesArrow}>
              <Image 
                source={require('@/assets/images/icons/up-arrow.png')} 
                style={styles.arrowIcon}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Topical Quizzes */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Topic-Based Quizzes</ThemedText>
          <View style={styles.topicsGrid}>
            {topicalQuizzes.map((topic) => (
              <TouchableOpacity 
                key={topic.id} 
                style={styles.topicCard}
                onPress={() => handleTopicQuiz(topic)}
              >
                <View style={[styles.topicIconContainer, { backgroundColor: topic.color }]}>
                  <Image source={topic.icon} style={styles.topicIcon} />
                </View>
                <View style={styles.topicContent}>
                  <ThemedText style={styles.topicName}>{topic.name}</ThemedText>
                  <ThemedText style={styles.topicDescription}>{topic.description}</ThemedText>
                  <View style={styles.topicMeta}>
                    <View style={styles.questionCount}>
                      <ThemedText style={styles.questionCountText}>{topic.questionCount} Questions</ThemedText>
                    </View>
                    <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(topic.difficulty) }]}>
                      <ThemedText style={styles.difficultyText}>{topic.difficulty}</ThemedText>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6FF',
  },
  scrollView: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: '#8B5CF6',
  },
  headerContent: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6564c7',
    marginBottom: 8,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },

  // Past Mistakes Card
  mistakesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  mistakesIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mistakesIcon: {
    width: 24,
    height: 24,
    tintColor: '#EF4444',
  },
  mistakesContent: {
    flex: 1,
  },
  mistakesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  mistakesDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  mistakesBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  mistakesBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  mistakesArrow: {
    marginLeft: 12,
  },
  arrowIcon: {
    width: 16,
    height: 16,
    tintColor: '#8B5CF6',
    transform: [{ rotate: '90deg' }],
  },

  // Topics Grid
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  topicCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  topicIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  topicIcon: {
    width: 20,
    height: 20,
  },
  topicContent: {
    flex: 1,
  },
  topicName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 3,
  },
  topicDescription: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 14,
    marginBottom: 10,
  },
  topicMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionCount: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  questionCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  bottomSpacing: {
    height: 20,
  },
}); 