const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const supabase = require('../config/supabase');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * POST /api/doppler/send-code
 * Body: { account_id, method: "email"|"telegram", contact_value }
 * Generates a 6-digit OTP, stores it, and sends via the chosen method.
 */
router.post('/send-code', async (req, res, next) => {
  try {
    const { account_id, method, contact_value } = req.body;

    // Validate input
    if (!account_id || !method || !contact_value) {
      return res.status(400).json({ error: 'account_id, method, and contact_value are required' });
    }

    if (method === 'telegram') {
      return res.status(400).json({ error: 'Use the Telegram bot for verification. Download the app and tap Verify via Telegram.' });
    }

    if (method !== 'email') {
      return res.status(400).json({ error: 'method must be "email"' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact_value)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Verify account exists
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('account_id')
      .eq('account_id', account_id)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Rate limit: max 1 code per minute per account
    const { data: recentCodes } = await supabase
      .from('verification_codes')
      .select('created_at')
      .eq('account_id', account_id)
      .gte('created_at', new Date(Date.now() - 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentCodes && recentCodes.length > 0) {
      return res.status(429).json({ error: 'Please wait at least 1 minute before requesting a new code' });
    }

    // Rate limit: max 3 active codes per account — delete oldest if exceeded
    const { data: activeCodes } = await supabase
      .from('verification_codes')
      .select('id, created_at')
      .eq('account_id', account_id)
      .is('verified_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (activeCodes && activeCodes.length >= 3) {
      // Delete oldest codes to stay at max 3 (will be 3 after inserting new one)
      const toDelete = activeCodes.slice(0, activeCodes.length - 2);
      const deleteIds = toDelete.map(c => c.id);
      await supabase
        .from('verification_codes')
        .delete()
        .in('id', deleteIds);
    }

    // Generate 6-digit OTP
    const code = String(crypto.randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store code
    const { error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        account_id,
        method,
        contact_value,
        code,
        expires_at: expiresAt
      });

    if (insertError) {
      logger.error('Failed to insert verification code', insertError);
      return res.status(500).json({ error: 'Failed to create verification code' });
    }

    // Send code via email
    const html = emailService.loadTemplate('doppler-verification', {
      CODE: code,
      ACCOUNT_ID: account_id
    });

    await emailService.sendEmail({
      to: contact_value,
      subject: 'Your Doppler VPN Verification Code',
      html,
      text: `Your Doppler VPN verification code is: ${code}. It expires in 10 minutes.`
    });

    logger.info('Verification code sent', { account_id, method });

    res.json({ success: true, expires_in: 600 });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/doppler/verify-code
 * Body: { account_id, code }
 * Verifies the OTP code and updates account contact info.
 */
router.post('/verify-code', async (req, res, next) => {
  try {
    const { account_id, code } = req.body;

    if (!account_id || !code) {
      return res.status(400).json({ error: 'account_id and code are required' });
    }

    // Find matching active code
    const { data: codeRecord, error: lookupError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('account_id', account_id)
      .eq('code', code)
      .is('verified_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lookupError || !codeRecord) {
      // Increment attempts on the most recent unverified code
      const { data: latestCode } = await supabase
        .from('verification_codes')
        .select('id, attempts')
        .eq('account_id', account_id)
        .is('verified_at', null)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestCode) {
        await supabase
          .from('verification_codes')
          .update({ attempts: latestCode.attempts + 1 })
          .eq('id', latestCode.id);

        if (latestCode.attempts + 1 >= 5) {
          return res.status(429).json({ error: 'Maximum verification attempts exceeded. Request a new code.' });
        }
      }

      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Check attempts
    if (codeRecord.attempts >= 5) {
      return res.status(429).json({ error: 'Maximum verification attempts exceeded. Request a new code.' });
    }

    // Increment attempts
    await supabase
      .from('verification_codes')
      .update({ attempts: codeRecord.attempts + 1 })
      .eq('id', codeRecord.id);

    // Mark as verified
    await supabase
      .from('verification_codes')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', codeRecord.id);

    // Update account
    await supabase
      .from('accounts')
      .update({
        contact_verified: true,
        contact_method: codeRecord.method,
        contact_value: codeRecord.contact_value
      })
      .eq('account_id', account_id);

    // Send account ID to user
    if (codeRecord.method === 'email') {
      const html = emailService.loadTemplate('doppler-account-recovery', {
        ACCOUNT_ID: account_id
      });

      await emailService.sendEmail({
        to: codeRecord.contact_value,
        subject: 'Your Doppler VPN Account ID',
        html,
        text: `Your Doppler VPN account ID is: ${account_id}. Keep this ID safe — it is your unique login credential.`
      });
    } else if (codeRecord.method === 'telegram') {
      // For Telegram, we send a message via the Gateway API is not designed for arbitrary messages.
      // The account ID was already shown in-app after verification succeeds.
      logger.info('Telegram verification successful, account ID delivered via app', { account_id });
    }

    logger.info('Contact verified successfully', { account_id, method: codeRecord.method });

    res.json({ success: true, account_id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
