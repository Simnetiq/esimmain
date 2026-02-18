const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const { validateEmail } = require('../middleware/validation');

// Send generic email
router.post('/send', validateEmail, async (req, res, next) => {
  try {
    const { to, subject, html, text, attachments } = req.body;
    const result = await emailService.sendEmail({ to, subject, html, text, attachments });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Welcome email
router.post('/welcome', async (req, res, next) => {
  try {
    const { email, vars } = req.body;
    if (!email || !vars?.NAME) return res.status(400).json({ error: 'email and vars.NAME required' });
    const result = await emailService.sendWelcomeEmail(email, vars);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Legacy verification email
router.post('/verification', async (req, res, next) => {
  try {
    const { email, verificationToken } = req.body;
    if (!email || !verificationToken) return res.status(400).json({ error: 'Email and verification token are required' });
    const result = await emailService.sendVerificationEmail(email, verificationToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Password reset
router.post('/password-reset', async (req, res, next) => {
  try {
    const { email, vars } = req.body;
    if (!email || !vars?.RESET_URL) return res.status(400).json({ error: 'email and vars.RESET_URL required' });
    const result = await emailService.sendPasswordResetEmail(email, vars);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Purchase confirmation
router.post('/purchase-confirmation', async (req, res, next) => {
  try {
    const { email, vars } = req.body;
    if (!email || !vars?.ORDER_ID) return res.status(400).json({ error: 'email and vars.ORDER_ID required' });
    const result = await emailService.sendPurchaseConfirmation(email, vars);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Legacy order confirmation
router.post('/order-confirmation', async (req, res, next) => {
  try {
    const { email, orderDetails } = req.body;
    if (!email || !orderDetails) return res.status(400).json({ error: 'Email and order details are required' });
    const result = await emailService.sendOrderConfirmationEmail(email, orderDetails);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Activation success
router.post('/activation-success', async (req, res, next) => {
  try {
    const { email, vars } = req.body;
    if (!email || !vars?.DESTINATION) return res.status(400).json({ error: 'email and vars required' });
    const result = await emailService.sendActivationSuccess(email, vars);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Top-up confirmation
router.post('/topup-confirmation', async (req, res, next) => {
  try {
    const { email, vars } = req.body;
    if (!email || !vars?.TOPUP_AMOUNT) return res.status(400).json({ error: 'email and vars required' });
    const result = await emailService.sendTopupConfirmation(email, vars);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Data low warning
router.post('/data-low-warning', async (req, res, next) => {
  try {
    const { email, vars } = req.body;
    if (!email || !vars?.DATA_REMAINING) return res.status(400).json({ error: 'email and vars required' });
    const result = await emailService.sendDataLowWarning(email, vars);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Support ticket received
router.post('/support-ticket-received', async (req, res, next) => {
  try {
    const { email, vars } = req.body;
    if (!email || !vars?.TICKET_ID) return res.status(400).json({ error: 'email and vars required' });
    const result = await emailService.sendSupportTicketReceived(email, vars);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Support ticket resolved
router.post('/support-ticket-resolved', async (req, res, next) => {
  try {
    const { email, vars } = req.body;
    if (!email || !vars?.TICKET_ID) return res.status(400).json({ error: 'email and vars required' });
    const result = await emailService.sendSupportTicketResolved(email, vars);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Payment failed
router.post('/payment-failed', async (req, res, next) => {
  try {
    const { email, vars } = req.body;
    if (!email || !vars?.AMOUNT) return res.status(400).json({ error: 'email and vars required' });
    const result = await emailService.sendPaymentFailed(email, vars);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Refund processed
router.post('/refund-processed', async (req, res, next) => {
  try {
    const { email, vars } = req.body;
    if (!email || !vars?.ORDER_ID) return res.status(400).json({ error: 'email and vars required' });
    const result = await emailService.sendRefundProcessed(email, vars);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// VPN subscription confirmation
router.post('/vpn-subscription-confirmation', async (req, res, next) => {
  try {
    const { email, vars } = req.body;
    if (!email || !vars?.PLAN_NAME) return res.status(400).json({ error: 'email and vars required' });
    const result = await emailService.sendVpnSubscriptionConfirmation(email, vars);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// VPN subscription cancelled
router.post('/vpn-subscription-cancelled', async (req, res, next) => {
  try {
    const { email, vars } = req.body;
    if (!email || !vars?.ACCESS_UNTIL) return res.status(400).json({ error: 'email and vars required' });
    const result = await emailService.sendVpnSubscriptionCancelled(email, vars);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get email logs
router.get('/logs', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const result = await emailService.getEmailLogs(page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
