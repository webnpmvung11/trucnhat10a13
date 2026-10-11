const fs = require('fs');

// PublicSchedule.tsx
let pCode = fs.readFileSync('src/components/PublicSchedule.tsx', 'utf8');
pCode = pCode.replace(
  /<div className="font-bold text-slate-800">\{student\?\.name \|\| 'Unknown'\}<\/div>/,
  `<div className="font-bold text-slate-800">{student?.name || 'Unknown'}</div>
                          {schedule.assignedTask && (
                            <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1" title={schedule.assignedTask}>
                              Nhiệm vụ: {schedule.assignedTask}
                            </div>
                          )}`
);
fs.writeFileSync('src/components/PublicSchedule.tsx', pCode);

// ScheduleManager.tsx
let sCode = fs.readFileSync('src/components/ScheduleManager.tsx', 'utf8');
sCode = sCode.replace(
  /<span className="font-medium truncate">\{student\?\.name \|\| 'Unknown'\}<\/span>/,
  `<div className="flex flex-col min-w-0 flex-1">
                                  <span className="font-medium truncate">{student?.name || 'Unknown'}</span>
                                  {schedule.assignedTask && (
                                    <span className="text-[9px] font-normal text-slate-500 truncate" title={schedule.assignedTask}>{schedule.assignedTask}</span>
                                  )}
                                </div>`
);
fs.writeFileSync('src/components/ScheduleManager.tsx', sCode);
