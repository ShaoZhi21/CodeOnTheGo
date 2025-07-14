import { ThemedText } from '@/components/ThemedText';
import { apiCall } from '@/lib/api-config';
import { ProfileService } from '@/lib/services/profileService';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SummaryData {
  finalCode: string;
  explanation: string;
  pseudocodeSteps: string[];
  efficiency: {
    timeComplexity: string;
    spaceComplexity: string;
    explanation: string;
  };
}

export default function CodeSummary() {
  const params = useLocalSearchParams();
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [currentScreen, setCurrentScreen] = useState(0); // 0: Code+Steps, 1: How it works, 2: Efficiency
  const scrollViewRef = useRef<ScrollView>(null);

  // Parse the passed parameters
  const problemId = params.problemId as string;
  const title = params.title as string;
  const difficulty = params.difficulty as string;
  const description = params.description as string;
  const pseudocode = params.pseudocode as string;
  const mcqAnswers = params.mcqAnswers ? JSON.parse(params.mcqAnswers as string) : [];
  const language = params.language as string || 'javascript';
  const preGeneratedSummary = params.preGeneratedSummary ? JSON.parse(params.preGeneratedSummary as string) : null;

  useEffect(() => {
    setSelectedLanguage(language);
    
    // If we have pre-generated summary, use it immediately
    if (preGeneratedSummary) {
      setSummaryData(preGeneratedSummary);
      setIsLoading(false);
    } else {
      // Otherwise, generate it normally
      generateCodeSummaryInitial();
    }
  }, []);

  const generateCodeSummaryInitial = async () => {
    setIsLoading(true);
    
    try {
      const response = await apiCall('/api/generate-code-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problemTitle: title,
          problemDescription: description,
          pseudocode: pseudocode,
          language: language, // Use the original language parameter, not state
          mcqAnswers: mcqAnswers
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSummaryData(data);
    } catch (error) {
      console.error('Error generating code summary:', error);
      Alert.alert('Error', 'Failed to generate code summary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy': return '#00B8A3';
      case 'Medium': return '#FFA116';
      case 'Hard': return '#FF375F';
      default: return '#6564c7';
    }
  };

  const getDifficultyBubbleColor = (diff: string) => {
    switch (diff) {
      case 'Easy':
      case 'Medium':
      case 'Hard':
        return 'rgba(255, 255, 255, 0.25)';
      default:
        return 'rgba(255, 255, 255, 0.25)';
    }
  };

  const getDifficultyAccentColor = (diff: string) => {
    switch (diff) {
      case 'Easy': return '#4CAF50';
      case 'Medium': return '#FF9800';
      case 'Hard': return '#F44336';
      default: return '#6564c7';
    }
  };

  const generateCodeSummary = async () => {
    setIsLoading(true);
    
    try {
      const response = await apiCall('/api/generate-code-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problemTitle: title,
          problemDescription: description,
          pseudocode: pseudocode,
          language: selectedLanguage,
          mcqAnswers: mcqAnswers
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSummaryData(data);
    } catch (error) {
      console.error('Error generating code summary:', error);
      Alert.alert('Error', 'Failed to generate code summary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!problemId) {
      Alert.alert('Error', 'Problem ID not found');
      return;
    }

    setIsMarkingComplete(true);

    try {
      // Step 1: Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Step 2: Get today and yesterday at 12am for streak checking
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const now = new Date();

      // Step 3: Check for previous activities before this completion
      const { data: previousActivities } = await supabase
        .from('user_problem_progress')
        .select('completed_at')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .lt('completed_at', now.toISOString())
        .order('completed_at', { ascending: false })
        .limit(1);

      // Step 4: Check if this problem was previously completed
      const { data: existingProgress } = await supabase
        .from('user_problem_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('problem_id', problemId)
        .single();

      // Step 5: Save/Update problem progress
      const score = 85; // Or use a real score if available
      const stars = Math.ceil(score / 20); // 1-5 stars
      const progressData = {
        user_id: user.id,
        problem_id: parseInt(problemId),
        is_solved: true,
        score: score,
        stars: Math.min(stars, 3),
        attempts: (existingProgress?.attempts || 0) + 1,
        hints_used: existingProgress?.hints_used || 0,
        time_spent_minutes: existingProgress?.time_spent_minutes || 0,
        first_solved_at: existingProgress?.first_solved_at || now.toISOString(),
        last_attempt_at: now.toISOString(),
        completed_at: now.toISOString(),
        best_score: Math.max(existingProgress?.best_score || 0, score)
      };

      if (existingProgress) {
        const { error: updateError } = await supabase
          .from('user_problem_progress')
          .update(progressData)
          .eq('user_id', user.id)
          .eq('problem_id', problemId);
        if (updateError) throw new Error('Failed to update progress');
      } else {
        const { error: insertError } = await supabase
          .from('user_problem_progress')
          .insert(progressData);
        if (insertError) throw new Error('Failed to insert progress');
      }

      // Step 6: Check streak logic
      let lastActivity = previousActivities && previousActivities.length > 0 
        ? new Date(previousActivities[0].completed_at)
        : null;
      const isNewStreak = !lastActivity || lastActivity < today;

      if (isNewStreak) {
        // If last activity was exactly yesterday, increment streak
        if (lastActivity && lastActivity >= yesterday && lastActivity < today) {
          await ProfileService.updateStreak(user.id, true);
        } else {
          await ProfileService.updateStreak(user.id, false);
          await ProfileService.updateStreak(user.id, true);
        }
        // Navigate to streak animation
        router.push({
          pathname: '/screens/StreakAnimation',
          params: {
            problemTitle: title || '',
            problemId: problemId?.toString() || '',
            topicName: params.topicName || '',
            quizData: '',
            fromPseudocode: 'true',
            difficulty: difficulty || '',
            description: description || '',
            code: summaryData?.finalCode || '',
            source: 'codeSummary',
            from: params.from || 'roadmap'
          }
        });
      } else {
        // Go directly to PseudocodeComplete
        router.push({
          pathname: '/screens/PseudocodeComplete',
          params: {
            problemTitle: title || '',
            problemId: problemId?.toString() || '',
            topicName: params.topicName || '',
            difficulty: difficulty || '',
            description: description || '',
            code: summaryData?.finalCode || '',
            source: 'codeSummary',
            from: params.from || 'roadmap'
          }
        });
      }
    } catch (error) {
      console.error('Error marking problem complete:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to mark problem as complete');
    } finally {
      setIsMarkingComplete(false);
    }
  };

  const formatCode = (code: string) => {
    // Preserve original indentation and structure
    return code
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => {
        // Count leading spaces for proper indentation
        const leadingSpaces = line.match(/^ */)?.[0].length || 0;
        const indentLevel = Math.floor(leadingSpaces / 2); // Assume 2 spaces per indent
        const indentString = '  '.repeat(indentLevel); // Use 2 spaces for display
        return indentString + line.trim();
      })
      .join('\n');
  };

  const renderTextWithBubbles = (text: string, baseStyle: any) => {
    // Detect both backticked words and Big O notation
    const parts = text.split(/(`[^`]+`|O\([^)]*\))/g);
    
    return (
      <ThemedText style={baseStyle}>
        {parts.map((part, index) => {
          // Check if this part is a backticked word or Big O notation
          if (part.match(/^`[^`]+`$/) || part.match(/^O\([^)]*\)$/)) {
            const cleanWord = part.replace(/`/g, '');
            return (
              <ThemedText key={index} style={styles.highlightedText}>
                {cleanWord}
              </ThemedText>
            );
          }
          // Return regular text inline
          return part;
        })}
      </ThemedText>
    );
  };

  const renderCodeSection = () => {
    if (!summaryData) return null;

    return (
      <>
        {/* Code Section */}
        <View style={styles.codeCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerIconContainer}>
              <ThemedText style={styles.headerIcon}>💻</ThemedText>
            </View>
            <ThemedText style={styles.cardHeaderText}>Code</ThemedText>
          </View>
          <View style={styles.codeBlock}>
            <ThemedText style={styles.codeText}>
              {formatCode(summaryData.finalCode)}
            </ThemedText>
          </View>
        </View>

        {/* How It Works Section */}
        <View style={styles.explanationCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerIconContainer}>
              <ThemedText style={styles.headerIcon}>🧠</ThemedText>
            </View>
            <ThemedText style={styles.cardHeaderText}>How It Works</ThemedText>
          </View>
          <View style={styles.explanationContent}>
            {formatExplanationText(summaryData.explanation).map((paragraph, index) => (
              <View key={index} style={styles.explanationParagraph}>
                {renderTextWithBubbles(paragraph, styles.explanationText)}
              </View>
            ))}
          </View>
        </View>

        {/* Step by Step Section */}
        <View style={styles.stepsCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerIconContainer}>
              <ThemedText style={styles.headerIcon}>📋</ThemedText>
            </View>
            <ThemedText style={styles.cardHeaderText}>Step by Step</ThemedText>
          </View>
          <View style={styles.stepsContent}>
            {summaryData.pseudocodeSteps.map((step, index) => (
              <View key={index} style={styles.pseudocodeStepContainer}>
                <View style={styles.stepNumber}>
                  <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
                </View>
                <View style={styles.stepTextContainer}>
                  {renderTextWithBubbles(step.replace(/^Step \d+:\s*/i, ''), styles.stepText)}
                </View>
              </View>
            ))}
          </View>
        </View>
      </>
    );
  };

  const formatExplanationText = (text: string) => {
    // Clean up the text and split into paragraphs
    return text
      .replace(/Step \d+:\s*/g, '') // Remove "Step 1:", "Step 2:", etc.
      .replace(/\n\s*\n/g, '\n\n') // Normalize paragraph breaks
      .replace(/(\. )([A-Z])/g, '$1\n\n$2') // Add paragraph breaks after sentences that start new topics
      .replace(/(However|Therefore|Additionally|Furthermore|Moreover|In contrast|As a result|For example|Specifically|Finally),/g, '\n\n$1,') // Break on transition words
      .split(/\n\n/) // Split by double line breaks
      .map(paragraph => paragraph.replace(/\n/g, ' ').trim()) // Join lines within paragraphs
      .filter(paragraph => paragraph.length > 0 && paragraph.length > 10); // Filter out very short fragments
  };

  const parseTimeComplexityExplanation = (explanation: string): string => {
    // Look for sentences that mention "time" or "Time"
    const sentences = explanation.split(/[.!?]+/);
    const timeExplanation = sentences.find(sentence => 
      sentence.toLowerCase().includes('time') && 
      (sentence.includes('O(') || sentence.toLowerCase().includes('complexity'))
    );
    
    if (timeExplanation) {
      return timeExplanation.trim() + '.';
    }
    
    // Fallback: take first half of explanation
    const halfPoint = Math.floor(explanation.length / 2);
    const firstHalf = explanation.substring(0, halfPoint);
    const lastSentenceEnd = firstHalf.lastIndexOf('.');
    
    if (lastSentenceEnd > 0) {
      return firstHalf.substring(0, lastSentenceEnd + 1).trim();
    }
    
    return 'Time complexity explanation not available.';
  };

  const parseSpaceComplexityExplanation = (explanation: string): string => {
    // Look for sentences that mention "space" or "Space"
    const sentences = explanation.split(/[.!?]+/);
    const spaceExplanation = sentences.find(sentence => 
      sentence.toLowerCase().includes('space') && 
      (sentence.includes('O(') || sentence.toLowerCase().includes('complexity'))
    );
    
    if (spaceExplanation) {
      return spaceExplanation.trim() + '.';
    }
    
    // Fallback: take second half of explanation
    const halfPoint = Math.floor(explanation.length / 2);
    const secondHalf = explanation.substring(halfPoint);
    const firstSentenceEnd = secondHalf.indexOf('.');
    
    if (firstSentenceEnd > 0) {
      return secondHalf.substring(0, firstSentenceEnd + 1).trim();
    }
    
    return 'Space complexity explanation not available.';
  };

  const handleNext = () => {
    if (currentScreen < 2) {
      setCurrentScreen(currentScreen + 1);
      // Scroll to top after navigation
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  const handlePrevious = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
      // Scroll to top after navigation
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  const getScreenTitle = () => {
    return title;
  };

  const renderRoadmap = () => {
    const steps = [
      { title: 'Code', icon: '💻' },
      { title: 'Explanation', icon: '🧠' },
      { title: 'Efficiency', icon: '⚡' }
    ];

    return (
      <View style={styles.roadmapContainer}>
        {steps.map((step, index) => (
          <View key={index} style={styles.roadmapStepContainer}>
            {/* Step Bubble */}
            <View style={[
              styles.roadmapBubble,
              index === currentScreen && styles.roadmapBubbleActive
            ]}>
              <ThemedText style={[
                styles.roadmapIcon,
                index === currentScreen && styles.roadmapIconActive
              ]}>
                {step.icon}
              </ThemedText>
            </View>
            
            {/* Step Title */}
            <ThemedText style={[
              styles.roadmapTitle,
              index === currentScreen && styles.roadmapTitleActive
            ]}>
              {step.title}
            </ThemedText>
            
            {/* Connecting Line (except for last step) */}
            {index < steps.length - 1 && (
              <View style={[
                styles.roadmapLine,
                index < currentScreen && styles.roadmapLineCompleted
              ]} />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderCurrentScreen = () => {
    if (!summaryData) return null;

    switch (currentScreen) {
      case 0:
        return (
          <>
            {/* Code Section */}
            <View style={styles.codeCard}>
              <View style={styles.cardHeader}>
                <View style={styles.headerIconContainer}>
                  <ThemedText style={styles.headerIcon}>💻</ThemedText>
                </View>
                <ThemedText style={styles.cardHeaderText}>Code</ThemedText>
              </View>
              <View style={styles.codeBlock}>
                <ThemedText style={styles.codeText}>
                  {formatCode(summaryData.finalCode)}
                </ThemedText>
              </View>
            </View>

            {/* Step by Step Section */}
            <View style={styles.stepsCard}>
              <View style={styles.cardHeader}>
                <View style={styles.headerIconContainer}>
                  <ThemedText style={styles.headerIcon}>📋</ThemedText>
                </View>
                <ThemedText style={styles.cardHeaderText}>Step by Step</ThemedText>
              </View>
              <View style={styles.stepsContent}>
                {summaryData.pseudocodeSteps.map((step, index) => (
                  <View key={index} style={styles.stepItem}>
                    <View style={styles.stepNumber}>
                      <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
                    </View>
                    <View style={styles.stepTextContainer}>
                      {renderTextWithBubbles(step.replace(/^Step \d+:\s*/i, ''), styles.stepText)}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        );
      
      case 1:
        return (
          <View style={styles.explanationCard}>
            <View style={styles.cardHeader}>
              <View style={styles.headerIconContainer}>
                <ThemedText style={styles.headerIcon}>🧠</ThemedText>
              </View>
              <ThemedText style={styles.cardHeaderText}>How It Works</ThemedText>
            </View>
            <View style={styles.explanationContent}>
              {formatExplanationText(summaryData.explanation).map((paragraph, index) => (
                <View key={index} style={styles.explanationParagraph}>
                  {renderTextWithBubbles(paragraph, styles.explanationText)}
                </View>
              ))}
            </View>
          </View>
        );
      
      case 2:
        return (
          <View style={styles.efficiencyCard}>
            <View style={styles.cardHeader}>
              <View style={styles.headerIconContainer}>
                <ThemedText style={styles.headerIcon}>⚡</ThemedText>
              </View>
              <ThemedText style={styles.cardHeaderText}>Efficiency Analysis</ThemedText>
            </View>
            <View style={styles.efficiencyContent}>
              {/* Time Complexity */}
              <View style={styles.complexitySection}>
                <ThemedText style={styles.complexityTitle}>Time:</ThemedText>
                <View style={styles.complexityValueContainer}>
                  {renderTextWithBubbles(summaryData.efficiency.timeComplexity, styles.complexityValue)}
                </View>
                <View style={styles.complexityExplanationCard}>
                  <View style={styles.explanationContent}>
                    {renderTextWithBubbles(parseTimeComplexityExplanation(summaryData.efficiency.explanation), styles.explanationText)}
                  </View>
                </View>
              </View>

              {/* Space Complexity */}
              <View style={styles.complexitySection}>
                <ThemedText style={styles.complexityTitle}>Space:</ThemedText>
                <View style={styles.complexityValueContainer}>
                  {renderTextWithBubbles(summaryData.efficiency.spaceComplexity, styles.complexityValue)}
                </View>
                <View style={styles.complexityExplanationCard}>
                  <View style={styles.explanationContent}>
                    {renderTextWithBubbles(parseSpaceComplexityExplanation(summaryData.efficiency.explanation), styles.explanationText)}
                  </View>
                </View>
              </View>
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <View style={[
            styles.headerTitleBubble, 
            { 
              backgroundColor: getDifficultyBubbleColor(difficulty),
              shadowColor: getDifficultyAccentColor(difficulty),
            }
          ]}>
            <View style={[styles.difficultyDot, { backgroundColor: getDifficultyAccentColor(difficulty) }]} />
            <ThemedText style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
              {getScreenTitle()}
            </ThemedText>
          </View>
        </View>
      </View>

      <ScrollView ref={scrollViewRef} style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6564c7" />
            <ThemedText style={styles.loadingText}>Generating code summary...</ThemedText>
          </View>
        ) : summaryData ? (
          <>
            {/* Roadmap */}
            {renderRoadmap()}
            
            {/* Current Screen Content */}
            {renderCurrentScreen()}

            {/* Navigation Buttons */}
            <View style={styles.navigationContainer}>
              {currentScreen > 0 && (
                <TouchableOpacity style={styles.navButton} onPress={handlePrevious}>
                  <ThemedText style={styles.navButtonText}>← Previous</ThemedText>
                </TouchableOpacity>
              )}
              
              <View style={styles.rightButtonContainer}>
                {currentScreen < 2 ? (
                  <TouchableOpacity style={[styles.navButton, styles.nextButton]} onPress={handleNext}>
                    <ThemedText style={styles.nextButtonText}>Next →</ThemedText>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.continueButton, isMarkingComplete && styles.continueButtonDisabled]} 
                    onPress={handleMarkComplete}
                    disabled={isMarkingComplete}
                  >
                    <ThemedText style={styles.continueButtonText}>
                      {isMarkingComplete ? 'Mark as Completed...' : 'Complete'}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>Failed to generate code summary</ThemedText>
            <TouchableOpacity style={styles.retryButton} onPress={generateCodeSummary}>
              <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f7ff',
  },
  header: {
    backgroundColor: '#6564c7',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBubble: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    minWidth: '65%',
    maxWidth: '80%',
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    flexShrink: 1,
    lineHeight: 22,
  },

  content: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f7ff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 100,
    minHeight: 400,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6564c7',
    fontWeight: '600',
  },
  sectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  difficultyBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  codeContainer: {
    padding: 16,
    backgroundColor: '#faf8ff',
  },
  containerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  codeBlock: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    paddingTop: 12,
    marginHorizontal: 0,
    marginVertical: 0,
    borderRadius: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    borderTopWidth: 0,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 15,
    color: '#f8f8f2',
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  explanationContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  explanationText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
    fontWeight: '400',
  },
  pseudocodeContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pseudocodeStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#6564c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  stepText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    flex: 1,
  },
  efficiencyContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  complexityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  complexityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 140,
  },
  complexityValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6564c7',
    backgroundColor: '#faf8ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  efficiencyExplanation: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
    fontWeight: '400',
  },
  complexitySection: {
    marginBottom: 24,
  },
  complexityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  complexityExplanationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  actionContainer: {
    marginBottom: 20,
  },
  continueButton: {
    backgroundColor: '#10b981',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  errorText: {
    fontSize: 16,
    color: '#6564c7',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6564c7',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // New styles for improved formatting
  highlightedText: {
    color: '#5b21b6',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  explanationContent: {
    padding: 20,
    gap: 16,
  },
  explanationParagraph: {
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  stepsContent: {
    padding: 20,
    gap: 12,
  },
  stepTextContainer: {
    flex: 1,
    backgroundColor: '#faf8ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  // Fixed text bubble styles
  // Combined code explanation styles
  codeExplanationContainer: {
    marginBottom: 20,
  },
  codeCard: {
    backgroundColor: '#6564c7',
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  explanationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  stepsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  cardHeader: {
    backgroundColor: '#6564c7',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // New improved styles
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerIcon: {
    fontSize: 16,
  },
  pseudocodeStepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  efficiencyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  efficiencyContent: {
    padding: 24,
    gap: 20,
  },
  efficiencyExplanationContainer: {
    marginTop: 8,
  },
  complexityValueContainer: {
    marginBottom: 4,
  },

  continueButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0.1,
    borderColor: '#e5e7eb',
  },
  // Navigation styles
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  rightButtonContainer: {
    marginLeft: 'auto',
  },
  navButton: {
    backgroundColor: '#6564c7',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButton: {
    backgroundColor: '#6564c7',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Step styles
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  // Roadmap styles
  roadmapContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  roadmapStepContainer: {
    alignItems: 'center',
    position: 'relative',
    flex: 1,
  },
  roadmapBubble: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  roadmapBubbleActive: {
    backgroundColor: '#6564c7',
    borderColor: '#6564c7',
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  roadmapIcon: {
    fontSize: 20,
  },
  roadmapIconActive: {
    fontSize: 20,
  },
  roadmapTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  roadmapTitleActive: {
    color: '#6564c7',
    fontWeight: '600',
  },
  roadmapLine: {
    position: 'absolute',
    top: 25,
    right: -50,
    width: 100,
    height: 2,
    backgroundColor: '#d1d5db',
    zIndex: -1,
  },
  roadmapLineCompleted: {
    backgroundColor: '#6564c7',
  },
}); 