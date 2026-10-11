import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOutUser } from '../firebase';

export function useAutoLogout(timeoutMinutes: number = 2) {
  const navigate = useNavigate();
  const timerRef = useRef<any>(null);
  const timeoutMs = timeoutMinutes * 60 * 1000;

  const handleLogout = async () => {
    const role = localStorage.getItem('userRole');
    if (role && role !== 'Guest') {
      await signOutUser();
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.setItem('logout_reason', `Phiên làm việc đã tự động kết thúc sau ${timeoutMinutes} phút không thao tác để bảo vệ an toàn dữ liệu.`);
      navigate('/');
    }
  };

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    const role = localStorage.getItem('userRole');
    if (role && role !== 'Guest') {
      timerRef.current = setTimeout(handleLogout, timeoutMs);
    }
  };

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    
    // Khởi tạo timer ban đầu
    resetTimer();

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [timeoutMs]);
}
