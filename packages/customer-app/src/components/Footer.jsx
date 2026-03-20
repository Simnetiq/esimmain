'use client';

import React, { memo, useMemo } from 'react';
import Link from 'next/link';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { appStoreLinks } from '@esim/shared/utils/appStoreLinks';

// Inline SVG icons for optimization
const XIcon = memo(() => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
));
XIcon.displayName = 'XIcon';

const LinkedInIcon = memo(() => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
));
LinkedInIcon.displayName = 'LinkedInIcon';

const InstagramIcon = memo(() => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
));
InstagramIcon.displayName = 'InstagramIcon';

const MailIcon = memo(() => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
));
MailIcon.displayName = 'MailIcon';

const AppleIcon = memo(() => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
));
AppleIcon.displayName = 'AppleIcon';

const AndroidIcon = memo(() => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4483-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993.0001.5511-.4482.9997-.9993.9997zm-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993 0 .5511-.4483.9997-.9993.9997zm11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396z"/>
  </svg>
));
AndroidIcon.displayName = 'AndroidIcon';

// Footer link component
const FooterLink = memo(({ href, children, external = false, icon: Icon = null }) => {
  const linkProps = external
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  const Component = external ? 'a' : Link;

  return (
    <Component
      href={href}
      className="text-text-muted hover:text-tufts-blue transition-colors duration-200 text-sm py-1 flex items-center gap-2 rtl-native-flex"
      {...linkProps}
    >
      {Icon && <Icon />}
      {children}
    </Component>
  );
});
FooterLink.displayName = 'FooterLink';

// Footer column component
const FooterColumn = memo(({ title, children }) => (
  <div className="flex flex-col gap-4 items-start">
    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider rtl:tracking-tight">
      {title}
    </h3>
    <div className="flex flex-col gap-2 items-start">
      {children}
    </div>
  </div>
));
FooterColumn.displayName = 'FooterColumn';

// Social link component
const SocialLink = memo(({ href, icon: Icon, label, external = true }) => (
  <a
    href={href}
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
    className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-tufts-blue hover:scale-110 rounded-full hover:bg-[var(--hover-bg)] transition-all duration-200"
    aria-label={label}
  >
    <Icon />
  </a>
));
SocialLink.displayName = 'SocialLink';

const Footer = () => {
  const { t, locale } = useI18n();

  // Localize internal URLs — same pattern as Navbar
  const getLocalizedUrl = (path) => {
    if (locale === 'en') return path;
    return `/${locale}${path}`;
  };

  // Footer data with proper localization
  const footerSections = useMemo(() => ({
    product: {
      title: t('footer.product', 'PRODUCT'),
      links: [
        { name: t('footer.esimPlans', 'eSIM Plans'), path: getLocalizedUrl('/esim-plans') },
        { name: t('footer.appStore', 'iOS App'), path: appStoreLinks.ios, external: true, icon: AppleIcon },
        { name: t('footer.googlePlay', 'Android App'), path: appStoreLinks.android, external: true, icon: AndroidIcon },
      ]
    },
    support: {
      title: t('footer.support', 'SUPPORT'),
      links: [
        { name: t('footer.contact', 'Contact Us'), path: getLocalizedUrl('/contact') },
        { name: t('footer.faq', 'FAQ'), path: getLocalizedUrl('/#how-it-works') },
      ]
    },
    company: {
      title: t('footer.company', 'COMPANY'),
      links: [
        { name: t('footer.about', 'About'), path: getLocalizedUrl('/about') },
        { name: t('footer.blog', 'Blog'), path: getLocalizedUrl('/blog') },
        // Cross-promo links — English-only (no locale versions exist)
        { name: t('footer.simnetiq', 'Simnetiq'), path: '/simnetiq' },
        { name: t('footer.dopplerVpn', 'Doppler VPN'), path: '/doppler-vpn' },
      ]
    },
    legal: {
      title: t('footer.legal', 'LEGAL'),
      // Legal pages — English-only (no locale versions exist)
      links: [
        { name: t('footer.privacyPolicy', 'Privacy Policy'), path: '/privacy-policy' },
        { name: t('footer.termsOfService', 'Terms of Service'), path: '/terms-of-service' },
        { name: t('footer.cookiePolicy', 'Cookie Policy'), path: '/cookie-policy' },
      ]
    }
  }), [t, locale]);

  const socialLinks = [
    { icon: LinkedInIcon, href: 'https://www.linkedin.com/company/109536645', label: 'LinkedIn' },
    { icon: InstagramIcon, href: 'https://www.instagram.com/esim.Simnetiq', label: 'Instagram' },
    { icon: MailIcon, href: 'mailto:support@simnetiq.store', label: 'Email' },
  ];

  return (
    <footer
      className="relative overflow-hidden"
    >
      {/* Top Border — gradient fade */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--divider)] to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main Footer Content */}
        <div className="py-16 lg:py-20">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 lg:gap-12">
            {/* Brand Column — gradient card */}
            <div className="col-span-2 lg:col-span-2 relative items-start text-start">
              <div className="flex flex-col items-start bg-gradient-to-br from-[var(--card-bg)] to-transparent p-6 -mx-2">
                <Link href={getLocalizedUrl("/")} className="inline-block mb-4 group">
                  <span className="text-3xl font-bold text-text-primary group-hover:text-tufts-blue transition-colors">
                    {t('footer.brandName', 'Simnetiq')}
                  </span>
                </Link>
                <p className="text-text-muted text-sm max-w-xs mb-6 leading-relaxed text-start">
                  {t('footer.tagline', 'Stay connected wherever you travel. Instant eSIM activation for 200+ countries.')}
                </p>
                {/* Social Icons */}
                <div className="flex gap-1 rtl-native-flex">
                  {socialLinks.map((social, index) => (
                    <SocialLink
                      key={index}
                      href={social.href}
                      icon={social.icon}
                      label={social.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Link Columns */}
            <FooterColumn title={footerSections.product.title}>
              {footerSections.product.links.map((link, index) => (
                <FooterLink
                  key={index}
                  href={link.path}
                  external={link.external}
                  icon={link.icon}
                >
                  {link.name}
                </FooterLink>
              ))}
            </FooterColumn>

            <FooterColumn title={footerSections.support.title}>
              {footerSections.support.links.map((link, index) => (
                <FooterLink key={index} href={link.path} external={link.external}>
                  {link.name}
                </FooterLink>
              ))}
            </FooterColumn>

            <FooterColumn title={footerSections.company.title}>
              {footerSections.company.links.map((link, index) => (
                <FooterLink key={index} href={link.path} external={link.external}>
                  {link.name}
                </FooterLink>
              ))}
            </FooterColumn>

            <FooterColumn title={footerSections.legal.title}>
              {footerSections.legal.links.map((link, index) => (
                <FooterLink key={index} href={link.path} external={link.external}>
                  {link.name}
                </FooterLink>
              ))}
            </FooterColumn>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[var(--divider)] py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rtl-native-flex">
            <p className="text-text-muted text-sm">
              &copy; {new Date().getFullYear()} {t('footer.brandName', 'Simnetiq')} &middot; {t('footer.allRightsReserved', 'All rights reserved')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default memo(Footer);
