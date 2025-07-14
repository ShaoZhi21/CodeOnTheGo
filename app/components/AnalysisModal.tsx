import { ProgressBar } from '@/components/ProgressBar';
import { ThemedText } from '@/components/ThemedText';
import { apiCall } from '@/lib/api-config';
import { ProfileService } from '@/lib/services/profileService';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_MODAL_HEIGHT = SCREEN_HEIGHT * 0.50;

interface Analysis {
  lineByLineAnalysis: {
    lineNumber: number;
    status: string;
    explanation?: string;
  }[];
  correctness: string;
  efficiency: {
    time: string;
    space: string;
    anyMoreOptimal: string;
  };
  edgeCases: string[];
  trackAssessment: string;
  suggestions: string[];
  score: number;
  stars: number;
}

interface AnalysisModalProps {
  visible: boolean;
  onClose: () => void;
  analysis: Analysis | null;
  onTryForHigherScore?: () => void;
  onWritePseudocode?: () => void;
  onRemark?: () => Promise<Analysis | null>;
  problemId?: number;
  problemTitle?: string;
  descriptionBoxes?: any[];
  topicName?: string; // Add topicName parameter
  difficulty?: string; // Add difficulty parameter
  description?: string; // Add description parameter
  source?: 'roadmap' | 'allquestions'; // Add source parameter
}

