const express = require('express');
const router = express.Router();
const redisClient = require('../config/redis');
const supabase = require('../config/supabase');

router.get('/', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: 'up',
      redis: 'unknown',
      supabase: 'unknown'
    }
  };

  // Check Redis
  try {
    await redisClient.ping();
    health.services.redis = 'up';
  } catch (error) {
    health.services.redis = 'down';
    health.status = 'degraded';
  }

  // Check Supabase
  try {
    const { error } = await supabase.from('transactions').select('count').limit(1);
    health.services.supabase = error ? 'down' : 'up';
    if (error) health.status = 'degraded';
  } catch (error) {
    health.services.supabase = 'down';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;

