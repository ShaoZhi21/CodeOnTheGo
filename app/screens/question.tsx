import DescriptionBox from '@/components/codeblocks/DescriptionBox';
import { ThemedText } from '@/components/ThemedText';
import { apiCall } from '@/lib/api-config';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnalysisModal } from '../components/AnalysisModal';

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
  const [selectedAnalysisSection, setSelectedAnalysisSection] = useState<'correctness' | 'efficiency' | 'edgeCases' | 'suggestions'>('correctness');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [descriptionBoxes, setDescriptionBoxes] = useState<string[]>([""]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      setSolution("");
      setIsAnalyzing(false);
      setAnalysis(null);
      setShowAnalysis(false);
      setSelectedAnalysisSection('correctness');
    };
  }, []);

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
  
  async function handleSolveProblem() {
    const combinedSolution = descriptionBoxes.join('\n');
    if (!combinedSolution.trim()) {
      return;
    }
    setSolution(combinedSolution);
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const response = await apiCall('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: combinedSolution,
          question: description
        }),
      });

      const data = await response.json();
      setAnalysis(data.analysis);
      setShowAnalysis(true);
    } catch (error) {
      // Show simple error message if both APIs failed
      setAnalysisError('Both live and local servers failed, try again');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleDescriptionBoxChange(index: number, text: string) {
    setDescriptionBoxes(prev => {
      const updated = [...prev];
      updated[index] = text;
      return updated;
    });
  }

  function handleAddDescriptionBox() {
    setDescriptionBoxes(prev => [...prev, ""]);
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

          {/* Button Row */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.addBoxButton} onPress={handleAddDescriptionBox}>
              <ThemedText style={styles.addBoxButtonText}>Add Box</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Render all DescriptionBoxes */}
          {descriptionBoxes.map((value, idx) => (
            <DescriptionBox
              key={idx}
              value={value}
              onChangeText={text => handleDescriptionBoxChange(idx, text)}
              placeholder={`Write your solution here...`}
              onDelete={descriptionBoxes.length > 1 ? () => setDescriptionBoxes(prev => prev.filter((_, i) => i !== idx)) : undefined}
            />
          ))}
        </View>

        {/* Error message for analysis failure */}
        {analysisError && (
          <View style={{ marginBottom: 8, backgroundColor: '#fff2f0', borderRadius: 8, padding: 10 }}>
            <ThemedText style={{ color: '#FF375F', fontWeight: '600' }}>{analysisError}</ThemedText>
          </View>
        )}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[
              styles.solveButton, 
              (!descriptionBoxes.join('\n').trim() || isAnalyzing) && styles.solveButtonDisabled,
              analysis ? styles.solveButtonWithAnalysis : styles.solveButtonFullWidth
            ]}
            onPress={handleSolveProblem}
            disabled={!descriptionBoxes.join('\n').trim() || isAnalyzing}
          >
            {isAnalyzing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.solveButtonText}>Solve Problem</ThemedText>
            )}
          </TouchableOpacity>

          {analysis && (
            <TouchableOpacity 
              style={styles.analysisToggleButton}
              onPress={() => setShowAnalysis(true)}
            >
              <Image 
                source={require('@/assets/images/icons/up-arrow.png')}
                style={styles.analysisToggleIcon}
              />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <AnalysisModal
        visible={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        analysis={analysis}
      />
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
    justifyContent: 'center',
  },
  solveButtonFullWidth: {
    flex: 1,
  },
  solveButtonWithAnalysis: {
    flex: 0.8,
  },
  solveButtonDisabled: {
    backgroundColor: '#c7c1e9',
  },
  solveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 24,
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
  analysisToggleButton: {
    flex: 0.2,
    backgroundColor: '#6564c7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisToggleIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
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
  analysisButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 6,
  },
  analysisButton: {
    flex: 1,
    padding: 12,
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
  correctnessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  largeStarIcon: {
    width: 40,
    height: 40,
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
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 12,
    gap: 8,
  },
  addBoxButton: {
    flex: 1,
    backgroundColor: '#6564c7',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBoxButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 