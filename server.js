const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 5555;
const SCRAPER_MEDIA_HOST = 'neoclone.screenscraper.fr';
const SCRAPER_MEDIA_PATH = '/api2';

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  console.log('Request:', pathname);

  if (pathname === '/proxy/media') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400, { 'Access-Control-Allow-Origin': '*' });
      res.end('Missing url parameter');
      return;
    }

    console.log('Proxying media:', targetUrl.substring(0, 80));

    const proxyReq = https.get(targetUrl, (proxyRes) => {
      const contentType = proxyRes.headers['content-type'] || 'image/png';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (e) => {
      console.error('Proxy error:', e.message);
      res.writeHead(502, { 'Access-Control-Allow-Origin': '*' });
      res.end('Proxy error: ' + e.message);
    });
    return;
  }

  let filepath = pathname === '/' ? '/index.html' : pathname;
  let fullPath = path.join('/home/koko004/IA/sd-scrapper', path.basename(filepath));

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + fullPath);
      return;
    }
    const ext = path.extname(fullPath);
    const contentTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`CORS Proxy running on http://localhost:${PORT}`);
  console.log(`Media proxy: http://localhost:${PORT}/proxy/media?url=<media_url>`);
});

setInterval(() => {}, 1000);