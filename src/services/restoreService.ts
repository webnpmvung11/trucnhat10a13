import { 
  collection, getDocs, doc, setDoc, writeBatch, QuerySnapshot, DocumentReference 
} from 'firebase/firestore';
import { db } from '../firebase';
import { logAction, AppSettings, TaskItem, ScheduleItem, DEFAULT_TASKS } from './firestoreService';

export interface BackupPreview {
  version?: string;
  exportDate?: string;
  className?: string;
  studentsCount: number;
  schedulesCount: number;
  tasksCount: number;
  hasSettings: boolean;
  sampleStudents: string[];
}

export interface RestoreOptions {
  restoreStudents: boolean;
  restoreSchedules: boolean;
  restoreTasks: boolean;
  restoreSettings: boolean;
  mode: 'replace' | 'merge'; // 'replace' = làm sạch trước khi nạp; 'merge' = giữ cũ và nạp thêm
}

export interface RestoreStats {
  students: number;
  schedules: number;
  tasks: number;
  settings: boolean;
}

/**
 * Kiểm tra và phân tích cấu trúc file sao lưu JSON
 */
export function parseAndValidateBackup(jsonString: string): { 
  isValid: boolean; 
  error?: string; 
  preview?: BackupPreview; 
  data?: any 
} {
  try {
    const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    
    if (!data || typeof data !== 'object') {
      return { isValid: false, error: 'File sao lưu không đúng định dạng JSON hợp lệ.' };
    }

    // Hỗ trợ cả file xuất chuẩn 3.0 và các định dạng mảng đơn giản
    const students = Array.isArray(data.students) ? data.students : [];
    const schedules = Array.isArray(data.schedules) ? data.schedules : [];
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    const hasSettings = !!(data.settings && typeof data.settings === 'object');

    if (students.length === 0 && schedules.length === 0 && tasks.length === 0 && !hasSettings) {
      return { 
        isValid: false, 
        error: 'File không chứa bất kỳ dữ liệu hợp lệ nào của hệ thống trực nhật (Học sinh, Lịch trực, Nhiệm vụ hoặc Cài đặt).' 
      };
    }

    const preview: BackupPreview = {
      version: data.version || 'Tự do / Nhập tay',
      exportDate: data.exportDate ? new Date(data.exportDate).toLocaleString('vi-VN') : 'Không rõ',
      className: data.className || data.settings?.className || '10A13',
      studentsCount: students.length,
      schedulesCount: schedules.length,
      tasksCount: tasks.length,
      hasSettings,
      sampleStudents: students.slice(0, 5).map((s: any) => typeof s === 'string' ? s : (s.name || s.id || 'Học sinh'))
    };

    return { isValid: true, preview, data };
  } catch (err: any) {
    return { isValid: false, error: `Lỗi đọc file: ${err.message || 'JSON không hợp lệ'}` };
  }
}

/**
 * Xóa tập hợp tài liệu theo từng đợt tối đa 400 thao tác (tránh vượt giới hạn 500 của Firestore)
 */
async function deleteCollectionBatched(collectionName: string) {
  const snap = await getDocs(collection(db, collectionName));
  const docs = snap.docs;
  const CHUNK_SIZE = 400;

  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

/**
 * Khôi phục dữ liệu từ bản sao lưu vào Firestore
 */
export async function restoreBackupData(
  backupData: any, 
  options: RestoreOptions
): Promise<{ success: boolean; message: string; stats: RestoreStats }> {
  const userRole = localStorage.getItem('userRole') || 'Guest';
  if (userRole !== 'Admin') {
    throw new Error('Chỉ Giáo viên chủ nhiệm (Admin) mới có quyền khôi phục dữ liệu hệ thống!');
  }

  const stats: RestoreStats = {
    students: 0,
    schedules: 0,
    tasks: 0,
    settings: false
  };

  const isReplace = options.mode === 'replace';

  // 1. KHÔI PHỤC DANH SÁCH HỌC SINH
  if (options.restoreStudents && Array.isArray(backupData.students) && backupData.students.length > 0) {
    if (isReplace) {
      await deleteCollectionBatched('students');
    }

    const students = backupData.students;
    const CHUNK_SIZE = 400;
    for (let i = 0; i < students.length; i += CHUNK_SIZE) {
      const chunk = students.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      chunk.forEach((s: any, idx: number) => {
        const studentName = typeof s === 'string' ? s.trim() : (s.name || '').trim();
        if (!studentName) return;

        // Giữ lại id cũ nếu có để không làm đứt liên kết với lịch trực
        const studentId = (typeof s === 'object' && s.id) ? String(s.id) : doc(collection(db, 'students')).id;
        const studentRef = doc(db, 'students', studentId);
        
        const payload: any = {
          name: studentName,
          lastCleaned: (typeof s === 'object' && s.lastCleaned) ? s.lastCleaned : null
        };
        batch.set(studentRef, payload, { merge: true });
        stats.students++;
      });

      await batch.commit();
    }
  }

  // 2. KHÔI PHỤC LỊCH TRỰC NHẬT
  if (options.restoreSchedules && Array.isArray(backupData.schedules) && backupData.schedules.length > 0) {
    if (isReplace) {
      await deleteCollectionBatched('schedules');
    }

    const schedules = backupData.schedules;
    const CHUNK_SIZE = 400;
    for (let i = 0; i < schedules.length; i += CHUNK_SIZE) {
      const chunk = schedules.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      chunk.forEach((s: any) => {
        if (!s.date || !s.studentId) return;

        const schedId = s.id ? String(s.id) : doc(collection(db, 'schedules')).id;
        const schedRef = doc(db, 'schedules', schedId);

        const payload: any = {
          date: s.date,
          studentId: s.studentId,
          status: s.status || 'pending',
          assignedTask: s.assignedTask || 'Quét lớp + Thay túi rác, đổ rác',
          ...(s.taskContent ? { taskContent: s.taskContent } : {}),
          ...(s.completedAt ? { completedAt: s.completedAt } : {}),
          ...(s.completedBy ? { completedBy: s.completedBy } : {}),
          ...(s.photos ? { photos: s.photos } : {}),
          ...(s.isEditedByLPLD ? { isEditedByLPLD: true } : {}),
          ...(s.editedBy ? { editedBy: s.editedBy } : {}),
          ...(s.editNote ? { editNote: s.editNote } : {}),
          ...(s.lastEditedAt ? { lastEditedAt: s.lastEditedAt } : {})
        };

        batch.set(schedRef, payload, { merge: true });
        stats.schedules++;
      });

      await batch.commit();
    }
  }

  // 3. KHÔI PHỤC NHIỆM VỤ TRỰC NHẬT
  if (options.restoreTasks && Array.isArray(backupData.tasks) && backupData.tasks.length > 0) {
    if (isReplace) {
      await deleteCollectionBatched('tasks');
    }

    const tasks = backupData.tasks;
    const batch = writeBatch(db);
    tasks.forEach((t: TaskItem, index: number) => {
      const taskId = t.id || `task_${index + 1}`;
      const taskRef = doc(db, 'tasks', taskId);
      batch.set(taskRef, {
        id: taskId,
        title: t.title || 'Nhiệm vụ',
        order: t.order ?? index + 1,
        requiredCount: t.requiredCount ?? 1,
        isActive: t.isActive !== false,
        description: t.description || ''
      }, { merge: true });
      stats.tasks++;
    });
    await batch.commit();
  }

  // 4. KHÔI PHỤC CÀI ĐẶT HỆ THỐNG
  if (options.restoreSettings && backupData.settings && typeof backupData.settings === 'object') {
    const configRef = doc(db, 'settings', 'config');
    await setDoc(configRef, backupData.settings, { merge: true });
    stats.settings = true;
  }

  // 5. GHI NHẬT KÝ AUDIT LOG
  const details = `Khôi phục thành công: ${stats.students} học sinh, ${stats.schedules} ca trực, ${stats.tasks} nhiệm vụ, Cài đặt: ${stats.settings ? 'Có' : 'Không'} (${isReplace ? 'Ghi đè sạch' : 'Gộp bổ sung'})`;
  await logAction('Restore Data', details);

  return {
    success: true,
    message: details,
    stats
  };
}
