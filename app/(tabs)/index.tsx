import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { router, useFocusEffect } from "expo-router";
import { ThemedText } from "../../components/ThemedText";
import { DailyChallengeService } from "../../lib/services/dailyChallengeService";
import { ProfileService } from "../../lib/services/profileService";
import { supabase } from "../../lib/supabase";
import type { UserProfileStats } from "../../lib/types/profile";

interface TopicProgress {
  name: string;
  completion_percentage: number;
  lastEdited: string;
}

interface DailyStats {
  streak: number;
  todayProblems: number;
  totalProblems: number;
  totalSolved: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
}

interface DailyChallenge {
  date: string;
  problemId: number;
  problemTitle: string;
  completed: boolean;
}

interface RecapLesson {
  problem_id: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  completed_at: string;
}

export default function HomeScreen() {
  console.log("HomeScreen component loaded");
  const [profile, setProfile] = useState<UserProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [topicsInProgress, setTopicsInProgress] = useState<TopicProgress[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    streak: 0,
    todayProblems: 0,
    totalProblems: 0,
    totalSolved: 0,
    easyCount: 0,
    mediumCount: 0,
    hardCount: 0,
  });
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(
    null,
  );
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [recapLessons, setRecapLessons] = useState<RecapLesson[]>([]);

  const loadProfile = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const stats = await ProfileService.getUserProfileStats(user.id);
      if (stats) {
        setProfile(stats);
        setDailyStats((prev) => ({
          ...prev,
          streak: stats.current_streak || prev.streak,
        }));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }, []);

  const loadDailyChallenge = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const challenge = await DailyChallengeService.getOrGenerateTodayChallenge(
        user.id,
      );
      if (challenge) {
        const mapped: DailyChallenge = {
          date: challenge.challenge_date,
          problemId: challenge.problem_id,
          problemTitle: challenge.problem_title,
          completed: challenge.completed,
        };
        setDailyChallenge(mapped);
      }
    } catch (error) {
      console.error("Error loading daily challenge:", error);
    }
  }, []);

  const fetchRecapLessons = useCallback(async () => {
    // Placeholder for recap lessons; keep empty to avoid errors
    setRecapLessons([]);
  }, []);

  const handleRandomQuestion = useCallback(async () => {
    try {
      setChallengeLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(
          "Login required",
          "Please sign in to start the daily challenge.",
        );
        return;
      }
      const challenge =
        dailyChallenge ||
        (await DailyChallengeService.getOrGenerateTodayChallenge(user.id));
      if (challenge) {
        const mapped: DailyChallenge = dailyChallenge || {
          date: challenge.challenge_date,
          problemId: challenge.problem_id,
          problemTitle: challenge.problem_title,
          completed: challenge.completed,
        };
        setDailyChallenge(mapped);
        router.push(
          `/screens/dailyRoulette?problemId=${mapped.problemId}&title=${encodeURIComponent(mapped.problemTitle)}`,
        );
      }
    } catch (error) {
      console.error("Error handling daily challenge:", error);
      Alert.alert("Error", "Unable to open daily challenge right now.");
    } finally {
      setChallengeLoading(false);
    }
  }, [dailyChallenge]);

  const handleTopicClick = (topicName: string) => {
    // Open the original topic roadmap flow (topic bubbles / roadmap screen)
    router.push({
      pathname: "/screens/LoadingRoadMap",
      params: {
        topicName,
        from: "home",
      },
    });
  };

  const handleRecapClick = (lesson: RecapLesson) => {
    router.push("/(tabs)/questions");
  };

  const loadDailyStats = useCallback(async () => {
    try {
      console.log("🔄 loadDailyStats: Starting...");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.log("❌ loadDailyStats: No user found");
        return;
      }

      // Get user's solved problems with problem details
      const { data: solvedData } = await supabase
        .from("user_problem_progress")
        .select(
          `
          problem_id, 
          is_solved, 
          created_at,
          leetcode_problems (
            difficulty
          )
        `,
        )
        .eq("user_id", user.id)
        .eq("is_solved", true);

      const totalSolved = solvedData?.length || 0;

      // Get today's solved problems
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayProblems =
        solvedData?.filter((item) => {
          const itemDate = new Date(item.created_at);
          itemDate.setHours(0, 0, 0, 0);
          return itemDate.getTime() === today.getTime();
        }).length || 0;

      // Get all problems data in one query
      const { data: allProblems } = await supabase
        .from("leetcode_problems")
        .select("difficulty");

      // Use actual LeetCode count if our database is incomplete
      const totalProblems = Math.max(allProblems?.length || 0, 3500);

      // Calculate dynamic difficulty counts based on user's solved problems
      const userEasyCount =
        solvedData?.filter(
          (item) =>
            item.leetcode_problems &&
            (item.leetcode_problems as any).difficulty === "Easy",
        ).length || 0;
      const userMediumCount =
        solvedData?.filter(
          (item) =>
            item.leetcode_problems &&
            (item.leetcode_problems as any).difficulty === "Medium",
        ).length || 0;
      const userHardCount =
        solvedData?.filter(
          (item) =>
            item.leetcode_problems &&
            (item.leetcode_problems as any).difficulty === "Hard",
        ).length || 0;

      const newDailyStats = {
        streak: profile?.current_streak || 0,
        todayProblems,
        totalProblems,
        totalSolved,
        easyCount: userEasyCount,
        mediumCount: userMediumCount,
        hardCount: userHardCount,
      };

      console.log("📊 loadDailyStats: Updated daily stats:", {
        streak: newDailyStats.streak,
        profile_streak: profile?.current_streak,
        todayProblems: newDailyStats.todayProblems,
        totalSolved: newDailyStats.totalSolved,
      });

      setDailyStats(newDailyStats);
    } catch (error) {
      console.error("❌ loadDailyStats: Error loading daily stats:", error);
    }
  }, [profile]);

  const loadTopicsProgress = useCallback(async () => {
    try {
      console.log("Loading topics progress");

      // Get user ID first
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("No user found");
        return;
      }

      // Get all topics and their stats
      const { data: topicStats, error: statsError } = await supabase
        .from("topic_stats")
        .select("*")
        .eq("user_id", user.id);

      if (statsError) {
        console.error("Error loading topic stats:", statsError);
        return;
      }

      // Convert to TopicProgress format and sort by completion percentage
      const progress = topicStats
        .map(
          (stat): TopicProgress => ({
            name: stat.topic_name,
            completion_percentage: stat.completion_percentage || 0,
            lastEdited: new Date().toISOString(),
          }),
        )
        .sort((a, b) => b.completion_percentage - a.completion_percentage)
        .slice(0, 3); // Show only top 3 topics

      console.log("Topics progress loaded:", progress);
      setTopicsInProgress(progress);
    } catch (error) {
      console.error("Error loading topics progress:", error);
    }
  }, []);

  // Refresh data when screen comes into focus (e.g., after lesson/quiz completion)
  useFocusEffect(
    useCallback(() => {
      console.log("🎯 HomeScreen: Screen focused, refreshing data");
      loadProfile();
      loadTopicsProgress();
      loadDailyChallenge();
      fetchRecapLessons();
    }, [loadTopicsProgress]),
  );

  // Ensure loading is set to false after a timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log("⚠️ Loading timeout reached, setting loading to false");
        setLoading(false);
      }
    }, 3000); // 3 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => router.push("/(tabs)/profile")}
              activeOpacity={0.85}
            >
              <Image
                source={require("../../assets/images/icons/profile-icon.png")}
                style={styles.avatarIcon}
              />
            </TouchableOpacity>
            <View style={styles.streakPill}>
              <Image
                source={require("../../assets/images/icons/fire-icon.png")}
                style={styles.streakIcon}
              />
              <ThemedText style={styles.streakCount}>
                {dailyStats.streak}
              </ThemedText>
              <ThemedText style={styles.streakLabel}>day streak</ThemedText>
            </View>
          </View>

          <ThemedText style={styles.heroGreeting}>Hey, coder 👋</ThemedText>
          <ThemedText style={styles.heroTitle}>
            Let's keep your momentum
          </ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            Clean, social-style feed for plans, challenges, and quick wins.
          </ThemedText>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionChip, styles.actionPrimary]}
              onPress={() => router.push("/(tabs)/learn")}
            >
              <ThemedText style={styles.actionTextPrimary}>Plans</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionChip}
              onPress={handleRandomQuestion}
              disabled={challengeLoading}
            >
              <ThemedText style={styles.actionText}>
                {challengeLoading ? "Loading…" : "Daily challenge"}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionChip}
              onPress={() => router.push("/(tabs)/questions")}
            >
              <ThemedText style={styles.actionText}>All questions</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <ThemedText style={styles.heroStatLabel}>Solved</ThemedText>
              <ThemedText style={styles.heroStatValue}>
                {dailyStats.totalSolved}
              </ThemedText>
            </View>
            <View style={styles.heroStat}>
              <ThemedText style={styles.heroStatLabel}>Today</ThemedText>
              <ThemedText style={styles.heroStatValue}>
                {dailyStats.todayProblems}
              </ThemedText>
            </View>
            <View style={styles.heroStat}>
              <ThemedText style={styles.heroStatLabel}>XP</ThemedText>
              <ThemedText style={styles.heroStatValue}>
                {profile?.total_xp || 0}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              Continue your path
            </ThemedText>
            <TouchableOpacity onPress={() => router.push("/(tabs)/learn")}>
              <ThemedText style={styles.sectionLink}>See plans</ThemedText>
            </TouchableOpacity>
          </View>
          {topicsInProgress.length > 0 ? (
            topicsInProgress.map((topic, index) => (
              <TouchableOpacity
                key={index}
                style={styles.planCard}
                onPress={() => handleTopicClick(topic.name)}
                activeOpacity={0.9}
              >
                <View style={styles.planCardTop}>
                  <ThemedText style={styles.planCardTitle}>
                    {topic.name}
                  </ThemedText>
                  <ThemedText style={styles.planCardPercent}>
                    {Math.round(topic.completion_percentage)}%
                  </ThemedText>
                </View>
                <View style={styles.planProgressBar}>
                  <View
                    style={[
                      styles.planProgressFill,
                      { width: `${topic.completion_percentage}%` },
                    ]}
                  />
                </View>
                <ThemedText style={styles.planCardHint}>
                  Tap to jump back in
                </ThemedText>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <ThemedText style={styles.emptyCardText}>
                Pick a plan to start your path.
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              Today's challenge
            </ThemedText>
            <TouchableOpacity onPress={handleRandomQuestion}>
              <ThemedText style={styles.sectionLink}>Spin →</ThemedText>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.challengeCard}
            onPress={handleRandomQuestion}
            activeOpacity={0.9}
          >
            <ThemedText style={styles.challengeBadge}>Daily</ThemedText>
            <ThemedText style={styles.challengeTitle}>
              {dailyChallenge?.problemTitle ||
                "Generate today's random question"}
            </ThemedText>
            <ThemedText style={styles.challengeSubtitle}>
              1 question, resets every day
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Recap</ThemedText>
            <TouchableOpacity onPress={() => router.push("/(tabs)/questions")}>
              <ThemedText style={styles.sectionLink}>
                Go to questions
              </ThemedText>
            </TouchableOpacity>
          </View>
          {recapLessons.length > 0 ? (
            recapLessons.slice(0, 3).map((lesson, idx) => (
              <View key={idx} style={styles.recapCard}>
                <View style={styles.recapTopRow}>
                  <ThemedText style={styles.recapDifficulty}>
                    {lesson.difficulty}
                  </ThemedText>
                  <ThemedText style={styles.recapDate}>
                    {new Date(lesson.completed_at).toLocaleDateString()}
                  </ThemedText>
                </View>
                <ThemedText style={styles.recapTitle}>
                  {lesson.title}
                </ThemedText>
                <TouchableOpacity
                  style={styles.recapButton}
                  onPress={() => handleRecapClick(lesson)}
                >
                  <ThemedText style={styles.recapButtonText}>Review</ThemedText>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <ThemedText style={styles.emptyCardText}>
                Solve a few questions to unlock recaps.
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.primaryCTA}
            onPress={() => router.push("/(tabs)/questions")}
          >
            <ThemedText style={styles.primaryCTAText}>
              Browse all questions
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6564c7",
    fontWeight: "600",
  },
  hero: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatarIcon: {
    width: 24,
    height: 24,
    tintColor: "#4B5563",
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  streakIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
  },
  streakCount: {
    color: "#FB923C",
    fontWeight: "800",
    fontSize: 18,
    marginRight: 4,
  },
  streakLabel: {
    color: "#F97316",
    fontWeight: "600",
    fontSize: 12,
  },
  heroGreeting: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "700",
  },
  heroTitle: {
    color: "#0F172A",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 4,
  },
  heroSubtitle: {
    color: "#4B5563",
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: "row",
    marginTop: 14,
    columnGap: 8,
  },
  actionChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  actionPrimary: {
    backgroundColor: "#6564c7",
    borderColor: "#6564c7",
  },
  actionText: {
    color: "#111827",
    fontWeight: "700",
  },
  actionTextPrimary: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  heroStatsRow: {
    flexDirection: "row",
    marginTop: 18,
    columnGap: 10,
  },
  heroStat: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  heroStatLabel: {
    color: "#6B7280",
    fontSize: 12,
    marginBottom: 4,
  },
  heroStatValue: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 18,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 22,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },
  sectionLink: {
    color: "#6564c7",
    fontWeight: "700",
    fontSize: 13,
  },
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
  },
  planCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planCardTitle: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  planCardPercent: {
    color: "#2563EB",
    fontWeight: "800",
    fontSize: 14,
  },
  planProgressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 10,
  },
  planProgressFill: {
    height: "100%",
    backgroundColor: "#6564c7",
    borderRadius: 12,
  },
  planCardHint: {
    color: "#4B5563",
    marginTop: 8,
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyCardText: {
    color: "#6B7280",
    textAlign: "center",
  },
  challengeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  challengeBadge: {
    color: "#6564c7",
    fontWeight: "800",
    fontSize: 12,
  },
  challengeTitle: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 18,
    marginTop: 6,
  },
  challengeSubtitle: {
    color: "#4B5563",
    marginTop: 6,
  },
  recapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
  },
  recapTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recapDifficulty: {
    color: "#F97316",
    fontWeight: "700",
    fontSize: 12,
  },
  recapDate: {
    color: "#6B7280",
    fontSize: 12,
  },
  recapTitle: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 16,
    marginTop: 8,
  },
  recapButton: {
    marginTop: 10,
    backgroundColor: "#6564c7",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  recapButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  primaryCTA: {
    backgroundColor: "#6564c7",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  primaryCTAText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
});
