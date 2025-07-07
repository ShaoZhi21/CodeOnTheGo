import { router } from 'expo-router';
import { Alert, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  bubblePosition = { x: 0, y: 0 }
}: QuestionActionModalProps) {
  const handleViewLesson = () => {
    console.log('🎯 handleViewLesson called');
    console.log('🎯 Navigation params:', {
      questionId: questionId.toString(),
      questionTitle: questionTitle,
      questionDescription: questionDescription,
      topicName: topicName,
    });
    
    // Navigate to loading lesson screen first
    router.push({
      pathname: '/screens/LoadingLesson',
      params: {
        questionId: questionId.toString(),
        questionTitle: questionTitle,
        questionDescription: questionDescription,
        topicName: topicName,
        questionDifficulty: questionDifficulty,
        from: 'roadmaptopic', // Add source for back navigation
      },
    });
    onClose();
  };

  const handleSolveProblem = () => {
    // Check if lesson is required but not completed
    if (isLessonRequired && !hasCompletedLesson && !isQuestionSolved) {
      Alert.alert(
        "Lesson Required",
        "You must complete the lesson before attempting this question."
      );
      return;
    }
    
    router.push({
      pathname: '/screens/question',
      params: {
        id: questionId.toString(),
        name: questionTitle,
        difficulty: questionDifficulty
      },
    });
    onClose();
  };

  // Determine if the pseudocode button should be locked
  const isPseudocodeLocked = isLessonRequired && !hasCompletedLesson && !isQuestionSolved;

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
                </View>
                <Text style={styles.squareButtonText}>Lesson</Text>
              </TouchableOpacity>

              {/* Pseudocode Button */}
              <TouchableOpacity 
                style={[
                  styles.squareButton, 
                  styles.pseudocodeButton,
                  isPseudocodeLocked && styles.lockedButton
                ]} 
                onPress={handleSolveProblem}
                disabled={isPseudocodeLocked}
              >
                <View style={styles.buttonContent}>
                  {isPseudocodeLocked && (
                    <Text style={styles.lockedText}>Locked</Text>
                  )}
                  <Image 
                    source={require('../assets/images/icons/pseudocode-icon.png')} 
                    style={styles.buttonIcon} 
                  />
                </View>
                <Text style={styles.squareButtonText}>Pseudocode</Text>
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
    maxHeight: 200,
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
    gap: 15,
  },
  questionHeader: {
    width: '100%',
    marginBottom: 5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    lineHeight: 24,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
    flexShrink: 0,
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
  lockedButton: {
    backgroundColor: '#2979FF',
    opacity: 0.4,
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  lockedText: {
    color: '#FF0000',
    fontWeight: '700',
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 2,
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
}); 