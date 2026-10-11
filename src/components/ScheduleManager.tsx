import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { 
  Sparkles, Copy, Trash, X, Edit2, Camera, CheckCircle2, 
  ChevronLeft, ChevronRight, Save, UserCheck, Shield, Clock, 
  Users, ArrowRight, FileSpreadsheet, HardDrive, Download 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { exportToCsv } from '../utils/csv';
import { 
  generateSchedule, 
  updateSchedule, 
  deleteSchedule, 
  completeSchedule 
} from '../api';
import { 
  subscribeSchedules, 
  subscribeStudents, 
  subscribeTasks, 
  subscribeSettings,
  ScheduleItem, 
  TaskItem, 
  AppSettings,
  DEFAULT_TASKS,
  DEFAULT_APP_SETTINGS 
} from '../services/firestoreService';
import { uploadPhotoToFirebaseStorage } from '../firebase';
import { uploadImageToGoogleDriveViaAppsScript } from '../utils/googleSheetsScript';
import GoogleSheetSyncModal from './GoogleSheetSyncModal';
import { clsx } from 'clsx';

export default function ScheduleManager() {
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [taskContent, setTaskContent] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>(DEFAULT_TASKS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);
  
  // Date context (current week)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [copyMsg, setCopyMsg] = useState('');
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  
  // Modal chỉnh sửa ca trực (LPLĐ & Admin)
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [editStudentId, setEditStudentId] = useState('');
  const [editAssignedTask, setEditAssignedTask] = useState('');
  const [customTaskInput, setCustomTaskInput] = useState('');
  const [isCustomTask, setIsCustomTask] = useState(false);

  const [viewingPhoto, setViewingPhoto] = useState<{urls: string[], time: number | null, index: number} | null>(null);
  const userRole = localStorage.getItem("userRole") || 'Guest';

  // Generation Modal State
  const daysOfCurrentWeek = Array.from({ length: 6 }).map((_, i) => addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i));
  const [showGenModal, setShowGenModal] = useState(false);
  const [genStartDate, setGenStartDate] = useState(format(daysOfCurrentWeek[0], 'yyyy-MM-dd'));
  const [genEndDate, setGenEndDate] = useState(format(daysOfCurrentWeek[daysOfCurrentWeek.length - 1], 'yyyy-MM-dd'));
  const [genSelectedDates, setGenSelectedDates] = useState<string[]>([]);
  const [allDatesInRange, setAllDatesInRange] = useState<string[]>([]);
  const [studentsPerDay, setStudentsPerDay] = useState(3);

  // 1. Lắng nghe dữ liệu thời gian thực từ Firestore (Real-time sync)
  useEffect(() => {
    let schedLoaded = false;
    let studLoaded = false;

    const unsubSched = subscribeSchedules((data) => {
      setSchedules(data);
      schedLoaded = true;
      if (studLoaded) setLoading(false);
    });

    const unsubStud = subscribeStudents((data) => {
      setStudents(data);
      studLoaded = true;
      if (schedLoaded) setLoading(false);
    });

    const unsubTasks = subscribeTasks((data) => {
      if (data && data.length > 0) setTasks(data);
    });

    const unsubSettings = subscribeSettings((data) => {
      if (data) setSettings(data);
    });

    return () => {
      unsubSched();
      unsubStud();
      unsubTasks();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (!showGenModal) return;
    const start = new Date(genStartDate);
    const end = new Date(genEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      setAllDatesInRange([]);
      setGenSelectedDates([]);
      return;
    }
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(format(d, 'yyyy-MM-dd'));
    }
    setAllDatesInRange(dates);
    setGenSelectedDates(dates.filter(d => new Date(d).getDay() !== 0));
  }, [genStartDate, genEndDate, showGenModal]);

  const toggleGenDate = (dStr: string) => {
    setGenSelectedDates(prev => prev.includes(dStr) ? prev.filter(x => x !== dStr) : [...prev, dStr].sort());
  };

  // Nén ảnh bằng Canvas trước khi tải lên
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_SIZE = 900;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Upload ảnh: Ưu tiên tải thẳng lên Google Drive qua Apps Script (không giới hạn), dự phòng qua Firebase Storage
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    for (const f of files) {
      if (f.size > 8 * 1024 * 1024) {
        setErrorMsg('Kích thước mỗi ảnh phải nhỏ hơn 8MB');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const compressedDataUrls = await Promise.all(files.map(f => compressImage(f)));

      const scriptUrl = settings.sheetConfig?.appsScriptImageUrl?.trim();
      const driveFolderId = settings.sheetConfig?.driveFolderId?.trim();

      const uploadedUrls = await Promise.all(compressedDataUrls.map(async (dataUrl, i) => {
        // 1. Thử tải lên Google Drive của lớp
        if (scriptUrl) {
          try {
            const driveUrl = await uploadImageToGoogleDriveViaAppsScript(
              dataUrl,
              scriptUrl,
              driveFolderId,
              `trucnhat_${Date.now()}_${i + 1}.jpg`
            );
            if (driveUrl && (driveUrl.startsWith('http://') || driveUrl.startsWith('https://'))) {
              return driveUrl;
            }
          } catch (driveErr) {
            console.warn('Google Drive Apps Script notice, fallback to Firebase Storage:', driveErr);
          }
        }

        // 2. Dự phòng: Tải lên Firebase Storage
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const storageUrl = await uploadPhotoToFirebaseStorage(blob, `report_${Date.now()}_${i}`);
          if (storageUrl && (storageUrl.startsWith('http://') || storageUrl.startsWith('https://'))) {
            return storageUrl;
          }
        } catch (storageErr) {
          console.warn('Firebase storage notice:', storageErr);
        }

        // Tuyệt đối không fallback về Base64 để tránh lỗi Firestore 1MB Document Limit
        throw new Error(`Ảnh số ${i + 1} không thể tải lên Google Drive hoặc Firebase Storage. Vui lòng kiểm tra lại.`);
      }));

      setPhotoUrls(prev => [...prev, ...uploadedUrls].slice(0, 5));
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi nén và tải ảnh lên đám mây.');
    } finally {
      setIsSubmitting(false);
      if (e.target) e.target.value = '';
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitCompletion = async () => {
    if (!taskContent.trim()) {
      setErrorMsg('Vui lòng chọn hoặc nhập nội dung công việc');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const targetStudent = students.find(s => s.id === selectedSchedule?.studentId);

      // Đảm bảo chỉ gửi các URL ngắn đã tải lên đám mây, loại bỏ hoàn toàn Base64
      const cleanUrls = photoUrls.filter(
        p => typeof p === 'string' && (p.startsWith('http://') || p.startsWith('https://')) && !p.startsWith('data:')
      );

      await completeSchedule(selectedSchedule.id, taskContent, cleanUrls, targetStudent?.name);
      
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });

      setSuccessMsg('Đã ghi nhận hoàn thành trực nhật thành công!');
      setTimeout(() => setSuccessMsg(''), 3000);
      setSelectedSchedule(null);
      setTaskContent('');
      setPhotoUrls([]);
    } catch (err: any) {
      setErrorMsg('Lỗi khi gửi báo cáo: ' + (err.message || 'Vui lòng thử lại.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 6 }).map((_, i) => addDays(start, i)); // Mon to Sat
  };

  const days = getWeekDays();

  const handleAutoGenerate = async () => {
    if (genSelectedDates.length === 0) return;
    await generateSchedule(genSelectedDates, studentsPerDay);
    setShowGenModal(false);
  };

  const copyToZalo = () => {
    let text = `📅 Lịch Trực Nhật Tuần ${format(days[0], 'dd/MM')} - ${format(days[days.length - 1], 'dd/MM')}\n\n`;
    
    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayName = format(day, 'EEEE');
      const vnDayMap: Record<string, string> = {
        'Monday': 'Thứ 2', 'Tuesday': 'Thứ 3', 'Wednesday': 'Thứ 4',
        'Thursday': 'Thứ 5', 'Friday': 'Thứ 6', 'Saturday': 'Thứ 7'
      };
      
      const dailySchedules = schedules.filter(s => s.date === dateStr);
      text += `📍 ${vnDayMap[dayName]} (${format(day, 'dd/MM')}): `;
      if (dailySchedules.length === 0) {
        text += `Chưa phân công\n`;
      } else {
        const studentNames = dailySchedules.map(s => {
          const st = students.find(x => x.id === s.studentId);
          return `${st?.name || 'HS'} (${s.assignedTask ? s.assignedTask.split('+')[0].trim() : 'Trực nhật'})`;
        }).join(', ');
        text += `${studentNames}\n`;
      }
    });

    navigator.clipboard.writeText(text);
    setCopyMsg('Đã sao chép lịch trực dạng text!');
    setTimeout(() => setCopyMsg(''), 3000);
  };

  const exportScheduleCsv = () => {
    if (schedules.length === 0) {
      alert('Chưa có dữ liệu lịch trực để xuất file.');
      return;
    }

    const dayNameMap: Record<number, string> = {
      0: 'Chủ Nhật', 1: 'Thứ Hai', 2: 'Thứ Ba', 3: 'Thứ Tư', 4: 'Thứ Năm', 5: 'Thứ Sáu', 6: 'Thứ Bảy'
    };

    const headers = [
      'STT', 
      'Ngày trực', 
      'Thứ', 
      'Họ và tên học sinh', 
      'Nhiệm vụ phân công', 
      'Trạng thái', 
      'Nội dung hoàn thành', 
      'Thời gian hoàn thành', 
      'Người thực hiện / Sửa đổi', 
      'Ghi chú chỉnh sửa'
    ];

    const sorted = [...schedules].sort((a, b) => a.date.localeCompare(b.date));

    const rows = sorted.map((s, index) => {
      const student = students.find(st => st.id === s.studentId);
      const studentName = student ? student.name : (s.studentId || 'Chưa rõ');
      const d = new Date(s.date);
      const dayName = !isNaN(d.getTime()) ? dayNameMap[d.getDay()] : '';
      const statusText = s.status === 'completed' ? 'Đã hoàn thành' : 'Chờ trực';
      const completedTimeText = s.completedAt ? new Date(s.completedAt).toLocaleString('vi-VN') : '';

      return [
        index + 1,
        s.date,
        dayName,
        studentName,
        s.assignedTask || '',
        statusText,
        s.taskContent || '',
        completedTimeText,
        s.editedBy || s.completedBy || '',
        s.editNote || (s.isEditedByLPLD ? 'LPLĐ sửa' : '')
      ];
    });

    const filename = `Lich_Truc_Nhat_${settings.className || '10A13'}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    exportToCsv(filename, headers, rows);
  };

  // Mở modal sửa ca trực
  const openEditModal = (schedule: ScheduleItem) => {
    setEditingSchedule(schedule);
    setEditStudentId(schedule.studentId);
    
    const currentTask = schedule.assignedTask || tasks[0]?.title || '';
    const isPredefined = tasks.some(t => t.title === currentTask);
    
    if (isPredefined) {
      setEditAssignedTask(currentTask);
      setIsCustomTask(false);
      setCustomTaskInput('');
    } else {
      setEditAssignedTask('__custom__');
      setIsCustomTask(true);
      setCustomTaskInput(currentTask);
    }
  };

  // Lưu chỉnh sửa ca trực (LPLĐ & Admin)
  const saveScheduleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule || !editStudentId) return;

    const finalTask = isCustomTask ? customTaskInput.trim() : editAssignedTask;
    if (!finalTask) {
      alert('Vui lòng chọn hoặc nhập nội dung công việc!');
      return;
    }

    try {
      const selectedStudent = students.find(s => s.id === editStudentId);
      await updateSchedule(editingSchedule.id, {
        studentId: editStudentId,
        studentName: selectedStudent?.name || '',
        assignedTask: finalTask,
        date: editingSchedule.date
      });
      setEditingSchedule(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật ca trực');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Bảng Phân Công Trực Nhật</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Đồng bộ Real-time"></span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tuần từ {format(days[0], 'dd/MM/yyyy')} đến {format(days[days.length - 1], 'dd/MM/yyyy')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Nút Đồng bộ Google Sheets */}
          <button
            onClick={() => setIsSheetModalOpen(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Đồng bộ lịch trực sang Google Sheets & Drive"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>GOOGLE SHEETS & DRIVE</span>
          </button>

          {userRole === 'Admin' && (
            <button
              onClick={() => setShowGenModal(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>TẠO LỊCH TỰ ĐỘNG</span>
            </button>
          )}

          <button
            onClick={copyToZalo}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>COPY LỊCH GỬI ZALO</span>
          </button>

          <button
            onClick={exportScheduleCsv}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Xuất lịch trực ra file CSV chuẩn UTF-8 (mở Excel hiển thị tiếng Việt không bị vỡ font)"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>XUẤT FILE CSV</span>
          </button>
        </div>
      </div>

      {copyMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl animate-in fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{copyMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl animate-in fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <button
          onClick={() => setCurrentDate(addDays(currentDate, -7))}
          className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>TUẦN TRƯỚC</span>
        </button>

        <span className="font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-3.5 py-1 rounded-full uppercase tracking-wider">
          TUẦN {format(days[0], 'dd/MM')} - {format(days[days.length - 1], 'dd/MM/yyyy')}
        </span>

        <button
          onClick={() => setCurrentDate(addDays(currentDate, 7))}
          className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>TUẦN SAU</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid lịch trực trong tuần (Thứ 2 đến Thứ 7) */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
          Đang đồng bộ dữ liệu thời gian thực...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {days.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const daySchedules = schedules.filter(s => s.date === dateStr);
            const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
            const vnDayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

            return (
              <div 
                key={dateStr}
                className={clsx(
                  "bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between transition-all",
                  isToday ? "border-l-4 border-l-indigo-600 border-slate-200" : "border-slate-200"
                )}
              >
                <div>
                  <div className="flex justify-between items-center text-[11px] font-bold uppercase mb-3">
                    <span className={isToday ? "text-indigo-600" : "text-slate-600"}>
                      {vnDayNames[idx]} {isToday && '(HÔM NAY)'}
                    </span>
                    <span className="text-slate-400 font-mono">{format(day, 'dd/MM')}</span>
                  </div>

                  <div className="space-y-2.5 min-h-[90px]">
                    {daySchedules.length === 0 ? (
                      <div className="p-3 bg-slate-50 rounded-lg text-[11px] border border-slate-100 italic text-slate-400 text-center">
                        Chưa phân công ca trực
                      </div>
                    ) : (
                      daySchedules.map((schedule) => {
                        const student = students.find(s => s.id === schedule.studentId);
                        const isDone = schedule.status === 'completed';

                        return (
                          <div
                            key={schedule.id}
                            className={clsx(
                              "p-3 rounded-lg text-xs border transition-all",
                              isDone 
                                ? "bg-emerald-50/70 border-emerald-200 text-emerald-950" 
                                : "bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-bold text-slate-900 truncate text-[13px]">
                                  {student?.name || 'Học sinh chưa rõ'}
                                </span>
                                
                                {schedule.assignedTask && (
                                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5 line-clamp-2" title={schedule.assignedTask}>
                                    {schedule.assignedTask}
                                  </span>
                                )}

                                {/* GHI CHÚ CHỮ NHỎ, IN NGHIÊNG TỪ LPLĐ */}
                                {schedule.isEditedByLPLD && (
                                  <span className="text-[10px] text-amber-700 italic block mt-1 font-normal">
                                    ✏️ Đã chỉnh sửa bởi LPLĐ
                                  </span>
                                )}
                              </div>

                              {/* Nút hành động */}
                              <div className="flex items-center gap-1 shrink-0">
                                {isDone ? (
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] ml-1" title="Đã hoàn thành"></span>
                                ) : (
                                  <div className="flex items-center">
                                    {/* Nút Chỉnh sửa (cây bút) - Cả GVCN và LPLĐ đều có quyền */}
                                    <button
                                      onClick={() => openEditModal(schedule)}
                                      className="p-1 text-indigo-600 hover:bg-indigo-100 rounded transition-colors cursor-pointer mr-0.5"
                                      title="Chỉnh sửa ca trực (Đổi người / Đổi công việc)"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Nút Xóa (thùng rác) - CHỈ DUY NHẤT ADMIN MỚI CÓ QUYỀN. LPLĐ hoàn toàn bị ẩn */}
                                    {userRole === 'Admin' && (
                                      <button
                                        onClick={() => {
                                          if (confirm(`Xóa ca trực của bạn "${student?.name || 'HS'}"?`)) {
                                            deleteSchedule(schedule.id);
                                          }
                                        }}
                                        className="p-1 text-rose-500 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                                        title="Xóa phân công này (Chỉ GVCN)"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Dòng trạng thái & Báo cáo */}
                            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                              {isDone ? (
                                <span className="font-bold text-emerald-700 uppercase flex items-center gap-1 truncate">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span className="truncate">{schedule.taskContent || 'Đã hoàn thành'}</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedSchedule({ ...schedule, studentName: student?.name });
                                    setTaskContent(schedule.assignedTask || tasks[0]?.title || '');
                                  }}
                                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold transition-colors cursor-pointer"
                                >
                                  BÁO CÁO XONG
                                </button>
                              )}

                              {(schedule.photos || schedule.photoBase64) && (
                                <button
                                  onClick={() => setViewingPhoto({
                                    urls: schedule.photos || [schedule.photoBase64],
                                    time: schedule.completedAt || null,
                                    index: 0
                                  })}
                                  className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-bold transition-colors cursor-pointer ml-auto"
                                >
                                  ẢNH ({schedule.photos ? schedule.photos.length : 1})
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CHỈNH SỬA CA TRỰC (DÀNH CHO LPLĐ & ADMIN) */}
      {editingSchedule && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                  userRole === 'Manager' ? 'bg-emerald-600' : 'bg-indigo-600'
                }`}>
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Chỉnh Sửa Ca Trực</h3>
                  <span className="text-[10px] text-slate-500">
                    {userRole === 'Manager' ? 'Quyền Lớp Phó Lao Động (LPLĐ)' : 'Quyền Giáo Viên Chủ Nhiệm (Admin)'}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setEditingSchedule(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thông báo phân quyền */}
            {userRole === 'Manager' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  <span>Quy định Lớp Phó Lao Động:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Sau khi lưu, ca trực sẽ tự động hiển thị dòng chữ: <em>"✏️ Đã chỉnh sửa bởi LPLĐ"</em> (in nghiêng) để giáo viên và cả lớp dễ dàng đối soát.
                </p>
              </div>
            )}

            <form onSubmit={saveScheduleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Chọn học sinh trực nhật <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={editStudentId}
                  onChange={(e) => setEditStudentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white outline-none focus:border-indigo-500"
                >
                  <option value="">-- Chọn học sinh --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nhiệm vụ phân công <span className="text-rose-500">*</span>
                </label>
                <select
                  value={isCustomTask ? '__custom__' : editAssignedTask}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomTask(true);
                    } else {
                      setIsCustomTask(false);
                      setEditAssignedTask(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white outline-none focus:border-indigo-500 mb-2"
                >
                  {tasks.map(t => (
                    <option key={t.id} value={t.title}>{t.title} ({t.requiredCount} người)</option>
                  ))}
                  <option value="__custom__">-- Nhập nhiệm vụ khác tùy chỉnh --</option>
                </select>

                {isCustomTask && (
                  <input
                    type="text"
                    required
                    value={customTaskInput}
                    onChange={(e) => setCustomTaskInput(e.target.value)}
                    placeholder="Nhập nội dung công việc cụ thể..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSchedule(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  HỦY
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>LƯU THAY ĐỔI</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Báo Cáo Trực Nhật */}
      {selectedSchedule && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div>
              <h3 className="text-base font-bold text-slate-900">Báo cáo trực nhật</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Xác nhận hoàn thành cho: <strong>{selectedSchedule.studentName}</strong>
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-lg">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nội dung công việc
              </label>
              <select
                value={taskContent}
                onChange={(e) => setTaskContent(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 outline-none focus:border-indigo-500"
              >
                {tasks.map(t => (
                  <option key={t.id} value={t.title}>{t.title}</option>
                ))}
              </select>
            </div>

            {/* Tải ảnh lên */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  Ảnh minh chứng (Tối đa 5 ảnh)
                </label>
                {settings.sheetConfig?.appsScriptImageUrl && (
                  <span className="text-[10px] text-teal-700 font-semibold flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-teal-600" />
                    <span>Google Drive</span>
                  </span>
                )}
              </div>

              {photoUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {photoUrls.map((p, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group">
                      <img src={p} alt="Minh chứng" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setPhotoUrls(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-0 right-0 bg-rose-600 text-white p-1 rounded-bl"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photoUrls.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl text-slate-600 hover:text-indigo-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Chụp hoặc tải ảnh lên</span>
                </button>
              )}

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedSchedule(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                HỦY
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={submitCompletion}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
              >
                {isSubmitting ? 'ĐANG GỬI...' : 'GỬI BÁO CÁO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo Lịch Tự Động */}
      {showGenModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Tạo Lịch Tự Động</h3>
              <button onClick={() => setShowGenModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-4 text-[11px] text-indigo-900 leading-relaxed">
              <span className="font-bold block mb-0.5">⚖️ Thuật toán bù trừ công bằng:</span>
              Tự động chọn các bạn có tổng số lần trực ít nhất. Đối soát lịch sử để luân chuyển công việc theo các nhiệm vụ đã cấu hình.
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Từ ngày</label>
                <input 
                  type="date" 
                  value={genStartDate} 
                  onChange={e => setGenStartDate(e.target.value)} 
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 outline-none" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Đến ngày</label>
                <input 
                  type="date" 
                  value={genEndDate} 
                  onChange={e => setGenEndDate(e.target.value)} 
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 outline-none" 
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Số HS mỗi ngày</label>
              <input 
                type="number" 
                min="1" 
                max="10" 
                value={studentsPerDay} 
                onChange={e => setStudentsPerDay(Number(e.target.value))} 
                className="w-full text-xs border border-slate-300 rounded-lg p-2 outline-none font-bold" 
              />
            </div>

            <div className="mb-5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Chọn các ngày phân công</label>
              <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2 grid grid-cols-2 gap-2">
                {allDatesInRange.map(dStr => {
                  const isSelected = genSelectedDates.includes(dStr);
                  const dayName = format(new Date(dStr), 'EEEE');
                  const vnDayMap: Record<string, string> = { 'Monday': 'T2', 'Tuesday': 'T3', 'Wednesday': 'T4', 'Thursday': 'T5', 'Friday': 'T6', 'Saturday': 'T7', 'Sunday': 'CN' };
                  return (
                    <label key={dStr} className="flex items-center space-x-2 text-xs cursor-pointer bg-white p-2 border border-slate-200 rounded-lg">
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => toggleGenDate(dStr)} 
                        className="rounded text-indigo-600" 
                      />
                      <span className="font-medium text-slate-700">{vnDayMap[dayName]} - {format(new Date(dStr), 'dd/MM')}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button 
                onClick={() => setShowGenModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                HỦY
              </button>
              <button 
                onClick={handleAutoGenerate}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                TẠO LỊCH NGAY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem ảnh phóng to */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={() => setViewingPhoto(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewingPhoto(null)} className="absolute -top-10 right-0 text-white font-bold p-2 hover:text-gray-300 cursor-pointer">ĐÓNG [X]</button>
            <img src={viewingPhoto.urls[viewingPhoto.index]} alt="Xác thực" className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl" />
            
            {viewingPhoto.urls.length > 1 && (
              <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-4">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingPhoto(prev => prev ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length } : null);
                  }}
                  className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingPhoto(prev => prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : null);
                  }}
                  className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}
            
            <div className="absolute bottom-4 flex flex-col items-center gap-2">
              {viewingPhoto.urls.length > 1 && (
                <div className="bg-black/60 text-white text-xs px-3 py-1 rounded-full font-mono">
                  {viewingPhoto.index + 1} / {viewingPhoto.urls.length}
                </div>
              )}
              {viewingPhoto.time && (
                <div className="bg-black/70 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-mono border border-white/10">
                  {format(new Date(viewingPhoto.time), 'dd/MM/yyyy HH:mm:ss')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Đồng Bộ Google Sheets & Lưu Trữ Drive */}
      <GoogleSheetSyncModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        settings={settings}
        schedules={schedules}
        students={students}
        tasks={tasks}
      />
    </div>
  );
}
