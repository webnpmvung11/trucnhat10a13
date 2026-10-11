import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc,
  onSnapshot, 
  writeBatch,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase';

export interface TaskItem {
  id: string;
  title: string;
  requiredCount: number;
  description?: string;
  order: number;
  isActive: boolean;
}

export interface SheetConfig {
  spreadsheetUrl?: string;
  appsScriptUrl?: string;
  appsScriptImageUrl?: string;
  driveFolderId?: string;
  autoSync?: boolean;
  lastSyncedAt?: string;
}

export interface AppSettings {
  className: string;
  schoolYear: string;
  adminName: string;
  managerName: string;
  adminGoogleEmails: string[];
  managerGoogleEmails: string[];
  adminEmailNames?: Record<string, string>;
  managerEmailNames?: Record<string, string>;
  autoLogoutMinutes: number;
  sheetConfig?: SheetConfig;
}

export interface ScheduleItem {
  id: string;
  date: string;
  studentId: string;
  status: 'pending' | 'completed';
  assignedTask?: string;
  taskContent?: string;
  photos?: string[];
  photoBase64?: string;
  completedAt?: number;
  completedBy?: string;
  isEditedByLPLD?: boolean;
  editedBy?: string;
  lastEditedAt?: number;
  editNote?: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: number;
  user: string;
  action: string;
  details: string;
}

export const DEFAULT_TASKS: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)',
    requiredCount: 2,
    description: 'Quét sạch các dãy bàn, hành lang và thay túi rác, đổ rác 2 lần đầu & cuối buổi.',
    order: 1,
    isActive: true
  },
  {
    id: 'task-2',
    title: 'Giặt khăn, Lau bảng, bàn GV + Tắt đèn, quạt + Khóa cửa',
    requiredCount: 1,
    description: 'Giặt khăn lau sạch bảng, lau bàn giáo viên, tắt điện quạt và khóa cửa lớp khi ra về.',
    order: 2,
    isActive: true
  }
];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  className: '10A13',
  schoolYear: '2024 - 2025',
  adminName: 'Giáo viên chủ nhiệm',
  managerName: 'Lớp phó lao động',
  adminGoogleEmails: ['webnpmvung@gmail.com', 'webnpmvung1@gmail.com'],
  managerGoogleEmails: [],
  adminEmailNames: {
    'webnpmvung@gmail.com': 'Thầy Vững',
    'webnpmvung1@gmail.com': 'GVCN Dự phòng'
  },
  managerEmailNames: {},
  autoLogoutMinutes: 15,
  sheetConfig: {
    spreadsheetUrl: '',
    appsScriptUrl: '',
    appsScriptImageUrl: 'https://script.google.com/macros/s/AKfycbwknpHei6xEU81OAS51eNhoR78f8dF6LkGosc6Xw7xMcnrAIKHGcxnZSinfY3YrlpnO/exec',
    driveFolderId: '1d1YTxkOFluqzRzq9gBLMT1_yCBBdrld4',
    autoSync: false,
    lastSyncedAt: ''
  }
};

