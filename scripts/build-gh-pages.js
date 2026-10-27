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
  const exportDir = path.join(rootDir, '.next-export');
  const nextDir = path.join(rootDir, '.next');

  // Clean previous build outputs
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
  if (fs.existsSync(exportDir)) fs.rmSync(exportDir, { recursive: true, force: true });
  if (fs.existsSync(nextDir)) fs.rmSync(nextDir, { recursive: true, force: true });

  const nextBin = path.join(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next');
  execSync(`"${process.execPath}" "${nextBin}" build --webpack`, {
    cwd: rootDir,
    stdio: 'inherit',
    env: Object.assign({}, process.env, {
      STATIC_EXPORT: 'true',
    }),
  });

  // Ensure .nojekyll and CNAME exist in build output
  const targetDir = fs.existsSync(exportDir) ? exportDir : outDir;
  if (fs.existsSync(targetDir)) {
    fs.writeFileSync(path.join(targetDir, '.nojekyll'), '');
    fs.writeFileSync(path.join(targetDir, 'CNAME'), 'vidnoria.com\n');
    console.log(`[gh-pages] Static export ready in ${targetDir} with .nojekyll and CNAME (vidnoria.com)`);
  }
} finally {
  if (movedApi) moveIfExists(tmpApiDir, apiDir);
  if (movedProxy) moveIfExists(tmpProxyFile, proxyFile);
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
