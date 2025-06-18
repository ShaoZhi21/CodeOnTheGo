import { ProgressBar } from '@/components/ProgressBar';
import { ThemedText } from '@/components/ThemedText';
import React from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_MODAL_HEIGHT = SCREEN_HEIGHT * 0.50;

interface Analysis {
  lineByLineAnalysis: {
    lineNumber: number;
    status: string;
    explanation?: string;
  }[];
  correctness: string;
  efficiency: {
    time: string;
    space: string;
    anyMoreOptimal: string;
  };
  edgeCases: string[];
  trackAssessment: string;
  suggestions: string[];
  score: number;
  stars: number;
}

interface AnalysisModalProps {
  visible: boolean;
  onClose: () => void;
  analysis: Analysis | null;
  onTryForHigherScore?: () => void;
  onMarkComplete?: () => void;
  onWritePseudocode?: () => void;
  onRemark?: () => Promise<Analysis | null>;
}

export function AnalysisModal({ visible, onClose, analysis, onTryForHigherScore, onMarkComplete, onWritePseudocode, onRemark }: AnalysisModalProps) {
  const translateY = useSharedValue(MAX_MODAL_HEIGHT);
  const opacity = useSharedValue(0);
  const [selectedAnalysisSection, setSelectedAnalysisSection] = React.useState<'correctness' | 'efficiency' | 'edgeCases' | 'suggestions'>('correctness');
  const [isRemarking, setIsRemarking] = React.useState(false);
  const [remarkError, setRemarkError] = React.useState(false);

  const handleClose = () => {
    translateY.value = withSpring(MAX_MODAL_HEIGHT, {
      damping: 20,
      stiffness: 90,
    });
    opacity.value = withSpring(0, {
      damping: 20,
      stiffness: 90,
    }, () => {
      runOnJS(onClose)();
    });
  };

  const handleRemark = async () => {
    if (!onRemark || isRemarking) return;
    
    setIsRemarking(true);
    setRemarkError(false);
    
    try {
      const newAnalysis = await onRemark();
      if (newAnalysis) {
        // Analysis will be updated by parent component
        setIsRemarking(false);
      } else {
        setRemarkError(true);
        setIsRemarking(false);
      }
    } catch (error) {
      setRemarkError(true);
      setIsRemarking(false);
    }
  };

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
      });
      opacity.value = withSpring(1, {
        damping: 20,
        stiffness: 90,
      });
    }
  }, [visible]);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > MAX_MODAL_HEIGHT * 0.3) {
        translateY.value = withSpring(MAX_MODAL_HEIGHT, {
          damping: 20,
          stiffness: 90,
        });
        opacity.value = withSpring(0, {
          damping: 20,
          stiffness: 90,
        }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, {
          damping: 20,
          stiffness: 90,
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleSectionChange = (section: 'correctness' | 'efficiency' | 'edgeCases' | 'suggestions') => {
    setSelectedAnalysisSection(section);
  };

  if (!analysis) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.modalOverlay, overlayStyle]}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.modalContainer, animatedStyle, { height: MAX_MODAL_HEIGHT }]}>
            <View style={styles.dragHandle} />
            
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <ThemedText style={styles.title}>
                  {selectedAnalysisSection === 'correctness' && 'Correctness'}
                  {selectedAnalysisSection === 'efficiency' && 'Efficiency'}
                  {selectedAnalysisSection === 'edgeCases' && 'Edge Cases'}
                  {selectedAnalysisSection === 'suggestions' && 'Suggestions'}
                </ThemedText>
                <TouchableOpacity onPress={handleRemark} style={styles.remarkButton}>
                  <ThemedText style={styles.remarkText}>
                    {isRemarking ? 'Remarking...' : remarkError ? 'Error occurred, remark again' : 'Remark'}
                  </ThemedText>
                  {!isRemarking && (
                    <Image 
                      source={require('@/assets/images/icons/question-icon.png')}
                      style={styles.remarkIcon}
                    />
                  )}
                  {isRemarking && (
                    <ActivityIndicator size="small" color="#6564c7" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.analysisButtonContainer}>
              <TouchableOpacity 
                style={[
                  styles.analysisButton, 
                  selectedAnalysisSection === 'correctness' && styles.selectedAnalysisButton,
                  analysis.correctness === '✓' && styles.correctButton,
                  analysis.correctness === '✗' && styles.wrongButton
                ]} 
                onPress={() => handleSectionChange('correctness')}
              >
                <Image 
                  source={
                    analysis.correctness === '✓' 
                      ? require('@/assets/images/icons/correct-icon.png')
                      : require('@/assets/images/icons/wrong-icon.png')
                  } 
                  style={styles.correctnessIcon}
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.analysisButton, selectedAnalysisSection === 'efficiency' && styles.selectedAnalysisButton]} 
                onPress={() => handleSectionChange('efficiency')}
              >
                <Image 
                  source={require('@/assets/images/icons/efficient-icon.png')}
                  style={[styles.analysisIcon, { marginBottom: 4 }]}
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.analysisButton, selectedAnalysisSection === 'edgeCases' && styles.selectedAnalysisButton]} 
                onPress={() => handleSectionChange('edgeCases')}
              >
                <Image 
                  source={require('@/assets/images/icons/checklist-icon.png')}
                  style={[styles.analysisIcon, { marginBottom: 4 }, { marginLeft: 4 }]}
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.analysisButton, selectedAnalysisSection === 'suggestions' && styles.selectedAnalysisButton]} 
                onPress={() => handleSectionChange('suggestions')}
              >
                <Image 
                  source={require('@/assets/images/icons/suggestion-icon.png')}
                  style={[styles.analysisIcon, { marginBottom: 6 }]}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.contentScrollView} showsVerticalScrollIndicator={false}>
              {selectedAnalysisSection === 'correctness' && (
                <>
                  <View style={[styles.analysisContainer, isRemarking && styles.loadingAnalysisContainer]}>
                    <View style={styles.analysisContent}>
                      <View style={styles.analysisSection}>
                        {isRemarking ? (
                          <View style={styles.correctnessLoadingContainer}>
                            <ActivityIndicator size="large" color="#6564c7" />
                            <ThemedText style={styles.loadingText}>Remarking...</ThemedText>
                          </View>
                        ) : (
                          <View style={styles.correctnessContainer}>
                            <View style={styles.scoreContainer}>
                              <ThemedText style={styles.scoreLabel}>Score: </ThemedText>
                              <ThemedText style={styles.scoreText}>{analysis.score || 0}</ThemedText>
                              <ThemedText style={styles.scoreLabel}>/100</ThemedText>
                            </View>
                            <ProgressBar score={analysis.score} compact={true} />
                            <View style={styles.starsContainer}>
                              {[...Array(5)].map((_, index) => (
                                <Image
                                  key={index}
                                  source={
                                    index < analysis.stars
                                      ? require('@/assets/images/icons/star-icon.png')
                                      : require('@/assets/images/icons/empty-star.png')
                                  }
                                  style={styles.largeStarIcon}
                                />
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  {!isRemarking && analysis.stars <= 2 && (
                    <View style={styles.navigationButtonRow}>
                      <TouchableOpacity style={styles.tryAgainButton} onPress={handleClose}>
                        <ThemedText style={styles.tryAgainButtonText}>Try Again</ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}
                  {!isRemarking && analysis.stars >= 3 && (
                    <View style={styles.navigationButtonRow}>
                      <TouchableOpacity 
                        style={styles.codeButton} 
                        onPress={() => {
                          if (onWritePseudocode) {
                            onWritePseudocode();
                          }
                          handleClose();
                        }}
                      >
                        <ThemedText style={styles.codeButtonText}>CODE</ThemedText>
                        <Image 
                          source={require('@/assets/images/icons/code-icon.png')}
                          style={styles.codeButtonIcon}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.completeButton} 
                        onPress={() => {
                          if (onMarkComplete) {
                            onMarkComplete();
                          }
                          handleClose();
                        }}
                      >
                        <Image 
                          source={require('@/assets/images/icons/complete-icon.png')}
                          style={styles.iconOnlyButton}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.retryButton} 
                        onPress={handleClose}
                      >
                        <Image 
                          source={require('@/assets/images/icons/retry-icon.png')}
                          style={[styles.iconOnlyButton, { tintColor: '#FF375F' }]}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {selectedAnalysisSection === 'efficiency' && (
                <View style={styles.analysisSection}>
                  <View style={styles.efficiencyContainer}>
                    {isRemarking ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6564c7" />
                        <ThemedText style={styles.loadingText}>Remarking...</ThemedText>
                      </View>
                    ) : (
                      analysis.efficiency && (analysis.efficiency.time || analysis.efficiency.space || analysis.efficiency.anyMoreOptimal) ? (
                        <>
                          <View style={styles.efficiencyCard}>
                            <View style={styles.cardIcon}>
                              <ThemedText style={styles.iconEmoji}>⏱️</ThemedText>
                            </View>
                            <View style={styles.cardContent}>
                              <ThemedText style={styles.cardLabel}>Time Complexity</ThemedText>
                              <ThemedText style={styles.cardValue}>{analysis.efficiency.time}</ThemedText>
                            </View>
                          </View>
                          
                          <View style={styles.efficiencyCard}>
                            <View style={styles.cardIcon}>
                              <ThemedText style={styles.iconEmoji}>💾</ThemedText>
                            </View>
                            <View style={styles.cardContent}>
                              <ThemedText style={styles.cardLabel}>Space Complexity</ThemedText>
                              <ThemedText style={styles.cardValue}>{analysis.efficiency.space}</ThemedText>
                            </View>
                          </View>
                          
                          <View style={styles.efficiencyCard}>
                            <View style={styles.cardIcon}>
                              <ThemedText style={styles.iconEmoji}>🚀</ThemedText>
                            </View>
                            <View style={styles.cardContent}>
                              <ThemedText style={styles.cardLabel}>Can be optimized?</ThemedText>
                              <ThemedText style={[
                                styles.cardValue, 
                                analysis.efficiency.anyMoreOptimal.toLowerCase().includes('yes') || analysis.efficiency.anyMoreOptimal.toLowerCase().includes('can') 
                                  ? styles.optimizableText 
                                  : styles.optimalText
                              ]}>
                                {analysis.efficiency.anyMoreOptimal}
                              </ThemedText>
                            </View>
                          </View>
                        </>
                      ) : (
                        <View style={styles.noDataCard}>
                          <ThemedText style={styles.noDataText}>No Efficiency</ThemedText>
                          <ThemedText style={styles.noDataSubtext}>Efficiency analysis not available</ThemedText>
                        </View>
                      )
                    )}
                  </View>
                </View>
              )}

              {selectedAnalysisSection === 'edgeCases' && (
                <View style={styles.analysisSection}>
                  <View style={styles.edgeCasesContainer}>
                    {isRemarking ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6564c7" />
                        <ThemedText style={styles.loadingText}>Remarking...</ThemedText>
                      </View>
                    ) : (
                      analysis.edgeCases && analysis.edgeCases.length > 0 ? (
                        analysis.edgeCases.map((edgeCase: string, index: number) => (
                          <View key={index} style={styles.edgeCaseCard}>
                            <View style={styles.edgeCaseIcon}>
                              <ThemedText style={styles.edgeCaseNumber}>{index + 1}</ThemedText>
                            </View>
                            <View style={styles.edgeCaseContent}>
                              <ThemedText style={styles.edgeCaseLabel}>Test Case {index + 1}</ThemedText>
                              <ThemedText style={styles.edgeCaseText}>{edgeCase}</ThemedText>
                            </View>
                          </View>
                        ))
                      ) : (
                        <View style={styles.noDataCard}>
                          <ThemedText style={styles.noDataText}>No Edge Cases</ThemedText>
                          <ThemedText style={styles.noDataSubtext}>Edge cases analysis not available</ThemedText>
                        </View>
                      )
                    )}
                  </View>
                </View>
              )}

              {selectedAnalysisSection === 'suggestions' && (
                <View style={styles.analysisSection}>
                  <View style={styles.suggestionsContainer}>
                    {isRemarking ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6564c7" />
                        <ThemedText style={styles.loadingText}>Remarking...</ThemedText>
                      </View>
                    ) : (
                      analysis.suggestions && analysis.suggestions.length > 0 ? (
                        analysis.suggestions.map((suggestion: string, index: number) => (
                          <View key={index} style={styles.suggestionCard}>
                            <View style={styles.suggestionIcon}>
                              <ThemedText style={styles.suggestionEmoji}>💡</ThemedText>
                            </View>
                            <View style={styles.suggestionContent}>
                              <ThemedText style={styles.suggestionLabel}>Tip {index + 1}</ThemedText>
                              <ThemedText style={styles.suggestionText}>{suggestion}</ThemedText>
                            </View>
                          </View>
                        ))
                      ) : (
                        <View style={styles.noDataCard}>
                          <ThemedText style={styles.noDataText}>No Suggestions</ThemedText>
                          <ThemedText style={styles.noDataSubtext}>Suggestions not available</ThemedText>
                        </View>
                      )
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F4EEFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 16,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 6,
    opacity: 1,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  header: {
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d2d2d',
  },
  remarkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#6564c7',
    borderRadius: 8,
    backgroundColor: 'rgba(101, 100, 199, 0.1)',
  },
  remarkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6564c7',
  },
  remarkIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  analysisButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 6,
  },
  analysisButton: {
    flex: 1,
    padding: 10,
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
  analysisContainer: {
    flex: 1,
    minHeight: SCREEN_HEIGHT * 0.21,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    paddingBottom: 5,
  },
  loadingAnalysisContainer: {
    height: SCREEN_HEIGHT * 0.28,
  },
  analysisContent: {
    flex: 1,
  },
  analysisSection: {
    flex: 1,
  },
  analysisText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    marginBottom: 8,
  },
  correctnessContainer: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
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
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '80%',
  },
  largeStarIcon: {
    width: 40,
    height: 40,
  },
  efficiencyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 4,
    paddingTop: 6,
    paddingBottom: 12,
  },
  efficiencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2d3436',
  },
  optimizableText: {
    color: '#f39c12',
  },
  optimalText: {
    color: '#27ae60',
  },
  iconEmoji: {
    fontSize: 20,
  },
  edgeCasesContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 4,
    paddingTop: 6,
    paddingBottom: 12,
  },
  edgeCaseCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  edgeCaseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
    marginTop: 2,
  },
  edgeCaseContent: {
    flex: 1,
  },
  edgeCaseLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  edgeCaseText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  edgeCaseNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  suggestionsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 4,
    paddingTop: 6,
    paddingBottom: 12,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 12,
    shadowColor: '#f59e0b',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  suggestionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#92400e',
    fontWeight: '500',
  },
  suggestionEmoji: {
    fontSize: 22,
  },
  contentScrollView: {
    flex: 1,
  },
  tryAgainButton: {
    backgroundColor: '#6564c7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  tryAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  navigationButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 16,
    maxWidth: '100%',
  },
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#6564c7',
    width: '50%',
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  codeButtonIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  codeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  retryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#c7c1e9',
    borderWidth: 3,
    borderColor: '#FF375F',
    width: '15%',
  },
  completeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#b8b5e8',
    borderWidth: 3,
    borderColor: '#4CAF50',
    width: '35%',
  },
  iconOnlyButton: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  noDataCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d2d2d',
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 65,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6564c7',
    marginTop: 16,
  },
  correctnessLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
}); 