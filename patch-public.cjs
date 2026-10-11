const fs = require('fs');
let code = fs.readFileSync('src/components/PublicSchedule.tsx', 'utf8');

// Change reportedBy state
code = code.replace(/const \[reportedBy, setReportedBy\] = useState\(''\);/, "const [taskContent, setTaskContent] = useState('Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)');\n  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);");

code = code.replace(/setReportedBy\(''\);/g, "setTaskContent('Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)');");

// Update submitCompletion
code = code.replace(
  /if \(!reportedBy\.trim\(\)\) \{\s*setErrorMsg\('Vui lòng nhập tên người báo cáo \/ mã số'\);\s*return;\s*\}/,
  `if (!taskContent.trim()) {\n      setErrorMsg('Vui lòng chọn hoặc nhập nội dung công việc');\n      return;\n    }`
);

code = code.replace(
  /await completeSchedule\(selectedSchedule\.id, reportedBy, photoBase64\);/,
  `await completeSchedule(selectedSchedule.id, taskContent, photoBase64);`
);

// Add the photo viewer modal to the end of the file
code = code.replace(
  /  \}\);\n\nexport default function PublicSchedule/,
  `  });\n\nconst TASK_OPTIONS = [\n  "Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)",\n  "Giặt khăn, Lau bảng, bàn GV + Tắt đèn, quạt + Khóa cửa"\n];\n\nexport default function PublicSchedule`
);

// Update Xong ({schedule.completedBy}) and Add View Photo button
code = code.replace(
  /Xong \(\{schedule\.completedBy\}\)/,
  `Xong: {schedule.taskContent}`
);

// If completedBy exists but we changed to taskContent, we must handle both for backward compatibility. Let's use `schedule.taskContent || schedule.completedBy`.
code = code.replace(
  /Xong: \{schedule\.taskContent\}/,
  `Xong: {schedule.taskContent || schedule.completedBy}`
);

code = code.replace(
  /<CheckCircle2 className="w-3 h-3 mr-1" \/>\s*Xong \(\{schedule\.taskContent \|\| schedule\.completedBy\}\)\s*<\/div>/,
  `<CheckCircle2 className="w-3 h-3 mr-1 flex-shrink-0" />\n                              <span className="truncate">Xong: {schedule.taskContent || schedule.completedBy}</span>\n                            </div>\n                            {schedule.photoBase64 && (\n                              <button onClick={() => setViewingPhoto(schedule.photoBase64)} className="mt-2 w-full py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded transition-colors">\n                                XEM ẢNH\n                              </button>\n                            )}`
);

// Replace form input
const oldFormInput = `<div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Người báo cáo (Tên / Mã số)</label>
                <input 
                  type="text" 
                  value={reportedBy}
                  onChange={(e) => setReportedBy(e.target.value)}
                  placeholder="Nhập tên hoặc mã số của bạn"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>`;
              
const newFormInput = `<div>
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
              </div>`;

code = code.replace(oldFormInput, newFormInput);

// Add photo modal
const photoModal = `{viewingPhoto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={() => setViewingPhoto(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewingPhoto(null)} className="absolute -top-10 right-0 text-white font-bold p-2">ĐÓNG [X]</button>
            <img src={viewingPhoto} alt="Xác thực" className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl" />
          </div>
        </div>
      )}`;

code = code.replace(/    <\/div>\n  \);\n\}/, `      ${photoModal}\n    </div>\n  );\n}`);

fs.writeFileSync('src/components/PublicSchedule.tsx', code);
