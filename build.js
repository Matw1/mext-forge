// Genera pwa/index.html a partir de src/mext-forge.html (código fuente de la app; no lo borres) y sube la versión del service worker.
// Uso (después de editar src/mext-forge.html):  node build.js
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "src", "mext-forge.html"), "utf8");

// ?v= en los íconos: el navegador guarda el ícono de la pestaña mucho tiempo; con la versión lo vuelve a pedir
const iv = Math.round(fs.statSync(path.join(__dirname, "icon-192.png")).mtimeMs).toString(36);
const head = `<link rel="manifest" href="manifest.webmanifest?v=${iv}">
<link rel="apple-touch-icon" href="icon-192.png?v=${iv}">`;
const mfPath = path.join(__dirname, "manifest.webmanifest"), mf = JSON.parse(fs.readFileSync(mfPath, "utf8"));
mf.icons = mf.icons.map(i => ({ ...i, src: i.src.replace(/\?v=.*$/, "") + "?v=" + iv }));
fs.writeFileSync(mfPath, JSON.stringify(mf, null, 2) + "\n");
// Registro del service worker + recarga automática cuando hay versión nueva
// (nunca en medio de una ronda ni con un campo de texto activo; antes guarda las respuestas).
const reg = `<script>
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  const hadSW = !!navigator.serviceWorker.controller;
  let pending = false, done = false;
  const focused = () => { const a = document.activeElement; return !!(a && a.closest && a.closest("input,textarea")); };
  const busy = () => (typeof view !== "undefined" && (view === "drill" || view === "simu")) || focused();
  const tryReload = () => {
    if (!pending || done || busy()) return;
    done = true;
    try { if (typeof tSave === "function") tSave(true); } catch (e) {}
    location.reload();
  };
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!hadSW) return; pending = true; tryReload(); });
  setInterval(tryReload, 5000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    tryReload();
    navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {});
  });
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  // versión nueva: se revisa cada minuto mientras la app está a la vista (antes solo al volver a abrirla)
  const check = () => navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {});
  setInterval(() => { if (!document.hidden) check(); }, 60000);
  window.addEventListener("online", check);
}
</script>`;

let out = src
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/png" href="icon-192.png?v=${iv}">\n${head}`)
  .replace("</body>", `${reg}\n</body>`);
if (!out.includes("manifest.webmanifest") || !out.includes("serviceWorker")) throw new Error("No se pudo inyectar el manifiesto o el service worker");
fs.writeFileSync(path.join(__dirname, "index.html"), out);

// Versión nueva del caché: así el teléfono descarga la app actualizada.
const swPath = path.join(__dirname, "sw.js");
const sw = fs.readFileSync(swPath, "utf8");
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
fs.writeFileSync(swPath, sw.replace(/const VERSION = '[^']*';/, `const VERSION = 'mext-forge-${stamp}';`));
console.log("index.html listo · caché mext-forge-" + stamp);
