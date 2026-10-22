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

  // Clean .next before static export
  const nextDir = path.join(rootDir, '.next');
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
  }

  execSync('npx next build', {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      STATIC_EXPORT: 'true',
    },
  });

  // Ensure .nojekyll and CNAME exist in out/
  const outDir = path.join(rootDir, 'out');
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
