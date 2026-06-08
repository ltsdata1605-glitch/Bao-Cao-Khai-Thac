import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';

// Firebase Config copied from /firebase-applet-config.json for type-safe and reliable ESM importing
const firebaseConfig = {
  projectId: "gen-lang-client-0491638315",
  appId: "1:487587635482:web:4b532ff7534a62b0ff0ca3",
  apiKey: "AIzaSyD1G1pug8XNXMiPmWRaTn73J5Z4VfBk8YA",
  authDomain: "gen-lang-client-0491638315.firebaseapp.com",
  storageBucket: "gen-lang-client-0491638315.firebasestorage.app",
  messagingSenderId: "487587635482",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add required scope for Google Sheets API
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

// Set custom parameters to force consent screen and account selection if necessary
provider.setCustomParameters({
  prompt: 'select_account consent'
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
