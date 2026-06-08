import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc 
} from 'firebase/firestore';

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
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Helper to wrap Firestore promises with a timeout to prevent hanging when offline or connection is blocked
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 7000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Hết thời gian chờ kết nối Cloud Firestore (quá 7 giây). Vui lòng kiểm tra lại kết nối mạng của bạn!'));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function saveReportToFirestore(report: any): Promise<void> {
  const docId = `${report.staffName}_${report.date}`;
  await withTimeout(setDoc(doc(db, 'reports', docId), report));
}

export async function deleteReportFromFirestore(date: string, staffName: string): Promise<boolean> {
  try {
    const docId = `${staffName}_${date}`;
    await withTimeout(deleteDoc(doc(db, 'reports', docId)));
    return true;
  } catch (error) {
    console.error('Error deleting report from Firestore:', error);
    return false;
  }
}

export async function fetchTeamReportsFromFirestore(): Promise<any[]> {
  try {
    const querySnapshot = await withTimeout(getDocs(collection(db, 'reports')));
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
  } catch (error) {
    console.error('Error fetching reports from Firestore:', error);
    throw error;
  }
}
