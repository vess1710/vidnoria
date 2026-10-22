/**
 * Vidnoria Self-Bootstrapping Node.js Entry Point (Natro / Plesk / cPanel / VPS)
 * Automatically ensures yt-dlp binary and .next production build exist before starting.
 */

const { createServer } = require('http');
const { parse } = require('url');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = '0.0.0.0';

// 1. Ensure standalone yt-dlp binary exists
try {
  require('./scripts/ensure-ytdlp.js');
} catch (e) {
  console.warn('[Vidnoria] ensure-ytdlp warning:', e.message);
}

// 2. Ensure production build (.next/BUILD_ID) exists
const buildIdPath = path.join(__dirname, '.next', 'BUILD_ID');
if (!fs.existsSync(buildIdPath)) {
  console.log('[Vidnoria] Production build (.next) not found. Building automatically...');
  try {
    execSync('npx next build', { stdio: 'inherit', cwd: __dirname });
    console.log('[Vidnoria] Production build completed successfully!');
  } catch (err) {
    console.error('[Vidnoria] Build failed, falling back to dev mode:', err.message);
  }
}

const hasBuild = fs.existsSync(buildIdPath);
const next = require('next');
const app = next({ dev: !hasBuild, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, () => {
    console.log(`> Vidnoria ready on http://${hostname}:${port} (mode: ${hasBuild ? 'production' : 'development'})`);
  });
});
