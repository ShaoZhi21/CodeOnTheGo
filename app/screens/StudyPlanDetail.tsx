
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QuestionActionModal from '../../components/QuestionActionModal';

/* -------------------------------------------------------------------------- */
/*                                Types                                       */
/* -------------------------------------------------------------------------- */

interface Problem {
    id: number;
    leetcode_id: number;
    title: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    is_premium: boolean;
    description?: string;
}

interface SectionProblem {
    problem_id: number;
    order_index: number;
    problem: Problem;
    is_solved?: boolean;
}

interface Section {
    id: number;
    name: string;
    order_index: number;
    problems: SectionProblem[];
}

interface StudyPlan {
    id: number;
    name: string;
    description: string;
    image_url: string;
    sections: Section[];
}

/* -------------------------------------------------------------------------- */
/*                                Helpers                                     */
/* -------------------------------------------------------------------------- */

const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
        case 'Easy': return '#10B981'; // Green
        case 'Medium': return '#F59E0B'; // Amber
        case 'Hard': return '#EF4444'; // Red
        default: return '#6B7280';
    }
};

/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */

export default function StudyPlanDetail() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const planIdRequestParam = params.planId;
    // Handle array or string param
    const planId = Array.isArray(planIdRequestParam) ? planIdRequestParam[0] : planIdRequestParam;

    const [loading, setLoading] = useState(true);
    const [plan, setPlan] = useState<StudyPlan | null>(null);
    const scrollY = new Animated.Value(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
    const [userSkillLevel, setUserSkillLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');

    useEffect(() => {
        if (planId) {
            fetchPlanDetails();
        }
    }, [planId]);

    useEffect(() => {
        // Fetch user skill level for modal (map Professional -> Advanced)
        const loadSkill = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase
                .from('user_profiles')
                .select('skill_level')
                .eq('user_id', user.id)
                .single();
            const lvl = data?.skill_level;
            if (lvl === 'Intermediate' || lvl === 'Beginner') setUserSkillLevel(lvl);
            else setUserSkillLevel('Advanced');
        };
        loadSkill();
    }, []);

    const fetchPlanDetails = async () => {
        try {
            setLoading(true);
            console.log('📚 Fetching study plan:', planId);

            // 1. Fetch Plan Info
            const { data: planData, error: planError } = await supabase
                .from('study_plans')
                .select('*')
                .eq('id', planId)
                .single();

            if (planError) throw planError;

            // 2. Fetch Sections ordered
            const { data: sectionsData, error: sectionsError } = await supabase
                .from('study_plan_sections')
                .select('*')
                .eq('study_plan_id', planId)
                .order('order_index');

            if (sectionsError) throw sectionsError;

            // 3. Fetch Problems for Sections
            // We can fetch all problems linked to these sections
            const sectionIds = sectionsData.map(s => s.id);

            const { data: problemsData, error: problemsError } = await supabase
                .from('study_plan_problems')
                .select(`
          order_index,
          section_id,
          problem:leetcode_problems (
            id,
            leetcode_id,
            title,
            difficulty,
            is_premium,
            description
          )
        `)
                .in('section_id', sectionIds)
                .order('order_index');

            if (problemsError) throw problemsError;

            // 4. Fetch User Progress (Solved status)
            const { data: { user } } = await supabase.auth.getUser();
            let solvedProblemIds = new Set();

            if (user) {
                // Fetch from user_problem_progress
                // We need leetcode_ids from the problems above
                const leetcodeIds = problemsData
                    .map((p: any) => p.problem?.leetcode_id)
                    .filter((id) => id !== undefined);

                if (leetcodeIds.length > 0) {
                    const { data: progressData } = await supabase
                        .from('user_problem_progress')
                        .select('problem_id')
                        .eq('user_id', user.id)
                        .eq('is_solved', true)
                        .in('problem_id', leetcodeIds); // Assuming problem_id in progress table is leetcode_id (check schema!)

                    // Based on schema, user_problem_progress.problem_id REFERENCES leetcode_problems(leetcode_id)
                    if (progressData) {
                        progressData.forEach((p: any) => solvedProblemIds.add(p.problem_id));
                    }
                }
            }

            // 5. Structure Data
            const sectionsMap = new Map();
            sectionsData.forEach(s => {
                sectionsMap.set(s.id, { ...s, problems: [] });
            });

            problemsData.forEach((item: any) => {
                const section = sectionsMap.get(item.section_id);
                // Only add problems that have valid leetcode_id and title
                if (section && item.problem && item.problem.leetcode_id && item.problem.title) {
                    section.problems.push({
                        ...item,
                        is_solved: solvedProblemIds.has(item.problem.leetcode_id)
                    });
                } else {
                    console.warn('⚠️ Skipping problem with missing data:', item.problem);
                }
            });

            setPlan({
                ...planData,
                sections: Array.from(sectionsMap.values())
            });

        } catch (error) {
            console.error('❌ Error loading study plan:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProblemPress = (problem: Problem) => {
        if (!problem.leetcode_id || !problem.title) return;
        setSelectedProblem(problem);
        setModalVisible(true);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
        setSelectedProblem(null);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6564c7" />
                <ThemedText style={{ marginTop: 10, color: '#6564c7' }}>Loading Plan...</ThemedText>
            </SafeAreaView>
        );
    }

    if (!plan) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ThemedText>Plan not found</ThemedText>
            </SafeAreaView>
        );
    }

    // Calculate overall progress
    let totalProblems = 0;
    let solvedProblems = 0;
    plan.sections.forEach(s => {
        s.problems.forEach(p => {
            totalProblems++;
            if (p.is_solved) solvedProblems++;
        });
    });
    const progressPercent = totalProblems > 0 ? (solvedProblems / totalProblems) * 100 : 0;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ThemedText style={styles.backButtonText}>←</ThemedText>
                </TouchableOpacity>
                <ThemedText style={styles.headerTitle}>{plan.name}</ThemedText>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Plan Info Card */}
                <View style={styles.planInfoCard}>
                    <View style={styles.planHeaderRow}>
                        <Image
                            source={{ uri: plan.image_url || 'https://via.placeholder.com/64' }}
                            style={styles.planImage}
                        />
                        <View style={styles.planInfoText}>
                            <ThemedText style={styles.planDescription}>{plan.description}</ThemedText>

                            {/* Progress Bar */}
                            <View style={styles.progressContainer}>
                                <ThemedText style={styles.progressText}>
                                    {solvedProblems}/{totalProblems} Solved ({Math.round(progressPercent)}%)
                                </ThemedText>
                                <View style={styles.progressBarTrack}>
                                    <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Sections List */}
                <View style={styles.sectionsList}>
                    {plan.sections.map((section) => (
                        <View key={section.id} style={styles.sectionContainer}>
                            <ThemedText style={styles.sectionTitle}>{section.name}</ThemedText>

                            {section.problems.length === 0 ? (
                                <ThemedText style={styles.emptyText}>No problems in this section</ThemedText>
                            ) : (
                                section.problems
                                    .filter((item) => item.problem && item.problem.leetcode_id && item.problem.title)
                                    .map((item) => (
                                    <TouchableOpacity
                                        key={item.problem.leetcode_id || `problem-${item.problem_id}-${item.order_index}`}
                                        style={styles.problemRow}
                                        onPress={() => handleProblemPress(item.problem)}
                                    >
                                        <View style={styles.statusIcon}>
                                            {item.is_solved ? (
                                                <ThemedText style={{ color: '#10B981' }}>✓</ThemedText>
                                            ) : (
                                                <View style={styles.unsolvedDot} />
                                            )}
                                        </View>
                                        <View style={styles.problemInfo}>
                                            <ThemedText style={styles.problemTitle}>{item.problem.title}</ThemedText>
                                        </View>
                                        <View style={[
                                            styles.difficultyBadge,
                                            { backgroundColor: getDifficultyColor(item.problem.difficulty) + '20' } // 20 opacity
                                        ]}>
                                            <ThemedText style={[
                                                styles.difficultyText,
                                                { color: getDifficultyColor(item.problem.difficulty) }
                                            ]}>
                                                {item.problem.difficulty}
                                            </ThemedText>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    ))}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {selectedProblem && (
                <QuestionActionModal
                    visible={modalVisible}
                    onClose={handleCloseModal}
                    questionTitle={selectedProblem.title}
                    questionId={selectedProblem.leetcode_id}
                    questionDescription={selectedProblem.description || ''}
                    userSkillLevel={userSkillLevel}
                    hasCompletedLesson={false}
                    questionDifficulty={selectedProblem.difficulty}
                    isLessonRequired={false}
                    isQuestionSolved={false}
                    topicName={plan?.name || 'Study Plan'}
                    origin="studyplan"
                    planId={String(planId || '')}
                />
            )}

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        fontSize: 24,
        color: '#374151',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    scrollContent: {
        padding: 16,
    },

    // Plan Info
    planInfoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    planHeaderRow: {
        flexDirection: 'row',
        gap: 16,
    },
    planImage: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
    },
    planInfoText: {
        flex: 1,
    },
    planDescription: {
        fontSize: 14,
        color: '#4B5563',
        marginBottom: 12,
        lineHeight: 20,
    },

    // Progress
    progressContainer: {
        width: '100%',
    },
    progressText: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 6,
        fontWeight: '600',
    },
    progressBarTrack: {
        height: 6,
        backgroundColor: '#F3F4F6',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#6564c7',
        borderRadius: 3,
    },

    // Sections
    sectionsList: {
        gap: 20,
    },
    sectionContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 13,
        color: '#9CA3AF',
        fontStyle: 'italic',
    },

    // Problems
    problemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    statusIcon: {
        width: 24,
        alignItems: 'center',
        marginRight: 8,
    },
    unsolvedDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    problemInfo: {
        flex: 1,
    },
    problemTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    difficultyBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginLeft: 8,
    },
    difficultyText: {
        fontSize: 10,
        fontWeight: '600',
    },
});
