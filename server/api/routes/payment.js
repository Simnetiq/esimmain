const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const { validatePayment } = require('../middleware/validation');
const logger = require('../utils/logger');

// Create Stripe Checkout Session (MAIN ENDPOINT FOR YOUR WEBSITE)
router.post('/create-payment-order', async (req, res, next) => {
  try {
    const { order, email, name, total, currency, domain, userId } = req.body;
    
    logger.info('Payment order request received', { order, email, total });

    // Validate required fields
    if (!order || !email || !total) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: order, email, total'
      });
    }

    // Price validation happens inside the service
    const result = await paymentService.createStripeCheckoutSession({
      order,
      email,
      name,
      total, // Will be validated against database
      currency: currency || 'usd',
      domain: domain || process.env.APP_URL || 'http://localhost:3000',
      userId // Pass userId for referral discount check
    });

    res.json(result);
  } catch (error) {
    logger.error('Payment order creation error', error);
    
    // Return specific error for price manipulation
    if (error.message === 'Price validation failed' || error.message === 'Package not found') {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: 'PRICE_VALIDATION_FAILED'
      });
    }
    
    next(error);
  }
});

// Create Stripe payment intent (for custom checkout)
router.post('/stripe/create', validatePayment, async (req, res, next) => {
  try {
    const { packageId, userId, amount, currency, metadata } = req.body;
    
    // Validate required fields for price validation
    if (!packageId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: packageId'
      });
    }
    
    // Price validation happens inside the service
    const result = await paymentService.createStripePayment(
      packageId, 
      userId, 
      amount, // Will be validated against database
      currency, 
      metadata
    );
    res.json(result);
  } catch (error) {
    if (error.message === 'Price validation failed' || error.message === 'Package not found') {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: 'PRICE_VALIDATION_FAILED'
      });
    }
    next(error);
  }
});

// Get Stripe session details
router.get('/stripe/session/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await paymentService.getStripeSession(sessionId);
    res.json({
      success: true,
      session
    });
  } catch (error) {
    next(error);
  }
});

// Create PayPal order
router.post('/paypal/create', validatePayment, async (req, res, next) => {
  try {
    const { packageId, userId, amount, currency, metadata } = req.body;
    
    // Validate required fields for price validation
    if (!packageId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: packageId'
      });
    }
    
    // Price validation happens inside the service
    const result = await paymentService.createPayPalOrder(
      packageId,
      userId,
      amount, // Will be validated against database
      currency, 
      metadata
    );
    res.json(result);
  } catch (error) {
    if (error.message === 'Price validation failed' || error.message === 'Package not found') {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: 'PRICE_VALIDATION_FAILED'
      });
    }
    next(error);
  }
});

// Capture PayPal payment
router.post('/paypal/capture/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const result = await paymentService.capturePayPalPayment(orderId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Stripe webhook
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    const result = await paymentService.verifyStripeWebhook(req.body, signature);
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
