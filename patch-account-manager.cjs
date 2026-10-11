const fs = require('fs');
let code = fs.readFileSync('src/components/AccountManager.tsx', 'utf8');

// Import resetAllData
code = code.replace(
  /import \{ fetchAccounts, updateAccount \} from '\.\.\/api';/,
  "import { fetchAccounts, updateAccount, resetAllData } from '../api';\nimport { AlertTriangle } from 'lucide-react';"
);

const resetSection = `

      <div className="mt-8 pt-8 border-t border-red-100">
        <h3 className="text-sm font-bold text-red-600 flex items-center mb-2">
          <AlertTriangle className="w-4 h-4 mr-2" /> Vùng nguy hiểm
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Xóa toàn bộ dữ liệu hiện có (Danh sách học sinh, Lịch phân công trực nhật, Nhật ký hệ thống). 
          Tài khoản và mã PIN sẽ KHÔNG bị xóa. Hành động này không thể hoàn tác.
        </p>
        <button 
          onClick={async () => {
            if (window.confirm('CẢNH BÁO: Toàn bộ học sinh và lịch trực nhật sẽ bị xoá vĩnh viễn!\\n\\nBạn có chắc chắn muốn XÓA TOÀN BỘ DỮ LIỆU?')) {
              setLoading(true);
              await resetAllData();
              window.alert('Đã xóa toàn bộ dữ liệu thành công!');
              setLoading(false);
            }
          }}
          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded text-xs font-bold transition-colors"
        >
          XÓA TOÀN BỘ DỮ LIỆU (RESET)
        </button>
      </div>`;

code = code.replace(
  /    <\/div>\n  \);\n\}/,
  `${resetSection}\n    </div>\n  );\n}`
);

fs.writeFileSync('src/components/AccountManager.tsx', code);
