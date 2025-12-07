const express = require('express');
const router = express.Router();
const otpService = require('../services/otpService');
const { validateOTP } = require('../middleware/validation');

// Send OTP via SMS
router.post('/send', validateOTP, async (req, res, next) => {
  try {
    const { phoneNumber, purpose } = req.body;

    // Check rate limit
    const rateLimit = await otpService.checkRateLimit(phoneNumber);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: rateLimit.error });
    }

    const result = await otpService.sendOTP(phoneNumber, purpose);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Send OTP via WhatsApp
router.post('/send/whatsapp', validateOTP, async (req, res, next) => {
  try {
    const { phoneNumber, purpose } = req.body;

    // Check rate limit
    const rateLimit = await otpService.checkRateLimit(phoneNumber);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: rateLimit.error });
    }

    const result = await otpService.sendWhatsAppOTP(phoneNumber, purpose);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Verify OTP
router.post('/verify', async (req, res, next) => {
  try {
    const { phoneNumber, otp, purpose } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    const result = await otpService.verifyOTP(phoneNumber, otp, purpose);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

