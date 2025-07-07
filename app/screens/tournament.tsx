import TournamentBracket from '@/app/components/TournamentBracket';
import TournamentJoinModal from '@/app/components/TournamentJoinModal';
import TournamentMatch from '@/app/components/TournamentMatch';
import { ThemedText } from '@/components/ThemedText';
import { ProfileService } from '@/lib/services/profileService';
import { Tournament, TournamentMatch as TournamentMatchType, TournamentService } from '@/lib/services/tournamentService';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

interface UserProfile {
  skill_level: 'Beginner' | 'Intermediate' | 'Advanced';
  trophy_count: number;
}

export default function TournamentScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [userTournaments, setUserTournaments] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<'main' | 'bracket' | 'match'>('main');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [currentMatch, setCurrentMatch] = useState<TournamentMatchType | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const [profileData, tournamentsData, userTournamentsData] = await Promise.all([
        ProfileService.getUserProfile(user.id),
        TournamentService.getActiveTournaments(),
        TournamentService.getUserTournaments()
      ]);

      setUserProfile(profileData);
      setActiveTournaments(tournamentsData);
      setUserTournaments(userTournamentsData);
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTournament = () => {
    setShowJoinModal(true);
  };

  const handleTournamentJoined = async (tournamentId: string) => {
    try {
      const tournament = await TournamentService.getTournament(tournamentId);
      setCurrentTournament(tournament);
      setCurrentView('bracket');
      setShowJoinModal(false);
    } catch (error) {
      console.error('Error loading tournament:', error);
    }
  };

  const handleMatchSelect = async (match: TournamentMatchType) => {
    setCurrentMatch(match);
    setCurrentView('match');
  };

  const handleMatchComplete = (winnerId: string) => {
    // Return to bracket view after match completion
    setTimeout(() => {
      setCurrentView('bracket');
      setCurrentMatch(null);
    }, 3000);
  };

  const handleBack = () => {
    if (currentView === 'match') {
      setCurrentView('bracket');
      setCurrentMatch(null);
    } else if (currentView === 'bracket') {
      setCurrentView('main');
      setCurrentTournament(null);
    } else {
      router.back();
    }
  };

  const renderMainView = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText>← Back</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Tournament Arena</ThemedText>
        <View style={styles.headerRight}>
          <Image source={require('@/assets/images/icons/trophy-icon.png')} style={styles.trophyIcon} />
          <ThemedText style={styles.trophyCount}>{userProfile?.trophy_count || 0}</ThemedText>
        </View>
      </View>

      <View style={styles.statsSection}>
        <ThemedText style={styles.sectionTitle}>Your Tournament Stats</ThemedText>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>{userTournaments.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Tournaments</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>
              {userTournaments.filter(t => t.tournament?.winner_id === t.player_id).length}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Wins</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>
              {userTournaments.reduce((sum, t) => sum + (t.matches_won || 0), 0)}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Matches Won</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.actionsSection}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleJoinTournament}
        >
          <ThemedText style={styles.primaryButtonText}>Join Tournament</ThemedText>
        </TouchableOpacity>
      </View>

      {activeTournaments.length > 0 && (
        <View style={styles.activeTournamentsSection}>
          <ThemedText style={styles.sectionTitle}>Active Tournaments</ThemedText>
          {activeTournaments.map(tournament => (
            <TouchableOpacity 
              key={tournament.id}
              style={styles.tournamentCard}
              onPress={() => {
                setCurrentTournament(tournament);
                setCurrentView('bracket');
              }}
            >
              <View style={styles.tournamentHeader}>
                <ThemedText style={styles.tournamentName}>{tournament.name}</ThemedText>
                <View style={[styles.statusBadge, { backgroundColor: tournament.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
                  <ThemedText style={styles.statusText}>{tournament.status}</ThemedText>
                </View>
              </View>
              <ThemedText style={styles.tournamentDetails}>
                {tournament.topic?.name} • {tournament.difficulty} • {tournament.current_players}/{tournament.max_players} players
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderBracketView = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ThemedText>← Back</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>
          {currentTournament?.name || 'Tournament Bracket'}
        </ThemedText>
      </View>

      {currentTournament && (
        <TournamentBracket 
          tournamentId={currentTournament.id}
          onMatchSelect={handleMatchSelect}
        />
      )}
    </View>
  );

  const renderMatchView = () => (
    <View style={styles.container}>
      {currentMatch && (
        <TournamentMatch 
          match={currentMatch}
          onMatchComplete={handleMatchComplete}
        />
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText style={styles.loadingText}>Loading tournaments...</ThemedText>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {currentView === 'main' && renderMainView()}
      {currentView === 'bracket' && renderBracketView()}
      {currentView === 'match' && renderMatchView()}
      
      <TournamentJoinModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoined={handleTournamentJoined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginRight: 40,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trophyIcon: {
    width: 24,
    height: 24,
    marginRight: 4,
  },
  trophyCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6564c7',
  },
  statsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1F2937',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6564c7',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  actionsSection: {
    padding: 16,
  },
  primaryButton: {
    backgroundColor: '#6564c7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTournamentsSection: {
    padding: 16,
  },
  tournamentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  tournamentDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
});