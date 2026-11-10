// Genera la app en ../sitio/dist a partir de src/mext-forge.html y src/sw.js (código fuente; no lo borres) y sube la versión del service worker.
// Uso (después de editar src/mext-forge.html):  node build.js   y luego, en ../sitio:  npx wrangler deploy
// Forge vive en https://mext-forge.mext-rafaga-sync.workers.dev. La raíz de este repo (matw1.github.io/mext-forge/)
// es solo una página fija de mudanza (index.html + sw.js que se da de baja): la app ya no se publica aquí.
const fs = require("fs"), path = require("path");
const dist = path.join(__dirname, "..", "sitio", "dist");
fs.rmSync(dist, { recursive: true, force: true }); fs.mkdirSync(dist, { recursive: true });
const src = fs.readFileSync(path.join(__dirname, "src", "mext-forge.html"), "utf8");

// ?v= en los íconos: el navegador guarda el ícono de la pestaña mucho tiempo; con la versión lo vuelve a pedir
const iv = Math.round(fs.statSync(path.join(__dirname, "icon-192.png")).mtimeMs).toString(36);
const head = `<link rel="manifest" href="manifest.webmanifest?v=${iv}">
<link rel="apple-touch-icon" href="icon-192.png?v=${iv}">`;
const mfPath = path.join(__dirname, "manifest.webmanifest"), mf = JSON.parse(fs.readFileSync(mfPath, "utf8"));
mf.icons = mf.icons.map(i => ({ ...i, src: i.src.replace(/\?v=.*$/, "") + "?v=" + iv }));
fs.writeFileSync(path.join(dist, "manifest.webmanifest"), JSON.stringify(mf, null, 2) + "\n");
for (const f of ["icon-192.png", "icon-512.png", "icon-maskable-512.png"]) fs.copyFileSync(path.join(__dirname, f), path.join(dist, f));
fs.mkdirSync(path.join(dist, "vendor"));
for (const f of ["pdf.min.js", "pdf.worker.min.js"]) fs.copyFileSync(path.join(__dirname, "vendor", f), path.join(dist, "vendor", f)); // lector de PDF del simulacro
// Registro del service worker + recarga automática cuando hay versión nueva
// (nunca en medio de una ronda ni con un campo de texto activo; antes guarda las respuestas).
const reg = `<script>
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  const hadSW = !!navigator.serviceWorker.controller;
  let pending = false, done = false;
  // La versión nueva espera a que termines lo que no se puede recuperar: una grabación 🎙️ en curso, una ronda a medias,
  // o que estés escribiendo (15 s sin teclear). Se reintenta cada 5 s; antes de recargar se guardan las respuestas (tSave).
  let typed = 0, composing = false;
  document.addEventListener("input", () => { typed = Date.now(); }, true);
  document.addEventListener("compositionstart", () => { composing = true; typed = Date.now(); }, true);
  document.addEventListener("compositionend", () => { composing = false; typed = Date.now(); }, true);
  const busy = () => {
    try { return !!auRec || composing || Date.now() - typed < 15000 || view === "drill"; }
    catch (e) { return false; }
  };
  window.__recargaOcupado = busy; // para pruebas
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
fs.writeFileSync(path.join(dist, "index.html"), out);

// Versión nueva del caché: así el teléfono descarga la app actualizada.
const sw = fs.readFileSync(path.join(__dirname, "src", "sw.js"), "utf8");
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
fs.writeFileSync(path.join(dist, "sw.js"), sw.replace(/const VERSION = '[^']*';/, `const VERSION = 'mext-forge-${stamp}';`));
console.log("listo en ../sitio/dist · caché mext-forge-" + stamp + " · ahora: cd ../sitio && npx wrangler deploy");
