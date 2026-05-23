import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  deleteUser, 
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  Firestore 
} from 'firebase/firestore';

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

const firebaseConfig = {
  apiKey: "AIzaSyAducKTfSDkext8M5Rj1VFkKosR-I8P03E",
  authDomain: "studio-1495864073-8b2c0.firebaseapp.com",
  projectId: "studio-1495864073-8b2c0",
  storageBucket: "studio-1495864073-8b2c0.firebasestorage.app",
  messagingSenderId: "659463302290",
  appId: "1:659463302290:web:ad5e370b7c3a3517fb0a4b"
};

// Singleton initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Configuration management
export function getSavedFirebaseConfig(): FirebaseCustomConfig | null {
  return firebaseConfig;
}

export function saveFirebaseConfig(config: FirebaseCustomConfig) {}

export function getEnvironmentFirebaseConfig(): FirebaseCustomConfig | null {
  return firebaseConfig;
}

export function initFirebase(customConfig?: FirebaseCustomConfig): { auth: Auth | null; db: Firestore | null } {
  return { auth, db };
}

// Local storage session management for user state persistence
const ACTIVE_SIMULATED_USER_KEY = 'prompt_rkn_active_simulated_user';

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

export function clearSavedSimulatedUser() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACTIVE_SIMULATED_USER_KEY);
  }
}

export function saveSimulatedUser(user: CompactUser) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACTIVE_SIMULATED_USER_KEY, JSON.stringify(user));
  }
}

// Login flow
export async function signInWithGoogleWrapper() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// Sign Out
export async function logoutUserWrapper() {
  clearSavedSimulatedUser();
  await signOut(auth);
}

// Delete Account
export async function deleteUserAccountWrapper(userId: string) {
  clearSavedSimulatedUser();
  if (auth.currentUser) {
    const dataRef = doc(db, 'users', userId, 'data', 'appState');
    try {
      await setDoc(dataRef, { gates: [], prompts: [], deletedAt: new Date().toISOString() });
    } catch (e) {
      console.error("Could not overwrite Cloud doc before deletion", e);
    }
    await deleteUser(auth.currentUser);
  }
}

// Save complete state to real Firestore
export async function saveStateToFirestoreWrapper(userId: string, state: any) {
  const dataRef = doc(db, 'users', userId, 'data', 'appState');
  await setDoc(dataRef, {
    gates: state.gates,
    prompts: state.prompts,
    updatedAt: new Date().toISOString()
  });
}

// Fetch complete state from real Firestore
export async function fetchStateFromFirestoreWrapper(userId: string): Promise<any | null> {
  const dataRef = doc(db, 'users', userId, 'data', 'appState');
  const snap = await getDoc(dataRef);
  if (snap.exists()) {
    return snap.data();
  }
  return null;
}
