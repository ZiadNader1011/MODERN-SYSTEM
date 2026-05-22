import fs from 'fs';
import path from 'path';

const walkSync = (dir, callback) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      walkSync(p, callback);
    } else {
      callback(p);
    }
  }
};

walkSync('src', (p) => {
  if (p.endsWith('.tsx') || p.endsWith('.json')) {
    let content = fs.readFileSync(p, 'utf8');
    let original = content;
    // Remove "e.g. " and "مثال: " and "مثال:"
    content = content.replace(/e\.g\.\s/g, '');
    content = content.replace(/مثال:\s/g, '');
    content = content.replace(/مثال:/g, '');
    // Also remove "e.g." just in case
    content = content.replace(/e\.g\./g, '');

    if (content !== original) {
      fs.writeFileSync(p, content, 'utf8');
      console.log('Fixed', p);
    }
  }
});
