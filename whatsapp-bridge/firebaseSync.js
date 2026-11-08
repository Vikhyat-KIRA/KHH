import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
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
    if (!data || !data.files || !data.files['creds.json']) {
      console.log('ℹ️ Session document exists but has no valid creds.json.');
      return false;
    }

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const files = data.files;
    let count = 0;
    for (const [filename, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(AUTH_DIR, filename), content, 'utf-8');
      count++;
    }

    console.log(`✅ Successfully restored WhatsApp session from cloud database (${count} essential files synced!).`);
    return true;
  } catch (error) {
    console.error('❌ Failed to restore session from Firebase:', error);
    return false;
  }
}

// Automatically wipe corrupted/logged-out session from local disk AND Firestore
export async function clearSessionFromFirebase() {
  try {
    if (uploadTimeout) clearTimeout(uploadTimeout);

    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      console.log('🧹 Wiped local auth_session folder.');
    }

    const firestore = getDb();
    if (!firestore) return;

    const sessionDocRef = doc(firestore, 'whatsapp_session', 'active_session');
    await deleteDoc(sessionDocRef);
    console.log('🧹 Purged invalidated WhatsApp session from Firebase Firestore.');
  } catch (error) {
    console.error('❌ Failed to clear session from Firebase:', error);
  }
}

let isUploading = false;
let uploadTimeout = null;

export function uploadSessionToFirebaseDebounced() {
  if (uploadTimeout) clearTimeout(uploadTimeout);
  
  uploadTimeout = setTimeout(async () => {
    if (isUploading) {
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
  }, 10000);
}

export async function uploadSessionToFirebase() {
  try {
    const firestore = getDb();
    if (!firestore) return;

    if (!fs.existsSync(AUTH_DIR)) return;

    const files = fs.readdirSync(AUTH_DIR);
    if (files.length === 0) return;

    const packedFiles = {};
    let totalBytes = 0;

    // Prioritize creds.json first so it is ALWAYS saved
    if (files.includes('creds.json')) {
      const credsContent = fs.readFileSync(path.join(AUTH_DIR, 'creds.json'), 'utf-8');
      packedFiles['creds.json'] = credsContent;
      totalBytes += Buffer.byteLength(credsContent, 'utf-8');
    }

    // Filter out bloated app-state-sync files that blow up Firestore's 1MB limit
    for (const filename of files) {
      if (filename === 'creds.json') continue;
      if (filename.startsWith('app-state-sync')) continue;

      const filePath = path.join(AUTH_DIR, filename);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const size = Buffer.byteLength(content, 'utf-8');
        // Keep strictly under 800KB so Firestore 1MB limit NEVER rejects the save
        if (totalBytes + size < 800000) {
          packedFiles[filename] = content;
          totalBytes += size;
        }
      }
    }

    const sessionDocRef = doc(firestore, 'whatsapp_session', 'active_session');
    await setDoc(sessionDocRef, {
      files: packedFiles,
      updatedAt: new Date().toISOString()
    });

    console.log(`☁️ Backed up ${Object.keys(packedFiles).length} essential session files (${Math.round(totalBytes / 1024)} KB) to Firestore!`);
  } catch (error) {
    console.error('❌ Failed to back up session to Firebase:', error);
  }
}
