#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const BACKUP_DIR = path.join(__dirname, '..', 'backups', `backup_${Date.now()}`);

const FILES_TO_BACKUP = [
  'runs.json',
  'journeys.json',
  'flows.json',
  'run-steps.json'
];

function backupData() {
  console.log('🔄 Starting JSON data backup...\n');

  // Create backup directory
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`✅ Created backup directory: ${BACKUP_DIR}\n`);
  }

  let backedUpCount = 0;
  let totalSize = 0;

  // Backup each file
  FILES_TO_BACKUP.forEach(filename => {
    const sourcePath = path.join(DATA_DIR, filename);
    const destPath = path.join(BACKUP_DIR, filename);

    if (fs.existsSync(sourcePath)) {
      try {
        const fileContent = fs.readFileSync(sourcePath, 'utf8');
        fs.writeFileSync(destPath, fileContent, 'utf8');

        const stats = fs.statSync(sourcePath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        totalSize += stats.size;

        console.log(`✅ Backed up: ${filename} (${sizeKB} KB)`);

        // Parse and show record count
        try {
          const data = JSON.parse(fileContent);
          if (Array.isArray(data)) {
            console.log(`   📊 Records: ${data.length}`);
          }
        } catch (e) {
          // Not valid JSON or not an array
        }

        backedUpCount++;
      } catch (error) {
        console.error(`❌ Failed to backup ${filename}:`, error.message);
      }
    } else {
      console.log(`⏭️  Skipped: ${filename} (not found)`);
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Backup completed!`);
  console.log(`📁 Location: ${BACKUP_DIR}`);
  console.log(`📊 Files backed up: ${backedUpCount}/${FILES_TO_BACKUP.length}`);
  console.log(`💾 Total size: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log('='.repeat(50));

  return BACKUP_DIR;
}

// Run backup if executed directly
if (require.main === module) {
  try {
    const backupPath = backupData();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Backup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = backupData;
