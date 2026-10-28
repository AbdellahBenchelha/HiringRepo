/**
 * The workroute.team gateway.
 *
 * Railway's Hobby plan allows two custom domains per service, and the main
 * service already has workroute.co.uk and www.workroute.co.uk. This is a
 * second, tiny service that owns workroute.team and hands every request to
 * the main service over Railway's private network, untouched: same path,
 * same headers, same Host. The main app sees "workroute.team" and serves the
 * team portal and team admin panel (see src/proxy.ts) from the data it
 * already holds. Nothing is stored here.
 *
 * Settings (Railway → this service → Variables):
 *   TARGET_URL     the main service on the private network, e.g.
 *                  http://${{WorkRoute.RAILWAY_PRIVATE_DOMAIN}}:8080
 *   ALLOWED_HOSTS  optional; default "workroute.team,www.workroute.team".
 *                  Anything else (the gateway's own *.up.railway.app address)
 *                  is sent to the first one instead of being served.
 *
 * No dependencies: Node's own http module only.
 */
import http from "node:http";

const PORT = Number(process.env.PORT || 8080);
const rawTarget = process.env.TARGET_URL?.trim();
if (!rawTarget) {
  console.error("[gateway] TARGET_URL is not set — e.g. http://${{WorkRoute.RAILWAY_PRIVATE_DOMAIN}}:8080");
  process.exit(1);
}
const target = new URL(rawTarget);
const ALLOWED = (process.env.ALLOWED_HOSTS || "workroute.team,www.workroute.team")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

// Headers that describe one connection, not the request. Passing them on
// would describe the wrong connection.
const HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-connection",
  "transfer-encoding",
  "upgrade",
  "te",
  "trailer",
  "proxy-authorization",
  "proxy-authenticate",
]);

// A fresh connection for every request. Reusing them looks cheaper, but the
// main app closes idle connections after a few seconds, and a request sent
// down one it has just closed fails ("ECONNRESET") — which showed up as page
// refreshes that silently did nothing. Inside the private network a new
// connection costs well under a millisecond.
const agent = new http.Agent({ keepAlive: false, maxSockets: 256 });

function unavailable(res) {
  res.writeHead(502, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      "<title>WorkRoute Team</title>" +
      '<div style="font:16px/1.6 Arial,sans-serif;max-width:480px;margin:15vh auto;padding:0 16px;color:#0f1035">' +
      "<h1 style=\"font-size:22px\">WorkRoute Team is restarting</h1>" +
      "<p>Please try again in a minute.</p></div>",
  );
}

const server = http.createServer((req, res) => {
  const hostHeader = req.headers.host || "";
  const host = hostHeader.split(":")[0].toLowerCase();

  if (req.url === "/__gateway/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }
  if (!ALLOWED.includes(host)) {
    res.writeHead(308, { Location: `https://${ALLOWED[0]}${req.url || "/"}` });
    res.end();
    return;
  }

  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) if (!HOP.has(k)) headers[k] = v;
  // What Railway's edge told us about the visitor, passed on as it was: the
  // main app reads the client address and the scheme from these.
  headers["x-forwarded-for"] ??= req.socket.remoteAddress ?? "";
  headers["x-forwarded-proto"] ??= "https";
  headers["x-forwarded-host"] ??= hostHeader;

  const upstream = http.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || 80,
      method: req.method,
      path: req.url,
      headers,
      agent,
    },
    (up) => {
      const out = [];
      for (let i = 0; i < up.rawHeaders.length; i += 2) {
        if (!HOP.has(up.rawHeaders[i].toLowerCase())) out.push(up.rawHeaders[i], up.rawHeaders[i + 1]);
      }
      res.writeHead(up.statusCode || 502, up.statusMessage, out);
      up.pipe(res);
    },
  );

  let visitorLeft = false;
  upstream.on("error", (err) => {
    // Stopped on purpose because the visitor went away (a browser cancels
    // page preloads all the time): nothing went wrong, nothing to report.
    if (visitorLeft) return;
    console.error(`[gateway] ${req.method} ${req.url} → ${err.code || err.message}`);
    if (!res.headersSent) unavailable(res);
    else res.destroy();
  });
  // The visitor gave up: stop the work on the other side too.
  res.on("close", () => {
    if (!res.writableFinished) {
      visitorLeft = true;
      upstream.destroy();
    }
  });
  req.pipe(upstream);
});

// Uploads (ticket screenshots, documents) can take a while on a phone.
server.requestTimeout = 5 * 60 * 1000;
server.headersTimeout = 65 * 1000;
server.keepAliveTimeout = 61 * 1000;

server.listen(PORT, () => {
  console.log(`[gateway] listening on ${PORT}, forwarding ${ALLOWED.join(", ")} → ${target.origin}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
