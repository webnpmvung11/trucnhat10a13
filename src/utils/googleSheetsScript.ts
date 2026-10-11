/**
 * GOOGLE APPS SCRIPT TEMPLATE CHO QUẢN LÝ TRỰC NHẬT 10A13
 * Hỗ trợ đồng bộ 2 chiều với Google Sheets và lưu ảnh / backup lên Google Drive
 */

export const APPS_SCRIPT_SHEETS_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT - ĐỒNG BỘ LỊCH TRỰC NHẬT 10A13 SANG GOOGLE SHEETS
 * Hướng dẫn 3 bước:
 * 1. Mở Google Sheet của lớp -> Tiện ích mở rộng (Extensions) -> Apps Script.
 * 2. Xóa code cũ, dán toàn bộ đoạn code này vào -> Bấm Lưu (Ctrl + S).
 * 3. Bấm "Triển khai" (Deploy) -> "Quản lý triển khai mới" -> Chọn "Ứng dụng web" (Web app):
 *    - Thực thi dưới dạng: Tôi (Me)
 *    - Ai có quyền truy cập: Bất kỳ ai (Anyone)  <-- BẮT BUỘC
 *    - Nhấn "Triển khai" và sao chép URL ứng dụng web dán vào trang web.
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  initSheetsIfNeeded(ss);
  var schedSheet = ss.getSheetByName("Lich_Truc_Nhat");
  var studSheet = ss.getSheetByName("Danh_Sach_10A13");
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    lastUpdated: new Date().toISOString(),
    schedules: getSheetRowsAsJson(schedSheet),
    students: getSheetRowsAsJson(studSheet)
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    initSheetsIfNeeded(ss);
    var data = JSON.parse(e.postData.contents);

    // 1. Đồng bộ toàn bộ dữ liệu lịch trực & học sinh
    if (data.action === "sync_all") {
      updateSchedulesSheet(ss, data.schedules || []);
      updateStudentsSheet(ss, data.students || []);
      return responseJson({
        status: "success",
        message: "Đã đồng bộ thành công " + (data.schedules ? data.schedules.length : 0) + " ca trực sang Google Sheets!"
      });
    }

    // 2. Upload ảnh lên Google Drive
    if (data.action === "upload_image" || data.base64) {
      return handleImageUploadToDrive(data);
    }

    // 3. Tự động sao lưu file JSON lên Google Drive
    if (data.action === "backup_data") {
      return handleBackupToDrive(data);
    }

    return responseJson({ status: "error", message: "Hành động không hợp lệ" });
  } catch (error) {
    return responseJson({ status: "error", message: error.toString() });
  }
}

