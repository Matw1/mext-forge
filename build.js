// Genera pwa/index.html a partir de ../mext-forge.html y sube la versión del service worker.
// Uso (después de editar mext-forge.html):  node build.js
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "mext-forge.html"), "utf8");

const head = `<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-192.png">`;
const reg = `<script>
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
</script>`;

let out = src
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="icon-192.png">\n${head}`)
  .replace("</body>", `${reg}\n</body>`);
if (!out.includes("manifest.webmanifest") || !out.includes("serviceWorker")) throw new Error("No se pudo inyectar el manifiesto o el service worker");
fs.writeFileSync(path.join(__dirname, "index.html"), out);

// Versión nueva del caché: así el teléfono descarga la app actualizada.
const swPath = path.join(__dirname, "sw.js");
const sw = fs.readFileSync(swPath, "utf8");
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
fs.writeFileSync(swPath, sw.replace(/const VERSION = '[^']*';/, `const VERSION = 'mext-forge-${stamp}';`));
console.log("index.html listo · caché mext-forge-" + stamp);