/**
 * Loại bỏ các trường undefined để tránh lỗi Firestore:
 * Function setDoc() called with invalid data. Unsupported field value: undefined
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return null as any;
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned as T;
  }
  return data;
}

// ==================== 1. AUDIT LOGS ====================
export async function logAction(action: string, details: string) {
  try {
    const role = localStorage.getItem('userRole') || 'Guest';
    const name = localStorage.getItem('userName') || 'Ẩn danh';
    await addDoc(collection(db, 'auditLogs'), sanitizeForFirestore({
      timestamp: Date.now(),
      user: `[${role}] ${name}`,
      action,
      details
    }));
  } catch (e) {
    console.warn('Failed to log action to Firestore (offline/rules):', e);
  }
}

export function subscribeAuditLogs(
  onData: (logs: AuditLogItem[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const coll = collection(db, 'auditLogs');
    return onSnapshot(coll, (snapshot) => {
      const list: AuditLogItem[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as AuditLogItem));
      list.sort((a, b) => b.timestamp - a.timestamp);
      onData(list);
    }, (err) => {
      console.warn('Audit logs snapshot fallback:', err.message);
      onData([]);
      if (onError) onError(err);
    });
  } catch (e) {
    onData([]);
    return () => {};
  }
}

// ==================== 2. SETTINGS ====================
export function subscribeSettings(
  onData: (settings: AppSettings) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const ref = doc(db, 'settings', 'config');
    return onSnapshot(ref, async (snap) => {
      try {
        if (snap.exists()) {
          const data = snap.data() as AppSettings;
          const merged: AppSettings = {
            ...DEFAULT_APP_SETTINGS,
            ...data,
            className: data.className || DEFAULT_APP_SETTINGS.className,
            schoolYear: data.schoolYear || DEFAULT_APP_SETTINGS.schoolYear,
            adminName: data.adminName || DEFAULT_APP_SETTINGS.adminName,
            managerName: data.managerName || DEFAULT_APP_SETTINGS.managerName,
            adminGoogleEmails: Array.isArray(data.adminGoogleEmails) && data.adminGoogleEmails.length > 0
              ? data.adminGoogleEmails
              : DEFAULT_APP_SETTINGS.adminGoogleEmails,
            managerGoogleEmails: Array.isArray(data.managerGoogleEmails)
              ? data.managerGoogleEmails
              : [],
            adminEmailNames: {
              ...(DEFAULT_APP_SETTINGS.adminEmailNames || {}),
              ...(data.adminEmailNames || {})
            },
            managerEmailNames: {
              ...(DEFAULT_APP_SETTINGS.managerEmailNames || {}),
              ...(data.managerEmailNames || {})
            },
            sheetConfig: {
              ...DEFAULT_APP_SETTINGS.sheetConfig,
              ...(data.sheetConfig || {})
            }
          };
          onData(merged);
        } else {
          // Provide default and attempt to seed
          onData(DEFAULT_APP_SETTINGS);
          setDoc(ref, sanitizeForFirestore(DEFAULT_APP_SETTINGS), { merge: true }).catch(() => {});
        }
      } catch (e) {
        console.warn('Settings processing fallback:', e);
        onData(DEFAULT_APP_SETTINGS);
        if (onError) onError(e);
      }
    }, (err) => {
      console.warn('Settings snapshot error (using default):', err.message);
      onData(DEFAULT_APP_SETTINGS);
      if (onError) onError(err);
    });
  } catch (e) {
    onData(DEFAULT_APP_SETTINGS);
    return () => {};
  }
}

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const ref = doc(db, 'settings', 'config');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as AppSettings;
      return {
        ...DEFAULT_APP_SETTINGS,
        ...data,
        className: data.className || DEFAULT_APP_SETTINGS.className,
        schoolYear: data.schoolYear || DEFAULT_APP_SETTINGS.schoolYear,
        adminName: data.adminName || DEFAULT_APP_SETTINGS.adminName,
        managerName: data.managerName || DEFAULT_APP_SETTINGS.managerName,
        adminGoogleEmails: Array.isArray(data.adminGoogleEmails) && data.adminGoogleEmails.length > 0
          ? data.adminGoogleEmails
          : DEFAULT_APP_SETTINGS.adminGoogleEmails,
        managerGoogleEmails: Array.isArray(data.managerGoogleEmails)
          ? data.managerGoogleEmails
          : [],
        adminEmailNames: {
          ...(DEFAULT_APP_SETTINGS.adminEmailNames || {}),
          ...(data.adminEmailNames || {})
        },
        managerEmailNames: {
          ...(DEFAULT_APP_SETTINGS.managerEmailNames || {}),
          ...(data.managerEmailNames || {})
        },
        sheetConfig: {
          ...DEFAULT_APP_SETTINGS.sheetConfig,
          ...(data.sheetConfig || {})
        }
      };
    }
  } catch (e) {
    console.warn('Failed to fetch app settings directly, using default:', e);
  }
  return DEFAULT_APP_SETTINGS;
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const ref = doc(db, 'settings', 'config');
  const cleanSettings = sanitizeForFirestore(settings);
  await setDoc(ref, cleanSettings, { merge: true });
  await logAction('Update Settings', 'Cập nhật cấu hình hệ thống & danh sách email phân quyền');
}

// ==================== 3. TASKS ====================
export function subscribeTasks(
  onData: (tasks: TaskItem[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const coll = collection(db, 'tasks');
    return onSnapshot(coll, async (snapshot) => {
      try {
        if (!snapshot.empty) {
          const list: TaskItem[] = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as TaskItem));
          list.sort((a, b) => (a.order || 0) - (b.order || 0));
          onData(list);
        } else {
          onData(DEFAULT_TASKS);
          const batch = writeBatch(db);
          for (const t of DEFAULT_TASKS) {
            batch.set(doc(db, 'tasks', t.id), t);
          }
          batch.commit().catch(() => {});
        }
      } catch (e) {
        console.warn('Tasks processing fallback:', e);
        onData(DEFAULT_TASKS);
        if (onError) onError(e);
      }
    }, (err) => {
      console.warn('Tasks snapshot error (using default tasks):', err.message);
      onData(DEFAULT_TASKS);
      if (onError) onError(err);
    });
  } catch (e) {
    onData(DEFAULT_TASKS);
    return () => {};
  }
}

export async function saveTask(task: TaskItem): Promise<void> {
  const ref = doc(db, 'tasks', task.id);
  await setDoc(ref, sanitizeForFirestore(task), { merge: true });
  await logAction('Save Task', `Cập nhật nhiệm vụ: ${task.title}`);
}

export async function deleteTask(taskId: string, title?: string): Promise<void> {
  await deleteDoc(doc(db, 'tasks', taskId));
  await logAction('Delete Task', `Xóa nhiệm vụ: ${title || taskId}`);
}

// ==================== 4. STUDENTS ====================
export function subscribeStudents(
  onData: (students: any[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const coll = collection(db, 'students');
    return onSnapshot(coll, (snapshot) => {
      const list = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      list.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', 'vi'));
      onData(list);
    }, (err) => {
      console.warn('Students snapshot fallback:', err.message);
      onData([]);
      if (onError) onError(err);
    });
  } catch (e) {
    onData([]);
    return () => {};
  }
}

// ==================== 5. SCHEDULES ====================
export function subscribeSchedules(
  onData: (schedules: ScheduleItem[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const coll = collection(db, 'schedules');
    return onSnapshot(coll, (snapshot) => {
      const list: ScheduleItem[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as ScheduleItem));
      onData(list);
    }, (err) => {
      console.warn('Schedules snapshot fallback:', err.message);
      onData([]);
      if (onError) onError(err);
    });
  } catch (e) {
    onData([]);
    return () => {};
  }
}
