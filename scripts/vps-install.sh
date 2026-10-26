#!/usr/bin/env bash
# ==============================================================================
# Vidnoria VPS Otomatik Kurulum ve Dağıtım Betiği (HepHosting / Ubuntu / Debian)
# ==============================================================================
set -e

echo "=========================================================="
echo "  VIDNORIA PRODUCTION VPS KURULUMU BAŞLATILIYOR...        "
echo "=========================================================="

# 1. Sistem Güncellemesi ve Temel Paketler
echo "[1/6] Sistem paketleri güncelleniyor ve bağımlılıklar kuruluyor..."
apt update -y
apt install -y curl wget git ffmpeg python3 python3-pip ca-certificates gnupg ufw

# 2. En Güncel yt-dlp Kurulumu
echo "[2/6] yt-dlp medya motoru kuruluyor..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp

# 3. Node.js 22 (LTS) ve PM2 Kurulumu
echo "[3/6] Node.js 22 LTS ve PM2 süreç yöneticisi kuruluyor..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
fi
npm install -g pm2

# 4. Vidnoria Kod Deposunun İndirilmesi
echo "[4/6] Vidnoria deposu /var/www/vidnoria konumuna çekiliyor..."
mkdir -p /var/www
if [ -d "/var/www/vidnoria/.git" ]; then
    cd /var/www/vidnoria
    git fetch origin main
    git reset --hard origin/main
else
    rm -rf /var/www/vidnoria
    git clone https://github.com/vess1710/vidnoria.git /var/www/vidnoria
    cd /var/www/vidnoria
fi

# 5. Ortam Değişkenleri (.env) Yapılandırması
echo "[5/6] Ortam değişkenleri yapılandırılıyor..."
if [ ! -f "/var/www/vidnoria/.env" ]; then
    cat <<EOF > /var/www/vidnoria/.env
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
ADMIN_PASSWORD=VidnoriaSecure2026!
ADMIN_SECRET=vidnoria-hephosting-prod-secret-$(openssl rand -hex 16)
NEXT_PUBLIC_SITE_URL=https://vidnoria.com
EOF
fi

# 6. Bağımlılıkların Kurulması ve Üretim Derlemesi
echo "[6/6] Proje bağımlılıkları yükleniyor ve derleniyor (next build)..."
cd /var/www/vidnoria
npm install
npm run build

# PM2 ile 7/24 Arka Planda Başlatma ve Sistem Açılışına Ekleme
echo "PM2 servisi başlatılıyor..."
pm2 delete vidnoria 2>/dev/null || true
pm2 start npm --name "vidnoria" -- start
pm2 save
pm2 startup | tail -n 1 | bash 2>/dev/null || true

# Güvenlik Duvarı İzinleri (Port 3000, 80, 443, 22)
ufw allow 22/tcp 2>/dev/null || true
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true
ufw allow 3000/tcp 2>/dev/null || true

SERVER_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')

echo "=========================================================="
echo "  VIDNORIA SUNUCU KURULUMU BAŞARIYLA TAMAMLANDI!          "
echo "=========================================================="
echo "Sunucu IP Adresiniz: http://${SERVER_IP}:3000"
echo "Yönetim Paneli:      http://${SERVER_IP}:3000/admin"
echo "Şifreniz:            VidnoriaSecure2026!"
echo ""
echo "Artık yerel bilgisayarınızdaki tüm süreçleri kapatabilirsiniz."
echo "Vidnoria 7/24 HepHosting sanal sunucunuz üzerinden kesintisiz çalışacaktır."
echo "=========================================================="
