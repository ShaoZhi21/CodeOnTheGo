import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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
  
  try {
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
      .replace(/&#(\d+);/g, (match, dec) => {
        try {
          const charCode = parseInt(dec, 10);
          // Only allow safe character codes (printable ASCII and common Unicode)
          if (charCode >= 32 && charCode <= 126 || charCode >= 160) {
            return String.fromCharCode(charCode);
          }
          return match; // Keep original if unsafe
        } catch (error) {
          console.warn('Error decoding HTML entity:', match, error);
          return match; // Keep original on error
        }
      });
  } catch (error) {
    console.warn('Error in decodeHtmlEntities:', error, 'Original text:', text);
    return text || ''; // Return original text or empty string on error
  }
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
  const fromPage = Array.isArray(params.from) ? params.from[0] : params.from;
  const preFetchedData = params.preFetchedData ? JSON.parse(params.preFetchedData as string) : null;

  console.log('RoadmapTopic: topic param =', topicString);
  console.log('RoadmapTopic: from param =', fromPage);
  
  const router = useRouter();
  const [questions, setQuestions] = useState<TopicProblemWithProgress[]>(preFetchedData?.problems || []);
  const [topicStats, setTopicStats] = useState<any>(preFetchedData?.progress || null);
  const [progress, setProgress] = useState<Record<number, UserProgress>>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(null);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<TopicProblemWithProgress | null>(null);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);
  const [userSkillLevel, setUserSkillLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [lessonProgress, setLessonProgress] = useState<Record<number, boolean>>({});

  console.log('RoadmapTopic: Component initialized');

  // Reload data when screen comes into focus (e.g., returning from question screen)
  useFocusEffect(
    useCallback(() => {
      if (topicString && !preFetchedData) {
        loadTopicData();
      }
    }, [topicString, preFetchedData])
  );

  // Scroll to bottom when questions load
  useEffect(() => {
    if (questions && questions.length > 0) {
      // Add a small delay to ensure content is rendered
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [questions]);

  const loadTopicData = async () => {
    console.log('RoadmapTopic: loadTopicData called');
    if (!topicString) {
      console.log('RoadmapTopic: Aborting load, no topic string.');
      return;
    }
    try {
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
        }
      }

      // Update state with fetched data
      setQuestions(problems || []);
      setProgress(progressMap);
      setLessonProgress(lessonProgressMap);

      // Calculate and set topic stats
      const completedCount = Object.values(progressMap).filter(p => p.completed).length;
      const totalStars = Object.values(progressMap).reduce((sum, p) => sum + (p.stars || 0), 0);
      const completionPercentage = problems.length > 0 
        ? Math.round((completedCount / problems.length) * 100) 
        : 0;

      setTopicStats({
        total_stars: totalStars,
        completion_percentage: completionPercentage
      });

    } catch (error) {
      console.error('Error loading topic data:', error);
    }
  };

  const handleQuestionPress = (q: TopicProblemWithProgress, idx: number) => {
    if (!q?.completed && !isUnlocked(q, idx)) return;
    
    // Show the action modal instead of directly navigating
    setSelectedQuestion(q);
    setSelectedQuestionIndex(idx);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    console.log('Closing modal');
    setModalVisible(false);
    setSelectedQuestion(null);
  };

  const isUnlocked = (q: TopicProblemWithProgress, idx: number) => {
    const safeTitle = String(q.title || '').substring(0, 30);
    console.log(`🔓 Checking unlock for question ${idx}: ${safeTitle}`);
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
      title: String(previousQuestion.title || '').substring(0, 30),
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

    // Additional safety check for text rendering issues
    if (!question.title || question.title === null || question.title === undefined || 
        typeof question.title !== 'string' && typeof question.title !== 'number') {
      console.warn('RoadmapTopic: Skipping question with invalid title:', question);
      return null;
    }

    // Check if title is empty or just whitespace
    const titleString = String(question.title).trim();
    if (!titleString || titleString === 'null' || titleString === 'undefined') {
      console.warn('RoadmapTopic: Skipping question with empty/invalid title:', question);
      return null;
    }
    
    // Safely decode the title with error handling
    let decodedTitle: string;
    try {
      decodedTitle = decodeHtmlEntities(titleString);
      // Ensure decoded title is still a valid string
      if (!decodedTitle || typeof decodedTitle !== 'string') {
        decodedTitle = 'Problem Title';
      }
    } catch (error) {
      console.warn('Error decoding title:', error, 'Original title:', titleString);
      decodedTitle = 'Problem Title';
    }
    
    const actualIndex = (questions?.length || 0) - 1 - index;
    const isLeft = index % 2 === 0;
    const isCurrent = actualIndex === (currentQuestionIndex ?? -1);
    const isLocked = !isUnlocked(question, actualIndex);
    const isCompleted = question.stars && question.stars > 0;
    
    // Safety checks for all properties with proper string conversion
    const safeTitle = decodedTitle;
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
              {safeTitle}
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
              {safeTitle}
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

  // Topic-specific puns for loading screen
  const getTopicPun = (topic: string): string => {
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes('array')) return "Array-ing your path to success! 📊";
    if (topicLower.includes('string')) return "String-ing along your coding journey! 🧵";
    if (topicLower.includes('tree')) return "Branch-ing out into new algorithms! 🌳";
    if (topicLower.includes('graph')) return "Graph-ing your way to mastery! 📈";
    if (topicLower.includes('hash')) return "Hash-tag coding excellence! #️⃣";
    if (topicLower.includes('stack')) return "Stack-ing up your skills! 📚";
    if (topicLower.includes('queue')) return "Queue-ing up some amazing problems! 🚶‍♂️";
    if (topicLower.includes('sort')) return "Sort-ing out the best challenges! 🔄";
    if (topicLower.includes('search')) return "Search-ing for the perfect solution! 🔍";
    if (topicLower.includes('dynamic')) return "Dynamic-ally building your expertise! ⚡";
    if (topicLower.includes('greedy')) return "Greedy for more coding knowledge! 🤤";
    if (topicLower.includes('backtrack')) return "Back-track-ing to find the best path! 🔄";
    if (topicLower.includes('recursion')) return "Recursion: See recursion! 🔁";
    if (topicLower.includes('binary')) return "Binary thinking for optimal solutions! 1️⃣0️⃣";
    if (topicLower.includes('linked')) return "Link-ed and ready to code! 🔗";
    if (topicLower.includes('heap')) return "Heap-ing on the coding challenges! ⛰️";
    if (topicLower.includes('trie')) return "Trie-ing your best at every problem! 🌲";
    if (topicLower.includes('sliding')) return "Sliding into coding greatness! 🛝";
    if (topicLower.includes('two')) return "Two pointers, infinite possibilities! 👉👈";
    if (topicLower.includes('bit')) return "Bit by bit, mastering algorithms! 🔢";
    
    return "Code-ing your way to greatness! 🚀";
  };

  // Safety check: if no questions, show empty state
  if (!questions || questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            // Navigate back based on where we came from
            if (fromPage === 'learn') {
              router.replace('/(tabs)/learn');
            } else {
              router.replace('/(tabs)');
            }
          }} style={styles.backButton}>
            <Image source={require('../../assets/images/icons/back-icon.png')} style={styles.backIcon} />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleBubble}>
              <ThemedText style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
                {topicString}
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.headerSpacer} />
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
        <TouchableOpacity onPress={() => {
          // Navigate back based on where we came from
          if (fromPage === 'learn') {
            router.replace('/(tabs)/learn');
          } else {
            router.replace('/(tabs)');
          }
        }} style={styles.backButton}>
          <Image source={require('../../assets/images/icons/back-icon.png')} style={styles.backIcon} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleBubble}>
            <View style={styles.topicDot} />
            <ThemedText style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
              {topicString}
            </ThemedText>
          </View>
        </View>
        
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.contentWrapper}>
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

        <ScrollView
          ref={scrollViewRef}
          style={styles.roadmapContainer}
          contentContainerStyle={[styles.roadmapContent, { 
            paddingBottom: 120, // Add more padding at bottom for better visibility
          }]}
          showsVerticalScrollIndicator={false}
          maintainVisibleContentPosition={{ // This helps maintain scroll position when content changes
            minIndexForVisible: 0,
          }}
        >
          <View style={styles.verticalPathContainer}>
            {/* Background Path */}
            <View style={styles.backgroundPath}>
              <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                {/* Regular path segments between bubbles */}
                {(questions || []).map((_, index) => {
                  if (index === (questions?.length || 0) - 1) return null;
                  const MILESTONE_HEIGHT = BUBBLE_SIZE + 48;
                  const CONTAINER_TOP_PADDING = 16;
                  const MILESTONE_VERTICAL_MARGIN = 24;
                  
                  const ADDITIONAL_OFFSET = 4 * (BUBBLE_SIZE + MILESTONE_VERTICAL_MARGIN * 2);
                  const startY = CONTAINER_TOP_PADDING + MILESTONE_VERTICAL_MARGIN + ADDITIONAL_OFFSET + index * (BUBBLE_SIZE + MILESTONE_VERTICAL_MARGIN * 2) + BUBBLE_SIZE/2;
                  const endY = CONTAINER_TOP_PADDING + MILESTONE_VERTICAL_MARGIN + ADDITIONAL_OFFSET + (index + 1) * (BUBBLE_SIZE + MILESTONE_VERTICAL_MARGIN * 2) + BUBBLE_SIZE/2;
                  
                  const isLeft = index % 2 === 0;
                  const curveX = isLeft ? 40 : -40;
                  
                  const reversedCurrentIndex = (questions?.length || 0) - 1 - index;
                  const isPathCompleted = questions && 
                    questions[reversedCurrentIndex] && 
                    questions[reversedCurrentIndex].completed;
                  
                  return (
                    <Path
                      key={index}
                      d={`M${ROADMAP_WIDTH/2},${startY} Q${ROADMAP_WIDTH/2 + curveX},${(startY + endY)/2} ${ROADMAP_WIDTH/2},${endY}`}
                      stroke={isPathCompleted ? "#6564c7" : "#C8B5FF"}
                      strokeWidth={20}
                      fill="none"
                      strokeLinecap="round"
                    />
                  );
                })}
                
                {/* Extended bendy path at the top */}
                {questions && questions.length > 0 && Array.from({ length: 4 }, (_, index) => {
                  const CONTAINER_TOP_PADDING = 16;
                  const MILESTONE_VERTICAL_MARGIN = 24;
                  const startY = CONTAINER_TOP_PADDING + MILESTONE_VERTICAL_MARGIN + index * (BUBBLE_SIZE + MILESTONE_VERTICAL_MARGIN * 2) + BUBBLE_SIZE/2;
                  const endY = CONTAINER_TOP_PADDING + MILESTONE_VERTICAL_MARGIN + (index + 1) * (BUBBLE_SIZE + MILESTONE_VERTICAL_MARGIN * 2) + BUBBLE_SIZE/2;
                  
                  const isLeft = index % 2 === 0;
                  const curveX = isLeft ? 40 : -40;
                  
                  return (
                    <Path
                      key={`top-path-${index}`}
                      d={`M${ROADMAP_WIDTH/2},${startY} Q${ROADMAP_WIDTH/2 + curveX},${(startY + endY)/2} ${ROADMAP_WIDTH/2},${endY}`}
                      stroke="#C8B5FF"
                      strokeWidth={20}
                      fill="none"
                      strokeLinecap="round"
                    />
                  );
                })}
                
                {/* Extended path beyond the last bubble */}
                {questions && questions.length > 0 && (
                  <Path
                    key="bottom-extended-path"
                    d={`M${ROADMAP_WIDTH/2},${
                      16 + 24 + 4 * (BUBBLE_SIZE + 48) + (questions.length - 1) * (BUBBLE_SIZE + 48) + BUBBLE_SIZE/2
                    } L${ROADMAP_WIDTH/2},${
                      16 + 24 + 4 * (BUBBLE_SIZE + 48) + (questions.length - 1) * (BUBBLE_SIZE + 48) + BUBBLE_SIZE/2 + 120
                    }`}
                    stroke="#C8B5FF"
                    strokeWidth={20}
                    fill="none"
                    strokeLinecap="round"
                  />
                )}
              </Svg>
            </View>

            {/* Milestones */}
            {[...(questions || [])].reverse().map((question, index) => {
              return renderRoadmapItem(question, index);
            })}
            
            {/* Starting text at the bottom */}
            {questions && questions.length > 0 && (
              <View style={styles.pathStartDecorator}>
                <View style={styles.startTextBubble}>
                  <ThemedText style={styles.startText}>Start Your Journey!</ThemedText>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Question Action Modal */}
      {selectedQuestion && (
        <QuestionActionModal
          visible={modalVisible}
          onClose={handleCloseModal}
          questionTitle={(() => {
            try {
              const title = String(selectedQuestion.title || 'Untitled Problem');
              return decodeHtmlEntities(title);
            } catch (error) {
              console.warn('Error decoding modal title:', error);
              return 'Untitled Problem';
            }
          })()}
          questionId={selectedQuestion.leetcode_id || 0}
          userSkillLevel={userSkillLevel}
          hasCompletedLesson={lessonProgress[selectedQuestion.leetcode_id || 0] || false}
          questionDifficulty={(selectedQuestion.difficulty || 'Easy') as 'Easy' | 'Medium' | 'Hard'}
          questionDescription={(() => {
            try {
              const title = String(selectedQuestion.title || 'Untitled Problem');
              const decodedTitle = decodeHtmlEntities(title);
              return String(selectedQuestion.description || `Solve the problem: ${decodedTitle}`);
            } catch (error) {
              console.warn('Error decoding modal description:', error);
              return String(selectedQuestion.description || 'Solve the problem: Untitled Problem');
            }
          })()}
          isLessonRequired={isLessonRequired(selectedQuestion)}
          isQuestionSolved={(selectedQuestion.stars || 0) >= 3}
          topicName={topicString || ''}
          isQuestionOnLeft={selectedQuestionIndex % 2 === 0}
          bubblePosition={{ x: 200, y: 300 + selectedQuestionIndex * 112 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4EEFF',
  },
  header: {
    backgroundColor: '#6564c7',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
  },
  backIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
    tintColor: '#fff',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBubble: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E6FF',
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    minWidth: '60%',
    maxWidth: '85%',
  },
  topicDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6564c7',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6564c7',
    textAlign: 'center',
    flexShrink: 1,
  },
  headerSpacer: {
    width: 60,
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingTop: 16,
    backgroundColor: 'white',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0D7FF',
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginHorizontal: 16,
    marginBottom: 0,
    zIndex: 10,
    position: 'relative',
  },
  statItem: {
    alignItems: 'center',
    minHeight: 40,
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
    color: '#B19BFF',
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
    backgroundColor: '#F8F6FF',
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
    paddingTop: 16,
    paddingBottom: 32,
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
    backgroundColor: '#F3F0FF',
    borderWidth: 3,
    borderColor: '#B19BFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#B19BFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  currentMilestone: {
    borderColor: '#6564c7',
    backgroundColor: '#E8E6FF',
    shadowColor: '#6564c7',
  },
  lockedMilestone: {
    backgroundColor: '#D8D0FF',
    borderColor: '#9B8AFF',
    shadowColor: '#9B8AFF',
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
    backgroundColor: '#6564c7',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    alignSelf: 'center',
    shadowColor: '#6564c7',
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
  pathStartDecorator: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 10,
    zIndex: 10,
  },

  startTextBubble: {
    backgroundColor: '#6564c7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#E8E6FF',
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  startText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
});