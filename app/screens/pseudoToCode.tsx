import { HtmlRenderer } from '@/components/HtmlRenderer';
import { ThemedText } from '@/components/ThemedText';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { WebView } from 'react-native-webview';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Example {
  input: string;
  output: string;
  explanation: string;
  image?: string;
}

export default function PseudoToCode() {
  const params = useLocalSearchParams();
  const [showProblemDetails, setShowProblemDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'problem' | 'examples'>('problem');
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [isProblemPreloaded, setIsProblemPreloaded] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const webViewRef = React.useRef<WebView>(null);

  // Parse the passed parameters
  const problemId = params.problemId as string;
  const title = params.title as string;
  const difficulty = params.difficulty as string;
  const description = params.description as string;
  const examples: Example[] = params.examples ? JSON.parse(params.examples as string) : [];
  const constraints: string[] = params.constraints ? JSON.parse(params.constraints as string) : [];
  const pseudocode = params.pseudocode as string;

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
        return 'rgba(255, 255, 255, 0.25)'; // Slightly more opaque white for better contrast
      case 'Medium':
        return 'rgba(255, 255, 255, 0.25)'; // Consistent white background
      case 'Hard':
        return 'rgba(255, 255, 255, 0.25)'; // Consistent white background
      default:
        return 'rgba(255, 255, 255, 0.25)';
    }
  };

  const getDifficultyAccentColor = (diff: string) => {
    switch (diff) {
      case 'Easy': return '#009045';
      case 'Medium': return '#e68a00';
      case 'Hard': return '#e60026';
      default: return '#6564c7';
    }
  }; 

  const getMonacoLanguage = (language: string) => {
    switch (language) {
      case 'javascript': return 'javascript';
      case 'python': return 'python';
      case 'java': return 'java';
      case 'cpp': return 'cpp';
      default: return 'javascript';
    }
  };

  const getLanguageTemplate = (language: string) => {
    switch (language) {
      case 'javascript':
        return `function solve() {
    // Your code here
    
}

// Example usage:
// console.log(solve());`;
      case 'python':
        return `def solve():
    # Your code here
    pass

# Example usage:
# print(solve())`;
      case 'java':
        return `public class Solution {
    public void solve() {
        // Your code here
        
    }
}`;
      case 'cpp':
        return `#include <iostream>
#include <vector>
using namespace std;

class Solution {
public:
    void solve() {
        // Your code here
        
    }
};`;
      default:
        return '';
    }
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    setCode(getLanguageTemplate(language));
    // Force WebView to re-render only when language changes
    setWebViewKey(prev => prev + 1);
  };

  // Initialize code when component mounts
  React.useEffect(() => {
    if (!code) {
      setCode(getLanguageTemplate(selectedLanguage));
    }
  }, [selectedLanguage]);

  // Preload problem details to avoid loading when toggling
  React.useEffect(() => {
    // Set a small delay to ensure the main UI renders first
    const timer = setTimeout(() => {
      setIsProblemPreloaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    if (code.trim() === '' || code.trim() === getLanguageTemplate(selectedLanguage).trim()) {
      Alert.alert('Empty Code', 'Please write some code before submitting.');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate submission process
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Code Submitted!', 
        'Your code has been submitted successfully. This would typically run tests and provide feedback.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    }, 2000);
  };

  // Enhanced syntax highlighting for different languages
  const applySyntaxHighlighting = (text: string, language: string) => {
    // This is a simplified syntax highlighting - in a real app you'd use a proper library
    const keywords = {
      javascript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export'],
      python: ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except'],
      java: ['public', 'private', 'class', 'interface', 'if', 'else', 'for', 'while', 'return', 'import', 'package'],
      cpp: ['#include', 'using', 'namespace', 'class', 'public', 'private', 'if', 'else', 'for', 'while', 'return']
    };
    
    return text; // For now, return as-is. In a real implementation, you'd apply highlighting
  };

  const renderProblemDetails = () => (
    <View style={styles.section}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.toggleButton, { backgroundColor: activeTab === 'problem' ? '#6564c7' : '#c7c1e9' }]} 
          onPress={() => setActiveTab('problem')}
        >
          <ThemedText style={styles.toggleButtonText}>Problem</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleButton, { backgroundColor: activeTab === 'examples' ? '#6564c7' : '#c7c1e9' }]} 
          onPress={() => setActiveTab('examples')}
        >
          <ThemedText style={styles.toggleButtonText}>Example</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.descriptionContainer}>
        {activeTab === 'problem' ? (
          <HtmlRenderer 
            htmlContent={description || 'No description available'} 
            style={styles.webviewContainer}
          />
        ) : (
          <>
            <ScrollView 
              style={styles.exampleScrollView} 
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.exampleContentFormatted}>
                <View style={styles.exampleFieldContainer}>
                  <View style={styles.exampleLabelRowContainer}>
                    <View style={styles.exampleLabelContainer}>
                      <ThemedText style={styles.exampleLabelFormatted}>Input:</ThemedText>
                    </View>
                    {examples[currentExampleIndex]?.image && (
                      <TouchableOpacity 
                        style={styles.imageIndicator}
                        activeOpacity={0.7}
                      >
                        <View style={styles.imageIconPlaceholder}>
                          <ThemedText style={styles.imageIconText}>📷</ThemedText>
                        </View>
                        <ThemedText style={styles.imageIndicatorText}>Image present</ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.exampleValueContainer}>
                    <ThemedText style={styles.exampleTextFormatted}>
                      {examples[currentExampleIndex]?.input || 'No input available'}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.exampleFieldContainer}>
                  <View style={styles.exampleLabelContainer}>
                    <ThemedText style={styles.exampleLabelFormatted}>Output:</ThemedText>
                  </View>
                  <View style={styles.exampleValueContainer}>
                    <ThemedText style={styles.exampleTextFormatted}>
                      {examples[currentExampleIndex]?.output || 'No output available'}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.exampleFieldContainer}>
                  <View style={styles.exampleLabelContainer}>
                    <ThemedText style={styles.exampleLabelFormatted}>Explanation:</ThemedText>
                  </View>
                  <View style={styles.exampleValueContainer}>
                    <ThemedText style={styles.exampleTextFormatted}>
                      {examples[currentExampleIndex]?.explanation || 'No explanation available'}
                    </ThemedText>
                  </View>
                </View>

                {examples[currentExampleIndex]?.image && (
                  <View style={styles.exampleFieldContainer}>
                    <View style={styles.exampleLabelContainer}>
                      <ThemedText style={styles.exampleLabelFormatted}>Image:</ThemedText>
                    </View>
                    <View style={styles.exampleValueContainer}>
                      <View style={styles.exampleImageContainerFormatted}>
                        <Image 
                          source={{ uri: examples[currentExampleIndex].image }}
                          style={styles.exampleImageFormatted}
                          resizeMode="contain"
                        />
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
            
            <View style={styles.exampleNavigation}>
              <TouchableOpacity 
                style={[styles.navArrowButton, currentExampleIndex === 0 && styles.disabledNavButton]}
                onPress={() => setCurrentExampleIndex(prev => Math.max(0, prev - 1))}
                disabled={currentExampleIndex === 0}
              >
                <ThemedText style={[styles.navArrowText, currentExampleIndex === 0 && styles.disabledNavText]}>‹</ThemedText>
              </TouchableOpacity>
              
              <View style={styles.exampleIndicatorsContainer}>
                {examples.map((_, index) => (
                  <TouchableOpacity 
                    key={index}
                    onPress={() => setCurrentExampleIndex(index)}
                    style={[
                      styles.exampleIndicatorButton,
                      currentExampleIndex === index && styles.activeExampleIndicatorButton
                    ]}
                  >
                    <ThemedText style={[
                      styles.exampleIndicatorNumber,
                      currentExampleIndex === index && styles.activeExampleIndicatorNumber
                    ]}>
                      {index + 1}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.navArrowButton, currentExampleIndex === examples.length - 1 && styles.disabledNavButton]}
                onPress={() => setCurrentExampleIndex(prev => Math.min(examples.length - 1, prev + 1))}
                disabled={currentExampleIndex === examples.length - 1}
              >
                <ThemedText style={[styles.navArrowText, currentExampleIndex === examples.length - 1 && styles.disabledNavText]}>›</ThemedText>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );

  const getCodeMirrorMode = (language: string) => {
    switch (language) {
      case 'javascript': return 'javascript';
      case 'python': return 'python';
      case 'java': return 'text/x-java';
      case 'cpp': return 'text/x-c++src';
      default: return 'javascript';
    }
  };

  // Memoize the HTML to prevent re-rendering during typing
  const stableHTML = React.useMemo(() => {
    const mode = getCodeMirrorMode(selectedLanguage);
    const initialCode = getLanguageTemplate(selectedLanguage);
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/monokai.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/python/python.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/clike/clike.min.js"></script>
    <style>
        * {
            -webkit-touch-callout: none;
            -webkit-user-select: text;
            -webkit-tap-highlight-color: transparent;
        }
        body {
            margin: 0;
            padding: 0;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            background: #1E1E1E;
            overflow: hidden;
            -webkit-overflow-scrolling: touch;
        }
        .CodeMirror {
            height: 100vh;
            font-size: 14px;
            line-height: 1.5;
            background: #1E1E1E;
            border: none;
            outline: none;
        }
        .CodeMirror-focused {
            outline: none;
        }
        .CodeMirror-gutters {
            background: #252526;
            border-right: 1px solid #3E3E42;
        }
        .CodeMirror-linenumber {
            color: #858585;
            padding: 0 8px;
        }
        .CodeMirror-cursor {
            border-left: 1px solid #fff;
        }
    </style>
</head>
<body>
    <textarea id="code-editor">${initialCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
    <script>
        // Prevent context menu and other mobile behaviors
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });
        
        document.addEventListener('selectstart', function(e) {
            if (e.target.tagName === 'TEXTAREA' || e.target.closest('.CodeMirror')) {
                return true;
            }
            e.preventDefault();
            return false;
        });

        const editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
            mode: '${mode}',
            theme: 'monokai',
            lineNumbers: true,
            indentUnit: 2,
            tabSize: 2,
            autoCloseBrackets: true,
            matchBrackets: true,
            lineWrapping: false,
            styleActiveLine: true,
            foldGutter: true,
            gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
            extraKeys: {
                'Ctrl-Space': 'autocomplete'
            }
        });

        editor.on('change', function(instance, changeObj) {
            const content = instance.getValue();
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'code-change',
                content: content
            }));
        });
        
        // Focus the editor after a short delay to ensure proper initialization
        setTimeout(() => {
            editor.focus();
        }, 100);
    </script>
