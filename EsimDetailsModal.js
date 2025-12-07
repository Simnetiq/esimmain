import React, { memo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Clipboard,
  Share,
  Linking,
  Pressable,
} from 'react-native';
import {
  X,
  Copy,
  Share2,
  ExternalLink,
  Info,
  BarChart3,
  Trash2,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import QRCode from 'react-native-qrcode-svg';
import FlagIcon from './FlagIcon';
import { getEsimUsage, deleteEsim } from '../services/orderService';
import { getCachedUsage } from '../services/usageCache';


function EsimDetailsModal({ visible, esim, userId, onClose, colors, isDark, onDelete }) {
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [usageData, setUsageData] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Use esim data directly (full data is already passed)
  const esimData = esim;
  
  // Extract QR code from multiple sources
  const qrData = esimData?.qrCode || esimData?.lpa || esimData?.qrCodeUrl || esimData?.matchingId || '';
  const hasQrCode = qrData && qrData.length > 0;

  // Fetch usage data (skip for test mode eSIMs)
  // DISABLED: Prevent API spam - only use cached data
  const fetchUsage = useCallback(async () => {
    const iccid = esimData?.iccid;
    // Skip fetching for test mode eSIMs - they don't have real usage data
    if (!iccid || loadingUsage || usageData || esimData?.isTestMode) return;

    setLoadingUsage(true);
    const startTime = Date.now();

    try {
      // ONLY use cache - don't make API calls to prevent spam
      const cached = await getCachedUsage(iccid);
      if (cached) {
        // Combine cached data with plan details
        const planDetails = esimData?.planDetails || {};
        const airaloData = esimData?.airaloOrderData || {};
        const simData = airaloData.sims?.[0] || {};

        const totalVoice = planDetails.voice || simData.voice || airaloData.voice || 0;
        const totalText = planDetails.sms || simData.text || airaloData.text || 0;
        const isUnlimited = planDetails.isUnlimited || airaloData.is_unlimited || cached?.is_unlimited || false;
        const totalData = cached?.total || planDetails.dataAmountMb || simData.data_amount_mb || 0;

        const combinedUsageData = {
          ...cached,
          total: cached?.total || totalData,
          total_voice: cached?.total_voice || totalVoice,
          total_text: cached?.total_text || totalText,
          is_unlimited: isUnlimited,
        };

        setUsageData(combinedUsageData);
        setLoadingUsage(false);
        console.log('💾 Using cached usage in modal for', iccid.slice(-4));
        return;
      }

      // If no cache, don't fetch - just show no usage data
      console.log('📵 No cached usage data in modal for', iccid.slice(-4));
      setUsageData(null);
      setLoadingUsage(false);

    } catch (error) {
      console.log('⚠️ Error fetching usage in modal:', error.message);
      setUsageData(null);
    } finally {
      setLoadingUsage(false);
    }
  }, [esimData?.iccid, esimData?.isTestMode, esimData?.planDetails, esimData?.airaloOrderData, loadingUsage, usageData]);

  useEffect(() => {
    if (!visible) {
      // Reset state when modal closes
      setUsageData(null);
    }
  }, [visible]);

  // Fetch usage when modal opens
  useEffect(() => {
    if (visible && esimData?.iccid) {
      fetchUsage();
    }
  }, [visible, esimData?.iccid, fetchUsage]);

  const handleCopy = useCallback((text, label) => {
    try {
      Clipboard.setString(text);
      Alert.alert('Copied!', `${label} copied to clipboard`);
    } catch {
      Alert.alert('Error', 'Failed to copy');
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (!esimData) return;
    try {
      const message = `
eSIM Details:
Plan: ${esimData.planName || 'eSIM Plan'}
ICCID: ${esimData.iccid || 'N/A'}

Activation Code:
${qrData}

Scan the QR code in your phone's settings to activate.
      `.trim();
      await Share.share({ message, title: 'eSIM Activation Details' });
    } catch (error) {
      console.error('Share error:', error);
    }
  }, [esimData, qrData]);

  const handleAppleInstall = useCallback(() => {
    if (esimData?.directAppleInstallationUrl) {
      Linking.openURL(esimData.directAppleInstallationUrl);
    }
  }, [esimData?.directAppleInstallationUrl]);

  const handleDelete = useCallback(() => {
    if (!esimData || !userId) return;

    const esimName = esimData.planName || 'this eSIM';
    const isExpired = (esimData.status || '').toLowerCase() === 'expired' || 
                      (esimData.status || '').toLowerCase() === 'used';

    Alert.alert(
      'Delete eSIM?',
      `Are you sure you want to delete "${esimName}"?${isExpired ? '' : '\n\nWarning: This eSIM is still active.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const result = await deleteEsim(userId, esimData.id, esimData.iccid);
              
              if (result.success) {
                Alert.alert('Deleted', 'eSIM deleted successfully');
                onClose();
                // Notify parent to refresh list
                if (onDelete) {
                  onDelete(esimData.id);
                }
              } else {
                Alert.alert('Error', result.error || 'Failed to delete eSIM');
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete eSIM');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [esimData, userId, onClose, onDelete]);

  const formatDataUsage = (remaining, total, isUnlimited) => {
    if (isUnlimited) return { text: 'Unlimited', percentage: 100 };
    if (remaining == null || total == null) return null;

    const remainingGB = remaining >= 1024 ? (remaining / 1024).toFixed(1) : remaining;
    const totalGB = total >= 1024 ? (total / 1024).toFixed(1) : total;
    const unit = remaining >= 1024 ? 'GB' : 'MB';
    const percentage = Math.round((remaining / total) * 100);

    return { text: `${remainingGB} / ${totalGB} ${unit}`, percentage };
  };

  if (!esim) return null;

  const usage = usageData ? formatDataUsage(usageData.remaining, usageData.total, usageData.is_unlimited) : null;
  
  // Theme-aware colors
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.9)';
  const instructionsBg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
  const instructionsText = isDark ? '#93C5FD' : '#1E40AF';
  const instructionsStepBg = isDark ? 'rgba(59, 130, 246, 0.3)' : '#DBEAFE';
  const closeButtonBg = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  const closeButtonBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  
  // Extract country info from Firebase/Airalo data
  const getCountryInfo = () => {
    const orderData = esimData?.orderData || {};
    
    // Check multiple sources for country name (Firebase uses country_region)
    let name = esimData?.country_region || 
               esimData?.countryName || 
               esimData?.country_name || 
               orderData?.country_region ||
               '';
    
    // Check multiple sources for country code (2-letter ISO)
    let code = esimData?.country_code || 
               esimData?.countryCode ||
               orderData?.country_code ||
               '';
    
    // Fallback: Try to extract from country_codes array
    if (!name && esimData?.country_codes && Array.isArray(esimData.country_codes) && esimData.country_codes.length > 0) {
      const rawName = esimData.country_codes[0];
      name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }
    
    // Final fallbacks
    if (!name) name = 'eSIM';
    if (!code && name) code = name.substring(0, 2).toUpperCase();
    
    return { code, name };
  };
  
  const { code: countryCode, name: countryName } = getCountryInfo();

  // Close button content
  const closeButtonContent = (
    <View style={styles.closeButtonInner}>
      <X size={22} color={colors.text} />
    </View>
  );

  // Render close button with BlurView on iOS or solid fallback on Android
  const renderCloseButton = () => {
    if (Platform.OS === 'ios') {
      return (
        <Pressable onPress={onClose} hitSlop={12}>
          <BlurView
            intensity={60}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.closeButtonBlur, { borderColor: closeButtonBorder }]}
          >
            {closeButtonContent}
          </BlurView>
        </Pressable>
      );
    }

    return (
      <Pressable
        style={[
          styles.closeButtonFallback,
          { backgroundColor: closeButtonBg, borderColor: closeButtonBorder },
        ]}
        onPress={onClose}
        hitSlop={12}
      >
        {closeButtonContent}
      </Pressable>
    );
  };

  // Render action button
  const renderActionButton = ({ onPress, icon: Icon, label, variant = 'primary', style: buttonStyle }) => {
    const isPrimary = variant === 'primary';
    const isApple = variant === 'apple';
    
    const buttonBg = isPrimary 
      ? colors.primary 
      : isApple 
        ? (isDark ? '#FFFFFF' : '#000000')
        : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)');
    
    const textColor = isPrimary 
      ? '#FFFFFF' 
      : isApple 
        ? (isDark ? '#000000' : '#FFFFFF')
        : colors.text;

    return (
      <Pressable
        style={[
          styles.actionButton,
          { backgroundColor: buttonBg },
          buttonStyle,
        ]}
        onPress={onPress}
      >
        <View style={styles.buttonContent}>
          <Icon size={18} color={textColor} />
          <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.modalContainer}>
        {/* Transparent touch area to dismiss */}
        <Pressable style={styles.dismissArea} onPress={onClose} />
        
        <View style={[
          styles.sheetContainer, 
          { backgroundColor: isDark ? '#0A0A0B' : '#FAFAFA' }
        ]}>
          {/* Handle indicator */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }]} />
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {/* Header with Flag and Close Button */}
            <View style={styles.header}>
              <View style={[styles.flagContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                <FlagIcon
                  countryCode={countryCode}
                  width={52}
                  height={52}
                  isDark={isDark}
                  aspectRatio="1x1"
                />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.countryName, { color: colors.text }]} numberOfLines={1}>
                  {countryName}
                </Text>
                <Text style={[styles.planName, { color: colors.textSecondary }]}>
                  {esimData?.planName || 'eSIM Plan'}
                </Text>
              </View>
              {renderCloseButton()}
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: borderColor }]} />

            {/* Content */}
            <View style={styles.content}>
              {/* Usage Card */}
              {(loadingUsage || usage) && (
                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.cardHeader}>
                    <BarChart3 size={16} color={colors.primary} />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                      Data Usage
                    </Text>
                  </View>
                  
                  {loadingUsage ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : usage ? (
                    <View>
                      <View style={styles.usageRow}>
                        <Text style={[styles.usageLabel, { color: colors.textSecondary }]}>
                          Remaining
                        </Text>
                        <Text style={[styles.usageValue, { color: colors.primary }]}>
                          {usage.text}
                        </Text>
                      </View>
                      <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${usage.percentage}%`, backgroundColor: colors.primary },
                          ]}
                        />
                      </View>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Test Mode Banner */}
              {esimData?.isTestMode && (
                <View style={[styles.testModeBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                  <Text style={styles.testModeText}>🧪 TEST MODE</Text>
                  <Text style={styles.testModeSubtext}>
                    This is a sandbox eSIM for testing. The QR code below is for demonstration only.
                  </Text>
                </View>
              )}

              {/* QR Code - Always show if we have data */}
              {hasQrCode ? (
                <View style={styles.qrSection}>
                  <Text style={[styles.qrTitle, { color: colors.text }]}>
                    {esimData?.isTestMode ? 'Test QR Code' : 'Scan to Activate'}
                  </Text>
                  <View style={[styles.qrWrapper, { backgroundColor: '#FFFFFF' }]}>
                    <QRCode 
                      value={qrData} 
                      size={200}
                      backgroundColor="white"
                      color="black"
                    />
                  </View>
                  <Text style={[styles.qrHint, { color: colors.textSecondary }]}>
                    {esimData?.isTestMode 
                      ? 'This is a test QR code - not a real eSIM' 
                      : 'Scan this QR code in your device settings'}
                  </Text>
                </View>
              ) : (
                <View style={[styles.card, styles.noQrCard, { backgroundColor: cardBg, borderColor }]}>
                  <Text style={[styles.noQrText, { color: colors.textSecondary }]}>
                    QR code not available for this eSIM
                  </Text>
                </View>
              )}

              {/* eSIM Details */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.cardHeader}>
                  <Info size={16} color={colors.textSecondary} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    eSIM Details
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Plan
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {esimData?.planName || 'eSIM Plan'}
                  </Text>
                </View>

                {esimData?.data && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Data
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {esimData.data}
                    </Text>
                  </View>
                )}

                {esimData?.validity && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Validity
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {esimData.validity} days
                    </Text>
                  </View>
                )}

                {esimData?.iccid && (
                  <Pressable
                    onPress={() => handleCopy(esimData.iccid, 'ICCID')}
                    style={[styles.copyableItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                  >
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        ICCID
                      </Text>
                      <View style={styles.copyRow}>
                        <Text style={[styles.monoText, { color: colors.text }]} numberOfLines={1}>
                          {esimData.iccid}
                        </Text>
                        <Copy size={14} color={colors.textSecondary} />
                      </View>
                    </View>
                  </Pressable>
                )}

                {qrData && (
                  <Pressable
                    onPress={() => handleCopy(qrData, 'LPA Code')}
                    style={[styles.copyableItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                  >
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        LPA Code
                      </Text>
                      <View style={styles.copyRow}>
                        <Text
                          style={[styles.monoText, { color: colors.text }]}
                          numberOfLines={2}
                        >
                          {qrData}
                        </Text>
                        <Copy size={14} color={colors.textSecondary} />
                      </View>
                    </View>
                  </Pressable>
                )}
              </View>

              {/* Instructions */}
              <View style={[styles.card, styles.instructionsCard, { backgroundColor: instructionsBg, borderColor }]}>
                <Text style={[styles.instructionsTitle, { color: instructionsText }]}>
                  How to activate:
                </Text>
                {[
                  'Go to Settings → Cellular → Add eSIM',
                  'Choose "Use QR Code"',
                  'Scan the QR code above',
                  'Follow the prompts to add the eSIM',
                ].map((step, index) => (
                  <View key={index} style={styles.stepRow}>
                    <View style={[styles.stepNumber, { backgroundColor: instructionsStepBg }]}>
                      <Text style={[styles.stepNumberText, { color: instructionsText }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <Text style={[styles.stepText, { color: instructionsText }]}>
                      {step}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {qrData && renderActionButton({
                  onPress: () => handleCopy(qrData, 'eSIM Code'),
                  icon: Copy,
                  label: 'Copy Code',
                  variant: 'primary',
                  style: { flex: 1 },
                })}

                {renderActionButton({
                  onPress: handleShare,
                  icon: Share2,
                  label: 'Share',
                  variant: 'secondary',
                  style: { flex: 1 },
                })}
              </View>

              {/* Apple Direct Install */}
              {esimData?.directAppleInstallationUrl && renderActionButton({
                onPress: handleAppleInstall,
                icon: ExternalLink,
                label: 'Install on iPhone (Direct)',
                variant: 'apple',
                style: styles.appleButton,
              })}

              {/* Delete Button */}
              <View style={[styles.deleteSection, { borderTopColor: borderColor }]}>
                <Pressable
                  style={[
                    styles.deleteButton,
                    { 
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2',
                      opacity: deleting ? 0.5 : 1,
                    }
                  ]}
                  onPress={handleDelete}
                  disabled={deleting}
                >
                  <Trash2 size={18} color="#EF4444" />
                  <Text style={styles.deleteButtonText}>
                    {deleting ? 'Deleting...' : 'Delete eSIM'}
                  </Text>
                </Pressable>
                <Text style={[styles.deleteHint, { color: colors.textSecondary }]}>
                  This will permanently remove this eSIM from your account
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  // Close button styles
  closeButtonBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
  },
  closeButtonFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
  },
  closeButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  flagContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerText: {
    flex: 1,
  },
  countryName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  planName: {
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  content: {
    gap: 16,
  },
  // Card styles
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Usage styles
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  usageLabel: {
    fontSize: 14,
  },
  usageValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  // QR Section
  qrSection: {
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 20,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  qrWrapper: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: { 
        elevation: 8,
      },
    }),
  },
  qrHint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  noQrCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noQrText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Test Mode Banner
  testModeBanner: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  testModeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  testModeSubtext: {
    fontSize: 12,
    color: '#B45309',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Detail styles
  detailItem: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  copyableItem: {
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  monoText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  // Instructions
  instructionsCard: {
    paddingVertical: 16,
  },
  instructionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepText: {
    fontSize: 14,
    flex: 1,
  },
  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    borderRadius: 16,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  appleButton: {
    marginTop: 4,
  },
  // Delete section
  deleteSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginBottom: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  deleteHint: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default memo(EsimDetailsModal);
