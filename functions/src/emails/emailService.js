const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  const emailConfig = functions.config().email;

  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: emailConfig.user,
      pass: emailConfig.password,
    },
  });
};

/**
 * Send purchase confirmation email
 */
async function sendPurchaseConfirmation(data) {
  const {email, orderId, packageName, amount, currency} = data;

  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: functions.config().email.user,
      to: email,
      subject: `Order Confirmation - ${orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Thank you for your purchase!</h2>
          <p>Your order has been confirmed and is being processed.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Package:</strong> ${packageName}</p>
            <p><strong>Amount:</strong> ${amount} ${currency.toUpperCase()}</p>
          </div>
          
          <p>You can view your eSIM details in your dashboard.</p>
          
          <p>If you have any questions, please contact our support team.</p>
          
          <p>Best regards,<br>Simnetiq Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

  } catch (error) {
    console.error('Error sending purchase confirmation email:', error);
    throw error;
  }
}

module.exports = {sendPurchaseConfirmation};
