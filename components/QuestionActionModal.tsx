import { ThemedText } from '@/components/ThemedText';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  isQuestionSolved
}: QuestionActionModalProps) {
  const handleViewLesson = () => {
    // Navigate to lesson screen
    router.push({
      pathname: '/screens/lesson',
      params: {
        questionId: questionId.toString(),
        questionTitle: questionTitle,
        questionDescription: questionDescription,
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

  const lessonButtonText = hasCompletedLesson ? 'Lesson Completed ✓' : 'Learn skills!';
  const lessonButtonStyle = hasCompletedLesson ? styles.buttonCompleted : styles.buttonLesson;
  
  // If question is solved (3+ stars), both buttons should be unlocked
  const attemptButtonText = (isLessonRequired && !hasCompletedLesson && !isQuestionSolved) 
    ? 'Attempt Question! (Locked)' 
    : 'Attempt Question!';
  const attemptButtonStyle = (isLessonRequired && !hasCompletedLesson && !isQuestionSolved) 
    ? styles.buttonLocked 
    : styles.buttonSolve;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <ThemedText style={styles.modalTitle}>{questionTitle}</ThemedText>
          
          <TouchableOpacity 
            style={[styles.button, lessonButtonStyle]} 
            onPress={handleViewLesson}
          >
            <Text style={styles.textStyle}>{lessonButtonText}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, attemptButtonStyle]} onPress={handleSolveProblem}>
            <Text style={styles.textStyle}>{attemptButtonText}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.buttonClose]} onPress={onClose}>
            <Text style={styles.textStyle}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    marginBottom: 10,
    width: '100%',
  },
  buttonLesson: {
    backgroundColor: '#2196F3',
  },
  buttonCompleted: {
    backgroundColor: '#4CAF50',
  },
  buttonLocked: {
    backgroundColor: '#9E9E9E', // Grey color for locked state
  },
  buttonSolve: {
    backgroundColor: '#FFC107',
  },
  buttonClose: {
    backgroundColor: '#f44336',
    marginTop: 10,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 