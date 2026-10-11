const fs = require('fs');

// 1. API.ts
let apiCode = fs.readFileSync('src/api.ts', 'utf8');

apiCode = apiCode.replace(
  /export async function completeSchedule\(id: string, taskContent: string, photoBase64\?: string\) \{[^}]*completedAt: Date\.now\(\)\s*\};\s*if \(photoBase64\) data\.photoBase64 = photoBase64;/,
  `export async function completeSchedule(id: string, taskContent: string, photos?: string[]) {
  const data: any = {
    status: 'completed',
    taskContent,
    completedAt: Date.now()
  };
  if (photos && photos.length > 0) {
    data.photos = photos;
  }`
);

fs.writeFileSync('src/api.ts', apiCode);

// 2. ScheduleManager.tsx
let smCode = fs.readFileSync('src/components/ScheduleManager.tsx', 'utf8');

smCode = smCode.replace(
  /const \[photoBase64, setPhotoBase64\] = useState<string>\(''\);/,
  "const [photosBase64, setPhotosBase64] = useState<string[]>([]);"
);

smCode = smCode.replace(
  /const handlePhotoUpload = [\s\S]*?reader\.readAsDataURL\(file\);\s*\}\s*\};/m,
  `const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    for (const f of files) {
      if (f.size > 2 * 1024 * 1024) {
        setErrorMsg('Kích thước mỗi ảnh phải nhỏ hơn 2MB');
        return;
      }
    }

    const promises = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(results => {
      setPhotosBase64(prev => [...prev, ...results].slice(0, 5)); // Tối đa 5 ảnh
      setErrorMsg('');
    });
  };`
);

smCode = smCode.replace(
  /await completeSchedule\(selectedSchedule\.id, taskContent, photoBase64\);/,
  "await completeSchedule(selectedSchedule.id, taskContent, photosBase64);"
);

smCode = smCode.replace(
  /setPhotoBase64\(''\);/g,
  "setPhotosBase64([]);"
);

// We need to update the file input to support multiple and show previews
// Let's replace the whole photo input block
const oldPhotoInput = `<div>
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
              </div>`;

const newPhotoInput = `<div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh xác thực (Tùy chọn - Tối đa 5 ảnh)</label>
                {photosBase64.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {photosBase64.map((p, i) => (
                      <div key={i} className="relative w-16 h-16 rounded overflow-hidden shadow-sm border border-slate-200 group">
                        <img src={p} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); setPhotosBase64(prev => prev.filter((_, idx) => idx !== i)); }}
                          className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {photosBase64.length < 5 && (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-blue-400 transition-colors cursor-pointer"
                      >
                        <Camera className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-blue-400 transition-colors cursor-pointer relative"
                  >
                    <Camera className="w-6 h-6 mb-2" />
                    <span className="text-xs">Bấm để tải ảnh lên (Hỗ trợ nhiều ảnh)</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handlePhotoUpload}
                />
              </div>`;

smCode = smCode.replace(oldPhotoInput, newPhotoInput);

// Update XEM ẢNH button logic
// Wait, viewingPhoto expects a single URL? We might have an array of URLs or a single URL now.
// For viewingPhoto, let's change it to { urls: string[], time: number | null, index: number }

smCode = smCode.replace(
  /const \[viewingPhoto, setViewingPhoto\] = useState<\{url: string, time: number \| null\} \| null>\(null\);/,
  "const [viewingPhoto, setViewingPhoto] = useState<{urls: string[], time: number | null, index: number} | null>(null);"
);

// We need to change how the XEM ẢNH button calls setViewingPhoto. It should look at schedule.photos or schedule.photoBase64.
const oldXemAnhBtn = /\{schedule\.photoBase64 && \([\s\S]*?<button[\s\S]*?onClick=\{\(\) => setViewingPhoto\(\{url: schedule\.photoBase64, time: schedule\.completedAt \|\| null\}\)\}[\s\S]*?XEM ẢNH[\s\S]*?<\/button>[\s\S]*?\)\}/;

