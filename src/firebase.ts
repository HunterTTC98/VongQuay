import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth & Firestore with specific Database ID
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Test connection as required by Firebase skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Firestore client is offline or pending connection.');
    }
  }
}
testConnection();

/**
 * 1-Click Sign In with Google via Popup
 */
export async function loginWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign In with Email & Password
 */
export async function loginWithEmail(email: string, pass: string): Promise<FirebaseUser> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return result.user;
}

/**
 * Register with Email & Password
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<FirebaseUser> {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName && displayName.trim()) {
    await updateProfile(result.user, {
      displayName: displayName.trim(),
    });
  }
  return result.user;
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Sign Out
 */
export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged, type FirebaseUser };
