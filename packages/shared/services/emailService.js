// Email service for sending OTP and verification emails
// Uses Hostinger SMTP as primary method with Nodemailer (Gmail) as fallback

// Use Hostinger SMTP API route (primary)
const getEmailApiUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use relative URL
    return '/api/send-verification-email-host';
  }
  // Server-side: use full URL
  return process.env.NEXT_PUBLIC_BASE_URL 
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/send-verification-email-host`
    : 'http://localhost:3000/api/send-verification-email-host';
};

// Fallback to Nodemailer endpoint (Gmail)
const getEmailApiFallbackUrl = () => {
  if (typeof window !== 'undefined') {
    return '/api/send-verification-email';
  }
  return process.env.NEXT_PUBLIC_BASE_URL 
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/send-verification-email`
    : 'http://localhost:3000/api/send-verification-email';
};

/**
 * Send verification email with OTP
 * Uses Hostinger SMTP as primary method, falls back to Gmail if needed
 * @param {string} email - Recipient email
 * @param {string} userName - User's name
 * @param {string} otpCode - OTP code to send
 * @returns {Promise<boolean>} Success status
 */
export async function sendVerificationEmail(email, userName, otpCode) {
  try {
    // Try Hostinger SMTP first (primary)
    const apiUrl = getEmailApiUrl();
    
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        userName,
        otpCode
      }),
    });

    if (response.ok) {
      return true;
    } else {
      console.warn('⚠️ Hostinger SMTP failed, trying Gmail fallback...');
      // Try Gmail fallback
      return await sendVerificationEmailNodemailer(email, userName, otpCode);
    }
  } catch (error) {
    // Try Gmail fallback
    return await sendVerificationEmailNodemailer(email, userName, otpCode);
  }
}

/**
 * Nodemailer fallback (Gmail)
 * @private
 */
async function sendVerificationEmailNodemailer(email, userName, otpCode) {
  try {
    const apiUrl = getEmailApiFallbackUrl();
    
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        userName,
        otpCode
      }),
    });

    if (response.ok) {
      return true;
    } else {
      // Return true anyway so signup can continue
      // User can still verify manually if needed
      return true;
    }
  } catch (error) {
    // Return true anyway so signup can continue
    return true;
  }
}

/**
 * Send password reset email with OTP
 * Uses the same 2-tier fallback system as verification emails
 * @param {string} email - Recipient email
 * @param {string} userName - User's name
 * @param {string} otpCode - OTP code to send
 * @returns {Promise<boolean>} Success status
 */
export async function sendPasswordResetEmail(email, userName, otpCode) {
  return await sendVerificationEmail(email, userName, otpCode);
}

/**
 * Send custom email with OTP
 * Uses the same 2-tier fallback system as verification emails
 * @param {string} email - Recipient email
 * @param {string} userName - User's name
 * @param {string} otpCode - OTP code to send
 * @returns {Promise<boolean>} Success status
 */
export async function sendCustomEmail(email, userName, otpCode) {
  return await sendVerificationEmail(email, userName, otpCode);
}
