const fs = require('fs');
let pCode = fs.readFileSync('src/components/PublicSchedule.tsx', 'utf8');

// Remove states
pCode = pCode.replace(/const \[selectedSchedule, setSelectedSchedule\] = useState<any>\(null\);\s*const \[taskContent, setTaskContent\] = useState[^;]+;\s*const \[photoBase64, setPhotoBase64\] = useState<string>\(''\);\s*const \[errorMsg, setErrorMsg\] = useState\(''\);\s*const \[successMsg, setSuccessMsg\] = useState\(''\);\s*const fileInputRef = useRef<HTMLInputElement>\(null\);/g, '');

// Update viewingPhoto to have time
pCode = pCode.replace(/const \[viewingPhoto, setViewingPhoto\] = useState<string \| null>\(null\);/g, `const [viewingPhoto, setViewingPhoto] = useState<{url: string, time: number | null} | null>(null);`);

// Remove handlePhotoUpload and submitCompletion
pCode = pCode.replace(/const handlePhotoUpload = [\s\S]*?const submitCompletion = [\s\S]*?loadData\(\);\n  };\n/g, '');

// Remove {successMsg && ... } block in header
pCode = pCode.replace(/\{successMsg && \([\s\S]*?<\/>\s*\)\}/g, ''); // Wait, the successMsg block might be different. Let's just use replace with exact matching if possible.
pCode = pCode.replace(/\{successMsg && \([\s\S]*?<\/div>\s*\)\}/, '');

// Change the "ĐÁNH DẤU HOÀN THÀNH" button to just a span or remove it
pCode = pCode.replace(/<button\s*onClick=\{[\s\S]*?ĐÁNH DẤU HOÀN THÀNH\s*<\/button>/, `<span className="mt-2 block w-full py-1.5 bg-slate-200 text-slate-500 text-[10px] font-bold rounded text-center">CHỜ HOÀN THÀNH</span>`);

// Change "XEM ẢNH" button onClick
pCode = pCode.replace(/<button onClick=\{\(\) => setViewingPhoto\(schedule\.photoBase64\)\} className="mt-2 w-full py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-\[10px\] font-bold rounded transition-colors">\s*XEM ẢNH\s*<\/button>/g, `<button onClick={() => setViewingPhoto({url: schedule.photoBase64, time: schedule.completedAt || null})} className="mt-2 w-full py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded transition-colors">XEM ẢNH</button>`);

// Remove completion modal completely
pCode = pCode.replace(/\{\/\* Completion Modal \*\/\}\s*\{selectedSchedule && \([\s\S]*?\{viewingPhoto && \(/, `{viewingPhoto && (`);

// Update photo modal for timestamp
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
      
pCode = pCode.replace(/\{viewingPhoto && \([\s\S]*?<\/div>\s*\)\s*\}/, photoModal);

fs.writeFileSync('src/components/PublicSchedule.tsx', pCode);
