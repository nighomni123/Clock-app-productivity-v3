import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously as firebaseSignInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfigData);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with specific database ID if available and modern multi-tab persistence
const dbId = firebaseConfigData.firestoreDatabaseId || undefined;
const settings = {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
};

export const db = dbId
  ? initializeFirestore(app, settings, dbId)
  : initializeFirestore(app, settings);

// Helper to get or create persistent guest UID
export const getOrGenerateLocalGuestUid = (): string => {
  if (typeof window === 'undefined') return 'guest_default';
  let guestUid = localStorage.getItem('focus_clock_guest_uid');
  if (!guestUid) {
    guestUid = 'guest_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem('focus_clock_guest_uid', guestUid);
  }
  return guestUid;
};

export interface AppUserAuth {
  uid: string;
  isAnonymous: boolean;
  displayName: string | null;
  email: string | null;
}

// Auth helpers
export const signInAnonymouslyUser = async (): Promise<AppUserAuth> => {
  try {
    const userCredential = await firebaseSignInAnonymously(auth);
    return {
      uid: userCredential.user.uid,
      isAnonymous: true,
      displayName: userCredential.user.displayName || 'Anonymous Student',
      email: userCredential.user.email
    };
  } catch (error: unknown) {
    const errObj = error as { code?: string; message?: string };
    console.info('Firebase Anonymous Auth is disabled/restricted in project settings. Using Guest Session mode:', errObj?.code || errObj?.message || error);
    const guestUid = getOrGenerateLocalGuestUid();
    return {
      uid: guestUid,
      isAnonymous: true,
      displayName: 'Guest Student',
      email: null
    };
  }
};

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('focus_clock_guest_uid');
    }
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error logging out:', error);
  }
};

export {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  onAuthStateChanged,
  type User
};
