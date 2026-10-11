import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { subscribeSchedules, subscribeStudents, ScheduleItem } from '../services/firestoreService';
import { format } from 'date-fns';

export default function PhotoGallery() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingPhoto, setViewingPhoto] = useState<{urls: string[], time: number | null, index: number} | null>(null);

  useEffect(() => {
    let schedData: ScheduleItem[] = [];
    let studData: any[] = [];

    const updatePhotos = () => {
      const completedWithPhotos = schedData
        .filter(s => s.status === 'completed' && (s.photoBase64 || (s.photos && s.photos.length > 0)))
        .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
        .map(s => {
          const student = studData.find(st => st.id === s.studentId);
          return { ...s, studentName: student?.name || 'Học sinh chưa rõ' };
        });
        
      setPhotos(completedWithPhotos);
      setLoading(false);
    };

    const unsubSched = subscribeSchedules((data) => {
      schedData = data;
      updatePhotos();
    });

    const unsubStud = subscribeStudents((data) => {
      studData = data;
      updatePhotos();
    });

    return () => {
      unsubSched();
      unsubStud();
    };
  }, []);

  if (loading) return <div className="text-xs text-slate-500 animate-pulse">Đang tải thư viện ảnh...</div>;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ImageIcon className="w-6 h-6 text-indigo-600" />
          <span>Thư Viện Ảnh Báo Cáo</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">Xem lại tất cả ảnh minh chứng trực nhật của lớp.</p>
      </header>

      {photos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs italic">
          Chưa có ảnh báo cáo trực nhật nào được tải lên hệ thống.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map(p => (
            <div 
              key={p.id} 
              className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all group"
              onClick={() => setViewingPhoto({urls: p.photos || [p.photoBase64], time: p.completedAt || null, index: 0})}
            >
              <div className="h-44 sm:h-48 bg-slate-100 relative overflow-hidden">
                <img 
                  src={p.photos ? p.photos[0] : p.photoBase64} 
                  alt="Báo cáo" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
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
              </div>

              <div className="p-3 flex flex-col justify-between flex-1 bg-white space-y-1.5">
                <div>
                  <p className="font-bold text-slate-900 text-sm truncate">{p.studentName}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-2">{p.taskContent || p.assignedTask}</p>
                  {p.isEditedByLPLD && (
                    <span className="text-[9px] text-amber-700 italic block mt-0.5 font-normal">
                      ✏️ Đã chỉnh sửa bởi LPLĐ
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="font-mono text-slate-400 font-medium">
                    {p.completedAt ? format(new Date(p.completedAt), 'dd/MM/yyyy') : format(new Date(p.date), 'dd/MM/yyyy')}
                  </span>
                  <span className="text-indigo-600 font-semibold group-hover:underline">
                    Xem ảnh
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Xem ảnh */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={() => setViewingPhoto(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewingPhoto(null)} className="absolute -top-10 right-0 text-white font-bold p-2 hover:text-gray-300 cursor-pointer">ĐÓNG [X]</button>
            <img src={viewingPhoto.urls[viewingPhoto.index]} alt="Xác thực" className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl" />
            
            {viewingPhoto.urls.length > 1 && (
              <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-4">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingPhoto(prev => prev ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length } : null);
                  }}
                  className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingPhoto(prev => prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : null);
                  }}
                  className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 cursor-pointer"
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
                <div className="bg-black/70 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-mono border border-white/10">
                  {format(new Date(viewingPhoto.time), 'dd/MM/yyyy HH:mm:ss')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
