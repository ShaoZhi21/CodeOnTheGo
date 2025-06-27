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
    
    // Navigate to lesson screen
    router.push({
      pathname: '/screens/lesson',
      params: {
        questionId: questionId.toString(),
        questionTitle: questionTitle,
        questionDescription: questionDescription,
        topicName: topicName,
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
            {/* Lesson Button */}
            <TouchableOpacity 
              style={[styles.modalButton, styles.lessonButton]} 
              onPress={handleViewLesson}
            >
              <Text style={styles.modalButtonText}>Lesson</Text>
            </TouchableOpacity>

            {/* Pseudocode Button */}
            <TouchableOpacity 
              style={[styles.modalButton, styles.pseudocodeButton]} 
              onPress={handleSolveProblem}
            >
              <View style={styles.buttonContent}>
                {(isLessonRequired && !hasCompletedLesson && !isQuestionSolved) && (
                  <Image 
                    source={require('../assets/images/icons/lock-icon.png')} 
                    style={styles.lockIcon} 
                  />
                )}
                <Text style={styles.modalButtonText}>Pseudocode</Text>
              </View>
            </TouchableOpacity>
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
  modalButton: {
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
    width: '100%',
    alignItems: 'center',
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
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    tintColor: '#fff',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  lessonBubble: {
    backgroundColor: '#7C4DFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    position: 'relative',
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  lessonBubbleLeft: {
    marginRight: 10,
  },
  lessonBubbleRight: {
    marginLeft: 10,
  },
  lessonTail: {
    position: 'absolute',
    width: 0,
    height: 0,
    top: '50%',
    marginTop: -6,
  },
  lessonTailLeft: {
    right: -12,
    borderLeftWidth: 12,
    borderLeftColor: '#FFFFFF',
    borderTopWidth: 6,
    borderTopColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: 'transparent',
  },
  lessonTailRight: {
    left: -12,
    borderRightWidth: 12,
    borderRightColor: '#FFFFFF',
    borderTopWidth: 6,
    borderTopColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: 'transparent',
  },
  popupBubble: {
    backgroundColor: '#2979FF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#2979FF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 0,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    flexDirection: 'row',
  },
  lessonButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  popupContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pseudocodeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  bubbleTail: {
    position: 'absolute',
    width: 0,
    height: 0,
    top: '50%',
    marginTop: -8,
  },
  bubbleTailLeft: {
    right: -15,
    borderLeftWidth: 15,
    borderLeftColor: '#FFFFFF',
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
  },
  bubbleTailRight: {
    left: -15,
    borderRightWidth: 15,
    borderRightColor: '#FFFFFF',
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
  },
  bubbleContent: {
    alignItems: 'center',
    gap: 10,
  },
  bubbleButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  bubbleButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
}); 