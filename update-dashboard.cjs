const fs = require('fs');

let layoutCode = fs.readFileSync('src/components/DashboardLayout.tsx', 'utf8');

layoutCode = layoutCode.replace(
  /import \{ Users, CalendarDays, ClipboardList, LogOut, Link as LinkIcon, AlertCircle \} from 'lucide-react';/,
  "import { Users, CalendarDays, ClipboardList, LogOut, Link as LinkIcon, AlertCircle, Image as ImageIcon } from 'lucide-react';"
);

layoutCode = layoutCode.replace(
  /\{ path: '\/dashboard\/students', icon: Users, label: 'Danh sách lớp' \},/,
  "{ path: '/dashboard/students', icon: Users, label: 'Danh sách lớp' },\n    { path: '/dashboard/photos', icon: ImageIcon, label: 'Thư viện ảnh' },"
);

fs.writeFileSync('src/components/DashboardLayout.tsx', layoutCode);
