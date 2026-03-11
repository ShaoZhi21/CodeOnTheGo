import { router } from 'expo-router';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Routes } from '@/lib/navigation/routes';

interface QuestionActionModalProps {
  visible: boolean;
  onClose: () => void;
  questionTitle: string;
  questionId: number;
  questionDescription: string;
  userSkillLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  hasCompletedLesson: boolean;
  questionDifficulty: 'Easy' | 'Medium' | 'Hard';
  isLessonRequired: boolean;
  isQuestionSolved: boolean;
  topicName: string;
  isQuestionOnLeft?: boolean;
  bubblePosition?: { x: number; y: number };
  origin?: 'roadmap' | 'allquestions' | 'studyplan';
  planId?: string;
}

export default function QuestionActionModal({
  visible,
  onClose,
  questionTitle,
  questionId,
  questionDescription,
  userSkillLevel,
  hasCompletedLesson,
  questionDifficulty,
  isLessonRequired,
  isQuestionSolved,
  topicName,
  isQuestionOnLeft = false,
  bubblePosition = { x: 0, y: 0 },
  origin = 'roadmap',
  planId,
}: QuestionActionModalProps) {
  const handleViewLesson = () => {
    // Navigate to loading lesson screen first
    router.push(
      Routes.screens.loadingLesson({
        questionId: questionId.toString(),
        questionTitle,
        questionDescription,
        topicName,
        questionDifficulty,
        source: origin,
        planId,
      }) as any,
    );
    onClose();
  };

  // Let the user choose Lesson OR Pseudocode first (no gating).
  // We treat "Pseudocode" as entering the in-app question flow (where they can write pseudocode).
  const handleStartPseudocode = () => {
    router.push(
      Routes.screens.question({
        id: questionId.toString(),
        name: questionTitle,
        difficulty: questionDifficulty,
        source: origin,
        topicName,
        planId,
      }) as any,
    );
    onClose();
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '#4CAF50';
      case 'Medium': return '#FF9800';
      case 'Hard': return '#F44336';
      default: return '#6564c7';
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Close button in top right */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
          
          <View style={styles.modalContent}>
            {/* Question Title and Difficulty */}
            <View style={styles.questionHeader}>
              <View style={styles.titleRow}>
                <Text style={styles.questionTitle} numberOfLines={2}>
                  {questionTitle}
                </Text>
                <View style={[
                  styles.difficultyBadge,
                  { backgroundColor: getDifficultyColor(questionDifficulty) }
                ]}>
                  <Text style={styles.difficultyText}>
                    {questionDifficulty}
                  </Text>
                </View>
              </View>
            </View>

            {/* Lesson and Pseudocode Buttons in Row */}
            <View style={styles.buttonRow}>
              {/* Lesson Button */}
              <TouchableOpacity 
                style={[styles.squareButton, styles.lessonButton]} 
                onPress={handleViewLesson}
              >
                <View style={styles.buttonContent}>
                  <Image 
                    source={require('../assets/images/icons/lesson-icon.png')} 
                    style={styles.buttonIcon} 
                  />
                  <View style={styles.textContainer}>
                    <Text style={styles.squareButtonText}>Lesson</Text>
                    {hasCompletedLesson && (
                      <Image 
                        source={require('../assets/images/icons/complete-icon.png')} 
                        style={styles.completionIcon} 
                      />
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Pseudocode Button */}
              <TouchableOpacity 
                style={[styles.squareButton, styles.pseudocodeButton]} 
                onPress={handleStartPseudocode}
              >
                <View style={styles.buttonContent}>
                  <Image 
                    source={require('../assets/images/icons/pseudocode-icon.png')} 
                    style={styles.buttonIcon} 
                  />
                  <View style={styles.textContainer}>
                    <Text style={styles.squareButtonText}>Pseudocode</Text>
                    {isQuestionSolved && (
                      <Image 
                        source={require('../assets/images/icons/complete-icon.png')} 
                        style={styles.completionIcon} 
                      />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
    minWidth: 280,
    maxWidth: '90%',
    maxHeight: 220,
  },
  closeButton: {
    position: 'absolute',
    top: -15,
    right: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  modalContent: {
    alignItems: 'center',
    paddingTop: 5,
    gap: 0,
  },
  questionHeader: {
    width: '100%',
    marginBottom: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap', // Allow title to wrap
  },
  questionTitle: {
    fontSize: 18, // Slightly smaller font
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    lineHeight: 22,
    flexWrap: 'wrap', // Allow text to wrap
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
    flexShrink: 0,
    alignSelf: 'flex-start', // Align to top with text
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
    marginTop: 20, // Push buttons to bottom
  },
  squareButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  lessonButton: {
    backgroundColor: '#7C4DFF',
  },
  pseudocodeButton: {
    backgroundColor: '#2979FF',
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  buttonIcon: {
    width: 48,
    height: 48,
    marginBottom: 6,
  },
  squareButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  completionBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  completionIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
}); 
