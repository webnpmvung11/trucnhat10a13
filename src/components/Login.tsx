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
      setErrorMsg('Google chặn đăng nhập trực tiếp trên ứng dụng Zalo. Vui lòng bấm dấu (
