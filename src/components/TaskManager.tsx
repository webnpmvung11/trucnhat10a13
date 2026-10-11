import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Plus, Trash2, Edit3, Save, X, CheckCircle2, 
  Users, AlertCircle, ArrowUp, ArrowDown, RotateCcw, Sparkles 
} from 'lucide-react';
import { 
  TaskItem, 
  subscribeTasks, 
  saveTask, 
  deleteTask, 
  DEFAULT_TASKS 
} from '../services/firestoreService';

export default function TaskManager() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [requiredCount, setRequiredCount] = useState(1);
  const [description, setDescription] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Lấy vai trò người dùng từ localStorage
  const userRole = localStorage.getItem('userRole') || 'Guest';
  const isAdmin = userRole === 'Admin';

  useEffect(() => {
    const unsub = subscribeTasks(
      (data) => {
        setTasks(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching tasks', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleStartAdd = () => {
    if (!isAdmin) return;
    setTitle('');
    setRequiredCount(1);
    setDescription('');
    setEditingTaskId(null);
    setIsAdding(true);
    setMsg(null);
  };

  const handleStartEdit = (t: TaskItem) => {
    if (!isAdmin) return;
    setTitle(t.title);
    setRequiredCount(t.requiredCount || 1);
    setDescription(t.description || '');
    setEditingTaskId(t.id);
    setIsAdding(true);
    setMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!title.trim()) {
      setMsg({ type: 'error', text: 'Vui lòng nhập tên công việc trực nhật!' });
      return;
    }

    try {
      const id = editingTaskId || `task-${Date.now()}`;
      const order = editingTaskId 
        ? (tasks.find(t => t.id === editingTaskId)?.order || tasks.length + 1)
        : tasks.length + 1;

      const taskToSave: TaskItem = {
        id,
        title: title.trim(),
        requiredCount: Number(requiredCount) || 1,
        description: description.trim(),
        order,
        isActive: true
      };

      await saveTask(taskToSave);
      setMsg({ 
        type: 'success', 
        text: editingTaskId ? 'Đã cập nhật công việc trực nhật!' : 'Đã thêm công việc trực nhật mới thành công!' 
      });
      setTimeout(() => setMsg(null), 3000);
      setIsAdding(false);
      setEditingTaskId(null);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi khi lưu công việc.' });
    }
  };

  const handleDelete = async (id: string, taskTitle: string) => {
    if (!isAdmin) return;
    if (confirm(`Bạn có chắc chắn muốn xóa công việc: "${taskTitle}"?`)) {
      try {
        await deleteTask(id, taskTitle);
        setMsg({ type: 'success', text: 'Đã xóa công việc trực nhật!' });
        setTimeout(() => setMsg(null), 3000);
      } catch (err: any) {
        setMsg({ type: 'error', text: err.message || 'Lỗi khi xóa công việc.' });
      }
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (!isAdmin) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tasks.length) return;

    const list = [...tasks];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    for (let i = 0; i < list.length; i++) {
      await saveTask({ ...list[i], order: i + 1 });
    }
  };

  const handleResetDefaults = async () => {
    if (!isAdmin) return;
    if (confirm('Khôi phục danh sách về các công việc chuẩn ban đầu?')) {
      for (const t of DEFAULT_TASKS) {
        await saveTask(t);
      }
      setMsg({ type: 'success', text: 'Đã khôi phục nhiệm vụ mặc định!' });
      setTimeout(() => setMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-indigo-600" />
            <span>Quản Lý Nhiệm Vụ Trực Nhật</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cấu hình các công việc trực nhật. Hệ thống sẽ tự động dùng danh sách này để tạo lịch và phân công.
          </p>
        </div>

        {/* Nút thao tác Admin */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Khôi phục các công việc mẫu mặc định"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Mặc định</span>
            </button>

            <button
              onClick={handleStartAdd}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Nhiệm Vụ Mới</span>
            </button>
          </div>
        )}
      </div>

      {/* Thông báo */}
      {msg && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border animate-in fade-in ${
          msg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span className="font-medium">{msg.text}</span>
        </div>
      )}

      {/* Form Thêm & Sửa Công Việc (Chỉ Admin) */}
      {isAdmin && isAdding && (
        <div className="bg-white rounded-xl border-2 border-indigo-200 shadow-md p-5 animate-in fade-in zoom-in-95">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>{editingTaskId ? 'Chỉnh Sửa Nhiệm Vụ' : 'Thêm Nhiệm Vụ Mới'}</span>
            </h3>
            <button 
              onClick={() => { setIsAdding(false); setEditingTaskId(null); }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-3">
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                  Nội dung công việc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                  Số học sinh cần <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={requiredCount}
                  onChange={(e) => setRequiredCount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                Mô tả chi tiết / Hướng dẫn thực hiện (Tùy chọn)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ghi chú các bước thực hiện để học sinh nắm rõ..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setIsAdding(false); setEditingTaskId(null); }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                HỦY
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>LƯU NHIỆM VỤ</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Danh sách nhiệm vụ hiện có */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 animate-pulse">Đang tải danh sách nhiệm vụ...</div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">
            Chưa có công việc trực nhật nào. {isAdmin && 'Hãy bấm "Thêm Nhiệm Vụ Mới" hoặc "Mặc định".'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((task, idx) => (
              <div 
                key={task.id} 
                className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">
                        {task.title}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{task.requiredCount} người</span>
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Các nút hành động: Chỉ Admin mới nhìn thấy */}
                {isAdmin && (
                  <div className="flex items-center justify-end gap-1.5 shrink-0 pl-10 sm:pl-0">
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 mr-1">
                      <button
                        onClick={() => handleMoveOrder(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        title="Chuyển lên trên"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveOrder(idx, 'down')}
                        disabled={idx === tasks.length - 1}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        title="Chuyển xuống dưới"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleStartEdit(task)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Chỉnh sửa nội dung"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(task.id, task.title)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Xóa công việc này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
