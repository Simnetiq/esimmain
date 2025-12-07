import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Hr,
} from '@react-email/components';

export default function PurchaseConfirmationEmail({ 
  name, 
  orderNumber,
  planName,
  amount,
  currency = 'USD',
  qrCodeUrl,
  activationInstructions,
  language = 'en'
}) {
  // Translations
  const translations = {
    en: {
      title: 'Your eSIM is Ready!',
      greeting: 'Hi',
      thankYou: 'Thank you for your purchase! Your eSIM has been successfully activated and is ready to use.',
      orderDetails: 'Order Details',
      orderNumber: 'Order Number',
      plan: 'Plan',
      amount: 'Amount',
      nextSteps: 'Next Steps',
      step1Title: '1. Download Your eSIM',
      step1Text: 'Click the button below to view your QR code and activation instructions.',
      step2Title: '2. Install the eSIM',
      step2Text: 'Scan the QR code with your device camera or enter the activation code manually.',
      step3Title: '3. Activate & Connect',
      step3Text: 'Once installed, enable the eSIM in your device settings and start using your data.',
      viewQRButton: 'View QR Code & Instructions',
      support: 'Need help? Contact our support team anytime.',
      footer: 'All rights reserved.',
      ifNotYou: 'If you didn\'t make this purchase, please contact us immediately.'
    },
    es: {
      title: '¡Tu eSIM está lista!',
      greeting: 'Hola',
      thankYou: '¡Gracias por tu compra! Tu eSIM ha sido activada exitosamente y está lista para usar.',
      orderDetails: 'Detalles del Pedido',
      orderNumber: 'Número de Pedido',
      plan: 'Plan',
      amount: 'Monto',
      nextSteps: 'Próximos Pasos',
      step1Title: '1. Descarga tu eSIM',
      step1Text: 'Haz clic en el botón de abajo para ver tu código QR e instrucciones de activación.',
      step2Title: '2. Instala la eSIM',
      step2Text: 'Escanea el código QR con la cámara de tu dispositivo o ingresa el código de activación manualmente.',
      step3Title: '3. Activa y Conecta',
      step3Text: 'Una vez instalada, habilita la eSIM en la configuración de tu dispositivo y comienza a usar tus datos.',
      viewQRButton: 'Ver Código QR e Instrucciones',
      support: '¿Necesitas ayuda? Contacta a nuestro equipo de soporte en cualquier momento.',
      footer: 'Todos los derechos reservados.',
      ifNotYou: 'Si no realizaste esta compra, contáctanos inmediatamente.'
    },
    fr: {
      title: 'Votre eSIM est prête!',
      greeting: 'Bonjour',
      thankYou: 'Merci pour votre achat! Votre eSIM a été activée avec succès et est prête à être utilisée.',
      orderDetails: 'Détails de la Commande',
      orderNumber: 'Numéro de Commande',
      plan: 'Plan',
      amount: 'Montant',
      nextSteps: 'Prochaines Étapes',
      step1Title: '1. Téléchargez votre eSIM',
      step1Text: 'Cliquez sur le bouton ci-dessous pour voir votre code QR et les instructions d\'activation.',
      step2Title: '2. Installez l\'eSIM',
      step2Text: 'Scannez le code QR avec l\'appareil photo de votre appareil ou entrez le code d\'activation manuellement.',
      step3Title: '3. Activez et Connectez',
      step3Text: 'Une fois installée, activez l\'eSIM dans les paramètres de votre appareil et commencez à utiliser vos données.',
      viewQRButton: 'Voir le Code QR et les Instructions',
      support: 'Besoin d\'aide? Contactez notre équipe de support à tout moment.',
      footer: 'Tous droits réservés.',
      ifNotYou: 'Si vous n\'avez pas effectué cet achat, veuillez nous contacter immédiatement.'
    },
    de: {
      title: 'Ihre eSIM ist bereit!',
      greeting: 'Hallo',
      thankYou: 'Vielen Dank für Ihren Kauf! Ihre eSIM wurde erfolgreich aktiviert und ist einsatzbereit.',
      orderDetails: 'Bestelldetails',
      orderNumber: 'Bestellnummer',
      plan: 'Plan',
      amount: 'Betrag',
      nextSteps: 'Nächste Schritte',
      step1Title: '1. Laden Sie Ihre eSIM herunter',
      step1Text: 'Klicken Sie auf die Schaltfläche unten, um Ihren QR-Code und die Aktivierungsanweisungen anzuzeigen.',
      step2Title: '2. Installieren Sie die eSIM',
      step2Text: 'Scannen Sie den QR-Code mit Ihrer Gerätekamera oder geben Sie den Aktivierungscode manuell ein.',
      step3Title: '3. Aktivieren & Verbinden',
      step3Text: 'Sobald sie installiert ist, aktivieren Sie die eSIM in Ihren Geräteeinstellungen und beginnen Sie, Ihre Daten zu nutzen.',
      viewQRButton: 'QR-Code & Anweisungen anzeigen',
      support: 'Brauchen Sie Hilfe? Kontaktieren Sie unser Support-Team jederzeit.',
      footer: 'Alle Rechte vorbehalten.',
      ifNotYou: 'Wenn Sie diesen Kauf nicht getätigt haben, kontaktieren Sie uns bitte umgehend.'
    },
    ar: {
      title: 'بطاقة eSIM الخاصة بك جاهزة!',
      greeting: 'مرحباً',
      thankYou: 'شكراً لك على الشراء! تم تفعيل بطاقة eSIM الخاصة بك بنجاح وهي جاهزة للاستخدام.',
      orderDetails: 'تفاصيل الطلب',
      orderNumber: 'رقم الطلب',
      plan: 'الخطة',
      amount: 'المبلغ',
      nextSteps: 'الخطوات التالية',
      step1Title: '1. تنزيل بطاقة eSIM',
      step1Text: 'انقر على الزر أدناه لعرض رمز QR وتعليمات التفعيل.',
      step2Title: '2. تثبيت بطاقة eSIM',
      step2Text: 'امسح رمز QR بكاميرا جهازك أو أدخل رمز التفعيل يدوياً.',
      step3Title: '3. التفعيل والاتصال',
      step3Text: 'بمجرد التثبيت، قم بتفعيل بطاقة eSIM في إعدادات جهازك وابدأ في استخدام بياناتك.',
      viewQRButton: 'عرض رمز QR والتعليمات',
      support: 'هل تحتاج إلى مساعدة؟ اتصل بفريق الدعم في أي وقت.',
      footer: 'جميع الحقوق محفوظة.',
      ifNotYou: 'إذا لم تقم بهذا الشراء، يرجى الاتصال بنا على الفور.'
    },
    ru: {
      title: 'Ваша eSIM готова!',
      greeting: 'Привет',
      thankYou: 'Спасибо за покупку! Ваша eSIM успешно активирована и готова к использованию.',
      orderDetails: 'Детали заказа',
      orderNumber: 'Номер заказа',
      plan: 'План',
      amount: 'Сумма',
      nextSteps: 'Следующие шаги',
      step1Title: '1. Загрузите вашу eSIM',
      step1Text: 'Нажмите кнопку ниже, чтобы просмотреть QR-код и инструкции по активации.',
      step2Title: '2. Установите eSIM',
      step2Text: 'Отсканируйте QR-код камерой вашего устройства или введите код активации вручную.',
      step3Title: '3. Активируйте и подключитесь',
      step3Text: 'После установки включите eSIM в настройках устройства и начните использовать свои данные.',
      viewQRButton: 'Просмотреть QR-код и инструкции',
      support: 'Нужна помощь? Свяжитесь с нашей службой поддержки в любое время.',
      footer: 'Все права защищены.',
      ifNotYou: 'Если вы не совершали эту покупку, немедленно свяжитесь с нами.'
    },
    he: {
      title: 'ה-eSIM שלך מוכן!',
      greeting: 'שלום',
      thankYou: 'תודה על הרכישה! ה-eSIM שלך הופעל בהצלחה ומוכן לשימוש.',
      orderDetails: 'פרטי ההזמנה',
      orderNumber: 'מספר הזמנה',
      plan: 'תוכנית',
      amount: 'סכום',
      nextSteps: 'השלבים הבאים',
      step1Title: '1. הורד את ה-eSIM שלך',
      step1Text: 'לחץ על הכפתור למטה כדי לצפות בקוד QR ובהוראות ההפעלה.',
      step2Title: '2. התקן את ה-eSIM',
      step2Text: 'סרוק את קוד ה-QR עם מצלמת המכשיר שלך או הזן את קוד ההפעלה באופן ידני.',
      step3Title: '3. הפעל והתחבר',
      step3Text: 'לאחר ההתקנה, הפעל את ה-eSIM בהגדרות המכשיר שלך והתחל להשתמש בנתונים שלך.',
      viewQRButton: 'צפה בקוד QR ובהוראות',
      support: 'צריך עזרה? צור קשר עם צוות התמיכה שלנו בכל עת.',
      footer: 'כל הזכויות שמורות.',
      ifNotYou: 'אם לא ביצעת רכישה זו, אנא צור איתנו קשר מיד.'
    }
  };

  const t = translations[language] || translations.en;
  const isRTL = language === 'ar' || language === 'he';

  return (
    <Html dir={isRTL ? 'rtl' : 'ltr'}>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>{t.title}</Heading>
          </Section>

          <Section style={content}>
            <Text style={paragraph}>
              {t.greeting} {name || 'there'},
            </Text>
            <Text style={paragraph}>
              {t.thankYou}
            </Text>

            {/* Order Details */}
            <Section style={orderBox}>
              <Heading style={orderBoxTitle}>{t.orderDetails}</Heading>
              <Hr style={orderHr} />
              <div style={orderRow}>
                <Text style={orderLabel}>{t.orderNumber}:</Text>
                <Text style={orderValue}>{orderNumber}</Text>
              </div>
              <div style={orderRow}>
                <Text style={orderLabel}>{t.plan}:</Text>
                <Text style={orderValue}>{planName}</Text>
              </div>
              <div style={orderRow}>
                <Text style={orderLabel}>{t.amount}:</Text>
                <Text style={orderValue}>{currency} {amount}</Text>
              </div>
            </Section>

            {/* Next Steps */}
            <Heading style={h2}>{t.nextSteps}</Heading>
            
            <Section style={stepBox}>
              <Text style={stepTitle}>{t.step1Title}</Text>
              <Text style={stepText}>{t.step1Text}</Text>
            </Section>

            <Section style={stepBox}>
              <Text style={stepTitle}>{t.step2Title}</Text>
              <Text style={stepText}>{t.step2Text}</Text>
            </Section>

            <Section style={stepBox}>
              <Text style={stepTitle}>{t.step3Title}</Text>
              <Text style={stepText}>{t.step3Text}</Text>
            </Section>

            {/* CTA Button */}
            {qrCodeUrl && (
              <Section style={buttonContainer}>
                <Button style={button} href={qrCodeUrl}>
                  {t.viewQRButton}
                </Button>
              </Section>
            )}

            <Text style={supportText}>
              {t.support}
            </Text>

            <Text style={warningText}>
              {t.ifNotYou}
            </Text>
          </Section>

          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Simnetiq. {t.footer}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 24px',
  backgroundColor: '#4975D4',
  textAlign: 'center',
};

const h1 = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
};

const h2 = {
  color: '#172C2E',
  fontSize: '24px',
  fontWeight: 'bold',
  marginTop: '32px',
  marginBottom: '16px',
};

const content = {
  padding: '0 24px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#172C2E',
};

const orderBox = {
  backgroundColor: '#f4f4f5',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const orderBoxTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#172C2E',
  margin: '0 0 12px 0',
};

const orderHr = {
  borderColor: '#d1d5db',
  margin: '12px 0',
};

const orderRow = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '8px',
};

const orderLabel = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0',
};

const orderValue = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#172C2E',
  margin: '0',
};

const stepBox = {
  marginBottom: '16px',
};

const stepTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#4975D4',
  margin: '0 0 8px 0',
};

const stepText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#6b7280',
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center',
  margin: '32px 0',
};

const button = {
  backgroundColor: '#4975D4',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'inline-block',
  padding: '14px 32px',
};

const supportText = {
  fontSize: '14px',
  color: '#6b7280',
  textAlign: 'center',
  marginTop: '24px',
};

const warningText = {
  fontSize: '12px',
  color: '#9ca3af',
  marginTop: '24px',
  fontStyle: 'italic',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  padding: '0 24px',
};

const footerText = {
  fontSize: '12px',
  color: '#8898aa',
  textAlign: 'center',
  margin: '4px 0',
};

