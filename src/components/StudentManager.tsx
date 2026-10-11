import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, ClipboardType, Users, AlertCircle, Download } from 'lucide-react';
import { addStudents, deleteStudent, updateStudent } from '../api';
import { subscribeStudents } from '../services/firestoreService';
import { exportToCsv } from '../utils/csv';

export default function StudentManager() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkInput, setBulkInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const userRole = localStorage.getItem('userRole') || 'Guest';

  useEffect(() => {
    const unsub = subscribeStudents((data) => {
      setStudents(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleExportCsv = () => {
    if (students.length === 0) return;
    const headers = ['STT', 'Họ và Tên', 'Lần trực gần nhất', 'Mã định danh'];
    const rows = students.map((s, index) => [
      index + 1,
      s.name || '',
      s.lastCleaned ? new Date(s.lastCleaned).toLocaleDateString('vi-VN') : 'Chưa trực',
      s.id || ''
    ]);
    const dateStr = new Date().toISOString().split('T')[0];
    exportToCsv(`Danh_Sach_Hoc_Sinh_${dateStr}.csv`, headers, rows);
  };

  const handleAddBulk = async () => {
    if (!bulkInput.trim()) return;
    const names = bulkInput.split('\n').map(n => n.trim()).filter(n => n);
    if (names.length > 0) {
      await addStudents(names);
      setBulkInput('');
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteStudent(id);
      setConfirmDeleteId(null);
    } catch (e: any) {
      alert(e.message || 'Lỗi khi xóa học sinh');
    }
  };

  const startEdit = (student: any) => {
    setEditingId(student.id);
    setEditName(student.name);
  };

  const saveEdit = async () => {
    if (editingId && editName.trim()) {
      await updateStudent(editingId, editName.trim());
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>Danh Sách Học Sinh Lớp</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng cộng: <strong>{students.length}</strong> học sinh
          </p>
        </div>

        <div className="flex items-center gap-2">
          {students.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Xuất danh sách học sinh ra file CSV (chuẩn UTF-8 mở Excel không lỗi font)"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>XUẤT CSV</span>
            </button>
          )}

          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>THÊM HỌC SINH</span>
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 animate-in fade-in zoom-in-95">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <ClipboardType className="w-4 h-4 text-indigo-600" />
              <span>Thêm học sinh hàng loạt</span>
            </h3>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Dán danh sách tên học sinh, mỗi học sinh trên một dòng:
          </p>

          <textarea 
            rows={5}
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder="Nguyễn Văn A&#10;Trần Thị B&#10;Lê Văn C"
            className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed font-mono"
          />

          <div className="flex justify-end space-x-2">
            <button 
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              HỦY
            </button>
            <button 
              onClick={handleAddBulk}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              LƯU DANH SÁCH
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 animate-pulse">Đang tải danh sách học sinh...</div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">
            Chưa có học sinh nào. Hãy nhấn "THÊM HỌC SINH" để tạo danh sách lớp.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-14 text-center">STT</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-4 w-40 text-center">Lần trực gần nhất</th>
                <th className="py-3 px-4 w-28 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student, idx) => (
                <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    {editingId === student.id ? (
                      <div className="flex items-center space-x-2">
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-2 py-1 border border-indigo-500 rounded text-xs outline-none w-full max-w-xs font-medium"
                          autoFocus
                        />
                        <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-semibold text-slate-800 text-sm">{student.name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-500">
                    {student.lastCleaned ? new Date(student.lastCleaned).toLocaleDateString('vi-VN') : 'Chưa trực'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {editingId !== student.id && (
                      <div className="flex items-center justify-center space-x-2">
                        <button 
                          onClick={() => startEdit(student)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Sửa tên"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {userRole === 'Admin' && (
                          <button 
                            onClick={() => setConfirmDeleteId(student.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa học sinh (Chỉ GVCN)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Xác nhận xóa học sinh</h4>
              <p className="text-xs text-slate-500 mt-1">
                Tất cả lịch trực liên quan đến học sinh này cũng sẽ bị xóa. Thao tác không thể hoàn tác.
              </p>
            </div>
            <div className="flex justify-center space-x-2 pt-2">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                HỦY
              </button>
              <button 
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
              >
                XÁC NHẬN XÓA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
