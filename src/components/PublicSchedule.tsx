import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { CheckCircle2, ChevronLeft, ChevronRight, Users, Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  subscribeSchedules, 
  subscribeStudents, 
  subscribeSettings, 
  ScheduleItem, 
  AppSettings, 
  DEFAULT_APP_SETTINGS 
} from '../services/firestoreService';

export default function PublicSchedule() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewingPhoto, setViewingPhoto] = useState<{urls: string[], time: number | null, index: number} | null>(null);

  useEffect(() => {
    let schedLoaded = false;
    let studLoaded = false;

    const unsubSet = subscribeSettings(setSettings);

    const unsubSched = subscribeSchedules((data) => {
      setSchedules(data);
      schedLoaded = true;
      if (studLoaded) setLoading(false);
    });

    const unsubStud = subscribeStudents((data) => {
      setStudents(data);
      studLoaded = true;
      if (schedLoaded) setLoading(false);
    });

    return () => {
      unsubSet();
      unsubSched();
      unsubStud();
    };
  }, []);

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 6 }).map((_, i) => addDays(start, i)); // Mon to Sat
  };

  const days = getWeekDays();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-3 sm:p-6 md:p-8 font-sans selection:bg-indigo-500/20 selection:text-indigo-900">
      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 text-center mb-6 relative">
          <button
            onClick={() => navigate('/')}
            className="absolute left-4 top-4 p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Về đăng nhập</span>
          </button>

          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-2">
            <Users className="w-5 h-5" />
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
            Lịch Trực Nhật Lớp {settings.className || '10A13'}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Bảng theo dõi và minh chứng trực nhật công khai
          </p>
          
          <div className="flex items-center justify-center space-x-2 mt-4">
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
            >
              TRƯỚC
            </button>
            <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-xs border border-indigo-100">
              TUẦN {format(days[0], 'dd/MM')} - {format(days[days.length - 1], 'dd/MM/yyyy')}
            </span>
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
            >
              SAU
            </button>
          </div>
        </header>

        {/* Lưới lịch trực */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
            Đang tải dữ liệu trực nhật...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {days.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const daySchedules = schedules.filter(s => s.date === dateStr);
              const vnDayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
              const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

              return (
                <div 
                  key={dateStr}
                  className={`bg-white rounded-xl border-l-4 p-4 shadow-xs transition-all ${
                    isToday ? 'border-l-indigo-600 border-t-slate-200 border-r-slate-200 border-b-slate-200' : 'border-l-slate-400 border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className={`text-xs uppercase font-bold tracking-wider ${isToday ? 'text-indigo-600' : 'text-slate-600'}`}>
                      {vnDayNames[idx]} {isToday && '(HÔM NAY)'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {format(day, 'dd/MM')}
                    </span>
                  </div>
                  
                  <div className="space-y-2.5">
                    {daySchedules.length === 0 ? (
                      <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                        Chưa phân công ca trực
                      </div>
                    ) : (
                      daySchedules.map(schedule => {
                        const student = students.find(s => s.id === schedule.studentId);
                        const isCompleted = schedule.status === 'completed';
                        
                        return (
                          <div 
                            key={schedule.id}
                            className={`p-3 rounded-lg text-xs border transition-all ${
                              isCompleted ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="font-bold text-slate-900 text-[13px]">{student?.name || 'Học sinh chưa rõ'}</div>
                            
                            {schedule.assignedTask && (
                              <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2" title={schedule.assignedTask}>
                                Nhiệm vụ: {schedule.assignedTask}
                              </div>
                            )}

                            {/* GHI CHÚ CHỮ NHỎ, IN NGHIÊNG TỪ LPLĐ */}
                            {schedule.isEditedByLPLD && (
                              <div className="text-[10px] text-amber-700 italic mt-1 font-normal">
                                ✏️ Đã chỉnh sửa bởi LPLĐ
                              </div>
                            )}
                            
                            {isCompleted ? (
                              <div className="mt-2 text-[10px] uppercase font-bold flex items-center text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                                <span className="truncate">Xong: {schedule.taskContent || schedule.completedBy || ''}</span>
                              </div>
                            ) : (
                              <div className="mt-2 text-[10px] uppercase font-bold text-slate-400 text-center py-1 bg-slate-100 rounded-md">
                                CHỜ HOÀN THÀNH
                              </div>
                            )}

                            {(schedule.photos || schedule.photoBase64) && (
                              <button 
                                onClick={() => setViewingPhoto({
                                  urls: schedule.photos || [schedule.photoBase64], 
                                  time: schedule.completedAt || null,
                                  index: 0
                                })} 
                                className="mt-2 w-full py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                              >
                                XEM ẢNH {schedule.photos?.length > 1 ? `(${schedule.photos.length})` : ''}
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal xem ảnh */}
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
                  {new Date(viewingPhoto.time).toLocaleString('vi-VN')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
