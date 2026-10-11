import { AppSettings, TaskItem, ScheduleItem, AuditLogItem } from '../services/firestoreService';

export function exportBackupData(
  settings: AppSettings,
  students: any[] = [],
  schedules: ScheduleItem[] = [],
  tasks: TaskItem[] = [],
  auditLogs: AuditLogItem[] = []
): string {
  const data = {
    version: '3.0-trucnhat-cloud',
    exportDate: new Date().toISOString(),
    className: settings.className,
    settings,
    students,
    schedules,
    tasks,
    auditLogs
  };
  return JSON.stringify(data, null, 2);
}
