import { ThemedText } from '@/components/ThemedText';
import { router } from 'expo-router';
import { Image, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function DuelScreen() {
  const handleTournamentPress = () => {
    router.push('/screens/tournament');
  };

  const handleDuelPress = () => {
    router.push('/screens/duel');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>Battle Arena</ThemedText>
          <ThemedText style={styles.subtitle}>
            Compete in Tournaments & Duels
          </ThemedText>
        </View>

        {/* Battle Stats - Moved to Top */}
        <View style={styles.statsSection}>
          <ThemedText style={styles.sectionTitle}>Your Battle Stats</ThemedText>
          
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Image 
                  source={require('@/assets/images/icons/trophy-icon.png')} 
                  style={styles.statIcon}
                  tintColor="#8B5CF6"
                />
              </View>
              <ThemedText style={styles.statNumber}>0</ThemedText>
              <ThemedText style={styles.statLabel}>Tournaments</ThemedText>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Image 
                  source={require('@/assets/images/icons/duel-icon.png')} 
                  style={styles.statIcon}
                  tintColor="#8B5CF6"
                />
              </View>
              <ThemedText style={styles.statNumber}>0</ThemedText>
              <ThemedText style={styles.statLabel}>Duels Won</ThemedText>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Image 
                  source={require('@/assets/images/icons/fire-icon.png')} 
                  style={styles.statIcon}
                  tintColor="#8B5CF6"
                />
              </View>
              <ThemedText style={styles.statNumber}>0</ThemedText>
              <ThemedText style={styles.statLabel}>Win Rate</ThemedText>
            </View>
          </View>
        </View>

        {/* Competitive Modes */}
        <View style={styles.gameModesContainer}>
          <ThemedText style={styles.sectionTitle}>Competitive Modes</ThemedText>
          
          {/* Tournament Mode */}
          <TouchableOpacity style={styles.compactGameModeCard} onPress={handleTournamentPress}>
            <View style={styles.compactCardLeft}>
              <View style={[styles.compactIconContainer, { backgroundColor: '#8B5CF6' }]}>
                <Image 
                  source={require('@/assets/images/icons/tournament-icon.png')} 
                  style={styles.compactGameModeIcon}
                  tintColor="#FFFFFF"
                />
              </View>
              <View style={styles.compactCardContent}>
                <ThemedText style={styles.compactGameModeTitle}>Tournament</ThemedText>
                <ThemedText style={styles.compactGameModeDescription}>
                  Bracket-style competitions with multiple rounds
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.compactCardRight}>
              <View style={styles.compactStatusBadge}>
                <ThemedText style={styles.compactStatusText}>Soon</ThemedText>
              </View>
              <Image 
                source={require('@/assets/images/icons/up-arrow.png')} 
                style={styles.compactArrowIcon}
                tintColor="#8B5CF6"
              />
            </View>
          </TouchableOpacity>

          {/* Duel Mode */}
          <TouchableOpacity style={styles.compactGameModeCard} onPress={handleDuelPress}>
            <View style={styles.compactCardLeft}>
              <View style={[styles.compactIconContainer, { backgroundColor: '#A855F7' }]}>
                <Image 
                  source={require('@/assets/images/icons/duel-icon.png')} 
                  style={styles.compactGameModeIcon}
                  tintColor="#FFFFFF"
                />
              </View>
              <View style={styles.compactCardContent}>
                <ThemedText style={styles.compactGameModeTitle}>1v1 Duel</ThemedText>
                <ThemedText style={styles.compactGameModeDescription}>
                  Real-time coding battles against opponents
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.compactCardRight}>
              <View style={styles.compactStatusBadge}>
                <ThemedText style={styles.compactStatusText}>Soon</ThemedText>
              </View>
              <Image 
                source={require('@/assets/images/icons/up-arrow.png')} 
                style={styles.compactArrowIcon}
                tintColor="#A855F7"
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Coming Soon Features */}
        <View style={styles.comingSoonSection}>
          <ThemedText style={styles.sectionTitle}>Upcoming Features</ThemedText>
          
          <View style={styles.featurePreview}>
            <View style={styles.previewItem}>
              <Image 
                source={require('@/assets/images/icons/trophy-icon.png')} 
                style={styles.previewIcon}
                tintColor="#8B5CF6"
              />
              <View style={styles.previewContent}>
                <ThemedText style={styles.previewTitle}>Ranked Seasons</ThemedText>
                <ThemedText style={styles.previewDescription}>Compete in seasonal rankings with rewards</ThemedText>
              </View>
            </View>
            
            <View style={styles.previewItem}>
              <Image 
                source={require('@/assets/images/icons/fire-icon.png')} 
                style={styles.previewIcon}
                tintColor="#A855F7"
              />
              <View style={styles.previewContent}>
                <ThemedText style={styles.previewTitle}>Live Spectating</ThemedText>
                <ThemedText style={styles.previewDescription}>Watch battles in real-time</ThemedText>
              </View>
            </View>
            
            <View style={styles.previewItem}>
              <Image 
                source={require('@/assets/images/icons/star-icon.png')} 
                style={styles.previewIcon}
                tintColor="#C084FC"
              />
              <View style={styles.previewContent}>
                <ThemedText style={styles.previewTitle}>Custom Challenges</ThemedText>
                <ThemedText style={styles.previewDescription}>Create your own coding problems</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6FF', // Purple-tinted background
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 8,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  
  // Battle Stats Section
  statsSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    width: 18,
    height: 18,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Competitive Modes
  gameModesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  compactGameModeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  compactGameModeIcon: {
    width: 20,
    height: 20,
  },
  compactCardContent: {
    flex: 1,
  },
  compactGameModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  compactGameModeDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  compactCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactStatusBadge: {
    backgroundColor: '#F3F0FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  compactStatusText: {
    fontSize: 10,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  compactArrowIcon: {
    width: 16,
    height: 16,
    transform: [{ rotate: '90deg' }],
  },

  // Coming Soon Section
  comingSoonSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  featurePreview: {
    gap: 12,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  previewContent: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  previewDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  bottomSpacing: {
    height: 20,
  },
}); 