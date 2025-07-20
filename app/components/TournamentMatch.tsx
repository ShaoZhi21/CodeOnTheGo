import { ThemedText } from '@/components/ThemedText';
import { TournamentMatch as TournamentMatchType, TournamentService } from '@/lib/services/tournamentService';
import { supabase } from '@/lib/supabase';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface TournamentMatchProps {
  match: TournamentMatchType;
  onMatchComplete?: (winnerId: string) => void;
}

export default function TournamentMatch({ match, onMatchComplete }: TournamentMatchProps) {
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes
  const [matchActive, setMatchActive] = useState(false);
  const [pseudocode, setPseudocode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [opponentSubmission, setOpponentSubmission] = useState<any>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    getCurrentUser();
    if (match.status === 'active') {
      startMatch();
    }
    subscribeToMatchUpdates();
  }, [match.id]);

  useEffect(() => {
    if (matchActive) {
      startTimer();
    } else {
      stopTimer();
    }
  }, [matchActive]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user?.id || null);
  };

  const startMatch = () => {
    setMatchActive(true);
    setTimeLeft(180);
    setPseudocode('');
    setSubmitted(false);
    setAnalysis(null);
    setShowResults(false);
    setOpponentSubmission(null);
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const subscribeToMatchUpdates = () => {
    matchSubscriptionRef.current = TournamentService.subscribeToMatch(match.id, (payload) => {
      if (payload.eventType === 'UPDATE') {
        // Check if both players have submitted
        if (payload.new.player1_submission_time && payload.new.player2_submission_time) {
          handleBothSubmitted();
        }
      }
    });
  };

  const handleTimeUp = () => {
    if (!submitted) {
      handleSubmitSolution();
    }
  };

  const handleSubmitSolution = async () => {
    if (!currentUser || submitted || !pseudocode.trim()) return;

    setLoading(true);
    try {
      const submission = await TournamentService.submitSolution(match.id, pseudocode);
      setSubmitted(true);

      // Analyze the submission
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: pseudocode,
          question: match.question?.description || ''
        })
      });

      if (response.ok) {
        const analysisResult = await response.json();
        setAnalysis(analysisResult.analysis);

        // Update submission with analysis
        await TournamentService.updateSubmissionAnalysis(submission.id, analysisResult.analysis);
      }

      // Check if both players have submitted
      if (match.player1_submission_time && match.player2_submission_time) {
        handleBothSubmitted();
      }

    } catch (error) {
      console.error('Error submitting solution:', error);
      Alert.alert('Error', 'Failed to submit solution');
    } finally {
      setLoading(false);
    }
  };

  const handleBothSubmitted = async () => {
    try {
      // Get both submissions
      const submissions = await TournamentService.getMatchSubmissions(match.id);
      const mySubmission = submissions.find(s => s.player_id === currentUser);
      const opponentSub = submissions.find(s => s.player_id !== currentUser);
      
      setOpponentSubmission(opponentSub);

      // Complete the match
      const winnerId = await TournamentService.completeMatch(match.id);
      setShowResults(true);
      onMatchComplete?.(winnerId);
    } catch (error) {
      console.error('Error completing match:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPlayerDisplayName = (player: any) => {
    if (!player) return 'Unknown';
    return player.email ? player.email.split('@')[0] : 'Unknown';
  };

  const isCurrentUserPlayer = (playerId: string) => {
    return currentUser === playerId;
  };

  const renderMatchHeader = () => (
    <View style={styles.matchHeader}>
      <View style={styles.matchInfo}>
        <ThemedText style={styles.matchTitle}>Round {match.round_number}</ThemedText>
        <ThemedText style={styles.matchSubtitle}>
          {getPlayerDisplayName(match.player1)} vs {getPlayerDisplayName(match.player2)}
        </ThemedText>
      </View>
      <View style={styles.timerContainer}>
        <ThemedText style={[
          styles.timerText,
          timeLeft <= 30 && styles.timerWarning
        ]}>
          {formatTime(timeLeft)}
        </ThemedText>
      </View>
    </View>
  );

  const renderQuestion = () => (
    <View style={styles.questionContainer}>
      <ThemedText style={styles.questionTitle}>
        {match.question?.title || 'Question Loading...'}
      </ThemedText>
      <ScrollView style={styles.questionDescription}>
        <ThemedText style={styles.questionText}>
          {match.question?.description || 'Question description loading...'}
        </ThemedText>
      </ScrollView>
    </View>
  );

  const renderSolutionInput = () => (
    <View style={styles.solutionContainer}>
      <ThemedText style={styles.solutionTitle}>Your Solution</ThemedText>
      
      <TextInput
        style={styles.pseudocodeInput}
        value={pseudocode}
        onChangeText={setPseudocode}
        placeholder="Write your pseudocode solution here..."
        placeholderTextColor="#9CA3AF"
        multiline
        editable={!submitted}
        textAlignVertical="top"
      />

      {!submitted && (
        <TouchableOpacity 
          style={[styles.submitButton, (!pseudocode.trim() || loading) && styles.submitButtonDisabled]}
          onPress={handleSubmitSolution}
          disabled={!pseudocode.trim() || loading}
        >
          <ThemedText style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Solution'}
          </ThemedText>
        </TouchableOpacity>
      )}

      {submitted && (
        <View style={styles.submittedIndicator}>
          <ThemedText style={styles.submittedText}>✓ Solution Submitted</ThemedText>
        </View>
      )}
    </View>
  );

  const renderResults = () => (
    <View style={styles.resultsContainer}>
      <ThemedText style={styles.resultsTitle}>Match Results</ThemedText>
      
      <View style={styles.scoreComparison}>
        <View style={styles.playerScoreCard}>
          <ThemedText style={styles.playerName}>
            {getPlayerDisplayName(match.player1)}
          </ThemedText>
          <ThemedText style={styles.scoreText}>
            {match.player1_score || 0}
          </ThemedText>
        </View>
        
        <View style={styles.vsContainer}>
          <ThemedText style={styles.vsText}>VS</ThemedText>
        </View>
        
        <View style={styles.playerScoreCard}>
          <ThemedText style={styles.playerName}>
            {getPlayerDisplayName(match.player2)}
          </ThemedText>
          <ThemedText style={styles.scoreText}>
            {match.player2_score || 0}
          </ThemedText>
        </View>
      </View>

      {analysis && (
        <View style={styles.analysisContainer}>
          <ThemedText style={styles.analysisTitle}>Your Analysis</ThemedText>
          <ThemedText style={styles.analysisScore}>Score: {analysis.score}/100</ThemedText>
          <ThemedText style={styles.analysisText}>
            {analysis.correctness === '✓' ? 'Correct Solution' : 'Incorrect Solution'}
          </ThemedText>
        </View>
      )}

      {match.winner_id && (
        <View style={styles.winnerContainer}>
          <ThemedText style={styles.winnerText}>
            Winner: {getPlayerDisplayName(match.winner)}
          </ThemedText>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderMatchHeader()}
      
      {!showResults && (
        <>
          {renderQuestion()}
          {renderSolutionInput()}
        </>
      )}
      
      {showResults && renderResults()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  matchInfo: {
    flex: 1,
  },
  matchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  matchSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  timerContainer: {
    backgroundColor: '#6564c7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  timerWarning: {
    color: '#FF6B6B',
  },
  questionContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  questionDescription: {
    maxHeight: 200,
  },
  questionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  solutionContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  solutionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  pseudocodeInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 120,
    backgroundColor: '#F9FAFB',
  },
  submitButton: {
    backgroundColor: '#6564c7',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  submittedIndicator: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  submittedText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  scoreComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  playerScoreCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6564c7',
  },
  vsContainer: {
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  analysisContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  analysisScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6564c7',
    marginBottom: 4,
  },
  analysisText: {
    fontSize: 14,
    color: '#374151',
  },
  winnerContainer: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  winnerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 