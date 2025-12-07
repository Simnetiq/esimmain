require('dotenv').config();
const express = require('express');
const path = require('path');
const auth = require('basic-auth');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3002;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Basic authentication middleware
const authenticate = (req, res, next) => {
  const credentials = auth(req);

  if (!credentials || 
      credentials.name !== process.env.DASHBOARD_USERNAME || 
      credentials.pass !== process.env.DASHBOARD_PASSWORD) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="Dashboard"');
    res.end('Access denied');
  } else {
    next();
  }
};

// Apply authentication to all routes
app.use(authenticate);

// Routes
app.get('/', async (req, res) => {
  try {
    const stats = await getSystemStats();
    res.render('index', { stats });
  } catch (error) {
    res.status(500).send('Error loading dashboard');
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getSystemStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const health = await checkSystemHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/transactions/recent', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const analytics = await getAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Docker management routes
app.get('/api/docker/containers', async (req, res) => {
  try {
    // This would integrate with Docker API
    res.json({
      containers: [
        { name: 'esim-api', status: 'running', uptime: '2 days' },
        { name: 'esim-redis', status: 'running', uptime: '2 days' },
        { name: 'esim-dashboard', status: 'running', uptime: '2 days' },
        { name: 'esim-nginx', status: 'running', uptime: '2 days' }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
async function getSystemStats() {
  try {
    // Get transaction stats
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('amount, status, created_at');

    if (txError) throw txError;

    const totalTransactions = transactions.length;
    const totalRevenue = transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    // Get today's stats
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = transactions.filter(t => 
      t.created_at.startsWith(today)
    );

    // Get email stats
    const { data: emails, error: emailError } = await supabase
      .from('email_logs')
      .select('status');

    const emailStats = {
      total: emails?.length || 0,
      sent: emails?.filter(e => e.status === 'sent').length || 0,
      failed: emails?.filter(e => e.status === 'failed').length || 0
    };

    return {
      transactions: {
        total: totalTransactions,
        today: todayTransactions.length,
        revenue: totalRevenue
      },
      emails: emailStats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      transactions: { total: 0, today: 0, revenue: 0 },
      emails: { total: 0, sent: 0, failed: 0 },
      timestamp: new Date().toISOString()
    };
  }
}

async function checkSystemHealth() {
  const health = {
    api: 'unknown',
    redis: 'unknown',
    supabase: 'unknown',
    docker: 'unknown'
  };

  // Check API
  try {
    const apiUrl = process.env.API_URL || 'http://api:3001';
    const response = await axios.get(`${apiUrl}/api/health`, { timeout: 5000 });
    health.api = response.data.status === 'healthy' ? 'healthy' : 'degraded';
    health.redis = response.data.services.redis;
    health.supabase = response.data.services.supabase;
  } catch (error) {
    health.api = 'down';
  }

  // Check Docker (placeholder)
  health.docker = 'healthy';

  return health;
}

async function getAnalytics() {
  try {
    // Get last 30 days of transactions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, created_at, status, provider')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) throw error;

    // Group by date
    const dailyStats = {};
    data.forEach(tx => {
      const date = tx.created_at.split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { count: 0, revenue: 0 };
      }
      dailyStats[date].count++;
      if (tx.status === 'completed') {
        dailyStats[date].revenue += tx.amount;
      }
    });

    // Provider stats
    const providerStats = data.reduce((acc, tx) => {
      acc[tx.provider] = (acc[tx.provider] || 0) + 1;
      return acc;
    }, {});

    return {
      daily: dailyStats,
      providers: providerStats,
      total: data.length
    };
  } catch (error) {
    return { daily: {}, providers: {}, total: 0 };
  }
}

// WebSocket for real-time updates
io.on('connection', (socket) => {

  // Send updates every 5 seconds
  const interval = setInterval(async () => {
    const stats = await getSystemStats();
    const health = await checkSystemHealth();
    socket.emit('update', { stats, health });
  }, 5000);

  socket.on('disconnect', () => {
    clearInterval(interval);
  });
});

// Start server
server.listen(PORT, () => {
});

module.exports = app;

