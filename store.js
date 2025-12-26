import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { LogBox } from 'react-native';

// Suppress known animation warnings
LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered',
]);

import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, Smartphone } from 'lucide-react-native';
import { ScrollShadow } from 'heroui-native';
import Animated, { FadeInDown, Easing, Layout } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { fetchUserEsims } from '../../services/orderService';
import { preloadUsageData, cleanupExpiredCaches } from '../../services/usageCache';
import { getEsimUsage } from '../../services/orderService';
import { measurePerformance, logPerformanceSummary } from '../../services/performanceMonitor';
import EsimCard from '../../components/EsimCard';
import EsimCardSkeleton from '../../components/EsimCardSkeleton';
import EsimDetailsModal from '../../components/EsimDetailsModal';
import GradientBackground from '../../components/GradientBackground';
import CategoryChip from '../../components/CategoryChip';
import GlassButton from '../../components/GlassButton';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
const AnimatedView = Animated.createAnimatedComponent(View);

const FILTERS = [
  { id: 'all', label: 'All', icon: 'list', color: '#6B7280' },
  { id: 'active', label: 'Active', icon: '', color: '#10B981' },
  { id: 'expired', label: 'Expired', icon: '', color: '#EF4444' },
];

const FETCH_TIMEOUT = 30000; // 30 seconds

// Empty state component
const EmptyState = memo(({ colors, isDark, onBuyPress }) => (
  <View style={styles.emptyState}>
    <View style={[
      styles.emptyIcon,
      { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }
    ]}>
      <Smartphone size={48} color={colors.textSecondary} />
    </View>
    <Text style={[styles.emptyTitle, { color: colors.text }]}>
      No eSIMs Yet
    </Text>
    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
      Purchase your first eSIM to get started with global connectivity
    </Text>
    <View style={styles.emptyButtonContainer}>
      <GlassButton
        variant="primary"
        onPress={onBuyPress}
        title="Browse eSIMs"
        icon={<Plus size={20} color="#fff" />}
      />
    </View>
  </View>
));

// Section Header
const SectionHeader = memo(({ title, subtitle, colors }) => (
  <View style={styles.sectionHeader}>
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      )}
    </View>
  </View>
));

// eSIM Card Item with staggered loading
const EsimListItem = memo(({ esim, onPress, colors, isDark, isExpired, index }) => (
  <EsimCard
    esim={esim}
    onPress={onPress}
    colors={colors}
    isDark={isDark}
    isExpired={isExpired}
    delayLoad={index * 100} // Stagger heavy content loading by 100ms per card
  />
));

// Skeleton List
const SkeletonList = memo(({ count = 4, isDark, colors }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <EsimCardSkeleton key={i} index={i} isDark={isDark} colors={colors} />
    ))}
  </>
));

