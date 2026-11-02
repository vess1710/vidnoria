/**
 * Vidnoria VPS Tunnel Watchdog & Auto-Updater
 * 
 * Runs 24/7 on HepHosting VPS (45.74.243.99) under PM2.
 * 1. Spawns cloudflared quick tunnel pointing to http://127.0.0.1:3000
 * 2. Parses the active https://*.trycloudflare.com URL
 * 3. Immediately updates:
 *    - Local public/api-config.json
 *    - GitHub repository 'main' branch (public/api-config.json) via GitHub REST API
 *    - GitHub repository 'gh-pages' branch (api-config.json) via GitHub REST API
 * 4. Checks health every 25 seconds against ${activeUrl}/api/health
 * 5. Detects tunnel expiration ("Unauthorized: Tunnel not found", timeouts, process exit)
 *    and instantly spawns a brand new tunnel and syncs it to GitHub.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GITHUB_TOKEN\s*=\s*(.+)/);
    if (match && match[1]) return match[1].trim();
  }
  const tokenFile = path.join(ROOT_DIR, 'content', 'settings', 'tunnel-credentials.json');
  if (fs.existsSync(tokenFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
      if (parsed.githubToken) return parsed.githubToken;
    } catch {}
  }
  return '';
}

const GITHUB_REPO = 'vess1710/vidnoria';
const ROOT_DIR = path.resolve(__dirname, '..');
const LOCAL_CONFIG_PATH = path.join(ROOT_DIR, 'public', 'api-config.json');

let cloudflaredProc = null;
let currentTunnelUrl = '';
let consecutiveFailures = 0;
let isRestarting = false;
let checkInterval = null;

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [TunnelWatchdog] ${msg}`);
}

async function updateGitHubFile(branch, filePath, newContent, commitMsg) {
  const token = getGitHubToken();
  if (!token) {
    log(`[GitHub] No token provided, skipping remote sync for ${branch}:${filePath}`);
    return false;
  }

  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=${branch}`;
    const getRes = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Vidnoria-Watchdog',
      },
    });

    let sha = null;
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
      // If already same content, skip
      if (data.content) {
        try {
          const existingText = Buffer.from(data.content.replace(/\s/g, ''), 'base64').toString('utf8');
          if (existingText.trim() === newContent.trim()) {
            log(`[GitHub] ${branch}:${filePath} already up to date.`);
            return true;
          }
        } catch {}
      }
    }

    const putBody = {
      message: commitMsg,
      content: Buffer.from(newContent, 'utf8').toString('base64'),
      branch,
    };
    if (sha) {
      putBody.sha = sha;
    }

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Vidnoria-Watchdog',
      },
      body: JSON.stringify(putBody),
    });

    if (putRes.ok) {
      log(`[GitHub] Successfully updated ${branch}:${filePath}`);
      return true;
    } else {
      const errText = await putRes.text();
      log(`[GitHub] Failed to update ${branch}:${filePath} (HTTP ${putRes.status}): ${errText}`);
      return false;
    }
  } catch (err) {
    log(`[GitHub] Error updating ${branch}:${filePath}: ${err.message}`);
    return false;
  }
}

async function syncNewTunnelUrl(newUrl) {
  if (!newUrl || newUrl === currentTunnelUrl) return;
  currentTunnelUrl = newUrl;
  consecutiveFailures = 0;

  log(`>>> NEW TUNNEL URL DETECTED: ${newUrl} <<<`);

  const configJson = JSON.stringify({ apiBaseUrl: newUrl }, null, 2) + '\n';

  // 1. Update local file
  try {
    fs.mkdirSync(path.dirname(LOCAL_CONFIG_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_CONFIG_PATH, configJson, 'utf8');
    log(`Local api-config.json updated: ${LOCAL_CONFIG_PATH}`);
  } catch (e) {
    log(`Failed to write local api-config.json: ${e.message}`);
  }

  // 2. Update GitHub main branch
  await updateGitHubFile(
    'main',
    'public/api-config.json',
    configJson,
    `chore: auto-sync active Cloudflare tunnel URL [${newUrl}]`
  );

  // 3. Update GitHub gh-pages branch (vidnoria.com reads from /api-config.json)
  await updateGitHubFile(
    'gh-pages',
    'api-config.json',
    configJson,
    `deploy: auto-sync active Cloudflare tunnel URL to gh-pages [${newUrl}]`
  );

  await updateGitHubFile(
    'gh-pages',
    'public/api-config.json',
    configJson,
    `deploy: update public/api-config.json on gh-pages [${newUrl}]`
  );

  log(`Sync complete. vidnoria.com frontend will now route download requests to ${newUrl}`);
}

async function checkTunnelHealth() {
  if (!currentTunnelUrl || isRestarting) return;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${currentTunnelUrl}/api/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      if (consecutiveFailures > 0) {
        log(`Health check recovered! URL: ${currentTunnelUrl}`);
      }
      consecutiveFailures = 0;
      return true;
    } else {
      consecutiveFailures++;
      log(`Health check failed (HTTP ${res.status}) [${consecutiveFailures}/2] on ${currentTunnelUrl}`);
    }
  } catch (err) {
    consecutiveFailures++;
    log(`Health check network error: ${err.message} [${consecutiveFailures}/2] on ${currentTunnelUrl}`);
  }

  if (consecutiveFailures >= 2) {
    log(`Tunnel unhealthy for 2 consecutive checks. Forcing restart...`);
    restartTunnel();
  }
}

function startCloudflared() {
  if (isRestarting) return;

  const binPath = fs.existsSync('/usr/local/bin/cloudflared')
    ? '/usr/local/bin/cloudflared'
    : 'cloudflared';

  log(`Spawning cloudflared process (${binPath} tunnel --url http://127.0.0.1:3000 --no-autoupdate)...`);

  try {
    cloudflaredProc = spawn(binPath, [
      'tunnel',
      '--url',
      'http://127.0.0.1:3000',
      '--no-autoupdate',
    ]);
  } catch (err) {
    log(`Fatal: Failed to spawn cloudflared: ${err.message}`);
    setTimeout(startCloudflared, 5000);
    return;
  }

  const handleStreamData = (data) => {
    const text = data.toString();

    // Check for tunnel URL
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && match[0]) {
      const url = match[0].trim();
      if (url !== currentTunnelUrl) {
        syncNewTunnelUrl(url);
      }
    }

    // Check for expiration / authorization errors
    if (
      text.includes('Unauthorized: Tunnel not found') ||
      text.includes('Tunnel not found') ||
      text.includes('failed to connect to an edge')
    ) {
      log(`Detected cloudflared fatal error: ${text.trim().substring(0, 120)}`);
      restartTunnel();
    }
  };

  cloudflaredProc.stdout.on('data', handleStreamData);
  cloudflaredProc.stderr.on('data', handleStreamData);

  cloudflaredProc.on('exit', (code, signal) => {
    log(`cloudflared process exited (code=${code}, signal=${signal})`);
    cloudflaredProc = null;
    if (!isRestarting) {
      restartTunnel();
    }
  });

  cloudflaredProc.on('error', (err) => {
    log(`cloudflared process error: ${err.message}`);
    restartTunnel();
  });
}

function restartTunnel() {
  if (isRestarting) return;
  isRestarting = true;
  log(`Restarting tunnel process...`);

  if (cloudflaredProc) {
    try {
      cloudflaredProc.removeAllListeners();
      cloudflaredProc.kill('SIGKILL');
    } catch {}
    cloudflaredProc = null;
  }

  currentTunnelUrl = '';
  consecutiveFailures = 0;

  setTimeout(() => {
    isRestarting = false;
    startCloudflared();
  }, 3000);
}

// Start
log(`Starting Vidnoria VPS Tunnel Watchdog...`);
startCloudflared();

// Run health checks every 25 seconds
checkInterval = setInterval(checkTunnelHealth, 25000);

process.on('SIGTERM', () => {
  log('Received SIGTERM, stopping...');
  if (cloudflaredProc) {
    try { cloudflaredProc.kill(); } catch {}
  }
  clearInterval(checkInterval);
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT, stopping...');
  if (cloudflaredProc) {
    try { cloudflaredProc.kill(); } catch {}
  }
  clearInterval(checkInterval);
  process.exit(0);
});
