/**
 * Automatically downloads the standalone yt-dlp binary into ./bin/
 * during `npm install` (postinstall) so Linux/Windows servers (e.g. Natro, Plesk, cPanel, VPS)
 * work out-of-the-box without requiring root/apt access.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const binDir = path.join(process.cwd(), 'bin');
const isWin = process.platform === 'win32';
const binaryName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
const targetPath = path.join(binDir, binaryName);

// Standalone binary URLs (yt-dlp_linux includes its own Python runtime, so it doesn't even require python3 on shared hosts!)
const downloadUrl = isWin
  ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
  : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download yt-dlp: HTTP ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          if (!isWin) {
            try {
              fs.chmodSync(dest, 0o755);
            } catch {}
          }
          resolve();
        });
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  try {
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }
    if (fs.existsSync(targetPath)) {
      console.log(`[Vidnoria] ${binaryName} already exists in ./bin`);
      return;
    }
    console.log(`[Vidnoria] Downloading standalone ${binaryName} for ${process.platform}...`);
    await downloadFile(downloadUrl, targetPath);
    console.log(`[Vidnoria] Successfully installed ${binaryName} to ./bin`);
  } catch (err) {
    console.warn(`[Vidnoria] Warning: Could not auto-download yt-dlp (${err.message})`);
  }
}

main();
