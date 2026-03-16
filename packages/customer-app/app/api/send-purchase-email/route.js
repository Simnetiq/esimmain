import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { sendEmail } from '@esim/shared/lib/email';
import { verifyAdminKey } from '@esim/shared/lib/apiAuth';
import PurchaseConfirmationEmail from '../../../emails/PurchaseConfirmationEmail';

/**
 * Send purchase confirmation email with QR code
 * Supports multiple languages
 */
export async function POST(request) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  try {
    const { 
      email, 
      name, 
      orderNumber,
      planName,
      amount,
      currency = 'USD',
      qrCodeUrl,
      language = 'en'
    } = await request.json();

    if (!email || !orderNumber) {
      return NextResponse.json(
        { error: 'Email and order number are required' },
        { status: 400 }
      );
    }

    // Render the email template with language support
    const emailHtml = await render(
      <PurchaseConfirmationEmail 
        name={name}
        orderNumber={orderNumber}
        planName={planName}
        amount={amount}
        currency={currency}
        qrCodeUrl={qrCodeUrl}
        language={language}
      />
    );

    // Subject translations
    const subjects = {
      en: 'Your eSIM is Ready! - Simnetiq',
      es: '¡Tu eSIM está lista! - Simnetiq',
      fr: 'Votre eSIM est prête! - Simnetiq',
      de: 'Ihre eSIM ist bereit! - Simnetiq',
      ar: 'بطاقة eSIM الخاصة بك جاهزة! - Simnetiq',
      ru: 'Ваша eSIM готова! - Simnetiq',
      he: 'ה-eSIM שלך מוכן! - Simnetiq'
    };

    const subject = subjects[language] || subjects.en;

    // Plain text version (English fallback)
    const emailText = `
Hi ${name || 'there'},

Thank you for your purchase! Your eSIM has been successfully activated and is ready to use.

Order Details:
- Order Number: ${orderNumber}
- Plan: ${planName}
- Amount: ${currency} ${amount}

Next Steps:
1. View your QR code and activation instructions
2. Install the eSIM on your device
3. Activate and start using your data

${qrCodeUrl ? `View your QR code: ${qrCodeUrl}` : ''}

Need help? Contact our support team anytime.

© ${new Date().getFullYear()} Simnetiq. All rights reserved.
    `;

    // Send email via Hostinger
    const result = await sendEmail({
      to: email,
      subject: subject,
      html: emailHtml,
      text: emailText,
    });

    return NextResponse.json({ 
      success: true,
      message: 'Purchase confirmation email sent successfully',
      messageId: result.messageId,
      email,
      language
    });

  } catch (error) {
    console.error('❌ Failed to send purchase confirmation email:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send purchase confirmation email', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

