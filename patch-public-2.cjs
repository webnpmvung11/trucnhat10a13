const fs = require('fs');
let pCode = fs.readFileSync('src/components/PublicSchedule.tsx', 'utf8');

pCode = pCode.replace(
  /onClick=\{\(\) => setSelectedSchedule\(\{ \.\.\.schedule, studentName: student\?\.name \}\)\}/,
  `onClick={() => {
                              setSelectedSchedule({ ...schedule, studentName: student?.name });
                              setTaskContent(schedule.assignedTask || 'Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)');
                            }}`
);

fs.writeFileSync('src/components/PublicSchedule.tsx', pCode);