const newXemAnhBtn = `{(schedule.photos || schedule.photoBase64) && (
                                <button 
                                  onClick={() => setViewingPhoto({
                                    urls: schedule.photos || [schedule.photoBase64], 
                                    time: schedule.completedAt || null,
                                    index: 0
                                  })} 
                                  className="text-[9px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded font-bold hover:bg-indigo-200 cursor-pointer"
                                >
                                  XEM ẢNH {schedule.photos?.length > 1 ? \`(\${schedule.photos.length})\` : ''}
                                </button>
                              )}`;
                              
smCode = smCode.replace(oldXemAnhBtn, newXemAnhBtn);

// Fix the modal for viewingPhoto in ScheduleManager.tsx
const oldViewingPhotoModal = /\{viewingPhoto && \([\s\S]*?\{new Date\(viewingPhoto\.time\)\.toLocaleString\('vi-VN'\)\}[\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*\)\}/;

const newViewingPhotoModal = `{viewingPhoto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={() => setViewingPhoto(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewingPhoto(null)} className="absolute -top-10 right-0 text-white font-bold p-2">ĐÓNG [X]</button>
            <img src={viewingPhoto.urls[viewingPhoto.index]} alt="Xác thực" className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl" />
            
            {viewingPhoto.urls.length > 1 && (
              <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-4">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingPhoto(prev => prev ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length } : null)
                  }}
                  className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingPhoto(prev => prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : null)
                  }}
                  className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}
            
            <div className="absolute bottom-4 flex flex-col items-center gap-2">
              {viewingPhoto.urls.length > 1 && (
                <div className="bg-black/60 text-white text-xs px-3 py-1 rounded-full font-mono">
                  {viewingPhoto.index + 1} / {viewingPhoto.urls.length}
                </div>
              )}
              {viewingPhoto.time && (
                <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full font-mono">
                  {new Date(viewingPhoto.time).toLocaleString('vi-VN')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}`;
      
smCode = smCode.replace(oldViewingPhotoModal, newViewingPhotoModal);

// Also we need to import ChevronLeft and ChevronRight in ScheduleManager
smCode = smCode.replace(/import \{ ([^}]+) \} from 'lucide-react';/, "import { $1, ChevronLeft, ChevronRight } from 'lucide-react';");

fs.writeFileSync('src/components/ScheduleManager.tsx', smCode);

// 3. PhotoGallery.tsx
let pgCode = fs.readFileSync('src/components/PhotoGallery.tsx', 'utf8');

// We need to change the viewingPhoto state here too.
pgCode = pgCode.replace(
  /const \[viewingPhoto, setViewingPhoto\] = useState<\{url: string, time: number \| null\} \| null>\(null\);/,
  "const [viewingPhoto, setViewingPhoto] = useState<{urls: string[], time: number | null, index: number} | null>(null);"
);

// We need to change the filter because now we can have `photos` OR `photoBase64`
pgCode = pgCode.replace(
  /\.filter\(s => s\.status === 'completed' && s\.photoBase64\)/,
  ".filter(s => s.status === 'completed' && (s.photoBase64 || s.photos))"
);

// We need to change the grid rendering to show the first photo, or a preview of it.
const oldGridCard = /<div \s*key=\{p\.id\}[\s\S]*?onClick=\{\(\) => setViewingPhoto\(\{url: p\.photoBase64, time: p\.completedAt \|\| null\}\)\}[\s\S]*?<img src=\{p\.photoBase64\}[\s\S]*?<\/div>/;

const newGridCard = `<div 
              key={p.id} 
              className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden flex flex-col cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all group"
              onClick={() => setViewingPhoto({urls: p.photos || [p.photoBase64], time: p.completedAt || null, index: 0})}
            >
              <div className="h-48 bg-slate-100 relative overflow-hidden">
                <img src={p.photos ? p.photos[0] : p.photoBase64} alt="Báo cáo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {p.photos && p.photos.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                    +{p.photos.length - 1} ảnh
                  </div>
                )}
                {p.completedAt && (
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono shadow-sm">
                    {format(new Date(p.completedAt), 'HH:mm')}
                  </div>
                )}
              </div>`;

