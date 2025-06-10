import { ThemedText } from '@/components/ThemedText';
import { createClient } from '@supabase/supabase-js';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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
  const [customPageInput, setCustomPageInput] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<Problem[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

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

      // Get all problems for search functionality (if not already loaded)
      if (allProblems.length === 0) {
        const { data: allData } = await supabase
          .from('leetcode_problems')
          .select('id, leetcode_id, title, difficulty, tags, is_premium')
          .order('leetcode_id', { ascending: true });
        
        setAllProblems(allData || []);
      }

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

  const handleCustomPageNavigation = () => {
    const pageNumber = parseInt(customPageInput);
    if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
      Alert.alert(
        'Invalid Page',
        `Please enter a valid page number between 1 and ${totalPages}`,
        [{ text: 'OK' }]
      );
      return;
    }
    setCurrentPage(pageNumber);
    setCustomPageInput('');
  };

  const handleSearchToggle = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
      setSearchSuggestions([]);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    if (text.trim() === '') {
      setSearchSuggestions([]);
      return;
    }

    // Filter problems based on search query (limit to 6 suggestions)
    const filtered = allProblems
      .filter(problem => 
        problem.title.toLowerCase().includes(text.toLowerCase()) ||
        problem.leetcode_id.toString().includes(text) ||
        problem.difficulty.toLowerCase().includes(text.toLowerCase())
      )
      .slice(0, 6);
    
    setSearchSuggestions(filtered);
  };

  const handleSuggestionPress = (problem: Problem) => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchSuggestions([]);
    handleProblemPress(problem);
  };

  const sortProblems = (problems: Problem[], column: string, direction: 'asc' | 'desc'): Problem[] => {
    return [...problems].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (column) {
        case 'id':
          aValue = a.leetcode_id;
          bValue = b.leetcode_id;
          break;
        case 'name':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'difficulty':
          const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
          aValue = difficultyOrder[a.difficulty];
          bValue = difficultyOrder[b.difficulty];
          break;
        case 'status':
          const statusOrder = { 'Unsolved': 1, 'Progress': 2, 'Completed': 3 };
          aValue = statusOrder['Unsolved' as keyof typeof statusOrder];
          bValue = statusOrder['Unsolved' as keyof typeof statusOrder];
          break;
        default:
          return 0;
      }

      if (direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  const handleSort = (column: string) => {
    let newDirection: 'asc' | 'desc' | null;
    
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        newDirection = 'desc';
      } else if (sortDirection === 'desc') {
        newDirection = null;
      } else {
        newDirection = 'asc';
      }
    } else {
      newDirection = 'asc';
    }

    setSortColumn(newDirection ? column : null);
    setSortDirection(newDirection);

    if (newDirection) {
      const sorted = sortProblems(problems, column, newDirection);
      setProblems(sorted);
    } else {
      fetchProblems(currentPage);
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return ' ⇅';
    if (sortDirection === 'asc') return ' ↑';
    if (sortDirection === 'desc') return ' ↓';
    return ' ⇅';
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
        {!showSearch ? (
          <>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
            </TouchableOpacity>
            <ThemedText style={styles.title}>Problems</ThemedText>
            <TouchableOpacity onPress={handleSearchToggle} style={styles.searchIconButton}>
              <Image source={require('@/assets/images/icons/search-icon.png')} style={styles.searchIconImage} />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.fullSearchContainer}>
            <TextInput
              style={styles.fullSearchInput}
              placeholder="Search problems..."
              placeholderTextColor="#ccc"
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoFocus
            />
            <TouchableOpacity onPress={handleSearchToggle} style={styles.closeSearchButton}>
              <Image source={require('@/assets/images/icons/wrong-icon.png')} style={styles.closeSearchIcon} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Search Suggestions Dropdown */}
      {showSearch && searchSuggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView style={styles.suggestionsList} nestedScrollEnabled>
            {searchSuggestions.map((problem) => (
              <TouchableOpacity
                key={problem.id}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(problem)}
              >
                <View style={styles.suggestionContent}>
                  <ThemedText style={styles.suggestionId}>#{problem.leetcode_id}</ThemedText>
                  <ThemedText style={styles.suggestionTitle} numberOfLines={1}>
                    {problem.title}
                  </ThemedText>
                  <View style={[styles.suggestionDifficulty, { backgroundColor: getDifficultyColor(problem.difficulty) }]}>
                    <ThemedText style={styles.suggestionDifficultyText}>
                      {problem.difficulty}
                    </ThemedText>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      <View style={styles.tableHeader}>
        <TouchableOpacity 
          style={[styles.headerCell, { flex: 1.3 }]} 
          onPress={() => handleSort('id')}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.headerCellText}>ID{getSortIcon('id')}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.headerCell, { flex: 4 }]} 
          onPress={() => handleSort('name')}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.headerCellText}>Name{getSortIcon('name')}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.headerCell, { flex: 3.2 }]} 
          onPress={() => handleSort('difficulty')}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.headerCellText}>Difficulty{getSortIcon('difficulty')}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.headerCell, { flex: 2.5 }]} 
          onPress={() => handleSort('status')}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.headerCellText}>Status{getSortIcon('status')}</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.tableContainer}
        contentContainerStyle={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {problems.map((problem) => (
          <TouchableOpacity 
            key={problem.id}
            style={styles.row}
            onPress={() => handleProblemPress(problem)}
          >
            <ThemedText style={[styles.cell, { flex: 1.3 }]}>{problem.leetcode_id}</ThemedText>
            <View style={[styles.cell, styles.titleCell, { flex: 4 }]}>
              <ThemedText style={styles.titleText} numberOfLines={2} ellipsizeMode="tail">
                {problem.title}
              </ThemedText>
            </View>
            <View style={[
              styles.difficultyCell, 
              { 
                flex: 2.5,
                borderWidth: 1,
                borderColor: getDifficultyColor(problem.difficulty)
              }
            ]}>
              <ThemedText style={[styles.difficultyText, { color: getDifficultyColor(problem.difficulty) }]}>
                {problem.difficulty}
              </ThemedText>
            </View>
            <View style={[styles.statusCell, { flex: 2.5 }]}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor('Unsolved') }]}>
                <ThemedText style={styles.statusText}>Unsolved</ThemedText>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats Container */}
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
            ‹
          </ThemedText>
        </TouchableOpacity>

        <View style={styles.centerContainer}>
          <View style={styles.pageNumbersContainer}>
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 3) {
                pageNum = i + 1;
              } else if (currentPage <= 2) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 1) {
                pageNum = totalPages - 2 + i;
              } else {
                pageNum = currentPage - 1 + i;
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
          
          <View style={styles.customPageContainer}>
            <TextInput
              style={styles.customPageInput}
              placeholder="No."
              placeholderTextColor="#999"
              value={customPageInput}
              onChangeText={setCustomPageInput}
              keyboardType="numeric"
              maxLength={3}
              onSubmitEditing={handleCustomPageNavigation}
            />
            <TouchableOpacity 
              style={styles.goButton}
              onPress={handleCustomPageNavigation}
            >
              <ThemedText style={styles.goButtonText}>Go</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.paginationButton, currentPage === totalPages && styles.disabledButton]} 
          onPress={goToNextPage}
          disabled={currentPage === totalPages}
        >
          <ThemedText style={[styles.paginationButtonText, currentPage === totalPages && styles.disabledButtonText]}>
            ›
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
    justifyContent: 'space-between',
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
    flex: 1,
    marginLeft: 10,
  },
  searchIconButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  searchIconImage: {
    width: 20,
    height: 20,
  },
  fullSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  fullSearchInput: {
    width: '85%',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeSearchButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  closeSearchIcon: {
    width: 20,
    height: 20,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 300,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 1000,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1ecfd',
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestionId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6564c7',
    minWidth: 40,
  },
  suggestionTitle: {
    fontSize: 15,
    color: '#2d2d2d',
    flex: 1,
  },
  suggestionDifficulty: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  suggestionDifficultyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
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
    backgroundColor: '#F4EEFF',
    flexGrow: 1,
    flexShrink: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#897fef',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  headerCell: {
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCellText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1ecfd',
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    flexWrap: 'wrap',
  },
  titleCell: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    borderWidth: 2,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2d2d2d',
    textAlign: 'left',
    lineHeight: 20,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  difficultyCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 2,
    paddingVertical: 4,
    marginRight: 8,
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  statusCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 13,
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
    backgroundColor: '#fff',
  },
  paginationButton: {
    backgroundColor: '#6564c7',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#c7c1e9',
  },
  paginationButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
  disabledButtonText: {
    color: '#999',
  },
  centerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  pageNumbersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  customPageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customPageInput: {
    width: 60,
    height: 32,
    borderWidth: 1,
    borderColor: '#6564c7',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginRight: 8,
    textAlign: 'center',
    fontSize: 14,
    backgroundColor: '#fff',
  },
  goButton: {
    backgroundColor: '#6564c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  goButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
});