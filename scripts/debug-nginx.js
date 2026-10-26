const { Client } = require('ssh2');

const conn = new Client();

conn
  .on('ready', () => {
    conn.exec('ls -la /etc/nginx/sites-enabled/; cat /etc/nginx/sites-enabled/*; nginx -T | grep -E "server_name|location|proxy_pass|listen"', (err, stream) => {
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
