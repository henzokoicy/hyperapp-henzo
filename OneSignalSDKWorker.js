// ============================================================
// Service worker de la Super App
// 1) Mode hors ligne : l'app s'ouvre même sans internet (les fichiers de l'app sont
//    gardés en mémoire à chaque visite). Réseau d'abord, mémoire en secours : tu as
//    toujours la dernière version quand tu es en ligne, jamais de vieille version bloquée.
//    Rien de ce qui touche à la base de données ou aux paiements n'est gardé.
// 2) Notifications push : fournies par OneSignal (la ligne importScripts tout en bas
//    doit rester là, c'est elle qui fait marcher les rappels sur le téléphone).
// ============================================================
const HZ_CACHE = 'henzo-shell-v1';
const HZ_CDN = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com'];
const HZ_ATTENTE = 6000; // au bout de 6 s sans réponse, on sert la version gardée

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const noms = await caches.keys();
      await Promise.all(noms.filter(n => n.indexOf('henzo-shell-') === 0 && n !== HZ_CACHE).map(n => caches.delete(n)));
    } catch (e) {}
  })());
});

self.addEventListener('fetch', event => {
  const r = event.request;
  if (r.method !== 'GET' || r.headers.has('range')) return;
  let u; try { u = new URL(r.url); } catch (e) { return; }
  const memeSite = u.origin === self.location.origin;
  if (!memeSite && HZ_CDN.indexOf(u.hostname) < 0) return;            // base de données, IA, paiements : jamais touchés
  if (memeSite && /^\/OneSignalSDK/.test(u.pathname)) return;         // les fichiers du service worker eux-mêmes
  event.respondWith(hzRepondre(r));
});

async function hzRepondre(r) {
  const nav = r.mode === 'navigate';
  let cache = null, gardee = null;
  try { cache = await caches.open(HZ_CACHE); gardee = await cache.match(r); } catch (e) {}
  const reseau = fetch(r).then(rep => {
    if (cache && rep && (rep.ok || rep.type === 'opaque')) { try { cache.put(r, rep.clone()).catch(() => {}); } catch (e) {} }
    return rep;
  });
  const secours = async () => {
    if (gardee) return gardee;
    if (nav && cache) { const accueil = (await cache.match('/index.html')) || (await cache.match('/')); if (accueil) return accueil; }
    return Response.error();
  };
  if (!gardee) return reseau.catch(secours);
  reseau.catch(() => {});
  return Promise.race([reseau, new Promise(ok => setTimeout(() => ok(gardee), HZ_ATTENTE))]).catch(secours);
}

importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
