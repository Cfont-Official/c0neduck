import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname)); // serve index.html

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing url param");

  try {
    const response = await fetch(targetUrl);
    let html = await response.text();

    // allow embedding
    html = html
      .replace(/<head>/i, `<head><base href="${targetUrl}">`)
      .replace(/content-security-policy/gi, "x-content-security-policy")
      .replace(/X-Frame-Options/gi, "Disabled");

    res.send(html);
  } catch (err) {
    res.status(500).send("Error fetching target");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Running on port ${PORT}`));
