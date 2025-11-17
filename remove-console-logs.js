import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function removeConsoleLogs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Remove console.log statements (keep important console.error for debugging)
  const patterns = [
    // Match console.log with various formats
    /console\.log\([^)]*\);?\n?/g,
    // Match console.log with template literals
    /console\.log\(`[^`]*`\);?\n?/g,
    // Match console.log with objects
    /console\.log\({[^}]*}\);?\n?/g,
  ];

  patterns.forEach(pattern => {
    if (pattern.test(content)) {
      modified = true;
      content = content.replace(pattern, '');
    }
  });

  // Remove empty lines that were left behind
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Cleaned: ${path.relative(__dirname, filePath)}`);
    return true;
  }
  return false;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let totalCleaned = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      totalCleaned += processDirectory(filePath);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      if (removeConsoleLogs(filePath)) {
        totalCleaned++;
      }
    }
  });

  return totalCleaned;
}

const srcDir = path.join(__dirname, 'src');
console.log('🧹 Removing console.log statements...\n');
const cleaned = processDirectory(srcDir);
console.log(`\n✨ Done! Cleaned ${cleaned} files.`);
