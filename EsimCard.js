import React, { memo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, Animated } from 'react-native';
import { Wifi, Clock, QrCode, Phone, MessageSquare } from 'lucide-react-native';
import FlagIcon from './FlagIcon';
import { getEsimUsage } from '../services/orderService';
import { getCachedUsage } from '../services/usageCache';
import { trackApiCall } from '../services/performanceMonitor';

const getStatusConfig = (status, isExpired) => {
  const normalizedStatus = (status || '').toLowerCase();
  
  if (isExpired || normalizedStatus === 'expired' || normalizedStatus === 'used') {
    return { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)', text: 'Expired' };
  }
  if (normalizedStatus === 'pending') {
    return { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', text: 'Pending' };
  }
  return { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', text: 'Active' };
};

// Helper to get country info from Firebase/Airalo data
const getCountryInfo = (esim) => {
  const orderData = esim.orderData || {};
  
  // Check multiple sources for country name (Firebase uses country_region)
  let countryName = esim.country_region || // Firebase field
                    esim.countryName || 
                    esim.country_name || 
                    orderData.country_region ||
                    '';
  
  // Check multiple sources for country code (2-letter ISO)
  let countryCode = esim.country_code || // Firebase field  
                    esim.countryCode ||
                    orderData.country_code ||
                    '';
  
  // Country photo URL if available
  const countryPhoto = esim.countryPhoto || esim.country_photo || orderData.country_image || '';
  
  // Check if regional eSIM
  const isRegional = esim.is_regional || esim.isRegional || orderData.is_regional || false;
  
  // Fallback: Try to extract from country_codes array
  if (!countryName && esim.country_codes && Array.isArray(esim.country_codes) && esim.country_codes.length > 0) {
    // Capitalize first letter of country name from array
    const rawName = esim.country_codes[0];
    countryName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  }
  
  // Fallback: extract from plan name (e.g., "asia-500mb-7days" -> "Asia")
  if (!countryName && esim.planName) {
    const packageName = esim.planName.toLowerCase();
    const regionalMatch = packageName.match(/^(asia|europe|africa|americas|oceania|global|discover)/);
    if (regionalMatch) {
      const regionName = regionalMatch[1];
      const displayNames = {
        'asia': 'Asia',
        'europe': 'Europe',
        'africa': 'Africa',
        'americas': 'Americas',
        'oceania': 'Oceania',
        'global': 'Global',
        'discover': 'Discover Global'
      };
      countryName = displayNames[regionName] || regionName.charAt(0).toUpperCase() + regionName.slice(1);
      if (!countryCode) countryCode = regionName;
    }
  }
  
  // Final fallbacks
  if (!countryName) countryName = 'eSIM';
  if (!countryCode && countryName) {
    // Try to use first 2 letters of country name as code
    countryCode = countryName.substring(0, 2).toUpperCase();
  }
  
  return { countryCode, countryName, countryPhoto, isRegional };
};

// Skeleton placeholder component
const SkeletonBox = memo(({ width, height, style, isDark }) => {
  const animatedValue = useRef(new Animated.Value(0.3)).current;
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          borderRadius: 4,
          opacity: animatedValue,
        },
        style,
      ]}
    />
  );
});

