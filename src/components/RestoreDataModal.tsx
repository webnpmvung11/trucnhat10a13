import React, { useState, useRef } from 'react';
import { 
  RotateCcw, Upload, FileText, CheckCircle2, AlertTriangle, 
  X, Check, Loader2, ArrowRight, ShieldAlert, Sparkles, Database, Users, CalendarDays, ListChecks, Settings2
} from 'lucide-react';
import { 
  parseAndValidateBackup, 
  restoreBackupData, 
  BackupPreview, 
  RestoreOptions, 
  RestoreStats 
} from '../services/restoreService';

interface RestoreDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (stats: RestoreStats) => void;
}

export default function RestoreDataModal({ isOpen, onClose, onSuccess }: RestoreDataModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [modeInput, setModeInput] = useState<'file' | 'text'>('file');
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Tùy chọn khôi phục
  const [options, setOptions] = useState<RestoreOptions>({
    restoreStudents: true,
    restoreSchedules: true,
    restoreTasks: true,
    restoreSettings: true,
    mode: 'replace'
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [successResult, setSuccessResult] = useState<{ message: string; stats: RestoreStats } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setSuccessResult(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.json')) {
      setErrorMsg('Vui lòng chọn file định dạng .json');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleProcessJsonContent(content);
    };
    reader.onerror = () => {
      setErrorMsg('Không thể đọc nội dung file được chọn.');
    };
    reader.readAsText(selectedFile, 'UTF-8');
  };

  const handleProcessJsonContent = (content: string) => {
    const result = parseAndValidateBackup(content);
    if (!result.isValid) {
      setErrorMsg(result.error || 'Dữ liệu file sao lưu không hợp lệ.');
      setPreview(null);
      setParsedData(null);
      return;
    }

    setPreview(result.preview || null);
    setParsedData(result.data);
    setErrorMsg('');
  };

  const handleExecuteRestore = async () => {
    if (!parsedData) {
      setErrorMsg('Vui lòng chọn file sao lưu hợp lệ trước khi bắt đầu.');
      return;
    }

    if (!options.restoreStudents && !options.restoreSchedules && !options.restoreTasks && !options.restoreSettings) {
      setErrorMsg('Vui lòng chọn ít nhất một mục dữ liệu cần khôi phục.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg('');

      const res = await restoreBackupData(parsedData, options);
      setSuccessResult({
        message: res.message,
        stats: res.stats
      });

      if (onSuccess) {
        onSuccess(res.stats);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi khôi phục dữ liệu');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetModal = () => {
    setFile(null);
    setJsonText('');
    setPreview(null);
    setParsedData(null);
    setErrorMsg('');
    setSuccessResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-amber-50 via-orange-50 to-indigo-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">
                Khôi Phục Dữ Liệu Lớp Học
              </h3>
              <p className="text-[11px] text-slate-500">
                Phục hồi học sinh, lịch trực nhật, nhiệm vụ từ file sao lưu .JSON
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-sm">
          {/* Thông báo thành công */}
          {successResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Khôi phục dữ liệu thành công!</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Hệ thống đã phục hồi hoàn tất:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="bg-white/80 p-2 rounded-xl text-center border border-emerald-100">
                  <div className="font-bold text-emerald-700 text-base">{successResult.stats.students}</div>
                  <div className="text-slate-500 text-[10px]">Học sinh</div>
                </div>
                <div className="bg-white/80 p-2 rounded-xl text-center border border-emerald-100">
                  <div className="font-bold text-emerald-700 text-base">{successResult.stats.schedules}</div>
                  <div className="text-slate-500 text-[10px]">Ca trực</div>
                </div>
                <div className="bg-white/80 p-2 rounded-xl text-center border border-emerald-100">
                  <div className="font-bold text-emerald-700 text-base">{successResult.stats.tasks}</div>
                  <div className="text-slate-500 text-[10px]">Nhiệm vụ</div>
                </div>
                <div className="bg-white/80 p-2 rounded-xl text-center border border-emerald-100">
                  <div className="font-bold text-emerald-700 text-base">{successResult.stats.settings ? 'Đã cập nhật' : 'Giữ nguyên'}</div>
                  <div className="text-slate-500 text-[10px]">Cài đặt</div>
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 cursor-pointer"
                >
                  Hoàn Tất & Xem Dữ Liệu
                </button>
              </div>
            </div>
          )}

          {/* Lỗi */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="flex-1 font-medium">{errorMsg}</span>
            </div>
          )}

          {!successResult && (
            <>
              {/* Chọn nguồn dữ liệu: Upload file hoặc dán JSON */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Bước 1: Nạp File Sao Lưu (.JSON)
                  </label>
                  <div className="flex text-xs font-semibold rounded-lg bg-slate-100 p-0.5">
                    <button
                      type="button"
                      onClick={() => setModeInput('file')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        modeInput === 'file' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Chọn file máy tính
                    </button>
                    <button
                      type="button"
                      onClick={() => setModeInput('text')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        modeInput === 'text' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Dán mã JSON
                    </button>
                  </div>
                </div>

                {modeInput === 'file' ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/30 rounded-2xl p-6 text-center transition-all cursor-pointer group"
                  >
                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      accept=".json" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                    <div className="w-12 h-12 rounded-full bg-white shadow-xs mx-auto flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors mb-2">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      {file ? file.name : 'Bấm vào đây để chọn file sao lưu .JSON'}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {file ? `Dung lượng: ${(file.size / 1024).toFixed(1)} KB` : 'Hoặc kéo thả file Backup_TrucNhat_*.json vào khu vực này'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <textarea
                      value={jsonText}
                      onChange={(e) => {
                        setJsonText(e.target.value);
                        if (e.target.value.trim()) {
                          handleProcessJsonContent(e.target.value);
                        } else {
                          setPreview(null);
                          setParsedData(null);
                        }
                      }}
                      rows={4}
                      placeholder='Dán toàn bộ nội dung JSON sao lưu vào đây ({"version": "3.0...", "students": [...]})'
                      className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* BẢN XEM TRƯỚC (PREVIEW) */}
              {preview && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Thông tin bản sao lưu: Lớp {preview.className}</span>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      {preview.exportDate}
                    </span>
                  </div>

                  {/* Thống kê bản sao lưu */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center gap-1 text-slate-500 text-[11px] mb-0.5">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Học sinh</span>
                      </div>
                      <div className="text-base font-bold text-slate-900">{preview.studentsCount}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center gap-1 text-slate-500 text-[11px] mb-0.5">
                        <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Ca trực</span>
                      </div>
                      <div className="text-base font-bold text-slate-900">{preview.schedulesCount}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center gap-1 text-slate-500 text-[11px] mb-0.5">
                        <ListChecks className="w-3.5 h-3.5 text-amber-500" />
                        <span>Nhiệm vụ</span>
                      </div>
                      <div className="text-base font-bold text-slate-900">{preview.tasksCount}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center gap-1 text-slate-500 text-[11px] mb-0.5">
                        <Settings2 className="w-3.5 h-3.5 text-purple-500" />
                        <span>Cấu hình</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1">
                        {preview.hasSettings ? 'Có sẵn' : 'Không có'}
                      </div>
                    </div>
                  </div>

                  {/* Học sinh mẫu */}
                  {preview.sampleStudents.length > 0 && (
                    <div className="text-[11px] text-slate-500">
                      <span className="font-medium text-slate-700">Mẫu học sinh: </span>
                      <span>{preview.sampleStudents.join(', ')}...</span>
                    </div>
                  )}

                  {/* BƯỚC 2: TÙY CHỌN KHÔI PHỤC */}
                  <div className="pt-2 border-t border-slate-200 space-y-2.5">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Bước 2: Chọn Dữ Liệu Cần Khôi Phục
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={options.restoreStudents}
                          disabled={preview.studentsCount === 0}
                          onChange={(e) => setOptions({ ...options, restoreStudents: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-slate-800">
                          Danh sách học sinh ({preview.studentsCount})
                        </span>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={options.restoreSchedules}
                          disabled={preview.schedulesCount === 0}
                          onChange={(e) => setOptions({ ...options, restoreSchedules: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-slate-800">
                          Lịch phân công trực ({preview.schedulesCount})
                        </span>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={options.restoreTasks}
                          disabled={preview.tasksCount === 0}
                          onChange={(e) => setOptions({ ...options, restoreTasks: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-slate-800">
                          Nhiệm vụ trực nhật ({preview.tasksCount})
                        </span>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={options.restoreSettings}
                          disabled={!preview.hasSettings}
                          onChange={(e) => setOptions({ ...options, restoreSettings: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-slate-800">
                          Cài đặt lớp & phân quyền
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* BƯỚC 3: CHẾ ĐỘ KHÔI PHỤC */}
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Bước 3: Chế Độ Phục Hồi
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label 
                        onClick={() => setOptions({ ...options, mode: 'replace' })}
                        className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-all ${
                          options.mode === 'replace'
                            ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={options.mode === 'replace'}
                          onChange={() => setOptions({ ...options, mode: 'replace' })}
                          className="mt-0.5 text-amber-600"
                        />
                        <div>
                          <div className="font-bold text-slate-900">Ghi đè sạch (Khuyên dùng)</div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Làm sạch mục đã chọn và khôi phục nguyên vẹn từ bản sao lưu
                          </p>
                        </div>
                      </label>

                      <label 
                        onClick={() => setOptions({ ...options, mode: 'merge' })}
                        className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-all ${
                          options.mode === 'merge'
                            ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={options.mode === 'merge'}
                          onChange={() => setOptions({ ...options, mode: 'merge' })}
                          className="mt-0.5 text-indigo-600"
                        />
                        <div>
                          <div className="font-bold text-slate-900">Gộp bổ sung (Merge)</div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Giữ dữ liệu hiện có và thêm mới/cập nhật đè từ bản sao lưu
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Cảnh báo an toàn */}
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11.5px] text-amber-900 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Lưu ý:</strong> Thao tác này sẽ cập nhật trực tiếp cơ sở dữ liệu trên Firebase. Vui lòng đảm bảo bạn đang khôi phục đúng file sao lưu của lớp mình.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={preview ? handleResetModal : onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
          >
            {preview && !successResult ? 'Chọn file khác' : 'Đóng'}
          </button>

          {!successResult && (
            <button
              type="button"
              disabled={!preview || isProcessing}
              onClick={handleExecuteRestore}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ĐANG PHỤC HỒI DỮ LIỆU...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>BẮT ĐẦU KHÔI PHỤC</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
