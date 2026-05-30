import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let db = null;

function getDb() {
  if (!db) {
    const firebaseConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
      measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID
    };

    if (!firebaseConfig.projectId) {
      console.warn('⚠️ Warning: Firebase environment variables are not configured. Session sync is disabled.');
      return null;
    }
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
  return db;
}

const AUTH_DIR = 'auth_session';

export async function downloadSessionFromFirebase() {
  try {
    const firestore = getDb();
    if (!firestore) return false;

    console.log('🔄 Checking cloud database for active WhatsApp session...');
    const sessionDocRef = doc(firestore, 'whatsapp_session', 'active_session');
    const docSnap = await getDoc(sessionDocRef);

    if (!docSnap.exists()) {
      console.log('ℹ️ No active WhatsApp session found in the cloud. A fresh login will be required.');
      return false;
    }

    const data = docSnap.data();
    if (!data || !data.files) {
      console.log('ℹ️ Session document exists but contains no files.');
      return false;
    }

    // Ensure local auth folder exists
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const files = data.files;
    let count = 0;
    for (const [filename, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(AUTH_DIR, filename), content, 'utf-8');
      count++;
    }

    console.log(`✅ Successfully restored WhatsApp session from cloud database (${count} files synced!).`);
    return true;
  } catch (error) {
    console.error('❌ Failed to restore session from Firebase:', error);
    return false;
  }
}

// Simple debounce to prevent hitting Firestore write limits (only write at most once every 10 seconds)
let isUploading = false;
let uploadTimeout = null;

export function uploadSessionToFirebaseDebounced() {
  if (uploadTimeout) clearTimeout(uploadTimeout);
  
  uploadTimeout = setTimeout(async () => {
    if (isUploading) {
      // Re-queue if already in progress
      uploadSessionToFirebaseDebounced();
      return;
    }
    
    isUploading = true;
    try {
      await uploadSessionToFirebase();
    } catch (error) {
      console.error('❌ Debounced session upload failed:', error);
    } finally {
      isUploading = false;
    }
  }, 10000); // 10 second debounce
}

export async function uploadSessionToFirebase() {
  try {
    const firestore = getDb();
    if (!firestore) return;

    if (!fs.existsSync(AUTH_DIR)) {
      console.log('⚠️ auth_session directory does not exist. Nothing to upload.');
      return;
    }

    const files = fs.readdirSync(AUTH_DIR);
    if (files.length === 0) {
      console.log('ℹ️ auth_session directory is empty. Skipping upload.');
      return;
    }

    console.log(`🔄 Packaging WhatsApp session (${files.length} files) for secure cloud backup...`);

    const packedFiles = {};
    for (const filename of files) {
      const filePath = path.join(AUTH_DIR, filename);
      const stat = fs.statSync(filePath);
      
      // Only process files (skip folders, if any)
      if (stat.isFile()) {
        const content = fs.readFileSync(filePath, 'utf-8');
        packedFiles[filename] = content;
      }
    }

    const sessionDocRef = doc(firestore, 'whatsapp_session', 'active_session');
    await setDoc(sessionDocRef, {
      files: packedFiles,
      updatedAt: new Date().toISOString()
    });

    console.log('☁️ WhatsApp session successfully backed up to Firebase Firestore!');
  } catch (error) {
    console.error('❌ Failed to back up session to Firebase:', error);
  }
}
