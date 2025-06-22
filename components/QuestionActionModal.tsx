import { QuizModal } from '@/app/components/QuizModal';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { ThemedText } from './ThemedText';

interface QuestionActionModalProps {
  visible: boolean;
  onClose: () => void;
  questionTitle: string;
  questionId: number;
  userSkillLevel: 'Beginner' | 'Intermediate' | 'Professional';
  hasCompletedLesson: boolean;
  questionDifficulty: 'Easy' | 'Medium' | 'Hard';
  questionDescription: string;
}

const { width, height } = Dimensions.get('window');

export const QuestionActionModal: React.FC<QuestionActionModalProps> = ({
  visible,
  onClose,
  questionTitle,
  questionId,
  userSkillLevel,
  hasCompletedLesson,
  questionDifficulty,
  questionDescription,
}) => {
  const [showQuiz, setShowQuiz] = useState(false);

  // Determine if attempt question should be locked based on skill level and lesson completion
  const shouldLockAttemptQuestion = () => {
    if (userSkillLevel === 'Professional') return false;
    if (userSkillLevel === 'Intermediate' && questionDifficulty !== 'Hard') return false;
    if (userSkillLevel === 'Beginner') return !hasCompletedLesson;
    return false;
  };

  const isAttemptLocked = shouldLockAttemptQuestion();
  
  console.log('Modal Debug:', {
    userSkillLevel,
    questionDifficulty,
    hasCompletedLesson,
    isAttemptLocked,
    shouldLock: shouldLockAttemptQuestion()
  });

  const handleQuickQuiz = () => {
    setShowQuiz(true);
  };

  const handleAttemptQuestion = () => {
    if (isAttemptLocked) {
      Alert.alert(
        'Quiz Required',
        `As a ${userSkillLevel}, you must complete the quiz first before attempting this question.`,
        [
          { text: 'OK', style: 'default' },
          { text: 'Take Quiz', onPress: handleQuickQuiz }
        ]
      );
      return;
    }
    
    onClose();
    router.push({
      pathname: '/screens/question',
      params: {
        id: questionId.toString(),
        name: questionTitle,
        difficulty: questionDifficulty,
      },
    });
  };

  const handleQuizComplete = (passed: boolean) => {
    setShowQuiz(false);
    if (passed) {
      // Quiz passed, now allow attempting the question
      onClose();
      router.push({
        pathname: '/screens/question',
        params: {
          id: questionId.toString(),
          name: questionTitle,
          difficulty: questionDifficulty,
        },
      });
    }
  };

  const getSkillLevelRequirement = () => {
    switch (userSkillLevel) {
      case 'Beginner':
        return 'You must complete the quiz for all questions before attempting them.';
      case 'Intermediate':
        return 'You must complete the quiz for Hard questions only.';
      case 'Professional':
        return 'No quiz requirements.';
      default:
        return '';
    }
  };

  return (
    <>
      <Modal
        visible={visible && !showQuiz}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <ThemedText style={styles.title}>Choose Action</ThemedText>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <ThemedText style={styles.closeButtonText}>✕</ThemedText>
              </TouchableOpacity>
            </View>

            {/* Question Info */}
            <View style={styles.questionInfo}>
              <ThemedText style={styles.questionTitle} numberOfLines={2}>
                {questionTitle}
              </ThemedText>
              <View style={styles.difficultyContainer}>
                <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(questionDifficulty) }]}>
                  <ThemedText style={styles.difficultyText}>{questionDifficulty}</ThemedText>
                </View>
              </View>
            </View>

            {/* Skill Level Info */}
            <View style={styles.skillLevelInfo}>
              <ThemedText style={styles.skillLevelTitle}>Your Skill Level: {userSkillLevel}</ThemedText>
              <ThemedText style={styles.requirementText}>{getSkillLevelRequirement()}</ThemedText>
              {isAttemptLocked && (
                <View style={styles.lockWarning}>
                  <ThemedText style={styles.lockWarningText}>⚠️ Quiz Required</ThemedText>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {/* Quick Quiz Button */}
              <TouchableOpacity
                style={[styles.actionButton, styles.quickQuizButton]}
                onPress={handleQuickQuiz}
              >
                <View style={styles.buttonContent}>
                  <ThemedText style={styles.buttonIcon}>📚</ThemedText>
                  <View style={styles.buttonTextContainer}>
                    <ThemedText style={styles.buttonTitle}>Quick Quiz</ThemedText>
                    <ThemedText style={styles.buttonSubtitle}>
                      3 questions to help you understand the approach
                    </ThemedText>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Attempt Question Button */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.attemptButton,
                  isAttemptLocked && styles.lockedButton
                ]}
                onPress={handleAttemptQuestion}
                disabled={isAttemptLocked}
              >
                <View style={styles.buttonContent}>
                  {isAttemptLocked ? (
                    <Image
                      source={require('@/assets/images/icons/lock-icon.png')}
                      style={styles.lockIcon}
                    />
                  ) : (
                    <ThemedText style={styles.buttonIcon}>💻</ThemedText>
                  )}
                  <View style={styles.buttonTextContainer}>
                    <ThemedText style={[
                      styles.buttonTitle,
                      isAttemptLocked && styles.lockedText
                    ]}>
                      {isAttemptLocked ? 'LOCKED - Attempt Question' : 'Attempt Question'}
                    </ThemedText>
                    <ThemedText style={[
                      styles.buttonSubtitle,
                      isAttemptLocked && styles.lockedText
                    ]}>
                      {isAttemptLocked 
                        ? 'Complete the quiz first' 
                        : 'Start solving the problem'
                      }
                    </ThemedText>
                  </View>
                  {isAttemptLocked && (
                    <View style={styles.lockIndicator}>
                      <Image
                        source={require('@/assets/images/icons/lock-icon.png')}
                        style={styles.smallLockIcon}
                      />
                      <ThemedText style={styles.lockText}> LOCKED</ThemedText>
                    </View>
                  )}
                </View>
                
                {/* Lock overlay for more prominent visual */}
                {isAttemptLocked && (
                  <View style={styles.lockOverlay}>
                    <Image
                      source={require('@/assets/images/icons/lock-icon.png')}
                      style={styles.lockOverlayIcon}
                    />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quiz Modal */}
      <QuizModal
        visible={showQuiz}
        onClose={() => setShowQuiz(false)}
        problemId={questionId}
        questionTitle={questionTitle}
        questionDescription={questionDescription}
        onQuizComplete={handleQuizComplete}
      />
    </>
  );
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'Easy':
      return '#22C55E';
    case 'Medium':
      return '#F59E0B';
    case 'Hard':
      return '#EF4444';
    default:
      return '#6B7280';
  }
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#F4EEFF',
    borderRadius: 20,
    padding: 24,
    width: width * 0.9,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  questionInfo: {
    marginBottom: 20,
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  skillLevelInfo: {
    backgroundColor: '#E0E7FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  skillLevelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3730A3',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 14,
    color: '#6366F1',
    lineHeight: 20,
  },
  actionButtons: {
    gap: 16,
  },
  actionButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  quickQuizButton: {
    borderColor: '#8B5CF6',
  },
  attemptButton: {
    borderColor: '#10B981',
  },
  lockedButton: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    opacity: 0.8,
    borderWidth: 3,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  lockedText: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  lockIndicator: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  lockText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  lockOverlayIcon: {
    width: 48,
    height: 48,
  },
  lockWarning: {
    backgroundColor: '#EF4444',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  lockWarningText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lockIcon: {
    width: 24,
    height: 24,
  },
  smallLockIcon: {
    width: 16,
    height: 16,
  },
}); 