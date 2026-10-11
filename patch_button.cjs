const fs = require('fs');
let code = fs.readFileSync('src/components/ScheduleManager.tsx', 'utf8');

const targetButton = `<button 
                  onClick={submitCompletion}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-sm transition-colors"
                >
                  GỬI BÁO CÁO
                </button>`;

const replaceButton = `<button 
                  onClick={submitCompletion}
                  disabled={isSubmitting}
                  className={\`flex-1 py-2 text-white text-xs font-bold rounded shadow-sm transition-colors \${isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}\`}
                >
                  {isSubmitting ? 'ĐANG GỬI...' : 'GỬI BÁO CÁO'}
                </button>`;

if(code.includes(targetButton)) {
  code = code.replace(targetButton, replaceButton);
  fs.writeFileSync('src/components/ScheduleManager.tsx', code);
  console.log('Patched button');
} else {
  console.error('Could not find target button');
}
