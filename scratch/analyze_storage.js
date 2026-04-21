import { getFirestore } from 'firebase-admin/firestore';
import { adminAuth } from './server/services/firebaseAdmin.js'; // Adjust path if needed
import { env } from './server/config/env.js';

async function analyzeStorage() {
  const db = getFirestore();
  const snapshot = await db.collection('cvs').get();
  
  console.log(`Total Records: ${snapshot.size}`);
  
  let totalSize = 0;
  let missingSizeCount = 0;
  let zeroSizeCount = 0;
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const size = data.fileSize;
    
    if (size === undefined || size === null) {
      missingSizeCount++;
    } else if (size === 0) {
      zeroSizeCount++;
    } else {
      totalSize += size;
    }
  });
  
  console.log(`Total Calculated Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Records missing fileSize: ${missingSizeCount}`);
  console.log(`Records with fileSize = 0: ${zeroSizeCount}`);
}

analyzeStorage().catch(console.error);