</body>
</html>`;
  }, [selectedLanguage]); // Only re-generate when language changes

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={[
            styles.headerTitleBubble, 
            { 
              backgroundColor: getDifficultyBubbleColor(difficulty || 'Easy'),
              shadowColor: getDifficultyAccentColor(difficulty || 'Easy'),
            }
          ]}>
            <View style={[styles.difficultyDot, { backgroundColor: getDifficultyAccentColor(difficulty || 'Easy') }]} />
            <ThemedText style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
              {title}
            </ThemedText>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.problemToggleButton,
            showProblemDetails && styles.problemToggleButtonActive
          ]}
          onPress={() => setShowProblemDetails(!showProblemDetails)}
        >
          <ThemedText style={[
            styles.problemToggleLabel,
            showProblemDetails && styles.problemToggleLabelActive
          ]}>
            {showProblemDetails ? 'Hide' : 'Show'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Problem Details (Collapsible) */}
        {showProblemDetails && renderProblemDetails()}

        {/* Hidden preloaded problem details to avoid loading delay */}
        {!showProblemDetails && isProblemPreloaded && (
          <View style={styles.hiddenPreloader}>
            {renderProblemDetails()}
          </View>
        )}

        {/* Main Content - Vertical Layout */}
        <View style={styles.mainContent}>
          {/* Pseudocode Reference - Dynamic height */}
          <View style={styles.pseudocodeContainer}>
            <View style={styles.pseudocodeHeader}>
              <ThemedText style={styles.pseudocodeTitle}>Your Pseudocode</ThemedText>
            </View>
            <View style={styles.pseudocodeContent}>
              {pseudocode && pseudocode.trim() ? (
                pseudocode.split('\n').filter(line => line.trim()).map((line, index) => {
                  // Remove leading numbers and dots/periods from pseudocode lines
                  const cleanedLine = line.trim().replace(/^\d+[\.\)\-\s]*/, '');
                  return (
                    <View key={index} style={styles.pseudocodeCard}>
                      <View style={styles.pseudocodeNumberBubble}>
                        <ThemedText style={styles.pseudocodeNumber}>{index + 1}</ThemedText>
                      </View>
                      <ThemedText style={styles.pseudocodeLineText}>
                        {cleanedLine}
                      </ThemedText>
                    </View>
                  );
                })
              ) : (
                <View style={styles.noPseudocodeContainer}>
                  <ThemedText style={styles.noPseudocodeText}>No pseudocode available</ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Code Editor - Fixed height */}
          <View style={styles.codeEditorContainer}>
            <View style={styles.codeEditorHeader}>
              <ThemedText style={styles.codeEditorTitle}>Code Editor</ThemedText>
              <View style={styles.languageSelector}>
                {['javascript', 'python', 'java', 'cpp'].map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[
                      styles.languageButton,
                      selectedLanguage === lang && styles.selectedLanguageButton
                    ]}
                    onPress={() => handleLanguageChange(lang)}
                  >
                    <ThemedText style={[
                      styles.languageButtonText,
                      selectedLanguage === lang && styles.selectedLanguageButtonText
                    ]}>
                      {lang === 'javascript' ? 'JS' : lang === 'python' ? 'PY' : lang === 'cpp' ? 'C++' : 'JAVA'}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.codeInputContainer}>
              <WebView
                ref={webViewRef}
                key={webViewKey}
                style={styles.codeEditor}
                source={{ html: stableHTML }}
                setSupportMultipleWindows={false}
                onShouldStartLoadWithRequest={() => true}
                onMessage={(event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.type === 'code-change') {
                      setCode(data.content);
                    }
                  } catch (error) {
                    console.error('Error parsing WebView message:', error);
                  }
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={false}
                scalesPageToFit={false}
                scrollEnabled={false}
                nestedScrollEnabled={false}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
                keyboardDisplayRequiresUserAction={false}
                hideKeyboardAccessoryView={true}
                allowsInlineMediaPlayback={false}
                mediaPlaybackRequiresUserAction={true}
                allowsBackForwardNavigationGestures={false}
                decelerationRate="normal"
                automaticallyAdjustContentInsets={false}
                contentInset={{ top: 0, left: 0, bottom: 0, right: 0 }}
                contentInsetAdjustmentBehavior="never"
                onLoad={() => {
                  // WebView is loaded and ready
                }}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submittingButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <View style={styles.submittingContent}>
                <ActivityIndicator size="small" color="#fff" />
                <ThemedText style={styles.submitButtonText}>Submitting...</ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.submitButtonText}>Submit Code</ThemedText>
            )}
          </TouchableOpacity>
        </View>
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
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80, // Increased to match toggle button area
    justifyContent: 'flex-start',
  },
  backIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
    tintColor: '#fff',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10, // Add margin to ensure proper centering
  },
  headerTitleBubble: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    minWidth: '60%',
    maxWidth: '85%',
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flexShrink: 1,
  },
  problemToggleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    width: 80, // Fixed width to match back button area
    alignItems: 'center',
    justifyContent: 'center',
  },
  problemToggleButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)', // More opaque when active
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  problemToggleIcon: {
    width: 20,
    height: 20,
    tintColor: 'rgba(255, 255, 255, 0.7)', // Semi-transparent when inactive
    marginLeft: 6,
  },
  problemToggleIconActive: {
    tintColor: '#fff', // Full white when active
  },
  problemToggleLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  problemToggleLabelActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  problemDetailsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  activeTab: {
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#6564c7',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#6564c7',
  },
  problemContent: {
    flex: 1,
    padding: 16,
  },
  descriptionContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
    height: 300,
  },
  htmlRenderer: {
    flex: 1,
  },
  constraintsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  constraintsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d2d2d',
    marginBottom: 8,
  },
  constraintText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  examplesContainer: {
    flex: 1,
  },
      exampleNavButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#6564c7',
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  exampleNavButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  exampleCounter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d2d2d',
  },
  exampleContent: {
    flex: 1,
  },
  exampleField: {
    marginBottom: 16,
  },
  exampleLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d2d2d',
    marginBottom: 4,
  },
  exampleValueBox: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  exampleValue: {
    fontSize: 13,
    color: '#444',
    fontFamily: 'monospace',
  },
  exampleImageContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  exampleImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  noExamplesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noExamplesText: {
    fontSize: 16,
    color: '#666',
  },
  mainContent: {
    padding: 16,
  },
  // Pseudocode Container - Dynamic height with modern design
  pseudocodeContainer: {
    backgroundColor: '#FAFAFA', // Light gray background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pseudocodeHeader: {
    backgroundColor: '#F5F5F5', // Light header
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  pseudocodeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D2D2D',
  },
  pseudocodeContent: {
    padding: 16,
  },
  pseudocodeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  pseudocodeNumberBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6564c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  pseudocodeNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pseudocodeLineText: {
    fontSize: 16,
    color: '#2D2D2D',
    lineHeight: 22,
    fontWeight: '500',
    flex: 1,
  },
  noPseudocodeContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPseudocodeText: {
    fontSize: 16,
    color: '#888',
    fontStyle: 'italic',
  },
  // Code Editor Container - Fixed height with VS Code theme
  codeEditorContainer: {
    height: 300, // Fixed height instead of percentage
    backgroundColor: '#1E1E1E', // VS Code dark background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3C3C3C',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  codeEditorHeader: {
    backgroundColor: '#2D2D30', // VS Code tab background
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeEditorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CCCCCC', // VS Code text color
  },
  languageSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  languageButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#3C3C3C',
    minWidth: 40,
    alignItems: 'center',
  },
  selectedLanguageButton: {
    backgroundColor: '#007ACC', // VS Code blue
  },
  languageButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CCCCCC',
  },
  selectedLanguageButtonText: {
    color: '#FFFFFF',
  },
  codeInputContainer: {
    flex: 1,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  submitButton: {
    backgroundColor: '#6564c7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 8,
  },
  submittingButton: {
    backgroundColor: '#9896d4',
  },
  submittingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 8,
    marginHorizontal: 16, // Add horizontal margin to match main content
    marginTop: 16, // Add top margin to push content below the fixed header
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
  webviewContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    padding: 16,
  },
  exampleScrollView: {
    flex: 1,
    padding: 16,
  },
  exampleContentFormatted: {
    flex: 1,
  },
  exampleFieldContainer: {
    marginBottom: 10,
  },
  exampleLabelRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  exampleLabelContainer: {
    marginBottom: 3,
    flex: 1,
  },
  exampleLabelFormatted: {
    fontWeight: '600',
    color: '#6564c7',
    fontSize: 15,
  },
  exampleValueContainer: {
    paddingLeft: 6,
  },
  exampleTextFormatted: {
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    fontFamily: 'SF Mono, Monaco, Inconsolata, Roboto Mono, monospace',
  },
  exampleImageContainerFormatted: {
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 6,
  },
  exampleImageFormatted: {
    width: '100%',
    maxWidth: 280,
    height: 160,
    borderRadius: 6,
  },
  imageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: '#e8e7ff',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#6564c7',
  },
  imageIconPlaceholder: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#6564c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  imageIconText: {
    fontSize: 10,
  },
  imageIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6564c7',
  },
  exampleNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 8,
  },
  navArrowButton: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: '#6564c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrowText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    paddingRight: "2%",
  },
  disabledNavButton: {
    backgroundColor: '#e0e0e0',
  },
  disabledNavText: {
    color: '#ccc',
  },
  exampleIndicatorsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  exampleIndicatorButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeExampleIndicatorButton: {
    backgroundColor: '#6564c7',
  },
  exampleIndicatorNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  activeExampleIndicatorNumber: {
    color: '#fff',
  },
  hiddenPreloader: {
    position: 'absolute',
    top: -10000, // Move far off-screen
    left: -10000,
    opacity: 0,
    pointerEvents: 'none',
  },
  editorLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    gap: 8,
  },
  editorLoadingText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
  },
  codeEditorWrapper: {
    flex: 1,
  },
  syntaxHighlighterContainer: {
    flex: 1,
  },
  syntaxHighlighter: {
    flex: 1,
  },
  lineNumbers: {
    width: 50,
    backgroundColor: '#252526',
    paddingTop: 16,
    paddingLeft: 8,
    borderBottomLeftRadius: 12,
  },
  lineNumber: {
    fontSize: 12,
    color: '#858585',
    fontFamily: 'SF Mono, Monaco, Inconsolata, Roboto Mono, monospace',
    lineHeight: 20,
    textAlign: 'right',
    paddingRight: 8,
  },
  codeScrollView: {
    flex: 1,
  },
  codeInput: {
    flex: 1,
    fontSize: 14,
    color: '#D4D4D4',
    fontFamily: 'SF Mono, Monaco, Inconsolata, Roboto Mono, monospace',
    lineHeight: 20,
    textAlignVertical: 'top',
    padding: 16,
    paddingLeft: 12,
    minHeight: 200,
    backgroundColor: '#1E1E1E',
  },
  codeEditor: {
    flex: 1,
  },
}); 