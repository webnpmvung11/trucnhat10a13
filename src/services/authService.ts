import { User } from 'firebase/auth';
import { signOutUser } from '../firebase';
import { getAppSettings } from './firestoreService';

export interface AuthSyncResult {
  success: boolean;
  role?: string;
  name?: string;
  email?: string;
  error?: string;
}

/**
 * Xử lý phân quyền người dùng sau khi đăng nhập Google thành công
 * (Áp dụng cho cả luồng Popup và luồng Redirect / getRedirectResult).
 */
export async function syncUserRole(user: User): Promise<AuthSyncResult> {
  try {
    const settings = await getAppSettings();
    const email = (user.email || '').toLowerCase().trim();

    const adminEmails = (settings.adminGoogleEmails || ['webnpmvung@gmail.com', 'webnpmvung1@gmail.com'])
      .map((e) => (e || '').toLowerCase().trim());
    const managerEmails = (settings.managerGoogleEmails || [])
      .map((e) => (e || '').toLowerCase().trim());

    let role = 'Guest';
    let titleName = user.displayName || 'Khách';

    if (adminEmails.includes(email) || email === 'webnpmvung@gmail.com' || email === 'webnpmvung1@gmail.com') {
      role = 'Admin';
      const customName = settings.adminEmailNames?.[email];
      titleName = customName
        ? `${customName} (GVCN)`
        : user.displayName
        ? `${user.displayName} (GVCN)`
        : settings.adminName || 'Giáo viên chủ nhiệm';
    } else if (managerEmails.includes(email)) {
      role = 'Manager';
      const customName = settings.managerEmailNames?.[email];
      titleName = customName
        ? `${customName} (LPLĐ)`
        : user.displayName
        ? `${user.displayName} (LPLĐ)`
        : settings.managerName || 'Lớp phó lao động';
    } else {
      await signOutUser();
      return {
        success: false,
        error: `Tài khoản Google (${email}) chưa được cấp quyền truy cập hệ thống. Vui lòng liên hệ GVCN.`,
      };
    }

    localStorage.setItem('userRole', role);
    localStorage.setItem('userName', titleName);
    localStorage.setItem('userEmail', email);

    return {
      success: true,
      role,
      name: titleName,
      email,
    };
  } catch (err: any) {
    console.error('Lỗi kiểm tra quyền hạn tài khoản:', err);
    return {
      success: false,
      error: 'Lỗi kiểm tra quyền hạn tài khoản. Vui lòng thử lại.',
    };
  }
}
