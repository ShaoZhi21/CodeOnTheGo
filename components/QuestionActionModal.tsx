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
}

export default function QuestionActionModal({
  visible,
  onClose,
  questionTitle,
  questionId,
  questionDescription,
  userSkillLevel,
  hasCompletedLesson,
  questionDifficulty
}: QuestionActionModalProps) {
  const skillLevels = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
  const difficultyLevels = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };

  const isLessonLocked = () => {
    if (hasCompletedLesson) return false; // Already completed lessons are never locked
    return skillLevels[userSkillLevel] < difficultyLevels[questionDifficulty];
  };

  const handleLockedLessonPress = () => {
    Alert.alert(
      "Lesson Locked",
      `This lesson requires a skill level of '${questionDifficulty}'. Your current level is '${userSkillLevel}'.\n\nSolve more problems to increase your skill level!`
    );
  };

  const handleViewLesson = () => {
    if (isLessonLocked()) {
      handleLockedLessonPress();
      return;
    }
    
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

  const lessonLocked = isLessonLocked();
  const lessonButtonText = hasCompletedLesson ? 'Lesson Completed' : (lessonLocked ? `Lesson Locked (${questionDifficulty})` : 'View Lesson');
  const lessonButtonStyle = hasCompletedLesson
    ? styles.buttonCompleted
    : lessonLocked
    ? styles.buttonLocked
    : styles.buttonLesson;

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

          <TouchableOpacity style={[styles.button, styles.buttonSolve]} onPress={handleSolveProblem}>
            <Text style={styles.textStyle}>Solve Problem</Text>
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