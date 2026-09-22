/* DHC — Reprise de devis Vertuoza : service worker.
   Ce fichier n'a plus besoin d'être modifié à chaque livraison :
   la version de l'application est lue directement dans index.html,
   et la page d'accueil est toujours revalidée auprès du serveur. */
var CACHE = 'dhc-vertuoza-app';
var COQUILLE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icone-192.png',
  './icone-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(COQUILLE.map(function(u){
        return c.add(new Request(u, {mode:'cors'})).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

/* Nettoie les anciens caches numérotés (dhc-vertuoza-v2 … v22). */
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(cles){
      return Promise.all(cles.filter(function(k){ return k !== CACHE; })
                            .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  if(req.url.indexOf('api.anthropic.com') > -1) return;   /* jamais de cache sur l'IA */
  if(req.url.indexOf('supabase.co') > -1) return;         /* ni sur la base de prix */
  if(req.url.indexOf('verif-version') > -1) return;       /* la vérification va au serveur */

  /* Page d'accueil : toujours revalidée, le cache ne sert qu'hors connexion. */
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(new Request(req.url, {cache:'no-cache', credentials:'same-origin'})).then(function(r){
        if(r && r.ok){
          var copie = r.clone();
          caches.open(CACHE).then(function(c){ c.put('./index.html', copie); });
        }
        return r;
      }).catch(function(){ return caches.match('./index.html'); })
    );
    return;
  }

  /* Bibliothèques et icônes : versionnées, le cache d'abord. */
  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(r){
        if(r && r.status === 200){
          var copie = r.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copie); });
        }
        return r;
      }).catch(function(){ return hit; });
    })
  );
});
