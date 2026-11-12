// Servidor da página de download do APK na rede local.
// Uso: npm run apk:share  (porta padrão 8080; mude com PORT=xxxx)
import { createServer } from "node:http";
import { createReadStream, readFileSync, statSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const APK = join(here, "..", "EstoqueDaCasa.apk");
const PAGE = join(here, "index.html");
const PORT = Number(process.env.PORT) || 8080;

const lanIp = () =>
  Object.values(networkInterfaces())
    .flat()
    .find((n) => n && n.family === "IPv4" && !n.internal && !/^(docker|br-|veth)/.test(n.address))?.address ?? "localhost";

const apkInfo = () => {
  try {
    const s = statSync(APK);
    return { size: s.size, mtime: s.mtime.toISOString() };
  } catch {
    return null;
  }
};

createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/" || url.pathname === "/index.html") {
    const info = apkInfo();
    const html = readFileSync(PAGE, "utf8").replace(
      "/*__CONFIG__*/",
      `window.APK_CONFIG = ${JSON.stringify({ lanUrl: `http://${lanIp()}:${PORT}/`, apk: info })};`,
    );
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(html);
  }
  if (url.pathname === "/EstoqueDaCasa.apk") {
    const info = apkInfo();
    if (!info) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("APK não encontrado. Gere com: npm run android:apk");
    }
    res.writeHead(200, {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Length": info.size,
      "Content-Disposition": 'attachment; filename="EstoqueDaCasa.apk"',
      "Cache-Control": "no-store",
    });
    console.log(`⬇  download para ${req.socket.remoteAddress}`);
    return createReadStream(APK).pipe(res);
  }
  if (url.pathname === "/icon.svg") {
    res.writeHead(200, { "Content-Type": "image/svg+xml" });
    return createReadStream(join(here, "..", "public", "icon.svg")).pipe(res);
  }
  res.writeHead(404).end();
}).listen(PORT, "0.0.0.0", () => {
  const u = `http://${lanIp()}:${PORT}/`;
  console.log(`\n📦 Página de download do APK no ar\n\n   No PC:      http://localhost:${PORT}/\n   No celular: ${u}  (mesma rede Wi-Fi)\n\n   Ctrl+C para parar.\n`);
});
