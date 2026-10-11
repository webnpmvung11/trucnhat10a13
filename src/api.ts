import { 
  collection, getDocs, doc, setDoc, 
  updateDoc, deleteDoc, addDoc, getDoc, writeBatch 
} from 'firebase/firestore';
import { db } from './firebase';
import { logAction, TaskItem, DEFAULT_TASKS } from './services/firestoreService';

// Helpers
export const getRole = () => localStorage.getItem('userRole') || 'Guest';
export const getName = () => localStorage.getItem('userName') || 'Khách';
export const getEmail = () => localStorage.getItem('userEmail') || '';

export type BatchOperation =
  | { type: 'set'; ref: any; data: any; options?: any }
  | { type: 'update'; ref: any; data: any }
  | { type: 'delete'; ref: any };

/**
 * Hàm trợ giúp chia nhỏ danh sách thao tác thành từng nhóm (Chunk) tối đa 400 operations
 * per batch để commit an toàn, khắc phục triệt để giới hạn 500 ops limit của Firestore.
 */
export async function commitInChunks(operations: BatchOperation[], chunkSize: number = 400): Promise<void> {
  if (!operations || operations.length === 0) return;

  for (let i = 0; i < operations.length; i += chunkSize) {
    const chunk = operations.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.type === 'set') {
        if (op.options) {
          batch.set(op.ref, op.data, op.options);
        } else {
          batch.set(op.ref, op.data);
        }
      } else if (op.type === 'update') {
        batch.update(op.ref, op.data);
      } else if (op.type === 'delete') {
        batch.delete(op.ref);
      }
    }
    await batch.commit();
  }
}

