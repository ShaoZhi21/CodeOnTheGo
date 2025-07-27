import { ThemedText } from '@/components/ThemedText';
import { JoinQueueData, TournamentService } from '@/lib/services/tournamentService';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

interface TournamentJoinModalProps {
  visible: boolean;
  onClose: () => void;
  onJoined: (tournamentId: string) => void;
}

interface Topic {
  id: number;
  name: string;
}

export default function TournamentJoinModal({ visible, onClose, onJoined }: TournamentJoinModalProps) {
  const [selectedBracketSize, setSelectedBracketSize] = useState<4 | 8>(4);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const [queueTimer, setQueueTimer] = useState(0);

  useEffect(() => {
    if (visible) {
      loadTopics();
    }
  }, [visible]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (inQueue) {
      interval = setInterval(() => {
        setQueueTimer(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [inQueue]);

  const loadTopics = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? 'http://localhost:3000' : 'https://codeonthego-backend.onrender.com')}/topics`);
      if (response.ok) {
        const topicsData = await response.json();
        setTopics(topicsData);
        if (topicsData.length > 0) {
          setSelectedTopic(topicsData[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  };

  const handleJoinQueue = async () => {
    if (!selectedTopic) {
      Alert.alert('Error', 'Please select a topic');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const queueData: JoinQueueData = {
        bracketSize: selectedBracketSize,
        topicId: selectedTopic,
        difficulty: selectedDifficulty,
        skillLevel: 'Intermediate', // This should come from user profile
      };

      await TournamentService.joinQueue(queueData);
      setInQueue(true);
      setQueueTimer(0);

      // Subscribe to queue updates
      const subscription = TournamentService.subscribeToQueue((payload) => {
        if (payload.eventType === 'UPDATE' && payload.new.status === 'matched') {
          handleTournamentMatched();
        }
      });

    } catch (error) {
      console.error('Error joining queue:', error);
      Alert.alert('Error', 'Failed to join queue');
    } finally {
      setLoading(false);
    }
  };

  const handleTournamentMatched = () => {
    setInQueue(false);
    onClose();
    // The tournament ID will be available through the subscription
    // For now, we'll just close the modal
  };

  const handleLeaveQueue = async () => {
    try {
      await TournamentService.leaveQueue();
      setInQueue(false);
      setQueueTimer(0);
      onClose();
    } catch (error) {
      console.error('Error leaving queue:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQueueView = () => (
    <View style={styles.queueContainer}>
      <ThemedText style={styles.queueTitle}>Finding Players...</ThemedText>
      <ThemedText style={styles.queueSubtitle}>
        Looking for {selectedBracketSize} players for {selectedDifficulty} {topics.find(t => t.id === selectedTopic)?.name} tournament
      </ThemedText>
      
      <View style={styles.timerContainer}>
        <ThemedText style={styles.timerText}>{formatTime(queueTimer)}</ThemedText>
      </View>

      <View style={styles.loadingDots}>
        <View style={[styles.dot, styles.dot1]} />
        <View style={[styles.dot, styles.dot2]} />
        <View style={[styles.dot, styles.dot3]} />
      </View>

      <TouchableOpacity style={styles.cancelButton} onPress={handleLeaveQueue}>
        <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
      </TouchableOpacity>
    </View>
  );

  const renderJoinView = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Join Tournament</ThemedText>
        <ThemedText style={styles.subtitle}>Select your preferences to find players</ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Bracket Size</ThemedText>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              selectedBracketSize === 4 && styles.selectedOption
            ]}
            onPress={() => setSelectedBracketSize(4)}
          >
            <ThemedText style={[
              styles.optionText,
              selectedBracketSize === 4 && styles.selectedOptionText
            ]}>
              4 Players
            </ThemedText>
            <ThemedText style={[
              styles.optionSubtext,
              selectedBracketSize === 4 && styles.selectedOptionText
            ]}>
              2 Rounds
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.optionButton,
              selectedBracketSize === 8 && styles.selectedOption
            ]}
            onPress={() => setSelectedBracketSize(8)}
          >
            <ThemedText style={[
              styles.optionText,
              selectedBracketSize === 8 && styles.selectedOptionText
            ]}>
              8 Players
            </ThemedText>
            <ThemedText style={[
              styles.optionSubtext,
              selectedBracketSize === 8 && styles.selectedOptionText
            ]}>
              3 Rounds
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Topic</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topicsContainer}>
          {topics.map(topic => (
            <TouchableOpacity
              key={topic.id}
              style={[
                styles.topicButton,
                selectedTopic === topic.id && styles.selectedTopic
              ]}
              onPress={() => setSelectedTopic(topic.id)}
            >
              <ThemedText style={[
                styles.topicText,
                selectedTopic === topic.id && styles.selectedTopicText
              ]}>
                {topic.name}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Difficulty</ThemedText>
        <View style={styles.optionsContainer}>
          {(['Easy', 'Medium', 'Hard'] as const).map(difficulty => (
            <TouchableOpacity
              key={difficulty}
              style={[
                styles.optionButton,
                selectedDifficulty === difficulty && styles.selectedOption
              ]}
              onPress={() => setSelectedDifficulty(difficulty)}
            >
              <ThemedText style={[
                styles.optionText,
                selectedDifficulty === difficulty && styles.selectedOptionText
              ]}>
                {difficulty}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.joinButton, loading && styles.joinButtonDisabled]}
          onPress={handleJoinQueue}
          disabled={loading}
        >
          <ThemedText style={styles.joinButtonText}>
            {loading ? 'Joining...' : 'Join Queue'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {inQueue ? renderQueueView() : renderJoinView()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  selectedOption: {
    borderColor: '#6564c7',
    backgroundColor: '#6564c7',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  selectedOptionText: {
    color: 'white',
  },
  optionSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  topicsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  topicButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  selectedTopic: {
    borderColor: '#6564c7',
    backgroundColor: '#6564c7',
  },
  topicText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  selectedTopicText: {
    color: 'white',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  joinButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#6564c7',
    alignItems: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  queueContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  queueTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  queueSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
  },
  timerContainer: {
    marginBottom: 40,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#6564c7',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 40,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6564c7',
  },
  dot1: {
    animationName: 'bounce',
    animationDuration: '1.4s',
    animationIterationCount: 'infinite',
    animationDelay: '0s',
  },
  dot2: {
    animationName: 'bounce',
    animationDuration: '1.4s',
    animationIterationCount: 'infinite',
    animationDelay: '0.2s',
  },
  dot3: {
    animationName: 'bounce',
    animationDuration: '1.4s',
    animationIterationCount: 'infinite',
    animationDelay: '0.4s',
  },
}); 