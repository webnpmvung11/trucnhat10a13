/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, getRedirectResult, onAuthStateChanged } from './firebase';
import { syncUserRole } from './services/authService';
import Login from './components/Login';
import DashboardLayout from './components/DashboardLayout';
import StudentManager from './components/StudentManager';
import ScheduleManager from './components/ScheduleManager';
import TaskManager from './components/TaskManager';
import AuditLogs from './components/AuditLogs';
import PublicSchedule from './components/PublicSchedule';
import PhotoGallery from './components/PhotoGallery';
import AccountManager from './components/AccountManager';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Hàm xử lý chung khi có thông tin người dùng
    const handleUserLogin = async (user: any) => {
      try {
        await syncUserRole(user);
        if (isMounted) {
          setCurrentUser(user);
        }
      } catch (err) {
        console.error('[App] Lỗi đồng bộ vai trò:', err);
      }
    };

    // 1. Kiểm tra kết quả sau khi đăng nhập chuyển hướng Google (signInWithRedirect)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          console.log('[App] Tiếp nhận phiên đăng nhập sau chuyển hướng:', result.user.email);
          await handleUserLogin(result.user);
        }
      })
      .catch((error: any) => {
        console.warn('[App] Thông báo getRedirectResult:', error);
      });

    // 2. Lắng nghe trạng thái đăng nhập liên tục từ Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await handleUserLogin(user);
      } else {
        if (isMounted) setCurrentUser(null);
      }
      // Tắt màn hình chờ sau khi Firebase đã kiểm tra xong
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Hiển thị màn hình chờ trong lúc Firebase đang xác minh tài khoản
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <p>Đang kiểm tra trạng thái đăng nhập...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Nếu đã đăng nhập: vào trang chủ '/' sẽ tự chuyển sang '/dashboard' */}
        <Route path="/" element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />} />
        
        {/* Nếu chưa đăng nhập: cố vào '/dashboard' sẽ tự bị đẩy về màn hình đăng nhập */}
        <Route path="/dashboard" element={currentUser ? <DashboardLayout /> : <Navigate to="/" replace />}>
          <Route index element={<Navigate to="/dashboard/schedule" replace />} />
          <Route path="students" element={<StudentManager />} />
          <Route path="schedule" element={<ScheduleManager />} />
          <Route path="tasks" element={<TaskManager />} />
          <Route path="photos" element={<PhotoGallery />} />
          <Route path="logs" element={<AuditLogs />} />
          <Route path="accounts" element={<AccountManager />} />
        </Route>

        <Route path="/public" element={<PublicSchedule />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
