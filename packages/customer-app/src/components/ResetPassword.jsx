'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token || !email) {
        toast.error(t('auth.resetPassword.invalidLink', 'Invalid reset link'));
        router.push('/forgot-password');
        return;
      }

      try {
        
        const response = await fetch('/api/verify-reset-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email }),
        });

        
        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error;
          toast.error(errorMessage || t('auth.resetPassword.expiredLink', 'Invalid or expired reset link'));
          setTimeout(() => router.push('/forgot-password'), 2000);
          return;
        }

        setTokenValid(true);
      } catch (error) {
        toast.error(t('auth.resetPassword.verifyFailed', 'Failed to verify reset link'));
        setTimeout(() => router.push('/forgot-password'), 2000);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token, email, router, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (password.length < 6) {
      toast.error(t('auth.resetPassword.passwordTooShort', 'Password must be at least 6 characters long'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('auth.resetPassword.passwordsNoMatch', 'Passwords do not match'));
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error;
        toast.error(errorMessage || t('auth.resetPassword.resetFailed', 'Failed to reset password'));
        return;
      }

      setResetSuccess(true);
      toast.success(t('auth.resetPassword.resetSuccess', 'Password reset successful! Redirecting to login...'));
      
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch {
      toast.error(t('auth.resetPassword.resetError', 'Failed to reset password. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('auth.resetPassword.verifying', 'Verifying reset link...')}</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return null; // Will redirect
  }

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.resetPassword.successTitle', 'Password Reset Successful!')}</h2>
          <p className="text-gray-600">{t('auth.resetPassword.redirecting', 'Redirecting to login page...')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div>
          <div className="flex justify-center">
            <div className="bg-primary-blue rounded-full p-3">
              <Lock className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            {t('auth.resetPassword.title', 'Reset Your Password')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('auth.resetPassword.subtitle', 'Enter your new password below')}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.resetPassword.newPassword', 'New Password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary-blue focus:border-primary-blue focus:z-10 sm:text-sm"
                  placeholder={t('auth.resetPassword.newPasswordPlaceholder', 'Enter new password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-2 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {password && password.length < 6 && (
                <p className="mt-1 text-xs text-red-600 flex items-center">
                  <XCircle className="h-3 w-3 mr-1" />
                  {t('auth.resetPassword.minLength', 'Password must be at least 6 characters')}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.resetPassword.confirmPassword', 'Confirm Password')}
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary-blue focus:border-primary-blue focus:z-10 sm:text-sm"
                  placeholder={t('auth.resetPassword.confirmPasswordPlaceholder', 'Confirm new password')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-600 flex items-center">
                  <XCircle className="h-3 w-3 mr-1" />
                  {t('auth.resetPassword.noMatch', 'Passwords do not match')}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || password !== confirmPassword || password.length < 6}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  {t('auth.resetPassword.resetting', 'Resetting Password...')}
                </>
              ) : (
                t('auth.resetPassword.resetButton', 'Reset Password')
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-sm text-primary-blue hover:text-blue-700"
            >
              {t('auth.resetPassword.backToLogin', 'Back to Login')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

