import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, type FirebaseStorage } from 'firebase/storage';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  type User, 
  type Auth 
} from 'firebase/auth';

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
  databaseId?: string;
}

const CUSTOM_CONFIG_KEY = 'custom_firebase_config';

export function getCustomFirebaseConfig(): FirebaseCustomConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CUSTOM_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveCustomFirebaseConfig(config: FirebaseCustomConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CUSTOM_CONFIG_KEY, JSON.stringify(config));
  window.location.reload();
}

export function resetCustomFirebaseConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CUSTOM_CONFIG_KEY);
  window.location.reload();
}

export const STANDARD_FIREBASE_AUTH_DOMAIN = "quanlytrucnhat.firebaseapp.com";

export function resolveFirebaseConfig(): { config: FirebaseCustomConfig; source: 'custom' | 'env' | 'fallback' } {
  // 1. Kiểm tra cấu hình tùy chỉnh của Admin trong trình duyệt nếu có
  const customConfig = getCustomFirebaseConfig();
  if (customConfig && customConfig.apiKey && customConfig.projectId) {
    const rawDbId = (customConfig.databaseId || '').trim();
    const rawAppId = (customConfig.appId || '').trim();
    const isValidDbId = Boolean(
      rawDbId &&
      rawDbId !== '(default)' &&
      !rawDbId.includes(':') &&
      rawDbId !== rawAppId
    );
    return {
      config: {
        ...customConfig,
        databaseId: isValidDbId ? rawDbId : '(default)',
      },
      source: 'custom'
    };
  }

  // 2. Kiểm tra biến môi trường VITE_FIREBASE_*
  const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  // Kiểm tra host Vercel
  const isVercelHost = typeof window !== 'undefined' && (
    window.location.hostname.endsWith('vercel.app') ||
    window.location.hostname.includes('trucnhat')
  );

  const rawDbId = (import.meta.env.VITE_FIREBASE_DATABASE_ID || '').trim();
  const rawAppId = (import.meta.env.VITE_FIREBASE_APP_ID || '').trim();
  const isValidCustomDbId = Boolean(
    rawDbId &&
    rawDbId !== '(default)' &&
    !rawDbId.includes(':') &&
    rawDbId !== rawAppId
  );
  const safeDatabaseId = isValidCustomDbId ? rawDbId : '(default)';

  if (envApiKey && envProjectId) {
    return {
      config: {
        apiKey: envApiKey,
        // ĐÃ SỬA: Bắt buộc dùng tên miền Vercel hiện tại khi chạy trên Vercel để khớp với cầu nối vercel.json
        authDomain: isVercelHost 
          ? window.location.hostname 
          : (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.includes('firebaseapp.com') ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : `${envProjectId}.firebaseapp.com`),
        projectId: envProjectId,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.firebasestorage.app`,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '162658872054',
        appId: rawAppId || '1:162658872054:web:289d6bc5532f549ee01ad7',
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-641YD0GDH8',
        databaseId: safeDatabaseId,
      },
      source: 'env'
    };
  }

  // 3. Cấu hình chuẩn mặc định của dự án quanlytrucnhat
  return {
    config: {
      projectId: "quanlytrucnhat",
      appId: "1:162658872054:web:289d6bc5532f549ee01ad7",
      apiKey: "AIzaSyCCBRTHW2p7GnKIncHB7KMJVl37hOlWNhg",
      authDomain: isVercelHost ? window.location.hostname : "quanlytrucnhat.firebaseapp.com",
      storageBucket: "quanlytrucnhat.firebasestorage.app",
      messagingSenderId: "162658872054",
      measurementId: "G-641YD0GDH8",
      databaseId: "(default)",
    },
    source: 'fallback'
  };
}

const activeInfo = resolveFirebaseConfig();
export const activeFirebaseConfig = activeInfo.config;
export const firebaseConfigSource = activeInfo.source;

export const app: FirebaseApp = getApps().length > 0 
  ? getApp() 
  : initializeApp(activeFirebaseConfig);

export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const db: Firestore = (activeFirebaseConfig.databaseId && activeFirebaseConfig.databaseId !== '(default)')
  ? getFirestore(app, activeFirebaseConfig.databaseId)
  : getFirestore(app);

export const storage: FirebaseStorage = getStorage(app);

/**
 * Upload ảnh chụp báo cáo trực nhật lên Firebase Storage.
 */
export async function uploadPhotoToFirebaseStorage(
  fileOrBlob: Blob | File,
  filenamePrefix: string = 'trucnhat'
): Promise<string> {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const ext = fileOrBlob.type === 'image/png' ? 'png' : 'jpg';
  const cleanPrefix = filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  const storagePath = `trucnhat_photos/${cleanPrefix}_${timestamp}_${randomSuffix}.${ext}`;
  const storageRef = ref(storage, storagePath);
  const metadata = {
    contentType: fileOrBlob.type || 'image/jpeg',
  };

  const snapshot = await uploadBytes(storageRef, fileOrBlob, metadata);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

export { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, type User };

export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/cancelled-popup-request' ||
      (typeof error?.message === 'string' && error.message.toLowerCase().includes('popup-blocked'))
    ) {
      console.warn('Google popup blocked by browser/ad-blocker, falling back to signInWithRedirect...');
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
};

export const signInWithGoogleRedirect = async (): Promise<void> => {
  await signInWithRedirect(auth, googleProvider);
};

export async function signOutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.warn('Sign Out Warning:', error);
  }
}
