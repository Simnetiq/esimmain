'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ShieldX, Clock, Mail, AlertTriangle, X, Send, CheckCircle } from 'lucide-react';
import { useI18n } from '@esim/shared/contexts/I18nContext';

/**
 * FraudBlockedModal
 * 
 * Shows a modal when a user is blocked from making purchases due to fraud detection.
 * 
 * Features:
 * - Countdown timer for temporary blocks
 * - Support contact form for appeals
 * - Different messages for temporary vs permanent blocks
 * 
 * Props:
 * - isOpen: boolean - Whether the modal is visible
 * - onClose: function - Called when modal is dismissed
 * - blockType: 'temporary' | 'permanent' | 'card_blocked' | 'ip_blocked'
 * - message: string - The block reason message
 * - expiresAt: string (ISO date) - When temporary block expires
 * - remainingHours: number - Hours remaining for temporary block
 * - canContactSupport: boolean - Whether user can submit an appeal
 * - userId: string - User ID for appeal
 * - email: string - User email for appeal
 */
const FraudBlockedModal = ({
  isOpen,
  onClose,
  blockType = 'temporary',
  message,
  expiresAt,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  remainingHours,
  canContactSupport = true,
  userId,
  email
}) => {
  const { t } = useI18n();
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [contactEmail, setContactEmail] = useState(email || '');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Calculate countdown from expiresAt
  useEffect(() => {
    if (!expiresAt || blockType !== 'temporary') return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
        // Block has expired - close modal and let user retry
        if (onClose) onClose();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, blockType, onClose]);

  // Submit appeal to backend
  const handleSubmitAppeal = useCallback(async () => {
    if (!appealReason.trim() || !contactEmail.trim()) return;

    setSubmittingAppeal(true);

    try {
      const response = await fetch('/api/fraud-appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email,
          contactEmail,
          reason: appealReason
        })
      });

      const data = await response.json();

      if (data.success) {
        setAppealSubmitted(true);
        setShowAppealForm(false);
      } else {
        alert(data.error || t('fraudBlock.appealFailed', 'Failed to submit appeal. Please try again.'));
      }
    } catch (error) {
      console.error('Error submitting appeal:', error);
      alert(t('fraudBlock.appealError', 'An error occurred. Please try again later.'));
    } finally {
      setSubmittingAppeal(false);
    }
  }, [appealReason, contactEmail, userId, email, t]);

  if (!isOpen) return null;

  const isTemporary = blockType === 'temporary';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isPermanent = blockType === 'permanent';
  const isCardBlocked = blockType === 'card_blocked';

  // Get appropriate icon and colors
  const getBlockStyle = () => {
    if (isTemporary) {
      return {
        icon: Clock,
        bgColor: 'bg-amber-50',
        iconColor: 'text-amber-500',
        borderColor: 'border-amber-200',
        titleColor: 'text-amber-800'
      };
    }
    return {
      icon: ShieldX,
      bgColor: 'bg-red-50',
      iconColor: 'text-red-500',
      borderColor: 'border-red-200',
      titleColor: 'text-red-800'
    };
  };

  const style = getBlockStyle();
  const IconComponent = style.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden ${style.borderColor} border-2`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Header with icon */}
        <div className={`${style.bgColor} p-6 text-center`}>
          <div className={`mx-auto w-16 h-16 rounded-full ${style.bgColor} border-4 ${style.borderColor} flex items-center justify-center mb-4`}>
            <IconComponent className={`w-8 h-8 ${style.iconColor}`} />
          </div>
          
          <h2 className={`text-xl font-bold ${style.titleColor}`}>
            {isTemporary 
              ? t('fraudBlock.temporaryTitle', 'Account Temporarily Restricted')
              : isCardBlocked
                ? t('fraudBlock.cardBlockedTitle', 'Payment Method Blocked')
                : t('fraudBlock.permanentTitle', 'Account Restricted')
            }
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Message */}
          <p className="text-gray-700 text-center mb-6">
            {message || (isTemporary 
              ? t('fraudBlock.temporaryMessage', 'Your account has been temporarily restricted due to suspicious payment activity.')
              : t('fraudBlock.permanentMessage', 'Your account has been restricted due to suspicious activity. Please contact support.')
            )}
          </p>

          {/* Countdown Timer for Temporary Blocks */}
          {isTemporary && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 text-center mb-3">
                {t('fraudBlock.restrictionEndsIn', 'Restriction ends in:')}
              </p>
              <div className="flex justify-center gap-3">
                <div className="text-center">
                  <div className="bg-gray-800 text-white rounded-lg px-4 py-2 text-2xl font-mono font-bold min-w-[60px]">
                    {String(countdown.hours).padStart(2, '0')}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t('fraudBlock.hours', 'Hours')}</p>
                </div>
                <div className="text-2xl font-bold text-gray-400 self-start pt-2">:</div>
                <div className="text-center">
                  <div className="bg-gray-800 text-white rounded-lg px-4 py-2 text-2xl font-mono font-bold min-w-[60px]">
                    {String(countdown.minutes).padStart(2, '0')}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t('fraudBlock.minutes', 'Minutes')}</p>
                </div>
                <div className="text-2xl font-bold text-gray-400 self-start pt-2">:</div>
                <div className="text-center">
                  <div className="bg-gray-800 text-white rounded-lg px-4 py-2 text-2xl font-mono font-bold min-w-[60px]">
                    {String(countdown.seconds).padStart(2, '0')}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t('fraudBlock.seconds', 'Seconds')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Appeal Submitted Success */}
          {appealSubmitted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-800 font-medium">
                    {t('fraudBlock.appealSubmitted', 'Appeal Submitted')}
                  </p>
                  <p className="text-green-700 text-sm mt-1">
                    {t('fraudBlock.appealReviewMessage', 'Our team will review your appeal within 24-48 hours and contact you at the provided email address.')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Appeal Form */}
          {showAppealForm && !appealSubmitted && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fraudBlock.contactEmail', 'Contact Email')}
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tufts-blue focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fraudBlock.appealReason', 'Why should we review your account?')}
                </label>
                <textarea
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder={t('fraudBlock.appealPlaceholder', 'Please explain why you believe this is a mistake...')}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tufts-blue focus:border-transparent resize-none"
                />
              </div>
              <button
                onClick={handleSubmitAppeal}
                disabled={submittingAppeal || !appealReason.trim() || !contactEmail.trim()}
                className="w-full flex items-center justify-center gap-2 bg-tufts-blue text-white py-3 rounded-lg hover:bg-tufts-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingAppeal ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('fraudBlock.submitting', 'Submitting...')}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {t('fraudBlock.submitAppeal', 'Submit Appeal')}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Contact Support Button */}
          {canContactSupport && !showAppealForm && !appealSubmitted && (
            <button
              onClick={() => setShowAppealForm(true)}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Mail className="w-4 h-4" />
              {t('fraudBlock.contactSupport', 'Contact Support')}
            </button>
          )}

          {/* Warning note */}
          {!appealSubmitted && (
            <div className="mt-6 flex items-start gap-2 text-xs text-gray-500">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                {t('fraudBlock.warningNote', 'This restriction was applied to protect our platform from fraudulent transactions. If you believe this is an error, please contact our support team.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FraudBlockedModal;
