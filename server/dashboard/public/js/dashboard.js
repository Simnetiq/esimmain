// Initialize Socket.IO
const socket = io();

// Chart instance
let analyticsChart = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  loadAllData();
  initializeWebSocket();
});

// Load all data
async function loadAllData() {
  await Promise.all([
    loadStats(),
    loadHealth(),
    loadDockerContainers(),
    loadRecentTransactions(),
    loadAnalytics()
  ]);
  updateLastUpdateTime();
}

// Load stats
async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    const data = await response.json();

    document.getElementById('stat-revenue').textContent = 
      `$${data.transactions.revenue.toFixed(2)}`;
    document.getElementById('stat-transactions').textContent = 
      data.transactions.total;
    document.getElementById('stat-today').textContent = 
      data.transactions.today;
    document.getElementById('stat-emails').textContent = 
      data.emails.sent;
  } catch (error) {
  }
}

// Load health status
async function loadHealth() {
  try {
    const response = await fetch('/api/health');
    const health = await response.json();

    updateHealthStatus('api', health.api);
    updateHealthStatus('redis', health.redis);
    updateHealthStatus('supabase', health.supabase);
    updateHealthStatus('docker', health.docker);
  } catch (error) {
  }
}

// Update health status
function updateHealthStatus(service, status) {
  const element = document.getElementById(`health-${service}`);
  const dot = element.querySelector('.status-dot');
  const text = element.querySelector('.status-text');

  dot.className = `status-dot ${status}`;
  text.textContent = status.charAt(0).toUpperCase() + status.slice(1);
}

// Load Docker containers
async function loadDockerContainers() {
  try {
    const response = await fetch('/api/docker/containers');
    const data = await response.json();

    const container = document.getElementById('docker-containers');
    container.innerHTML = data.containers.map(c => `
      <div class="docker-container ${c.status === 'running' ? '' : 'stopped'}">
        <div class="docker-name">${c.name}</div>
        <div class="docker-status">
          Status: ${c.status}<br>
          Uptime: ${c.uptime}
        </div>
      </div>
    `).join('');
  } catch (error) {
    document.getElementById('docker-containers').innerHTML = 
      '<div class="loading">Error loading containers</div>';
  }
}

// Load recent transactions
async function loadRecentTransactions() {
  try {
    const response = await fetch('/api/transactions/recent');
    const transactions = await response.json();

    const tbody = document.querySelector('#transactions-table tbody');
    
    if (transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">No transactions yet</td></tr>';
      return;
    }

    tbody.innerHTML = transactions.map(tx => `
      <tr>
        <td><code>${tx.payment_id.substring(0, 20)}...</code></td>
        <td>${tx.provider}</td>
        <td>$${tx.amount.toFixed(2)} ${tx.currency}</td>
        <td><span class="status-badge ${tx.status}">${tx.status}</span></td>
        <td>${new Date(tx.created_at).toLocaleString()}</td>
      </tr>
    `).join('');
  } catch (error) {
  }
}

// Load analytics
async function loadAnalytics() {
  try {
    const response = await fetch('/api/analytics');
    const data = await response.json();

    // Prepare chart data
    const dates = Object.keys(data.daily).sort();
    const counts = dates.map(date => data.daily[date].count);
    const revenues = dates.map(date => data.daily[date].revenue);

    // Create or update chart
    const ctx = document.getElementById('analyticsChart').getContext('2d');
    
    if (analyticsChart) {
      analyticsChart.destroy();
    }

    analyticsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          {
            label: 'Transactions',
            data: counts,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: 'Revenue ($)',
            data: revenues,
            borderColor: '#28a745',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            tension: 0.4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Transactions'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Revenue ($)'
            },
            grid: {
              drawOnChartArea: false,
            }
          }
        }
      }
    });
  } catch (error) {
  }
}

// Initialize WebSocket
function initializeWebSocket() {
  socket.on('update', (data) => {
    // Update stats
    if (data.stats) {
      document.getElementById('stat-revenue').textContent = 
        `$${data.stats.transactions.revenue.toFixed(2)}`;
      document.getElementById('stat-transactions').textContent = 
        data.stats.transactions.total;
      document.getElementById('stat-today').textContent = 
        data.stats.transactions.today;
      document.getElementById('stat-emails').textContent = 
        data.stats.emails.sent;
    }

    // Update health
    if (data.health) {
      updateHealthStatus('api', data.health.api);
      updateHealthStatus('redis', data.health.redis);
      updateHealthStatus('supabase', data.health.supabase);
      updateHealthStatus('docker', data.health.docker);
    }

    updateLastUpdateTime();
  });

  socket.on('connect', () => {
  });

  socket.on('disconnect', () => {
  });
}

// Refresh data
function refreshData() {
  loadAllData();
}

// Update last update time
function updateLastUpdateTime() {
  const now = new Date();
  document.getElementById('last-update').textContent = 
    `Last updated: ${now.toLocaleTimeString()}`;
}

