import React, { useState, useEffect } from 'react';
import { 
  X, FileSpreadsheet, HardDrive, Copy, Check, ExternalLink, 
  RefreshCw, CheckCircle2, AlertCircle, Code, Sparkles, ChevronDown, 
  ChevronUp, FolderOpen, Save, Loader2, Download, RotateCcw 
} from 'lucide-react';
import { 
  AppSettings, 
  ScheduleItem, 
  TaskItem, 
  saveAppSettings 
} from '../services/firestoreService';
import { 
  APPS_SCRIPT_SHEETS_TEMPLATE, 
  backupDataToGoogleDriveViaAppsScript 
} from '../utils/googleSheetsScript';
import { exportBackupData } from '../utils/backup';
import RestoreDataModal from './RestoreDataModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  schedules: ScheduleItem[];
  students: any[];
  tasks?: TaskItem[];
}

export default function GoogleSheetSyncModal({
  isOpen,
  onClose,
  settings,
  schedules,
  students,
  tasks = []
}: Props) {
  const [activeTab, setActiveTab] = useState<'sheets' | 'drive'>('sheets');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(settings.sheetConfig?.spreadsheetUrl || '');
  const [appsScriptUrl, setAppsScriptUrl] = useState(settings.sheetConfig?.appsScriptUrl || '');
  const [appsScriptImageUrl, setAppsScriptImageUrl] = useState(settings.sheetConfig?.appsScriptImageUrl || 'https://script.google.com/macros/s/AKfycbwknpHei6xEU81OAS51eNhoR78f8dF6LkGosc6Xw7xMcnrAIKHGcxnZSinfY3YrlpnO/exec');
  const [driveFolderId, setDriveFolderId] = useState(settings.sheetConfig?.driveFolderId || '1d1YTxkOFluqzRzq9gBLMT1_yCBBdrld4');

  const [copiedCode, setCopiedCode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSpreadsheetUrl(settings.sheetConfig?.spreadsheetUrl || '');
      setAppsScriptUrl(settings.sheetConfig?.appsScriptUrl || '');
      setAppsScriptImageUrl(settings.sheetConfig?.appsScriptImageUrl || 'https://script.google.com/macros/s/AKfycbwknpHei6xEU81OAS51eNhoR78f8dF6LkGosc6Xw7xMcnrAIKHGcxnZSinfY3YrlpnO/exec');
      setDriveFolderId(settings.sheetConfig?.driveFolderId || '1d1YTxkOFluqzRzq9gBLMT1_yCBBdrld4');
      setStatusMsg(null);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_SHEETS_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleSaveConfig = async (customSuccessText?: string) => {
    try {
      setIsSavingConfig(true);
      setStatusMsg(null);
      const updated: AppSettings = {
        ...settings,
        sheetConfig: {
          spreadsheetUrl: spreadsheetUrl.trim(),
          appsScriptUrl: appsScriptUrl.trim(),
          appsScriptImageUrl: appsScriptImageUrl.trim(),
          driveFolderId: driveFolderId.trim(),
          autoSync: settings.sheetConfig?.autoSync || false,
          lastSyncedAt: settings.sheetConfig?.lastSyncedAt || ''
        }
      };
      await saveAppSettings(updated);
      setStatusMsg({ 
        type: 'success', 
        text: customSuccessText || 'Đã lưu cấu hình Google Sheets & Google Drive thành công!' 
      });
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err: any) {
      console.error('Save config error:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Lỗi khi lưu cấu hình' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Đồng bộ lịch trực sang Google Sheets
  const handleSyncToSheets = async () => {
    const url = appsScriptUrl.trim();
    if (!url) {
      setStatusMsg({ type: 'error', text: 'Vui lòng nhập URL Google Apps Script Web App trước khi đồng bộ!' });
      return;
    }

    try {
      setIsSyncing(true);
      setStatusMsg(null);

      // Chuẩn bị payload chứa tên học sinh
      const enrichedSchedules = schedules.map(s => {
        const student = students.find(st => st.id === s.studentId);
        const dayName = new Date(s.date).toLocaleDateString('vi-VN', { weekday: 'long' });
        return {
          ...s,
          studentName: student?.name || 'Học sinh chưa rõ',
          dayName
        };
      });

      const payload = {
        action: 'sync_all',
        className: settings.className,
        schoolYear: settings.schoolYear,
        schedules: enrichedSchedules,
        students
      };

      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });

      const nowStr = new Date().toLocaleString('vi-VN');
      const updated: AppSettings = {
        ...settings,
        sheetConfig: {
          ...settings.sheetConfig,
          spreadsheetUrl: spreadsheetUrl.trim(),
          appsScriptUrl: url,
          appsScriptImageUrl: appsScriptImageUrl.trim(),
          driveFolderId: driveFolderId.trim(),
          lastSyncedAt: nowStr
        }
      };
      await saveAppSettings(updated);

      setStatusMsg({ 
        type: 'success', 
        text: `Đã gửi lệnh đồng bộ thành công ${schedules.length} ca trực và ${students.length} học sinh sang Google Sheets lúc ${nowStr}!` 
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Không thể đồng bộ sang Google Sheets.' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Sao lưu lên Google Drive
  const handleBackupToDrive = async () => {
    const url = appsScriptImageUrl.trim() || appsScriptUrl.trim();
    if (!url) {
      setStatusMsg({ type: 'error', text: 'Vui lòng cấu hình URL Google Apps Script trước khi sao lưu!' });
      return;
    }

    try {
      setIsBackingUp(true);
      setStatusMsg(null);

      const backupContent = exportBackupData(settings, students, schedules, tasks);
      await backupDataToGoogleDriveViaAppsScript(backupContent, url, driveFolderId);

      const nowStr = new Date().toLocaleString('vi-VN');
      setStatusMsg({ 
        type: 'success', 
        text: `Đã sao lưu toàn bộ dữ liệu hệ thống lên Google Drive thành công lúc ${nowStr}!` 
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Lỗi khi sao lưu lên Google Drive' });
    } finally {
      setIsBackingUp(false);
    }
  };

  // Tải file JSON về máy tính
  const handleDownloadJson = () => {
    const content = exportBackupData(settings, students, schedules, tasks);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_TrucNhat_${settings.className}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-teal-50 to-emerald-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">
                Google Sheets & Google Drive
              </h3>
              <p className="text-[11px] text-slate-500">Đồng bộ lịch trực và lưu trữ ảnh minh chứng không giới hạn</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-2 gap-2 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('sheets')}
            className={`px-3.5 py-2 border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sheets'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-2xs font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
            <span>Đồng Bộ Google Sheets</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('drive')}
            className={`px-3.5 py-2 border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'drive'
                ? 'border-teal-600 text-teal-700 bg-white rounded-t-lg shadow-2xs font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-teal-600" />
            <span>Lưu Trữ Ảnh & Sao Lưu Drive</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-sm">
          {/* Thông báo */}
          {statusMsg && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border animate-in fade-in ${
              statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              <span className="flex-1 font-medium">{statusMsg.text}</span>
            </div>
          )}

          {/* TAB 1: GOOGLE SHEETS */}
          {activeTab === 'sheets' && (
            <div className="space-y-4">
              {/* Spreadsheet URL */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Link Bảng Tính Google Sheets (Cho Lớp Xem)
                  </label>
                  {spreadsheetUrl && (
                    <a href={spreadsheetUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-semibold">
                      <ExternalLink className="w-3 h-3" />
                      <span>Mở Sheet</span>
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  value={spreadsheetUrl}
                  onChange={(e) => setSpreadsheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500"
                />
              </div>

              {/* Apps Script URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  URL Web App Google Apps Script (Đồng Bộ)
                </label>
                <input
                  type="url"
                  value={appsScriptUrl}
                  onChange={(e) => setAppsScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  URL ứng dụng web Google Apps Script kết thúc bằng <code>/exec</code>, triển khai quyền "Anyone".
                </p>
              </div>

              {/* Hướng dẫn 3 bước */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs text-slate-700">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Hướng dẫn thiết lập Google Sheet của lớp (3 bước):</span>
                </div>
                <ol className="space-y-1.5 list-decimal list-inside text-slate-600 pl-1">
                  <li>Tạo 1 Google Sheet trống trên Google Drive của bạn.</li>
                  <li>Vào <strong>Tiện ích mở rộng (Extensions)</strong> &gt; <strong>Apps Script</strong>.</li>
                  <li>Bấm nút sao chép mã nguồn bên dưới, dán vào Apps Script &gt; Bấm <strong>Triển khai (Deploy)</strong> &gt; Chọn <strong>Ứng dụng web</strong> với quyền <strong>Bất kỳ ai (Anyone)</strong>.</li>
                </ol>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyScriptCode}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Đã sao chép Apps Script!' : 'Sao chép Sheet Script (1-Click)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCode(!showCode)}
                    className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-200 text-xs font-medium rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{showCode ? 'Thu gọn' : 'Xem mã nguồn'}</span>
                    {showCode ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {showCode && (
                  <pre className="p-2.5 bg-slate-900 text-emerald-300 rounded-lg text-[11px] font-mono overflow-x-auto max-h-40 leading-relaxed">
                    {APPS_SCRIPT_SHEETS_TEMPLATE}
                  </pre>
                )}
              </div>

              {settings.sheetConfig?.lastSyncedAt && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lần đồng bộ gần nhất: <strong>{settings.sheetConfig.lastSyncedAt}</strong></span>
                </div>
              )}

              {/* Nút lưu cấu hình Mục 1: Google Sheets */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={isSavingConfig}
                  onClick={() => handleSaveConfig('Đã lưu cấu hình Google Sheets thành công!')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Lưu Cấu Hình Google Sheets (Mục 1)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE DRIVE */}
          {activeTab === 'drive' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2 text-xs text-teal-900">
                <div className="font-bold flex items-center gap-1.5 text-teal-950">
                  <HardDrive className="w-4 h-4 text-teal-600" />
                  <span>Lưu Trữ Ảnh & Sao Lưu Dữ Liệu Lên Google Drive</span>
                </div>
                <p className="text-[11.5px] text-teal-800 leading-relaxed">
                  Toàn bộ ảnh chụp trực nhật được đẩy thẳng vào Google Drive của bạn (không tốn dung lượng Firebase) và tự động sao lưu dữ liệu toàn bộ hệ thống định kỳ.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  URL Google Apps Script Upload Ảnh / Drive
                </label>
                <input
                  type="url"
                  value={appsScriptImageUrl}
                  onChange={(e) => setAppsScriptImageUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 bg-slate-50 focus:bg-white outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  ID Thư Mục Google Drive (Lưu Ảnh & Backup)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={driveFolderId}
                    onChange={(e) => setDriveFolderId(e.target.value)}
                    placeholder="VD: 1d1YTxkOFluqzRzq9gBLMT1_yCBBdrld4"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 bg-slate-50 focus:bg-white outline-none focus:border-teal-500 pr-9"
                  />
                  <FolderOpen className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Dán ID thư mục từ link Google Drive của bạn (chuỗi ký tự phía sau <code>folders/</code>).
                </p>
              </div>

              {/* Nút lưu cấu hình Mục 2: Google Drive */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={isSavingConfig}
                  onClick={() => handleSaveConfig('Đã lưu cấu hình Google Drive thành công!')}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Lưu Cấu Hình Google Drive (Mục 2)</span>
                </button>
              </div>

              {/* Hành động sao lưu & khôi phục */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase">Sao Lưu & Khôi Phục Dữ Liệu</h4>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isBackingUp}
                    onClick={handleBackupToDrive}
                    className="px-3 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isBackingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5" />}
                    <span>{isBackingUp ? 'Đang gửi sao lưu...' : 'Sao Lưu Lên Drive'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tải File .JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRestoreOpen(true)}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Khôi phục toàn bộ học sinh, lịch trực nhật, nhiệm vụ từ file sao lưu .JSON"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    <span>Khôi Phục Dữ Liệu (.JSON)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            disabled={isSavingConfig}
            onClick={() => handleSaveConfig('Đã lưu toàn bộ cấu hình (Google Sheets & Google Drive) thành công!')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSavingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Lưu Toàn Bộ Cấu Hình (Cả 2 Mục)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Đóng
            </button>

            {activeTab === 'sheets' && (
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleSyncToSheets}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>{isSyncing ? 'Đang đồng bộ...' : 'ĐỒNG BỘ LÊN SHEETS NGAY'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Khôi Phục Dữ Liệu */}
      <RestoreDataModal
        isOpen={isRestoreOpen}
        onClose={() => setIsRestoreOpen(false)}
        onSuccess={() => {
          setStatusMsg({
            type: 'success',
            text: 'Dữ liệu đã được khôi phục thành công vào hệ thống!'
          });
        }}
      />
    </div>
  );
}
