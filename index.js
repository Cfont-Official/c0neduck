// index.js
import express from "express";
import { URL } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

function isAllowedHost(targetUrl) {
  try {
    const u = new URL(targetUrl);
    return u.hostname.endsWith("duckduckgo.com");
  } catch {
    return false;
  }
}

function rewriteHtml(html, targetOrigin) {
  let out = html;
  out = out.replace(/<meta[^>]+http-equiv=["']content-security-policy["'][^>]*>/gi, "");
  const baseTag = `<base href="${targetOrigin}">`;
  out = out.replace(/<head([^>]*)>/i, `<head$1>\n${baseTag}`);
  const enc = (u) => encodeURIComponent(u);
  out = out.replace(/href=(["'])(?!mailto:|#|javascript:)([^"']+)\1/gi, (m, q, href) => {
    let abs;
    try { abs = new URL(href, targetOrigin).toString(); } catch { abs = href; }
    return `href=${q}/proxy?url=${enc(abs)}${q}`;
  });
  out = out.replace(/action=(["'])([^"']*)\1/gi, (m, q, act) => {
    let abs;
    try { abs = new URL(act || "", targetOrigin).toString(); } catch { abs = act || targetOrigin; }
    return `action=${q}/proxy?url=${enc(abs)}${q}`;
  });
  return out;
}

app.get("/proxy", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("Missing url param");
  if (!isAllowedHost(url)) return res.status(403).send("Forbidden host");
  try {
    const r = await fetch(url, { headers: { "User-Agent": req.get("User-Agent") || "proxy" } });
    const type = r.headers.get("content-type") || "";
    if (!/text\/html/i.test(type)) {
      res.status(r.status);
      r.headers.forEach((v, k) => {
        if (/frame|content-security-policy/i.test(k)) return;
        res.set(k, v);
      });
      return r.body.pipe(res);
    }
    const html = await r.text();
    const origin = new URL(url).origin;
    const out = rewriteHtml(html, origin);
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(out);
  } catch (e) {
    console.error(e);
    res.status(500).send("Proxy error");
  }
});

app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>DuckDuckGo Proxy</title>
    <style>
      html, body { height:100%; margin:0; }
      iframe { width:100%; height:100%; border:none; }
    </style>
  </head>
  <body>
    <iframe src="/proxy?url=${encodeURIComponent("https://duckduckgo.com/")}" allowfullscreen></iframe>
  </body>
</html>`);
});

app.listen(PORT, () => console.log(`✅ Running on http://localhost:${PORT}`));
