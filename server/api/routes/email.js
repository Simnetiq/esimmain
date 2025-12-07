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

// Send verification email
router.post('/verification', async (req, res, next) => {
  try {
    const { email, verificationToken } = req.body;

    if (!email || !verificationToken) {
      return res.status(400).json({ error: 'Email and verification token are required' });
    }

    const result = await emailService.sendVerificationEmail(email, verificationToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Send password reset email
router.post('/password-reset', async (req, res, next) => {
  try {
    const { email, resetToken } = req.body;

    if (!email || !resetToken) {
      return res.status(400).json({ error: 'Email and reset token are required' });
    }

    const result = await emailService.sendPasswordResetEmail(email, resetToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Send order confirmation
router.post('/order-confirmation', async (req, res, next) => {
  try {
    const { email, orderDetails } = req.body;

    if (!email || !orderDetails) {
      return res.status(400).json({ error: 'Email and order details are required' });
    }

    const result = await emailService.sendOrderConfirmationEmail(email, orderDetails);
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

