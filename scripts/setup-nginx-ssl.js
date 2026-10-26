const { Client } = require('ssh2');

const conn = new Client();

const script = `
# 1. Install certbot
apt-get update -y
apt-get install -y certbot python3-certbot-nginx

# 2. Generate strong self-signed SSL cert for Cloudflare Full SSL mode
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/vidnoria.key \
  -out /etc/nginx/ssl/vidnoria.crt \
  -subj "/C=TR/ST=Istanbul/L=Istanbul/O=Vidnoria/OU=Production/CN=vidnoria.com"

# 3. Create full Nginx configuration supporting both HTTP (80) and HTTPS (443)
cat <<'EOF' > /etc/nginx/sites-available/vidnoria
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;

    server_name vidnoria.com www.vidnoria.com api.vidnoria.com _;

    ssl_certificate /etc/nginx/ssl/vidnoria.crt;
    ssl_certificate_key /etc/nginx/ssl/vidnoria.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/vidnoria /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
ufw allow 443/tcp 2>/dev/null || true
echo "=== NGINX SSL CONFIGURATION COMPLETE ==="
`;

conn
  .on('ready', () => {
    conn.exec(script, (err, stream) => {
      if (err) throw err;
      stream
        .on('close', () => conn.end())
        .on('data', (d) => process.stdout.write(d))
        .stderr.on('data', (d) => process.stderr.write(d));
    });
  })
  .connect({
    host: '45.74.243.99',
    username: 'root',
    password: '7upGWRCjWsnEHRk3',
  });
