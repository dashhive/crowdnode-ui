import {
  Base58Check,
  DashHd,
  DashPhrase,
  DashKeys,
} from './imports.js'

export const DUFFS = 100000000;

// From https://github.com/dashhive/dashkeys.js#helpful-helper-functions

// let Base58Check = require("@dashincubator/base58check").Base58Check;
// @ts-ignore
export let dash58check = Base58Check.create({
  pubKeyHashVersion: "4c", // "8c" for dash testnet, "00" for bitcoin main
  privateKeyVersion: "cc", // "ef" for dash testnet, "80" for bitcoin main
});

/**
* @param {String} addr
* @returns {Promise<Uint8Array>} - p2pkh (no magic byte or checksum)
*/
export async function addrToPubKeyHash(addr) {
  let b58cAddr = dash58check.decode(addr);
  let pubKeyHash = hexToUint8Array(b58cAddr.pubKeyHash);
  return pubKeyHash;
}

/**
* @param {Uint8Array} pubKeyHash - no magic byte or checksum
* @returns {Promise<String>} - Pay Addr
*/
export async function pubKeyHashToAddr(pubKeyHash) {
  let hex = uint8ArrayToHex(pubKeyHash);
  let addr = await dash58check.encode({ pubkeyHash: hex });
  return addr;
}

/**
* @param {String} wif
* @returns {Promise<Uint8Array>} - private key (no magic byte or checksum)
*/
export async function wifToPrivateKey(wif) {
  let b58cWif = dash58check.decode(wif);
  let privateKey = hexToUint8Array(b58cWif.privateKey);
  return privateKey;
}

/**
* @param {Uint8Array} privKey
* @returns {Promise<String>} - wif
*/
export async function privateKeyToWif(privKey) {
  let privateKey = uint8ArrayToHex(privKey);

  let wif = await dash58check.encode({ privateKey: privateKey });
  return wif;
}

/**
* @param {String} addrOrWif
*/
export async function decode(addrOrWif) {
  let parts = await dash58check.decode(addrOrWif);
  let check = await dash58check.checksum(parts);
  let valid = parts.check === check;

  parts.valid = valid;
  //parts.privateKeyBuffer = hexToUint8Array(parts.privateKey);
  //parts.pubKeyHashBuffer = hexToUint8Array(parts.pubKeyHash);

  return parts;
}

/**
* @param {Uint8Array} buf
* @returns {Promise<string>} - Pay Addr or WIF
* @throws {Error}
*/
export async function encode(buf) {
  let hex = uint8ArrayToHex(buf);

  if (32 === buf.length) {
    return await dash58check.encode({
      privateKey: hex,
    });
  }

  if (20 === buf.length) {
    return await dash58check.encode({
      pubKeyHash: hex,
    });
  }

  throw new Error("buffer length must be (PubKeyHash) or 32 (PrivateKey)");
}

/**
* JS Buffer to Hex that works in browsers and Little-Endian
* (which is most of the - ARM, x64, x86, WASM, etc)
* @param {Uint8Array} buf
* @returns {String} - hex
*/
export function uint8ArrayToHex(buf) {
  /** @type {Array<String>} */
  let hex = [];

  buf.forEach(function (b) {
    let c = b.toString(16).padStart(2, "0");
    hex.push(c);
  });

  return hex.join("");
}

/**
* Hex to JS Buffer that works in browsers and Little-Endian CPUs
* (which is most of the - ARM, x64, x86, WASM, etc)
* @param {String} hex
* @returns {Uint8Array} - JS Buffer (Node and Browsers)
*/
export function hexToUint8Array(hex) {
  let buf = new Uint8Array(hex.length / 2);

  for (let i = 0; i < hex.length; i += 2) {
    let c = hex.slice(i, i + 2);
    let b = parseInt(c, 16);
    let index = i / 2;
    buf[index] = b;
  }

  return buf;
}

/**
 * @param {Number} duffs - ex: 00000000
 * @param {Number} [fix] - value for toFixed - ex: 8
 */
export function toDash(duffs, fix = 8) {
  return (duffs / DUFFS).toFixed(fix);
}

/**
 * @param {String} dash - ex: 0.00000000
 */
export function toDashStr(dash) {
  return `Đ ` + `${dash}`.padStart(12, " ");
}

/**
 * Based on https://stackoverflow.com/a/48100007
 *
 * @param {Number} dash - ex: 0.00000000
 * @param {Number} [fix] - value for toFixed - ex: 8
 */
export function fixedDash(dash, fix = 8) {
  return (
    Math.trunc(dash * Math.pow(10, fix)) / Math.pow(10, fix)
  )
  .toFixed(fix);
}

/**
 * @param {Number} duffs - ex: 00000000
 */
export function toDASH(duffs) {
  let dash = toDash(duffs / DUFFS);
  return toDashStr(dash);
}

/**
 * @param {Number} dash - ex: 0.00000000
 * @param {Number} [fix] - value for toFixed - ex: 8
 */
export function fixedDASH(dash, fix = 8) {
  return toDashStr(fixedDash(dash, fix));
}

/**
 * @param {String} dash - ex: 0.00000000
 */
export function toDuff(dash) {
  return Math.round(parseFloat(dash) * DUFFS);
}

/**
 * @param {string} name - 'change'
 * @param {any} data - { some: 'thing' }
 * @param {Window | Document | Element} [el=window] - window
 */
export function trigger(name, data, el = window) {
  return el.dispatchEvent(
    new CustomEvent(name, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail: data
    })
  )
}

export function isDecryptedPhraseOrWif(phraseOrWIF) {
  let rpArr = phraseOrWIF?.split(' ')
  return phraseOrWIF !== null && (
    rpArr?.length >= 12 || (
      phraseOrWIF?.length > 4 &&
      phraseOrWIF?.length < 53
    )
  )
}

export async function generateRecoveryPhrase(
  phraseOrWIF,
  accountIndex = 0
) {
  let recoveryPhraseArr = phraseOrWIF?.split(' ')
  let targetBitEntropy = 128;
  let secretSalt = ''; // "TREZOR";
  let recoveryPhrase
  let seed
  let wallet
  // let accountIndex = 0;
  let addressIndex = 0;
  let account
  let use = DashHd.RECEIVE;
  let xkey
  let xprv
  let xpub
  let key
  let privateKey
  let wif
  let address

  if (recoveryPhraseArr?.length >= 12) {
    recoveryPhrase = phraseOrWIF

    // seed = await DashPhrase.decode(recoveryPhrase);
  }
  if (!phraseOrWIF) {
    recoveryPhrase = await DashPhrase.generate(targetBitEntropy);
  }

  if (
    phraseOrWIF &&
    recoveryPhraseArr?.length === 1
  ) {
    privateKey = await wifToPrivateKey(phraseOrWIF)
    address = await DashKeys.wifToAddr(phraseOrWIF);
    // recoveryPhrase = await DashPhrase.encode(wifToPK);
  } else {
    seed = await DashPhrase.toSeed(recoveryPhrase, secretSalt);
    wallet = await DashHd.fromSeed(seed);
    account = await wallet.deriveAccount(accountIndex);
    xkey = await account.deriveXKey(use);
    // xprv = await DashHd.toXPrv(xkey);
    // xpub = await DashHd.toXPub(xkey);
    key = await xkey.deriveAddress(addressIndex);
    address = await DashHd.toAddr(key.publicKey);
  }

  wif = await DashHd.toWif(key?.privateKey || privateKey);

  return {
    recoveryPhrase,
    seed,
    wallet,
    account,
    xkey,
    // xprv,
    // xpub,
    wif,
    address,
  }
}
