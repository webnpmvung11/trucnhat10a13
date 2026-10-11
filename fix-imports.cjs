const fs = require('fs');

let psCode = fs.readFileSync('src/components/PublicSchedule.tsx', 'utf8');

if (!psCode.includes('ChevronLeft')) {
  psCode = psCode.replace(
    /import \{ CheckCircle2 \} from 'lucide-react';/,
    "import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';"
  );
} else if (!/import.*ChevronLeft.*lucide-react/.test(psCode)) {
  psCode = psCode.replace(
    /import \{ ([^}]+) \} from 'lucide-react';/,
    "import { $1, ChevronLeft, ChevronRight } from 'lucide-react';"
  );
}

fs.writeFileSync('src/components/PublicSchedule.tsx', psCode);
