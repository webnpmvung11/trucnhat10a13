const fs = require('fs');

let sCode = fs.readFileSync('src/components/ScheduleManager.tsx', 'utf8');

// Add imports if missing
if (!sCode.includes('Camera')) {
  sCode = sCode.replace(/import \{ \.\.\. \} from 'lucide-react';/g, ''); // just in case
  sCode = sCode.replace(/import \{ ([^}]+) \} from 'lucide-react';/, "import { $1, Camera, CheckCircle2 } from 'lucide-react';");
}

sCode = sCode.replace(/import \{ fetchSchedules, fetchStudents, updateSchedule, deleteSchedule, generateSchedule \} from '\.\.\/api';/, "import { fetchSchedules, fetchStudents, updateSchedule, deleteSchedule, generateSchedule, completeSchedule } from '../api';");

// Insert TASK_OPTIONS and states
const taskOptions = `
const TASK_OPTIONS = [
  "Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)",
  "Giặt khăn, Lau bảng, bàn GV + Tắt đèn, quạt + Khóa cửa"
];
`;

sCode = sCode.replace(/export default function ScheduleManager\(\) \{/, `${taskOptions}\nexport default function ScheduleManager() {\n  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);\n  const [taskContent, setTaskContent] = useState('Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)');\n  const [photoBase64, setPhotoBase64] = useState<string>('');\n  const [errorMsg, setErrorMsg] = useState('');\n  const [successMsg, setSuccessMsg] = useState('');\n  const fileInputRef = React.useRef<HTMLInputElement>(null);\n`);

// viewingPhoto to include timestamp
sCode = sCode.replace(/const \[viewingPhoto, setViewingPhoto\] = useState<string \| null>\(null\);/, `const [viewingPhoto, setViewingPhoto] = useState<{url: string, time: number | null} | null>(null);`);

// insert handlePhotoUpload and submitCompletion
const submitLogic = `
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('Kích thước ảnh phải nhỏ hơn 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
        setErrorMsg('');
      };
      reader.readAsDataURL(file);
    }
  };

  const submitCompletion = async () => {
    if (!taskContent.trim()) {
      setErrorMsg('Vui lòng chọn hoặc nhập nội dung công việc');
      return;
    }
    
    await completeSchedule(selectedSchedule.id, taskContent, photoBase64);
    setSuccessMsg('Đã ghi nhận hoàn thành trực nhật!');
    setTimeout(() => setSuccessMsg(''), 3000);
    setSelectedSchedule(null);
    setTaskContent('Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)');
    setPhotoBase64('');
    setErrorMsg('');
    loadData();
  };
`;

sCode = sCode.replace(/const loadData = async \(\) => \{/, `${submitLogic}\n  const loadData = async () => {`);

// Replace XEM ẢNH button to use the new object structure
sCode = sCode.replace(
  /<button onClick=\{\(\) => setViewingPhoto\(schedule\.photoBase64\)\} className="text-\[9px\] bg-indigo-100 text-indigo-700 px-1 rounded font-bold hover:bg-indigo-200 cursor-pointer">XEM ẢNH<\/button>/g,
  `<button onClick={() => setViewingPhoto({url: schedule.photoBase64, time: schedule.completedAt || null})} className="text-[9px] bg-indigo-100 text-indigo-700 px-1 rounded font-bold hover:bg-indigo-200 cursor-pointer">XEM ẢNH</button>`
);

// Add ĐÁNH DẤU HOÀN THÀNH button for pending tasks in ScheduleManager
sCode = sCode.replace(
  /<span className="text-\[9px\] uppercase font-bold opacity-60">\s*\{isDone \? `Xong: \$\{schedule\.taskContent \|\| schedule\.completedBy \|\| ''\}` : 'Chờ'\}\s*<\/span>/,
  `{isDone ? (
      <span className="text-[9px] uppercase font-bold opacity-60 truncate mr-2">Xong: {schedule.taskContent || schedule.completedBy || ''}</span>
    ) : (
      <button 
        onClick={() => {
          setSelectedSchedule({ ...schedule, studentName: student?.name });
          setTaskContent(schedule.assignedTask || 'Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)');
        }} 
        className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded font-bold hover:bg-indigo-700 cursor-pointer mr-2"
      >
        ĐÁNH DẤU HOÀN THÀNH
      </button>
    )}`
);

// Photo modal in ScheduleManager
const photoModal = `{viewingPhoto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={() => setViewingPhoto(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewingPhoto(null)} className="absolute -top-10 right-0 text-white font-bold p-2">ĐÓNG [X]</button>
            <img src={viewingPhoto.url} alt="Xác thực" className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl" />
            {viewingPhoto.time && (
              <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full font-mono">
                {new Date(viewingPhoto.time).toLocaleString('vi-VN')}
              </div>
            )}
          </div>
        </div>
      )}`;
      
sCode = sCode.replace(/\{viewingPhoto && \([^]*?\}\)\s*\}/, photoModal);

// Add Completion Modal to ScheduleManager
const completionModal = `{selectedSchedule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Báo cáo trực nhật</h3>
            <p className="text-gray-500 text-sm mb-6">Xác nhận hoàn thành cho: <strong className="text-gray-800">{selectedSchedule.studentName}</strong></p>
            
            <div className="space-y-4">
              {errorMsg && <div className="text-[10px] text-red-600 bg-red-50 p-2 rounded border border-red-100 font-bold">{errorMsg}</div>}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung công việc</label>
                <select 
                  value={TASK_OPTIONS.includes(taskContent) ? taskContent : 'Khác'}
                  onChange={(e) => setTaskContent(e.target.value === 'Khác' ? '' : e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-2"
                >
                  {TASK_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  <option value="Khác">Khác...</option>
                </select>
                {!TASK_OPTIONS.includes(taskContent) && (
                  <input 
                    type="text" 
                    value={taskContent}
                    onChange={(e) => setTaskContent(e.target.value)}
                    placeholder="Nhập nội dung công việc khác..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh xác thực (Tùy chọn)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-blue-400 transition-colors cursor-pointer overflow-hidden relative"
                >
                  {photoBase64 ? (
                    <img src={photoBase64} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="w-8 h-8 mb-2" />
                      <span className="text-sm">Bấm để tải ảnh lên</span>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handlePhotoUpload}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button 
                  onClick={() => {
                    setSelectedSchedule(null);
                    setPhotoBase64('');
                    setTaskContent('Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)');
                    setErrorMsg('');
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded transition-colors"
                >
                  HỦY
                </button>
                <button 
                  onClick={submitCompletion}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-sm transition-colors"
                >
                  GỬI BÁO CÁO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}`;

sCode = sCode.replace(/\{viewingPhoto && \(/, `${completionModal}\n      {viewingPhoto && (`);

// And we need to add the check for successMsg in ScheduleManager render, but maybe we can just use an alert or a floating banner. Let's add it near the top.
sCode = sCode.replace(/<header className="mb-6">/, `{successMsg && (
        <div className="mb-4 inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded text-xs font-bold border border-emerald-100 shadow-sm">
          <CheckCircle2 className="w-4 h-4 mr-1.5" />
          {successMsg}
        </div>
      )}\n      <header className="mb-6">`);


fs.writeFileSync('src/components/ScheduleManager.tsx', sCode);
