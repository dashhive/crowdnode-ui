// @noble/secp256k1 v1.7.1 imports the `crypto` module
// This exports the browsers `window.crypto` so that
// it can be used in an import map to fix `@noble/secp256k1`
// @dashincubator/secp256k1 was being used but it many commits behind

export const crypto = window?.crypto || globalThis?.crypto

export default crypto