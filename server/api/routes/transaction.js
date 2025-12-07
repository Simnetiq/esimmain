const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');

// Get all transactions
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const filters = {
      status: req.query.status,
      provider: req.query.provider
    };

    const result = await paymentService.getTransactions(page, limit, filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get transaction by ID
router.get('/:paymentId', async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const transaction = await paymentService.getTransaction(paymentId);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

