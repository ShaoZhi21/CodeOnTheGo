import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import QuestionActionModal from '../../components/QuestionActionModal';
import { ThemedText } from '../../components/ThemedText';
import { TopicProblem, TopicService } from '../../lib/services/topicService';
import { supabase } from '../../lib/supabase';

interface TopicProblemWithProgress extends TopicProblem {
  completed?: boolean;
  stars?: number;
}

interface UserProgress {
  problem_id: number;
  completed: boolean;
  stars: number;
}

// Icons
const coinIcon = require('../../assets/images/icons/code-icon.png');
const starIcon = require('../../assets/images/icons/star-icon.png');
const emptyStarIcon = require('../../assets/images/icons/empty-star.png');
const mascotIcon = require('../../assets/images/icons/codeonthego-bird-icon.png');

// Roadmap icons
const bookIcon = require('../../assets/images/icons/book-icon.png');
const chestIcon = require('../../assets/images/icons/checklist-icon.png'); // Placeholder for chest

const PURPLE = '#6564c7';
const LIGHT_PURPLE = 'rgba(101, 100, 199, 0.12)';

const BUBBLE_SIZE = 64;
const STAR_SIZE_LARGE = 48;
const STAR_SIZE_SMALL = 32;
const ROADMAP_WIDTH = 340; // or any value wider than BUBBLE_SIZE*2
const BUBBLE_VERTICAL_GAP = 8; // Reduced from 24

// Local decodeHtmlEntities function to avoid import issues
const decodeHtmlEntities = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
};

