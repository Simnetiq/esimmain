'use client';

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useRouter } from 'next/navigation';

// Icons
const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const AppleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
);

const UserIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const AuthModal = ({ isOpen, onClose, onAuthenticated }) => {
    const { signInWithGoogle, signInWithApple, loginAsGuest } = useAuth();
    const { t } = useI18n();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    if (!isOpen) return null;



    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            await signInWithGoogle();
            // OAuth redirects the page — don't call onAuthenticated/onClose
        } catch (error) {
            console.error('Google login failed', error);
            setLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        try {
            setLoading(true);
            await signInWithApple();
            // OAuth redirects the page — don't call onAuthenticated/onClose
        } catch (error) {
            console.error('Apple login failed', error);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--card-border)' }}>
                <div className="p-6 sm:p-8">
                    <div className="text-center mb-8">
                        <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4"
                            style={{ backgroundColor: 'rgba(73, 117, 212, 0.1)' }}>
                            <UserIcon className="w-6 h-6 text-tufts-blue" />
                        </div>
                        <h2 className="text-2xl font-bold text-text-primary mb-2">
                            {t('auth.modal.title', 'Quick Checkout')}
                        </h2>
                    </div>

                    <div className="space-y-3">
                        <div className="relative py-3">
                            <div className="flex justify-center text-sm">
                                <span className="px-2 text-text-muted" style={{ backgroundColor: 'var(--bg-primary)' }}>
                                    {t('auth.modal.subtitle', 'Choose how you want to continue')}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors disabled:opacity-50"
                                style={{
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '1px solid var(--card-border)',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                            >
                                <GoogleIcon />
                                <span className="text-sm font-medium text-text-primary">Google</span>
                            </button>
                            <button
                                onClick={handleAppleLogin}
                                disabled={loading}
                                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors disabled:opacity-50"
                                style={{
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '1px solid var(--card-border)',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                            >
                                <AppleIcon />
                                <span className="text-sm font-medium text-text-primary">Apple</span>
                            </button>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-xs text-text-muted">
                        {t('auth.modal.disclaimer', 'By continuing, you verify that you are at least 18 years old and agree to our Terms of Service.')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
