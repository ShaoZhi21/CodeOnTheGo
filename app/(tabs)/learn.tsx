
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Neutral, Purple } from '../../constants/Colors';

/* -------------------------------------------------------------------------- */
/*                                Types                                       */
/* -------------------------------------------------------------------------- */

interface StudyPlan {
  id: number;
  name: string;
  description: string;
  image_url: string;
  total_problems?: number;
  solved_problems?: number;
}

/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */

export default function LearnScreen() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState({ totalSolved: 0, streak: 0 });
  const [planSort, setPlanSort] = useState<'featured' | 'short' | 'long'>('featured');

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      // 1. Fetch Plans
      const { data: plansData, error: plansError } = await supabase
        .from('study_plans')
        .select('*')
        .order('id');

      if (plansError) throw plansError;

      // 2. Fetch User Stats (Total Solved)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get total solved count
        const { count } = await supabase
          .from('user_problem_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_solved', true);

        // Get streak (mocked for now or fetch from profile)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('current_streak')
          .eq('user_id', user.id)
          .single();

        setUserStats({
          totalSolved: count || 0,
          streak: profile?.current_streak || 0
        });
      }

      setPlans(plansData || []);
    } catch (error) {
      console.error('❌ Error fetching learn data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handlePlanPress = (plan: StudyPlan) => {
    router.push({
      pathname: '/screens/StudyPlanDetail',
      params: { planId: plan.id }
    });
  };

  const PlanCard = ({ plan, index }: { plan: StudyPlan; index: number }) => {
    // Subtle purple/white gradients that stay within the theme
    const colors = ([
      [Purple.tint, Neutral.white],
      [Neutral.white, Purple.tint],
      [Neutral.white, '#F8F9FA'],
    ] as const)[index % 3];

    const progress = plan.total_problems
      ? Math.min(100, Math.round(((plan.solved_problems || 0) / plan.total_problems) * 100))
      : 0;

    return (
      <TouchableOpacity
        style={styles.cardContainer}
        activeOpacity={0.9}
        onPress={() => handlePlanPress(plan)}
      >
        <View style={styles.timeline}>
          <View style={styles.timelineNode}>
            <ThemedText style={styles.timelineIndex}>{index + 1}</ThemedText>
          </View>
          <View style={styles.timelineLine} />
        </View>

        <LinearGradient colors={colors} style={styles.cardContent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.cardHeader}>
            <View style={styles.cardMeta}>
              <ThemedText style={styles.cardLabel}>Study plan</ThemedText>
              <ThemedText style={styles.cardTitle}>{plan.name}</ThemedText>
              <ThemedText style={styles.cardDescription} numberOfLines={2}>
                {plan.description}
              </ThemedText>
            </View>
            <Image
              source={{ uri: plan.image_url || 'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=400&q=60' }}
              style={styles.cardImage}
            />
          </View>

          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <ThemedText style={styles.progressText}>{progress}%</ThemedText>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6564c7" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6564c7" />
        }
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <ThemedText style={styles.headerTitle}>Study Plans</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Choose a learning path to get started
          </ThemedText>
          
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <ThemedText style={styles.statLabel}>Solved</ThemedText>
              <ThemedText style={styles.statValue}>{userStats.totalSolved}</ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={styles.statLabel}>Plans</ThemedText>
              <ThemedText style={styles.statValue}>{plans.length}</ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={styles.statLabel}>Streak</ThemedText>
              <ThemedText style={styles.statValue}>{userStats.streak}</ThemedText>
            </View>
          </View>
        </View>

        {/* Sort toggles */}
        <View style={styles.sortRow}>
          {(['featured', 'short', 'long'] as const).map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.sortChip, planSort === option && styles.sortChipActive]}
              onPress={() => setPlanSort(option)}
            >
              <ThemedText style={[styles.sortChipText, planSort === option && styles.sortChipTextActive]}>
                {option === 'featured' ? 'Featured' : option === 'short' ? 'Quick wins' : 'Deep dives'}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Plans by study vibe</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>Glanceable cards, organized like a feed.</ThemedText>
        </View>

        {/* Plans List */}
        <View style={styles.plansList}>
          {plans.length > 0 ? (
            [...plans]
              .sort((a, b) => {
                if (planSort === 'short') {
                  return (a.total_problems || 0) - (b.total_problems || 0);
                }
                if (planSort === 'long') {
                  return (b.total_problems || 0) - (a.total_problems || 0);
                }
                return a.id - b.id;
              })
              .map((plan, index) => (
                <PlanCard key={plan.id} plan={plan} index={index} />
              ))
          ) : (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>No study plans available yet.</ThemedText>
            </View>
          )}
        </View>

        {/* Helper Note */}
        <View style={styles.noteContainer}>
          <ThemedText style={styles.noteText}>
            More study plans coming soon! We focus on quality over quantity.
          </ThemedText>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Neutral.white,
  },
  safeArea: {
    backgroundColor: Neutral.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 48,
  },

  // Header Section
  headerSection: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Neutral.text,
    marginBottom: 8,
    paddingTop: 8
  },
  headerSubtitle: {
    fontSize: 15,
    color: Neutral.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Purple.tint,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Neutral.border,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Neutral.textSecondary,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Purple.primary,
  },

  sortRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  sortChip: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: Purple.tint,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Neutral.border,
  },
  sortChipActive: {
    backgroundColor: Purple.primary,
    borderColor: Purple.primary,
  },
  sortChipText: {
    color: Neutral.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  sortChipTextActive: {
    color: Neutral.white,
  },

  sectionHeader: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Neutral.text,
  },
  sectionSubtitle: {
    marginTop: 4,
    color: Neutral.textSecondary,
    fontSize: 14,
  },

  plansList: {
    gap: 14,
    paddingBottom: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
  },

  cardContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  timeline: {
    width: 28,
    alignItems: 'center',
  },
  timelineNode: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Purple.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  timelineIndex: {
    color: Neutral.white,
    fontWeight: '800',
    fontSize: 13,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: Neutral.border,
    marginTop: 4,
    borderRadius: 999,
  },

  cardContent: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Neutral.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
    backgroundColor: Neutral.white,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMeta: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Neutral.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Neutral.text,
    marginTop: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: Neutral.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  cardImage: {
    width: 68,
    height: 68,
    borderRadius: 16,
    marginLeft: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 12,
    backgroundColor: Neutral.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 12,
    backgroundColor: Purple.primary,
  },
  progressText: {
    marginLeft: 10,
    fontWeight: '700',
    color: Neutral.text,
    fontSize: 14,
  },

  noteContainer: {
    marginTop: 30,
    marginBottom: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  noteText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
