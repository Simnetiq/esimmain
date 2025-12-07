'use client';

import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection } from '@esim/shared/utils/languageUtils';

const RTLWrapper = ({ children }) => {
  const { locale } = useI18n();
  const direction = getLanguageDirection(locale);
  
  return (
    <div dir={direction} lang={locale}>
      {children}
    </div>
  );
};

export default RTLWrapper;
