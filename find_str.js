const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.next') continue;
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      search(full);
    } else {
      try {
        const text = fs.readFileSync(full, 'utf8');
        if (text.includes('com.neocow.sunshadeuserhub')) {
          console.log("FOUND: " + full);
        } else if (text.includes('icu.sunshade.hub')) {
          console.log("ALREADY REPLACED: " + full);
        }
      } catch(e) {}
    }
  }
}
search('.');
console.log('done');