pgCode = pgCode.replace(oldGridCard, newGridCard);

// PhotoGallery also needs ChevronLeft and ChevronRight if we use the same modal
// Let's replace the modal
pgCode = pgCode.replace(/import \{ ([^}]+) \} from 'lucide-react';/, "import { $1, ChevronLeft, ChevronRight } from 'lucide-react';");
if (!pgCode.includes('lucide-react')) {
  pgCode = "import { ChevronLeft, ChevronRight } from 'lucide-react';\n" + pgCode;
}

const oldPgViewingPhotoModal = /\{viewingPhoto && \([\s\S]*?\{format\(new Date\(viewingPhoto\.time\), 'dd\/MM\/yyyy HH:mm:ss'\)\}[\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*\)\}/;

const newPgViewingPhotoModal = `{viewingPhoto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={() => setViewingPhoto(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewingPhoto(null)} className="absolute -top-10 right-0 text-white font-bold p-2 hover:text-gray-300">ĐÓNG [X]</button>
            <img src={viewingPhoto.urls[viewingPhoto.index]} alt="Xác thực" className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl" />
            
            {viewingPhoto.urls.length > 1 && (
              <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-4">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingPhoto(prev => prev ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length } : null)
                  }}
                  className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingPhoto(prev => prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : null)
                  }}
                  className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}
            
            <div className="absolute bottom-4 flex flex-col items-center gap-2">
              {viewingPhoto.urls.length > 1 && (
                <div className="bg-black/60 text-white text-xs px-3 py-1 rounded-full font-mono">
                  {viewingPhoto.index + 1} / {viewingPhoto.urls.length}
                </div>
              )}
              {viewingPhoto.time && (
                <div className="bg-black/70 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-mono shadow-lg border border-white/10">
                  {format(new Date(viewingPhoto.time), 'dd/MM/yyyy HH:mm:ss')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}`;

pgCode = pgCode.replace(oldPgViewingPhotoModal, newPgViewingPhotoModal);
fs.writeFileSync('src/components/PhotoGallery.tsx', pgCode);

// 4. PublicSchedule.tsx
let psCode = fs.readFileSync('src/components/PublicSchedule.tsx', 'utf8');

psCode = psCode.replace(
  /const \[viewingPhoto, setViewingPhoto\] = useState<\{url: string, time: number \| null\} \| null>\(null\);/,
  "const [viewingPhoto, setViewingPhoto] = useState<{urls: string[], time: number | null, index: number} | null>(null);"
);

// We need to change the XEM ẢNH button
const oldPsXemAnhBtn = /\{schedule\.photoBase64 && \([\s\S]*?<button[\s\S]*?onClick=\{\(\) => setViewingPhoto\(\{url: schedule\.photoBase64, time: schedule\.completedAt \|\| null\}\)\}[\s\S]*?XEM ẢNH[\s\S]*?<\/button>[\s\S]*?\)\}/;

const newPsXemAnhBtn = `{(schedule.photos || schedule.photoBase64) && (
                            <button 
                              onClick={() => setViewingPhoto({
                                urls: schedule.photos || [schedule.photoBase64], 
                                time: schedule.completedAt || null,
                                index: 0
                              })} 
                              className="mt-2 w-full py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded transition-colors"
                            >
                              XEM ẢNH {schedule.photos?.length > 1 ? \`(\${schedule.photos.length})\` : ''}
                            </button>
                          )}`;
                          
psCode = psCode.replace(oldPsXemAnhBtn, newPsXemAnhBtn);

const oldPsViewingPhotoModal = /\{viewingPhoto && \([\s\S]*?\{new Date\(viewingPhoto\.time\)\.toLocaleString\('vi-VN'\)\}[\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*\)\}/;

psCode = psCode.replace(oldPsViewingPhotoModal, newViewingPhotoModal);

fs.writeFileSync('src/components/PublicSchedule.tsx', psCode);

