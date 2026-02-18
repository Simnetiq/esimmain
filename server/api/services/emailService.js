const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    // Cache base template
    this.baseTemplate = fs.readFileSync(
      path.join(__dirname, '../templates/emails/base.html'),
      'utf8'
    );
  }

  // Load template, wrap in base, replace variables
  loadTemplate(templateName, vars = {}) {
    const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
    let content = fs.readFileSync(templatePath, 'utf8');
    let html = this.baseTemplate.replace('{{CONTENT}}', content);

    // Replace all variables
    for (const [key, value] of Object.entries(vars)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value || '');
    }

    // Clean up any remaining unreplaced vars
    html = html.replace(/{{UNSUBSCRIBE_URL}}/g, vars.UNSUBSCRIBE_URL || '#');

    return html;
  }

  // Send email
  async sendEmail({ to, subject, html, text, attachments = [] }) {
    try {
      const mailOptions = {
        from: `"Simnetiq" <support@simnetiq.store>`,
        to,
        subject,
        html,
        text,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);

      await this.logEmail({
        to,
        subject,
        status: 'sent',
        message_id: info.messageId
      });

      logger.info('Email sent successfully', { to, subject, messageId: info.messageId });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Email send error', error);

      await this.logEmail({
        to,
        subject,
        status: 'failed',
        error: error.message
      });

      throw error;
    }
  }

  // --- Email methods for all 12 templates ---

  async sendWelcomeEmail(email, vars) {
    const html = this.loadTemplate('welcome', vars);
    return this.sendEmail({
      to: email,
      subject: 'Welcome to Simnetiq! 🎉',
      html,
      text: `Welcome to Simnetiq, ${vars.NAME}! Start exploring eSIM plans at https://simnetiq.store`
    });
  }

  async sendPasswordResetEmail(email, vars) {
    const html = this.loadTemplate('password-reset', vars);
    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password — Simnetiq',
      html,
      text: `Reset your password: ${vars.RESET_URL}`
    });
  }

  async sendPurchaseConfirmation(email, vars) {
    const html = this.loadTemplate('esim-purchase-confirmation', vars);
    return this.sendEmail({
      to: email,
      subject: `Order Confirmed — ${vars.DESTINATION} eSIM`,
      html,
      text: `Order ${vars.ORDER_ID} confirmed! ${vars.PLAN_NAME} for ${vars.DESTINATION}.`
    });
  }

  async sendActivationSuccess(email, vars) {
    const html = this.loadTemplate('esim-activation-success', vars);
    return this.sendEmail({
      to: email,
      subject: `eSIM Activated — ${vars.DESTINATION} 🌍`,
      html,
      text: `Your eSIM for ${vars.DESTINATION} is now active. Plan: ${vars.PLAN_NAME}`
    });
  }

  async sendTopupConfirmation(email, vars) {
    const html = this.loadTemplate('esim-topup-confirmation', vars);
    return this.sendEmail({
      to: email,
      subject: `Top-Up Confirmed — ${vars.DESTINATION}`,
      html,
      text: `Top-up of ${vars.TOPUP_AMOUNT} confirmed for ${vars.DESTINATION}. New balance: ${vars.NEW_BALANCE}`
    });
  }

  async sendDataLowWarning(email, vars) {
    const html = this.loadTemplate('data-low-warning', vars);
    return this.sendEmail({
      to: email,
      subject: `Data Running Low — ${vars.DESTINATION} ⚠️`,
      html,
      text: `Your eSIM for ${vars.DESTINATION} has ${vars.DATA_REMAINING} remaining of ${vars.DATA_TOTAL}.`
    });
  }

  async sendSupportTicketReceived(email, vars) {
    const html = this.loadTemplate('support-ticket-received', vars);
    return this.sendEmail({
      to: email,
      subject: `Support Ticket #${vars.TICKET_ID} Received`,
      html,
      text: `We received your support request (Ticket #${vars.TICKET_ID}: ${vars.SUBJECT}).`
    });
  }

  async sendSupportTicketResolved(email, vars) {
    const html = this.loadTemplate('support-ticket-resolved', vars);
    return this.sendEmail({
      to: email,
      subject: `Support Ticket #${vars.TICKET_ID} Resolved ✅`,
      html,
      text: `Your ticket #${vars.TICKET_ID} has been resolved: ${vars.RESOLUTION}`
    });
  }

  async sendPaymentFailed(email, vars) {
    const html = this.loadTemplate('payment-failed', vars);
    return this.sendEmail({
      to: email,
      subject: 'Payment Failed — Action Required',
      html,
      text: `Payment of ${vars.AMOUNT} for ${vars.PRODUCT} failed: ${vars.FAILURE_REASON}. Retry: ${vars.RETRY_URL}`
    });
  }

  async sendRefundProcessed(email, vars) {
    const html = this.loadTemplate('refund-processed', vars);
    return this.sendEmail({
      to: email,
      subject: `Refund Processed — ${vars.REFUND_AMOUNT}`,
      html,
      text: `Refund of ${vars.REFUND_AMOUNT} for order ${vars.ORDER_ID} has been processed to ${vars.PAYMENT_METHOD}.`
    });
  }

  async sendVpnSubscriptionConfirmation(email, vars) {
    const html = this.loadTemplate('vpn-subscription-confirmation', vars);
    return this.sendEmail({
      to: email,
      subject: 'VPN Subscription Active! 🛡️',
      html,
      text: `Your VPN subscription (${vars.PLAN_NAME}) is now active. Next billing: ${vars.NEXT_BILLING}`
    });
  }

  async sendVpnSubscriptionCancelled(email, vars) {
    const html = this.loadTemplate('vpn-subscription-cancelled', vars);
    return this.sendEmail({
      to: email,
      subject: 'VPN Subscription Cancelled',
      html,
      text: `Your VPN subscription has been cancelled. Access until: ${vars.ACCESS_UNTIL}`
    });
  }

  // Legacy compatibility — maps old signature to new template
  async sendVerificationEmail(email, verificationToken) {
    return this.sendWelcomeEmail(email, { NAME: email.split('@')[0] });
  }

  async sendOrderConfirmationEmail(email, orderDetails) {
    return this.sendPurchaseConfirmation(email, {
      NAME: orderDetails.name || email.split('@')[0],
      ORDER_ID: orderDetails.orderId,
      DESTINATION: orderDetails.destination || 'N/A',
      PLAN_NAME: orderDetails.planName,
      DATA_AMOUNT: orderDetails.dataAmount || 'N/A',
      VALIDITY: orderDetails.validity || 'N/A',
      TOTAL_PRICE: `${orderDetails.amount} ${orderDetails.currency}`
    });
  }

  // Log email to Supabase
  async logEmail(data) {
    try {
      const { error } = await supabase
        .from('email_logs')
        .insert([{
          ...data,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      logger.error('Email logging error', error);
    }
  }

  // Get email logs
  async getEmailLogs(page = 1, limit = 50) {
    try {
      const { data, error, count } = await supabase
        .from('email_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return {
        logs: data,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      logger.error('Get email logs error', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
