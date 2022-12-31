/**
 * @typedef {import("@plamikcho/pbcrypto").ICrypto} BaseICrypto
 * @typedef {Window & import("@dashincubator/base58check/base58check.js")}
 *
 * @typedef {Object} Encrypto
 * @property {BaseICrypto["encrypt"]} encrypt
 * @property {BaseICrypto["decrypt"]} decrypt
 * @property {BaseICrypto["getIv"]} getInitVector
 *
 * @typedef {BaseICrypto & Encrypto} EncryptoB
 *
 * @typedef {{
 *  foo?: boolean;
 *  bar?: string | null;
 * }} AlternativeDefinitionStyle
 */