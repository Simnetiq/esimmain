import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function POST(request) {
  try {
    const { email, userName, otpCode } = await request.json();

    if (!email || !userName || !otpCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Email HTML template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - Simnetiq</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #468BE6 0%, #3B7DD4 100%); border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Simnetiq</h1>
                      <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Global eSIM Solutions</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Welcome, ${userName}!</h2>
                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                        Thank you for signing up with Simnetiq. To complete your registration, please use the verification code below:
                      </p>
                      
                      <!-- OTP Code Box -->
                      <table role="presentation" style="width: 100%; margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <div style="background-color: #f8f9fa; border: 2px dashed #468BE6; border-radius: 8px; padding: 20px; display: inline-block;">
                              <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                              <p style="margin: 0; color: #468BE6; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otpCode}</p>
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                        This code will expire in <strong>10 minutes</strong>. If you didn't request this code, please ignore this email.
                      </p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%; margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="https://www.simnetiq.store/verify-email?email=${encodeURIComponent(email)}" 
                               style="display: inline-block; padding: 14px 40px; background-color: #468BE6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                              Verify Email
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
                      <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px; text-align: center;">
                        Need help? Contact us at <a href="mailto:support@simnetiq.store" style="color: #468BE6; text-decoration: none;">support@simnetiq.store</a>
                      </p>
                      <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} Simnetiq. All rights reserved.
                      </p>
                      <p style="margin: 10px 0 0 0; color: #999999; font-size: 12px; text-align: center;">
                        Global eSIM connectivity in 200+ countries
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Plain text version
    const textContent = `
Welcome to Simnetiq, ${userName}!

Your verification code is: ${otpCode}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Need help? Contact us at support@simnetiq.store

© ${new Date().getFullYear()} Simnetiq. All rights reserved.
    `;

    // Check if Resend API key is properly configured
    if (!RESEND_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email service is not configured: RESEND_API_KEY is missing',
          fallback: true
        },
        { status: 503 }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    // Send email using Resend
    // Use Resend's onboarding domain until custom domain is verified
    const fromEmail = process.env.RESEND_VERIFIED_DOMAIN
      ? `Simnetiq <noreply@${process.env.RESEND_VERIFIED_DOMAIN}>`
      : 'Simnetiq <onboarding@resend.dev>'; // Temporary: Use Resend's test domain

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: `Verify Your Email - Code: ${otpCode}`,
      text: textContent,
      html: htmlContent,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      
      // Check if it's a domain verification issue
      if (error.message && error.message.includes('verify a domain')) {
        console.warn('⚠️ Resend domain not verified - can only send to account owner email');
        return NextResponse.json(
          { 
            error: 'Domain not verified', 
            details: error,
            message: 'Resend domain not verified. Can only send to pochtmanrca@gmail.com until domain is verified.'
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        messageId: data.id,
        message: 'Verification email sent successfully' 
      },
      { status: 200 }
    );

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to send email', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}

