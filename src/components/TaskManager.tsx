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
              title="Khôi phục các
