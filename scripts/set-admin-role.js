const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setAdminRole() {
  rl.question('Enter the email address of the user to make admin: ', async (email) => {
    try {
      // Get user by email
      const userRecord = await admin.auth().getUserByEmail(email);
      const uid = userRecord.uid;
      
      // Check if user document exists
      const userDoc = await db.collection('users').doc(uid).get();
      
      if (userDoc.exists) {
        // Update existing user document
        await db.collection('users').doc(uid).update({
          role: 'admin',
          isAdmin: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Create new user document with admin role
        await db.collection('users').doc(uid).set({
          email: email,
          displayName: userRecord.displayName || email.split('@')[0],
          role: 'admin',
          isAdmin: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // Set custom claims for admin
      await admin.auth().setCustomUserClaims(uid, { admin: true, role: 'admin' });
        
    } catch {
    }
    
    rl.close();
    process.exit(0);
  });
}

setAdminRole();

