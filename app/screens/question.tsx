import { ThemedText } from '@/components/ThemedText';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Analysis {
  correctness: string;
  efficiency: {
    time: string;
    space: string;
    anyMoreOptimal: string;
  };
  edgeCases: string[];
  suggestions: string[];
  score: number;
  stars: number;
}

export default function QuestionScreen() {
  const params = useLocalSearchParams();
  const { id, name, difficulty } = params;
  const [description] = useState(
    "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order."
  );
  const [examples] = useState([
    {
      input: "nums = [2,7,11,15], target = 9",
      output: "[0,1]",
      explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
    },
    {
      input: "nums = [3,2,4], target = 6",
      output: "[1,2]",
      explanation: "Because nums[1] + nums[2] == 6, we return [1, 2]."
    },
    {
      input: "nums = [3,3], target = 6",
      output: "[0,1]",
      explanation: "Because nums[0] + nums[1] == 6, we return [0, 1]."
    }
  ]);
  const [showProblem, setShowProblem] = useState(true);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [solution, setSolution] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy':
        return '#00B8A3';
      case 'Medium':
        return '#FFA116';
      case 'Hard':
        return '#FF375F';
      default:
        return '#6564c7';
    }
  };

  function handleSolutionChange(text: string) {
    setSolution(text);
  }
  
  async function handleSolveProblem() {
    if (!solution.trim()) {
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: solution,
          question: description
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setAnalysis(data.analysis);
      } else {
        console.error('Error:', data.error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.titleContainer}>
          <View style={styles.questionHeader}>
            <ThemedText style={styles.questionId}>#{id}</ThemedText>
            <ThemedText style={styles.title}>{name}</ThemedText>
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(difficulty as string) }]}>
              <ThemedText style={styles.difficultyText}>{difficulty}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.toggleButton, { backgroundColor: showProblem ? '#6564c7' : '#c7c1e9' }]} onPress={() => setShowProblem(true)}>
              <ThemedText style={styles.toggleButtonText}>Problem</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleButton, { backgroundColor: !showProblem ? '#6564c7' : '#c7c1e9' }]} onPress={() => setShowProblem(false)}>
              <ThemedText style={styles.toggleButtonText}>Example</ThemedText>
            </TouchableOpacity>
          </View>

        <View style={styles.section}>
            <View style={styles.descriptionContainer}>
              {showProblem ? 
              <ThemedText style={styles.description}>{description}</ThemedText>
               : (
                <>
                  <View style={styles.exampleContent}>
                    <View style={styles.exampleSection}>
                      <ThemedText style={styles.exampleLabel}>Input:</ThemedText>
                      <ThemedText style={styles.exampleText}>{examples[currentExampleIndex].input}</ThemedText>
                    </View>

                    <View style={styles.exampleSection}>
                      <ThemedText style={styles.exampleLabel}>Output:</ThemedText>
                      <ThemedText style={styles.exampleText}>{examples[currentExampleIndex].output}</ThemedText>
                    </View>

                    <View style={styles.exampleSection}>
                      <ThemedText style={styles.exampleLabel}>Explanation:</ThemedText>
                      <ThemedText style={styles.exampleText}>{examples[currentExampleIndex].explanation}</ThemedText>
                    </View>
                  </View>

                  <View style={styles.exampleNavigation}>
                    <TouchableOpacity 
                      style={[styles.arrowButton, currentExampleIndex === 0 && styles.disabledNavButton]}
                      onPress={() => setCurrentExampleIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentExampleIndex === 0}
                    >
                      <ThemedText style={styles.arrowButtonText}>{'<'}</ThemedText>
                    </TouchableOpacity>
                    
                    <View style={styles.exampleNumberContainer}>
                      {examples.map((_, index) => (
                        <TouchableOpacity 
                          key={index}
                          onPress={() => setCurrentExampleIndex(index)}
                          style={[
                            styles.exampleIndicator,
                            currentExampleIndex === index && styles.activeExampleIndicator
                          ]}
                        >
                          <ThemedText style={[
                            styles.exampleIndicatorText,
                            currentExampleIndex === index && styles.activeExampleIndicatorText
                          ]}>
                            {index + 1}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TouchableOpacity 
                      style={[styles.arrowButton, currentExampleIndex === examples.length - 1 && styles.disabledNavButton]}
                      onPress={() => setCurrentExampleIndex(prev => Math.min(examples.length - 1, prev + 1))}
                      disabled={currentExampleIndex === examples.length - 1}
                    >
                      <ThemedText style={styles.arrowButtonText}>{'>'}</ThemedText>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
        </View>
        
        <View style={[styles.section, { flex: 1 }]}>
          <ThemedText style={styles.sectionTitle}>Solution</ThemedText>
          <View style={styles.codeInputContainer}>
            <TextInput
              value={solution}
              onChangeText={handleSolutionChange}
              style={styles.codeInput}
              multiline
              placeholder="Write your solution here...">
            </TextInput>
          </View>
        </View>

        {analysis && (
          <View style={styles.analysisWrapper}>
            <ThemedText style={styles.sectionTitle}>Analysis</ThemedText>
            <View style={styles.analysisContainer}>
              <View style={styles.analysisContent}>
                <View style={styles.analysisSection}>
                  <ThemedText style={styles.analysisSubtitle}>Correctness</ThemedText>
                  <ThemedText style={styles.analysisText}>{analysis.correctness}</ThemedText>
                </View>

                <View style={styles.analysisSection}>
                  <ThemedText style={styles.analysisSubtitle}>Efficiency</ThemedText>
                  <ThemedText style={styles.analysisText}>Time: {analysis.efficiency.time}</ThemedText>
                  <ThemedText style={styles.analysisText}>Space: {analysis.efficiency.space}</ThemedText>
                  <ThemedText style={styles.analysisText}>More Optimal: {analysis.efficiency.anyMoreOptimal}</ThemedText>
                </View>

                <View style={styles.analysisSection}>
                  <ThemedText style={styles.analysisSubtitle}>Edge Cases</ThemedText>
                  {analysis.edgeCases.map((edgeCase: string, index: number) => (
                    <ThemedText key={index} style={styles.analysisText}>{edgeCase}</ThemedText>
                  ))}
                </View>

                <View style={styles.analysisSection}>
                  <ThemedText style={styles.analysisSubtitle}>Suggestions</ThemedText>
                  {analysis.suggestions.map((suggestion: string, index: number) => (
                    <ThemedText key={index} style={styles.analysisText}>{suggestion}</ThemedText>
                  ))}
                </View>

                <View style={styles.analysisSection}>
                  <ThemedText style={styles.analysisSubtitle}>Score</ThemedText>
                  <ThemedText style={styles.analysisText}>{analysis.score}/100</ThemedText>
                  <ThemedText style={styles.analysisText}>Stars: {analysis.stars}</ThemedText>
                </View>
              </View>
            </View>
          </View>
        )}
          
        <TouchableOpacity 
          style={[styles.solveButton, !solution.trim() && styles.solveButtonDisabled]}
          onPress={handleSolveProblem}
          disabled={!solution.trim() || isAnalyzing}
        >
          {isAnalyzing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.solveButtonText}>Solve Problem</ThemedText>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    padding: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
    tintColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleContainer: {
    marginBottom: 5,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    justifyContent: 'flex-start',
    gap: 0,
    paddingBottom: 8,
  },
  questionId: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6564c7',
    minWidth: 45,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d2d2d',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
  },
  difficultyText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 6,
    fontSize: 16,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    marginLeft: '1%',
    fontWeight: '600',
    marginBottom: 8,
    color: '#2d2d2d',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    height: 226,
  },
  solveButton: {
    backgroundColor: '#6564c7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 20,
  },
  solveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 12,
    gap: 6,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  descriptionContainer: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
    height: 250,
  },
  codeInputContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 12,
  },
  codeInput: {
    flex: 1,
    fontSize: 16,
    color: '#444',
    textAlignVertical: 'top',
  },
  exampleContent: {
    flex: 1,
  },
  exampleSection: {
    marginBottom: 4,
  },
  exampleLabel: {
    fontWeight: 'bold',
    color: '#6564c7',
    fontSize: 16,
  },
  exampleText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
  },
  exampleNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 8,
  },
  exampleNumberContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  exampleIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeExampleIndicator: {
    backgroundColor: '#6564c7',
  },
  exampleIndicatorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  activeExampleIndicatorText: {
    color: '#fff',
  },
  arrowButton: {
    width: 40,
    height: 30,
    borderRadius: 20,
    backgroundColor: '#6564c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    paddingRight: "2%",
  },
  disabledNavButton: {
    backgroundColor: '#e0e0e0',
  },
  solveButtonDisabled: {
    backgroundColor: '#c7c1e9',
  },
  analysisWrapper: {
    marginTop: 4,
  },
  analysisContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  analysisContent: {
    marginTop: 8,
  },
  analysisSection: {
    marginBottom: 8,
  },
  analysisSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d2d2d',
    marginBottom: 4,
  },
  analysisText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
  },
}); 