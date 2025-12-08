process.on("uncaughtException",()=>{});process.on("unhandledRejection",()=>{});

const UUID   = (process.env.UUID   ?? "0cbbd5b1-2ba6-405f-b71d-03c92cb7b6e8").trim();
const DOMAIN = (process.env.DOMAIN ?? "demo.example.com").trim();
const PORT   = Number(process.env.PORT) || 0;

const http = require("http");
const net  = require("net");
const {WebSocket} = require("ws");

const ADDR = ["www.visa.cn","usa.visa.com","time.is","www.wto.org"];
const hex  = UUID.replace(/-/g,"");

const server = http.createServer((req,res)=>{
  if(req.url===`/${UUID}`){
    res.end(ADDR.map(a=>`vless://${UUID}@${a}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F#DA-${a}`).join("\n")+"\n");
  }else{
    res.end("OK");
  }
});


const wss = new WebSocket.Server({server});

wss.on("connection",ws=>{
  ws.once("message",m=>{
    try{
      for(let i=0;i<16;i++)if(m[1+i]!==parseInt(hex.substr(i*2,2),16))return ws.close();
      let p=17;
      const atyp=m[p++];
      let host="";
      if(atyp===1)host=`${m[p++]}.${m[p++]}.${m[p++]}.${m[p++]}`;
      else if(atyp===2){const l=m[p++];host=new TextDecoder().decode(m.slice(p,p+=l));}
      else return ws.close();
      const port=m.readUInt16BE(p);
      ws.send(new Uint8Array([m[0],0]));
      const r=net.connect(port,host,()=>{r.write(m.slice(p+2))});
      ws.on("message",d=>r.write(d));
      r.on("data",d=>ws.send(d));
      r.on("error",()=>ws.close());
      ws.on("close",()=>r.destroy());
    }catch{ws.close()}
  });
});

server.listen(PORT,"127.0.0.1",()=>{
  console.log(`VLESS 运行正常 → 127.0.0.1:${server.address().port}`);
});
