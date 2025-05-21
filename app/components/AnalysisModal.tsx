import { ThemedText } from '@/components/ThemedText';
import React from 'react';
import { Dimensions, Image, LayoutChangeEvent, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_MODAL_HEIGHT = SCREEN_HEIGHT * 0.75;
const MIN_MODAL_HEIGHT = SCREEN_HEIGHT * 0.50;

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

interface AnalysisModalProps {
  visible: boolean;
  onClose: () => void;
  analysis: Analysis | null;
}

export function AnalysisModal({ visible, onClose, analysis }: AnalysisModalProps) {
  const translateY = useSharedValue(MAX_MODAL_HEIGHT);
  const opacity = useSharedValue(0);
  const [modalHeight, setModalHeight] = React.useState(MAX_MODAL_HEIGHT);
  const [selectedAnalysisSection, setSelectedAnalysisSection] = React.useState<'correctness' | 'efficiency' | 'edgeCases' | 'suggestions'>('correctness');
  const contentHeights = React.useRef({
    correctness: 0,
    efficiency: 0,
    edgeCases: 0,
    suggestions: 0
  });

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
      if (event.translationY > modalHeight * 0.3) {
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

  const handleContentLayout = (event: LayoutChangeEvent, section: 'correctness' | 'efficiency' | 'edgeCases' | 'suggestions') => {
    const { height } = event.nativeEvent.layout;
    contentHeights.current[section] = height;
    
    // Calculate new height based on current section
    const currentSectionHeight = contentHeights.current[selectedAnalysisSection];
    const newHeight = Math.min(Math.max(currentSectionHeight + 200, MIN_MODAL_HEIGHT), MAX_MODAL_HEIGHT);
    setModalHeight(newHeight);
  };

  const handleSectionChange = (section: 'correctness' | 'efficiency' | 'edgeCases' | 'suggestions') => {
    setSelectedAnalysisSection(section);
    // Update height when section changes
    const sectionHeight = contentHeights.current[section];
    const newHeight = Math.min(Math.max(sectionHeight + 200, MIN_MODAL_HEIGHT), MAX_MODAL_HEIGHT);
    setModalHeight(newHeight);
  };

  if (!analysis) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[styles.modalOverlay, overlayStyle]}>
          <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.modalContainer, animatedStyle, { height: modalHeight }]}>
              <View style={styles.dragHandle} />
              
              <View style={styles.header}>
                <View style={styles.headerContent}>
                  <ThemedText style={styles.title}>Analysis</ThemedText>
                  <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <Image 
                      source={require('@/assets/images/icons/wrong-icon.png')}
                      style={styles.closeIcon}
                    />
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

              <View style={styles.analysisContainer}>
                <View style={styles.analysisContent}>
                  {selectedAnalysisSection === 'correctness' && (
                    <View style={styles.analysisSection} onLayout={(e) => handleContentLayout(e, 'correctness')}>
                      <View style={styles.correctnessContainer}>
                        <View style={styles.scoreContainer}>
                          <ThemedText style={styles.scoreText}>{analysis.score}</ThemedText>
                          <ThemedText style={styles.scoreLabel}>/100</ThemedText>
                        </View>
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
                    </View>
                  )}

                  {selectedAnalysisSection === 'efficiency' && (
                    <View style={styles.analysisSection} onLayout={(e) => handleContentLayout(e, 'efficiency')}>
                      <ThemedText style={styles.analysisSubtitle}>Efficiency</ThemedText>
                      <ThemedText style={styles.analysisText}>Time: {analysis.efficiency.time}</ThemedText>
                      <ThemedText style={styles.analysisText}>Space: {analysis.efficiency.space}</ThemedText>
                      <ThemedText style={styles.analysisText}>More Optimal: {analysis.efficiency.anyMoreOptimal}</ThemedText>
                    </View>
                  )}

                  {selectedAnalysisSection === 'edgeCases' && (
                    <View style={styles.analysisSection} onLayout={(e) => handleContentLayout(e, 'edgeCases')}>
                      <ThemedText style={styles.analysisSubtitle}>Edge Cases</ThemedText>
                      {analysis.edgeCases.map((edgeCase: string, index: number) => (
                        <ThemedText key={index} style={styles.analysisText}>{edgeCase}</ThemedText>
                      ))}
                    </View>
                  )}

                  {selectedAnalysisSection === 'suggestions' && (
                    <View style={styles.analysisSection} onLayout={(e) => handleContentLayout(e, 'suggestions')}>
                      <ThemedText style={styles.analysisSubtitle}>Suggestions</ThemedText>
                      {analysis.suggestions.map((suggestion: string, index: number) => (
                        <ThemedText key={index} style={styles.analysisText}>{suggestion}</ThemedText>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </GestureHandlerRootView>
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
    padding: 16,
    opacity: 1,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d2d2d',
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    width: 20,
    height: 20,
    tintColor: '#666',
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
  analysisContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
  },
  analysisContent: {
    flex: 1,
  },
  analysisSection: {
    flex: 1,
  },
  analysisSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d2d2d',
    marginBottom: 12,
  },
  analysisText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    marginBottom: 8,
  },
  correctnessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
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
    gap: 8,
  },
  largeStarIcon: {
    width: 40,
    height: 40,
  },
}); 