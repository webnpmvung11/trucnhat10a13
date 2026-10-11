/**
 * TIỆN ÍCH XUẤT FILE CSV CHUẨN UTF-8 (CÓ BOM \uFEFF)
 * Khắc phục hoàn toàn lỗi mở file CSV trên Microsoft Excel bị vỡ font tiếng Việt.
 */

export function formatCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  // Thay thế dấu " bên trong bằng "" theo chuẩn RFC 4180
  return `"${str.replace(/"/g, '""')}"`;
}

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const headerLine = headers.map(formatCsvCell).join(',');
  const rowLines = rows.map(row => row.map(formatCsvCell).join(','));
  const csvContent = [headerLine, ...rowLines].join('\r\n');

  // \uFEFF là Byte Order Mark (BOM) UTF-8.
  // Khi không có ký tự này, Microsoft Excel trên Windows sẽ mở file CSV bằng bảng mã ANSI (mặc định của máy tính),
  // dẫn đến việc toàn bộ dấu tiếng Việt (đ, ê, ơ, ư, à, ả, ã, ...) bị lỗi thành ký tự lạ (vỡ font).
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const finalFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
