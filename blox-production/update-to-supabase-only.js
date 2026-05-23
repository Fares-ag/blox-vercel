/**
 * Script to help identify all files that need to be updated
 * to remove API and localStorage fallbacks
 * 
 * Run this in Node.js to get a list of files to update
 */

const fs = require('fs');
const path = require('path');

const featuresDir = path.join(__dirname, 'packages/admin/src/modules/admin/features');

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath, fileList);
    } else if (file.endsWith('Page.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const pageFiles = findFiles(featuresDir);

console.log('Files to update:');
pageFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const hasApiService = content.includes('apiService');
  const hasLocalStorage = content.includes('localStorage');
  const hasSupabase = content.includes('supabaseApiService');
  
  if (hasApiService || hasLocalStorage) {
    console.log(`\n${file}`);
    if (hasApiService) console.log('  - Has apiService');
    if (hasLocalStorage) console.log('  - Has localStorage');
    if (hasSupabase) console.log('  - Has supabaseApiService (good!)');
  }
});

