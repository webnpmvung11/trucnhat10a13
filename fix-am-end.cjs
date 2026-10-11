const fs = require('fs');

let code = fs.readFileSync('src/components/AccountManager.tsx', 'utf8');

// Find the last </div> and move it to the end
// Actually, it's easier to just match:
//     </div>
//       {showResetConfirm
// and replace with {showResetConfirm

code = code.replace(/<\/div>\s*\{showResetConfirm && \(/, "{showResetConfirm && (");

fs.writeFileSync('src/components/AccountManager.tsx', code);
