const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');

const filesToDownload = [
  {
    url: 'https://raw.githubusercontent.com/GihanPasidu/WA-BOT/main/index.js',
    destination: 'index.js'
  }
];

const downloadFile = async (url, destination) => {
  try {
    // Create write stream first to catch potential permission errors
    const writer = fs.createWriteStream(path.resolve(__dirname, destination));
    
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    // Return promise to track completion
    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.log(`⚠️ Error downloading ${destination}:`, error.message);
    // Exit process on critical file download failure
    process.exit(1); 
  }
};

const startIndex = () => {
  // Start index.js in current working directory
  const proc = spawn('node', ['index.js'], {
    stdio: 'inherit'
  });
  
  // Handle process errors
  proc.on('error', (err) => {
    console.error('Failed to start index.js:', err);
    process.exit(1);
  });
};

const downloadAllFiles = async () => {
  try {
    // Download all files
    await Promise.all(filesToDownload.map(file => 
      downloadFile(file.url, file.destination)
    ));
    console.log('✅ Files downloaded successfully.');
    return true;
  } catch (error) {
    console.error('❌ Error downloading files:', error);
    process.exit(1);
  }
};

// Startup sequence
console.log('🔄 Starting download...');
downloadAllFiles()
  .then(() => {
    console.log('🔄 Starting index.js...');
    startIndex();
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });