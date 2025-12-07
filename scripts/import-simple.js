#!/usr/bin/env node

/**
 * Simple CSV import using service account JSON
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

console.log('✅ Firebase initialized');
console.log('🚀 Starting import...\n');

// Now run the import
require('./import-airalo-csv.js');














