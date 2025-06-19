import { ThemedText } from '@/components/ThemedText';
import { TopicProblem, TopicService } from '@/lib/services/topicService';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';

interface TopicProblemWithProgress extends TopicProblem {
  completed?: boolean;
  stars?: number;
}

interface UserProgress {
  problem_id: number;
  completed: boolean;
  stars: number;
}

// Pre-load star icons
const starIcon = require('@/assets/images/icons/star-icon.png');
const emptyStarIcon = require('@/assets/images/icons/empty-star.png');

const mascotIcon = require('@/assets/images/icons/codeonthego-bird-icon.png');
const coinIcon = require('@/assets/images/icons/codeonthego-icon.png'); // Placeholder for coin
const bookIcon = require('@/assets/images/icons/book-icon.png');
const chestIcon = require('@/assets/images/icons/checklist-icon.png'); // Placeholder for chest

const PURPLE = '#6564c7';
const LIGHT_PURPLE = 'rgba(101, 100, 199, 0.12)';

const BUBBLE_SIZE = 64;
const STAR_SIZE_LARGE = 48;
const STAR_SIZE_SMALL = 32;
const ROADMAP_WIDTH = 340; // or any value wider than BUBBLE_SIZE*2
const BUBBLE_VERTICAL_GAP = 8; // Reduced from 24

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
  const { topic } = useLocalSearchParams();
  const router = useRouter();
  const [questions, setQuestions] = useState<TopicProblemWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [topicStats, setTopicStats] = useState<any>(null);
  const [progress, setProgress] = useState<Record<number, UserProgress>>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(null);

  useEffect(() => {
    loadTopicData();
  }, [topic]);

  useEffect(() => {
    if (currentQuestionIndex !== null && !loading) {
      setTimeout(() => {
        // Scroll to the bottom (easiest question)
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentQuestionIndex, loading]);

  const loadTopicData = async () => {
    try {
      setLoading(true);
      const [problems, stats] = await Promise.all([
        TopicService.getTopicProblems(topic as string),
        TopicService.getTopicStats(topic as string)
      ]);

      // Get user progress for these problems
      const { data: { user } } = await supabase.auth.getUser();
      let progressMap: Record<number, UserProgress> = {};
      if (user) {
        const { data: progressData } = await supabase
          .from('user_problem_progress')
          .select('problem_id, completed, stars')
          .eq('user_id', user.id);
        progressData?.forEach(p => {
          progressMap[p.problem_id] = p;
        });
      }
      // Combine problems with progress data (original order: easy to hard)
      const problemsWithProgress = problems.map(problem => ({
        ...problem,
        completed: progressMap[problem.leetcode_id]?.completed || false,
        stars: progressMap[problem.leetcode_id]?.stars || 0
      }));
      setQuestions(problemsWithProgress);
      setTopicStats(stats);
      // Find the first unlocked but not completed question (original order)
      const currentIndex = problemsWithProgress.findIndex((q, idx, arr) =>
        !q.completed && (idx === 0 || arr[idx - 1].completed)
      );
      setCurrentQuestionIndex(currentIndex >= 0 ? currentIndex : 0);
    } catch (error) {
      console.error('Error loading topic data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionPress = (q: TopicProblemWithProgress, idx: number) => {
    if (!q.completed && !isUnlocked(q, idx)) return;
    router.push({
      pathname: '/screens/question',
      params: {
        id: q.leetcode_id.toString(),
        name: q.title,
        difficulty: q.difficulty,
        topic,
      },
    });
  };

  const isUnlocked = (q: TopicProblemWithProgress, idx: number) => {
    if (idx === 0) return true;
    const prev = questions[idx - 1];
    return prev.completed;
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
    const isLocked = index > 0 && !questions[index - 1].completed;
    const isCompleted = question.completed;
    const stars = question.stars || 0;
    const isLeft = index % 2 === 0;
    const bubbleAlignStyle = isLeft ? styles.bubbleLeft : styles.bubbleRight;

    // Determine which stars are filled
    const filled = [false, false, false];
    if (isCompleted) {
      for (let i = 0; i < stars; i++) filled[i] = true;
    }

    return (
      <View key={question.leetcode_id} style={[styles.roadmapItem]}>
        <View style={bubbleAlignStyle}>
          <TouchableOpacity
            style={[
              styles.questionCard,
              isLocked && styles.lockedCard,
              isCompleted && styles.completedCard,
            ]}
            onPress={() => handleQuestionPress(question, index)}
            disabled={isLocked}
            activeOpacity={isLocked ? 1 : 0.7}
          >
            {isLocked ? (
              <Image
                source={require('@/assets/images/icons/lock-icon.png')}
                style={styles.lockIcon}
              />
            ) : (
              <View style={styles.starsInsideBubble}>
                {[1, 2, 3].map((star, i) => (
                  <StarSVG key={star} size={22} filled={filled[i]} />
                ))}
              </View>
            )}
          </TouchableOpacity>
          <ThemedText
            style={styles.questionTitleBelow}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {question.title}
          </ThemedText>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#6564c7" />
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

      <View style={styles.topicHeader}>
        <ThemedText style={styles.topicTitle}>{topic}</ThemedText>
        {topicStats && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={styles.starContainer}>
                <ThemedText style={styles.starIconText}>★</ThemedText>
                <ThemedText style={styles.statValue}>{topicStats.total_stars}</ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>Total Stars</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{topicStats.completion_percentage}%</ThemedText>
              <ThemedText style={styles.statLabel}>Completed</ThemedText>
            </View>
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.roadmapContainer}
        contentContainerStyle={[styles.roadmapContent, { minHeight: questions.length * (BUBBLE_SIZE + BUBBLE_VERTICAL_GAP * 2) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.verticalPathContainer}>
          {/* Background Path */}
          <View style={styles.backgroundPath}>
            <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
              {[...questions].reverse().map((_, index) => {
                if (index === questions.length - 1) return null;
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
          {[...questions].reverse().map((question, index) => {
            const actualIndex = questions.length - 1 - index;
            const isLeft = index % 2 === 0;
            const isCurrent = actualIndex === currentQuestionIndex;
            const isLocked = !isUnlocked(question, actualIndex);
            
            let icon = coinIcon;
            if (actualIndex % 4 === 1) icon = bookIcon;
            if (actualIndex % 4 === 3) icon = chestIcon;
            
            return (
              <View key={question.leetcode_id} style={styles.milestoneWrapper}>
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
                      {question.title}
                    </ThemedText>
                  </View>

                  {/* Center Bubble */}
                  <View style={styles.milestoneCenter}>
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
                          source={require('@/assets/images/icons/lock-icon.png')} 
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
                    {isCurrent && (
                      <View style={styles.starsRow}>
                        {[1, 2, 3].map((star, i) => (
                          <Image
                            key={star}
                            source={i < (question.stars || 0) ? starIcon : emptyStarIcon}
                            style={styles.starIcon}
                          />
                        ))}
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
                      {question.title}
                    </ThemedText>
                  </View>
                </View>
              </View>
            );
          })}
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
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  starIcon: {
    width: 24,
    height: 24,
    marginHorizontal: 2,
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
});