const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const securityEffect = `
  // Anti-Tamper Security Measures
  useEffect(() => {
    // 1. Chống chuột phải (Right-click)
    const handleContextMenu = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);

    // 2. Chống copy (Ctrl+C)
    const handleCopy = (e) => {
      e.preventDefault();
      // Optional: alert('Hành động copy không được phép!');
    };
    document.addEventListener('copy', handleCopy);

    // 3. Chống các phím tắt DevTools (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
    const handleKeyDown = (e) => {
      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
      }
      // Ctrl+Shift+I
      if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
      }
      // Ctrl+Shift+J
      if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
        e.preventDefault();
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
      }
      // Ctrl+S (Save as)
      if (e.ctrlKey && e.keyCode === 83) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // 4. Anti-Debugger Loop (Làm sập console nếu mở)
    const antiDebug = setInterval(() => {
      const start = performance.now();
      debugger;
      const end = performance.now();
      // Nếu debugger chạy, thời gian sẽ lớn hơn 100ms
      if (end - start > 100) {
        document.body.innerHTML = '<h1 style="color:red; text-align:center; margin-top:20%">Hệ thống phát hiện hành động can thiệp bất hợp pháp. Đã khóa phiên làm việc.</h1>';
      }
    }, 1000);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(antiDebug);
    };
  }, []);
`;

appCode = appCode.replace(/return \(\s*<Router>/, securityEffect + '\n  return (\n    <Router>');

fs.writeFileSync('src/App.tsx', appCode);