function handleImageUploadToDrive(data) {
  var base64Data = data.base64 || data.image;
  if (!base64Data) {
    return responseJson({ status: "error", message: "Thiếu dữ liệu ảnh Base64" });
  }
  var folderId = data.folderId ? String(data.folderId).trim() : "";
  var fileName = data.fileName || ("trucnhat_" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss") + ".jpg");

  var base64Clean = base64Data;
  var contentType = "image/jpeg";
  if (base64Clean.indexOf(",") !== -1) {
    var parts = base64Clean.split(",");
    var header = parts[0];
    base64Clean = parts[1];
    var match = header.match(/:(.*?);/);
    if (match && match[1]) contentType = match[1];
  }

  var decoded = Utilities.base64Decode(base64Clean);
  var blob = Utilities.newBlob(decoded, contentType, fileName);

  var folder;
  if (folderId) {
    try { folder = DriveApp.getFolderById(folderId); } catch(err) { folder = null; }
  }
  if (!folder) {
    var folderName = "Anh_TrucNhat_10A13";
    var folders = DriveApp.getFoldersByName(folderName);
    folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  }

  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var fileId = file.getId();
  var directUrl = "https://lh3.googleusercontent.com/d/" + fileId;

  return responseJson({
    status: "success",
    fileId: fileId,
    url: directUrl,
    downloadUrl: directUrl,
    viewUrl: file.getUrl()
  });
}

function handleBackupToDrive(data) {
  var backupContent = data.backupContent || "";
  var dateStr = Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd");
  var fileName = data.fileName || ("Backup_TrucNhat_10A13_" + dateStr + ".json");
  var folderId = data.folderId ? String(data.folderId).trim() : "";
  var folder;
  if (folderId) {
    try { folder = DriveApp.getFolderById(folderId); } catch(e) { folder = null; }
  }
  if (!folder) {
    var fName = "Backup_TrucNhat_10A13";
    var folders = DriveApp.getFoldersByName(fName);
    folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(fName);
  }
  var backupFile = folder.createFile(fileName, backupContent, MimeType.PLAIN_TEXT);
  return responseJson({
    status: "success",
    message: "Đã sao lưu lên Google Drive thành công!",
    fileId: backupFile.getId(),
    fileName: fileName
  });
}

function initSheetsIfNeeded(ss) {
  var schedSheet = ss.getSheetByName("Lich_Truc_Nhat");
  if (!schedSheet) {
    schedSheet = ss.insertSheet("Lich_Truc_Nhat");
    schedSheet.appendRow(["Ngày", "Thứ", "Học sinh", "Nhiệm vụ phân công", "Trạng thái", "Nội dung hoàn thành", "Thời gian xong", "Ghi chú chỉnh sửa", "Link Ảnh"]);
    var header = schedSheet.getRange(1, 1, 1, 9);
    header.setBackground("#4f46e5").setFontColor("#ffffff").setFontWeight("bold");
    schedSheet.setFrozenRows(1);
  }

  var studSheet = ss.getSheetByName("Danh_Sach_10A13");
  if (!studSheet) {
    studSheet = ss.insertSheet("Danh_Sach_10A13");
    studSheet.appendRow(["STT", "Mã HS", "Họ và Tên", "Lần trực gần nhất"]);
    var stHeader = studSheet.getRange(1, 1, 1, 4);
    stHeader.setBackground("#059669").setFontColor("#ffffff").setFontWeight("bold");
    studSheet.setFrozenRows(1);
  }
}

function updateSchedulesSheet(ss, schedules) {
  var sheet = ss.getSheetByName("Lich_Truc_Nhat");
  if (!sheet) return;
  sheet.clearContents();
  sheet.appendRow(["Ngày", "Thứ", "Học sinh", "Nhiệm vụ phân công", "Trạng thái", "Nội dung hoàn thành", "Thời gian xong", "Ghi chú chỉnh sửa", "Link Ảnh"]);
  var header = sheet.getRange(1, 1, 1, 9);
  header.setBackground("#4f46e5").setFontColor("#ffffff").setFontWeight("bold");
  sheet.setFrozenRows(1);

  if (schedules && schedules.length > 0) {
    var rows = schedules.map(function(s) {
      var photoLink = (s.photos && s.photos.length > 0) ? s.photos.join(", ") : (s.photoBase64 ? "Có ảnh" : "");
      return [
        s.date || "",
        s.dayName || "",
        s.studentName || s.studentId || "",
        s.assignedTask || "",
        s.status === "completed" ? "ĐÃ HOÀN THÀNH" : "CHỜ TRỰC",
        s.taskContent || "",
        s.completedAt ? Utilities.formatDate(new Date(s.completedAt), "GMT+7", "yyyy-MM-dd HH:mm:ss") : "",
        s.isEditedByLPLD ? "Đã chỉnh sửa bởi LPLĐ" : "",
        photoLink
      ];
    });
    sheet.getRange(2, 1, rows.length, 9).setValues(rows);
  }
}

function updateStudentsSheet(ss, students) {
  var sheet = ss.getSheetByName("Danh_Sach_10A13");
  if (!sheet) return;
  sheet.clearContents();
  sheet.appendRow(["STT", "Mã HS", "Họ và Tên", "Lần trực gần nhất"]);
  var header = sheet.getRange(1, 1, 1, 4);
  header.setBackground("#059669").setFontColor("#ffffff").setFontWeight("bold");
  sheet.setFrozenRows(1);

  if (students && students.length > 0) {
    var rows = students.map(function(st, idx) {
      return [
        idx + 1,
        st.id || "",
        st.name || "",
        st.lastCleaned ? Utilities.formatDate(new Date(st.lastCleaned), "GMT+7", "yyyy-MM-dd") : "Chưa trực"
      ];
    });
    sheet.getRange(2, 1, rows.length, 4).setValues(rows);
  }
}

function getSheetRowsAsJson(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var rowObj = {};
    for (var j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = data[i][j];
    }
    rows.push(rowObj);
  }
  return rows;
}

function responseJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

/**
 * Tải ảnh chụp trực nhật lên Google Drive qua Apps Script Web App
 */
export async function uploadImageToGoogleDriveViaAppsScript(
  base64DataUrl: string,
  appsScriptUrl: string,
  folderId?: string,
  fileName?: string
): Promise<string> {
  const url = appsScriptUrl.trim();
  if (!url) throw new Error('Chưa cấu hình URL Google Apps Script Upload ảnh');

  const payload = {
    action: 'upload_image',
    base64: base64DataUrl,
    folderId: folderId ? folderId.trim() : '',
    fileName: fileName || `trucnhat_${Date.now()}.jpg`,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Máy chủ Apps Script phản hồi HTTP ${response.status}`);
  }

  const result = await response.json();
  if (result.status === 'success' && (result.downloadUrl || result.url)) {
    return result.downloadUrl || result.url;
  }
  throw new Error(result.message || 'Lỗi khi tải ảnh lên Google Drive');
}

/**
 * Tự động sao lưu dữ liệu toàn bộ hệ thống lên Google Drive
 */
export async function backupDataToGoogleDriveViaAppsScript(
  backupContent: string,
  appsScriptUrl: string,
  folderId?: string,
  fileName?: string
): Promise<{ status: string; fileName: string }> {
  const url = appsScriptUrl.trim();
  if (!url) throw new Error('Chưa cấu hình URL Google Apps Script');

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const actualFileName = fileName || `Backup_TrucNhat_10A13_${dateStr}.json`;

  const payload = {
    action: 'backup_data',
    backupContent,
    folderId: folderId ? folderId.trim() : '',
    fileName: actualFileName,
  };

  await fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });

  return { status: 'success', fileName: actualFileName };
}
