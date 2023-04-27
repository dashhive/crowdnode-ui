import { getEncryptedStorage, } from '../CryptStore.js';
import { generateRecoveryPhrase, } from '../utils.js';

export const SK = 'selectedKey'
export const KEY_PREFIX = 'dk__'
export const ENCRYPT_IV = 'encryptage'
export const STOREAGE_SALT = 'tabasco hardship tricky blimp doctrine'

export let rememberMe = JSON.parse(localStorage.getItem('remember'))
export let fiatCurrency = localStorage.getItem('selectedFiat')
export let encryptedStore

let passphrase

if (rememberMe === null) {
  localStorage.setItem('remember', 'true')
  rememberMe = true
}

if (fiatCurrency === null) {
  localStorage.setItem('selectedFiat', 'USD')
  fiatCurrency = 'USD'
}

export let store = rememberMe ? localStorage : sessionStorage
export const isStoreEncrypted = !!(await store.getItem(`${ENCRYPT_IV}_iv`))
export async function initEncryptedStore(pass) {
  let tmpStore = await getEncryptedStorage(
    store,
    pass,
    STOREAGE_SALT,
    ENCRYPT_IV
  )
  if (passphrase !== pass || !encryptedStore) {
    encryptedStore = tmpStore
  }
  passphrase = pass
  return encryptedStore
}

export async function getPrivateKey(addr, pass) {
  let $s = store

  if (pass) {
    $s = await initEncryptedStore(pass)
  }

  let phraseOrWif = await $s.getItem(KEY_PREFIX+addr)
  let { wif } = await generateRecoveryPhrase(phraseOrWif)
  return wif
}

export async function getStoredKeys(pass) {
  let keys = []
  let $s = store

  if (pass) {
    $s = await initEncryptedStore(pass)
  }

  for(let key in store) {
    if (key.startsWith(KEY_PREFIX)) {
      let phrase = await store.getItem(key)
      if (!isPhraseOrWIF(phrase)) {
        phrase = await $s.getItem(key)
      }
      keys.push([
        key.split(KEY_PREFIX)[1],
        phrase
      ])
    }
  }

  return keys
}

export function isPhraseOrWIF(phraseOrWif) {
  let recoveryPhrase = phraseOrWif.split(' ')
  return ((
      // Is a WIF
      phraseOrWif.length < 53 &&
      recoveryPhrase.length === 1
    ) || recoveryPhrase.length >= 12 // Is a Recovery Phrase
  )
}

export async function storePhraseOrWif(
  [ address, phraseOrWif ], pass
) {
  let $s = store

  $s.setItem(SK, address)

  if (pass) {
    $s = await initEncryptedStore(pass)
  }

  $s.setItem(`${KEY_PREFIX}${address}`, phraseOrWif)
}

export function swapStorage(to, from, key) {
  to.setItem(key, from.getItem(key))
  from.removeItem(key)
}

export async function encryptKeys(storedKeys, passphrase) {
  for (let [address, phraseOrWif] of storedKeys) {
    let recoveryPhrase = phraseOrWif.split(' ')
    if (
      (phraseOrWif.length < 53 &&
      recoveryPhrase.length === 1) ||
      recoveryPhrase.length >= 12
    ) {
      // console.log('stored key', address, phraseOrWif.length)
      storePhraseOrWif([address, phraseOrWif], passphrase)
    }
  }
}

export function jsonStore(storage = localStorage) {
  const unmodifiedFunctions = {
    clear() {
      storage.clear();
    },
    get length() {
      return storage.length;
    },
    key(i) {
      return storage.key(i);
    },
  };

  return {
    ...storage,
    async setItem(key, value) {
      let jsonValue = await JSON.stringify(value)
      storage.setItem(key, jsonValue);
    },
    async getItem(key) {
      return (await JSON.parse(storage.getItem(key))) || {};
    },
    ...unmodifiedFunctions,
  };
}

export function checkCache() {
  let Settings = jsonStore(localStorage)
  return new Promise((resolve, reject) => {
    fetch(`package.json?cb=${new Date().getTime()}`)
      .then(async response => await response.json())
      .then(async pkg => {
        let installedVersion = (await Settings.getItem('pwa'))?.version
        // console.log('checkCache', pkg.version, installedVersion)
        if (installedVersion === 0) {
          Settings.setItem('pwa', { version: pkg.version })
          return resolve();
        } else if (installedVersion != pkg.version) {
          console.log('Cache Version mismatch')
          fetch(`package.json?clear-cache=true&cb=${new Date().getTime()}`)
            .then(async response => await response.json())
            .then(newPkg => {
              Settings.setItem('pwa', { version: newPkg.version })
              window.location.reload();

              return resolve();
            });
        } else {
          console.log('Cache Updated', installedVersion)
          return resolve();
        }
      })
      .catch(err => {
        console.log(err);
        return resolve();
      })
  })
}
