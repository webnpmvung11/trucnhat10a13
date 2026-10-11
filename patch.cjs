const fs = require('fs');
let code = fs.readFileSync('src/components/ScheduleManager.tsx', 'utf8');

const target = `<button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteSchedule(schedule.id).then(loadData);
                                        }}
                                        className="p-0.5 text-red-500 hover:bg-red-100 rounded"
                                        title="Xóa phân công"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>`;

const replacement = `{userRole === 'Admin' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteSchedule(schedule.id).then(loadData);
                                        }}
                                        className="p-0.5 text-red-500 hover:bg-red-100 rounded"
                                        title="Xóa phân công"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                      )}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/ScheduleManager.tsx', code);
