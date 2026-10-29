// Zero-dependency static server for the exported demo in out/ (created by `npm run build`).
// Usage: node scripts/serve.mjs [-p 3000]
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "out");
const args = process.argv.slice(2);
const flag = args.findIndex((a) => a === "-p" || a === "--port");
const port = Number(flag >= 0 ? args[flag + 1] : process.env.PORT) || 3000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

if (!existsSync(join(root, "index.html"))) {
  console.error(`No built demo found in ${root}.\nRun "npm run build" on a machine/drive where dependencies are installed, then copy the out/ folder here.`);
  process.exit(1);
}

const isFile = (p) => existsSync(p) && statSync(p).isFile();

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const base = resolve(root, "." + clean);
  if (base !== root && !base.startsWith(root + sep)) return null; // path traversal guard
  for (const candidate of [base, base + ".html", join(base, "index.html")]) if (isFile(candidate)) return candidate;
  return null;
}

createServer((req, res) => {
  const file = resolveFile(req.url ?? "/");
  const target = file ?? join(root, "404.html");
  res.writeHead(file ? 200 : 404, {
    "Content-Type": TYPES[extname(target)] ?? "application/octet-stream",
    "Cache-Control": target.includes(`${sep}_next${sep}static${sep}`) ? "public, max-age=31536000, immutable" : "no-cache",
  });
  createReadStream(target).pipe(res);
})
  .on("error", (e) => {
    console.error(e.code === "EADDRINUSE" ? `Port ${port} is already in use. Try: npm run dev -- -p 3001` : e.message);
    process.exit(1);
  })
  .listen(port, () => {
    console.log(`\n  Instagram AI Chatbot Demo (static build)\n  ▶ http://localhost:${port}\n\n  Serving ${root}\n  Press Ctrl+C to stop.\n`);
  });
