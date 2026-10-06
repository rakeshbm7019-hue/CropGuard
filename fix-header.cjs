const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

const reps = [
  { search: /\$\{activeThemeConfig\.headerAccent\}/g, replace: 'text-emerald-700 dark:text-emerald-400' },
  { search: /\$\{activeThemeConfig\.badgeBg\}/g, replace: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' },
  { search: /activeThemeConfig\.activeTabClass/g, replace: '"bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"' },
  { search: /\$\{activeThemeConfig\.activeTabClass\}/g, replace: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' }
];

for (const rep of reps) {
  code = code.replace(rep.search, rep.replace);
}

fs.writeFileSync('src/components/Header.tsx', code);
