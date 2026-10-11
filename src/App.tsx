/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
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
  useEffect(() => {
    // Xử lý kết quả sau khi chuyển hướng đăng nhập Google (signInWithRedirect)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          console.log('[App] Tiếp nhận phiên đăng nhập sau chuyển hướng:', result.user.email);
          const syncRes = await syncUserRole(result.user);
          if (syncRes.success) {
            if (window.location.pathname === '/' || window.location.pathname === '') {
              window.location.replace('/dashboard');
            }
          }
        }
      })
      .catch((error: any) => {
        console.warn('[App] Thông báo getRedirectResult:', error);
      });

    // Lắng nghe trạng thái đăng nhập Firebase Auth để luôn đồng bộ quyền mới nhất từ Firestore
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await syncUserRole(user);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard/schedule" />} />
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
