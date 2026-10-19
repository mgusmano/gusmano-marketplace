import http from 'node:http';

//let relayServer?: http.Server;
let relayServer: any;
let relayPort: number = 0;


function startRelayListener(): Promise<void> {
  //if (this.relayServer) { return Promise.resolve(); }
  relayServer = http.createServer((req: any, res: any) => {
    if (req.method === 'POST' && req.url === '/session-update') {
      let body = '';
      req.on('data', (c: Buffer) => {
        let b: any = c;
        const payload = JSON.parse(b || '{}');
        const text = String(payload.message ?? '');
        if (text !== '.') { body += c; }
      });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          //this.pokeTurnWatchdog();
          //this.postMessageToWebview({ type: 'progress', payload: { text: String(payload.message ?? '') } });
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end('{"ok":true}');
        } catch (err: any) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  return new Promise((resolve, reject) => {
    relayServer!.once('error', reject);
    relayServer!.listen(0, '127.0.0.1', () => {
      relayPort = (relayServer!.address() as { port: number }).port;
      //clog(`process-relay listener running`, 1, { port: this.relayPort });
      resolve();
    });
  });
}
