import { ThemedText } from '@/components/ThemedText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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

interface ProblemWithStatus extends Problem {
  status: 'Solved' | 'Unsolved';
  score?: number;
  stars?: number;
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
    case 'Unsolved':
      return '#b4aaf4';
    default:
      return '#6564c7';
  }
};

export default function AllQuestionsScreen() {
  const [problems, setProblems] = useState<ProblemWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shouldRefreshStatus, setShouldRefreshStatus] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(false);
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Sorting options
  const [sortOption, setSortOption] = useState<'id-asc' | 'id-desc' | 'name-asc' | 'difficulty-asc' | 'difficulty-desc' | 'status-asc'>('id-asc');
  const [showSortOptions, setShowSortOptions] = useState(false);
  
  // Scroll position tracking
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const lastScrollPosition = useRef(0);
  
  // Animation refs for loading dots
  const dot1Anim = useRef(new Animated.Value(0.4)).current;
  const dot2Anim = useRef(new Animated.Value(0.7)).current;
  const dot3Anim = useRef(new Animated.Value(1)).current;

  // Cache keys
  const CACHE_KEY = 'questions_cache';
  const CACHE_TIMESTAMP_KEY = 'questions_cache_timestamp';
  const SCROLL_POSITION_KEY = 'questions_scroll_position';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Debug totalPages calculation
  useEffect(() => {
    console.log('🔄 Total problems loaded:', problems.length);
  }, [problems.length]);

  // Save scroll position to AsyncStorage
  const saveScrollPosition = async (position: number) => {
    try {
      await AsyncStorage.setItem(SCROLL_POSITION_KEY, position.toString());
    } catch (error) {
      console.error('Error saving scroll position:', error);
    }
  };

  // Load scroll position from AsyncStorage
  const loadScrollPosition = async (): Promise<number> => {
    try {
      const position = await AsyncStorage.getItem(SCROLL_POSITION_KEY);
      return position ? parseInt(position) : 0;
    } catch (error) {
      console.error('Error loading scroll position:', error);
      return 0;
    }
  };

  // Handle scroll events
  const handleScroll = (event: any) => {
    const currentPosition = event.nativeEvent.contentOffset.y;
    lastScrollPosition.current = currentPosition;
    setScrollPosition(currentPosition);
    
    // Debounce scroll position saving to avoid excessive writes
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    scrollTimeout.current = setTimeout(() => {
      saveScrollPosition(currentPosition);
    }, 100);
  };

  // Scroll timeout ref for debouncing
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore scroll position when problems are loaded
  useEffect(() => {
    if (problems.length > 0 && scrollViewRef.current) {
      const restorePosition = async () => {
        const savedPosition = await loadScrollPosition();
        if (savedPosition > 0) {
          // Small delay to ensure the ScrollView is fully rendered
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({
              y: savedPosition,
              animated: false
            });
          }, 100);
        }
      };
      restorePosition();
    }
  }, [problems.length]);

  // Clear scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  // Animate loading dots
  useEffect(() => {
    if (isSearching) {
      const animateDots = () => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(dot1Anim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(dot2Anim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
            Animated.timing(dot3Anim, { toValue: 0.7, duration: 600, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(dot1Anim, { toValue: 0.7, duration: 600, useNativeDriver: true }),
            Animated.timing(dot2Anim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(dot3Anim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(dot1Anim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
            Animated.timing(dot2Anim, { toValue: 0.7, duration: 600, useNativeDriver: true }),
            Animated.timing(dot3Anim, { toValue: 1, duration: 600, useNativeDriver: true }),
          ]),
        ]).start(() => {
          if (isSearching) {
            animateDots();
          }
        });
      };
      animateDots();
    } else {
      // Reset dots when not searching
      dot1Anim.setValue(0.4);
      dot2Anim.setValue(0.7);
      dot3Anim.setValue(1);
    }
  }, [isSearching, dot1Anim, dot2Anim, dot3Anim]);

  // Load from cache first, then fetch fresh data
  const loadQuestionsWithCache = async (search: string = '') => {
    try {
      // Try to load from cache first
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      const cacheTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedData && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp);
        const isCacheValid = Date.now() - timestamp < CACHE_DURATION;
        
        if (isCacheValid) {
          console.log('📦 Loading from cache...');
          setIsLoadingFromCache(true);
          const cachedProblems = JSON.parse(cachedData);
          
          // Apply search filter to cached data
          let filteredProblems = cachedProblems;
          if (search.trim()) {
            const searchLower = search.toLowerCase();
            filteredProblems = cachedProblems.filter((problem: ProblemWithStatus) =>
              problem.title.toLowerCase().includes(searchLower) ||
              problem.leetcode_id.toString().includes(search)
            );
          }
          
          // Apply sorting to cached data
          const [sortField, sortOrder] = sortOption.split('-');
          if (sortField === 'status') {
            filteredProblems.sort((a: ProblemWithStatus, b: ProblemWithStatus) => {
              const statusOrder = { 'Unsolved': 1, 'Solved': 2 };
              const aOrder = statusOrder[a.status as keyof typeof statusOrder];
              const bOrder = statusOrder[b.status as keyof typeof statusOrder];
              return sortOrder === 'asc' ? aOrder - bOrder : bOrder - aOrder;
            });
          }
          
          setProblems(filteredProblems);
          setLoading(false);
          setIsLoadingFromCache(false);
          
          // Fetch fresh data in background if cache is older than 2 minutes
          if (Date.now() - timestamp > 2 * 60 * 1000) {
            console.log('🔄 Cache is getting stale, fetching fresh data in background...');
            fetchProblems(search, true); // true = background fetch
          }
          return;
        }
      }
      
      // No valid cache, fetch fresh data
      console.log('🔄 No valid cache, fetching fresh data...');
      await fetchProblems(search, false);
    } catch (error) {
      console.error('Error loading from cache:', error);
      // Fallback to fresh fetch
      await fetchProblems(search, false);
    }
  };

  // Save to cache
  const saveToCache = async (problemsData: ProblemWithStatus[]) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(problemsData));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('💾 Saved to cache');
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  // Fetch problems from Supabase with search
  const fetchProblems = async (search: string = '', backgroundFetch: boolean = false) => {
    try {
      console.log('🔄 fetchProblems called - search:', search, 'sortOption:', sortOption, 'background:', backgroundFetch);
      console.log('🔄 Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
      console.log('🔄 Supabase Key:', supabaseKey ? 'Set' : 'Missing');
      
      if (!backgroundFetch) {
        setLoading(true);
      }
      setError(null);

      // Build query
      let query = supabase
        .from('leetcode_problems')
        .select('id, leetcode_id, title, difficulty, tags, is_premium');

      // Add search filter if provided
      if (search.trim()) {
        query = query.or(`title.ilike.%${search}%,leetcode_id.eq.${parseInt(search) || 0}`);
      }

      // Add sorting based on sortOption
      const [sortField, sortOrder] = sortOption.split('-');
      let orderField: string;
      let ascending: boolean;

      switch (sortField) {
        case 'id':
          orderField = 'leetcode_id';
          ascending = sortOrder === 'asc';
          break;
        case 'name':
          orderField = 'title';
          ascending = true;
          break;
        case 'difficulty':
          orderField = 'difficulty';
          ascending = sortOrder === 'asc';
          break;
        case 'status':
          // Status sorting will be done after fetching user progress
          orderField = 'leetcode_id';
          ascending = true;
          break;
        default:
          orderField = 'leetcode_id';
          ascending = true;
      }

      query = query.order(orderField, { ascending });

      // Test query to check if table exists and has data
      const { data: testData, error: testError } = await supabase
        .from('leetcode_problems')
        .select('id')
        .limit(1);
      
      console.log('🔄 Test query - data:', testData?.length || 0, 'error:', testError);
      
      if (testError) {
        console.error('🔄 Test query error:', testError);
        throw testError;
      }

      // Get total count with search
      let countQuery = supabase
        .from('leetcode_problems')
        .select('*', { count: 'exact', head: true });
      
      // Add search filter if provided
      if (search.trim()) {
        countQuery = countQuery.or(`title.ilike.%${search}%,leetcode_id.eq.${parseInt(search) || 0}`);
      }

      const { count, error: countError } = await countQuery;
      console.log('🔄 Total problems count:', count, 'countError:', countError);
      
      if (countError) {
        console.error('🔄 Count query error:', countError);
        throw countError;
      }
      
      // Get problems for current page with search
      const { data, error } = await query;

      console.log('🔄 Fetched problems data length:', data?.length || 0, 'error:', error);

      if (error) {
        throw error;
      }

      const problemsData = data || [];

      // Get user progress for these problems
      const { getUserProgressForProblems } = await import('@/lib/services/userProgress');
      const problemIds = problemsData.map(p => p.leetcode_id);
      
      console.log('🔍 FETCH PROBLEMS - Getting progress for problem IDs:', problemIds);
      
      const progressMap = await getUserProgressForProblems(problemIds);

      console.log('🔍 FETCH PROBLEMS - Raw progress map:', JSON.stringify(progressMap, null, 2));

      // Combine problems with their status
      let problemsWithStatus: ProblemWithStatus[] = problemsData.map(problem => {
        const progress = progressMap[problem.leetcode_id];
        
        console.log(`🔍 FETCH PROBLEMS - Problem ${problem.leetcode_id}:`, {
          progress,
          score: progress?.score,
          stars: progress?.stars,
          scoreType: typeof progress?.score,
          starsType: typeof progress?.stars
        });

        return {
          ...problem,
          status: progress?.is_solved ? 'Solved' : 'Unsolved',
          score: progress?.score,
          stars: progress?.stars
        };
      });

      // Sort by status if that's the selected option
      if (sortField === 'status') {
        problemsWithStatus.sort((a, b) => {
          const statusOrder = { 'Unsolved': 1, 'Solved': 2 };
          const aOrder = statusOrder[a.status as keyof typeof statusOrder];
          const bOrder = statusOrder[b.status as keyof typeof statusOrder];
          return ascending ? aOrder - bOrder : bOrder - aOrder;
        });
      }

      console.log('🔍 FETCH PROBLEMS - Final problems with status:', problemsWithStatus.map(p => ({
        id: p.leetcode_id,
        title: p.title,
        status: p.status,
        score: p.score,
        stars: p.stars
      })));

      // Save to cache if this is a full fetch (not search-specific)
      if (!search.trim() && !backgroundFetch) {
        await saveToCache(problemsWithStatus);
      }

      setProblems(problemsWithStatus);
    } catch (err) {
      console.error('Error fetching problems:', err);
      if (!backgroundFetch) {
        setError('Failed to load problems. Please try again.');
      }
    } finally {
      if (!backgroundFetch) {
        setLoading(false);
      }
      setIsSearching(false);
    }
  };

  // Handle search with debouncing
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    
    // Reset scroll position when search changes
    if (query !== searchQuery) {
      setScrollPosition(0);
      saveScrollPosition(0);
    }
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for 0.75 second delay
    const timeout = setTimeout(() => {
      if (query.trim()) {
        // For search queries, fetch fresh data
        fetchProblems(query, false);
      } else {
        // For empty search, load from cache
        loadQuestionsWithCache('');
      }
    }, 750);
    
    setSearchTimeout(timeout);
  };

  useEffect(() => {
    console.log('🔄 useEffect triggered - searchQuery:', searchQuery, 'sortOption:', sortOption);
    if (searchQuery.trim()) {
      fetchProblems(searchQuery);
    } else {
      loadQuestionsWithCache(searchQuery);
    }
  }, [sortOption]); // Removed searchQuery from dependency to prevent double fetching

  // Initial load
  useEffect(() => {
    loadQuestionsWithCache('');
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Refresh problems when the screen comes into focus (e.g., returning from question screen)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if we have problems loaded and should refresh
      if (problems.length > 0 && shouldRefreshStatus) {
        refreshProblemsStatus();
        setShouldRefreshStatus(false);
      }
    }, [problems.length, shouldRefreshStatus])
  );

  // Function to refresh only the status of current problems without full reload
  const refreshProblemsStatus = async () => {
    try {
      if (problems.length === 0) return;

      setRefreshingStatus(true);

      // Get user progress for current problems
      const { getUserProgressForProblems } = await import('@/lib/services/userProgress');
      const problemIds = problems.map(p => p.leetcode_id);
      
      console.log('🔍 ALL QUESTIONS - Fetching progress for problem IDs:', problemIds);
      
      const progressMap = await getUserProgressForProblems(problemIds);

      console.log('🔍 ALL QUESTIONS - Raw progress map from database:', JSON.stringify(progressMap, null, 2));

      // Update problems with latest status
      const updatedProblems: ProblemWithStatus[] = problems.map(problem => {
        const progress = progressMap[problem.leetcode_id];
        
        console.log(`🔍 ALL QUESTIONS - Problem ${problem.leetcode_id} (${problem.title}):`);
        console.log(`🔍 ALL QUESTIONS - Progress data:`, progress);
        console.log(`🔍 ALL QUESTIONS - Is solved:`, progress?.is_solved);
        console.log(`🔍 ALL QUESTIONS - Score:`, progress?.score, 'Type:', typeof progress?.score);
        console.log(`🔍 ALL QUESTIONS - Stars:`, progress?.stars, 'Type:', typeof progress?.stars);

        return {
          ...problem,
          status: progress?.is_solved ? 'Solved' : 'Unsolved',
          score: progress?.score,
          stars: progress?.stars
        };
      });

      console.log('🔍 ALL QUESTIONS - Updated problems with status:', updatedProblems.map(p => ({
        id: p.leetcode_id,
        title: p.title,
        status: p.status,
        score: p.score,
        stars: p.stars
      })));

      setProblems(updatedProblems);
    } catch (err) {
      console.error('Error refreshing problem status:', err);
      // Don't show error to user for status refresh, just log it
    } finally {
      setRefreshingStatus(false);
    }
  };

  const handleSortOptionChange = (newSortOption: typeof sortOption) => {
    console.log('🔄 handleSortOptionChange called - newSortOption:', newSortOption);
    setSortOption(newSortOption);
    setShowSortOptions(false);
  };

  const getSortDisplayText = () => {
    switch (sortOption) {
      case 'id-asc':
        return 'ID ↑';
      case 'id-desc':
        return 'ID ↓';
      case 'name-asc':
        return 'Name A-Z';
      case 'difficulty-asc':
        return 'Easy → Hard';
      case 'difficulty-desc':
        return 'Hard → Easy';
      case 'status-asc':
        return 'Unsolved → Solved';
      default:
        return 'ID ↑';
    }
  };

  const handleProblemPress = (problem: Problem) => {
    // Replace current screen with loading screen
    router.replace({
      pathname: '/loading',
      params: {
        problemId: problem.leetcode_id.toString(),
        questionTitle: problem.title,
        questionDifficulty: problem.difficulty
      }
    });
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchProblems(searchQuery)}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <View style={styles.searchIconContainer}>
            <ThemedText style={styles.searchIcon}>🔍</ThemedText>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search problems by title or ID..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => handleSearch('')}
            >
              <ThemedText style={styles.clearButtonText}>✕</ThemedText>
            </TouchableOpacity>
          )}
        </View>

      </View>

      {/* Sorting Bubble */}
      <View style={styles.sortingContainer}>
        <TouchableOpacity 
          style={styles.sortingBubble}
          onPress={() => setShowSortOptions(!showSortOptions)}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.sortingBubbleText}>Sort: {getSortDisplayText()}</ThemedText>
          <ThemedText style={styles.sortingBubbleIcon}>▼</ThemedText>
        </TouchableOpacity>
        
        {showSortOptions && (
          <View style={styles.sortOptionsContainer}>
            <TouchableOpacity 
              style={[styles.sortOption, sortOption === 'id-asc' && styles.activeSortOption]}
              onPress={() => handleSortOptionChange('id-asc')}
            >
              <ThemedText style={[styles.sortOptionText, sortOption === 'id-asc' && styles.activeSortOptionText]}>
                ID ↑
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortOption, sortOption === 'id-desc' && styles.activeSortOption]}
              onPress={() => handleSortOptionChange('id-desc')}
            >
              <ThemedText style={[styles.sortOptionText, sortOption === 'id-desc' && styles.activeSortOptionText]}>
                ID ↓
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortOption, sortOption === 'name-asc' && styles.activeSortOption]}
              onPress={() => handleSortOptionChange('name-asc')}
            >
              <ThemedText style={[styles.sortOptionText, sortOption === 'name-asc' && styles.activeSortOptionText]}>
                Name A-Z
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortOption, sortOption === 'difficulty-asc' && styles.activeSortOption]}
              onPress={() => handleSortOptionChange('difficulty-asc')}
            >
              <ThemedText style={[styles.sortOptionText, sortOption === 'difficulty-asc' && styles.activeSortOptionText]}>
                Easy → Hard
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortOption, sortOption === 'difficulty-desc' && styles.activeSortOption]}
              onPress={() => handleSortOptionChange('difficulty-desc')}
            >
              <ThemedText style={[styles.sortOptionText, sortOption === 'difficulty-desc' && styles.activeSortOptionText]}>
                Hard → Easy
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortOption, sortOption === 'status-asc' && styles.activeSortOption]}
              onPress={() => handleSortOptionChange('status-asc')}
            >
              <ThemedText style={[styles.sortOptionText, sortOption === 'status-asc' && styles.activeSortOptionText]}>
                Unsolved → Solved
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Cache indicator */}
        {isLoadingFromCache && (
          <View style={styles.cacheIndicator}>
            <ThemedText style={styles.cacheIndicatorText}>📦 Loaded from cache</ThemedText>
          </View>
        )}
      </View>

      <View style={styles.tableHeader}>
        <View style={[styles.headerCell, { flex: 1.3 }]}>
          <ThemedText style={styles.headerCellText}>ID</ThemedText>
        </View>
        <View style={[styles.headerCell, { flex: 4 }]}>
          <ThemedText style={styles.headerCellText}>Name</ThemedText>
        </View>
        <View style={[styles.headerCell, { flex: 3.2 }]}>
          <ThemedText style={styles.headerCellText}>Difficulty</ThemedText>
        </View>
        <View style={[styles.headerCell, { flex: 2.5 }]}>
          <ThemedText style={styles.headerCellText}>Status</ThemedText>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.tableContainer}
        showsVerticalScrollIndicator={true}
        onTouchStart={() => {
          if (showSortOptions) {
            setShowSortOptions(false);
          }
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(problem.status) }]}>
                <ThemedText style={styles.statusText}>{problem.status}</ThemedText>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6FF', // Purple-tinted background like duel.tsx
    paddingBottom: 50, // Add padding to prevent tab bar blocking
  },
    header: {
    backgroundColor: '#8B5CF6',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchHeader: {
    backgroundColor: '#F8F6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    top: 80,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    maxHeight: 300,
    elevation: 10,
    shadowColor: '#8B5CF6',
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
    color: '#8B5CF6',
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

  tableContainer: {
    backgroundColor: '#F8F6FF',
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  headerCell: {
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'left',
  },
  headerCellText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'left',
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1ecfd',
    minHeight: 70,
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
    marginRight: 8,
    marginLeft: 4,
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
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 8,
    minHeight: 32,
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 18,
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
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'center',
    minWidth: 75,
    minHeight: 32,
    justifyContent: 'center', // Center text vertically
    alignItems: 'center', // Center text horizontally
  },
  statusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 18,
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

  refreshIndicator: {
    marginLeft: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#8B5CF6',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIconContainer: {
    marginRight: 12,
  },
  searchIcon: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 0,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8E6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  loadingDots: {
    flexDirection: 'row',
    marginRight: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6564c7',
    marginHorizontal: 2,
  },
  dot1: {
    // opacity is controlled by animation
  },
  dot2: {
    // opacity is controlled by animation
  },
  dot3: {
    // opacity is controlled by animation
  },
  searchingText: {
    fontSize: 14,
    color: '#6564c7',
    fontWeight: '600',
  },
  sortingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
  },
  sortingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sortingBubbleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d2d2d',
    marginRight: 8,
  },
  sortingBubbleIcon: {
    fontSize: 14,
    color: '#6564c7',
  },
  sortOptionsContainer: {
    position: 'absolute',
    top: 50, // Adjust based on bubble height
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 100,
  },
  sortOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  activeSortOption: {
    backgroundColor: '#f1ecfd',
    borderColor: '#6564c7',
    borderWidth: 1,
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d2d2d',
  },
  activeSortOptionText: {
    color: '#6564c7',
  },
  cacheIndicator: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E8E6FF',
    borderRadius: 12,
    alignSelf: 'center',
  },
  cacheIndicatorText: {
    fontSize: 12,
    color: '#6564c7',
    fontWeight: '600',
  },
}); 