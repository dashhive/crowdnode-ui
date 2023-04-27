let cacheName = 'CrowdNodeUI';

let fileCache = [
  'assets/icons/dash-d-rounded-square-250.png',
  '/crowdnode-ui/',
  'manifest.json',
  'favicon.png',
  'index.css',
  'main.js',
  'sw.js',
  'CryptStore.js',
  'imports.js',
  'qr.js',
  'types.js',
  'utils.js',
  'lib/ui.js',
  'lib/storage.js',
  'components/format-to-dash.js',
  'components/dialogs/addwallet.js',
  'components/dialogs/encrypt.js',
  'components/dialogs/backup.js',
  'components/dialogs/qr.js',
  'components/dialogs/signup.js',
  'components/dialogs/stake.js',
  'components/dialogs/unstake.js',
  'components/dialogs/withdraw.js',
  'components/forms/add-private-key.js',
  'components/forms/backup.js',
  'components/forms/deposit.js',
  'components/forms/signup.js',
  'components/forms/stake.js',
  'components/forms/unstake.js',
  'components/forms/withdraw.js',
  'node_modules/@dashevo/dashcore-lib/dist/dashcore-lib.min.js',
  'node_modules/@root/request/urequest.js',
  'node_modules/qrcode-svg/dist/qrcode.min.js',
  'node_modules/dashkeys/dashkeys.js',
  'node_modules/dashhd/dashhd.js',
  'node_modules/dashphrase/dashphrase.js',
  'node_modules/dashsight/dashsight.js',
  'node_modules/dashsight/dashsocket.js',
  'node_modules/crowdnode/dashapi.js',
  'node_modules/crowdnode/crowdnode.js',
  'node_modules/@dashincubator/secp256k1/secp256k1.js',
  'node_modules/@dashincubator/base58check/base58check.js',
  'node_modules/@dashincubator/ripemd160/ripemd160.js',
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(cacheName).then((cache) => {
    // console.info(cacheName, 'installed successfully')
    return cache.addAll(fileCache);
  }));
});

self.addEventListener('fetch', function (event) {

  if (event.request.url.includes('clear-cache')) {
    caches.delete(cacheName);
    // console.info(cacheName, 'Cache cleared')
  }

  event.respondWith(
    caches.match(event.request)
      .then(function (response) {
        // if (response) {
        //   console.info(
        //     cacheName,
        //     'served from cache',
        //     event.request.url,
        //   )
        // } else {
        //   console.info(
        //     cacheName,
        //     'not using cache ',
        //     event.request.url,
        //   )
        // }
        return response || fetch(event.request);
      })
  )
})

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cachedKeys) {
      cachedKeys.map(keyName => {
        if (keyName !== cacheName) {
          // console.info(
          //   cacheName,
          //   'service worker: Removing old cache',
          //   keyName
          // );
          return caches.delete(keyName);
        }
      })
    })
  )
})