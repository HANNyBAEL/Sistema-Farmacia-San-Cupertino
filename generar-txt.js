const fs = require('fs');
const path = require('path');

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.vscode', '.idea'];
const EXCLUDE_FILES = ['package-lock.json', 'yarn.lock', '.env', '*.log', '*.db'];
const OUTPUT_FILE = 'proyecto_completo.txt';

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        walkDir(filePath, fileList);
      }
    } else {
      if (!EXCLUDE_FILES.some(pat => file.includes(pat.replace('*', '')))) {
        fileList.push(filePath);
      }
    }
  });
  return fileList;
}

const allFiles = walkDir('.');
const output = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf8' });

allFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    output.write(`=== ${file} ===\n`);
    output.write(content);
    output.write('\n\n');
  } catch (e) {
    output.write(`=== ${file} ===\n`);
    output.write(`[Error al leer el archivo: ${e.message}]\n\n`);
  }
});

output.end();
console.log(`✅ Archivo generado: ${OUTPUT_FILE}`);