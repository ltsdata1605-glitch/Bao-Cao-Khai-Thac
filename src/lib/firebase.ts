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

import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc 
} from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

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
      const token = cachedAccessToken || 'firestore_authenticated';
      if (onAuthSuccess) onAuthSuccess(user, token);
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
    // Since Google access token is only valid for 1 hour, we can still cache it if returned,
    // but the app is moving to Firestore which does not require it for authentication.
    cachedAccessToken = credential?.accessToken || 'firestore_authenticated';
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

export async function saveReportToFirestore(report: any): Promise<void> {
  const docId = `${report.staffName}_${report.date}`;
  await setDoc(doc(db, 'reports', docId), report);
}

export async function deleteReportFromFirestore(date: string, staffName: string): Promise<boolean> {
  try {
    const docId = `${staffName}_${date}`;
    await deleteDoc(doc(db, 'reports', docId));
    return true;
  } catch (error) {
    console.error('Error deleting report from Firestore:', error);
    return false;
  }
}

export async function fetchTeamReportsFromFirestore(): Promise<any[]> {
  const querySnapshot = await getDocs(collection(db, 'reports'));
  const reports: any[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    reports.push({
      date: data.date || '',
      staffName: data.staffName || 'Ẩn danh',
      cash: parseFloat(data.cash) || 0,
      installment: parseFloat(data.installment) || 0,
      tivi: data.products?.tivi || 0,
      tuLanh: data.products?.tuLanh || 0,
      mayGiat: data.products?.mayGiat || 0,
      mayLanh: data.products?.mayLanh || 0,
      smpTab: data.products?.smpTab || 0,
      laptop: data.products?.laptop || 0,
      mln: data.household?.mln || 0,
      qdh: data.household?.qdh || 0,
      quat: data.household?.quat || 0,
      noiCom: data.household?.noiCom || 0,
      locKk: data.household?.locKk || 0,
      insurance: parseFloat(data.services?.insurance) || 0,
      maintenance: parseFloat(data.services?.maintenance) || 0,
      vieon: data.services?.vieon || 0,
      sim: data.services?.sim || 0,
      camera: data.accessories?.camera || 0,
      sdp: data.accessories?.sdp || 0,
      taiNghe: data.accessories?.taiNghe || 0,
      den: data.accessories?.den || 0,
      dongHo: data.accessories?.dongHo || 0,
    });
  });
  return reports;
}