export function AnalysisModal({ 
  visible, 
  onClose, 
  analysis, 
  onTryForHigherScore, 
  onWritePseudocode, 
  onRemark, 
  problemId, 
  problemTitle, 
  descriptionBoxes,
  topicName,
  difficulty,
  description,
  source = 'allquestions' // Default to allquestions if not specified
}: AnalysisModalProps) {
  const translateY = useSharedValue(MAX_MODAL_HEIGHT);
  const opacity = useSharedValue(0);
  const [selectedAnalysisSection, setSelectedAnalysisSection] = React.useState<'correctness' | 'efficiency' | 'edgeCases' | 'suggestions'>('correctness');
  const [isRemarking, setIsRemarking] = React.useState(false);
  const [remarkError, setRemarkError] = React.useState(false);
  const [isCompletingTask, setIsCompletingTask] = React.useState(false);
  
  // Enhanced save progress function with better error handling
  const saveProgress = async (analysis: Analysis) => {
    try {
      console.log('🔍 Attempting to save progress...');
      
      // Get current session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Failed to get user session');
      }
      
      if (!session) {
        console.error('No active session found');
        throw new Error('User not logged in');
      }
      
      // Get user from session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('User authentication error:', userError);
        throw new Error('User not authenticated');
      }

      console.log('✅ User authenticated:', user.id);

      // Determine if the solution is completed based on score
      const isCompleted = analysis.score >= 50;
      const stars = analysis.stars || 0;

      console.log('💾 Saving progress with params:', {
        userId: user.id,
        problemId: problemId,
        score: analysis.score,
        stars: stars,
        completed: isCompleted
      });

      const response = await apiCall(`/api/user-progress/${user.id}/general/${problemId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          code: descriptionBoxes?.map(block => {
            if (block.type === 'text') return block.value;
            if (block.type === 'if') return `if ${block.condition}:\n${block.body}`;
            if (block.type === 'elseif') return `elif ${block.condition}:\n${block.body}`;
            if (block.type === 'else') return `else:\n${block.body}`;
            if (block.type === 'while') return `while ${block.condition}:\n${block.body}`;
            if (block.type === 'for') return `for ${block.condition}:\n${block.body}`;
            return '';
          }).join('\n') || '',
          result: analysis.correctness,
          completed: isCompleted,
          stars: stars
        }),
      });

      if (response.ok) {
        console.log('✅ Progress saved successfully');
        return { success: true, user };
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to save progress:', response.status, errorText);
        throw new Error(`Failed to save progress: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error saving progress:', error);
      throw error;
    }
  };

  const handleClose = () => {
    translateY.value = withSpring(MAX_MODAL_HEIGHT, {
      damping: 20,
      stiffness: 90,
    });
    opacity.value = withSpring(0, {
      damping: 20,
      stiffness: 90,
    }, () => {
      runOnJS(onClose)();
    });
  };

  const handleRemark = async () => {
    if (!onRemark || isRemarking) return;
    
    setIsRemarking(true);
    setRemarkError(false);
    
    try {
      const newAnalysis = await onRemark();
      if (newAnalysis) {
        // Analysis will be updated by parent component
        setIsRemarking(false);
      } else {
        setRemarkError(true);
        setIsRemarking(false);
      }
    } catch (error) {
      setRemarkError(true);
      setIsRemarking(false);
    }
  };

  // Enhanced complete button handler with streak checking and navigation
  const handleCompleteTask = async () => {
    if (!analysis || !problemId) {
      Alert.alert('Error', 'Missing analysis or problem information');
      return;
    }

    setIsCompletingTask(true);

    try {
      console.log('🚀 handleCompleteTask: Starting...');
      
      // Step 1: Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get today and yesterday at 12am for streak checking
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const now = new Date();

      console.log('📅 Date check:', {
        today: today.toISOString(),
        yesterday: yesterday.toISOString(),
        currentTime: now.toISOString()
      });

      // Step 2: Check for previous activities before this completion
      // Changed to check completed_at instead of created_at
      const { data: previousActivities } = await supabase
        .from('user_problem_progress')
        .select('completed_at')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null) // Only get actually completed activities
        .lt('completed_at', now.toISOString())
        .order('completed_at', { ascending: false })
        .limit(1);

      console.log('🔍 Previous activities:', previousActivities);

      // Step 3: Check if this problem was previously completed
      const { data: existingProgress } = await supabase
        .from('user_problem_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('problem_id', problemId)
        .single();

      console.log('🔍 Existing progress:', existingProgress);

      // Step 4: Save/Update problem progress
      const progressData = {
        user_id: user.id,
        problem_id: problemId,
        is_solved: true, // This will mark both pseudocode and lesson as completed
        score: analysis.score || 0,
        stars: Math.min(analysis.stars || 0, 3), // Ensure stars is within 0-3 range
        attempts: (existingProgress?.attempts || 0) + 1,
        hints_used: existingProgress?.hints_used || 0,
        time_spent_minutes: existingProgress?.time_spent_minutes || 0,
        first_solved_at: existingProgress?.first_solved_at || now.toISOString(),
        last_attempt_at: now.toISOString(),
        completed_at: now.toISOString(),
        best_score: Math.max(existingProgress?.best_score || 0, analysis.score || 0)
      };

      if (existingProgress) {
        // Update existing progress
        const { error: updateError } = await supabase
          .from('user_problem_progress')
          .update(progressData)
          .eq('user_id', user.id)
          .eq('problem_id', problemId);

        if (updateError) {
          console.error('Error updating progress:', updateError);
          throw new Error('Failed to update progress');
        }
        console.log('✅ Updated existing progress with pseudocode completion');
      } else {
        // Insert new progress
        const { error: insertError } = await supabase
          .from('user_problem_progress')
          .insert(progressData);

        if (insertError) {
          console.error('Error inserting progress:', insertError);
          throw new Error('Failed to insert progress');
        }
        console.log('✅ Inserted new progress with pseudocode completion');
      }

      // Step 5: Check streak logic
      let lastActivity = previousActivities && previousActivities.length > 0 
        ? new Date(previousActivities[0].completed_at)
        : null;

      console.log('🎯 Last activity:', lastActivity ? lastActivity.toISOString() : 'None');

      // Check if user had already done activity today
      const isNewStreak = !lastActivity || lastActivity < today;
      console.log('🎯 Is new streak?', isNewStreak);

      if (isNewStreak) {
        // If last activity was exactly yesterday, increment streak
        if (lastActivity && lastActivity >= yesterday && lastActivity < today) {
          console.log('✅ Consecutive day detected, incrementing streak');
          const updatedProfile = await ProfileService.updateStreak(user.id, true);
          if (updatedProfile) {
            console.log('✅ Streak incremented:', updatedProfile.current_streak);
          } else {
            console.error('❌ Failed to increment streak');
          }
        } else {
          console.log('🔄 Missed a day or first activity, resetting streak to 1');
          const updatedProfile = await ProfileService.updateStreak(user.id, false);
          if (updatedProfile) {
            const finalProfile = await ProfileService.updateStreak(user.id, true);
            console.log('✅ Streak reset and started at 1:', finalProfile?.current_streak);
          } else {
            console.error('❌ Failed to reset streak');
          }
        }

        // Navigate to streak animation for new streaks
        console.log('🎬 Navigating to StreakAnimation...');
        handleClose();
        router.push({
          pathname: './StreakAnimation',
          params: {
            problemTitle: problemTitle || '',
            problemId: problemId?.toString() || '',
            topicName: topicName || '',
            quizData: '',
            fromPseudocode: 'true',
            difficulty: difficulty || '',
            description: description || '',
            code: descriptionBoxes?.map(block => {
              if (block.type === 'text') return block.value;
              if (block.type === 'if') return `if ${block.condition}:\n${block.body}`;
              if (block.type === 'elseif') return `elif ${block.condition}:\n${block.body}`;
              if (block.type === 'else') return `else:\n${block.body}`;
              if (block.type === 'while') return `while ${block.condition}:\n${block.body}`;
              if (block.type === 'for') return `for ${block.condition}:\n${block.body}`;
              return '';
            }).join('\n') || '',
            source: source // Pass the source parameter
          }
        });
      } else {
        // If not a new streak, go directly to PseudocodeComplete
        console.log('📝 No streak animation needed, navigating to PseudocodeComplete');
        handleClose();
        router.push({
          pathname: './PseudocodeComplete',
          params: {
            problemTitle: problemTitle || '',
            problemId: problemId?.toString() || '',
            topicName: topicName || '',
            difficulty: difficulty || '',
            description: description || '',
            code: descriptionBoxes?.map(block => {
              if (block.type === 'text') return block.value;
              if (block.type === 'if') return `if ${block.condition}:\n${block.body}`;
              if (block.type === 'elseif') return `elif ${block.condition}:\n${block.body}`;
              if (block.type === 'else') return `else:\n${block.body}`;
              if (block.type === 'while') return `while ${block.condition}:\n${block.body}`;
              if (block.type === 'for') return `for ${block.condition}:\n${block.body}`;
              return '';
            }).join('\n') || '',
            source: source // Pass the source parameter
          }
        });
      }

    } catch (error) {
      console.error('❌ Error completing task:', error);
      Alert.alert(
        'Error', 
        error instanceof Error ? error.message : 'Failed to complete task. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCompletingTask(false);
    }
  };

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
      });
      opacity.value = withSpring(1, {
        damping: 20,
        stiffness: 90,
      });
    }
  }, [visible]);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > MAX_MODAL_HEIGHT * 0.3) {
        translateY.value = withSpring(MAX_MODAL_HEIGHT, {
          damping: 20,
          stiffness: 90,
        });
        opacity.value = withSpring(0, {
          damping: 20,
          stiffness: 90,
        }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, {
          damping: 20,
          stiffness: 90,
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleSectionChange = (section: 'correctness' | 'efficiency' | 'edgeCases' | 'suggestions') => {
    setSelectedAnalysisSection(section);
  };

  // Function to detect if a suggestion is general feedback vs a specific tip
  const isGeneralFeedback = (suggestion: string) => {
    const feedbackPatterns = [
      /you are on the right track/i,
      /you are on the wrong track/i,
      /good job/i,
      /well done/i,
      /keep going/i,
      /try again/i,
      /not quite right/i,
      /close but/i,
      /almost there/i,
      /you're getting there/i
    ];
    
    return feedbackPatterns.some(pattern => pattern.test(suggestion.trim()));
  };

  // Function to get feedback type and styling
  const getFeedbackType = (suggestion: string) => {
    const text = suggestion.toLowerCase().trim();
    
    if (text.includes('right track') || text.includes('good job') || text.includes('well done') || text.includes('keep going')) {
      return {
        type: 'positive',
        icon: '✨',
        bgColor: '#E8F5E8',
        borderColor: '#4CAF50',
        textColor: '#2E7D32'
      };
    } else if (text.includes('wrong track') || text.includes('try again') || text.includes('not quite')) {
      return {
        type: 'constructive',
        icon: '🎯',
        bgColor: '#FFF3E0',
        borderColor: '#FF9800',
        textColor: '#E65100'
      };
    } else {
      return {
        type: 'neutral',
        icon: '💭',
        bgColor: '#F3E5F5',
        borderColor: '#9C27B0',
        textColor: '#6A1B9A'
      };
    }
  };

  if (!analysis) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.modalOverlay, overlayStyle]}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.modalContainer, animatedStyle, { height: MAX_MODAL_HEIGHT }]}>
            <View style={styles.dragHandle} />
            
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <ThemedText style={styles.title}>
                  {selectedAnalysisSection === 'correctness' && 'Correctness'}
                  {selectedAnalysisSection === 'efficiency' && 'Efficiency'}
                  {selectedAnalysisSection === 'edgeCases' && 'Edge Cases'}
                  {selectedAnalysisSection === 'suggestions' && 'Suggestions'}
                </ThemedText>
                <TouchableOpacity onPress={handleRemark} style={styles.remarkButton}>
                  <ThemedText style={styles.remarkText}>
                    {isRemarking ? 'Remarking...' : remarkError ? 'Error occurred, remark again' : 'Remark'}
                  </ThemedText>
                  {!isRemarking && (
                    <Image 
                      source={require('@/assets/images/icons/question-icon.png')}
                      style={styles.remarkIcon}
                    />
                  )}
                  {isRemarking && (
                    <ActivityIndicator size="small" color="#6564c7" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.analysisButtonContainer}>
              <TouchableOpacity 
                style={[
                  styles.analysisButton, 
                  selectedAnalysisSection === 'correctness' && styles.selectedAnalysisButton,
                  analysis.correctness === '✓' && styles.correctButton,
                  analysis.correctness === '✗' && styles.wrongButton
                ]} 
                onPress={() => handleSectionChange('correctness')}
              >
                <Image 
                  source={
                    analysis.score >= 50
                      ? require('@/assets/images/icons/complete-icon.png')
                      : require('@/assets/images/icons/wrong-icon.png')
                  } 
                  style={styles.correctnessIcon}
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.analysisButton, selectedAnalysisSection === 'efficiency' && styles.selectedAnalysisButton]} 
                onPress={() => handleSectionChange('efficiency')}
              >
                <Image 
                  source={require('@/assets/images/icons/efficient-icon.png')}
                  style={[styles.analysisIcon, { marginBottom: 4 }]}
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.analysisButton, selectedAnalysisSection === 'edgeCases' && styles.selectedAnalysisButton]} 
                onPress={() => handleSectionChange('edgeCases')}
              >
                <Image 
                  source={require('@/assets/images/icons/checklist-icon.png')}
                  style={[styles.analysisIcon, { marginBottom: 4 }, { marginLeft: 4 }]}
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.analysisButton, selectedAnalysisSection === 'suggestions' && styles.selectedAnalysisButton]} 
                onPress={() => handleSectionChange('suggestions')}
              >
                <Image 
                  source={require('@/assets/images/icons/suggestion-icon.png')}
                  style={[styles.analysisIcon, { marginBottom: 6 }]}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.contentScrollView} showsVerticalScrollIndicator={false}>
              {selectedAnalysisSection === 'correctness' && (
                <>
                  <View style={[styles.analysisContainer, isRemarking && styles.loadingAnalysisContainer]}>
                    <View style={styles.analysisContent}>
                      <View style={styles.analysisSection}>
                        {isRemarking ? (
                          <View style={styles.correctnessLoadingContainer}>
                            <ActivityIndicator size="large" color="#6564c7" />
                            <ThemedText style={styles.loadingText}>Remarking...</ThemedText>
                          </View>
                        ) : (
                          <View style={styles.correctnessContainer}>
                            <View style={styles.scoreContainer}>
                              <ThemedText style={styles.scoreLabel}>Score: </ThemedText>
                              <ThemedText style={styles.scoreText}>{analysis.score || 0}</ThemedText>
                              <ThemedText style={styles.scoreLabel}>/100</ThemedText>
                            </View>
                            <ProgressBar score={analysis.score} compact={true} />
                            <View style={styles.starsContainer}>
                              {[...Array(5)].map((_, index) => (
                                <Image
                                  key={index}
                                  source={
                                    index < analysis.stars
                                      ? require('@/assets/images/icons/star-icon.png')
                                      : require('@/assets/images/icons/empty-star.png')
                                  }
                                  style={styles.largeStarIcon}
                                />
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  {!isRemarking && analysis.stars <= 2 && (
                    <View style={styles.navigationButtonRow}>
                      <TouchableOpacity style={styles.tryAgainButton} onPress={handleClose}>
                        <ThemedText style={styles.tryAgainButtonText}>Try Again</ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}
                  {!isRemarking && analysis.stars >= 3 && (
                    <View style={styles.navigationButtonRow}>
                      <TouchableOpacity 
                        style={styles.codeButton} 
                        onPress={() => {
                          if (onWritePseudocode) {
                            onWritePseudocode();
                          }
                          handleClose();
                        }}
                      >
                        <ThemedText style={styles.codeButtonText}>CODE</ThemedText>
                        <Image 
                          source={require('@/assets/images/icons/code-icon.png')}
                          style={styles.codeButtonIcon}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.completeButton, isCompletingTask && { opacity: 0.6 }]} 
                        onPress={handleCompleteTask}
                        disabled={isCompletingTask}
                      >
                        {isCompletingTask ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Image 
                            source={require('@/assets/images/icons/complete-icon.png')}
                            style={styles.iconOnlyButton}
                          />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.retryButton} 
                        onPress={handleClose}
                      >
                        <Image 
                          source={require('@/assets/images/icons/retry-icon.png')}
                          style={[styles.iconOnlyButton, { tintColor: '#FF375F' }]}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {selectedAnalysisSection === 'efficiency' && (
                <View style={styles.analysisSection}>
                  <View style={styles.efficiencyContainer}>
                    {isRemarking ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6564c7" />
                        <ThemedText style={styles.loadingText}>Remarking...</ThemedText>
                      </View>
                    ) : (
                      analysis.efficiency && (analysis.efficiency.time || analysis.efficiency.space || analysis.efficiency.anyMoreOptimal) ? (
                        <>
                          <View style={styles.efficiencyCard}>
                            <View style={styles.cardIcon}>
                              <ThemedText style={styles.iconEmoji}>⏱️</ThemedText>
                            </View>
                            <View style={styles.cardContent}>
                              <ThemedText style={styles.cardLabel}>Time Complexity</ThemedText>
                              <ThemedText style={styles.cardValue}>{analysis.efficiency.time}</ThemedText>
                            </View>
                          </View>
                          
                          <View style={styles.efficiencyCard}>
                            <View style={styles.cardIcon}>
                              <ThemedText style={styles.iconEmoji}>💾</ThemedText>
                            </View>
                            <View style={styles.cardContent}>
                              <ThemedText style={styles.cardLabel}>Space Complexity</ThemedText>
                              <ThemedText style={styles.cardValue}>{analysis.efficiency.space}</ThemedText>
                            </View>
                          </View>
                          
                          <View style={styles.efficiencyCard}>
                            <View style={styles.cardIcon}>
                              <ThemedText style={styles.iconEmoji}>🚀</ThemedText>
                            </View>
                            <View style={styles.cardContent}>
                              <ThemedText style={styles.cardLabel}>Can be optimized?</ThemedText>
                              <ThemedText style={[
                                styles.cardValue, 
                                analysis.efficiency.anyMoreOptimal.toLowerCase().includes('yes') || analysis.efficiency.anyMoreOptimal.toLowerCase().includes('can') 
                                  ? styles.optimizableText 
                                  : styles.optimalText
                              ]}>
                                {analysis.efficiency.anyMoreOptimal}
                              </ThemedText>
                            </View>
                          </View>
                        </>
                      ) : (
                        <View style={styles.noDataCard}>
                          <ThemedText style={styles.noDataText}>No Efficiency</ThemedText>
                          <ThemedText style={styles.noDataSubtext}>Efficiency analysis not available</ThemedText>
                        </View>
                      )
                    )}
                  </View>
                </View>
              )}

              {selectedAnalysisSection === 'edgeCases' && (
                <View style={styles.analysisSection}>
                  <View style={styles.edgeCasesContainer}>
                    {isRemarking ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6564c7" />
                        <ThemedText style={styles.loadingText}>Remarking...</ThemedText>
                      </View>
                    ) : (
                      analysis.edgeCases && analysis.edgeCases.length > 0 ? (
                        analysis.edgeCases.map((edgeCase: string, index: number) => (
                          <View key={index} style={styles.edgeCaseCard}>
                            <View style={styles.edgeCaseIcon}>
                              <ThemedText style={styles.edgeCaseNumber}>{index + 1}</ThemedText>
                            </View>
                            <View style={styles.edgeCaseContent}>
                              <ThemedText style={styles.edgeCaseLabel}>Test Case {index + 1}</ThemedText>
                              <ThemedText style={styles.edgeCaseText}>{edgeCase}</ThemedText>
                            </View>
                          </View>
                        ))
                      ) : (
                        <View style={styles.noDataCard}>
                          <ThemedText style={styles.noDataText}>No Edge Cases</ThemedText>
                          <ThemedText style={styles.noDataSubtext}>Edge cases analysis not available</ThemedText>
                        </View>
                      )
                    )}
                  </View>
                </View>
              )}

              {selectedAnalysisSection === 'suggestions' && (
                <View style={styles.analysisSection}>
                  <View style={styles.suggestionsContainer}>
                    {isRemarking ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6564c7" />
                        <ThemedText style={styles.loadingText}>Remarking...</ThemedText>
                      </View>
                    ) : (
                      analysis.suggestions && analysis.suggestions.length > 0 ? (
                        analysis.suggestions.map((suggestion: string, index: number) => {
                          const feedbackType = getFeedbackType(suggestion);
                          const isGeneralMsg = isGeneralFeedback(suggestion);
                          
                          if (isGeneralMsg) {
                            // Modern feedback card for general messages
                            return (
                              <View key={index} style={[styles.feedbackCard, { 
                                backgroundColor: feedbackType.bgColor,
                                borderColor: feedbackType.borderColor 
                              }]}>
                                <View style={styles.feedbackHeader}>
                                  <View style={[styles.feedbackIconContainer, { 
                                    backgroundColor: feedbackType.borderColor 
                                  }]}>
                                    <ThemedText style={styles.feedbackIcon}>{feedbackType.icon}</ThemedText>
                                  </View>
                                  <ThemedText style={[styles.feedbackTitle, { 
                                    color: feedbackType.textColor 
                                  }]}>
                                    {feedbackType.type === 'positive' ? 'Great Progress!' : 
                                     feedbackType.type === 'constructive' ? 'Keep Trying!' : 'Feedback'}
                                  </ThemedText>
                                </View>
                                <ThemedText style={[styles.feedbackMessage, { 
                                  color: feedbackType.textColor 
                                }]}>
                                  {suggestion}
                                </ThemedText>
                              </View>
                            );
                          } else {
                            // Original tip card for specific suggestions
                            return (
                              <View key={index} style={styles.suggestionCard}>
                                <View style={styles.suggestionIcon}>
                                  <ThemedText style={styles.suggestionEmoji}>💡</ThemedText>
                                </View>
                                <View style={styles.suggestionContent}>
                                  <ThemedText style={styles.suggestionLabel}>Tip {index + 1}</ThemedText>
                                  <ThemedText style={styles.suggestionText}>{suggestion}</ThemedText>
                                </View>
                              </View>
                            );
                          }
                        })
                      ) : (
                        <View style={styles.noDataCard}>
                          <ThemedText style={styles.noDataText}>No Suggestions</ThemedText>
                          <ThemedText style={styles.noDataSubtext}>Suggestions not available</ThemedText>
                        </View>
                      )
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F4EEFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 16,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 6,
    opacity: 1,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  header: {
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d2d2d',
  },
  remarkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#6564c7',
    borderRadius: 8,
    backgroundColor: 'rgba(101, 100, 199, 0.1)',
  },
  remarkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6564c7',
  },
  remarkIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  analysisButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 6,
  },
  analysisButton: {
    flex: 1,
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c7c1e9',
  },
  selectedAnalysisButton: {
    backgroundColor: '#6564c7',
  },
  correctButton: {
    backgroundColor: '#e6f4ea', 
    borderWidth: 4,
    borderColor: '#009045',
  },
  wrongButton: {
    backgroundColor: '#fff2f0', 
    borderWidth: 4,
    borderColor: '#FF375F',
  },
  correctnessIcon: {
    width: 36,
    height: 36,
  },
  analysisIcon: {
    width: 42,
    height: 42,
  },
  analysisContainer: {
    flex: 1,
    minHeight: SCREEN_HEIGHT * 0.21,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    paddingBottom: 5,
  },
  loadingAnalysisContainer: {
    height: SCREEN_HEIGHT * 0.28,
  },
  analysisContent: {
    flex: 1,
  },
  analysisSection: {
    flex: 1,
  },
  analysisText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    marginBottom: 8,
  },
  correctnessContainer: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2d2d2d',
    lineHeight: 28,
  },
  scoreLabel: {
    fontSize: 20,
    color: '#666',
    lineHeight: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '80%',
  },
  largeStarIcon: {
    width: 40,
    height: 40,
  },
  efficiencyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 4,
    paddingTop: 6,
    paddingBottom: 12,
  },
  efficiencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2d3436',
  },
  optimizableText: {
    color: '#f39c12',
  },
  optimalText: {
    color: '#27ae60',
  },
  iconEmoji: {
    fontSize: 20,
  },
  edgeCasesContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 4,
    paddingTop: 6,
    paddingBottom: 12,
  },
  edgeCaseCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  edgeCaseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
    marginTop: 2,
  },
  edgeCaseContent: {
    flex: 1,
  },
  edgeCaseLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  edgeCaseText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  edgeCaseNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  suggestionsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 4,
    paddingTop: 6,
    paddingBottom: 12,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 12,
    shadowColor: '#f59e0b',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  suggestionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#92400e',
    fontWeight: '500',
  },
  suggestionEmoji: {
    fontSize: 22,
  },
  contentScrollView: {
    flex: 1,
  },
  tryAgainButton: {
    backgroundColor: '#6564c7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  tryAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  navigationButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 16,
    maxWidth: '100%',
  },
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#6564c7',
    width: '50%',
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  codeButtonIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  codeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  retryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#c7c1e9',
    borderWidth: 3,
    borderColor: '#FF375F',
    width: '15%',
  },
  completeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#b8b5e8',
    borderWidth: 3,
    borderColor: '#4CAF50',
    width: '35%',
  },
  iconOnlyButton: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  noDataCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d2d2d',
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 65,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6564c7',
    marginTop: 16,
  },
  correctnessLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  feedbackCard: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fffbeb',
    borderWidth: 2,
    borderColor: '#fcd34d',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#f59e0b',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  feedbackIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  feedbackIcon: {
    fontSize: 16,
  },
  feedbackTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#d97706',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  feedbackMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: '#92400e',
    fontWeight: '500',
    paddingLeft: 2,
  },
}); 