// ===== VLESS-WS-TLS 多优选域名版 =====
// 自动输出 8 条节点链接（你的域名 + 7 个优选域名）
const http = require('http');
const net = require('net');
const { WebSocket, createWebSocketStream } = require('ws');

// ================== 配置区（改这三行就行）====================
const UUID   = process.env.UUID   || "de04add9-5c68-4988-9ac1-0e2a7d94e58f"; // ← 改成你的UUID
const PORT   = process.env.PORT   || "23456";                                 // ← 端口（10000~65000之间的）
const DOMAIN = process.env.DOMAIN || "abc.yourdomain.com";                    // ← 托管到CF+开小黄云的域名
// ============================================================

// 7个优选域名
const BEST_DOMAINS = [
  "www.visa.com.hk",
  "www.visa.com.tw",
  "www.visa.cn",
  "cf.877774.xyz",
  "cmcc.877774.xyz",
  "ct.877774.xyz",
  "cu.877774.xyz"
];

// 通用生成链接函数
function generateVlessLink(address) {
  return `vless://${UUID}@${address}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F#${DOMAIN}-${address.split('.').join('-')}`;
}

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === `/${UUID}`) {
    let links = `${DOMAIN} 主域名：\n${generateVlessLink(DOMAIN)}\n\n`;
    links += "═════ 7个优选域名 ═════\n";
    BEST_DOMAINS.forEach(d => {
      links += `${generateVlessLink(d)}\n`;
    });
    links += `\n共 8 条节点链接（主域名 + 7优选）\n节点端口统一 443，实际后端端口 ${PORT}`;

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(links);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  ws.once('message', msg => {
    const [version] = msg;
    const id = msg.slice(1, 17);
    const cleanUuid = UUID.replace(/-/g, '');
    if (!id.every((v, i) => v === parseInt(cleanUuid.substr(i * 2, 2), 16))) return;

    let i = 17;
    i += 1 + msg.slice(i, i + 1).readUInt8(); // skip addr type + addr
    i += 2; // port
    const port = msg.slice(i - 2, i).readUInt16BE();
    const atyp = msg.slice(i - 3, i - 2).readUInt8();

    let host = '';
    if (atyp === 1) host = msg.slice(i - 7, i - 3).join('.');
    else if (atyp === 2) {
      const len = msg.slice(i - 3, i - 2).readUInt8();
      host = msg.slice(i - 2, i - 2 + len).toString();
    }

    ws.send(new Uint8Array([version, 0]));
    const duplex = createWebSocketStream(ws);
    net.connect(port, host, () => {
      this.write(msg.slice(i));
      duplex.pipe(this).pipe(duplex);
    }).on('error', () => ws.close());
  });
});

server.listen(PORT, () => {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                  VLESS-WS-TLS 8节点已启动！                  ║");
  console.log(`║ 主域名   : ${DOMAIN.padEnd(48)}║`);
  console.log(`║ 后端端口 : ${PORT.padEnd(48)}║`);
  console.log(`║ UUID     : ${UUID}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  console.log("════════════════════ 以下是完整的 8 条节点链接 ════════════════════\n");

  // 1. 主域名
  console.log("1️⃣ 主域名");
  console.log(generateLink(DOMAIN));
  console.log("");

  // 2~8. 7个优选域名
  BEST_DOMAINS.forEach((d, i) => {
    console.log(`${i + 2}️⃣ ${d}`);
    console.log(generateLink(d));
    console.log("");  // 
  });

  console.log("══════════════════════════════════════════════════════════════");
  console.log("↑ 上面共 8 条链接已全部输出，可直接全选复制到v2rayN");
  console.log("══════════════════════════════════════════════════════════════\n");
});
