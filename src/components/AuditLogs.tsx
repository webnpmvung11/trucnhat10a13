import React, { useState, useEffect } from 'react';
import { Download, History, ClipboardList } from 'lucide-react';
import { subscribeAuditLogs, AuditLogItem } from '../services/firestoreService';
import { exportToCsv } from '../utils/csv';

function renderLogDetails(details: string) {
  if (!details) return null;

  // Xử lý mẫu "Đánh dấu hoàn thành lịch trực: Tên học sinh - Nhiệm vụ"
  const markCompleteMatch = details.match(/^Đánh dấu hoàn thành(?: lịch trực)?:\s*([^-]+?)\s*-\s*(.+)$/i);
  if (markCompleteMatch) {
    const [, studentName, taskContent] = markCompleteMatch;
    return (
      <div className="flex flex-wrap items-center gap-1.5 leading-relaxed">
        <span className="text-slate-500">Đánh dấu hoàn thành:</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
          {studentName.trim()}
        </span>
        <span className="text-slate-400 font-bold">→</span>
        <span className="text-slate-800 font-semibold">{taskContent.trim()}</span>
      </div>
    );
  }

  // Xử lý mẫu "Thêm ca trực...: Tên học sinh - nhiệm vụ ..." hoặc "Chỉnh sửa..."
  if (details.includes(' - nhiệm vụ') || details.includes('Học sinh:')) {
    const parts = details.split(/(:\s*[^:]+?\s*-\s*nhiệm vụ)/gi);
    return (
      <div className="leading-relaxed">
        {details}
      </div>
    );
  }

  return <span>{details}</span>;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeAuditLogs(
      (data) => {
        setLogs(data);
        setLoading(false);
      },
      (err) => {
        console.error('Audit logs error', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const downloadCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Thời gian', 'Người dùng', 'Hành động', 'Chi tiết'];
    const rows = logs.map(l => [
      new Date(l.timestamp).toLocaleString('vi-VN'),
      l.user || '',
      l.action || '',
      l.details || ''
    ]);
    const dateStr = new Date().toISOString().split('T')[0];
    exportToCsv(`Nhat_Ky_Hoat_Dong_${dateStr}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            <span>Nhật Ký Hoạt Động Hệ Thống</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ghi nhận mọi thao tác phân công, sửa đổi của GVCN và LPLĐ (Thời gian thực).
          </p>
        </div>

        <button 
          onClick={downloadCSV}
          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-50 flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>XUẤT FILE CSV</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 animate-pulse">Đang đồng bộ nhật ký...</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 sticky top-0 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-48">Thời gian</th>
                <th className="px-4 py-3 w-48">Người dùng</th>
                <th className="px-4 py-3 w-48">Hành động</th>
                <th className="px-4 py-3">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">Chưa có bản ghi nhật ký nào.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString('vi-VN', {
                        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {log.user}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-indigo-600 font-bold text-[10px] uppercase tracking-wide bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full inline-block">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {renderLogDetails(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
