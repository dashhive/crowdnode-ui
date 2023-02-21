const SK = 'selectedKey'
const KEY_PREFIX = 'dk__'

let rememberMe = JSON.parse(localStorage.getItem('remember'))
let store = rememberMe ? localStorage : sessionStorage
let encryptedStore

export async function getPrivateKey(addr, pass) {
  // let keys = []
  let $s = store

  if (pass) {
    $s = encryptedStore
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
    $s = encryptedStore
  }

  for(let key in $s) {
    if (key.startsWith(KEY_PREFIX)) {
      // console.log('sess store', itm)
      keys.push([key.split(KEY_PREFIX)[1], await $s.getItem(key)])
    }
  }

  return keys
}

export async function storeKeys(keys, passphrase) {
  let $s = store

  $s.setItem(SK, keys.address)

  if (passphrase) {
    $s = encryptedStore
  }

  $s.setItem(`${KEY_PREFIX}${keys.address}`, keys.wif)
}

export function swapStorage(to, from, key) {
  to.setItem(key, from.getItem(key))
  from.removeItem(key)
}