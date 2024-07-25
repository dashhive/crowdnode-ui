/**
 * @typedef {import("./node_modules/crypticstorage/cryptic.js").Cryptic} Cryptic
 * @typedef {import("./node_modules/crypticstorage/storage.js").CrypticStorage} CrypticStorage
 * @typedef {Window & import("@dashincubator/base58check/base58check.js")}
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
 *  generatePrivKeyForm?: HTMLElement,
 *  addPrivKeyForm?: HTMLElement,
 * } & Document} document
 *
 * @typedef {{
 *  addrs?: Object<string, string?>
 * }} PrivateAndPublicKeys
 */