function EsimCard({ esim, onPress, colors, isDark, isExpired = false, delayLoad = 0 }) {
  const planDetails = esim.planDetails || {};
  const orderData = esim.orderData || {};
  const simData = orderData?.sims?.[0] || {};
  
  const { countryCode, countryName, countryPhoto, isRegional } = getCountryInfo(esim);
  
  // Use hasQrCode flag from lightweight data, or check full data fields
  const hasQrCode = esim.hasQrCode || esim.qrCode || esim.lpa || esim.qrCodeUrl;
  const statusConfig = getStatusConfig(esim.status, isExpired);

  // Progressive loading states
  const [usageData, setUsageData] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(true); // Start as loading
  const [flagLoaded, setFlagLoaded] = useState(false);
  const [shouldLoadHeavyContent, setShouldLoadHeavyContent] = useState(false);
  
  // Essential data (available immediately)
  const data = esim.data || '';
  const validity = esim.validity || planDetails.validity || orderData.validity || '';
  const price = esim.amount || esim.price || orderData.price || '';
  const currency = (esim.currency || orderData.currency || 'USD').toUpperCase();
  const planName = data || esim.planName?.split(' - ')[0] || 'eSIM Plan';
  const voice = planDetails.voice || orderData.voice || orderData.voice_minutes || simData.voice || 0;
  const sms = planDetails.sms || orderData.sms || orderData.text || simData.text || 0;

  // Phase 1: Delay heavy content loading for staggered effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoadHeavyContent(true);
    }, delayLoad);
    return () => clearTimeout(timer);
  }, [delayLoad]);

  // Phase 2: Load usage data (only after heavy content flag is set)
  // TEMPORARILY DISABLED: Prevent API spam - rely on preload caching
  // Skip for test mode eSIMs - they don't have real usage data
  useEffect(() => {
    if (!shouldLoadHeavyContent) return;

    const fetchUsage = async () => {
      // Skip fetching for test mode eSIMs or expired ones
      if (!esim.iccid || isExpired || esim.isTestMode) {
        setLoadingUsage(false);
        return;
      }

      const startTime = Date.now();

      try {
        // ONLY use cache - don't make API calls to prevent spam
        const cached = await getCachedUsage(esim.iccid);
        if (cached) {
          setUsageData(cached);
          setLoadingUsage(false);
          return;
        }

        // If no cache, show "No data available" instead of fetching
        setUsageData(null); // Will show "No data available"
        setLoadingUsage(false);

        // DISABLED: Don't fetch from API to prevent constant calls
        // const result = await getEsimUsage(esim.iccid);
        // if (result.success) {
        //   setUsageData(result.data);
        // }

      } catch (error) {
      } finally {
        setLoadingUsage(false);
      }
    };

    // Small delay for staggered loading effect
    const timer = setTimeout(fetchUsage, 100);
    return () => clearTimeout(timer);
  }, [esim.iccid, esim.isTestMode, isExpired, shouldLoadHeavyContent]);

  const formatDataAmount = (mb) => {
    if (!mb) return null;
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${Math.round(mb)} MB`;
  };

  const remainingData = usageData ? formatDataAmount(usageData.remaining) : null;
  const totalData = usageData ? formatDataAmount(usageData.total) : null;
  const isUnlimited = usageData?.is_unlimited || false;
  
  const usagePercentage = usageData && usageData.total > 0 
    ? Math.round(((usageData.total - usageData.remaining) / usageData.total) * 100)
    : 0;
  const remainingPercentage = 100 - usagePercentage;

  const formatPrice = (amount) => {
    if (amount === null || amount === undefined || amount === '') return null;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return amount;
    
    const symbol = currency === 'EUR' ? '€' : '$';
    return `${symbol}${numAmount.toFixed(2)}`;
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrapper,
        isExpired && styles.expiredWrapper,
        pressed && styles.wrapperPressed,
      ]}
    >
      <View style={[
        styles.card, 
        { 
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
        },
        isDark ? styles.cardDark : styles.cardLight,
      ]}>
        {/* Status Badge - Always visible (essential) */}
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {esim.isTestMode ? '🧪 Test' : statusConfig.text}
          </Text>
        </View>

        {/* Header: Flag, Plan Name & Country */}
        <View style={styles.header}>
          {/* Flag Container - Progressive load */}
          <View style={[styles.flagContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }]}>
            {shouldLoadHeavyContent ? (
              <FlagIcon
                countryCode={countryCode}
                firebasePhotoUrl={countryPhoto || esim.photo || orderData.country_image}
                width={72}
                height={54}
                isDark={isDark}
                isRegional={isRegional}
              />
            ) : (
              <SkeletonBox width={72} height={54} isDark={isDark} style={{ borderRadius: 10 }} />
            )}
          </View>
          
          {/* Plan Name & Country - Always visible (essential) */}
          <View style={styles.nameContainer}>
            <Text style={[styles.planTitle, { color: colors.text }]} numberOfLines={1}>
              {planName}
            </Text>
            <Text style={[styles.countrySubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {countryName}
            </Text>
          </View>
        </View>

        {/* Data Usage Section - Progressive load */}
        {!isExpired && (
          <View style={styles.usageSection}>
            <View style={styles.usageHeader}>
              <View style={styles.usageLabel}>
                <Wifi size={14} color={colors.primary} />
                <Text style={[styles.usageLabelText, { color: colors.textSecondary }]}>
                  Data Remaining
                </Text>
              </View>
              {loadingUsage ? (
                <SkeletonBox width={80} height={16} isDark={isDark} />
              ) : usageData ? (
                <Text style={[styles.usageValue, { color: colors.primary }]}>
                  {isUnlimited ? 'Unlimited' : `${remainingData} / ${totalData}`}
                </Text>
              ) : data ? (
                <Text style={[styles.usageValue, { color: colors.textSecondary }]}>
                  {data}
                </Text>
              ) : null}
            </View>
            
            {/* Progress Bar */}
            <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
              {loadingUsage ? (
                <SkeletonBox width="100%" height={6} isDark={isDark} style={{ borderRadius: 3 }} />
              ) : usageData && !isUnlimited ? (
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${remainingPercentage}%`, backgroundColor: colors.primary }
                  ]} 
                />
              ) : (
                <View style={[styles.progressFill, { width: '100%', backgroundColor: colors.primary }]} />
              )}
            </View>
          </View>
        )}

        {/* Plan Details Badges - Always visible (essential) */}
        <View style={styles.badgesRow}>
          {validity ? (
            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <Clock size={12} color={colors.textSecondary} />
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                {validity} days
              </Text>
            </View>
          ) : null}
          
          {price ? (
            <View style={[styles.priceBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <Text style={[styles.priceBadgeText, { color: '#10B981' }]}>
                {formatPrice(price)}
              </Text>
            </View>
          ) : null}
          
          {voice > 0 && (
            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <Phone size={12} color={colors.textSecondary} />
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                {voice} min
              </Text>
            </View>
          )}
          
          {sms > 0 && (
            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <MessageSquare size={12} color={colors.textSecondary} />
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                {sms} SMS
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Row: QR Button */}
        {hasQrCode && (
          <View style={[styles.bottomRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Pressable 
              style={[styles.qrButton, { backgroundColor: colors.primary }]}
              onPress={onPress}
            >
              <QrCode size={16} color="#fff" />
              <Text style={styles.qrButtonText}>View QR Code</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  wrapperPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  expiredWrapper: {
    opacity: 0.6,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    zIndex: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    marginRight: 80,
  },
  flagContainer: {
    width: 72,
    height: 54,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
    gap: 2,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  countrySubtitle: {
    fontSize: 14,
  },
  usageSection: {
    marginBottom: 14,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  usageLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  usageLabelText: {
    fontSize: 13,
    fontWeight: '500',
  },
  usageValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  priceBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    flex: 1,
  },
  qrButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default memo(EsimCard);