export async function fetchStudents(): Promise<any[]> {
  const snap = await getDocs(collection(db, 'students'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addStudents(names: string[]) {
  const operations: BatchOperation[] = [];
  const newStudents = [];
  for (const name of names) {
    const ref = doc(collection(db, 'students'));
    const data = { name, lastCleaned: null };
    operations.push({ type: 'set', ref, data });
    newStudents.push({ id: ref.id, ...data });
  }
  await commitInChunks(operations, 400);
  await logAction('Add Student', `Thêm ${names.length} học sinh mới vào danh sách lớp`);
  return newStudents;
}

export async function updateStudent(id: string, name: string) {
  const ref = doc(db, 'students', id);
  await updateDoc(ref, { name });
  await logAction('Update Student', `Sửa tên học sinh thành "${name}"`);
  return { id, name };
}

export async function deleteStudent(id: string) {
  if (getRole() !== 'Admin') {
    throw new Error('Chỉ Giáo viên chủ nhiệm mới có quyền xóa học sinh khỏi danh sách lớp!');
  }
  const scheds = await getDocs(collection(db, 'schedules'));
  const operations: BatchOperation[] = [
    { type: 'delete', ref: doc(db, 'students', id) }
  ];
  scheds.docs.forEach(d => {
    if (d.data().studentId === id) {
      operations.push({ type: 'delete', ref: d.ref });
    }
  });
  await commitInChunks(operations, 400);
  await logAction('Delete Student', `Xóa học sinh khỏi danh sách lớp`);
  return { success: true };
}

export async function fetchSchedules(): Promise<any[]> {
  const snap = await getDocs(collection(db, 'schedules'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchTasks(): Promise<TaskItem[]> {
  try {
    const snap = await getDocs(collection(db, 'tasks'));
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskItem));
      return list.sort((a, b) => (a.order || 0) - (b.order || 0)).filter(t => t.isActive !== false);
    }
  } catch (e) {
    console.warn('Fetch tasks fallback to default', e);
  }
  return DEFAULT_TASKS;
}

/**
 * Thuật toán bù trừ công bằng (Ưu tiên người trực ít nhất & Luân chuyển công việc 1 và 2)
 */
export async function generateSchedule(dates: string[], studentsPerDay: number = 3) {
  const students = await fetchStudents();
  if (students.length === 0) throw new Error('Danh sách học sinh trống. Vui lòng thêm học sinh trước.');
  
  const schedules = await fetchSchedules();
  const keptSchedules = schedules.filter(s => !dates.includes(s.date));
  
  // Lấy danh sách nhiệm vụ đang kích hoạt
  const activeTasks = await fetchTasks();
  const task1 = activeTasks[0]?.title || 'Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)';
  const task2 = activeTasks[1]?.title || 'Giặt khăn, Lau bảng, bàn GV + Tắt đèn, quạt + Khóa cửa';

  const isTask2 = (task?: string) => {
    if (!task) return false;
    const t = task.toLowerCase();
    return t.includes('giặt khăn') || t.includes('lau bảng') || t.includes('bàn gv') || t.includes('khóa cửa') || t === task2.toLowerCase();
  };

  const isTask1 = (task?: string) => {
    if (!task) return false;
    const t = task.toLowerCase();
    return t.includes('quét lớp') || t.includes('đổ rác') || t.includes('túi rác') || t === task1.toLowerCase();
  };

  // Thống kê lịch sử trực và công việc của từng học sinh
  const dutyCounts: Record<string, number> = {};
  const task1Counts: Record<string, number> = {};
  const task2Counts: Record<string, number> = {};
  const lastCleanedMap: Record<string, number | null> = {};

  students.forEach(s => {
    dutyCounts[s.id] = 0;
    task1Counts[s.id] = 0;
    task2Counts[s.id] = 0;
    lastCleanedMap[s.id] = s.lastCleaned || null;
  });

  keptSchedules.forEach(s => {
    if (dutyCounts[s.studentId] !== undefined) {
      dutyCounts[s.studentId]++;
      
      const sTime = new Date(s.date).getTime();
      if (!lastCleanedMap[s.studentId] || sTime > (lastCleanedMap[s.studentId] as number)) {
        lastCleanedMap[s.studentId] = sTime;
      }
    }

    const taskText = s.assignedTask || s.taskContent || '';
    if (isTask2(taskText)) {
      if (task2Counts[s.studentId] !== undefined) task2Counts[s.studentId]++;
    } else if (isTask1(taskText)) {
      if (task1Counts[s.studentId] !== undefined) task1Counts[s.studentId]++;
    }
  });

  const operations: BatchOperation[] = [];
  let newCount = 0;
  const assignmentsList: string[] = [];

  const sortedDates = [...dates].sort();
  const targetPerDay = studentsPerDay || 3;

  for (const date of sortedDates) {
    // 1. Sắp xếp toàn bộ học sinh theo tổng số lần đã trực (từ thấp đến cao)
    const sortedStudents = [...students].sort((a, b) => {
      const countA = dutyCounts[a.id] || 0;
      const countB = dutyCounts[b.id] || 0;
      if (countA !== countB) return countA - countB;
      
      const timeA = lastCleanedMap[a.id];
      const timeB = lastCleanedMap[b.id];
      if (timeA === null && timeB === null) return 0;
      if (timeA === null) return -1;
      if (timeB === null) return 1;
      if (timeA !== timeB) return timeA - timeB;

      return a.name.localeCompare(b.name, 'vi');
    });

    // 2. Bốc các bạn có số lần trực thấp nhất để gán vào ngày đó (mặc định 3 bạn)
    const k = Math.min(targetPerDay, sortedStudents.length);
    const pickedStudents = sortedStudents.slice(0, k);

    // 3. Phân công công việc:
    // Ai làm Công việc 2 nhiều rồi thì chuyển sang Công việc 1, và ngược lại
    const numTask2 = k >= 2 ? (activeTasks[1]?.requiredCount || 1) : 0;

    const sortedByTask2 = [...pickedStudents].sort((a, b) => {
      const t2A = task2Counts[a.id] || 0;
      const t2B = task2Counts[b.id] || 0;
      if (t2A !== t2B) return t2A - t2B; // Người ít làm CV2 nhất lên đầu để nhận CV2

      const t1A = task1Counts[a.id] || 0;
      const t1B = task1Counts[b.id] || 0;
      if (t1A !== t1B) return t1B - t1A; // Đã làm CV1 nhiều hơn thì ưu tiên giao CV2

      return 0;
    });

    const task2Assigned = sortedByTask2.slice(0, numTask2); // Nhận Công việc 2
    const task1Assigned = sortedByTask2.slice(numTask2);    // Nhận Công việc 1

    const dateTime = new Date(date).getTime();

    // Gán Công việc 1
    for (const student of task1Assigned) {
      const newRef = doc(collection(db, 'schedules'));
      operations.push({
        type: 'set',
        ref: newRef,
        data: {
          date,
          studentId: student.id,
          status: 'pending',
          assignedTask: task1
        }
      });
      dutyCounts[student.id] = (dutyCounts[student.id] || 0) + 1;
      task1Counts[student.id] = (task1Counts[student.id] || 0) + 1;
      lastCleanedMap[student.id] = dateTime;
      assignmentsList.push(`${student.name} - ${task1} (${date})`);
      newCount++;
    }

    // Gán Công việc 2
    for (const student of task2Assigned) {
      const newRef = doc(collection(db, 'schedules'));
      operations.push({
        type: 'set',
        ref: newRef,
        data: {
          date,
          studentId: student.id,
          status: 'pending',
          assignedTask: task2
        }
      });
      dutyCounts[student.id] = (dutyCounts[student.id] || 0) + 1;
      task2Counts[student.id] = (task2Counts[student.id] || 0) + 1;
      lastCleanedMap[student.id] = dateTime;
      assignmentsList.push(`${student.name} - ${task2} (${date})`);
      newCount++;
    }
  }

  // Xóa lịch cũ của các ngày này để tránh trùng lặp
  schedules.forEach(s => {
    if (dates.includes(s.date)) {
      operations.push({
        type: 'delete',
        ref: doc(db, 'schedules', s.id)
      });
    }
  });

  // Cập nhật lastCleaned cho học sinh
  students.forEach(s => {
    if (lastCleanedMap[s.id] !== s.lastCleaned) {
      operations.push({
        type: 'update',
        ref: doc(db, 'students', s.id),
        data: { lastCleaned: lastCleanedMap[s.id] }
      });
    }
  });

  // Commit an toàn theo từng chunk tối đa 400 operations để không vượt giới hạn 500 của Firestore
  await commitInChunks(operations, 400);

  // Bổ sung chi tiết: tên học sinh trước mỗi nhiệm vụ
  const summaryDetail = assignmentsList.length <= 8
    ? assignmentsList.join('; ')
    : `${assignmentsList.slice(0, 8).join('; ')}... (tổng cộng ${newCount} ca trực)`;

  await logAction(
    'Generate Schedule', 
    `Tạo lịch tự động cho ${dates.length} ngày (${newCount} ca): ${summaryDetail}`
  );
  return { success: true, count: newCount };
}

/**
 * Chỉnh sửa phân công ca trực:
 * Lớp phó lao động (LPLĐ) có quyền chỉnh sửa, nhưng tự động ghi nhận metadata để hiển thị chữ nhỏ in nghiêng!
 */
export async function updateSchedule(id: string, updates: any) {
  const currentRole = getRole();
  const currentName = getName();
  
  const payload: any = {
    ...updates,
    lastEditedAt: Date.now()
  };

  if (currentRole === 'Manager') {
    payload.isEditedByLPLD = true;
    payload.editedBy = currentName ? `LPLĐ (${currentName})` : 'Lớp phó lao động';
    payload.editNote = updates.editNote || 'Thay đổi bởi LPLĐ';
  } else if (currentRole === 'Admin') {
    payload.editedBy = currentName ? `GVCN (${currentName})` : 'Giáo viên chủ nhiệm';
  }

  await updateDoc(doc(db, 'schedules', id), payload);

  // Lấy tên học sinh để ghi log: tên học sinh trước mỗi nhiệm vụ
  let studentName = updates.studentName;
  if (!studentName && updates.studentId) {
    try {
      const stDoc = await getDoc(doc(db, 'students', updates.studentId));
      if (stDoc.exists()) {
        studentName = stDoc.data().name;
      }
    } catch {}
  }

  const studentPrefix = studentName ? `Học sinh: ${studentName} - ` : '';
  const taskPart = updates.assignedTask ? `nhiệm vụ "${updates.assignedTask}"` : '';

  await logAction(
    currentRole === 'Manager' ? 'LPLĐ Update Schedule' : 'Admin Update Schedule',
    `Chỉnh sửa lịch trực ca ngày ${updates.date || ''}: ${studentPrefix}${taskPart}`
  );
  return { success: true };
}

export async function completeSchedule(id: string, taskContent: string, photos?: string[], studentName?: string) {
  const currentRole = getRole();
  const currentName = getName();
  const data: any = {
    status: 'completed',
    taskContent,
    completedAt: Date.now(),
    completedBy: `[${currentRole}] ${currentName}`
  };

  // Ngăn chặn hoàn toàn việc lưu Base64 vào Firestore (khắc phục lỗi Firestore 1MB Document Limit)
  // Chỉ chấp nhận các đường dẫn URL ngắn (https:// hoặc http://) từ Cloud Storage hoặc Google Drive
  if (photos && photos.length > 0) {
    const validCloudUrls = photos.filter(
      p => typeof p === 'string' && (p.startsWith('https://') || p.startsWith('http://')) && !p.startsWith('data:')
    );
    if (validCloudUrls.length > 0) {
      data.photos = validCloudUrls;
    }
  }

  const operations: BatchOperation[] = [
    { type: 'update', ref: doc(db, 'schedules', id), data }
  ];

  // Lấy tên học sinh và cập nhật thời gian trực gần nhất cho học sinh
  let sName = studentName;
  try {
    const schedDoc = await getDoc(doc(db, 'schedules', id));
    if (schedDoc.exists()) {
      const schedData = schedDoc.data();
      const sId = schedData.studentId;
      if (sId) {
        operations.push({
          type: 'update',
          ref: doc(db, 'students', sId),
          data: { lastCleaned: Date.now() }
        });
        if (!sName) {
          const stDoc = await getDoc(doc(db, 'students', sId));
          if (stDoc.exists()) sName = stDoc.data().name;
        }
      }
    }
  } catch {}

  // Commit an toàn với commitInChunks
  await commitInChunks(operations, 400);

  // Bổ sung tên học sinh trước nhiệm vụ theo yêu cầu
  const detailText = sName 
    ? `Đánh dấu hoàn thành lịch trực: ${sName} - ${taskContent}`
    : `Đánh dấu hoàn thành lịch trực: ${taskContent}`;

  await logAction('Mark Complete', detailText);
  return { success: true };
}

/**
 * Xóa lịch trực: CHỈ DUY NHẤT ADMIN CÓ QUYỀN XÓA. LPLĐ tuyệt đối không có quyền xóa!
 */
export async function deleteSchedule(id: string) {
  const currentRole = getRole();
  if (currentRole !== 'Admin') {
    throw new Error('Bạn không có quyền thực hiện thao tác này! Chỉ Giáo viên chủ nhiệm mới có quyền xóa ca trực.');
  }

  let detail = 'Giáo viên chủ nhiệm xóa ca trực';
  try {
    const sDoc = await getDoc(doc(db, 'schedules', id));
    if (sDoc.exists()) {
      const sData = sDoc.data();
      let sName = '';
      if (sData.studentId) {
        const stDoc = await getDoc(doc(db, 'students', sData.studentId));
        if (stDoc.exists()) sName = stDoc.data().name;
      }
      const sPrefix = sName ? `${sName} - ` : '';
      detail = `Giáo viên chủ nhiệm xóa ca trực ngày ${sData.date || ''}: ${sPrefix}nhiệm vụ "${sData.assignedTask || 'Trực nhật'}"`;
    }
  } catch {}

  await deleteDoc(doc(db, 'schedules', id));
  await logAction('Delete Schedule', detail);
  return { success: true };
}

export async function addSchedule(date: string, studentId: string, assignedTask?: string, studentName?: string) {
  const currentRole = getRole();
  const ref = doc(collection(db, 'schedules'));
  const task = assignedTask || 'Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)';
  const data: any = { 
    date, 
    studentId, 
    status: 'pending',
    assignedTask: task
  };
  if (currentRole === 'Manager') {
    data.isEditedByLPLD = true;
    data.editedBy = 'Lớp phó lao động';
  }
  await setDoc(ref, data);

  // Lấy tên học sinh để thêm trước nhiệm vụ
  let sName = studentName;
  if (!sName && studentId) {
    try {
      const stDoc = await getDoc(doc(db, 'students', studentId));
      if (stDoc.exists()) sName = stDoc.data().name;
    } catch {}
  }
  const sPrefix = sName ? `${sName} - ` : '';

  await logAction('Add Schedule', `Thêm ca trực ngày ${date}: ${sPrefix}nhiệm vụ "${task}"`);
  return { id: ref.id, ...data };
}

export async function resetAllData() {
  if (getRole() !== 'Admin') {
    throw new Error('Chỉ Giáo viên chủ nhiệm mới có quyền Reset toàn bộ dữ liệu!');
  }

  // Xóa an toàn theo batch tối đa 400 docs tránh vượt hạn mức 500 của Firestore
  const deleteBatchList = async (collName: string) => {
    const snap = await getDocs(collection(db, collName));
    const docs = snap.docs;
    const CHUNK_SIZE = 400;
    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  };

  await deleteBatchList('students');
  await deleteBatchList('schedules');
  await deleteBatchList('auditLogs');

  await logAction('Reset Data', 'Đã xoá toàn bộ dữ liệu (Học sinh, Lịch trực, Nhật ký)');
  return { success: true };
}

export async function fetchLogs() {
  const snap = await getDocs(collection(db, 'auditLogs'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.timestamp - a.timestamp);
}
