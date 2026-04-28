const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5566;

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  let filepath = urlPath === '/' ? '/arkos-cover-manager.html' : urlPath;
  let fullPath = path.join('/home/koko004/IA/sd-scrapper', path.basename(filepath));
  
  console.log(`Serving: ${fullPath}`);
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      console.log(`Error: ${err.message}`);
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(fullPath);
    const contentTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

setInterval(() => {}, 1000);