function StarSVG({ size, filled }: { size: number; filled: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Path
        d="M14 4l3.09 6.26L24 11.27l-5 4.87L20.18 24 14 20.56 7.82 24 9 16.14l-5-4.87 6.91-1.01z"
        fill={filled ? '#fff' : 'none'}
        stroke={PURPLE}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function RoadmapTopic() {
  const params = useLocalSearchParams();
  const topic = Array.isArray(params.topic) ? params.topic[0] : params.topic;
  const topicString = typeof topic === 'string' ? topic : '';

  console.log('RoadmapTopic: topic param =', topicString);
  
  const router = useRouter();
  const [questions, setQuestions] = useState<TopicProblemWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [topicStats, setTopicStats] = useState<any>(null);
  const [progress, setProgress] = useState<Record<number, UserProgress>>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(null);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<TopicProblemWithProgress | null>(null);
  const [userSkillLevel, setUserSkillLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [lessonProgress, setLessonProgress] = useState<Record<number, boolean>>({});

  console.log('RoadmapTopic: Component initialized');

  // Reload data when screen comes into focus (e.g., returning from question screen)
  useFocusEffect(
    useCallback(() => {
      if (topicString) {
        loadTopicData();
      }
    }, [topicString])
  );

  useEffect(() => {
    if (currentQuestionIndex !== null && !loading) {
      setTimeout(() => {
        // Scroll to the bottom (easiest question)
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentQuestionIndex, loading]);

  const loadTopicData = async () => {
    console.log('RoadmapTopic: loadTopicData called');
    if (!topicString) {
      console.log('RoadmapTopic: Aborting load, no topic string.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      console.log('RoadmapTopic: Fetching problems for topic:', topicString);
      
      const problems = await TopicService.getTopicProblems(topicString);

      console.log('RoadmapTopic: Problems fetched:', problems?.length || 0);
      console.log('RoadmapTopic: First problem:', problems?.[0]);

      // Get user progress for these problems
      const { data: { user } } = await supabase.auth.getUser();
      console.log('RoadmapTopic: User found:', !!user);
      
      let progressMap: Record<number, UserProgress> = {};
      let lessonProgressMap: Record<number, boolean> = {};
      
      if (user) {
        // Get problem progress
        const { data: progressData } = await supabase
          .from('user_problem_progress')
          .select('problem_id, is_solved, stars')
          .eq('user_id', user.id);
        progressData?.forEach(p => {
          progressMap[p.problem_id] = {
            problem_id: p.problem_id,
            completed: p.is_solved,
            stars: p.stars
          };
        });

        // Get user profile for skill level
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('skill_level')
          .eq('user_id', user.id)
          .single();
        
        console.log('Profile query result:', { profileData, profileError });
        
        if (profileData?.skill_level) {
          setUserSkillLevel(profileData.skill_level);
          console.log('User skill level loaded:', profileData.skill_level);
        } else {
          console.log('No skill level found, defaulting to Beginner');
          setUserSkillLevel('Beginner');
        }

        // Get lesson completion status from database
        const { data: lessonData, error: lessonError } = await supabase
          .from('user_lesson_completion')
          .select('problem_id, quiz_completed')
          .eq('user_id', user.id);
        
        console.log('Lesson completion query result:', { lessonData, lessonError });
        
        if (lessonData) {
          lessonData.forEach(lesson => {
            lessonProgressMap[lesson.problem_id] = lesson.quiz_completed;
          });
        } else {
          // Default to no quizzes completed for beginners
          problems.forEach((problem, index) => {
            lessonProgressMap[problem.leetcode_id] = false;
          });
        }
        setLessonProgress(lessonProgressMap);
        console.log('Lesson progress set:', lessonProgressMap);
      }
      
      // Combine problems with progress
      const problemsWithProgress: TopicProblemWithProgress[] = problems
        .filter(problem => problem && problem.leetcode_id) // Filter out undefined/null problems
        .map(problem => {
          const safeTitle = problem.title || 'Untitled Problem';
          console.log(`RoadmapTopic: Processing problem - ID: ${problem.leetcode_id}, Title: "${safeTitle}"`);
          console.log(`RoadmapTopic: Raw title: "${safeTitle}"`);
          console.log(`RoadmapTopic: Decoded title: "${decodeHtmlEntities(safeTitle)}"`);
          return {
            ...problem,
            title: safeTitle, // Ensure title is never undefined
            completed: progressMap[problem.leetcode_id]?.completed || false,
            stars: progressMap[problem.leetcode_id]?.stars || 0,
          };
        });

      // Calculate user-specific stats
      const totalStars = problemsWithProgress.reduce((sum, problem) => {
        const problemStars = problem.stars || 0;
        console.log(`RoadmapTopic: Problem ${problem.leetcode_id} "${problem.title}" - stars: ${problemStars}, completed: ${problem.completed}`);
        return sum + problemStars;
      }, 0);
      const completedProblems = problemsWithProgress.filter(problem => problem.completed).length;
      const completionPercentage = problemsWithProgress.length > 0 ? Math.round((completedProblems / problemsWithProgress.length) * 100) : 0;
      
      const userStats = {
        total_stars: totalStars,
        completion_percentage: completionPercentage
      };

      console.log('RoadmapTopic: Problems with progress created:', problemsWithProgress.length);
      console.log('RoadmapTopic: User stats calculated:', userStats);
      console.log('RoadmapTopic: Progress map details:', progressMap);
      console.log('RoadmapTopic: Problems with progress details:', problemsWithProgress.map(p => ({
        id: p.leetcode_id,
        title: p.title,
        stars: p.stars,
        completed: p.completed
      })));
      setQuestions(problemsWithProgress);
      setTopicStats(userStats);
      setCurrentQuestionIndex(problemsWithProgress.findIndex(q => !q.completed));
      console.log('RoadmapTopic: Data loading completed successfully');
    } catch (error) {
      console.error('RoadmapTopic: Error loading topic data:', error);
    } finally {
      setLoading(false);
      console.log('RoadmapTopic: Loading state set to false');
    }
  };

  const handleQuestionPress = (q: TopicProblemWithProgress, idx: number) => {
    if (!q?.completed && !isUnlocked(q, idx)) return;
    
    // Show the action modal instead of directly navigating
    setSelectedQuestion(q);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    console.log('Closing modal');
    setModalVisible(false);
    setSelectedQuestion(null);
  };

  const isUnlocked = (q: TopicProblemWithProgress, idx: number) => {
    console.log(`🔓 Checking unlock for question ${idx}: ${q.title}`);
    console.log(`🔓 User skill level: ${userSkillLevel}`);
    console.log(`🔓 Question difficulty: ${q.difficulty}`);
    
    // First question is always unlocked
    if (idx === 0) {
      console.log(`🔓 First question - always unlocked`);
      return true;
    }
    
    // Level unlocking: previous question must have 3+ stars (out of 5) for ALL users
    const previousQuestion = questions[idx - 1];
    console.log(`🔓 Previous question:`, previousQuestion ? {
      title: previousQuestion.title,
      stars: previousQuestion.stars,
      completed: previousQuestion.completed
    } : 'null');
    
    if (!previousQuestion || (previousQuestion.stars || 0) < 3) {
      console.log(`🔓 Previous question not cleared (need 3+ stars) - LOCKED`);
      return false;
    }
    
    console.log(`🔓 Previous question cleared with ${previousQuestion.stars} stars - LEVEL UNLOCKED`);
    return true;
  };

  // Check if lesson is required before attempting the problem
  const isLessonRequired = (q: TopicProblemWithProgress) => {
    // If question is already solved (3+ stars), no lesson required
    if (q.stars && q.stars >= 3) {
      return false;
    }
    
    // Beginner: Must complete lesson before attempting any problem
    if (userSkillLevel === 'Beginner') {
      return true;
    }
    
    // Intermediate: Must complete lesson for Medium and Hard problems
    if (userSkillLevel === 'Intermediate') {
      return q.difficulty === 'Medium' || q.difficulty === 'Hard';
    }
    
    // Advanced: No lesson required, can attempt problems directly
    if (userSkillLevel === 'Advanced') {
      return false;
    }
    
    // Default to requiring lesson
    return true;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '#4CAF50';
      case 'Medium': return '#FF9800';
      case 'Hard': return '#F44336';
      default: return '#6564c7';
    }
  };

  const renderRoadmapItem = (question: TopicProblemWithProgress, index: number) => {
    // Safety check: ensure question is valid
    if (!question || !question.leetcode_id) {
      console.warn('RoadmapTopic: Skipping invalid question:', question);
      return null;
    }
    
    const actualIndex = (questions?.length || 0) - 1 - index;
    const isLeft = index % 2 === 0;
    const isCurrent = actualIndex === (currentQuestionIndex ?? -1);
    const isLocked = !isUnlocked(question, actualIndex);
    const isCompleted = question.stars && question.stars > 0;
    
    // Safety checks for all properties with proper string conversion
    const safeTitle = String(question.title || 'Untitled Problem');
    const safeDifficulty = String(question.difficulty || 'Easy');
    const safeLeetcodeId = question.leetcode_id || 0;
    
    let icon = coinIcon;
    if (actualIndex % 4 === 1) icon = bookIcon;
    if (actualIndex % 4 === 3) icon = chestIcon;
    
    return (
      <View key={String(safeLeetcodeId)} style={styles.milestoneWrapper}>
        <View style={[
          styles.milestoneContent,
          isLeft ? styles.milestoneLeft : styles.milestoneRight
        ]}>
          {/* Left Text Container */}
          <View style={[
            styles.textContainer,
            isLeft ? styles.textLeft : styles.textHidden
          ]}>
            <ThemedText 
              style={[
                styles.milestoneTitle,
                isLocked && styles.lockedText
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {decodeHtmlEntities(safeTitle)}
            </ThemedText>
            {/* Difficulty indicator */}
            <View style={[
              styles.difficultyBadge,
              { backgroundColor: getDifficultyColor(safeDifficulty) }
            ]}>
              <ThemedText style={styles.difficultyText}>
                {safeDifficulty}
              </ThemedText>
            </View>
          </View>

          {/* Center Bubble */}
          <View style={{ position: 'relative', alignItems: 'center' }}>
            {/* Bubble */}
            <TouchableOpacity
              style={[
                styles.milestoneIconWrapper,
                isCurrent && styles.currentMilestone,
                isLocked && styles.lockedMilestone
              ]}
              onPress={() => handleQuestionPress(question, actualIndex)}
              disabled={isLocked}
            >
              {isLocked ? (
                <Image 
                  source={require('../../assets/images/icons/lock-icon.png')} 
                  style={[styles.lockIcon, { tintColor: '#fff' }]} 
                />
              ) : isCurrent ? (
                <Image source={mascotIcon} style={styles.mascotIcon} />
              ) : (
                <Image 
                  source={icon} 
                  style={[
                    styles.milestoneIcon,
                    isLocked && { tintColor: '#fff' }
                  ]} 
                />
              )}
            </TouchableOpacity>
            {/* Concave stars below bubble: only show if unlocked and completed */}
            {isUnlocked(question, actualIndex) && isCompleted && (
              <View style={styles.concaveStarsContainer} pointerEvents="none">
                {[1, 2, 3, 4, 5].map((star, i) => {
                  const arcOffsets = [18, 9, 0, 9, 18];
                  return (
                    <Image
                      key={String(star)}
                      source={i < (question.stars || 0) ? starIcon : emptyStarIcon}
                      style={[styles.starIcon, { marginBottom: arcOffsets[i] }]}
                    />
                  );
                })}
              </View>
            )}
          </View>

          {/* Right Text Container */}
          <View style={[
            styles.textContainer,
            !isLeft ? styles.textRight : styles.textHidden
          ]}>
            <ThemedText 
              style={[
                styles.milestoneTitle,
                isLocked && styles.lockedText
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {decodeHtmlEntities(safeTitle)}
            </ThemedText>
            {/* Difficulty indicator */}
            <View style={[
              styles.difficultyBadge,
              { backgroundColor: getDifficultyColor(safeDifficulty) }
            ]}>
              <ThemedText style={styles.difficultyText}>
                {safeDifficulty}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading || !topicString) {
    console.log('RoadmapTopic: Rendering loading state');
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#6564c7" />
      </SafeAreaView>
    );
  }

  console.log('RoadmapTopic: Rendering main content, questions count:', questions?.length || 0);
  console.log('RoadmapTopic: Current topicStats being displayed:', topicStats);
  
  // Safety check: if no questions, show empty state
  if (!questions || questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Image source={require('../../assets/images/icons/back-icon.png')} style={styles.backIcon} />
            <ThemedText>Back</ThemedText>
          </TouchableOpacity>
        </View>
        <View style={styles.topicHeader}>
          <ThemedText style={styles.topicTitle}>{topicString}</ThemedText>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ThemedText>No problems found for this topic.</ThemedText>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Image source={require('../../assets/images/icons/back-icon.png')} style={styles.backIcon} />
          <ThemedText>Back</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.topicHeader}>
        <ThemedText style={styles.topicTitle}>{topicString}</ThemedText>
        {topicStats && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={styles.starContainer}>
                <ThemedText style={styles.starIconText}>★</ThemedText>
                <ThemedText style={styles.statValue}>{String(topicStats.total_stars || 0)}</ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>Total Stars</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{String(topicStats.completion_percentage || 0)}%</ThemedText>
              <ThemedText style={styles.statLabel}>Completed</ThemedText>
            </View>
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.roadmapContainer}
        contentContainerStyle={[styles.roadmapContent, { minHeight: (questions?.length || 0) * (BUBBLE_SIZE + BUBBLE_VERTICAL_GAP * 2) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.verticalPathContainer}>
          {/* Background Path */}
          <View style={styles.backgroundPath}>
            <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
              {(questions || []).map((_, index) => {
                if (index === (questions?.length || 0) - 1) return null;
                const startY = (index + 0.5) * (BUBBLE_SIZE + 48); // 48 is the adjusted vertical gap
                const endY = (index + 1.5) * (BUBBLE_SIZE + 48);
                const isLeft = index % 2 === 0;
                const curveX = isLeft ? 40 : -40;
                
                return (
                  <Path
                    key={index}
                    d={`M${ROADMAP_WIDTH/2},${startY} Q${ROADMAP_WIDTH/2 + curveX},${(startY + endY)/2} ${ROADMAP_WIDTH/2},${endY}`}
                    stroke="#E6E6FA"
                    strokeWidth={20}
                    fill="none"
                    strokeLinecap="round"
                  />
                );
              })}
            </Svg>
          </View>

          {/* Milestones */}
          {[...(questions || [])].reverse().map((question, index) => {
            return renderRoadmapItem(question, index);
          })}
        </View>
      </ScrollView>

      {/* Question Action Modal */}
      {selectedQuestion && (
        <QuestionActionModal
          visible={modalVisible}
          onClose={handleCloseModal}
          questionTitle={decodeHtmlEntities(String(selectedQuestion.title || 'Untitled Problem'))}
          questionId={selectedQuestion.leetcode_id || 0}
          userSkillLevel={userSkillLevel}
          hasCompletedLesson={lessonProgress[selectedQuestion.leetcode_id || 0] || false}
          questionDifficulty={(selectedQuestion.difficulty || 'Easy') as 'Easy' | 'Medium' | 'Hard'}
          questionDescription={String(selectedQuestion.description || `Solve the problem: ${decodeHtmlEntities(String(selectedQuestion.title || 'Untitled Problem'))}`)}
          isLessonRequired={isLessonRequired(selectedQuestion)}
          isQuestionSolved={(selectedQuestion.stars || 0) >= 3}
          topicName={topicString || ''}
        />
      )}
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
  topicHeader: {
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  topicTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
  statItem: {
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  starIconText: {
    fontSize: 24,
    color: '#FFD700',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6564c7',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
  },
  roadmapContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  roadmapContent: {
    width: '100%',
    maxWidth: ROADMAP_WIDTH,
    alignItems: 'center',
    alignSelf: 'center',
    position: 'relative',
  },
  roadmapItem: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 0,
  },
  bubbleLeft: {
    marginLeft: 0,
    marginRight: 'auto',
  },
  bubbleRight: {
    marginLeft: 'auto',
    marginRight: 0,
  },
  questionCard: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    backgroundColor: LIGHT_PURPLE,
    borderColor: PURPLE,
    borderWidth: 2,
    borderRadius: BUBBLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: BUBBLE_VERTICAL_GAP,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  lockedCard: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
    opacity: 1,
  },
  completedCard: {
    backgroundColor: '#edeafd',
    borderColor: PURPLE,
    opacity: 1,
  },
  starsInsideBubble: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  lockIcon: {
    width: 28,
    height: 28,
    tintColor: '#fff',
    alignSelf: 'center',
  },
  questionTitleBelow: {
    fontSize: 15,
    fontWeight: 'bold',
    color: PURPLE,
    marginTop: 6,
    maxWidth: 120,
    textAlign: 'center',
  },
  verticalPathContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
    paddingVertical: 32,
    alignItems: 'center',
  },
  backgroundPath: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  milestoneWrapper: {
    width: '100%',
    marginVertical: 24,
    alignItems: 'center',
  },
  milestoneContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: ROADMAP_WIDTH,
    justifyContent: 'center',
  },
  textContainer: {
    width: 120,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  textLeft: {
    opacity: 1,
  },
  textRight: {
    opacity: 1,
  },
  textHidden: {
    opacity: 0,
  },
  milestoneCenter: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  milestoneIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fffbe6',
    borderWidth: 3,
    borderColor: '#ffe066',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#ffe066',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  currentMilestone: {
    borderColor: '#5f8dff',
    backgroundColor: '#eef4ff',
    shadowColor: '#5f8dff',
  },
  lockedMilestone: {
    backgroundColor: '#d1d1d1',
    borderColor: '#a0a0a0',
    shadowColor: '#a0a0a0',
  },
  mascotIcon: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  milestoneIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  concaveStarsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    position: 'absolute',
    top: 'auto',
    bottom: -28,
    left: 0,
    right: 0,
    zIndex: 2,
    pointerEvents: 'none',
  },
  starIcon: {
    width: 22,
    height: 22,
    marginHorizontal: 1,
  },
  milestoneTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#6564c7',
    textAlign: 'center',
  },
  lockedText: {
    color: '#a0a0a0',
  },
  levelUpButton: {
    width: 200,
    backgroundColor: '#5f8dff',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    alignSelf: 'center',
    shadowColor: '#5f8dff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  levelUpButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  milestoneLeft: {
    flexDirection: 'row',
  },
  milestoneRight: {
    flexDirection: 'row',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 16,
    marginTop: 4,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
});