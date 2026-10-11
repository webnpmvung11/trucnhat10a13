const fs = require('fs');
let pCode = fs.readFileSync('src/components/PublicSchedule.tsx', 'utf8');

pCode = pCode.replace(/  const \[selectedSchedule.*?\n/g, '');
pCode = pCode.replace(/  const \[taskContent.*?\n/g, '');
pCode = pCode.replace(/  const \[photoBase64.*?\n/g, '');
pCode = pCode.replace(/  const \[errorMsg.*?\n/g, '');
pCode = pCode.replace(/  const \[successMsg.*?\n/g, '');
pCode = pCode.replace(/  const fileInputRef.*?\n/g, '');

pCode = pCode.replace(/\{successMsg && \(\n.*?<div.*?successMsg.*?<\/div>\n.*?\)\}\n/s, ''); // try to remove successMsg block

fs.writeFileSync('src/components/PublicSchedule.tsx', pCode);
