import DescriptionBox from '@/components/codeblocks/DescriptionBox';
import { ElseBlock } from '@/components/codeblocks/ElseBlock';
import { ElseIfBlock } from '@/components/codeblocks/ElseIfBlock';
import { ForBlock } from '@/components/codeblocks/ForBlock';
import { IfBlock } from '@/components/codeblocks/IfBlock';
import { WhileBlock } from '@/components/codeblocks/WhileBlock';
import { HtmlRenderer } from '@/components/HtmlRenderer';
import { ThemedText } from '@/components/ThemedText';
import { apiCall } from '@/lib/api-config';
import { createClient } from '@supabase/supabase-js';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnalysisModal } from '../components/AnalysisModal';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

interface Example {
  id?: number;
  input: string;
  output: string;
  explanation: string;
  image?: string;
}

interface Problem {
  id: number;
  leetcode_id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  examples: Example[];
  constraints: string[];
  hints: string[];
}

interface BoxBlock {
  type: 'text';
  value: string;
}
interface IfBlockType {
  type: 'if';
  condition: string;
  body: string;
}
interface ElseBlockType {
  type: 'else';
  body: string;
}
interface ElseIfBlockType {
  type: 'elseif';
  condition: string;
  body: string;
}
interface WhileBlockType {
  type: 'while';
  condition: string;
  body: string;
}
interface ForBlockType {
  type: 'for';
  condition: string;
  body: string;
}
type CodeBlock = BoxBlock | IfBlockType | ElseBlockType | ElseIfBlockType | WhileBlockType | ForBlockType;

