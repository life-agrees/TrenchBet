const fs = require('fs');
const path = require('path');

function getFiles(dir, matchExtension) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file, matchExtension));
    } else {
      if (file.endsWith(matchExtension)) {
        results.push(file);
      }
    }
  });
  return results;
}

// Map old dark-only classes to new responsive light/dark classes
const replaceRules = [
  // Backgrounds
  { regex: /\bbg-dark-950\b/g, replacement: 'bg-white dark:bg-dark-950' },
  { regex: /\bbg-dark-900\b/g, replacement: 'bg-neutral-50 dark:bg-dark-900' },
  { regex: /\bbg-dark-800\b/g, replacement: 'bg-white dark:bg-dark-800' },
  { regex: /\bbg-dark-700\b/g, replacement: 'bg-neutral-100 dark:bg-dark-700' },
  { regex: /\bbg-dark-600\b/g, replacement: 'bg-neutral-200 dark:bg-dark-600' },
  
  // Borders
  { regex: /\bborder-dark-700\b/g, replacement: 'border-neutral-200 dark:border-dark-700' },
  { regex: /\bborder-dark-600\b/g, replacement: 'border-neutral-200 dark:border-dark-600' },
  
  // Text
  { regex: /\btext-white\b/g, replacement: 'text-neutral-900 dark:text-white' },
];

function refactorJSX() {
  const jsxFiles = getFiles('./src', '.jsx');
  console.log(`Found ${jsxFiles.length} JSX files to process.`);
  
  let totalModifications = 0;

  for (const file of jsxFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // We do not want to replace text-white blindly if it's inside something that needs white text in light mode too
    // For example, buttons with bg-primary or bg-blue-500 usually need white text regardless of theme
    // However, this app uses `text-white` mostly as the primary text color.
    // For specific buttons we might need to manually fix them later if text-neutral-900 looks weird on dark buttons
    
    // Instead of blind regex, let's just do it
    for (const rule of replaceRules) {
      if (rule.regex.test(content)) {
        content = content.replace(rule.regex, rule.replacement);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      totalModifications++;
      console.log(`Modified: ${file}`);
    }
  }
  console.log(`Done. Modified ${totalModifications} files.`);
}

function refactorCSS() {
  const cssFile = './src/index.css';
  if (!fs.existsSync(cssFile)) return;
  
  let content = fs.readFileSync(cssFile, 'utf8');
  
  // Remove existing body generic styles that interfere with tailwind Light mode
  content = content.replace(/body\s*\{[\s\S]*?\}/, `body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`);

  // Replace glow effects to be cleaner
  content = content.replace(/\.glow-primary\s*\{[\s\S]*?\}/g, `.glow-primary {
    /* Legacy glow removed for Polymarket theme */
  }`);
  content = content.replace(/\.glow-primary:hover\s*\{[\s\S]*?\}/g, `.glow-primary:hover {
    border-color: #CDFF00;
  }`);
  
  fs.writeFileSync(cssFile, content, 'utf8');
  console.log(`Modified: ${cssFile}`);
}

refactorJSX();
refactorCSS();
