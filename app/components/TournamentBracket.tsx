import { ThemedText } from '@/components/ThemedText';
import { TournamentMatch, TournamentService } from '@/lib/services/tournamentService';
import { useEffect, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

interface TournamentBracketProps {
  tournamentId: string;
  onMatchSelect?: (match: TournamentMatch) => void;
}

export default function TournamentBracket({ tournamentId, onMatchSelect }: TournamentBracketProps) {
  const [bracket, setBracket] = useState<TournamentMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBracket();
    const subscription = subscribeToUpdates();
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [tournamentId]);

  const loadBracket = async () => {
    try {
      const bracketData = await TournamentService.getTournamentBracket(tournamentId);
      setBracket(bracketData);
    } catch (error) {
      console.error('Error loading bracket:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    return TournamentService.subscribeToTournament(tournamentId, () => {
      loadBracket();
    });
  };

  const getMatchesByRound = (roundNumber: number) => {
    return bracket.filter(match => match.round_number === roundNumber);
  };

  const getMaxRounds = () => {
    if (bracket.length === 0) return 0;
    return Math.max(...bracket.map(match => match.round_number));
  };

  const getPlayerDisplayName = (player: any) => {
    if (!player) return 'TBD';
    return player.email ? player.email.split('@')[0] : 'Unknown';
  };

  const getMatchStatusColor = (match: TournamentMatch) => {
    switch (match.status) {
      case 'completed':
        return '#4CAF50';
      case 'active':
        return '#FF9800';
      case 'pending':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const getMatchStatusText = (match: TournamentMatch) => {
    switch (match.status) {
      case 'completed':
        return 'COMPLETED';
      case 'active':
        return 'LIVE';
      case 'pending':
        return 'PENDING';
      default:
        return 'PENDING';
    }
  };

  const renderMatch = (match: TournamentMatch) => (
    <TouchableOpacity
      key={match.id}
      style={[styles.matchBox, { borderColor: getMatchStatusColor(match) }]}
      onPress={() => onMatchSelect?.(match)}
      disabled={match.status === 'pending' && !match.player1_id}
    >
      <View style={styles.matchHeader}>
        <ThemedText style={styles.matchNumber}>Match {match.match_number}</ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: getMatchStatusColor(match) }]}>
          <ThemedText style={styles.statusText}>{getMatchStatusText(match)}</ThemedText>
        </View>
      </View>

      <View style={styles.playerRow}>
        <ThemedText style={[
          styles.playerName,
          match.winner_id === match.player1_id && styles.winnerName
        ]}>
          {getPlayerDisplayName(match.player1)}
        </ThemedText>
        {match.player1_score !== undefined && (
          <ThemedText style={[
            styles.playerScore,
            match.winner_id === match.player1_id && styles.winnerScore
          ]}>
            {match.player1_score}
          </ThemedText>
        )}
      </View>

      <View style={styles.playerRow}>
        <ThemedText style={[
          styles.playerName,
          match.winner_id === match.player2_id && styles.winnerName
        ]}>
          {getPlayerDisplayName(match.player2)}
        </ThemedText>
        {match.player2_score !== undefined && (
          <ThemedText style={[
            styles.playerScore,
            match.winner_id === match.player2_id && styles.winnerScore
          ]}>
            {match.player2_score}
          </ThemedText>
        )}
      </View>

      {match.status === 'active' && (
        <View style={styles.activeIndicator}>
          <View style={styles.activeDot} />
          <ThemedText style={styles.activeText}>LIVE</ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderRound = (roundNumber: number) => {
    const matches = getMatchesByRound(roundNumber);
    const isFinalRound = roundNumber === getMaxRounds();
    const isSemiFinal = roundNumber === getMaxRounds() - 1;

    return (
      <View key={roundNumber} style={styles.roundColumn}>
        <View style={styles.roundHeader}>
          <ThemedText style={styles.roundTitle}>
            {isFinalRound ? 'Final' : isSemiFinal ? 'Semi-Final' : `Round ${roundNumber}`}
          </ThemedText>
          <ThemedText style={styles.roundSubtitle}>
            {matches.length} {matches.length === 1 ? 'Match' : 'Matches'}
          </ThemedText>
        </View>
        
        <View style={styles.matchesContainer}>
          {matches.map((match, index) => (
            <View key={match.id} style={styles.matchContainer}>
              {renderMatch(match)}
              {index < matches.length - 1 && <View style={styles.matchSpacer} />}
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText style={styles.loadingText}>Loading bracket...</ThemedText>
      </View>
    );
  }

  const maxRounds = getMaxRounds();
  if (maxRounds === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>No matches found</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView 
      horizontal 
      style={styles.bracketContainer}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.bracketContent}
    >
      {Array.from({ length: maxRounds }, (_, i) => i + 1).map(roundNumber => 
        renderRound(roundNumber)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bracketContainer: {
    flex: 1,
  },
  bracketContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  roundColumn: {
    minWidth: 220,
    marginRight: 32,
  },
  roundHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  roundTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  roundSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  matchesContainer: {
    gap: 16,
  },
  matchContainer: {
    alignItems: 'center',
  },
  matchSpacer: {
    height: 20,
  },
  matchBox: {
    width: 200,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  winnerName: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  playerScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
    marginLeft: 8,
  },
  winnerScore: {
    color: '#4CAF50',
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9800',
    marginRight: 6,
  },
  activeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
}); 