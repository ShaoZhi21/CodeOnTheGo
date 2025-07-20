import { HtmlRenderer } from '@/components/HtmlRenderer';
import { ThemedText } from '@/components/ThemedText';
import { API_BASE_URL } from '@/lib/api-config';
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
  TextInput,
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
  const [typedPseudocode, setTypedPseudocode] = useState('');

  // Parse the passed parameters
  const problemId = params.problemId as string;
  const title = params.title as string;
  const difficulty = params.difficulty as string;
  const description = params.description as string;
  const examples: Example[] = params.examples ? JSON.parse(params.examples as string) : [];
  const constraints: string[] = params.constraints ? JSON.parse(params.constraints as string) : [];
  const pseudocode = params.pseudocode as string;

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
  }, [pseudocodeSteps, hasNavigatedToSummary]);

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy': return '#00B8A3';
      case 'Medium': return '#FFA116';
      case 'Hard': return '#FF375F';
      default: return '#6564c7';
    }
  };

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
        
        const response = await fetch(`${API_BASE_URL}/api/generate-mcq`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      
      const response = await fetch(`${API_BASE_URL}/api/generate-mcq`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      {/* Header with title bubble */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)')}>
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
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => setShowProblemDetails(true)}
        >
          <ThemedText style={styles.infoButtonText}>i</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Problem details modal */}
      {showProblemDetails && (
        <View style={styles.modalOverlay}>{renderProblemDetails()}</View>
      )}

      {/* Main content and keyboard area split 0.5/0.5 */}
      <KeyboardAvoidingView
        style={{ flex: 1, flexDirection: 'column' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={{ flex: 0.5 }}>
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
        <View style={{ flex: 0.5, justifyContent: 'flex-end', backgroundColor: '#f0f0f0' }}>
          <TextInput
            style={{
              height: 48,
              margin: 16,
              borderColor: '#ccc',
              borderWidth: 1,
              borderRadius: 8,
              backgroundColor: 'white',
              paddingHorizontal: 12,
            }}
            placeholder="Type your pseudocode here..."
            value={typedPseudocode}
            onChangeText={setTypedPseudocode}
            multiline
            returnKeyType="done"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

 