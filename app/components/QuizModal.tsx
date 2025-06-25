import { ThemedText } from '@/components/ThemedText';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
}

interface QuizData {
  introductory_text: string;
  quiz: QuizQuestion[];
}

interface QuizModalProps {
  visible: boolean;
  onClose: () => void;
  quizData: QuizData;
  onComplete: (passed: boolean) => void;
}

export default function QuizModal({ visible, onClose, quizData, onComplete }: QuizModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  // Reset state when modal is opened with new data or closed
  React.useEffect(() => {
    if (visible) {
      handleRetakeQuiz();
    }
  }, [visible]);

  const currentQuestion = quizData.quiz[currentQuestionIndex];

  const handleNextQuestion = () => {
    const isCorrect = selectedOption === currentQuestion.correct_answer;
    const updatedAnswers = [...userAnswers, selectedOption];
    setUserAnswers(updatedAnswers);

    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setSelectedOption(null);

    if (currentQuestionIndex < quizData.quiz.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  };
  
  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setSelectedOption(null);
    setShowResults(false);
    setScore(0);
  };

  const handleFinishQuiz = () => {
    const passed = score === quizData.quiz.length;
    onComplete(passed);
  };

  const renderQuizContent = () => {
    if (showResults) {
      const passed = score === quizData.quiz.length;
      return (
        <View style={styles.resultsView}>
          <ThemedText style={styles.resultsTitle}>Quiz Completed!</ThemedText>
          <ThemedText style={styles.scoreText}>Your score: {score} / {quizData.quiz.length}</ThemedText>
          {passed ? (
            <ThemedText style={styles.passedText}>Congratulations! You passed the lesson.</ThemedText>
          ) : (
            <ThemedText style={styles.failedText}>You need a perfect score to pass. Please try again.</ThemedText>
          )}
          <TouchableOpacity style={styles.finishButton} onPress={handleFinishQuiz}>
            <Text style={styles.buttonText}>Finish</Text>
          </TouchableOpacity>
          {!passed && (
            <TouchableOpacity style={styles.retakeButton} onPress={handleRetakeQuiz}>
              <Text style={styles.buttonText}>Retake Quiz</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View>
        <ThemedText style={styles.questionText}>{currentQuestion.question}</ThemedText>
        {currentQuestion.options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              selectedOption === option && styles.selectedOption,
            ]}
            onPress={() => setSelectedOption(option)}
          >
            <Text style={styles.optionText}>{option}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.nextButton, !selectedOption && styles.disabledButton]}
          onPress={handleNextQuestion}
          disabled={!selectedOption}
        >
          <Text style={styles.buttonText}>
            {currentQuestionIndex < quizData.quiz.length - 1 ? 'Next' : 'Finish'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.modalTitle}>Lesson</ThemedText>
            <ThemedText style={styles.introText}>{quizData.introductory_text}</ThemedText>
            <View style={styles.separator} />
            {renderQuizContent()}
          </ScrollView>
          <TouchableOpacity style={styles.closeButton} onPress={handleFinishQuiz}>
              <Text style={styles.closeButtonText}>Close</Text>
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
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalView: {
      margin: 20,
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 25,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      width: '90%',
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 15,
      textAlign: 'center',
    },
    introText: {
      fontSize: 16,
      marginBottom: 20,
      lineHeight: 24,
    },
    separator: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 20,
    },
    questionText: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 20,
    },
    optionButton: {
      backgroundColor: '#f0f0f0',
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
    },
    selectedOption: {
      backgroundColor: '#d0e0ff',
      borderColor: '#2196F3',
      borderWidth: 2,
    },
    optionText: {
      fontSize: 16,
    },
    nextButton: {
      backgroundColor: '#2196F3',
      padding: 15,
      borderRadius: 10,
      marginTop: 10,
    },
    disabledButton: {
      backgroundColor: '#a0a0a0',
    },
    buttonText: {
      color: 'white',
      fontWeight: 'bold',
      textAlign: 'center',
      fontSize: 16,
    },
    resultsView: {
        alignItems: 'center',
    },
    resultsTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    scoreText: {
        fontSize: 20,
        marginBottom: 20,
    },
    passedText: {
        fontSize: 18,
        color: 'green',
        textAlign: 'center',
        marginBottom: 20,
    },
    failedText: {
        fontSize: 18,
        color: 'red',
        textAlign: 'center',
        marginBottom: 20,
    },
    finishButton: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 10,
        width: '100%',
        marginBottom: 10,
    },
    retakeButton: {
        backgroundColor: '#FF9800',
        padding: 15,
        borderRadius: 10,
        width: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        backgroundColor: '#e0e0e0',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#333',
        fontWeight: 'bold',
        fontSize: 16,
    }
  }); 