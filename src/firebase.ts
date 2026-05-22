import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  deleteUser, 
  Auth, 
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  Firestore 
} from 'firebase/firestore';

// Configuration storage key
const LOCAL_STORAGE_CONFIG_KEY = 'prompt_rkn_firebase_config_v1';
const SIMULATED_USERS_DB_KEY = 'prompt_rkn_simulated_cloud_v1';
const ACTIVE_SIMULATED_USER_KEY = 'prompt_rkn_active_simulated_user';

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  databaseId?: string;
}

export interface CompactUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

// Check if we can load from saved local configs
export function getSavedFirebaseConfig(): FirebaseCustomConfig | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

export function saveFirebaseConfig(config: FirebaseCustomConfig) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
  }
}

// Singletons
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export function getEnvironmentFirebaseConfig(): FirebaseCustomConfig | null {
  // Safe extraction helper to look at process.env, import.meta.env, VITE_ prefixed keys, etc.
  const getVal = (key: string): string => {
    try {
      if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key] as string;
      }
    } catch {}
    
    try {
      const meta = import.meta as any;
      if (meta && meta.env && meta.env[`VITE_${key}`]) {
        return meta.env[`VITE_${key}`] as string;
      }
      if (meta && meta.env && meta.env[key]) {
        return meta.env[key] as string;
      }
    } catch {}

    try {
      if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
        return (window as any).process.env[key];
      }
    } catch {}

    return "";
  };

  const apiKey = getVal('REACT_APP_FIREBASE_API_KEY');
  const authDomain = getVal('REACT_APP_FIREBASE_AUTH_DOMAIN');
  const projectId = getVal('REACT_APP_FIREBASE_PROJECT_ID');
  const storageBucket = getVal('REACT_APP_FIREBASE_STORAGE_BUCKET');
  const messagingSenderId = getVal('REACT_APP_FIREBASE_MESSAGING_SENDER_ID');
  const appId = getVal('REACT_APP_FIREBASE_APP_ID');

  if (apiKey && projectId) {
    return {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId
    };
  }
  return null;
}

export function initFirebase(customConfig?: FirebaseCustomConfig): { auth: Auth | null; db: Firestore | null } {
  try {
    const activeConfig = {
      apiKey: "AIzaSyAducKTfSDkext8M5Rj1VFkKosR-I8P03E",
      authDomain: "studio-1495864073-8b2c0.firebaseapp.com",
      projectId: "studio-1495864073-8b2c0",
      storageBucket: "studio-1495864073-8b2c0.firebasestorage.app",
      messagingSenderId: "659463302290",
      appId: "1:659463302290:web:ad5e370b7c3a3517fb0a4b"
    };

    if (getApps().length === 0) {
      app = initializeApp(activeConfig);
    } else {
      app = getApp();
    }

    auth = getAuth(app);
    db = getFirestore(app);

    return { auth, db };
  } catch (error) {
    console.error("Failed to initialize Firebase SDK:", error);
    return { auth: null, db: null };
  }
}

// Self-initializing
const initialized = initFirebase();
auth = initialized.auth;
db = initialized.db;

export { auth, db, googleProvider };

// --- Real or Simulated Authentication & Database APIs ---

// 1. Check if user has simulated active account on mount
export function getSavedSimulatedUser(): CompactUser | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(ACTIVE_SIMULATED_USER_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

// 2. Clear simulated active account
export function clearSavedSimulatedUser() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACTIVE_SIMULATED_USER_KEY);
  }
}

// 3. Save simulated active account
export function saveSimulatedUser(user: CompactUser) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACTIVE_SIMULATED_USER_KEY, JSON.stringify(user));
  }
}

// 4. Simulated Cloud Database (localStorage-backed dictionary per user UID, reflecting a real cloud Firestore db)
export function getSimulatedCloudStore(userId: string): any | null {
  if (typeof window === 'undefined') return null;
  const dbStoreStr = localStorage.getItem(`${SIMULATED_USERS_DB_KEY}_doc_${userId}`);
  if (dbStoreStr) {
    try {
      return JSON.parse(dbStoreStr);
    } catch {
      return null;
    }
  }
  return null;
}

export function setSimulatedCloudStore(userId: string, data: any) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    `${SIMULATED_USERS_DB_KEY}_doc_${userId}`, 
    JSON.stringify({
      ...data,
      updatedAt: new Date().toISOString()
    })
  );
}

// Delete simulated user store
export function deleteSimulatedCloudStore(userId: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${SIMULATED_USERS_DB_KEY}_doc_${userId}`);
}


// --- Unified Operational Methods ---

// Login flow
export async function signInWithGoogleWrapper() {
  if (auth) {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } else {
    throw new Error("قاعدة البيانات السحابية غير مفعّلة حالياً. يرجى تهيئة إعدادات البيئة لـ Firebase.");
  }
}

// Sign Out
export async function logoutUserWrapper() {
  clearSavedSimulatedUser();
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Firebase Signout error", e);
    }
  }
}

// Delete Account
export async function deleteUserAccountWrapper(userId: string) {
  // Clear simulated storage
  deleteSimulatedCloudStore(userId);
  clearSavedSimulatedUser();

  if (auth && auth.currentUser) {
    if (db) {
      const dataRef = doc(db, 'users', userId, 'data', 'appState');
      try {
        await setDoc(dataRef, { gates: [], prompts: [], deletedAt: new Date().toISOString() });
      } catch (e) {
        console.error("Could not overwrite Cloud doc before deletion", e);
      }
    }
    try {
      await deleteUser(auth.currentUser);
    } catch (e) {
      console.error("Firebase Auth deleteUser failed", e);
      throw e;
    }
  }
}

// Save complete state
export async function saveStateToFirestoreWrapper(userId: string, state: any) {
  // Always write to simulated cloud node first for offline persistence!
  setSimulatedCloudStore(userId, state);

  // If real instance is connected, write online as well
  if (db) {
    try {
      const dataRef = doc(db, 'users', userId, 'data', 'appState');
      await setDoc(dataRef, {
        gates: state.gates,
        prompts: state.prompts,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Online Firestore save failed, buffered in local storage", e);
      throw e;
    }
  }
}

// Fetch state
export async function fetchStateFromFirestoreWrapper(userId: string): Promise<any | null> {
  // 1. If we are offline or have saved simulated state, check there
  const localSimulated = getSimulatedCloudStore(userId);

  // 2. Fetch from Firebase if initialized
  if (db) {
    try {
      const dataRef = doc(db, 'users', userId, 'data', 'appState');
      const snap = await getDoc(dataRef);
      if (snap.exists()) {
        const cloudData = snap.data();
        // Return latest version
        if (localSimulated && cloudData?.updatedAt) {
          const cloudDate = new Date(cloudData.updatedAt).getTime();
          const localDate = new Date(localSimulated.updatedAt || 0).getTime();
          if (localDate > cloudDate) {
            return localSimulated; // Return newer simulated edits made offline
          }
        }
        return cloudData;
      }
    } catch (e) {
      console.error("Firestore loading failed. Falling back to local cloud buffer", e);
    }
  }

  return localSimulated;
}
