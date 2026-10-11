const fs = require('fs');

let code = fs.readFileSync('src/components/AccountManager.tsx', 'utf8');

// We need to add state for showResetConfirm and resetSuccess
code = code.replace(
  /const \[editPin, setEditPin\] = useState\(''\);/,
  "const [editPin, setEditPin] = useState('');\n  const [showResetConfirm, setShowResetConfirm] = useState(false);\n  const [resetSuccess, setResetSuccess] = useState(false);"
);

// Replace the reset button and alert
const newResetButton = `<button 
          onClick={() => setShowResetConfirm(true)}
          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded text-xs font-bold transition-colors"
        >
          XÓA TOÀN BỘ DỮ LIỆU (RESET)
        </button>`;

code = code.replace(/<button\s*onClick=\{async \(\) => \{[^]*?<\/button>/, newResetButton);

// Add the modals at the end of the component
const modals = `
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-red-600 flex items-center mb-4">
              <AlertTriangle className="w-5 h-5 mr-2" /> Xóa toàn bộ dữ liệu
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              CẢNH BÁO: Toàn bộ học sinh và lịch trực nhật sẽ bị xoá vĩnh viễn!
              Tài khoản và mã PIN sẽ KHÔNG bị xóa. Hành động này không thể hoàn tác.
              <br /><br />
              Bạn có chắc chắn muốn XÓA TOÀN BỘ DỮ LIỆU?
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded"
                disabled={loading}
              >
                HỦY
              </button>
              <button 
                onClick={async () => {
                  setLoading(true);
                  await resetAllData();
                  setLoading(false);
                  setShowResetConfirm(false);
                  setResetSuccess(true);
                  setTimeout(() => setResetSuccess(false), 3000);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'ĐANG XÓA...' : 'XÁC NHẬN XÓA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Thành công!</h3>
            <p className="text-sm text-slate-600 mb-6">Đã xóa toàn bộ dữ liệu thành công.</p>
            <button 
              onClick={() => setResetSuccess(false)}
              className="px-4 py-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded"
            >
              ĐÓNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}`;

code = code.replace(/<\/div>\s*<\/div>\s*\);\s*\}/, `</div>\n    </div>${modals}`);

fs.writeFileSync('src/components/AccountManager.tsx', code);
