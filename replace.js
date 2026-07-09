const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (['node_modules', '.git', 'dist', '.next', '.expo'].includes(file)) continue;
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('com.neocow.sunshadeuserhub')) {
          console.log("Replaced in: " + fullPath);
          fs.writeFileSync(fullPath, content.split('com.neocow.sunshadeuserhub').join('icu.sunshade.hub'), 'utf8');
        }
      } catch (e) {}
    }
  }
}

walk(process.cwd());
console.log("Done");
