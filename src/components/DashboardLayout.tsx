import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  Users, CalendarDays, ClipboardList, LogOut, Link as LinkIcon, 
  Image as ImageIcon, ClipboardCheck, Shield, Clock, FileSpreadsheet, HardDrive, RotateCcw 
} from 'lucide-react';
import { clsx } from 'clsx';
import { signOutUser, auth } from '../firebase';
import { useAutoLogout } from '../hooks/useAutoLogout';
import { 
  subscribeSettings, 
  subscribeSchedules, 
  subscribeStudents, 
  subscribeTasks, 
  AppSettings, 
  ScheduleItem, 
  TaskItem, 
  DEFAULT_APP_SETTINGS 
} from '../services/firestoreService';
import GoogleSheetSyncModal from './GoogleSheetSyncModal';
import RestoreDataModal from './RestoreDataModal';
import { backupDataToGoogleDriveViaAppsScript } from '../utils/googleSheetsScript';
import { exportBackupData } from '../utils/backup';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = localStorage.getItem('userRole');
  const name = localStorage.getItem('userName') || 'Người dùng';
  const email = localStorage.getItem('userEmail') || '';

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  // Kích hoạt tính năng tự động logout sau thời gian không thao tác (mặc định 15 phút)
  useAutoLogout(settings.autoLogoutMinutes || 15);

  useEffect(() => {
    const unsubSet = subscribeSettings(setSettings);
    const unsubSched = subscribeSchedules(setSchedules);
    const unsubStud = subscribeStudents(setStudents);
    const unsubTask = subscribeTasks(setTasks);

    return () => {
      unsubSet();
      unsubSched();
      unsubStud();
      unsubTask();
    };
  }, []);

  // Tự động sao lưu ngầm (Auto-Backup) toàn bộ dữ liệu lên Google Drive mỗi ngày cho Admin
  const hasAttemptedDailyBackupRef = useRef(false);
  useEffect(() => {
    if (role !== 'Admin') return;
    const scriptUrl = settings.sheetConfig?.appsScriptImageUrl?.trim();
    if (!scriptUrl) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const lastBackup = localStorage.getItem('last_drive_backup_date');
    if (lastBackup === todayStr || hasAttemptedDailyBackupRef.current) return;
    hasAttemptedDailyBackupRef.current = true;

    const backupContent = exportBackupData(settings, students, schedules, tasks);
    backupDataToGoogleDriveViaAppsScript(backupContent, scriptUrl, settings.sheetConfig?.driveFolderId)
      .then(() => {
        localStorage.setItem('last_drive_backup_date', todayStr);
        console.log('[Auto-Backup] Tự động sao lưu lịch trực nhật lên Google Drive thành công.');
      })
      .catch((err) => console.warn('[Auto-Backup] Lỗi sao lưu ngầm Google Drive:', err));
  }, [role, settings, students, schedules, tasks]);

  // Redirect to login if not authenticated
  if (!role || role === 'Guest') {
    return <Navigate to="/" replace />;
  }

  const handleLogout = async () => {
    await signOutUser();
    localStorage.clear();
    navigate('/');
  };

  const navItems = [
    { path: '/dashboard/schedule', icon: CalendarDays, label: 'Lịch trực nhật' },
    { path: '/dashboard/students', icon: Users, label: 'Danh sách lớp' },
    { path: '/dashboard/photos', icon: ImageIcon, label: 'Thư viện ảnh' },
    ...(role === 'Admin' ? [
      { path: '/dashboard/tasks', icon: ClipboardCheck, label: 'Quản lý nhiệm vụ' },
      { path: '/dashboard/accounts', icon: Shield, label: 'Phân quyền Google' },
      { path: '/dashboard/logs', icon: ClipboardList, label: 'Nhật ký hệ thống' }
    ] : [])
  ];

  const currentUser = auth.currentUser;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col border-r border-slate-800">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>TRỰC NHẬT {settings.className || '10A13'}</span>
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Hệ thống phân công & báo cáo</p>
          </div>
          <div className="px-2 py-0.5 bg-indigo-950 text-indigo-300 text-[10px] font-mono font-bold rounded border border-indigo-800 flex items-center gap-1" title={`Bảo mật: Tự đăng xuất sau ${settings.autoLogoutMinutes || 15} phút không thao tác`}>
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>{settings.autoLogoutMinutes || 15}p</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-2 px-2 tracking-wider">
            Chức năng
          </div>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                "flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                location.pathname === item.path
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/80"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}

          {/* Nút mở đồng bộ Google Sheets & Drive */}
          <button
            type="button"
            onClick={() => setIsSheetModalOpen(true)}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer text-left"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Google Sheets & Drive</span>
          </button>

          {/* Nút Khôi phục dữ liệu cho Admin */}
          {role === 'Admin' && (
            <button
              type="button"
              onClick={() => setIsRestoreModalOpen(true)}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer text-left"
            >
              <RotateCcw className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Khôi phục dữ liệu</span>
            </button>
          )}
          
          <div className="pt-3 mt-3 border-t border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-500 mb-2 px-2 tracking-wider">
              Chia sẻ
            </div>
            <Link
              to="/public"
              target="_blank"
              className="flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-950/40 border border-indigo-900/60 hover:bg-indigo-900/60 transition-colors"
            >
              <LinkIcon className="w-4 h-4 shrink-0" />
              <span>Link Học Sinh (Public)</span>
            </Link>
          </div>
        </nav>

        {/* User Card */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center space-x-2.5 min-w-0">
              {currentUser?.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-white/20"
                />
              ) : (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  role === 'Admin' ? 'bg-purple-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {role === 'Admin' ? 'GV' : 'LP'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold truncate text-slate-200">{name}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {role === 'Admin' ? 'GV Chủ Nhiệm' : 'Lớp Phó Lao Động'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-4 sm:p-6 flex-1 space-y-6">
          <Outlet />
        </div>
      </main>

      {/* Modal Đồng Bộ Google Sheets & Lưu Trữ Google Drive */}
      <GoogleSheetSyncModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        settings={settings}
        schedules={schedules}
        students={students}
        tasks={tasks}
      />

      {/* Modal Khôi Phục Dữ Liệu Lớp Học */}
      <RestoreDataModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
      />
    </div>
  );
}
