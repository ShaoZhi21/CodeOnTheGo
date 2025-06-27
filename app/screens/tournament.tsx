import { ThemedText } from '@/components/ThemedText';
import { usePathname, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const TOURNAMENT_TYPES = [
  { type: 'knockout', label: 'Knockout (8 players)', entry: 20, prize: 160 },
  { type: 'roundrobin', label: 'Round Robin (4 players)', entry: 10, prize: 40 },
];

const players = [
  { name: 'You', id: 1 },
  { name: 'Alice', id: 2 },
  { name: 'Bob', id: 3 },
  { name: 'Charlie', id: 4 },
  { name: 'David', id: 5 },
  { name: 'Eve', id: 6 },
  { name: 'Frank', id: 7 },
  { name: 'Grace', id: 8 },
];

const PURPLE = '#6564c7';
const LIGHT_PURPLE = '#edeaff';

export default function TournamentScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const [userTrophies, setUserTrophies] = useState(42);
  const [userName, setUserName] = useState('User123');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joined, setJoined] = useState(false);
  const [userAdvanced, setUserAdvanced] = useState(false);
  const [showBracket, setShowBracket] = useState(false);

  const tournamentType = TOURNAMENT_TYPES.find(t => t.type === selectedType);

  const handleBack = () => {
    if (pathname === '/screens/tournament') {
      router.replace('/');
    } else {
      router.replace('/screens/tournament');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* User stats at the top */}
      <View style={styles.userStatsRow}>
        <ThemedText style={styles.userName}>{userName}</ThemedText>
        <View style={styles.trophyRow}>
          <Image source={require('@/assets/images/icons/trophy-icon.png')} style={styles.trophyIcon} />
          <ThemedText style={styles.trophyCount}>{userTrophies}</ThemedText>
        </View>
      </View>
      {/* Top Bar with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ThemedText>← Back</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Tournament</ThemedText>
      </View>

      {/* Tournament Type Selector */}
      {!joined && (
        <View style={styles.typeSelector}>
          {TOURNAMENT_TYPES.map(t => (
            <TouchableOpacity
              key={t.type}
              style={[styles.tournamentTypeButton, selectedType === t.type && styles.tournamentTypeButtonSelected]}
              onPress={() => setSelectedType(t.type as string)}
            >
              <Text style={styles.tournamentTypeText}>{t.label}</Text>
              <View style={styles.trophyRequirementRow}>
                <Image source={require('@/assets/images/icons/trophy-icon.png')} style={styles.trophyIconSmall} />
                <Text style={styles.trophyRequirementText}>{t.entry} trophies to join, Prize: {t.prize} trophies</Text>
              </View>
            </TouchableOpacity>
          ))}
          {selectedType && (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => setShowJoinModal(true)}
            >
              <Text style={styles.joinButtonText}>Join Tournament</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Join Confirmation Modal */}
      <Modal visible={showJoinModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join this tournament for {tournamentType?.entry} trophies?</Text>
            <Text style={styles.modalSubtitle}>Winner takes all: {tournamentType?.prize} trophies!</Text>
            <View style={{ flexDirection: 'row', marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#6564c7' }]}
                onPress={() => {
                  setUserTrophies(t => t - (tournamentType?.entry || 0));
                  setJoined(true);
                  setShowJoinModal(false);
                }}
              >
                <Text style={styles.modalButtonText}>Join</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#ccc', marginLeft: 10 }]}
                onPress={() => setShowJoinModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: '#333' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Main Tournament View */}
      {joined && (
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={styles.viewBracketButton} onPress={() => setShowBracket(true)}>
            <Text style={styles.viewBracketText}>View Full Bracket</Text>
          </TouchableOpacity>
          {/* Show only current round/match here */}
          <View style={styles.round}>
            <Text style={styles.roundTitle}>Current Round</Text>
            <View style={styles.match}>
              <Player name="You" highlight />
              <Text style={styles.vs}>vs</Text>
              <Player name="Alice" />
            </View>
            {!userAdvanced && (
              <TouchableOpacity style={styles.button} onPress={() => setUserAdvanced(true)}>
                <Text style={styles.buttonText}>Start Match</Text>
              </TouchableOpacity>
            )}
            {userAdvanced && (
              <Text style={styles.advancedText}>You advanced to the next round!</Text>
            )}
          </View>
        </View>
      )}

      {/* Full Bracket Modal */}
      <Modal visible={showBracket} animationType="slide">
        <SafeAreaView style={styles.bracketModalContainer}>
          <View style={styles.bracketHeader}>
            <ThemedText style={styles.bracketHeaderText}>Tournament Bracket</ThemedText>
            <TouchableOpacity style={styles.closeBracketButtonAbsolute} onPress={() => setShowBracket(false)}>
              <ThemedText style={styles.closeBracketText}>Close</ThemedText>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal style={styles.horizontalScroll} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 500, backgroundColor: '#fff' }} showsHorizontalScrollIndicator={false}>
            {/* Round 1 */}
            <View style={styles.roundColumn}>
              <MatchBox player1="You" player2="Alice" score1={17} score2={20} winner="Alice" />
              <View style={styles.matchSpacer} />
              <MatchBox player1="Bob" player2="Charlie" score1={16} score2={13} winner="Bob" />
              <View style={styles.matchSpacer} />
              <MatchBox player1="David" player2="Eve" />
              <View style={styles.matchSpacer} />
              <MatchBox player1="Frank" player2="Grace" />
            </View>
            {/* Round 2 */}
            <View style={styles.roundColumn}>
              <View style={{ height: 55 }} />
              <MatchBox player1="Alice" player2="Bob" winner="Alice" />
              <View style={styles.matchSpacerLarge} />
              <MatchBox player1="David" player2="Frank" />
            </View>
            {/* Round 3 (Final) */}
            <View style={styles.roundColumn}>
              <View style={{ height: 125 }} />
              <MatchBox player1="Alice" player2="David" />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Player({ name, highlight = false }: { name: string; highlight?: boolean }) {
  return (
    <View style={[styles.playerBubble, highlight && styles.playerHighlight]}>
      <Text style={[styles.playerText, highlight && styles.playerTextHighlight]}>
        {name}
      </Text>
    </View>
  );
}

function MatchBox({ player1, player2, score1, score2, winner }: { player1: string; player2: string; score1?: number; score2?: number; winner?: string }) {
  return (
    <View style={[styles.matchBox, { backgroundColor: '#fff', borderColor: LIGHT_PURPLE }, winner && { borderColor: PURPLE, borderWidth: 2 }]}> 
      <View style={[styles.playerRow, winner === player1 && styles.winnerRow]}> 
        <Text style={[styles.playerName, winner === player1 && { color: PURPLE }]}>{player1}</Text>
        {score1 !== undefined && <Text style={[styles.score, { color: PURPLE }]}>{score1}</Text>}
      </View>
      <View style={[styles.playerRow, winner === player2 && styles.winnerRow]}> 
        <Text style={[styles.playerName, winner === player2 && { color: PURPLE }]}>{player2}</Text>
        {score2 !== undefined && <Text style={[styles.score, { color: PURPLE }]}>{score2}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center', marginRight: 40 },
  typeSelector: { padding: 20 },
  coins: { fontSize: 16, color: '#6564c7', marginBottom: 10, textAlign: 'center' },
  tournamentTypeButton: { backgroundColor: '#edeaff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: '#6564c7' },
  tournamentTypeButtonSelected: { borderColor: '#453d83', borderWidth: 3, backgroundColor: '#edeaff' },
  tournamentTypeText: { color: '#6564c7', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  joinButton: { backgroundColor: '#6564c7', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 10 },
  joinButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', width: 300 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#6564c7', marginBottom: 10, textAlign: 'center' },
  modalSubtitle: { fontSize: 16, color: '#333', marginBottom: 10, textAlign: 'center' },
  modalButton: { borderRadius: 10, padding: 12, minWidth: 80, alignItems: 'center' },
  modalButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  viewBracketButton: { alignSelf: 'center', marginTop: 10, marginBottom: 10, backgroundColor: '#edeaff', borderRadius: 8, padding: 8, paddingHorizontal: 16 },
  viewBracketText: { color: '#6564c7', fontWeight: 'bold', fontSize: 15 },
  round: { marginBottom: 30, alignItems: 'center' },
  roundTitle: { fontSize: 18, fontWeight: 'bold', color: '#6564c7', marginBottom: 15 },
  match: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  vs: { marginHorizontal: 10, fontWeight: 'bold', color: '#aaa' },
  playerBubble: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 2, borderColor: '#e0e0e0', minWidth: 80, alignItems: 'center' },
  playerHighlight: { borderColor: '#6564c7', backgroundColor: '#edeaff' },
  playerText: { fontWeight: 'bold', color: '#333' },
  playerTextHighlight: { color: '#6564c7' },
  button: { backgroundColor: '#6564c7', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  advancedText: { color: '#4CAF50', fontWeight: 'bold', marginTop: 10, fontSize: 16 },
  bracketModalContainer: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  bracketHeader: { position: 'relative', height: 64, justifyContent: 'center', alignItems: 'center', marginBottom: 20, marginTop: 16 },
  bracketHeaderText: { fontSize: 22, fontWeight: 'bold', color: '#6564c7', textAlign: 'center', position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, margin: 'auto' },
  closeBracketButtonAbsolute: { position: 'absolute', right: 0, top: 0, padding: 12, borderRadius: 10, backgroundColor: '#6564c7', alignItems: 'center' },
  closeBracketText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  horizontalScroll: { flex: 1, backgroundColor: '#fff' },
  roundColumn: { flexDirection: 'column', alignItems: 'center', minWidth: 120, marginHorizontal: 16 },
  matchSpacer: { height: 32 },
  matchSpacerLarge: { height: 120 },
  matchBox: { borderRadius: 10, padding: 12, marginVertical: 8, minWidth: 100, minHeight: 60, justifyContent: 'center', borderWidth: 2 },
  playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 2 },
  playerName: { color: '#333', fontWeight: 'bold', fontSize: 15 },
  score: { color: '#6564c7', fontWeight: 'bold', fontSize: 15, marginLeft: 8 },
  winnerRow: { backgroundColor: '#edeaff', borderRadius: 6 },
  userStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, marginBottom: 8 },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#6564c7' },
  trophyRow: { flexDirection: 'row', alignItems: 'center' },
  trophyIcon: { width: 28, height: 28, marginRight: 6 },
  trophyCount: { fontSize: 18, fontWeight: 'bold', color: '#6564c7' },
  trophyRequirementRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  trophyIconSmall: { width: 18, height: 18, marginRight: 4 },
  trophyRequirementText: { fontSize: 15, color: '#6564c7', fontWeight: 'bold' },
});