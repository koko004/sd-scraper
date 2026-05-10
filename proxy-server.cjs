const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');

const app = express();
app.use(cors());

app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  const protocol = targetUrl.startsWith('https') ? https : http;

  protocol.get(targetUrl, (proxyRes) => {
    if (proxyRes.statusCode === 301 || proxyRes.statusCode === 302) {
      const redirectUrl = proxyRes.headers.location;
      if (redirectUrl) {
        const newProtocol = redirectUrl.startsWith('https') ? https : http;
        newProtocol.get(redirectUrl, (redirRes) => {
          res.setHeader('Content-Type', redirRes.headers['content-type'] || '');
          redirRes.pipe(res);
        });
        return;
      }
    }

    res.setHeader('Content-Type', proxyRes.headers['content-type'] || '');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (proxyRes.headers['content-length']) {
      res.setHeader('Content-Length', proxyRes.headers['content-length']);
    }
    if (proxyRes.headers['last-modified']) {
      res.setHeader('Last-Modified', proxyRes.headers['last-modified']);
    }
    if (proxyRes.headers['etag']) {
      res.setHeader('ETag', proxyRes.headers['etag']);
    }
    proxyRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).send(err.message);
  });
});

const PORT = 5567;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));