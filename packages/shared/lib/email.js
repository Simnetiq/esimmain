import nodemailer from 'nodemailer';

// Create reusable transporter for Hostinger SMTP
export const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Send email with template
export async function sendEmail({ to, subject, html, text }) {
  try {
    // Check if SMTP credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {

      throw new Error('SMTP credentials not configured. Please check your environment variables.');
    }

    const transporter = createEmailTransporter();
    
    
    const info = await transporter.sendMail({
      from: `"Simnetiq" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

