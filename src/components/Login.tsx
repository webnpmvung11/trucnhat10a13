import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertCircle, Lock, ArrowRight, Loader2, ExternalLink } from 'lucide-react';
import { 
  signInWithGoogle, 
  getRedirectResult, 
  onAuthStateChanged, 
  auth, 
  User 
} from '../firebase';
import { subscribeSettings, AppSettings, DEFAULT_APP_SETTINGS } from '../services/firestoreService';
import { syncUserRole } from '../services/authService';

export default function Login() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [autoLogoutNotice, setAutoLogoutNotice] = useState<string | null>(null);
  const [isZaloBrowser, setIsZaloBrowser] = useState(false);

  // Xử lý đối soát quyền người dùng sau khi xác thực Google thành công
  const processUserAuth = async (user: User) => {
    try {
      setIsProcessing(true);
      setErrorMsg('');
      const syncRes = await syncUserRole(user);
      if (syncRes.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setErrorMsg(syncRes.error || 'Tài khoản chưa được cấp quyền truy cập hệ thống.');
      }
    } catch (err: any) {
      console.error('Lỗi phân quyền:', err);
      setErrorMsg('Lỗi kiểm tra quyền hạn tài khoản. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 0. Kiểm tra nếu người dùng đang mở web bằng trình duyệt nội bộ của Zalo
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (/zalo/i.test(ua)) {
        setIsZaloBrowser(true);
      }
    }

    // 1. Nếu đã có phiên đăng nhập hợp lệ, chuyển ngay vào Dashboard
    const savedRole = localStorage.getItem('userRole');
    if (savedRole && savedRole !== 'Guest') {
      navigate('/dashboard', { replace: true });
      return;
    }

    // 2. Hiển thị thông báo tự động khóa/logout nếu có
    const reason = localStorage.getItem('logout_reason');
    if (reason) {
      setAutoLogoutNotice(reason);
      localStorage.removeItem('logout_reason');
    }

    // 3. Lắng nghe cập nhật cấu hình hệ thống từ Firestore
    const unsubSettings = subscribeSettings((data) => {
      if (isMounted) {
        setSettings(data);
      }
    });

    // 4. Tiếp nhận kết quả đăng nhập sau khi chuyển hướng Google (signInWithRedirect)
    getRedirectResult(auth)
      .then(async (result) => {
        if (!isMounted) return;
        if (result && result.user) {
          await processUserAuth(result.user);
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        if (err?.code && err.code !== 'auth/null-user') {
          console.warn('Redirect auth result warning:', err);
        }
      });

    // 5. Lắng nghe trạng thái đăng nhập Firebase Auth
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      if (user && !localStorage.getItem('userRole')) {
        await processUserAuth(user);
      }
    });

    return () => {
      isMounted = false;
      unsubSettings();
      unsubAuth();
    };
  }, [navigate]);

  // Đăng nhập Google chuẩn theo mô hình web thủ quỹ:
  // 1. Thử mở Popup trước (signInWithPopup)
  // 2. Tự động fallback chuyển hướng (signInWithRedirect) nếu trình duyệt chặn popup
  // 3. Im lặng nếu người dùng tự đóng popup (popup-closed-by-user)
  const handleGoogleLogin = async () => {
    if (isZaloBrowser) {
      setErrorMsg('Google chặn đăng nhập trực tiếp trên ứng dụng Zalo. Vui lòng bấm dấu ( ... ) ở góc trên bên phải và chọn "Mở bằng trình duyệt".');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    try {
      const user = await signInWithGoogle();
      if (user) {
        await processUserAuth(user);
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setIsProcessing(false);
        return;
      }

      console.warn('Google Sign-in warning:', err);

      if (err?.code === 'auth/unauthorized-domain') {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'trucnhat10a13.vercel.app';
        setErrorMsg(`Tên miền "${currentHost}" chưa được cấp quyền trong Firebase Console. Vui lòng vào Firebase Console > Authentication > Settings > Authorized domains và thêm "${currentHost}".`);
      } else {
        setErrorMsg(err?.message || 'Không thể đăng nhập tài khoản Google. Vui lòng thử lại.');
      }
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-indigo-50 rounded-2xl text-indigo-600 mb-2 shadow-xs">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            QUẢN LÝ TRỰC NHẬT
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Lớp {settings.className || '10A13'} &bull; Niên khóa {settings.schoolYear || '2024 - 2025'}
          </p>
        </div>

        {/* CẢNH BÁO TỰ ĐỘNG KHI BẤM LINK TỪ ZALO */}
        {isZaloBrowser && (
          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs text-amber-900 space-y-2.5 animate-in fade-in">
            <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
              <ExternalLink className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Đang mở trong ứng dụng Zalo!</span>
            </div>
            <p className="leading-relaxed font-medium text-amber-800">
              Google chặn đăng nhập tài khoản trên trình duyệt Zalo. Để đăng nhập thành công, bạn hãy thực hiện:
            </p>
            <ol className="list-decimal pl-4 space-y-1 font-bold text-amber-950 leading-relaxed">
              <li>Nhìn lên góc trên bên phải màn hình, bấm vào <b>dấu 3 chấm ( &bull;&bull;&bull; )</b>.</li>
              <li>Chọn <b>"Mở bằng trình duyệt"</b> (hoặc <i>Open in Chrome/Safari</i>).</li>
            </ol>
          </div>
        )}

        {/* Thông báo tự động logout nếu có */}
        {autoLogoutNotice && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2 animate-in fade-in">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{autoLogoutNotice}</span>
          </div>
        )}

        {/* Thông báo lỗi nếu có */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Nút Đăng nhập Google */}
        <div className="space-y-4 pt-1">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isProcessing}
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 active:scale-[0.99] border-2 border-slate-300 text-slate-800 rounded-xl font-bold text-sm flex items-center justify-center gap-3 shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-60"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            )}
            <span>
              {isProcessing 
                ? 'Đang kết nối tài khoản Google...' 
                : 'ĐĂNG NHẬP VỚI GOOGLE'}
            </span>
          </button>

          {/* Thông tin giải thích quyền hạn */}
          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 space-y-1.5 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span>Phân quyền tài khoản Google:</span>
            </div>
            <ul className="space-y-1 pl-1 text-slate-500">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                <span>Giáo viên chủ nhiệm (Admin): toàn quyền cấu hình, xếp lịch và phân quyền.</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span>Lớp phó lao động (LPLĐ): có quyền phân công, chỉnh sửa và báo cáo trực nhật.</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                <span>Tự động khóa &amp; đăng xuất sau {settings.autoLogoutMinutes || 15} phút không thao tác.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Public view for students */}
        <div className="pt-2 text-center border-t border-slate-100">
          <button 
            type="button"
            onClick={() => navigate('/public')}
            className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 group"
          >
            <span>XEM GIAO DIỆN HỌC SINH (PUBLIC LINK)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
