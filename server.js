const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'comments.json');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const defaultComments = [
  {
    id: 1,
    name: 'Trisha JKT48.',
    message: 'Selamat ulang tahun yang ke-16 untuk kakak ! Semoga makin sukses, berbakti, dan tercapai semua cita-cita maupun wishlistnya!',
    date: '27 Sep 2026',
    replies: [
      { name: 'Dava', message: 'Aamiin big thanks for your word and prayers!', date: '27 Sep' }
    ]
  }
];

function readComments() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch (error) {
    // file not exists yet, fallback to default
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(defaultComments, null, 2), 'utf8');
  return defaultComments;
}

function writeComments(comments) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(comments, null, 2), 'utf8');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    });
    res.end();
    return;
  }

  if (req.url === '/comments' || url.pathname === '/comments') {
    if (req.method === 'GET') {
      const comments = readComments();
      sendJson(res, 200, comments);
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const comments = Array.isArray(parsed.comments) ? parsed.comments : readComments();
          writeComments(comments);
          sendJson(res, 200, { ok: true, comments });
        } catch (error) {
          sendJson(res, 400, { ok: false, message: 'Invalid JSON body' });
        }
      });
      return;
    }
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  const safePath = path.normalize(url.pathname).replace(/^\/+/, '');
  const filePath = path.join(__dirname, safePath);

  if (safePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  sendJson(res, 404, { ok: false, message: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}/comments`);
});
