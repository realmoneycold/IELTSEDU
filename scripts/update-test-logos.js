const fs = require('fs');
const path = require('path');

// Find all HTML files in Tests/practice directory
const practiceDir = path.join(__dirname, '..', 'Tests', 'practice');

function getAllHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllHtmlFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

const htmlFiles = getAllHtmlFiles(practiceDir);
console.log(`Found ${htmlFiles.length} HTML files to update\n`);

// The new logo HTML to insert (for main header logo)
const newLogoHtml = `<a href="/index.html" class="ielts-logo" style="display:flex;align-items:center;gap:8px;text-decoration:none;">
  <img src="/assets/skating-character.png" alt="IELTS Practice" style="height:36px;width:auto;object-fit:contain;">
  <span style="font-size:18px;font-weight:800;color:#1a1a2e;letter-spacing:-0.5px;white-space:nowrap;">IELTS<span style="color:#4a90e2;">PRACTICE</span></span>
</a>`;

// Patterns to replace (multiple variations found in files)
const patterns = [
  // Pattern 1: <span class="ielts-logo">IELTS<span class="logo-accent">PRACTICE</span></span>
  {
    regex: /<span class="ielts-logo">IELTS<span class="logo-accent">PRACTICE<\/span><\/span>/g,
    replacement: newLogoHtml
  },
  // Pattern 2: <div class="ielts-logo"><span class="ielts-logo-badge">IELTS</span>PRACTICE</div>
  {
    regex: /<div class="ielts-logo">\s*<span class="ielts-logo-badge">IELTS<\/span>PRACTICE\s*<\/div>/g,
    replacement: newLogoHtml
  },
  // Pattern 3: <a class="ielts-logo" href="#"><span class="ielts-logo-badge">IELTS</span>PRACTICE</a>
  {
    regex: /<a class="ielts-logo" href="#">\s*<span class="ielts-logo-badge">IELTS<\/span>PRACTICE\s*<\/a>/g,
    replacement: newLogoHtml
  },
  // Pattern 4: <div class="modal-logo">IELTS<span>PRACTICE</span></div>
  {
    regex: /<div class="modal-logo">IELTS<span>PRACTICE<\/span><\/div>/g,
    replacement: '<div class="modal-logo" style="display:flex;align-items:center;gap:8px;"><img src="/assets/skating-character.png" alt="IELTS Practice" style="height:32px;width:auto;"><span style="font-size:15px;font-weight:800;">IELTS<span style="background:#1a1a2e;color:#fff;padding:2px 6px;border-radius:4px;">PRACTICE</span></span></div>'
  },
  // Pattern 5: <div class="modal-logo"><span>IELTS</span>PRACTICE</div>
  {
    regex: /<div class="modal-logo"><span>IELTS<\/span>PRACTICE<\/div>/g,
    replacement: '<div class="modal-logo" style="display:flex;align-items:center;gap:8px;"><img src="/assets/skating-character.png" alt="IELTS Practice" style="height:32px;width:auto;"><span style="font-size:15px;font-weight:800;"><span style="background:#1a1a2e;color:#fff;padding:2px 6px;border-radius:4px;">IELTS</span>PRACTICE</span></div>'
  }
];

let updatedCount = 0;
let errorCount = 0;
let filesWithChanges = 0;

htmlFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fileUpdated = false;

    patterns.forEach(pattern => {
      const newContent = content.replace(pattern.regex, pattern.replacement);
      if (newContent !== content) {
        content = newContent;
        fileUpdated = true;
      }
    });

    // Only write if changed
    if (fileUpdated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Updated: ${path.relative(practiceDir, filePath)}`);
      filesWithChanges++;
    } else {
      console.log(`- No changes: ${path.relative(practiceDir, filePath)}`);
    }
    updatedCount++;
  } catch (error) {
    console.error(`✗ Error updating ${filePath}: ${error.message}`);
    errorCount++;
  }
});

console.log(`\n${'='.repeat(50)}`);
console.log(`Summary:`);
console.log(`  - Total files processed: ${updatedCount}`);
console.log(`  - Files updated: ${filesWithChanges}`);
console.log(`  - Files unchanged: ${updatedCount - filesWithChanges}`);
console.log(`  - Errors: ${errorCount}`);
console.log(`${'='.repeat(50)}`);
