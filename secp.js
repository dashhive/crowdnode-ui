// import * as secp from './node_modules/@noble/secp256k1/index.js';
// import * as secp from './node_modules/@dashincubator/secp256k1/index.js';
import './node_modules/@dashincubator/secp256k1/secp256k1.js';

// @ts-ignore
const secp = window?.nobleSecp256k1 || globalThis?.nobleSecp256k1 || window?.Secp256k1 || globalThis?.Secp256k1

// @ts-ignore
window.Secp256k1 = secp
// @ts-ignore
// window.nobleSecp256k1 = secp

export const Secp256k1 = secp

export default secp
