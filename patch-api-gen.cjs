const fs = require('fs');
let code = fs.readFileSync('src/api.ts', 'utf8');

const oldGen = `const newRef = doc(collection(db, 'schedules'));
      batch.set(newRef, {
        date,
        studentId: selectedStudent.id,
        status: 'pending'
      });`;

const newGen = `const newRef = doc(collection(db, 'schedules'));
      let assignedTask = '';
      if (i === 0 || i === 1) assignedTask = 'Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)';
      if (i === 2) assignedTask = 'Giặt khăn, Lau bảng, bàn GV + Tắt đèn, quạt + Khóa cửa';
      
      batch.set(newRef, {
        date,
        studentId: selectedStudent.id,
        status: 'pending',
        assignedTask
      });`;

code = code.replace(oldGen, newGen);

fs.writeFileSync('src/api.ts', code);
