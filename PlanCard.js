import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Card, PressableFeedback, Chip, Divider } from 'heroui-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getDisplayPrice, formatPrice } from '../utils/planUtils';

export default function PlanCard({ plan, onPress, hasDiscount = false }) {
  const { isDark, colors } = useTheme();

  const displayPrice = getDisplayPrice(plan);
  const discountPercentage = hasDiscount ? 10 : 0;
  const discountedPrice = hasDiscount 
    ? Math.max(0.5, displayPrice * (100 - discountPercentage) / 100)
    : displayPrice;
  const showDiscount = hasDiscount && discountedPrice < displayPrice;

  return (
    <PressableFeedback
      feedbackVariant="highlight"
      onPress={onPress}
      style={styles.cardWrapper}
    >
      <Card style={styles.card}>
        {/* Header Row - Data and Price */}
        <View style={styles.header}>
          {/* Data Info */}
          <View style={styles.dataSection}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Text style={styles.iconText}>📶</Text>
            </View>
            <View style={styles.dataInfo}>
              <Text style={[styles.dataAmount, { color: colors.text }]}>{plan.data}</Text>
              <Text style={[styles.validity, { color: colors.textSecondary }]}>{plan.validity}</Text>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceSection}>
            {showDiscount ? (
              <>
                <View style={styles.discountRow}>
                  <Text style={[styles.discountedPrice, { color: '#10B981' }]}>
                    {formatPrice(discountedPrice)}
                  </Text>
                  <Chip
                    variant="primary"
                    size="sm"
                    style={styles.discountBadge}
                  >
                    <Text style={styles.discountBadgeText}>-{discountPercentage}%</Text>
                  </Chip>
                </View>
                <Text style={[styles.originalPrice, { color: colors.textTertiary }]}>
                  {formatPrice(displayPrice)}
                </Text>
              </>
            ) : (
              <Text style={[styles.price, { color: colors.primary }]}>
                {formatPrice(displayPrice)}
              </Text>
            )}
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Country Info */}
        <View style={styles.countrySection}>
          <Text style={styles.flag}>{plan.flag}</Text>
          <View style={styles.countryInfo}>
            <Text style={[styles.countryName, { color: colors.text }]} numberOfLines={1}>
              {plan.country}
            </Text>
            <Text style={[styles.coverage, { color: colors.textSecondary }]}>
              {plan.coverage} Coverage
            </Text>
          </View>
        </View>

        {/* Benefits */}
        {plan.benefits && plan.benefits.length > 0 && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.benefitsSection}>
              {plan.benefits.slice(0, 2).map((benefit, idx) => (
                <View key={idx} style={styles.benefitItem}>
                  <View style={[styles.checkIcon, { backgroundColor: '#10B981' + '20' }]}>
                    <Check size={10} color="#10B981" strokeWidth={3} />
                  </View>
                  <Text style={[styles.benefitText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {benefit}
                  </Text>
                </View>
              ))}
              {plan.benefits.length > 2 && (
                <Text style={[styles.moreBenefits, { color: colors.textTertiary }]}>
                  +{plan.benefits.length - 2} more benefits
                </Text>
              )}
            </View>
          </>
        )}

        {/* Accent Line */}
        <View style={[styles.accentLine, { backgroundColor: colors.primary }]} />
      </Card>
    </PressableFeedback>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 20,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dataSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 22,
  },
  dataInfo: {
    justifyContent: 'center',
  },
  dataAmount: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  validity: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountedPrice: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  discountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  originalPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  divider: {
    marginVertical: 14,
  },
  countrySection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 36,
    marginRight: 12,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  coverage: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  benefitsSection: {
    gap: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  benefitText: {
    fontSize: 13,
    flex: 1,
    letterSpacing: 0.1,
  },
  moreBenefits: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  accentLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
});