export default function MyESIMsScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();

  // ===== UI State (responds immediately) =====
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedEsim, setSelectedEsim] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // ===== Data State =====
  const [esims, setEsims] = useState([]);
  
  // ===== Loading State (skeleton shows by default) =====
  const [loading, setLoading] = useState(true);
  const [fetchTimedOut, setFetchTimedOut] = useState(false);
  
  // ===== Refs for cleanup =====
  const isMountedRef = useRef(true);
  const fetchAbortRef = useRef(false);

  // ===== Fetch eSIMs with Performance Tracking =====
  const loadEsims = useCallback(async (showLoading = true) => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    if (fetchAbortRef.current) {
      return;
    }

    if (showLoading) setLoading(true);

    try {
      // Measure fetch performance
      const { result: userEsims, duration } = await measurePerformance(
        'fetchUserEsims',
        () => fetchUserEsims(currentUser.uid, true) // Use lightweight mode
      );


      if (isMountedRef.current && !fetchAbortRef.current) {
        setEsims(userEsims);
        setFetchTimedOut(false); // Reset timeout state on success

        // DISABLE individual card fetching to prevent API spam
        // EsimCard components will show cached data or "No data available"
      }
    } catch (error) {
      if (isMountedRef.current && !fetchAbortRef.current) {
        setEsims([]);
        setFetchTimedOut(true); // Show error state
      }
    } finally {
      if (isMountedRef.current && !fetchAbortRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [currentUser?.uid]); // Use currentUser.uid specifically

  // ===== Fetch on Focus (abort on blur) =====
  // Use useRef to track if we've already fetched for this session
  const hasFetchedRef = useRef(false);

  // Reset fetch state when user changes
  useEffect(() => {
    if (currentUser) {
      hasFetchedRef.current = false;
    }
  }, [currentUser]);

  useFocusEffect(
    useCallback(() => {
      // Screen focused - enable fetching
      isMountedRef.current = true;
      fetchAbortRef.current = false;
      setFetchTimedOut(false);


      // Only fetch if we haven't fetched in this session and have a user
      if (!hasFetchedRef.current && currentUser && !fetchAbortRef.current) {
        hasFetchedRef.current = true;

        const timer = setTimeout(() => {
          if (!fetchAbortRef.current && currentUser) {
            loadEsims(true);
          }
        }, 100); // Small delay to let navbar render

        // Timeout for error state
        const timeoutTimer = setTimeout(() => {
          if (isMountedRef.current && loading && esims.length === 0) {
            setFetchTimedOut(true);
            setLoading(false);
          }
        }, FETCH_TIMEOUT);

        return () => {
          fetchAbortRef.current = true;
          clearTimeout(timer);
          clearTimeout(timeoutTimer);
        };
      } else {
      }

      return () => {
        fetchAbortRef.current = true;
      };
    }, [currentUser]) // Only depend on currentUser, not loadEsims or loading state
  );

  // Cleanup on unmount and cache maintenance
  useEffect(() => {
    // Clean up expired caches on mount
    cleanupExpiredCaches().catch(err => {
    });
    
    return () => {
      isMountedRef.current = false;
      fetchAbortRef.current = true;
      
      // Log performance stats when leaving screen (dev only)
      if (__DEV__) {
        logPerformanceSummary();
      }
    };
  }, []);

  // ===== Handlers (immediate response) =====
  const onRefresh = useCallback(() => {
    hasFetchedRef.current = false; // Allow re-fetch on refresh
    setRefreshing(true);
    // Clear current data to show loading state during refresh
    setEsims([]);
    loadEsims(false);
  }, [loadEsims]);

  const handleEsimPress = useCallback((esim) => {
    // Pass the esim directly - modal will fetch full details and usage
    setSelectedEsim(esim);
    setShowDetailsModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowDetailsModal(false);
    setTimeout(() => setSelectedEsim(null), 300);
  }, []);

  const handleDeleteEsim = useCallback((deletedEsimId) => {
    // Remove from local state immediately for instant UI update
    setEsims(prevEsims => prevEsims.filter(e => e.id !== deletedEsimId));
  }, []);

  const handleBuyEsim = useCallback(() => {
    router.push('/(tabs)/home');
  }, [router]);

  const handleFilterChange = useCallback((filterId) => {
    setSelectedFilter(filterId);
  }, []);

  // Reset filter when screen loses focus (optional - for cleaner UX)
  // useFocusEffect(
  //   useCallback(() => {
  //     return () => {
  //       // Reset to 'all' when leaving screen
  //       setSelectedFilter('all');
  //     };
  //   }, [])
  // );

  // ===== Memoized Data =====
  const { activeEsims, expiredEsims } = useMemo(() => {
    const active = [];
    const expired = [];

    esims.forEach((esim) => {
      const status = (esim.status || '').toLowerCase();
      if (status === 'expired' || status === 'used') {
        expired.push(esim);
      } else {
        active.push(esim);
      }
    });

    return { activeEsims: active, expiredEsims: expired };
  }, [esims]);

  const filteredEsims = useMemo(() => {
    switch (selectedFilter) {
      case 'active': return activeEsims;
      case 'expired': return expiredEsims;
      default: return esims;
    }
  }, [selectedFilter, esims, activeEsims, expiredEsims]);

  // Determine what to show
  const showSkeleton = loading;
  const hasEsims = esims.length > 0;
  const showEmptyState = !loading && !hasEsims && !fetchTimedOut;
  const showErrorState = !loading && !hasEsims && fetchTimedOut;

  return (
    <View style={styles.container}>
      {/* Background gradient that extends to tab bar area */}
      <GradientBackground />
  
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollShadow
        size={60}
        LinearGradientComponent={LinearGradient}
        style={styles.scrollShadow}
        color={isDark ? '#000000' : '#F8F9FA'}
      >
        <AnimatedScrollView
          style={styles.scrollView}
          contentContainerStyle={{ 
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 100,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Header - always visible */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              My eSIMs
            </Text>
            {hasEsims && !loading && (
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {esims.length} {esims.length === 1 ? 'plan' : 'plans'}
              </Text>
            )}
          </View>

          {/* Filter Chips - show when we have data */}
          {hasEsims && !loading && (
            <View style={styles.filtersWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContainer}
              >
                {FILTERS.map((filter) => (
                  <CategoryChip
                    key={filter.id}
                    label={filter.label}
                    icon={filter.icon}
                    isSelected={selectedFilter === filter.id}
                    onPress={() => handleFilterChange(filter.id)}
                    isDark={isDark}
                    variant="soft"
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            {showSkeleton ? (
              // Skeleton Loading
              <>
                <SectionHeader title="Your eSIMs" colors={colors} />
                <SkeletonList count={4} isDark={isDark} colors={colors} />
              </>
            ) : showEmptyState ? (
              // Empty State - no eSIMs yet
              <EmptyState colors={colors} isDark={isDark} onBuyPress={handleBuyEsim} />
            ) : showErrorState ? (
              // Error/Timeout State
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>⚠️</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Connection Issue
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Pull down to refresh
                </Text>
              </View>
            ) : (
              // eSIM List
              <>
                <SectionHeader
                  title={
                    selectedFilter === 'all' ? 'All eSIMs' :
                    selectedFilter === 'active' ? 'Active eSIMs' :
                    'Expired eSIMs'
                  }
                  subtitle={`${filteredEsims.length} ${filteredEsims.length === 1 ? 'eSIM' : 'eSIMs'}`}
                  colors={colors}
                />

                {filteredEsims.length > 0 ? (
                  <View>
                    {filteredEsims.map((esim, index) => (
                      <EsimListItem
                        key={esim.id}
                        esim={esim}
                        onPress={() => handleEsimPress(esim)}
                        colors={colors}
                        isDark={isDark}
                        isExpired={
                          (esim.status || '').toLowerCase() === 'expired' ||
                          (esim.status || '').toLowerCase() === 'used'
                        }
                        index={index}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={[
                    styles.noResultsCard,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    }
                  ]}>
                    <Text style={styles.noResultsEmoji}>
                      {selectedFilter === 'active' ? '📱' : '📵'}
                    </Text>
                    <Text style={[styles.noResultsText, { color: colors.text }]}>
                      No {selectedFilter} eSIMs found
                    </Text>
                    <Text style={[styles.noResultsSubtext, { color: colors.textSecondary }]}>
                      {selectedFilter === 'active' 
                        ? 'All your eSIMs have expired' 
                        : 'You have no expired eSIMs'
                      }
                    </Text>
                  </View>
                )}

                {/* Buy Button */}
                <View style={styles.buyButtonContainer}>
                  <GlassButton
                    variant="primary"
                    onPress={handleBuyEsim}
                    title="Buy New eSIM"
                    icon={<Plus size={20} color="#fff" />}
                  />
                </View>
              </>
            )}
          </View>
        </AnimatedScrollView>
      </ScrollShadow>

      {/* eSIM Details Modal */}
      <EsimDetailsModal
        visible={showDetailsModal}
        esim={selectedEsim}
        userId={currentUser?.uid}
        onClose={handleCloseModal}
        onDelete={handleDeleteEsim}
        colors={colors}
        isDark={isDark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Fallback, GradientBackground covers this
  },
  scrollShadow: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  buyButtonContainer: {
    marginTop: 24,
    marginBottom: 8,
  },
  filtersWrapper: {
    marginTop: 4,
    marginBottom: 24,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: 20,
  },
  noResultsCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  noResultsEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  emptyButtonContainer: {
    width: '100%',
    maxWidth: 280,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
});
