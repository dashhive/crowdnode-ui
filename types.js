/**
 * @typedef {import("@plamikcho/pbcrypto").ICrypto} BaseICrypto
 * @typedef {Window & import("@dashincubator/base58check/base58check.js") & import("dashsight/dashsight.js").Dashsight & import("dashsight/dashsocket.js").DashSocket & import("dashkeys/dashkeys.js")}
 * @typedef {Window & import("crowdnode/crowdnode.js")} CrowdNode
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
 *
 * @typedef {{
 *  encPrivKey?: HTMLElement;
 *  signupCrowdNodeForm?: HTMLElement;
 *  acceptCrowdNodeForm?: HTMLElement;
 *  depositCrowdNodeForm?: HTMLElement;
 *  privKeyForm?: HTMLElement;
 *  balanceForm?: HTMLElement;
 * } & Document} document
 *
 */