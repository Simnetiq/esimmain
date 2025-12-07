import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CreditCard, Shield, Zap, Globe, Wifi, Clock, Smartphone, Check, Info, X, Phone, MessageSquare, ChevronRight, Radio } from 'lucide-react-native';
import { Card, Button, ScrollShadow } from 'heroui-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import Animated from 'react-native-reanimated';
import { BorderRadius } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import FlagIcon from '../../components/FlagIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processPayment } from '../../services/paymentService';
import { completeOrder } from '../../services/orderService';
import { getDisplayPrice, getChargePrice, formatPrice, getPlanData, getPlanValidity } from '../../utils/planUtils';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
const IS_LIQUID_GLASS = isLiquidGlassAvailable();

const formatData = (data, unit = 'GB') => {
  if (data === 'Unlimited' || data === -1 || data === Infinity) {
    return 'Unlimited';
  }
  
  if (typeof data === 'string' && data.includes(unit)) {
    return data;
  }
  
  return `${data} ${unit}`;
};

export default function PlanDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const { currentUser } = useAuth();
  
  const [plan, setPlan] = useState(null);
  const [country, setCountry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const loadPlanData = async () => {
      try {
        setLoading(true);
        
        // Try to get plan from AsyncStorage (passed from bottom sheet)
        const storedPlan = await AsyncStorage.getItem('selectedPlan');
        const storedCountry = await AsyncStorage.getItem('selectedCountry');
        
        if (storedPlan) {
          const planData = JSON.parse(storedPlan);
          setPlan(planData);
          
          if (storedCountry) {
            const countryData = JSON.parse(storedCountry);
            setCountry(countryData);
          }
        } else if (params.planId) {
          // If no stored plan, try to load from params
          // This would require an API call in a real implementation
          Alert.alert('Error', 'Plan data not found. Please select a plan again.');
          router.back();
        }
      } catch (error) {
        console.error('Error loading plan data:', error);
        Alert.alert('Error', 'Failed to load plan information');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadPlanData();
  }, [params.planId, router]);

  const handlePayment = useCallback(async () => {
    if (!currentUser) {
      Alert.alert(
        'Login Required',
        'Please log in to purchase this plan',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Terms Required', 'Please accept the terms of service to continue');
      return;
    }

    if (!plan) {
      Alert.alert('Error', 'Plan data not available');
      return;
    }

    setProcessingPayment(true);

    try {
      // Prepare order data
      // SECURITY: The actual price is validated on the backend from the database
      // The frontend price is only used for display purposes
      const planDataStr = getPlanData(plan);
      const displayPrice = getDisplayPrice(plan);
      const chargePrice = getChargePrice(plan); // same priority as display to avoid mismatch
      
      const orderId = plan.id || plan.slug || 'plan';
      const orderData = {
        order: orderId,
        email: currentUser.email,
        name: plan.name || `eSIM Plan - ${planDataStr}`,
        total: chargePrice, // Align with backend/Stripe price to avoid mismatch
        currency: (plan.currency || 'USD').toLowerCase(),
        userId: currentUser.uid,
        language: 'en',
        platform: Platform.OS,
        planId: plan.id,
        planData: plan,
        // Add timestamp for replay protection
        timestamp: new Date().toISOString(),
      };

      // Step 1: Process payment using Stripe Payment Sheet
      // The backend creates a pending order with the VALIDATED price from database
      const paymentResult = await processPayment(orderData);

      if (paymentResult.success) {
        console.log('✅ Payment successful, waiting for order processing...');
        
        try {
          // Step 2: Wait for webhook to create the eSIM
          // The backend webhook verifies payment and creates the Airalo eSIM
          // NO direct eSIM creation from mobile - this is the secure flow
          const orderResult = await completeOrder({
            packageId: orderId,
            email: currentUser.email,
            userId: currentUser.uid,
            paymentIntentId: paymentResult.paymentIntentId,
            orderId: orderId,
            onProgress: (progress) => {
              // Could show progress UI here if needed
              console.log('📊 Order progress:', progress);
            },
          });

          console.log('✅ Order completed via webhook:', orderResult);

          // Store order data for success page
          await AsyncStorage.setItem('lastOrder', JSON.stringify({
            orderId: orderResult.orderId,
            airaloOrderId: orderResult.airaloOrderId,
            qrCode: orderResult.qrCode,
            planName: plan.name || `eSIM Plan - ${planDataStr}`,
            amount: chargePrice,
            currency: plan.currency || 'USD',
            email: currentUser.email,
            isTestMode: orderResult.isTestMode,
          }));

          // Navigate to payment success page
          router.push({
            pathname: '/payment-success',
            params: {
              paymentIntentId: paymentResult.paymentIntentId,
              planId: plan.id,
              orderId: orderResult.orderId,
              hasQrCode: orderResult.qrCode?.qrCode ? 'true' : 'false',
            },
          });
        } catch (orderError) {
          console.error('⚠️ Order processing error:', orderError);
          
          // Payment succeeded but order processing timed out
          // The webhook might still complete - user should check their orders
          Alert.alert(
            'Order Processing',
            'Your payment was successful! Your eSIM is being prepared. Please check "My eSIMs" shortly, or contact support if it doesn\'t appear within a few minutes.',
            [{ text: 'OK' }]
          );
          
          router.push({
            pathname: '/payment-success',
            params: {
              paymentIntentId: paymentResult.paymentIntentId,
              planId: plan.id,
              orderPending: 'true',
            },
          });
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      
      const errorMessage = error.message || 'Failed to process payment. Please try again.';
      const isDevBuildError = errorMessage.includes('development build') || errorMessage.includes('Expo Go');
      
      Alert.alert(
        isDevBuildError ? 'Development Build Required' : 'Payment Failed',
        errorMessage,
        [
          { text: 'OK' },
          ...(isDevBuildError ? [{
            text: 'Learn More',
            onPress: () => console.log('See DEVELOPMENT_BUILD.md for instructions')
          }] : [])
        ]
      );
    } finally {
      setProcessingPayment(false);
    }
  }, [currentUser, termsAccepted, plan, country, router]);

  // Memoize handlers to prevent re-renders
  const handleBack = useCallback(() => router.back(), [router]);
  const handleToggleTerms = useCallback(() => setTermsAccepted(prev => !prev), []);
  const handleTermsPress = useCallback(() => router.push('/terms-of-service'), [router]);
  const handleLoginPress = useCallback(() => router.push('/login'), [router]);

  // Memoize computed values - must be before early returns
  const { originalPrice, days, operator, data, formattedData, formattedPrice, voiceMinutes, smsCount, hasVoice, hasSms, operators } = useMemo(() => {
    if (!plan) {
      return {
        originalPrice: 0,
        days: 'N/A',
        operator: '',
        data: 'N/A',
        formattedData: 'N/A',
        formattedPrice: '$0.00',
        voiceMinutes: 0,
        smsCount: 0,
        hasVoice: false,
        hasSms: false,
        operators: [],
      };
    }
    const price = getDisplayPrice(plan);
    const validity = getPlanValidity(plan);
    const op = plan.operator || plan.provider || '';
    const dataVal = getPlanData(plan);
    
    // Check for voice and SMS
    const voice = plan.voice || plan.voice_minutes || 0;
    const sms = plan.sms || 0;
    
    // Extract operators from operator_coverages if available
    const operatorsList = [];
    if (plan.operator_coverages && Array.isArray(plan.operator_coverages)) {
      plan.operator_coverages.forEach(coverage => {
        if (coverage.networks && Array.isArray(coverage.networks)) {
          coverage.networks.forEach(network => {
            if (network.name && !operatorsList.some(op => op.name === network.name)) {
              operatorsList.push({
                name: network.name,
                type: network.types?.[0] || 'LTE',
                countryCode: coverage.code,
              });
            }
          });
        }
      });
    }
    
    return {
      originalPrice: price,
      days: validity,
      operator: op,
      data: dataVal,
      formattedData: dataVal,
      formattedPrice: formatPrice(price),
      voiceMinutes: voice,
      smsCount: sms,
      hasVoice: voice > 0,
      hasSms: sms > 0,
      operators: operatorsList.slice(0, 10), // Limit to first 10 operators for display
    };
  }, [plan]);

  if (loading) {
    return (
      <View style={styles.container}>
        
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading plan details...
          </Text>
        </View>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={isDark 
            ? ['#000000', '#0a0a0a', '#000000'] 
            : ['#f8fafc', '#f0f4ff', '#e8f0fe']
          }
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Plan not found
          </Text>
          <Button
            variant="primary"
            size="lg"
            onPress={handleBack}
            style={styles.backButton}
          >
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
  
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollShadow
        size={60}
        LinearGradientComponent={LinearGradient}
        style={styles.scrollShadow}
        color={isDark ? '#000000' : '#f8fafc'}
      >
        <AnimatedScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent, 
            { 
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 40 
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            {/* Glass Back Button */}
            {IS_LIQUID_GLASS && Platform.OS === 'ios' ? (
              <Pressable onPress={handleBack} hitSlop={12}>
                <GlassView style={styles.backButtonGlass}>
                  <View style={styles.backButtonInner}>
                    <ArrowLeft size={24} color={colors.text} />
                  </View>
                </GlassView>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleBack}
                style={[
                  styles.backButtonFallback,
                  isDark ? styles.backButtonFallbackDark : styles.backButtonFallbackLight,
                ]}
                hitSlop={12}
              >
                <View style={styles.backButtonInner}>
                  <ArrowLeft size={24} color={colors.text} />
                </View>
              </Pressable>
            )}
            
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Plan Details
            </Text>
            <View style={styles.headerSpacer} />
          </View>
        {/* Country & Plan Header */}
        {country && (
          <Card style={[
            styles.countryHeader, 
            { 
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              borderWidth: 1,
            },
            styles.cardShadow
          ]}>
            <View style={styles.countryInfo}>
              <View
                style={[styles.flagContainer, { backgroundColor: colors.input }]}
              >
                <FlagIcon
                  countryCode={country.code || country.slug || country.name}
                  firebasePhotoUrl={country.photo}
                  width={60}
                  height={60}
                  isDark={isDark}
                  isRegional={country.is_regional}
                  aspectRatio="1x1"
                />
              </View>
              <View style={styles.countryTextContainer}>
                <Text style={[styles.countryName, { color: colors.text }]}>
                  {country.displayName || country.name}
                </Text>
                <Text style={[styles.planSubtitle, { color: colors.textSecondary }]}>
                  {formattedData}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Plan Details Card - Redesigned */}
        <Card style={[
          styles.detailsCard, 
          { 
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            borderWidth: 1,
          },
          styles.cardShadow
        ]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Plan Details
          </Text>

          {/* Data Amount */}
          <View style={[
            styles.planInfoRow,
            { borderBottomColor: colors.divider }
          ]}>
            <View style={[styles.planInfoIconContainer, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
              <Wifi size={18} color={colors.primary} />
            </View>
            <Text style={[styles.planInfoLabel, { color: colors.textSecondary }]}>Data</Text>
            <Text style={[styles.planInfoValue, { color: colors.text }]}>{formattedData}</Text>
          </View>

          {/* Validity */}
          <View style={[
            styles.planInfoRow,
            { borderBottomColor: colors.divider }
          ]}>
            <View style={[styles.planInfoIconContainer, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
              <Clock size={18} color={colors.primary} />
            </View>
            <Text style={[styles.planInfoLabel, { color: colors.textSecondary }]}>Validity</Text>
            <Text style={[styles.planInfoValue, { color: colors.text }]}>{days} {days === 1 ? 'day' : 'days'}</Text>
          </View>

          {/* Voice Minutes - if available */}
          {hasVoice && (
            <View style={[
              styles.planInfoRow,
              { borderBottomColor: colors.divider }
            ]}>
              <View style={[styles.planInfoIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Phone size={18} color={colors.success} />
              </View>
              <Text style={[styles.planInfoLabel, { color: colors.textSecondary }]}>Voice</Text>
              <Text style={[styles.planInfoValue, { color: colors.success }]}>{voiceMinutes} min</Text>
            </View>
          )}

          {/* SMS - if available */}
          {hasSms && (
            <View style={[
              styles.planInfoRow,
              { borderBottomColor: colors.divider }
            ]}>
              <View style={[styles.planInfoIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <MessageSquare size={18} color={colors.success} />
              </View>
              <Text style={[styles.planInfoLabel, { color: colors.textSecondary }]}>SMS</Text>
              <Text style={[styles.planInfoValue, { color: colors.success }]}>{smsCount} texts</Text>
            </View>
          )}

          {/* eSIM Provider/Operator */}
          {operator && (
            <View style={[
              styles.planInfoRow,
              { borderBottomWidth: 0 }
            ]}>
              <View style={[styles.planInfoIconContainer, { backgroundColor: isDark ? 'rgba(147, 51, 234, 0.15)' : 'rgba(147, 51, 234, 0.1)' }]}>
                <Smartphone size={18} color="#9333ea" />
              </View>
              <Text style={[styles.planInfoLabel, { color: colors.textSecondary }]}>Provider</Text>
              <Text style={[styles.planInfoValue, { color: colors.text }]}>{operator}</Text>
            </View>
          )}

          {/* Price Display */}
          <View style={[
            styles.priceDisplayContainer,
          
          ]}>
            <View style={styles.priceDisplayContent}>
              <Text style={[styles.priceDisplayLabel, { color: colors.textSecondary }]}>Price</Text>
              <Text style={[styles.priceDisplayValue, { color: colors.primary }]}>{formattedPrice}</Text>
            </View>
         
          </View>

          {/* Payment Button */}
          <View style={styles.paymentButtonWrapper}>
            <Button
              variant="primary"
              size="lg"
              onPress={handlePayment}
              disabled={processingPayment || !termsAccepted}
              style={[
                styles.paymentButton,
                {
                  backgroundColor: termsAccepted ? colors.primary : colors.gray500,
                  opacity: termsAccepted ? 1 : 0.5,
                }
              ]}
            >
              {processingPayment ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <CreditCard size={20} color="#fff" />
                  <Text style={styles.paymentButtonText}>
                    Pay Securely
                  </Text>
                </View>
              )}
            </Button>
          </View>

          {/* Terms Checkbox */}
          <View style={styles.termsContainerWithMargin}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={handleToggleTerms}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                { 
                  backgroundColor: termsAccepted ? colors.primary : 'transparent',
                  borderColor: termsAccepted ? colors.primary : colors.border,
                }
              ]}>
                {termsAccepted && <Check size={14} color={colors.buttonText} />}
              </View>
              <Text style={[styles.termsText, { color: colors.text }]}>
                I agree to the{' '}
                <Text
                  style={[styles.termsLink, { color: colors.primary }]}
                  onPress={handleTermsPress}
                >
                  Terms of Service
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Features */}
        <Card style={[
          styles.featuresCard, 
          { 
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            borderWidth: 1,
          },
          styles.cardShadow
        ]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            What's Included
          </Text>
          
          <View style={styles.featureList}>
            {/* Voice Minutes - if available */}
            {hasVoice && (
              <View style={[
                styles.includedFeatureRow,
                { 
                  backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)',
                  borderColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                }
              ]}>
                <View style={[styles.includedIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                  <Phone size={18} color={colors.success} />
                </View>
                <View style={styles.includedContent}>
                  <Text style={[styles.includedLabel, { color: colors.text }]}>
                    Voice Calls
                  </Text>
                  <Text style={[styles.includedValue, { color: colors.success }]}>
                    {voiceMinutes} {voiceMinutes === 1 ? 'minute' : 'minutes'} included
                  </Text>
                </View>
                <Check size={20} color={colors.success} />
              </View>
            )}

            {/* SMS - if available */}
            {hasSms && (
              <View style={[
                styles.includedFeatureRow,
                { 
                  backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)',
                  borderColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                }
              ]}>
                <View style={[styles.includedIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                  <MessageSquare size={18} color={colors.success} />
                </View>
                <View style={styles.includedContent}>
                  <Text style={[styles.includedLabel, { color: colors.text }]}>
                    Text Messages
                  </Text>
                  <Text style={[styles.includedValue, { color: colors.success }]}>
                    {smsCount} SMS included
                  </Text>
                </View>
                <Check size={20} color={colors.success} />
              </View>
            )}

            {/* Data - always included */}
            <View style={[
              styles.includedFeatureRow,
              { 
                backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)',
                borderColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)',
              }
            ]}>
              <View style={[styles.includedIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Wifi size={18} color={colors.success} />
              </View>
              <View style={styles.includedContent}>
                <Text style={[styles.includedLabel, { color: colors.text }]}>
                  Mobile Data
                </Text>
                <Text style={[styles.includedValue, { color: colors.success }]}>
                  {formattedData} included
                </Text>
              </View>
              <Check size={20} color={colors.success} />
            </View>

            {/* Standard features */}
            <View style={styles.featureItem}>
              <Check size={18} color={colors.success} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Instant activation
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Check size={18} color={colors.success} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                No contracts or commitments
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Check size={18} color={colors.success} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Works in {country?.displayName || country?.name || 'selected country'}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Check size={18} color={colors.success} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                24/7 customer support
              </Text>
            </View>

            {/* Show "data only" message only if no voice and no SMS */}
            {!hasVoice && !hasSms && (
              <View style={styles.featureItem}>
                <X size={18} color={colors.error} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                  SMS and calls are not included (data only)
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Operators/Networks - if multiple operators available */}
        {operators.length > 0 && (
          <Card style={[
            styles.operatorsCard, 
            { 
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              borderWidth: 1,
            },
            styles.cardShadow
          ]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Supported Networks
            </Text>
            <Text style={[styles.operatorsSubtitle, { color: colors.textSecondary }]}>
              {plan.networks || `${operators.length}+ networks available`}
            </Text>
            
            <View style={styles.operatorsList}>
              {operators.map((op, index) => (
                <View 
                  key={`${op.name}-${index}`}
                  style={[
                    styles.operatorRow,
                    { 
                      borderBottomWidth: index < operators.length - 1 ? 1 : 0,
                      borderBottomColor: colors.divider,
                    }
                  ]}
                >
                  <View style={[styles.operatorIconContainer, { backgroundColor: colors.input }]}>
                    <Radio size={16} color={colors.primary} />
                  </View>
                  <View style={styles.operatorContent}>
                    <Text style={[styles.operatorName, { color: colors.text }]}>
                      {op.name}
                    </Text>
                  </View>
                  <View style={[
                    styles.networkTypeBadge,
                    { 
                      backgroundColor: op.type === '5G' 
                        ? (isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)')
                        : (isDark ? 'rgba(156, 163, 175, 0.2)' : 'rgba(156, 163, 175, 0.1)'),
                    }
                  ]}>
                    <Text style={[
                      styles.networkTypeText,
                      { 
                        color: op.type === '5G' ? colors.primary : colors.textSecondary,
                      }
                    ]}>
                      {op.type}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Security Features */}
        <Card style={[
          styles.securityCard, 
          { 
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            borderWidth: 1,
          },
          styles.cardShadow
        ]}>
          <View style={styles.securityItem}>
            <Shield size={20} color={colors.primary} />
            <Text style={[styles.securityText, { color: colors.text }]}>
              Bank-level security
            </Text>
          </View>
          <View style={styles.securityItem}>
            <Zap size={20} color={colors.primary} />
            <Text style={[styles.securityText, { color: colors.text }]}>
              Instant activation
            </Text>
          </View>
          <View style={styles.securityItem}>
            <Globe size={20} color={colors.primary} />
            <Text style={[styles.securityText, { color: colors.text }]}>
              Global coverage
            </Text>
          </View>
        </Card>

        {/* Activation Instructions */}
        <Card style={[
          styles.activationCard, 
          { 
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            borderWidth: 1,
          },
          styles.cardShadow
        ]}>
          <View style={styles.activationHeader}>
            <Info size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
              Activation Instructions
            </Text>
          </View>
          
          {Platform.OS === 'ios' ? (
            <View style={styles.instructionsList}>
              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: colors.buttonText }]}>1</Text>
                </View>
                <Text style={[styles.instructionText, { color: colors.text }]}>
                  After purchase, you'll receive a QR code and activation details via email
                </Text>
              </View>
              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: colors.buttonText }]}>2</Text>
                </View>
                <Text style={[styles.instructionText, { color: colors.text }]}>
                  Go to Settings → Cellular → Add eSIM
                </Text>
              </View>
              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: colors.buttonText }]}>3</Text>
                </View>
                <Text style={[styles.instructionText, { color: colors.text }]}>
                  Scan the QR code or enter the activation code manually
                </Text>
              </View>
              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: colors.buttonText }]}>4</Text>
                </View>
                <Text style={[styles.instructionText, { color: colors.text }]}>
                  Label your eSIM (e.g., "Travel Data") and set it as your data line
                </Text>
              </View>
              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: colors.buttonText }]}>5</Text>
                </View>
                <Text style={[styles.instructionText, { color: colors.text }]}>
                  Enable "Allow Cellular Data Switching" to use both SIMs seamlessly
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.instructionsList}>
              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: colors.buttonText }]}>1</Text>
                </View>
                <Text style={[styles.instructionText, { color: colors.text }]}>
                  After purchase, you'll receive a QR code and activation details via email
                </Text>
              </View>
              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: colors.buttonText }]}>2</Text>
                </View>
                <Text style={[styles.instructionText, { color: colors.text }]}>
                  Go to Settings → Network & internet → SIMs → Add SIM → Download a SIM instead
                </Text>
              </View>
              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: colors.buttonText }]}>3</Text>
                </View>
                <Text style={[styles.instructionText, { color: colors.text }]}>
                  Scan the QR code or enter the activation code manually
                </Text>
              </View>
              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: colors.buttonText }]}>4</Text>
                </View>
                <Text style={[styles.instructionText, { color: colors.text }]}>
                  Name your eSIM profile and select it for mobile data
                </Text>
              </View>
              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: colors.buttonText }]}>5</Text>
                </View>
                <Text style={[styles.instructionText, { color: colors.text }]}>
                  Enable "Mobile data" for your eSIM in SIM settings
                </Text>
              </View>
            </View>
          )}
        </Card>

        </AnimatedScrollView>
      </ScrollShadow>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 24,
  },
  backButton: {
    borderRadius: 16,
    minHeight: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingBottom: 20,
    marginBottom: 8,
  },
  // Glass back button (matches PlanSelectionBottomSheet)
  backButtonGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  backButtonFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  backButtonFallbackLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  backButtonFallbackDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollShadow: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  flagContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 16,
  },
  // Card shadow (consistent across all cards)
  cardShadow: {
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
  countryHeader: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 20,
  },
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  planSubtitle: {
    fontSize: 16,
  },
  detailsCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  // Redesigned Plan Info styles
  planInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
  },
  planInfoIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planInfoLabel: {
    fontSize: 14,
    flex: 1,
  },
  planInfoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Price display
  priceDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderRadius: 16,
   
    marginTop: 16,
  },
  priceDisplayContent: {
    flex: 1,
  },
  priceDisplayLabel: {
    fontSize: 15,
    marginBottom: 2,
  },
  priceDisplayValue: {
    fontSize: 32,
    fontWeight: '400',
  },
  priceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  priceBadgeText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Legacy styles (kept for compatibility)
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '400',
  },
  priceContainer: {
    padding: 16,
    borderRadius: BorderRadius.base,
    alignItems: 'center',
    marginTop: 8,
  },
  priceLabel: {
    fontSize: 15,
    marginBottom: 4,
  },
  priceValue: { 
    fontSize: 32,
    fontWeight: '400',
  },
  featuresCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 20,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  // Included feature row (Voice, SMS, Data)
  includedFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  includedIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  includedContent: {
    flex: 1,
  },
  includedLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  includedValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Operators card styles
  operatorsCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 20,
  },
  operatorsSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    marginTop: -8,
  },
  operatorsList: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  operatorIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  operatorContent: {
    flex: 1,
  },
  operatorName: {
    fontSize: 15,
    fontWeight: '500',
  },
  networkTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  networkTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  securityCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    marginBottom: 16,
    borderRadius: 20,
    gap: 12,
  },
  securityItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  securityText: {
    fontSize: 12,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  countryTextContainer: {
    flex: 1,
  },
  termsContainer: {
    paddingHorizontal: 0,
    paddingVertical: 12,
  },
  termsContainerWithMargin: {
    paddingHorizontal: 0,
    paddingVertical: 12,
    marginTop: 16,
  },
  termsLink: {
    // Color is applied inline
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 14,
    flex: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  paymentButtonWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  paymentButton: {
    borderRadius: 16,
    minHeight: 56,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  activationCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 20,
  },
  activationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  instructionsList: {
    gap: 16,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  instructionText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
});

