import { getEncryptedStorage, } from '../CryptStore.js';

const SK = 'selectedKey'
const KEY_PREFIX = 'dk__'
const ENCRYPT_IV = 'encryptage'
const STOREAGE_SALT = 'tabasco hardship tricky blimp doctrine'

let rememberMe = JSON.parse(localStorage.getItem('remember'))
let store = rememberMe ? localStorage : sessionStorage
let encryptedStore

export async function initEncryptedStore(passphrase) {
  return encryptedStore || await getEncryptedStorage(
    store,
    passphrase,
    STOREAGE_SALT,
    ENCRYPT_IV
  );
}

export async function getPrivateKey(addr, pass) {
  // let keys = []
  let $s = store

  if (pass) {
    $s = await initEncryptedStore(pass)
  }

  // for(let key in $s) {
  //   if (key.startsWith(KEY_PREFIX)) {
  //     // console.log('sess store', itm)
  //     keys.push([key.split(KEY_PREFIX)[1], await $s.getItem(key)])
  //   }
  // }

  return $s[KEY_PREFIX+addr]
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

export async function storeKeys(keys, pass) {
  let $s = store

  $s.setItem(SK, keys.address)

  if (pass) {
    $s = await initEncryptedStore(pass)
  }

  $s.setItem(`${KEY_PREFIX}${keys.address}`, keys.wif)
}

export function swapStorage(to, from, key) {
  to.setItem(key, from.getItem(key))
  from.removeItem(key)
}