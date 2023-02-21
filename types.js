/**
 * @typedef {import("@plamikcho/pbcrypto").ICrypto} BaseICrypto
 * @typedef {Window & import("@dashincubator/base58check/base58check.js")}
 *
 * @typedef {Object} Encryptage
 * @property {EncryptageEncrypt} encrypt
 * @property {EncryptageDecrypt} decrypt
 * @property {BaseICrypto["getIv"]} getInitVector
 *
 * @typedef {BaseICrypto & Encryptage} EncryptageB
 * @typedef {(message: string, iv: string | ArrayBufferLike) => Promise<string>} EncryptageEncrypt
 * @typedef {(ciphertext: string, iv: string | ArrayBufferLike) => Promise<string>} EncryptageDecrypt
 *
 * @typedef {{
 *  foo?: boolean;
 *  bar?: string | null;
 * }} AlternativeDefinitionStyle
 *
 * @typedef {{
 *  encPrivKey?: HTMLElement & { passphrase?: HTMLInputElement };
 *  encryptWallet?: HTMLElement & { passphrase?: HTMLInputElement };
 *  signupCrowdNodeForm?: HTMLElement;
 *  acceptCrowdNodeForm?: HTMLElement;
 *  depositCrowdNodeForm?: HTMLElement & { amount?: HTMLInputElement };
 *  privKeyForm?: HTMLElement & { privateKey?: HTMLInputElement };
 *  balanceForm?: HTMLElement;
 *  fundingModal?: HTMLDialogElement,
 *  generatePrivKeyForm?: HTMLElement
 * } & Document} document
 *
 * @typedef {{
 *  addrs?: Object<string, string?>
 * }} PrivateAndPublicKeys
 */