export default function QuestionScreen() {
  const params = useLocalSearchParams();
  const { id, name, difficulty } = params;
  
  // Refs
  const exampleScrollViewRef = useRef<ScrollView>(null);
  
  // Dynamic data states
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parsedExamples, setParsedExamples] = useState<Example[]>([]);
  const [cleanedDescription, setCleanedDescription] = useState<string>('');
  
  // UI states
  const [showProblem, setShowProblem] = useState(true);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [solution, setSolution] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [selectedAnalysisSection, setSelectedAnalysisSection] = useState<'correctness' | 'efficiency' | 'edgeCases' | 'suggestions'>('correctness');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [descriptionBoxes, setDescriptionBoxes] = useState<CodeBlock[]>([{ type: 'text', value: '' }]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Function to parse examples from HTML content (improved)
  const parseExamplesFromHtmlSimple = (htmlContent: string): { examples: Example[], cleanedHtml: string } => {
    const examples: Example[] = [];
    let cleanedHtml = htmlContent;
    
    // Multiple regex patterns to handle different example formats
    const examplePatterns = [
      // Pattern 1: With class="example"
      /<p><strong[^>]*class="example"[^>]*>Example\s+\d+:<\/strong><\/p>([\s\S]*?)(?=<p><strong[^>]*class="example"[^>]*>Example\s+\d+:<\/strong><\/p>|<p>&nbsp;<\/p>|<p><strong[^>]*>Constraints:<\/strong><\/p>|$)/gi,
      
      // Pattern 2: Simple strong tag
      /<p><strong[^>]*>Example\s+\d+:<\/strong><\/p>([\s\S]*?)(?=<p><strong[^>]*>Example\s+\d+:<\/strong><\/p>|<p>&nbsp;<\/p>|<p><strong[^>]*>Constraints:<\/strong><\/p>|$)/gi,
      
      // Pattern 3: With class="example" but different structure
      /<strong[^>]*class="example"[^>]*>Example\s+\d+:<\/strong>([\s\S]*?)(?=<strong[^>]*class="example"[^>]*>Example\s+\d+:<\/strong>|<p>&nbsp;<\/p>|<p><strong[^>]*>Constraints:<\/strong><\/p>|$)/gi,
      
      // Pattern 4: Very simple format
      /<strong>Example\s+\d+:<\/strong>([\s\S]*?)(?=<strong>Example\s+\d+:<\/strong>|<strong>Constraints:<\/strong>|$)/gi,
    ];
    
    let exampleMatches: RegExpExecArray[] = [];
    
    // Try each pattern until we find examples
    for (const pattern of examplePatterns) {
      pattern.lastIndex = 0; // Reset regex
      let match;
      while ((match = pattern.exec(htmlContent)) !== null) {
        exampleMatches.push(match);
      }
      if (exampleMatches.length > 0) break;
    }
    
    // If still no matches, try a more general approach
    if (exampleMatches.length === 0) {
      const generalPattern = /Example\s+\d+:([\s\S]*?)(?=Example\s+\d+:|Constraints:|$)/gi;
      let match;
      while ((match = generalPattern.exec(htmlContent)) !== null) {
        exampleMatches.push(match);
      }
    }
    
    exampleMatches.forEach((match, index) => {
      const exampleContent = match[1];
      
      // Extract image if present
      const imgMatch = exampleContent.match(/<img[^>]*src=["']([^"']*)["'][^>]*>/i);
      const imageUrl = imgMatch ? imgMatch[1] : '';
      
      // Extract input, output, and explanation from pre blocks
      const preMatches = exampleContent.match(/<pre[^>]*>([\s\S]*?)<\/pre>/gi) || [];
      
      let input = '';
      let output = '';
      let explanation = '';
      
      // Try to parse from pre blocks first
      preMatches.forEach(preBlock => {
        const preContent = preBlock.replace(/<[^>]*>/g, '').trim();
        const lines = preContent.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          if (line.toLowerCase().includes('input:')) {
            input = line.replace(/^.*input:\s*/i, '').trim();
          } else if (line.toLowerCase().includes('output:')) {
            output = line.replace(/^.*output:\s*/i, '').trim();
          } else if (line.toLowerCase().includes('explanation:')) {
            explanation = line.replace(/^.*explanation:\s*/i, '').trim();
          }
        });
      });
      
      // If no structured pre blocks, try to extract from the content directly
      if (!input || !output) {
        // More flexible patterns for input/output extraction
        const inputPatterns = [
          /<strong>Input:<\/strong>\s*([^<\n]*)/i,
          /Input:\s*([^<\n]*)/i,
          /<strong>Input:<\/strong>\s*<code>([^<]*)<\/code>/i,
        ];
        
        const outputPatterns = [
          /<strong>Output:<\/strong>\s*([^<\n]*)/i,
          /Output:\s*([^<\n]*)/i,
          /<strong>Output:<\/strong>\s*<code>([^<]*)<\/code>/i,
        ];
        
        const explanationPatterns = [
          /<strong>Explanation:<\/strong>\s*([^<]*?)(?=<|$)/i,
          /Explanation:\s*([^<]*?)(?=<|$)/i,
        ];
        
        // Try input patterns
        for (const pattern of inputPatterns) {
          const match = exampleContent.match(pattern);
          if (match && match[1].trim()) {
            input = match[1].trim();
            break;
          }
        }
        
        // Try output patterns
        for (const pattern of outputPatterns) {
          const match = exampleContent.match(pattern);
          if (match && match[1].trim()) {
            output = match[1].trim();
            break;
          }
        }
        
        // Try explanation patterns
        for (const pattern of explanationPatterns) {
          const match = exampleContent.match(pattern);
          if (match && match[1].trim()) {
            explanation = match[1].trim();
            break;
          }
        }
      }
      
      // Clean up extracted text
      input = input.replace(/<[^>]*>/g, '').trim();
      output = output.replace(/<[^>]*>/g, '').trim();
      explanation = explanation.replace(/<[^>]*>/g, '').trim();
      
      examples.push({
        input: input || 'No input available',
        output: output || 'No output available',
        explanation: explanation || 'No explanation available',
        image: imageUrl
      });
      
      // Remove this example from the cleaned HTML
      cleanedHtml = cleanedHtml.replace(match[0], '');
    });
    
    // Clean up the HTML further
    cleanedHtml = cleanedHtml
      .replace(/<p>&nbsp;<\/p>/g, '') // Remove empty paragraphs
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    return {
      examples: examples.length > 0 ? examples : [],
      cleanedHtml: cleanedHtml
    };
  };

  // Fetch problem data from Supabase
  const fetchProblemData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('leetcode_problems')
        .select('id, leetcode_id, title, difficulty, description, examples, constraints, hints')
        .eq('leetcode_id', parseInt(id as string))
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Problem not found');
      }

      console.log('Raw description length:', data.description?.length);
      console.log('Description preview:', data.description?.substring(0, 200));

      // Parse examples from description HTML - prioritize this method
      const { examples: htmlExamples, cleanedHtml } = parseExamplesFromHtmlSimple(data.description || '');
      
      console.log('Parsed examples from HTML:', htmlExamples.length);
      console.log('Examples:', htmlExamples);
      console.log('Cleaned HTML length:', cleanedHtml.length);
      
      // Use parsed examples from HTML if available, otherwise fall back to stored examples
      let finalExamples: Example[] = [];
      
      // Always prioritize HTML-parsed examples
      if (htmlExamples.length > 0) {
        finalExamples = htmlExamples;
        console.log('✅ Using HTML-parsed examples');
      } else {
        console.log('⚠️ No examples found in HTML, checking Supabase examples...');
        if (data.examples) {
          try {
            finalExamples = Array.isArray(data.examples) ? data.examples : [];
            console.log('📦 Using Supabase examples:', finalExamples.length);
          } catch (e) {
            console.warn('Failed to parse stored examples:', e);
            finalExamples = [];
          }
        }
      }

      // Ensure we have at least one example (fallback)
      if (finalExamples.length === 0) {
        console.log('🔄 Using fallback example');
        finalExamples = [
          {
            input: "No example available",
            output: "No example available", 
            explanation: "No example available for this problem."
          }
        ];
      }

      setParsedExamples(finalExamples);
      setCleanedDescription(cleanedHtml || data.description || '');
      
      setProblem({
        ...data,
        examples: finalExamples,
        constraints: data.constraints || [],
        hints: data.hints || []
      });

    } catch (err) {
      console.error('Error fetching problem:', err);
      setError('Failed to load problem. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProblemData();
    }
  }, [id]);

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
      case 'Easy': return '#4CAF50';
      case 'Medium': return '#FF9800';
      case 'Hard': return '#F44336';
      default: return '#6564c7';
    }
  };

  const getLineAnalysisBorderStyle = (lineNumber: number) => {
    if (!analysis || !analysis.lineByLineAnalysis) {
      console.log(`No analysis data for line ${lineNumber}`);
      return {};
    }
    
    console.log(`Checking line ${lineNumber}, available analysis:`, analysis.lineByLineAnalysis);
    
    const lineAnalysis = analysis.lineByLineAnalysis.find(line => line.lineNumber === lineNumber);
    if (!lineAnalysis) {
      console.log(`No analysis found for line ${lineNumber}`);
      return {};
    }

    console.log(`Found analysis for line ${lineNumber}:`, lineAnalysis);

    switch (lineAnalysis.status) {
      case 'fully_correct':
        console.log(`Applying green border for line ${lineNumber}`);
        return {
          borderWidth: 3,
          borderColor: '#4CAF50', // Green
        };
      case 'can_be_improved':
        console.log(`Applying orange border for line ${lineNumber}`);
        return {
          borderWidth: 3,
          borderColor: '#FF9800', // Orange
        };
      case 'wrong':
        console.log(`Applying red border for line ${lineNumber}`);
        return {
          borderWidth: 3,
          borderColor: '#F44336', // Red
        };
      default:
        console.log(`Unknown status for line ${lineNumber}: ${lineAnalysis.status}`);
        return {};
    }
  };

  const getLineAnalysisExplanation = (lineNumber: number) => {
    if (!analysis || !analysis.lineByLineAnalysis) {
      return undefined;
    }
    
    const lineAnalysis = analysis.lineByLineAnalysis.find(line => line.lineNumber === lineNumber);
    if (!lineAnalysis) {
      return undefined;
    }

    // Only show explanations for lines that can be improved or are wrong
    if (lineAnalysis.status === 'can_be_improved' || lineAnalysis.status === 'wrong') {
      return lineAnalysis.explanation || undefined;
    }
    
    return undefined;
  };

  // Calculate which line numbers each block spans
  const getBlockLineRanges = () => {
    let currentLineNumber = 1;
    const blockRanges: {blockIndex: number, startLine: number, endLine: number}[] = [];
    
    descriptionBoxes.forEach((block, idx) => {
      const startLine = currentLineNumber;
      let lineCount = 1; // Default to 1 line
      
      // Calculate how many lines this block generates
      if (block.type === 'text') {
        // Text blocks are single line (filtered content)
        const lines = block.value.split('\n').filter(line => line.trim() !== '');
        lineCount = Math.max(1, lines.length);
      } else if (block.type === 'if' || block.type === 'elseif' || block.type === 'while' || block.type === 'for') {
        // These blocks generate 2 lines: condition + body
        lineCount = 2;
      } else if (block.type === 'else') {
        // Else blocks generate 2 lines: else + body
        lineCount = 2;
      }
      
      const endLine = startLine + lineCount - 1;
      blockRanges.push({
        blockIndex: idx,
        startLine,
        endLine
      });
      
      currentLineNumber = endLine + 1;
    });
    
    return blockRanges;
  };

  const getBlockBorderStyle = (blockIndex: number) => {
    if (!analysis || !analysis.lineByLineAnalysis) {
      return {};
    }
    
    const blockRanges = getBlockLineRanges();
    const blockRange = blockRanges.find(range => range.blockIndex === blockIndex);
    if (!blockRange) return {};
    
    console.log(`Block ${blockIndex} spans lines ${blockRange.startLine}-${blockRange.endLine}`);
    
    // Get analysis for all lines in this block's range
    const blockAnalyses = analysis.lineByLineAnalysis.filter(line => 
      line.lineNumber >= blockRange.startLine && line.lineNumber <= blockRange.endLine
    );
    
    console.log(`Block ${blockIndex} analysis:`, blockAnalyses);
    
    if (blockAnalyses.length === 0) return {};
    
    // Determine the "worst" status for border color
    const hasWrong = blockAnalyses.some(a => a.status === 'wrong');
    const hasImproved = blockAnalyses.some(a => a.status === 'can_be_improved');
    
    if (hasWrong) {
      console.log(`Applying red border for block ${blockIndex}`);
      return {
        borderWidth: 3,
        borderColor: '#F44336', // Red
      };
    } else if (hasImproved) {
      console.log(`Applying orange border for block ${blockIndex}`);
      return {
        borderWidth: 3,
        borderColor: '#FF9800', // Orange
      };
    } else {
      console.log(`Applying green border for block ${blockIndex}`);
      return {
        borderWidth: 3,
        borderColor: '#4CAF50', // Green
      };
    }
  };

  const getBlockExplanation = (blockIndex: number) => {
    if (!analysis || !analysis.lineByLineAnalysis) {
      return undefined;
    }
    
    const blockRanges = getBlockLineRanges();
    const blockRange = blockRanges.find(range => range.blockIndex === blockIndex);
    if (!blockRange) return undefined;
    
    // Get analysis for all lines in this block's range
    const blockAnalyses = analysis.lineByLineAnalysis.filter(line => 
      line.lineNumber >= blockRange.startLine && line.lineNumber <= blockRange.endLine
    );
    
    // Find the first explanation that needs improvement or is wrong
    const explanationAnalysis = blockAnalyses.find(a => 
      (a.status === 'can_be_improved' || a.status === 'wrong') && a.explanation
    );
    
    return explanationAnalysis?.explanation || undefined;
  };
  
  async function handleSolveProblem() {
    if (!problem) return;
    
    const combinedSolution = descriptionBoxes.map(block => {
      if (block.type === 'text') return block.value;
      if (block.type === 'if') return `if ${block.condition}:\n   ${block.body}`;
      if (block.type === 'elseif') return `else if ${block.condition}:\n   ${block.body}`;
      if (block.type === 'else') return `else\n   ${block.body}`;
      if (block.type === 'while') return `while (${block.condition}):\n   ${block.body}`;
      if (block.type === 'for') return `for (${block.condition}):\n   ${block.body}`;
      return '';
    }).join('\n');
    
    if (!combinedSolution.trim()) {
      return;
    }
    
    // Add line numbers to the solution
    const numberedSolution = combinedSolution
      .split('\n')
      .filter(line => line.trim() !== '') // Remove empty lines
      .map((line, index) => `${index + 1}) ${line.trim()}`)
      .join('\n');
    
    setSolution(numberedSolution);
    setIsAnalyzing(true);
    setAnalysisError(null);
    console.log('\n' + numberedSolution);
    try {
      const response = await apiCall('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: numberedSolution,
          question: problem.description
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Received analysis data:', data);
        console.log('Line-by-line analysis:', data.analysis?.lineByLineAnalysis);
        console.log('\n=== RAW AI RESPONSE ===');
        console.log(data.rawResponse);
        console.log('=====================\n');
        setAnalysis(data.analysis);
        
        // Debug: Show block to line mappings
        if (data.analysis?.lineByLineAnalysis) {
          const blockRanges = getBlockLineRanges();
          console.log('Block to line mappings:', blockRanges);
        }
        
        setShowAnalysis(true);
      } else {
        console.error('Analysis failed:', response.status);
        setAnalysisError('Analysis failed. Please try again.');
      }
    } catch (error) {
      // Show simple error message if both APIs failed
      setAnalysisError('Both live and local servers failed, try again');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleDescriptionBoxChange(index: number, text: string) {
    setDescriptionBoxes(prev => prev.map((block, i) =>
      i === index && block.type === 'text'
        ? { ...block, value: text }
        : block
    ));
  }

  function handleAddDescriptionBox() {
    setDescriptionBoxes(prev => [...prev, { type: 'text', value: '' }]);
  }

  function handleIfBlockConditionChange(index: number, text: string) {
    setDescriptionBoxes(prev => prev.map((block, i) =>
      i === index && block.type === 'if'
        ? { ...block, condition: text }
        : block
    ));
  }

  function handleIfBlockBodyChange(index: number, text: string) {
    setDescriptionBoxes(prev => prev.map((block, i) =>
      i === index && block.type === 'if'
        ? { ...block, body: text }
        : block
    ));
  }

  function handleDeleteBox(index: number) {
    setDescriptionBoxes(prev => prev.filter((_, i) => i !== index));
  }

  function handleAddIfBlock() {
    setDescriptionBoxes(prev => {
      if (prev.length > 0 && (prev[prev.length - 1].type === 'if' || prev[prev.length - 1].type === 'elseif')) {
        return [...prev, { type: 'elseif', condition: '', body: '' }];
      }
      return [...prev, { type: 'if', condition: '', body: '' }];
    });
  }

  function handleElseIfBlockConditionChange(index: number, text: string) {
    setDescriptionBoxes(prev => prev.map((block, i) =>
      i === index && block.type === 'elseif'
        ? { ...block, condition: text }
        : block
    ));
  }

  function handleElseIfBlockBodyChange(index: number, text: string) {
    setDescriptionBoxes(prev => prev.map((block, i) =>
      i === index && block.type === 'elseif'
        ? { ...block, body: text }
        : block
    ));
  }

  function handleAddElseBlock() {
    setDescriptionBoxes(prev => {
      if (
        prev.length > 0 &&
        (prev[prev.length - 1].type === 'if' || prev[prev.length - 1].type === 'elseif')
      ) {
        return [...prev, { type: 'else', body: '' }];
      }
      return prev;
    });
  }

  function handleElseBlockBodyChange(index: number, text: string) {
    setDescriptionBoxes(prev => prev.map((block, i) =>
      i === index && block.type === 'else'
        ? { ...block, body: text }
        : block
    ));
  }

  function handleAddWhileBlock() {
    setDescriptionBoxes(prev => [...prev, { type: 'while', condition: '', body: '' }]);
  }

  function handleWhileBlockConditionChange(index: number, text: string) {
    setDescriptionBoxes(prev => prev.map((block, i) =>
      i === index && block.type === 'while'
        ? { ...block, condition: text }
        : block
    ));
  }

  function handleWhileBlockBodyChange(index: number, text: string) {
    setDescriptionBoxes(prev => prev.map((block, i) =>
      i === index && block.type === 'while'
        ? { ...block, body: text }
        : block
    ));
  }

  function handleAddForBlock() {
    setDescriptionBoxes(prev => [...prev, { type: 'for', condition: '', body: '' }]);
  }

  function handleForBlockConditionChange(index: number, text: string) {
    setDescriptionBoxes(prev => prev.map((block, i) =>
      i === index && block.type === 'for'
        ? { ...block, condition: text }
        : block
    ));
  }

  function handleForBlockBodyChange(index: number, text: string) {
    setDescriptionBoxes(prev => prev.map((block, i) =>
      i === index && block.type === 'for'
        ? { ...block, body: text }
        : block
    ));
  }

  // Generate HTML content for WebView with proper styling


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={[
            styles.headerTitleBubble, 
            { 
              backgroundColor: getDifficultyBubbleColor(problem?.difficulty || 'Easy'),
              shadowColor: getDifficultyAccentColor(problem?.difficulty || 'Easy'),
            }
          ]}>
            <View style={[styles.difficultyDot, { backgroundColor: getDifficultyAccentColor(problem?.difficulty || 'Easy') }]} />
            <ThemedText style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
              {name || problem?.title}
            </ThemedText>
          </View>
        </View>
        
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6564c7" />
          <ThemedText style={styles.loadingText}>Loading problem...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProblemData}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      ) : problem ? (
        <ScrollView style={styles.content} contentContainerStyle={{ flexGrow: 1 }}>
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
                {showProblem ? (
                  <HtmlRenderer 
                    htmlContent={cleanedDescription || problem.description || 'No description available'} 
                    style={styles.webviewContainer}
                  />
                ) : (
                  <>
                    <ScrollView 
                      ref={exampleScrollViewRef}
                      style={styles.exampleScrollView} 
                      showsVerticalScrollIndicator={false}
                    >
                      <View style={styles.exampleContentFormatted}>

                        <View style={styles.exampleFieldContainer}>
                          <View style={styles.exampleLabelRowContainer}>
                            <View style={styles.exampleLabelContainer}>
                              <ThemedText style={styles.exampleLabelFormatted}>Input:</ThemedText>
                            </View>
                            {problem.examples[currentExampleIndex]?.image && (
                              <TouchableOpacity 
                                style={styles.imageIndicator}
                                onPress={() => {
                                  // Scroll to bottom to show the image
                                  exampleScrollViewRef.current?.scrollToEnd({ animated: true });
                                }}
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
                            <ThemedText style={styles.exampleTextFormatted}>{problem.examples[currentExampleIndex]?.input || 'No input available'}</ThemedText>
                          </View>
                        </View>

                        <View style={styles.exampleFieldContainer}>
                          <View style={styles.exampleLabelContainer}>
                            <ThemedText style={styles.exampleLabelFormatted}>Output:</ThemedText>
                          </View>
                          <View style={styles.exampleValueContainer}>
                            <ThemedText style={styles.exampleTextFormatted}>{problem.examples[currentExampleIndex]?.output || 'No output available'}</ThemedText>
                          </View>
                        </View>

                        <View style={styles.exampleFieldContainer}>
                          <View style={styles.exampleLabelContainer}>
                            <ThemedText style={styles.exampleLabelFormatted}>Explanation:</ThemedText>
                          </View>
                          <View style={styles.exampleValueContainer}>
                            <ThemedText style={styles.exampleTextFormatted}>{problem.examples[currentExampleIndex]?.explanation || 'No explanation available'}</ThemedText>
                          </View>
                        </View>

                        {problem.examples[currentExampleIndex]?.image && (
                          <View style={styles.exampleFieldContainer}>
                            <View style={styles.exampleLabelContainer}>
                              <ThemedText style={styles.exampleLabelFormatted}>Image:</ThemedText>
                            </View>
                            <View style={styles.exampleValueContainer}>
                              <View style={styles.exampleImageContainerFormatted}>
                                <Image 
                                  source={{ uri: problem.examples[currentExampleIndex]?.image }}
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
                        {problem.examples.map((_, index) => (
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
                        style={[styles.navArrowButton, currentExampleIndex === problem.examples.length - 1 && styles.disabledNavButton]}
                        onPress={() => setCurrentExampleIndex(prev => Math.min(problem.examples.length - 1, prev + 1))}
                        disabled={currentExampleIndex === problem.examples.length - 1}
                      >
                        <ThemedText style={[styles.navArrowText, currentExampleIndex === problem.examples.length - 1 && styles.disabledNavText]}>›</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
          </View>
          
          <View style={[styles.section, { flex: 1 }]}>
            <ThemedText style={styles.sectionTitle}>Solution</ThemedText>

            {/* Render all DescriptionBoxes */}
            {descriptionBoxes.map((block, idx) => {
              // Check if this block should be connected to the previous block
              const isConnected = idx > 0 && 
                (block.type === 'if' || block.type === 'elseif') &&
                (descriptionBoxes[idx - 1].type === 'if' || descriptionBoxes[idx - 1].type === 'elseif');

              if (block.type === 'text') {
                return (
                  <DescriptionBox
                    key={idx}
                    value={block.value}
                    onChangeText={text => handleDescriptionBoxChange(idx, text)}
                    placeholder="Write your solution here..."
                    onDelete={descriptionBoxes.length > 1 ? () => handleDeleteBox(idx) : undefined}
                    borderStyle={getBlockBorderStyle(idx)}
                    explanation={getBlockExplanation(idx)}
                  />
                );
              }
              if (block.type === 'if') {
                return (
                  <IfBlock
                    key={idx}
                    condition={block.condition}
                    body={block.body}
                    onChangeCondition={text => handleIfBlockConditionChange(idx, text)}
                    onChangeBody={text => handleIfBlockBodyChange(idx, text)}
                    onDelete={descriptionBoxes.length > 1 ? () => handleDeleteBox(idx) : undefined}
                    isConnected={isConnected}
                    borderStyle={getBlockBorderStyle(idx)}
                    explanation={getBlockExplanation(idx)}
                  />
                );
              }
              if (block.type === 'elseif') {
                return (
                  <ElseIfBlock
                    key={idx}
                    condition={block.condition}
                    body={block.body}
                    onChangeCondition={text => handleElseIfBlockConditionChange(idx, text)}
                    onChangeBody={text => handleElseIfBlockBodyChange(idx, text)}
                    onDelete={descriptionBoxes.length > 1 ? () => handleDeleteBox(idx) : undefined}
                    isConnected={isConnected}
                    borderStyle={getBlockBorderStyle(idx)}
                    explanation={getBlockExplanation(idx)}
                  />
                );
              }
              if (block.type === 'else') {
                return (
                  <ElseBlock
                    key={idx}
                    body={block.body}
                    onChangeBody={text => handleElseBlockBodyChange(idx, text)}
                    onDelete={descriptionBoxes.length > 1 ? () => handleDeleteBox(idx) : undefined}
                    borderStyle={getBlockBorderStyle(idx)}
                    explanation={getBlockExplanation(idx)}
                  />
                );
              }
              if (block.type === 'while') {
                return (
                  <WhileBlock
                    key={idx}
                    condition={block.condition}
                    body={block.body}
                    onChangeCondition={text => handleWhileBlockConditionChange(idx, text)}
                    onChangeBody={text => handleWhileBlockBodyChange(idx, text)}
                    onDelete={descriptionBoxes.length > 1 ? () => handleDeleteBox(idx) : undefined}
                    borderStyle={getBlockBorderStyle(idx)}
                    explanation={getBlockExplanation(idx)}
                  />
                );
              }
              if (block.type === 'for') {
                return (
                  <ForBlock
                    key={idx}
                    condition={block.condition}
                    body={block.body}
                    onChangeCondition={text => handleForBlockConditionChange(idx, text)}
                    onChangeBody={text => handleForBlockBodyChange(idx, text)}
                    onDelete={descriptionBoxes.length > 1 ? () => handleDeleteBox(idx) : undefined}
                    borderStyle={getBlockBorderStyle(idx)}
                    explanation={getBlockExplanation(idx)}
                  />
                );
              }
              return null;
            })}
          </View>

          {/* Button Row */}
          <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.addBoxButton} onPress={handleAddDescriptionBox}>
                <ThemedText style={styles.addBoxButtonText}>Line</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBoxButton} onPress={handleAddIfBlock}>
                <ThemedText style={styles.addBoxButtonText}>If</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBoxButton, {
                  opacity:
                    descriptionBoxes.length > 0 &&
                    (descriptionBoxes[descriptionBoxes.length - 1].type === 'if' || descriptionBoxes[descriptionBoxes.length - 1].type === 'elseif')
                      ? 1 : 0.5
                }]}
                onPress={handleAddElseBlock}
                disabled={
                  !(
                    descriptionBoxes.length > 0 &&
                    (descriptionBoxes[descriptionBoxes.length - 1].type === 'if' || descriptionBoxes[descriptionBoxes.length - 1].type === 'elseif')
                  )
                }
              >
                <ThemedText style={styles.addBoxButtonText}>Else</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBoxButton} onPress={handleAddWhileBlock}>
                <ThemedText style={styles.addBoxButtonText}>While</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBoxButton} onPress={handleAddForBlock}>
                <ThemedText style={styles.addBoxButtonText}>For</ThemedText>
              </TouchableOpacity>
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
      ) : null}

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
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
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
  headerSpacer: {
    width: 60,
  },

  content: {
    flex: 1,
    padding: 16,
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
  descriptionContainer: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
    height: 300,
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
  activeExampleIndicator: {
    backgroundColor: '#6564c7',
  },
  exampleIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6564c7',
  },
  activeExampleIndicatorText: {
    color: '#fff',
  },
  arrowButton: {
    width: 30,
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
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6564c7',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#FF375F',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6564c7',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  webviewContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exampleScrollView: {
    flex: 1,
  },
  exampleContentFormatted: {
    flex: 1,
    padding: 6,
  },
  exampleFieldContainer: {
    marginBottom: 10,
  },
  exampleLabelContainer: {
    marginBottom: 3,
    flex: 1,
  },
  exampleLabelRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  exampleValueContainer: {
    paddingLeft: 6,
  },
  exampleLabelFormatted: {
    fontWeight: '600',
    color: '#6564c7',
    fontSize: 15,
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
    }); 