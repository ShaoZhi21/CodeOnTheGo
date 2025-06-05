import { ThemedText } from '@/components/ThemedText';
import { createClient } from '@supabase/supabase-js';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Problem {
  id: number;
  leetcode_id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  is_premium: boolean;
}

const PROBLEMS_PER_PAGE = 8;

const getDifficultyColor = (difficulty: Problem['difficulty']) => {
  switch (difficulty) {
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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Solved':
      return '#00B8A3';
    case 'Attempted':
      return '#FFA116';
    case 'Unsolved':
      return '#b4aaf4';
    default:
      return '#6564c7';
  }
};

export default function AllQuestionsScreen() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProblems, setTotalProblems] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.ceil(totalProblems / PROBLEMS_PER_PAGE);

  // Fetch problems from Supabase
  const fetchProblems = async (page: number) => {
    try {
      setLoading(true);
      setError(null);

      const offset = (page - 1) * PROBLEMS_PER_PAGE;

      // Get total count
      const { count } = await supabase
        .from('leetcode_problems')
        .select('*', { count: 'exact', head: true });

      setTotalProblems(count || 0);

      // Get problems for current page
      const { data, error } = await supabase
        .from('leetcode_problems')
        .select('id, leetcode_id, title, difficulty, tags, is_premium')
        .order('leetcode_id', { ascending: true })
        .range(offset, offset + PROBLEMS_PER_PAGE - 1);

      if (error) {
        throw error;
      }

      setProblems(data || []);
    } catch (err) {
      console.error('Error fetching problems:', err);
      setError('Failed to load problems. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems(currentPage);
  }, [currentPage]);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const handleProblemPress = (problem: Problem) => {
    router.push({
      pathname: '/screens/question',
      params: {
        id: problem.leetcode_id.toString(),
        name: problem.title,
        difficulty: problem.difficulty
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
          </TouchableOpacity>
          <ThemedText style={styles.title}>Problems</ThemedText>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6564c7" />
          <ThemedText style={styles.loadingText}>Loading problems...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
          </TouchableOpacity>
          <ThemedText style={styles.title}>Problems</ThemedText>
        </View>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchProblems(currentPage)}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <ThemedText style={styles.title}>Problems</ThemedText>
      </View>
      
      <View style={styles.tableHeader}>
        <ThemedText style={[styles.headerCell, { flex: 1 }]}>ID</ThemedText>
        <ThemedText style={[styles.headerCell, { flex: 4 }]}>Name</ThemedText>
        <ThemedText style={[styles.headerCell, { flex: 2.2 }]}>Difficulty</ThemedText>
        <ThemedText style={[styles.headerCell, { flex: 2 }]}>Status</ThemedText>
      </View>

      <ScrollView style={styles.tableContainer}>
        {problems.map((problem) => (
          <TouchableOpacity 
            key={problem.id}
            style={styles.row}
            onPress={() => handleProblemPress(problem)}
          >
            <ThemedText style={[styles.cell, { flex: 1 }]}>{problem.leetcode_id}</ThemedText>
            <View style={[styles.cell, { flex: 4 }]}>
              <ThemedText style={styles.titleText} numberOfLines={2}>
                {problem.title}
              </ThemedText>
            </View>
            <View style={[styles.cell, { flex: 2 }]}>
              <ThemedText style={[styles.difficultyText, { color: getDifficultyColor(problem.difficulty) }]}>
                {problem.difficulty}
              </ThemedText>
            </View>
            <View style={[styles.cell, { flex: 2 }]}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor('Unsolved') }]}>
                <ThemedText style={styles.statusText}>Unsolved</ThemedText>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats moved to bottom */}
      <View style={styles.statsContainer}>
        <ThemedText style={styles.statsText}>
          Showing {((currentPage - 1) * PROBLEMS_PER_PAGE) + 1}-{Math.min(currentPage * PROBLEMS_PER_PAGE, totalProblems)} of {totalProblems} problems
        </ThemedText>
        <ThemedText style={styles.pageText}>Page {currentPage} of {totalPages}</ThemedText>
      </View>

      {/* Pagination Controls */}
      <View style={styles.paginationContainer}>
        <TouchableOpacity 
          style={[styles.paginationButton, currentPage === 1 && styles.disabledButton]} 
          onPress={goToPreviousPage}
          disabled={currentPage === 1}
        >
          <ThemedText style={[styles.paginationButtonText, currentPage === 1 && styles.disabledButtonText]}>
            Previous
          </ThemedText>
        </TouchableOpacity>

        <View style={styles.pageNumbersContainer}>
          {/* Show page numbers around current page */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <TouchableOpacity
                key={pageNum}
                style={[
                  styles.pageNumberButton,
                  currentPage === pageNum && styles.activePageButton
                ]}
                onPress={() => goToPage(pageNum)}
              >
                <ThemedText
                  style={[
                    styles.pageNumberText,
                    currentPage === pageNum && styles.activePageText
                  ]}
                >
                  {pageNum}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity 
          style={[styles.paginationButton, currentPage === totalPages && styles.disabledButton]} 
          onPress={goToNextPage}
          disabled={currentPage === totalPages}
        >
          <ThemedText style={[styles.paginationButtonText, currentPage === totalPages && styles.disabledButtonText]}>
            Next
          </ThemedText>
        </TouchableOpacity>
      </View>
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
    padding: 16, 
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 10,
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
    tintColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    paddingTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1ecfd',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  pageText: {
    fontSize: 14,
    color: '#6564c7',
    fontWeight: '600',
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#F4EEFF',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#897fef',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  headerCell: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    paddingHorizontal: 5,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1ecfd',
    minHeight: 60,
    alignItems: 'center',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2d2d2d',
    textAlign: 'center',
  },
  difficultyText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
    width: 80,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6564c7',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF375F',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6564c7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 0,
    backgroundColor: '#fff',
  },
  paginationButton: {
    backgroundColor: '#6564c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#c7c1e9',
  },
  paginationButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButtonText: {
    color: '#999',
  },
  pageNumbersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageNumberButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1ecfd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePageButton: {
    backgroundColor: '#6564c7',
  },
  pageNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6564c7',
  },
  activePageText: {
    color: '#fff',
  },
});