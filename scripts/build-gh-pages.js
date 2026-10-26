/**
 * Builds the static Next.js export (out/) for GitHub Pages (https://vidnoria.com)
 * while preserving server-only API routes and proxy middleware in the repository.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const apiDir = path.join(rootDir, 'src', 'app', 'api');
const proxyFile = path.join(rootDir, 'src', 'proxy.ts');
const tmpDir = path.join(rootDir, '.tmp-server-backup');
const tmpApiDir = path.join(tmpDir, 'api');
const tmpProxyFile = path.join(tmpDir, 'proxy.ts');

function moveIfExists(src, dest) {
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true, force: true });
    fs.rmSync(src, { recursive: true, force: true });
    return true;
  }
  return false;
}

console.log('[gh-pages] Preparing static export build for vidnoria.com...');

let movedApi = false;
let movedProxy = false;

try {
  movedApi = moveIfExists(apiDir, tmpApiDir);
  movedProxy = moveIfExists(proxyFile, tmpProxyFile);

  const outDir = path.join(rootDir, 'out');

  // Pre-create out directory and all known route directories to prevent Windows EPERM race condition
  fs.mkdirSync(outDir, { recursive: true });
  const locales = ['tr', 'en', 'ar'];
  const baseRoutes = [
    'audio-cutter',
    'video-converter',
    'image-converter',
    'contact',
    'cookies',
    'copyright',
    'disclaimer',
    'download',
    'faq',
    'privacy',
    'terms',
    'blog',
    'blog/copyright-and-legal-downloads',
    'blog/how-to-download-tiktok-videos-without-watermark',
    'blog/instagram-video-download-guide',
    'blog/save-instagram-reels-with-audio-guide',
    'blog/youtube-video-download-guide',
    'blog/capcut-sablonu-filigransiz-video-indirme',
    'blog/pinterest-video-ve-gif-indirme-rehberi',
    'blog/instagram-hikaye-story-indirme-rehberi',
    'blog/twitter-x-video-ve-gif-indirme-kolay-yol',
  ];
  const platforms = [
    'youtube-video-downloader',
    'instagram-video-downloader',
    'tiktok-video-downloader',
    'facebook-video-downloader',
    'twitter-video-downloader',
    'pinterest-video-downloader',
    'reddit-video-downloader',
    'threads-video-downloader',
    'capcut-video-downloader',
    'snapchat-video-downloader',
    'youtube-video-indir',
    'youtube-mp3-indir',
    'youtube-shorts-indir',
    'instagram-video-indir',
    'instagram-reels-indir',
    'tiktok-video-indir',
    'facebook-video-indir',
    'twitter-video-indir',
    'pinterest-video-indir',
    'reddit-video-indir',
    'threads-video-indir',
    'capcut-video-indir',
    'snapchat-video-indir',
  ];

  for (const locale of locales) {
    fs.mkdirSync(path.join(outDir, locale), { recursive: true });
    for (const r of baseRoutes) {
      fs.mkdirSync(path.join(outDir, locale, r), { recursive: true });
    }
    for (const p of platforms) {
      fs.mkdirSync(path.join(outDir, locale, p), { recursive: true });
    }
  }
  fs.mkdirSync(path.join(outDir, 'admin'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'admin', 'dashboard'), { recursive: true });

  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  execSync(`${npxCmd} next build --webpack`, {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      STATIC_EXPORT: 'true',
    },
  });

  // Ensure .nojekyll and CNAME exist in out/
  if (fs.existsSync(outDir)) {
    fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
    fs.writeFileSync(path.join(outDir, 'CNAME'), 'vidnoria.com\n');
    console.log('[gh-pages] Static export ready in ./out with .nojekyll and CNAME (vidnoria.com)');
  }
} finally {
  if (movedApi) moveIfExists(tmpApiDir, apiDir);
  if (movedProxy) moveIfExists(tmpProxyFile, proxyFile);
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
