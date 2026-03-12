import { HtmlRenderer } from '@/components/HtmlRenderer';
import { ThemedText } from '@/components/ThemedText';
import { apiCall } from '@/lib/api-config';
import { getConstraints, getDifficulty, getExamples, getPlanId, getProblemId, getProblemTitle, getSource, getTopicName } from '@/lib/navigation/canonical';
import { Routes } from '@/lib/navigation/routes';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Example {
  input: string;
  output: string;
  explanation: string;
  image?: string;
}

interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface MCQData {
  question: string;
  pseudocode: string;
  options: MCQOption[];
  explanation: string;
  optionExplanations?: { [key: string]: string };
}

interface PseudocodeStep {
  text: string;
  completed: boolean;
  selectedAnswer?: string;
  correctAnswer?: string;
}

export default function PseudoToCode() {
  const params = useLocalSearchParams();
  const [showProblemDetails, setShowProblemDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'problem' | 'examples'>('problem');
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [pseudocodeSteps, setPseudocodeSteps] = useState<PseudocodeStep[]>([]);
  const [allMCQs, setAllMCQs] = useState<(MCQData | null)[]>([]);
  const [currentMCQ, setCurrentMCQ] = useState<MCQData | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [isLoadingMCQ, setIsLoadingMCQ] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [allStepsCompleted, setAllStepsCompleted] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [loadedMCQCount, setLoadedMCQCount] = useState(0);
  const [hasNavigatedToSummary, setHasNavigatedToSummary] = useState(false);

  // Parse the passed parameters
  const problemId = getProblemId(params as any);
  const title = getProblemTitle(params as any) ?? '';
  const difficulty = getDifficulty(params as any) ?? '';
  const description = (params.description as string) ?? '';
  const examples: Example[] = (getExamples<Example[]>(params as any) ?? []) as Example[];
  void getConstraints<string[]>(params as any); // Parsed for forward-compat even if unused here
  const pseudocode = (params.pseudocode as string) ?? '';

  const source = getSource(params as any);
  const topicName = getTopicName(params as any);
  const planId = getPlanId(params as any);

  const handleBack = () => {
    if (source === 'studyplan') {
      if (planId) {
        router.replace(Routes.screens.studyPlanDetail(planId) as any);
      } else {
        router.replace(Routes.tabs.learn);
      }
      return;
    }

    // Roadmap flows: return to topic roadmap if possible
    if (topicName) {
      router.replace(
        Routes.screens.roadmapTopic({
          topic: topicName,
          from: (source || 'pseudocode') as string,
        }) as any,
      );
    } else if (source === 'allquestions') {
      router.replace(Routes.tabs.questions);
    } else {
      router.replace(Routes.tabs.root);
    }
  };

  // Initialize pseudocode steps and start loading all MCQs
  useEffect(() => {
    if (pseudocode && pseudocode.trim()) {
      const steps = pseudocode
        .split('\n')
        .filter(line => line.trim())
        .map(line => ({
          text: line.trim().replace(/^\d+[\.\)\-\s]*/, ''), // Remove leading numbers
          completed: false
        }));
      setPseudocodeSteps(steps);
      if (steps.length > 0) {
        // Initialize MCQ array with nulls
        setAllMCQs(new Array(steps.length).fill(null));
        setLoadedMCQCount(0);
        // Start loading all MCQs
        loadAllMCQs(steps);
      }
    }
    // `loadAllMCQs` is intentionally not in deps (would retrigger on each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pseudocode]);

  // Update current MCQ when step changes or MCQs are loaded
  useEffect(() => {
    if (allMCQs[currentStepIndex]) {
      setCurrentMCQ(allMCQs[currentStepIndex]);
      setIsLoadingMCQ(false);
    } else if (allMCQs.length > 0) {
      setCurrentMCQ(null);
      setIsLoadingMCQ(true);
    }
  }, [currentStepIndex, allMCQs]);

  // Check if all steps are completed and navigate to summary
  useEffect(() => {
    const allCompleted = pseudocodeSteps.length > 0 && pseudocodeSteps.every(step => step.completed);
    setAllStepsCompleted(allCompleted);
    
    // Auto-navigate to code summary when all steps are completed (only once)
    if (allCompleted && pseudocodeSteps.length > 0 && !hasNavigatedToSummary) {
      setHasNavigatedToSummary(true);
      // Small delay to allow user to see the completion state
      setTimeout(() => {
        handleFinish();
      }, 1000);
    }
    // `handleFinish` is intentionally not in deps (it depends on large param objects).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pseudocodeSteps, hasNavigatedToSummary]);

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

  const loadAllMCQs = async (steps: PseudocodeStep[]) => {
    setIsLoadingMCQ(true);
    
    // Load MCQs sequentially, but update UI as each one completes
    for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
    try {
        // Check if there's a next step to provide context about nesting
        const nextStep = stepIndex + 1 < steps.length ? steps[stepIndex + 1].text : null;
        
        const response = await apiCall('/api/generate-mcq', {
          method: 'POST',
          body: JSON.stringify({
            pseudocodeLine: steps[stepIndex].text,
            language: selectedLanguage,
            context: `This is step ${stepIndex + 1} of ${steps.length} in converting pseudocode to ${selectedLanguage} code.`,
            nextStep: nextStep,
            problemTitle: title,
            problemDescription: description
          }),
        });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

        const mcqData = await response.json();
        
        // Update the specific MCQ in the array
        setAllMCQs(prev => {
          const updated = [...prev];
          updated[stepIndex] = mcqData;
          return updated;
        });
        
        setLoadedMCQCount(prev => prev + 1);
        
        // If this is the first MCQ (step 0), show it immediately
        if (stepIndex === 0) {
          setCurrentMCQ(mcqData);
          setIsLoadingMCQ(false);
        }
        
      } catch (error) {
        console.error(`Error loading MCQ for step ${stepIndex + 1}:`, error);
        // Set null for failed MCQ so we know it failed
        setAllMCQs(prev => {
          const updated = [...prev];
          updated[stepIndex] = null;
          return updated;
        });
      }
    }
  };

  const loadMCQForCurrentStep = async (stepIndex: number, steps: PseudocodeStep[] = pseudocodeSteps) => {
    // This function is now mainly used for language changes
    if (stepIndex >= steps.length) return;

    setIsLoadingMCQ(true);
    setShowResult(false);
    setSelectedOption('');

    try {
      // Check if there's a next step to provide context about nesting
      const nextStep = stepIndex + 1 < steps.length ? steps[stepIndex + 1].text : null;
      
      const response = await apiCall('/api/generate-mcq', {
        method: 'POST',
        body: JSON.stringify({
          pseudocodeLine: steps[stepIndex].text,
          language: selectedLanguage,
          context: `This is step ${stepIndex + 1} of ${steps.length} in converting pseudocode to ${selectedLanguage} code.`,
          nextStep: nextStep,
          problemTitle: title,
          problemDescription: description
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const mcqData = await response.json();
      setCurrentMCQ(mcqData);
      
      // Also update the MCQ in the array
      setAllMCQs(prev => {
        const updated = [...prev];
        updated[stepIndex] = mcqData;
        return updated;
      });
    } catch (error) {
      console.error('Error loading MCQ:', error);
      Alert.alert('Error', 'Failed to load question. Please try again.');
    } finally {
      setIsLoadingMCQ(false);
    }
  };

  const handleOptionSelect = (optionId: string) => {
    if (showResult) return; // Prevent selection after showing result
    setSelectedOption(optionId);
  };

  const handleSubmit = () => {
    if (!selectedOption || !currentMCQ) return;

    const correct = currentMCQ.options.find(opt => opt.id === selectedOption)?.isCorrect || false;
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      // Update the current step as completed
      const updatedSteps = [...pseudocodeSteps];
      updatedSteps[currentStepIndex] = {
        ...updatedSteps[currentStepIndex],
        completed: true,
        selectedAnswer: selectedOption,
        correctAnswer: currentMCQ.options.find(opt => opt.isCorrect)?.id
      };
      setPseudocodeSteps(updatedSteps);

      // Check if this is the last step and immediately show loading
      const isLastStep = currentStepIndex === pseudocodeSteps.length - 1;
      if (isLastStep) {
        // Small delay to show the correct answer, then show loading
        setTimeout(() => {
          handleFinish();
        }, 800);
      }
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < pseudocodeSteps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      // No need to load MCQ - it's already preloaded or will be set by useEffect
      setShowResult(false);
      setSelectedOption('');
    }
  };

  const handleStepNavigation = (stepIndex: number) => {
    // Allow navigation to current step, previous steps, or completed steps
    if (stepIndex <= currentStepIndex || pseudocodeSteps[stepIndex]?.completed) {
      setCurrentStepIndex(stepIndex);
      setShowResult(false);
      setSelectedOption('');
    }
  };

  const handleRetry = () => {
    setShowResult(false);
    setSelectedOption('');
  };

  const handleFinish = async () => {
    const mcqAnswers = pseudocodeSteps.map((step, index) => ({
      step: step.text,
      selectedAnswer: step.selectedAnswer,
      correctAnswer: step.correctAnswer,
      completed: step.completed
    }));
    
    // Navigate to LoadingCodeSummary with all params
    router.push({
      pathname: '/screens/LoadingCodeSummary',
      params: {
        problemId: problemId,
        title: title,
        difficulty: difficulty,
        description: description,
        pseudocode: pseudocode,
        language: selectedLanguage,
        mcqAnswers: JSON.stringify(mcqAnswers),
        ...params // pass through any other params (e.g., from, topicName)
      }
    });
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    setShowLanguageDropdown(false);
    // Reload MCQ for current step with new language
    loadMCQForCurrentStep(currentStepIndex);
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'javascript': return 'JS';
      case 'python': return 'PY';
      case 'java': return 'Java';
      case 'c': return 'C';
      default: return lang.toUpperCase();
    }
  };

  const renderOptionText = (optionText: string, baseStyle: any) => {
    // Check if the text contains "(next pseudocode here)"
    if (optionText.includes('(next pseudocode here)')) {
      const parts = optionText.split('(next pseudocode here)');
      return (
        <ThemedText style={baseStyle}>
          {parts[0]}
          <ThemedText style={styles.nestedPseudocodeHint}>
            (next pseudocode here)
          </ThemedText>
          {parts[1]}
        </ThemedText>
      );
    }
    return (
      <ThemedText style={baseStyle}>
        {optionText}
      </ThemedText>
    );
  };

  const formatExplanationText = (text: string) => {
    // Split by sentences (periods followed by space or end of string)
    // and add line breaks for better readability
    const formattedText = text
      .split(/(\.[^\w]|\.$)/)
      .map((part, index) => {
        if (part.match(/(\.[^\w]|\.$)/)) {
          return part + '\n\n';
        }
        return part;
      })
      .join('')
      .trim();

    // Now handle text inside backticks and make it bold
    const parts = formattedText.split(/(`[^`]+`)/g);
    
    return (
      <ThemedText style={styles.explanationText}>
        {parts.map((part, index) => {
          // Check if this part is text inside backticks (e.g., `word`)
          if (part.match(/^`[^`]+`$/)) {
            const cleanWord = part.replace(/`/g, '');
            return (
              <ThemedText key={index} style={styles.boldText}>
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

  const formatCodeWithNestedPseudocode = (currentStep: string, nextStep?: string) => {
    if (!nextStep) return { mainCode: currentStep, hasNested: false };
    
    // Common nesting patterns
    const nestingKeywords = ['if', 'for', 'while', 'else', 'elseif', 'try', 'catch'];
    const currentLower = currentStep.toLowerCase();
    const nextLower = nextStep.toLowerCase();
    
    // Check if current step is a control structure and next step could be nested
    const isCurrentNesting = nestingKeywords.some(keyword => currentLower.includes(keyword));
    const isNextNested = nestingKeywords.some(keyword => nextLower.includes(keyword)) || 
                        nextLower.includes('return') || 
                        nextLower.includes('print') ||
                        nextLower.includes('assign') ||
                        nextLower.includes('set') ||
                        nextLower.includes('increment') ||
                        nextLower.includes('decrement');
    
    if (isCurrentNesting && isNextNested) {
      // Format the code to show nesting structure
      let formattedCode = currentStep;
      
      // Add opening brace if not present
      if (!formattedCode.includes('{')) {
        formattedCode += ' {';
      }
      
      return {
        mainCode: formattedCode,
        nestedCode: nextStep,
        hasNested: true
      };
    }
    
    return { mainCode: currentStep, hasNested: false };
  };

  const renderProblemDetails = () => (
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <ThemedText style={styles.modalTitle}>Problem Details</ThemedText>
        <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowProblemDetails(false)}
          >
            <ThemedText style={styles.closeButtonText}>✕</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'problem' && styles.activeTab]}
          onPress={() => setActiveTab('problem')}
        >
            <ThemedText style={[
              styles.tabButtonText,
              activeTab === 'problem' && styles.activeTabButtonText
            ]}>Problem</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'examples' && styles.activeTab]}
          onPress={() => setActiveTab('examples')}
        >
            <ThemedText style={[
              styles.tabButtonText,
              activeTab === 'examples' && styles.activeTabButtonText
            ]}>Examples</ThemedText>
        </TouchableOpacity>
      </View>

        <View style={styles.tabContent}>
        {activeTab === 'problem' ? (
            <ScrollView 
              style={styles.problemContent} 
              contentContainerStyle={styles.problemContentContainer}
              showsVerticalScrollIndicator={false}
            >
              <HtmlRenderer 
                htmlContent={description || 'No description available'} 
                style={styles.descriptionContainer}
              />
            </ScrollView>
          ) : (
            <View style={styles.examplesContent}>
              {examples.length > 0 ? (
                <View style={styles.exampleContainer}>
            <View style={styles.exampleNavigation}>
              <TouchableOpacity 
                      style={[styles.navButton, currentExampleIndex === 0 && styles.disabledNavButton]}
                onPress={() => setCurrentExampleIndex(prev => Math.max(0, prev - 1))}
                disabled={currentExampleIndex === 0}
              >
                      <ThemedText style={[styles.navButtonText, currentExampleIndex === 0 && styles.disabledNavText]}>‹</ThemedText>
              </TouchableOpacity>
              
                    <ThemedText style={styles.exampleCounter}>
                      Example {currentExampleIndex + 1} of {examples.length}
                    </ThemedText>

              <TouchableOpacity 
                      style={[styles.navButton, currentExampleIndex === examples.length - 1 && styles.disabledNavButton]}
                onPress={() => setCurrentExampleIndex(prev => Math.min(examples.length - 1, prev + 1))}
                disabled={currentExampleIndex === examples.length - 1}
              >
                      <ThemedText style={[styles.navButtonText, currentExampleIndex === examples.length - 1 && styles.disabledNavText]}>›</ThemedText>
              </TouchableOpacity>
            </View>

                  <ScrollView style={styles.exampleScrollContainer} showsVerticalScrollIndicator={false}>
                    <View style={styles.exampleDetails}>
                      <View style={styles.exampleField}>
                        <ThemedText style={styles.exampleLabel}>Input:</ThemedText>
                        <ThemedText style={styles.exampleValue}>{examples[currentExampleIndex]?.input || 'N/A'}</ThemedText>
                      </View>
                      <View style={styles.exampleField}>
                        <ThemedText style={styles.exampleLabel}>Output:</ThemedText>
                        <ThemedText style={styles.exampleValue}>{examples[currentExampleIndex]?.output || 'N/A'}</ThemedText>
                      </View>
                      <View style={styles.exampleField}>
                        <ThemedText style={styles.exampleLabel}>Explanation:</ThemedText>
                        <ThemedText style={styles.exampleValue}>{examples[currentExampleIndex]?.explanation || 'N/A'}</ThemedText>
                      </View>
                    </View>
                  </ScrollView>
                </View>
              ) : (
                <ThemedText style={styles.noExamplesText}>No examples available</ThemedText>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );

  // Calculate progress
  const completedSteps = pseudocodeSteps.filter(step => step.completed).length;
  const totalSteps = pseudocodeSteps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with title bubble (match question.tsx) */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[
            styles.headerTitleBubble,
            {
              backgroundColor: getDifficultyBubbleColor(difficulty),
              shadowColor: getDifficultyAccentColor(difficulty),
            },
          ]}>
            <View style={[styles.difficultyDot, { backgroundColor: getDifficultyAccentColor(difficulty) }]} />
            <ThemedText style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
              {title}
            </ThemedText>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Problem details modal */}
      {showProblemDetails && (
        <View style={styles.modalOverlay}>{renderProblemDetails()}</View>
      )}

      {/* Main content fills the rest of the screen */}
      <KeyboardAvoidingView
        style={{ flex: 1, flexDirection: 'column' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <ThemedText style={styles.progressText}>
                {completedSteps} / {totalSteps} steps completed
              </ThemedText>
            </View>
            {/* Pseudocode steps header with language selector */}
            <View style={styles.stepsHeaderContainer}>
              <ThemedText style={styles.stepsTitle}>Pseudocode Steps:</ThemedText>
              {/* Language dropdown */}
              <View style={styles.languageDropdownContainer}>
                <TouchableOpacity
                  style={styles.languageDropdownButton}
                  onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
                >
                  <ThemedText style={styles.languageDropdownText}>
                    {getLanguageLabel(selectedLanguage)}
                  </ThemedText>
                  <ThemedText style={[styles.dropdownArrow, showLanguageDropdown && styles.dropdownArrowUp]}>
                    ▼
                  </ThemedText>
                </TouchableOpacity>
                {showLanguageDropdown && (
                  <View style={styles.languageDropdownMenu}>
                    {[
                      { value: 'javascript', label: 'JS' },
                      { value: 'python', label: 'PY' },
                      { value: 'java', label: 'Java' },
                      { value: 'c', label: 'C' },
                    ].map((lang) => (
                      <TouchableOpacity
                        key={lang.value}
                        style={[
                          styles.languageDropdownItem,
                          selectedLanguage === lang.value && styles.selectedLanguageDropdownItem,
                        ]}
                        onPress={() => handleLanguageChange(lang.value)}
                      >
                        <ThemedText
                          style={[
                            styles.languageDropdownItemText,
                            selectedLanguage === lang.value && styles.selectedLanguageDropdownItemText,
                          ]}
                        >
                          {lang.label}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
            {/* Pseudocode steps grid */}
            <View style={styles.stepsGrid}>
              {pseudocodeSteps.map((step, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.stepCard,
                    index === currentStepIndex && styles.activeStepCard,
                    step.completed && styles.completedStepCard,
                  ]}
                  onPress={() => handleStepNavigation(index)}
                  disabled={index > currentStepIndex && !step.completed}
                >
                  <View style={styles.stepHeader}>
                    <ThemedText
                      style={[
                        styles.stepNumber,
                        index === currentStepIndex && styles.activeStepNumber,
                        step.completed && styles.completedStepNumber,
                      ]}
                    >
                      {index + 1}
                    </ThemedText>
                    {step.completed && (
                      <View style={styles.checkIcon}>
                        <ThemedText style={styles.checkIconText}>✓</ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText
                    style={[
                      styles.stepText,
                      index === currentStepIndex && styles.activeStepText,
                      step.completed && styles.completedStepText,
                    ]}
                    numberOfLines={3}
                  >
                    {step.text}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            {/* MCQ Section */}
            {!allStepsCompleted && (
              <View style={styles.mcqContainer}>
                <View style={styles.currentStepHighlight}>
                  {/* Show code with nested structure */}
                  {(() => {
                    const nextStep =
                      currentStepIndex + 1 < pseudocodeSteps.length
                        ? pseudocodeSteps[currentStepIndex + 1]?.text
                        : undefined;
                    const codeStructure = formatCodeWithNestedPseudocode(
                      pseudocodeSteps[currentStepIndex]?.text || '',
                      nextStep
                    );
                    if (codeStructure.hasNested) {
                      return (
                        <View style={styles.codeStructureContainer}>
                          <ThemedText style={styles.currentStepTitle}>
                            {codeStructure.mainCode}
                          </ThemedText>
                          <View style={styles.nestedCodeContainer}>
                            <ThemedText style={styles.nestedCodeText}>{codeStructure.nestedCode}</ThemedText>
                          </View>
                          <ThemedText style={styles.closingBrace}>{'}'}</ThemedText>
                        </View>
                      );
                    } else {
                      return (
                        <ThemedText style={styles.currentStepTitle}>
                          {codeStructure.mainCode}
                        </ThemedText>
                      );
                    }
                  })()}
                </View>
                {isLoadingMCQ || !currentMCQ ? (
                  <View style={styles.mcqLoadingContent}>
                    <ActivityIndicator size="large" color="#6564c7" />
                    <ThemedText style={styles.mcqLoadingText}>
                      {loadedMCQCount === 0
                        ? `Loading question MCQ ${currentStepIndex + 1}/${pseudocodeSteps.length}`
                        : `Loading questions... ${loadedMCQCount}/${pseudocodeSteps.length} ready`}
                    </ThemedText>
                  </View>
                ) : (
                  <View style={styles.mcqContent}>
                    <View style={styles.optionsContainer}>
                      {currentMCQ.options.map((option) => (
                        <TouchableOpacity
                          key={option.id}
                          style={[
                            styles.optionButton,
                            selectedOption === option.id && !showResult && styles.selectedOption,
                            showResult && isCorrect && option.isCorrect && styles.correctOption,
                            showResult && !isCorrect && selectedOption === option.id && styles.incorrectOption,
                          ]}
                          onPress={() => handleOptionSelect(option.id)}
                          disabled={showResult}
                        >
                          <View style={styles.optionContent}>
                            <View
                              style={[
                                styles.optionLetterBubble,
                                selectedOption === option.id && !showResult && styles.selectedOptionLetterBubble,
                                showResult && isCorrect && option.isCorrect && styles.correctOptionLetterBubble,
                                showResult && !isCorrect && selectedOption === option.id && styles.incorrectOptionLetterBubble,
                              ]}
                            >
                              <ThemedText
                                style={[
                                  styles.optionLetterText,
                                  selectedOption === option.id && !showResult && styles.selectedOptionLetterText,
                                  showResult && isCorrect && option.isCorrect && styles.correctOptionLetterText,
                                  showResult && !isCorrect && selectedOption === option.id && styles.incorrectOptionLetterText,
                                ]}
                              >
                                {option.id}
                              </ThemedText>
                            </View>
                            {renderOptionText(option.text, [
                              styles.optionText,
                              selectedOption === option.id && !showResult && styles.selectedOptionText,
                              showResult && isCorrect && option.isCorrect && styles.correctOptionText,
                              showResult && !isCorrect && selectedOption === option.id && styles.incorrectOptionText,
                            ])}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {showResult && (
                      <View style={styles.resultContainer}>
                        <View style={[styles.resultBox, isCorrect ? styles.correctResult : styles.incorrectResult]}>
                          <ThemedText style={styles.resultText}>
                            {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                          </ThemedText>
                          {formatExplanationText(
                            isCorrect
                              ? currentMCQ.explanation
                              : currentMCQ.optionExplanations?.[selectedOption] ||
                                `Option ${selectedOption} is incorrect. ${currentMCQ.explanation}`
                          )}
                        </View>
                      </View>
                    )}
                    <View style={styles.actionButtons}>
                      {!showResult ? (
                        <TouchableOpacity
                          style={[styles.submitButton, !selectedOption && styles.disabledSubmitButton]}
                          onPress={handleSubmit}
                          disabled={!selectedOption}
                        >
                          <ThemedText style={styles.submitButtonText}>Submit</ThemedText>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.resultActions}>
                          {isCorrect ? (
                            currentStepIndex < pseudocodeSteps.length - 1 ? (
                              <TouchableOpacity style={styles.nextButton} onPress={handleNextStep}>
                                <ThemedText style={styles.nextButtonText}>Next Step</ThemedText>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
                                <ThemedText style={styles.finishButtonText}>Complete!</ThemedText>
                              </TouchableOpacity>
                            )
                          ) : (
                            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                              <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // Header styles (copied from question.tsx)
  header: {
    backgroundColor: '#6564c7',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
    zIndex: 1,
  },
  backIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
    tintColor: '#fff',
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
  infoButton: {
    position: 'absolute',
    right: 14,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    zIndex: 1,
  },
  infoButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 60, // Same width as backButton to balance the layout
  },
  content: {
    flex: 1,
    padding: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e8e8e8',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6564c7',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  stepsHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  languageDropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  languageDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6564c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  languageDropdownText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownArrow: {
    color: '#fff',
    fontSize: 10,
  },
  dropdownArrowUp: {
    transform: [{ rotate: '180deg' }],
  },
  languageDropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
    minWidth: 80,
  },
  languageDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedLanguageDropdownItem: {
    backgroundColor: '#f8f7ff',
  },
  languageDropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedLanguageDropdownItemText: {
    color: '#6564c7',
    fontWeight: '600',
  },
  stepsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  stepCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 60,
  },
  activeStepCard: {
    borderColor: '#6564c7',
    backgroundColor: '#f8f7ff',
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  completedStepCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    width: 16,
    height: 16,
    textAlign: 'center',
    lineHeight: 16,
  },
  activeStepNumber: {
    backgroundColor: '#6564c7',
    color: '#fff',
  },
  completedStepNumber: {
    backgroundColor: '#4CAF50',
    color: '#fff',
  },
  checkIcon: {
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 10,
    color: '#666',
    lineHeight: 12,
  },
  activeStepText: {
    color: '#6564c7',
    fontWeight: '600',
  },
  completedStepText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  mcqContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flex: 1,
    minHeight: SCREEN_HEIGHT * 0.55,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  currentStepHighlight: {
    backgroundColor: '#6564c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  currentStepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  nestedPseudocodeContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  nestedPseudocodeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nestedPseudocodeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    fontStyle: 'italic',
    opacity: 0.9,
  },
  codeStructureContainer: {
    width: '100%',
  },
  nestedCodeContainer: {
    marginLeft: 20,
    marginTop: 8,
    marginBottom: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#FFD700',
  },
  nestedCodeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nestedCodeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    fontStyle: 'italic',
    opacity: 0.9,
  },
  closingBrace: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
  },
  nestedPseudocodeHint: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  mcqLoadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    minHeight: 200,
  },
  mcqLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  mcqContent: {
    gap: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  selectedOption: {
    borderColor: '#6564c7',
    backgroundColor: '#f8f7ff',
  },
  correctOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  incorrectOption: {
    borderColor: '#F44336',
    backgroundColor: '#fff8f8',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionLetterBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  selectedOptionLetterBubble: {
    backgroundColor: '#6564c7',
    borderColor: '#6564c7',
  },
  correctOptionLetterBubble: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  incorrectOptionLetterBubble: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  optionLetterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  selectedOptionLetterText: {
    color: '#fff',
  },
  correctOptionLetterText: {
    color: '#fff',
  },
  incorrectOptionLetterText: {
    color: '#fff',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  selectedOptionText: {
    color: '#6564c7',
    fontWeight: '600',
  },
  correctOptionText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  incorrectOptionText: {
    color: '#F44336',
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 8,
  },
  resultBox: {
    borderRadius: 12,
    padding: 16,
  },
  correctResult: {
    backgroundColor: '#f8fff8',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  incorrectResult: {
    backgroundColor: '#fff8f8',
    borderColor: '#F44336',
    borderWidth: 1,
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  boldText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '700',
    lineHeight: 20,
  },
  actionButtons: {
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#6564c7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  disabledSubmitButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultActions: {
    gap: 12,
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  finishButton: {
    backgroundColor: '#6564c7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  completionContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  completionMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    height: SCREEN_HEIGHT * 0.65,
    maxWidth: 400,
    width: '90%',
    borderWidth: 2,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalContent: {
    padding: 20,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#6564c7',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  activeTabButtonText: {
    color: '#fff',
  },
  tabContent: {
    flex: 1,
    marginTop: 8,
  },
  problemContent: {
    flex: 1,
  },
  exampleScrollContainer: {
    flex: 1,
  },
  problemContentContainer: {
    flexGrow: 1,
  },
  descriptionContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    minHeight: 300,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  examplesContent: {
    flex: 1,
  },
  exampleContainer: {
    flex: 1,
    padding: 10,
  },
  exampleNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  navButton: {
    backgroundColor: '#6564c7',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledNavButton: {
    backgroundColor: '#e0e0e0',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledNavText: {
    color: '#999',
  },
  exampleCounter: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  exampleDetails: {
    gap: 20,
    padding: 16,
  },
  exampleField: {
    gap: 4,
  },
  exampleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6564c7',
  },
  exampleValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  noExamplesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
}); 
 