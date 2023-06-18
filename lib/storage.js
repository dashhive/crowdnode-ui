import { getEncryptedStorage, } from '../CryptStore.js';
import { generateRecoveryPhrase, } from '../utils.js';
import {
  DashPhrase,
} from '../imports.js'

export const SK = 'selectedKey'
export const KEY_PREFIX_OLD = 'dk__'
export const KEY_PREFIX = 'rp__'
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

export async function getAddrsFromAccounts(
  accounts,
  rpId = null
) {
  let $s = store
  let accts = accounts || JSON.parse(await $s.getItem('accounts')) || {}
  let addresses = {}

  for(let storeKey in accts) {
    if (!rpId || rpId === storeKey) {
      let addrs = accts[storeKey]

      for(let addr of addrs) {
        addresses[addr] = storeKey
      }
    }
  }

  // console.log('getAddrsFromAccounts', addresses)

  return addresses
}

export async function getPrivateKey(addr, pass) {
  let $s = store
  let accounts = JSON.parse(await $s.getItem('accounts')) || {}
  let addresses = await getAddrsFromAccounts(accounts)

  if (pass) {
    $s = await initEncryptedStore(pass)
  }

  let acct = addresses[addr] // === "rp__0"
  let accountIndex = accounts[acct].findIndex(v => v === addr)

  let phraseOrWif = await $s.getItem(acct)
  let { wif } = await generateRecoveryPhrase(
    phraseOrWif,
    accountIndex,
  )
  return wif
}

export async function getStoredKeys(pass) {
  let storedKeys = []
  let storedAddresses = {}
  let $s = store
  let accounts = JSON.parse(await $s.getItem('accounts'))

  if (pass) {
    $s = await initEncryptedStore(pass)
  }

  for(let key in store) {
    if (key.startsWith(KEY_PREFIX)) {
      let phrase = await store.getItem(key)

      // let addrs = await getAddrsFromAccounts(accounts, key)
      if (
        phrase === null ||
        phrase?.length === 0
      ) {
        await store.removeItem(key)
        continue;
      }
      if (!accounts?.[key]) {
        continue;
      }
      if (!isPhraseOrWIF(phrase)) {
        phrase = await $s.getItem(key)
      }
      for(let addressIndex in accounts[key]) {
        let address = accounts[key][addressIndex]
        if (address !== null) {
          storedKeys.push([
            address,
            phrase,
            key,
            addressIndex,
          ])
          storedAddresses[address] = key
        }
      }
    }
  }

  return {
    storedKeys,
    storedAddresses,
  }
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
  [ address, phraseOrWif, rpId, nextAccountIndex ], pass
) {
  let $s = store
  let accounts = JSON.parse(await $s.getItem('accounts')) || {}
  let randName = (await DashPhrase.generate(32)).replaceAll(' ', '_')
  // let addresses = JSON.parse(await $s.getItem('addresses')) || {}
  // let addresses = await getAddrsFromAccounts(accounts)
  // let phraseIndex = Object.keys($s)
  //   .filter(k => k.startsWith(KEY_PREFIX)).length
  let phraseKey = Object.keys($s)
    .find(k => k.startsWith(KEY_PREFIX))
  // console.log('============ phraseKey', Object.keys($s), phraseKey)
  rpId = rpId || `${KEY_PREFIX}${phraseKey || randName}`
  let acctAddrs = accounts[rpId] || []

  console.log('storePhraseOrWif', rpId)

  // addresses[address] = rpId
  accounts[rpId] = [...acctAddrs]
  if (!acctAddrs.includes(address)) {
    accounts[rpId].push(address)
  }

  if (pass) {
    $s = await initEncryptedStore(pass)
  }

  $s.setItem(rpId, phraseOrWif)
  store.setItem('accounts', JSON.stringify(accounts))
  // store.setItem('addresses', JSON.stringify(addresses))
}

export function swapStorage(to, from, key) {
  to.setItem(key, from.getItem(key))
  from.removeItem(key)
}

export async function encryptKeys(storedKeys, passphrase) {
  for (
    let [
      address, phraseOrWif, rpId, nextAccountIndex
    ] of storedKeys
  ) {
    let recoveryPhrase = phraseOrWif.split(' ')
    if (
      (phraseOrWif.length < 53 &&
      recoveryPhrase.length === 1) ||
      recoveryPhrase.length >= 12
    ) {
      console.log(
        'encryptKeys',
        address, phraseOrWif.length,
        rpId, nextAccountIndex
      )
      storePhraseOrWif([
        address, phraseOrWif, rpId, nextAccountIndex
      ], passphrase)
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
