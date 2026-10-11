import React, { useState, useEffect } from 'react';
import { 
  Shield, UserCircle, Plus, Trash2, Check, X, AlertTriangle, 
  Mail, Users, Save, CheckCircle2, AlertCircle, Clock, 
  Pencil, School, Calendar, UserCheck 
} from 'lucide-react';
import { resetAllData } from '../api';
import { 
  subscribeSettings, 
  saveAppSettings, 
  AppSettings, 
  DEFAULT_APP_SETTINGS 
} from '../services/firestoreService';

export default function AccountManager() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);
  
  // State cấu hình chung (Tên lớp, niên khóa, danh xưng vai trò, thời gian timeout)
  const [className, setClassName] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [adminName, setAdminName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(15);
  
  // State thêm email & tên người dùng
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerEmail, setNewManagerEmail] = useState('');
  
  // Modal xác nhận xóa email (thay thế window.confirm để không bị chặn trong iframe)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'admin' | 'manager';
    email: string;
    name: string;
  } | null>(null);

  // Modal chỉnh sửa họ tên cho email đã có
  const [editNameModal, setEditNameModal] = useState<{
    isOpen: boolean;
    type: 'admin' | 'manager';
    email: string;
    name: string;
  } | null>(null);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsub = subscribeSettings((data) => {
      setSettings(data);
      setClassName(data.className || '10A13');
      setSchoolYear(data.schoolYear || '2024 - 2025');
      setAdminName(data.adminName || 'Giáo viên chủ nhiệm');
      setManagerName(data.managerName || 'Lớp phó lao động');
      setAutoLogoutMinutes(data.autoLogoutMinutes || 15);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // ================= 1. CẤU HÌNH TÊN LỚP, NIÊN KHÓA & VAI TRÒ =================
  const handleSaveGeneralConfig = async () => {
    const trimmedClassName = className.trim() || '10A13';
    const trimmedSchoolYear = schoolYear.trim() || '2024 - 2025';
    const trimmedAdminName = adminName.trim() || 'Giáo viên chủ nhiệm';
    const trimmedManagerName = managerName.trim() || 'Lớp phó lao động';

    try {
      const updated: AppSettings = {
        ...settings,
        className: trimmedClassName,
        schoolYear: trimmedSchoolYear,
        adminName: trimmedAdminName,
        managerName: trimmedManagerName,
        autoLogoutMinutes: Number(autoLogoutMinutes) || 15
      };
      await saveAppSettings(updated);
      setMsg({ 
        type: 'success', 
        text: `Đã lưu cấu hình Tên lớp (${trimmedClassName}) và Vai trò thành công!` 
      });
      setTimeout(() => setMsg(null), 3500);
    } catch (err: any) {
      console.error('Save general config error:', err);
      setMsg({ type: 'error', text: err.message || 'Lỗi khi lưu cấu hình lớp học' });
    }
  };

  // ================= 2. THÊM EMAIL & TÊN GVCN =================
  const handleAddAdminEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newAdminEmail.trim().toLowerCase();
    const personName = newAdminName.trim() || 'Giáo viên chủ nhiệm';

    if (!email || !validateEmail(email)) {
      setMsg({ type: 'error', text: 'Địa chỉ email Google không hợp lệ!' });
      return;
    }
    const current = settings.adminGoogleEmails || [];
    if (current.includes(email)) {
      setMsg({ type: 'error', text: 'Email này đã có trong danh sách Giáo viên chủ nhiệm!' });
      return;
    }

    try {
      const updatedNames = {
        ...(settings.adminEmailNames || {}),
        [email]: personName
      };
      const updated: AppSettings = {
        ...settings,
        adminGoogleEmails: [...current, email],
        adminEmailNames: updatedNames
      };
      await saveAppSettings(updated);
      setNewAdminEmail('');
      setNewAdminName('');
      setMsg({ type: 'success', text: `Đã cấp quyền GVCN cho ${personName} (${email}) thành công!` });
      setTimeout(() => setMsg(null), 3500);
    } catch (err: any) {
      console.error('Error adding admin email:', err);
      setMsg({ type: 'error', text: err.message || 'Lỗi khi thêm email GVCN' });
    }
  };

  // ================= 3. THÊM EMAIL & TÊN LPLĐ =================
  const handleAddManagerEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newManagerEmail.trim().toLowerCase();
    const personName = newManagerName.trim() || 'Lớp phó lao động';

    if (!email || !validateEmail(email)) {
      setMsg({ type: 'error', text: 'Địa chỉ email Google không hợp lệ!' });
      return;
    }
    const current = settings.managerGoogleEmails || [];
    if (current.includes(email)) {
      setMsg({ type: 'error', text: 'Email này đã có trong danh sách Lớp phó lao động!' });
      return;
    }

    try {
      const updatedNames = {
        ...(settings.managerEmailNames || {}),
        [email]: personName
      };
      const updated: AppSettings = {
        ...settings,
        managerGoogleEmails: [...current, email],
        managerEmailNames: updatedNames
      };
      await saveAppSettings(updated);
      setNewManagerEmail('');
      setNewManagerName('');
      setMsg({ type: 'success', text: `Đã cấp quyền LPLĐ cho ${personName} (${email}) thành công!` });
      setTimeout(() => setMsg(null), 3500);
    } catch (err: any) {
      console.error('Error adding manager email:', err);
      setMsg({ type: 'error', text: err.message || 'Lỗi khi thêm email LPLĐ' });
    }
  };

  // ================= 4. MỞ MODAL XÓA EMAIL =================
  const handleOpenDelete = (type: 'admin' | 'manager', email: string) => {
    if (type === 'admin') {
      const current = settings.adminGoogleEmails || [];
      if (current.length <= 1) {
        setMsg({ type: 'error', text: 'Hệ thống cần giữ ít nhất 1 email Giáo viên chủ nhiệm để quản trị!' });
        setTimeout(() => setMsg(null), 4000);
        return;
      }
      const name = settings.adminEmailNames?.[email] || 'Giáo viên chủ nhiệm';
      setDeleteConfirm({ isOpen: true, type, email, name });
    } else {
      const name = settings.managerEmailNames?.[email] || 'Lớp phó lao động';
      setDeleteConfirm({ isOpen: true, type, email, name });
    }
  };

  // ================= 5. XÁC NHẬN XÓA EMAIL =================
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { type, email, name } = deleteConfirm;

    try {
      if (type === 'admin') {
        const currentList = settings.adminGoogleEmails || [];
        const updatedList = currentList.filter(e => e.toLowerCase() !== email.toLowerCase());
        const updatedNames = { ...(settings.adminEmailNames || {}) };
        delete updatedNames[email];

        const updated: AppSettings = {
          ...settings,
          adminGoogleEmails: updatedList,
          adminEmailNames: updatedNames
        };
        await saveAppSettings(updated);
        setMsg({ type: 'success', text: `Đã xóa quyền GVCN của ${name} (${email}) thành công!` });
      } else {
        const currentList = settings.managerGoogleEmails || [];
        const updatedList = currentList.filter(e => e.toLowerCase() !== email.toLowerCase());
        const updatedNames = { ...(settings.managerEmailNames || {}) };
        delete updatedNames[email];

        const updated: AppSettings = {
          ...settings,
          managerGoogleEmails: updatedList,
          managerEmailNames: updatedNames
        };
        await saveAppSettings(updated);
        setMsg({ type: 'success', text: `Đã xóa quyền LPLĐ của ${name} (${email}) thành công!` });
      }
      setTimeout(() => setMsg(null), 3500);
    } catch (err: any) {
      console.error('Delete email error:', err);
      setMsg({ type: 'error', text: err.message || 'Lỗi khi xóa email đã cấp quyền' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  // ================= 6. CHỈNH SỬA TÊN NGƯỜI DÙNG CHO EMAIL =================
  const handleSaveEditedName = async () => {
    if (!editNameModal) return;
    const { type, email, name } = editNameModal;
    const trimmedName = name.trim();

    try {
      if (type === 'admin') {
        const updatedNames = {
          ...(settings.adminEmailNames || {}),
          [email]: trimmedName || 'Giáo viên chủ nhiệm'
        };
        await saveAppSettings({
          ...settings,
          adminEmailNames: updatedNames
        });
        setMsg({ type: 'success', text: `Đã cập nhật tên GVCN cho email ${email} thành công!` });
      } else {
        const updatedNames = {
          ...(settings.managerEmailNames || {}),
          [email]: trimmedName || 'Lớp phó lao động'
        };
        await saveAppSettings({
          ...settings,
          managerEmailNames: updatedNames
        });
        setMsg({ type: 'success', text: `Đã cập nhật tên LPLĐ cho email ${email} thành công!` });
      }
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      console.error('Update name error:', err);
      setMsg({ type: 'error', text: err.message || 'Lỗi khi cập nhật tên người dùng' });
    } finally {
      setEditNameModal(null);
    }
  };

  if (loading) return <div className="text-xs text-slate-500 animate-pulse">Đang tải cấu hình tài khoản...</div>;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Phân Quyền & Tài Khoản Google</h2>
        <p className="text-xs text-slate-500 mt-1">
          Cấu hình tên lớp, cấp quyền truy cập qua tài khoản Google kèm họ tên và thiết lập bảo mật.
        </p>
      </header>

      {/* Thông báo trạng thái */}
      {msg && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border animate-in fade-in shadow-xs ${
          msg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span className="font-medium flex-1">{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600 p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* THẺ 1: CẤU HÌNH THÔNG TIN LỚP HỌC & BẢO MẬT */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <School className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Cấu Hình Thông Tin Lớp Học & Phiên Làm Việc
              </h3>
              <p className="text-[11px] text-slate-400">Thiết lập tên lớp, niên khóa và thời gian tự động khóa phiên</p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-mono">
            Lớp: {settings.className || '10A13'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
          {/* Tên Lớp */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <span>Tên Lớp</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="VD: 10A13, 11B2..."
              className="w-full px-3 py-2 text-xs font-bold text-indigo-700 border border-slate-300 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white"
            />
          </div>

          {/* Niên Khóa */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <span>Niên khóa</span>
            </label>
            <input
              type="text"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              placeholder="VD: 2024 - 2025"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white"
            />
          </div>

          {/* Danh xưng GVCN */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Danh xưng GVCN
            </label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Giáo viên chủ nhiệm"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white"
            />
          </div>

          {/* Danh xưng LPLĐ */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Danh xưng LPLĐ
            </label>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="Lớp phó lao động"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white"
            />
          </div>

          {/* Thời gian khóa phiên */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Khóa phiên sau
            </label>
            <select
              value={autoLogoutMinutes}
              onChange={(e) => setAutoLogoutMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white"
            >
              <option value={5}>5 phút</option>
              <option value={10}>10 phút</option>
              <option value={15}>15 phút (khuyên dùng)</option>
              <option value={30}>30 phút</option>
              <option value={60}>60 phút</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleSaveGeneralConfig}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu Cấu Hình Lớp & Vai Trò</span>
          </button>
        </div>
      </div>

      {/* 2 CỘT: CẤP QUYỀN EMAIL GOOGLE KÈM TÊN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nhóm 1: Giáo viên chủ nhiệm (Admin) */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Giáo Viên Chủ Nhiệm (Admin)</h4>
                  <p className="text-[11px] text-slate-400">Toàn quyền thêm, sửa, xóa ca trực, nhiệm vụ & cấu hình</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                {settings.adminGoogleEmails.length} email
              </span>
            </div>

            {/* Form thêm email kèm tên GVCN */}
            <form onSubmit={handleAddAdminEmail} className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Cấp quyền GVCN mới:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Họ và tên GVCN (VD: Thầy Vững)"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-indigo-500 bg-white"
                />
                <input
                  type="email"
                  required
                  placeholder="nhap_email_gvcn@gmail.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-indigo-500 bg-white"
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm GVCN</span>
                </button>
              </div>
            </form>

            {/* Danh sách email GVCN */}
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {settings.adminGoogleEmails.map((email) => {
                const displayName = settings.adminEmailNames?.[email] || 'Giáo viên chủ nhiệm';
                return (
                  <div key={email} className="flex items-center justify-between p-2.5 bg-slate-50/90 border border-slate-200 rounded-xl text-xs hover:border-indigo-200 transition-colors">
                    <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-slate-800 text-xs truncate flex items-center gap-1.5">
                          <span>{displayName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{email}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditNameModal({ isOpen: true, type: 'admin', email, name: displayName })}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                        title="Đổi tên hiển thị GVCN"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {settings.adminGoogleEmails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleOpenDelete('admin', email)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Xóa quyền GVCN"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Nhóm 2: Lớp phó lao động (Manager) */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <UserCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Lớp Phó Lao Động (LPLĐ)</h4>
                  <p className="text-[11px] text-slate-400">Được đổi phân công ca trực / nhiệm vụ (không có quyền xóa dữ liệu)</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                {settings.managerGoogleEmails.length} email
              </span>
            </div>

            {/* Form thêm email kèm tên LPLĐ */}
            <form onSubmit={handleAddManagerEmail} className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Cấp quyền LPLĐ mới:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Họ và tên LPLĐ (VD: Bạn Nam)"
                  value={newManagerName}
                  onChange={(e) => setNewManagerName(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-500 bg-white"
                />
                <input
                  type="email"
                  required
                  placeholder="nhap_email_lpld@gmail.com"
                  value={newManagerEmail}
                  onChange={(e) => setNewManagerEmail(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-500 bg-white"
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm LPLĐ</span>
                </button>
              </div>
            </form>

            {/* Danh sách email LPLĐ */}
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {settings.managerGoogleEmails.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 italic">
                  Chưa có email Lớp phó lao động nào được cấp quyền.
                </div>
              ) : (
                settings.managerGoogleEmails.map((email) => {
                  const displayName = settings.managerEmailNames?.[email] || 'Lớp phó lao động';
                  return (
                    <div key={email} className="flex items-center justify-between p-2.5 bg-slate-50/90 border border-slate-200 rounded-xl text-xs hover:border-emerald-200 transition-colors">
                      <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-slate-800 text-xs truncate flex items-center gap-1.5">
                            <span>{displayName}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditNameModal({ isOpen: true, type: 'manager', email, name: displayName })}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                          title="Đổi tên hiển thị LPLĐ"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDelete('manager', email)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Xóa quyền LPLĐ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Thông tin bảo mật tự động logout */}
      <div className="p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl flex items-center justify-between text-xs text-indigo-950">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <span className="font-bold">Bảo Mật Tự Động Khóa Phiên (Inactivity Timeout):</span>
            <p className="text-[11px] text-indigo-800 mt-0.5">
              Hệ thống được thiết lập tự động đăng xuất sau <strong>{settings.autoLogoutMinutes || 15} phút</strong> nếu không có thao tác chuột hoặc bàn phím để ngăn chặn can thiệp trái phép.
            </p>
          </div>
        </div>
      </div>

      {/* Vùng nguy hiểm - Reset dữ liệu */}
      <div className="pt-6 border-t border-red-100">
        <h3 className="text-sm font-bold text-red-600 flex items-center mb-2">
          <AlertTriangle className="w-4 h-4 mr-2" /> Vùng nguy hiểm (Chỉ Giáo viên chủ nhiệm)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Xóa toàn bộ dữ liệu (Danh sách học sinh, Lịch phân công trực nhật, Nhật ký hệ thống). 
          Cấu hình phân quyền email và tên lớp sẽ KHÔNG bị xóa.
        </p>
        <button 
          onClick={() => setShowResetConfirm(true)}
          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          XÓA TOÀN BỘ DỮ LIỆU (RESET)
        </button>
      </div>

      {/* MODAL 1: XÁC NHẬN XÓA EMAIL (Thay thế confirm() browser) */}
      {deleteConfirm?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Xác nhận xóa quyền truy cập
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Bạn có chắc chắn muốn xóa quyền {deleteConfirm.type === 'admin' ? 'Giáo viên chủ nhiệm' : 'Lớp phó lao động'} của tài khoản:
              <span className="block font-bold text-slate-900 mt-2 font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {deleteConfirm.name} ({deleteConfirm.email})
              </span>
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Xác nhận xóa quyền
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ĐỔI TÊN NGƯỜI DÙNG CHO EMAIL */}
      {editNameModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h4 className="font-bold text-slate-900 text-sm">
                Đổi Tên Hiển Thị ({editNameModal.type === 'admin' ? 'GVCN' : 'LPLĐ'})
              </h4>
              <button onClick={() => setEditNameModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3 font-mono">
              Email: <strong>{editNameModal.email}</strong>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên hiển thị:
                </label>
                <input
                  type="text"
                  value={editNameModal.name}
                  onChange={(e) => setEditNameModal({ ...editNameModal, name: e.target.value })}
                  placeholder="VD: Thầy Nguyễn Văn A, Bạn Bình..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditNameModal(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedName}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
                >
                  Lưu Tên
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: XÓA TOÀN BỘ DỮ LIỆU */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-red-600 flex items-center mb-4">
              <AlertTriangle className="w-5 h-5 mr-2" /> Xóa toàn bộ dữ liệu
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              CẢNH BÁO: Toàn bộ học sinh và lịch trực nhật sẽ bị xoá vĩnh viễn!
              Hành động này không thể hoàn tác.
              <br /><br />
              Bạn có chắc chắn muốn XÓA TOÀN BỘ DỮ LIỆU?
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                HỦY
              </button>
              <button 
                onClick={async () => {
                  try {
                    await resetAllData();
                    setShowResetConfirm(false);
                    setResetSuccess(true);
                    setTimeout(() => setResetSuccess(false), 3000);
                  } catch (e: any) {
                    setMsg({ type: 'error', text: e.message || 'Lỗi khi xóa dữ liệu' });
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                XÁC NHẬN XÓA
              </button>
            </div>
          </div>
        </div>
      )}

      {resetSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Thành công!</h3>
            <p className="text-sm text-slate-600 mb-6">Đã xóa toàn bộ dữ liệu thành công.</p>
            <button 
              onClick={() => setResetSuccess(false)}
              className="px-4 py-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              ĐÓNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
