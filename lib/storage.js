import { getEncryptedStorage, } from '../CryptStore.js';
// import { generateRecoveryPhrase, } from '../utils.js';

export const SK = 'selectedKey'
export const KEY_PREFIX = 'dk__'
export const ENCRYPT_IV = 'encryptage'
export const STOREAGE_SALT = 'tabasco hardship tricky blimp doctrine'

export let rememberMe = JSON.parse(localStorage.getItem('remember'))
export let encryptedStore

let passphrase

if (rememberMe === null) {
  localStorage.setItem('remember', 'true')
  rememberMe = true
}

export let store = rememberMe ? localStorage : sessionStorage
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
  // encryptedStore = encryptedStore
  return encryptedStore
}

export async function getPrivateKey(addr, pass) {
  // let keys = []
  let $s = store

  if (pass) {
    $s = await initEncryptedStore(pass)
  }

  // return $s[KEY_PREFIX+addr]
  return await $s.getItem(KEY_PREFIX+addr)
}

export async function getStoredKeys(pass) {
  let keys = []
  let $s = store

  if (pass) {
    $s = await initEncryptedStore(pass)
  }

  for(let key in $s) {
    if (key.startsWith(KEY_PREFIX)) {
      // console.log('sess store', itm)
      keys.push([key.split(KEY_PREFIX)[1], await $s.getItem(key)])
    }
  }

  return keys
}

export async function storePhraseOrWif([ address, phraseOrWif ], pass) {
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
      console.log('stored key', address, phraseOrWif.length)
      storePhraseOrWif([address, phraseOrWif], passphrase)
    }
  }
}