const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

appCode = appCode.replace(
  /import PublicSchedule from '\.\/components\/PublicSchedule';/,
  "import PublicSchedule from './components/PublicSchedule';\nimport PhotoGallery from './components/PhotoGallery';"
);

appCode = appCode.replace(
  /<Route path="schedule" element=\{<ScheduleManager \/>\} \/>/,
  `<Route path="schedule" element={<ScheduleManager />} />
          <Route path="photos" element={<PhotoGallery />} />`
);

fs.writeFileSync('src/App.tsx', appCode);
