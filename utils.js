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
 */
export function toDash(duffs) {
  return (duffs / DUFFS).toFixed(8);
}

/**
 * @param {Number} duffs - ex: 00000000
 */
export function toDASH(duffs) {
  let dash = (duffs / DUFFS).toFixed(8);
  return `Đ` + dash.padStart(12, " ");
}

/**
 * @param {String} dash - ex: 0.00000000
 */
export function toDuff(dash) {
  return Math.round(parseFloat(dash) * DUFFS);
}