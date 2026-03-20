/**
 * Firestore Seeding Script
 * Populates test data for Pigxel site configurations
 * 
 * Usage: npm run seed
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin with service account
// Make sure to set GOOGLE_APPLICATION_CREDENTIALS environment variable
// or place service-account.json in the functions directory

// Check if we should use the Firestore emulator
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  console.log('🔧 Connecting to Firestore Emulator at 127.0.0.1:8080');
} else {
  console.log(`🔧 Using existing FIRESTORE_EMULATOR_HOST: ${process.env.FIRESTORE_EMULATOR_HOST}`);
}

try {
  const serviceAccountPath = path.join(__dirname, '../../service-account.json');
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'pixie-dev',
  });
} catch (error) {
  // Fallback to application default credentials (useful in Cloud Shell / CI)
  console.log('Using application default credentials');
  admin.initializeApp({
    projectId: 'pixie-dev',
  });
}

const db = admin.firestore();

/**
 * Test site configurations
 */
const testSites = [
  {
    id: 'client_pending',
    data: {
      owner_id: 'user_1',
      url: 'http://localhost:8000',
      status: 'pending',
      trackingConfig: {
        pixels: {
          ga4: 'G-SHOULD-NOT-LOAD',
        },
        events: [],
      },
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    description: 'Pending site - Script installed but not tracking yet',
  },
  {
    id: 'client_active',
    data: {
      owner_id: 'user_1',
      url: 'http://localhost:8000',
      status: 'active',
      trackingConfig: {
        pixels: {
          ga4: 'G-TEST-123',
          meta: '123-TEST',
        },
        events: [
          {
            selector: 'text=Buy Now',
            trigger: 'click',
            platform: 'ga4',
            event_name: 'purchase',
          },
          {
            selector: 'text=Add to Cart',
            trigger: 'click',
            platform: 'ga4',
            event_name: 'add_to_cart',
          },
          {
            selector: 'text=Subscribe to newsletter',
            trigger: 'submit',
            platform: 'meta',
            event_name: 'Lead',
          },
          {
            selector: 'text=Request a demo',
            trigger: 'click',
            platform: 'meta',
            event_name: 'Contact',
          },
          {
            selector: 'url=/thank-you',
            trigger: 'pageview',
            platform: 'ga4',
            event_name: 'purchase',
          },
        ],
      },
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    description: 'Active site - Full tracking enabled',
  },
  {
    id: 'client_paused',
    data: {
      owner_id: 'user_2',
      url: 'https://example.com',
      status: 'paused',
      trackingConfig: {
        pixels: {
          ga4: 'G-PAUSED-ACCOUNT',
          meta: '999-PAUSED',
        },
        events: [
          {
            selector: '#checkout',
            trigger: 'click',
            platform: 'ga4',
            event_name: 'begin_checkout',
          },
        ],
      },
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    description: 'Paused site - Temporarily disabled tracking',
  },
];

/**
 * Seeds the Firestore database with test data
 */
async function seedDatabase() {
  console.log('🌱 Starting Firestore seeding...\n');

  try {
    // Use batch write for better performance
    const batch = db.batch();

    for (const site of testSites) {
      const siteRef = db.collection('sites').doc(site.id);
      batch.set(siteRef, site.data);
      
      console.log(`✅ Queued: ${site.id}`);
      console.log(`   Description: ${site.description}`);
      console.log(`   Status: ${site.data.status}`);
      console.log(`   Pixels: ${Object.keys(site.data.trackingConfig.pixels).join(', ') || 'none'}`);
      console.log(`   Events: ${site.data.trackingConfig.events.length}`);
      console.log('');
    }

    // Commit all writes
    await batch.commit();

    console.log('✨ Database seeding completed successfully!\n');
    console.log('📋 Test Instructions:');
    console.log('');
    console.log('1. Test Pending Site (No Tracking):');
    console.log('   Update test.html: <script src="pigxel.js?id=client_pending&debug=true"></script>');
    console.log('   Expected: Console shows "Pigxel loaded (Paused)" - No pixels fire');
    console.log('');
    console.log('2. Test Active Site (Full Tracking):');
    console.log('   Update test.html: <script src="pigxel.js?id=client_active&debug=true"></script>');
    console.log('   Expected: Console shows "Pigxel loaded (Active)" - GA4 & Meta pixels fire');
    console.log('');
    console.log('3. Test Paused Site (Temporarily Disabled):');
    console.log('   Update test.html: <script src="pigxel.js?id=client_paused&debug=true"></script>');
    console.log('   Expected: Console shows "Pigxel loaded (Paused)" - No pixels fire');
    console.log('');

    // Display collection summary
    console.log('📊 Collection Summary:');
    const sitesSnapshot = await db.collection('sites').get();
    console.log(`   Total sites: ${sitesSnapshot.size}`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

/**
 * Clears all test data (useful for testing)
 */
async function clearDatabase() {
  console.log('🗑️  Clearing test data...\n');

  try {
    const batch = db.batch();

    for (const site of testSites) {
      const siteRef = db.collection('sites').doc(site.id);
      batch.delete(siteRef);
      console.log(`✅ Queued deletion: ${site.id}`);
    }

    await batch.commit();
    console.log('\n✨ Test data cleared successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'clear') {
  clearDatabase();
} else {
  seedDatabase();
}
