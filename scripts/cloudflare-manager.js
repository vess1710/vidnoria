/**
 * Vidnoria - Otomatik Cloudflare Tünel & Medya Sunucusu Bekçisi (Watchdog)
 *
 * Görevleri:
 * 1. Yerel Next.js medya sunucusunu (localhost:3000 - yt-dlp + FFmpeg) kontrol eder, kapalıysa başlatır.
 * 2. Cloudflare HTTPS tünelini (bin/cloudflared.exe) başlatır ve canlı URL'yi yakalar.
 * 3. Yakalanan yeni HTTPS tünel adresini public/api-config.json dosyasına yazar ve GitHub'a otomatik pushlar.
 * 4. Her 45 saniyede bir tünelin ve sunucunun sağlığını (/api/health) kontrol eder; kopma olursa kendi kendine yeniden başlatıp yeni adresi GitHub'a senkronize eder.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CLOUDFLARED_BIN = path.join(ROOT, 'bin', 'cloudflared.exe');
const API_CONFIG_PATH = path.join(ROOT, 'public', 'api-config.json');
const CUSTOM_CONFIG_PATH = path.join(ROOT, 'content', 'settings', 'cloudflare-tunnel.json');

// Ensure Git & GitHub CLI are in PATH on Windows
const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\pc', 'AppData', 'Local');
process.env.PATH = `${process.env.PATH};${path.join(localAppData, 'Programs', 'MinGit', 'cmd')};C:\\Program Files\\GitHub CLI`;

let nextProcess = null;
let tunnelProcess = null;
let currentTunnelUrl = '';
let failedHealthChecks = 0;
let isSyncingGit = false;

function log(msg) {
  const time = new Date().toLocaleTimeString('tr-TR');
  console.log(`[${time}] [Vidnoria-Cloudflare] ${msg}`);
}

async function checkUrlHealth(url, timeoutMs = 6000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${url}/api/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureNextServer() {
  const healthy = await checkUrlHealth('http://localhost:3000', 3000);
  if (healthy) {
    return true;
  }

  if (nextProcess) {
    try {
      nextProcess.kill();
    } catch {}
    nextProcess = null;
  }

  log('Yerel medya sunucusu (localhost:3000) başlatılıyor...');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  nextProcess = spawn(npmCmd, ['run', 'dev'], {
    cwd: ROOT,
    stdio: 'ignore',
    shell: true,
    windowsHide: true,
  });

  nextProcess.on('exit', (code) => {
    log(`Yerel sunucu kapandı (kod: ${code}). Bekçi yeniden başlatacak.`);
    nextProcess = null;
  });

  // Wait up to 20 seconds for localhost:3000 to respond
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await checkUrlHealth('http://localhost:3000', 2000)) {
      log('Yerel medya sunucusu (yt-dlp + FFmpeg) hazır: http://localhost:3000');
      return true;
    }
  }

  log('Uyarı: localhost:3000 henüz yanıt vermedi, tekrar denenecek.');
  return false;
}

function syncTunnelUrlToGitHub(newUrl) {
  if (!newUrl || isSyncingGit) return;
  isSyncingGit = true;

  try {
    let existingUrl = '';
    if (fs.existsSync(API_CONFIG_PATH)) {
      try {
        existingUrl = JSON.parse(fs.readFileSync(API_CONFIG_PATH, 'utf8')).apiBaseUrl || '';
      } catch {}
    }

    const payload = JSON.stringify({ apiBaseUrl: newUrl }, null, 2) + '\n';
    fs.writeFileSync(API_CONFIG_PATH, payload, 'utf8');
    log(`api-config.json güncellendi -> ${newUrl}`);

    if (existingUrl !== newUrl) {
      log(`Yeni Cloudflare adresi GitHub (vidnoria.com) ile eşitleniyor...`);
      execSync('git add public/api-config.json', { cwd: ROOT, stdio: 'ignore' });
      try {
        execSync(`git commit -m "chore: auto-update active Cloudflare tunnel URL"`, {
          cwd: ROOT,
          stdio: 'ignore',
        });
      } catch {
        // Nothing to commit
      }
      execSync('git push origin main', { cwd: ROOT, stdio: 'ignore' });
      log(`GitHub senkronizasyonu tamamlandı! vidnoria.com artık yeni tünele bağlı.`);
    }
  } catch (err) {
    log(`GitHub senkronizasyon uyarısı: ${err.message}`);
  } finally {
    isSyncingGit = false;
  }
}

function startCloudflareTunnel() {
  if (tunnelProcess) {
    try {
      tunnelProcess.kill();
    } catch {}
    tunnelProcess = null;
  }

  // Check if user configured a permanent Cloudflare Named Tunnel token
  let customToken = process.env.CLOUDFLARE_TUNNEL_TOKEN || '';
  let customDomain = '';
  if (fs.existsSync(CUSTOM_CONFIG_PATH)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(CUSTOM_CONFIG_PATH, 'utf8'));
      if (cfg.token) customToken = cfg.token;
      if (cfg.domain) customDomain = cfg.domain;
    } catch {}
  }

  const args = customToken
    ? ['tunnel', '--no-autoupdate', 'run', '--token', customToken]
    : ['tunnel', '--url', 'http://localhost:3000', '--no-autoupdate'];

  log(`Cloudflare HTTPS tüneli başlatılıyor...`);
  tunnelProcess = spawn(CLOUDFLARED_BIN, args, {
    cwd: ROOT,
    windowsHide: true,
  });

  if (customToken && customDomain) {
    currentTunnelUrl = customDomain.startsWith('http') ? customDomain : `https://${customDomain}`;
    syncTunnelUrlToGitHub(currentTunnelUrl);
  }

  const handleOutput = (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && match[0]) {
      const detectedUrl = match[0].trim();
      if (detectedUrl !== currentTunnelUrl) {
        currentTunnelUrl = detectedUrl;
        failedHealthChecks = 0;
        log(`Canlı Cloudflare Tüneli Aktif: ${currentTunnelUrl}`);
        syncTunnelUrlToGitHub(currentTunnelUrl);
      }
    }
  };

  tunnelProcess.stdout.on('data', handleOutput);
  tunnelProcess.stderr.on('data', handleOutput);

  tunnelProcess.on('exit', (code) => {
    log(`Cloudflare tüneli kapandı (kod: ${code}). 5 saniye içinde yeniden başlatılıyor...`);
    tunnelProcess = null;
    currentTunnelUrl = '';
    setTimeout(() => startCloudflareTunnel(), 5000);
  });
}

async function startWatchdog() {
  log('==========================================================');
  log('Vidnoria Otomatik Cloudflare Tünel & Sunucu Yöneticisi');
  log('==========================================================');

  await ensureNextServer();

  // Check if a tunnel is already alive from api-config.json
  if (fs.existsSync(API_CONFIG_PATH)) {
    try {
      const saved = JSON.parse(fs.readFileSync(API_CONFIG_PATH, 'utf8')).apiBaseUrl;
      if (saved && (await checkUrlHealth(saved, 4000))) {
        currentTunnelUrl = saved;
        log(`Mevcut aktif Cloudflare tüneli bulundu ve çalışıyor: ${currentTunnelUrl}`);
      }
    } catch {}
  }

  if (!currentTunnelUrl) {
    startCloudflareTunnel();
  }

  // Periodic health check every 45 seconds
  setInterval(async () => {
    await ensureNextServer();

    if (!currentTunnelUrl) {
      failedHealthChecks++;
      if (failedHealthChecks >= 2 && !tunnelProcess) {
        startCloudflareTunnel();
      }
      return;
    }

    const tunnelOk = await checkUrlHealth(currentTunnelUrl, 6000);
    if (tunnelOk) {
      failedHealthChecks = 0;
    } else {
      failedHealthChecks++;
      log(`Tünel sağlık kontrolü başarısız (${failedHealthChecks}/2): ${currentTunnelUrl}`);
      if (failedHealthChecks >= 2) {
        log('Tünel bağlantısı yenileniyor...');
        failedHealthChecks = 0;
        startCloudflareTunnel();
      }
    }
  }, 45000);
}

startWatchdog();
