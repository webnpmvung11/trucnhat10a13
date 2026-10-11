const fs = require('fs');
let code = fs.readFileSync('src/components/ScheduleManager.tsx', 'utf8');

// Add viewingPhoto state
code = code.replace(
  /const \[editingScheduleId, setEditingScheduleId\] = useState<string \| null>\(null\);/,
  "const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);\n  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);"
);

// Replace "Chờ / Xong" with "Chờ / Xong: {schedule.taskContent || schedule.completedBy}"
code = code.replace(
  /\{isDone \? 'Xong' : 'Chờ'\}/,
  "{isDone ? `Xong: ${schedule.taskContent || schedule.completedBy || ''}` : 'Chờ'}"
);

// Replace Ảnh span with button
code = code.replace(
  /<span className="text-\[9px\] bg-indigo-100 text-indigo-700 px-1 rounded font-bold">Ảnh<\/span>/,
  `<button onClick={() => setViewingPhoto(schedule.photoBase64)} className="text-[9px] bg-indigo-100 text-indigo-700 px-1 rounded font-bold hover:bg-indigo-200 cursor-pointer">XEM ẢNH</button>`
);

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

fs.writeFileSync('src/components/ScheduleManager.tsx', code);
