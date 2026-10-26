const { Client } = require('ssh2');

const cmd = process.argv.slice(2).join(' ') || 'uptime';

const conn = new Client();
conn
  .on('ready', () => {
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(err);
        conn.end();
        process.exit(1);
      }
      stream
        .on('close', (code) => {
          conn.end();
          process.exit(code || 0);
        })
        .on('data', (data) => process.stdout.write(data))
        .stderr.on('data', (data) => process.stderr.write(data));
    });
  })
  .on('error', (err) => {
    console.error('SSH Error:', err.message);
    process.exit(1);
  })
  .connect({
    host: '45.74.243.99',
    port: 22,
    username: 'root',
    password: '7upGWRCjWsnEHRk3',
    readyTimeout: 15000,
  });
