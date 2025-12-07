const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 3002,
  path: '/api/health',
  timeout: 2000,
  auth: `${process.env.DASHBOARD_USERNAME}:${process.env.DASHBOARD_PASSWORD}`
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', () => {
  process.exit(1);
});

request.end();

