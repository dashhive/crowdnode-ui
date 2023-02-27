import { getEncryptedStorage, } from './CryptStore.js';
import { qrSvg, } from './qr.js';
import { toDuff, toDash, fixedDASH, wifToPrivateKey } from './utils.js'
import {
  DashHd,
  DashPhrase,
  DashKeys,
  DashSight,
  DashSocket,
  DashApi,
  Secp256k1,
  Base58Check,
  RIPEMD160,
  CrowdNode,
} from './imports.js'

/** @type {document} */
const $d = document;

/** @type {HTMLDialogElement} */
let fundingModal

// @ts-ignore
let dashsight = DashSight.create({
  baseUrl: 'https://dashsight.dashincubator.dev',
});

// let Ws = DashSocket;

let rememberMe = JSON.parse(localStorage.getItem('remember'))
let store = rememberMe ? localStorage : sessionStorage
let selectedPrivateKey = store.getItem('selectedPrivateKey')
// let passphrase = window.prompt('Enter a passphrase to encrypt your WIF')
let passphrase
let myKeys
// let selectedPrivateKey
let selectedPubKey
let encryptedStore
let currentPage

let _privateKeys = []

const STOREAGE_SALT = 'tabasco hardship tricky blimp doctrine'
const SK = 'selectedKey'
const PK = 'privateKeys'
const PKIV = 'privateKeys_iv'
const KEY_PREFIX = 'dk__'
const ENCRYPT_IV = 'encryptage'

const PAGE_DASH = 'dashboard'
const PAGE_WALLET = 'wallet'
const PAGE_STAKE = 'staking'
const PAGE_SETTINGS = 'settings'

const { hotwallet } = CrowdNode.main;
const { depositMinimum, stakeMinimum } = CrowdNode
const { signupForApi, acceptTerms, offset } = CrowdNode.requests;
let feeEstimate = 500;
let signupOnly = signupForApi + offset;
let acceptOnly = acceptTerms + offset;
let signupFees = signupOnly + acceptOnly;
let signupTotal = signupFees + 2 * feeEstimate;

function resetFormFields() {
  $d.encPrivKey.querySelector('fieldset').disabled = true
  $d.privKeyForm.querySelector('fieldset').disabled = true
  $d.signupCrowdNodeForm.querySelector('fieldset').disabled = true
  $d.acceptCrowdNodeForm.querySelector('fieldset').disabled = true
  $d.depositCrowdNodeForm.querySelectorAll('fieldset')
    .forEach(el => el.disabled = true)
  $d.balanceForm.querySelector('fieldset').disabled = true
}

async function generateRecoveryPhrase() {
  let targetBitEntropy = 128;
  let secretSalt = ''; // "TREZOR";
  let recoveryPhrase = await DashPhrase.generate(targetBitEntropy);
  let seed = await DashPhrase.toSeed(recoveryPhrase, secretSalt);
  let wallet = await DashHd.fromSeed(seed);
  let accountIndex = 0;
  let account = await wallet.deriveAccount(accountIndex);
  let use = DashHd.RECEIVE;
  let xkey = await account.deriveXKey(use);
  let xprv = await DashHd.toXPrv(xkey);
  let xpub = await DashHd.toXPub(xkey);
  let key = await xkey.deriveAddress(use);
  let wif = await DashHd.toWif(key.privateKey);
  let address = await DashHd.toAddr(key.publicKey);

  return {
    recoveryPhrase,
    seed,
    wallet,
    account,
    xkey,
    xprv,
    xpub,
    wif,
    address
  }
}

async function getStoredKeys(pass) {
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

async function storeKeys(keys) {
  let $s = store

  if (passphrase) {
    $s = encryptedStore
  }

  $s.setItem(`${KEY_PREFIX}${keys.address}`, keys.wif)
  $s.setItem(SK, keys.address)
}

/**
 * `getPublicKeysFromWIFS` returns an object with
 * WIF Private key as the Object keys and
 * Dash Public Addresses as values
 *
 * @param {string[]} wifs
 * @returns {Promise<Object>}
 */
async function getPublicKeysFromWIFS(wifs) {
  let newPrivateKey

  console.warn(
    '======getPublicKeysFromWIFS======',
    {
      wifs,
      // passphrase,
      pkiv: store.getItem(PKIV),
      ppkiv: !passphrase && !!store.getItem(PKIV),
    }
  )

  if (!passphrase && !!JSON.parse(store.getItem(PKIV))) {
    return null
  }

  if (!wifs || wifs?.length === 0) {
    newPrivateKey = await DashKeys.utils.generateWifNonHd()
    wifs = [newPrivateKey]
    selectedPrivateKey = newPrivateKey
  }

  // let addrs = Object.fromEntries(
  //   Array.from(wifs, w => [w, undefined])
  // )
  let addrs = {}

  // for(let wif of wifs) {
  for(let i=0; i < wifs.length; i++) {
    let wif = wifs[i]
    let wifPK

    if (!wif || wif === '') {
      newPrivateKey = await DashKeys.utils.generateWifNonHd()
      wif = newPrivateKey
      wifs[i] = newPrivateKey
    }

    try {
      wifPK = await wifToPrivateKey(wif)
      console.log('wifPK', wif, wifPK)
    } catch (err) {
      console.error('wifToPrivateKey Invalid private key WIF', wif)
    }

    if (wifPK) {
      try {
        selectedPrivateKey = selectedPrivateKey || wif
        addrs[wif] = await DashKeys.wifToAddr(wif);
      } catch (err) {
        console.error('Invalid private key WIF', wif)
      }
    }
  }

  if (passphrase) {
    encryptedStore.setItem(PK, JSON.stringify(wifs))
    encryptedStore.setItem(SK, selectedPrivateKey)
  } else {
    store.setItem(PK, JSON.stringify(wifs))
    store.setItem(SK, selectedPrivateKey)
  }

  console.log('wifs & pub addrs', addrs)

  return { newPrivateKey, addrs }
}

async function getBalance(address) {
  return await CrowdNode.http.GetBalance(
    address
  );
}

function swapStorage(to, from, key) {
  to.setItem(key, from.getItem(key))
  from.removeItem(key)
}

async function checkWalletFunds(addr) {
  let walletFunds = await dashsight.getInstantBalance(addr)

  console.info('check wallet funds', walletFunds)

  return walletFunds
}

async function displayWalletBalance(addr, funds) {
  let walletFunds = funds || await checkWalletFunds(addr)

  if (walletFunds) {
    // let msg = `<p>Current Wallet balance for "${
    //   addr
    // }" is Đ${
    //   walletFunds.balance
    // }</p>`
    // let msg = `<p>Đash Wallet balance: Đ ${
    //   walletFunds.balance
    // }</p>`
    let msg = `<span title="${walletFunds.balance}">${ fixedDASH(walletFunds.balance, 4) }</span>`

    $d.querySelector('header .dash-status .balance')
      // .innerHTML = msg
      .insertAdjacentHTML('beforeend', msg)
  }

  return walletFunds
}

async function displayCrowdNodeBalance(addr, funds) {
  let balance = funds || await getBalance(addr)

  if (balance?.TotalBalance) {
    // let msg = `<p>Current CrowdNode balance for "${
    //   addr
    // }" is Đ${
    //   balance.TotalBalance
    // } with ${
    //   balance.TotalDividend
    // } in dividends.</p>`
    // let msg = `
    //   <p>
    //     CrowdNode balance: Đ ${
    //       balance.TotalBalance
    //     }
    //   </p>
    //   <p>
    //     CrowdNode dividends: Đ ${
    //       balance.TotalDividend
    //     }
    //   </p>
    // `

    console.info(
      // msg,
      balance
    );

    // $d.querySelector('p.balance')
    //   .insertAdjacentHTML('beforeend', msg)
    $d.querySelector('header .cn-status .balance')
      // .innerHTML = `Đ ${ balance.TotalBalance }`
      .insertAdjacentHTML(
        'beforeend',
        `<span title="${balance.TotalBalance}">${ fixedDASH(balance.TotalBalance, 4) }</span>`
      )
    $d.querySelector('header .cn-status .dividends')
      // .innerHTML = `Đ ${ balance.TotalDividend }`
      .insertAdjacentHTML(
        'beforeend',
        `<span title="${balance.TotalDividend}">${ fixedDASH(balance.TotalDividend, 4) }</span>`
      )
  }

  return balance
}

function balanceEl(balance, dec = 4) {
  return `<span title="${balance}">${ fixedDASH(balance, dec) }</span>`
}

async function displayAddressBalance(addr, funds) {
  let walletFunds = funds || await checkWalletFunds(addr)

  if (walletFunds) {
    return balanceEl(walletFunds.balance)
  }

  return balanceEl(0)
}

async function displayCNAddrBalance(addr, funds) {
  let balance = funds || await getBalance(addr)

  if (balance?.TotalBalance) {
    return `
      ${balanceEl(balance.TotalBalance)}
      ${balanceEl(balance.TotalDividend)}
    `
  }

  return balanceEl(0)
}

async function displayBalances(addr, funds, cnBalance) {
  // $d.querySelector('p.balance').innerHTML = ''
  let bd = $d.querySelectorAll('header .balance, header .dividends')
    // .forEach(el => el.querySelector('> div').innerHTML = 'Đ 0')
    .forEach(el => el.querySelector('span')?.remove())

  console.log('displayBalances & dividends', bd)

  const wallet = await displayWalletBalance(addr, funds)
  const balance = await displayCrowdNodeBalance(addr, cnBalance)

  return {
    wallet,
    balance
  }
}

/**
 * `requestFundsQR` returns a string to be used in HTML that displays
 * a QR Code in SVG format with text description including optional
 * `msg` appended
 *
 * @param {string} addr
 * @param {import('dashsight').InstantBalance} currentFunds
 * @param {number} fundsNeeded - in satoshis
 * @param {string} [msg]
 * @returns {HTMLDialogElement}
 */
function requestFundsQR(addr, currentFunds, fundsNeeded, msg = '') {
  let dashSvg = qrSvg(
    `dash://${addr}`,
    {
      background: '#fff0',
      color: '#000',
      indent: 1,
      padding: 1,
      size: 'mini',
      container: 'svg-viewbox',
      join: true,
    }
  )

  let fundingDiff = `<p>
    You must deposit at least <strong>Đ ${toDash(fundsNeeded)}</strong> ${msg}
  </p>`

  if (currentFunds.balanceSat > 0) {
    fundingDiff = `
      <p>You have <strong>Đ ${toDash(currentFunds.balanceSat)}</strong> in your wallet.<br>This step requires <strong>Đ ${toDash(fundsNeeded)}</strong>.</p>
      <p>You must deposit at least <strong>Đ ${toDash(fundsNeeded - currentFunds.balanceSat)}</strong> more Dash ${msg}</p>
    `
  }

  fundingModal = $d.createElement('dialog')

  fundingModal.insertAdjacentHTML('afterbegin', `
    <figure>
      <progress class="pending"></progress>
      <form name="qrCopyAddr">
        <h4>Current Wallet Balance</h4>
        <h3>Đ ${currentFunds.balance}</h3>
        ${dashSvg}
        <figcaption>
          <fieldset class="inline">
            <input name="qrAddr" value="${addr}" spellcheck="false" />
            <button>📋</button>
          </fieldset>
          ${fundingDiff}
        </figcaption>
      </form>
      <form method="dialog">
        <button value="cancel">Close</button>
      </form>
    </figure>
  `)

  fundingModal.id = 'fundingModal'

  fundingModal.addEventListener('close', event => {
    // @ts-ignore
    event?.target?.remove()
  })

  return fundingModal
}

/**
 * `hasOrRequestFunds` checks if the current wallet has the
 * funds required, if not it displays the QR Code SVG request
 * and awaits funding, if it does have enough funds it
 * returns the values
 *
 * @param {string} addr
 * @param {number} requiredFunds
 * @param {string} [msg]
 * @param {function} [callback]
 * @returns {Promise<Object, number>}
 */
async function hasOrRequestFunds(addr, requiredFunds, msg, callback = () => {}) {
  let walletFunding
  let walletFunds = await checkWalletFunds(addr)
  let fees = walletFunds.balanceSat < feeEstimate ?
    feeEstimate - walletFunds.balanceSat : 0
  let fundsAndFees = requiredFunds + fees
  let fundsNeeded = walletFunds.balanceSat < fundsAndFees

  console.log(
    'hasOrRequestFunds',
    walletFunds.balanceSat,
    fundsAndFees,
    fundsNeeded
  )

  if (fundsNeeded) {
    fundingModal = requestFundsQR(
      addr,
      walletFunds,
      fundsAndFees,
      msg
    )

    $d.querySelector("main")
      .insertAdjacentElement('afterend', fundingModal)

    $d.querySelector('form[name=qrCopyAddr] button')
      .addEventListener('click', copyToClipboard)

    // fundingModal?.show();
    fundingModal?.showModal();

    // @ts-ignore
    walletFunding = await DashSocket.waitForVout(
      CrowdNode._dashsocketBaseUrl,
      addr,
      0,
    )

    if (walletFunding.satoshis < fundsAndFees) {
      await hasOrRequestFunds(addr, fundsAndFees, msg)
    }
  }

  return {
    walletFunds,
    fundsNeeded
  }
}

function copyToClipboard(event) {
  event.preventDefault()
  // let copyText = document.querySelector(sel);
  event.target.previousElementSibling.select();
  document.execCommand("copy");
}

async function fundOrInit(addr) {
  let walletFunds = await checkWalletFunds(addr)

  if (walletFunds.balance === 0) {
    fundingModal = requestFundsQR(
      addr,
      walletFunds,
      // 0.00236608,
      signupFees,
      'to signup and accept CrowdNode terms'
    )

    $d.querySelector("main")
      .insertAdjacentElement('afterend', fundingModal)

    $d.querySelector('form[name=qrCopyAddr] button')
      .addEventListener('click', copyToClipboard)

    // fundingModal = /** @type {HTMLDialogElement} */ (
    //   $d.getElementById("fundingModal")
    // )

    // fundingModal?.show();
    fundingModal?.showModal();

    // $d.querySelector("#fundingModal").insertAdjacentHTML(
    //   'afterbegin',
    //   `<progress class="pending"></progress>`,
    //   // `<div class="loader"></div>`,
    // )

    // @ts-ignore
    let walletFunding = await DashSocket.waitForVout(
      CrowdNode._dashsocketBaseUrl,
      addr,
      0,
    )

    if (walletFunding.satoshis > 0) {

      // fundingModal = /** @type {HTMLDialogElement} */ (
      //   $d.getElementById("fundingModal")
      // )
      fundingModal?.close()
      // fundingModal?.remove()
      walletFunds.balance = parseFloat(toDash(walletFunding.satoshis))
      walletFunds.balanceSat = walletFunding.satoshis
    }
  }

  if (walletFunds.balance > 0) {
      $d.getElementById("funding").innerHTML = ''

      let cnStatus = await CrowdNode.status(addr, hotwallet);

      await displayBalances(addr, walletFunds)

      $d.depositCrowdNodeForm.amount.min = toDash(depositMinimum + feeEstimate)
      // $d.depositCrowdNodeForm.amount.max = walletFunds.balance.toString()

      // $d.depositCrowdNodeForm.amount.max = toDash(toDuff(walletFunds.balance) - CrowdNode.offset)

      if (!cnStatus || cnStatus?.signup === 0) {
        // myKeys.forEach(myPrivateKey => {

        // })
        await hasOrRequestFunds(
          myKeys?.addrs[selectedPrivateKey],
          signupOnly + feeEstimate,
          'to signup for CrowdNode'
        )

        $d.signupCrowdNodeForm.querySelector('fieldset').disabled = false
      } else if (cnStatus.signup > 0 && cnStatus.accept === 0) {
        await hasOrRequestFunds(
          myKeys?.addrs[selectedPrivateKey],
          acceptOnly + feeEstimate,
          'to accept terms of service for CrowdNode'
        )

        $d.acceptCrowdNodeForm.querySelector('fieldset').disabled = false
      } else {
        $d.depositCrowdNodeForm.querySelectorAll('fieldset')
          .forEach(el => el.disabled = false)

        $d.balanceForm.querySelector('fieldset').disabled = false
      }
  }
}

async function loadKeys(
  privateKeys,
) {
  myKeys = await getPublicKeysFromWIFS([...new Set([
    ..._privateKeys,
    ...privateKeys
  ])])
  selectedPrivateKey = myKeys?.newPrivateKey || selectedPrivateKey

  if (myKeys === null) {
    console.warn('your private keys are encrypted', myKeys)
    $d.encPrivKey.querySelector('fieldset').disabled = false
    $d.privKeyForm.querySelector('fieldset').disabled = true
    return null
  }

  $d.privKeyForm.privateKey.value =
    privateKeys[selectedPrivateKey] ||
    privateKeys[Object.keys(privateKeys)[0]] ||
    selectedPrivateKey

  $d.privKeyForm.querySelector('fieldset').disabled = false

  $d.privKeyForm.querySelector('button').disabled = true
  $d.encPrivKey.querySelector('.error').textContent = ''
  $d.encPrivKey.querySelector('fieldset').disabled = true

  if (!passphrase) {
    $d.encPrivKey.querySelector('fieldset').disabled = false
  }

  console.warn('myKeys?.addrs[selectedPrivateKey]', myKeys, selectedPrivateKey, myKeys?.addrs[selectedPrivateKey])
  await fundOrInit(myKeys?.addrs[selectedPrivateKey])
  // }
  // else if (privateKeyExists) {
  //   let errMsg = 'Unable to retrieve private key. Check if your password is correct.'
  //   console.warn(errMsg)
  //   $d.encPrivKey.querySelector('.error').textContent = `
  //     ${errMsg}
  //   `
  // }
}

export async function getAddrRows(keys) {
  let rows = []

  for (let [pub, priv] of keys) {
    displayAddressBalance(pub)
      .then(b => {
        $d.getElementById(`da_${pub}`).innerHTML = b
      })
    displayCNAddrBalance(pub)
      .then(b => {
        $d.getElementById(`cn_${pub}`).innerHTML = b
      })

    rows.push(`
      <tr>
        <td>
          <strong>${pub}</strong><br/>
          <em>${priv}</em>
        </td>
        <td id="da_${pub}"></td>
        <td id="cn_${pub}"></td>
      </tr>
    `)
  }

  return rows.join('\n')
}

export default async function main() {
  currentPage = location.pathname.slice(1) || 'onboarding'
  console.log('main location', currentPage, location.hash, location.search)

  let pageEl = $d.querySelector(`section.page#${currentPage}`)

  pageEl?.classList.add('active')

  CrowdNode.init({
    // baseUrl: 'https://app.crowdnode.io',
    // insightBaseUrl: 'https://insight.dash.org',
    baseUrl: 'https://dashnode.duckdns.org/api/cors/app.crowdnode.io',
    insightBaseUrl: 'https://insight.dash.org/insight-api',
    dashsocketBaseUrl: 'https://insight.dash.org/socket.io',
    dashsightBaseUrl: 'https://dashsight.dashincubator.dev/insight-api',
  })

  // console.log('store.getItem(PKIV)', store.getItem(PKIV), !!store.getItem(PKIV))
  // if (passphrase) {
  //   encryptedStore = await getEncryptedStorage(
  //     store,
  //     passphrase,
  //     STOREAGE_SALT,
  //     ENCRYPT_IV
  //   );
  //   _privateKeys = JSON.parse(await encryptedStore.getItem(PK)) || []
  // } else if (!store.getItem(PKIV)) {
  //   _privateKeys = JSON.parse(await store.getItem(PK)) || []
  // }

  _privateKeys = await getStoredKeys()

  if (currentPage === PAGE_WALLET) {
    console.info('ON PAGE:', PAGE_WALLET)
    // let keys = await getStoredKeys()
    let addrRows = await getAddrRows(_privateKeys)

    console.info('WALLET ROWS', _privateKeys)

    $d.querySelector('#addressList tbody')
      .insertAdjacentHTML('afterbegin', addrRows)
  }

  // loadKeys(_privateKeys)

  console.log('un/encrypted private keys', _privateKeys)

  $d.encPrivKey
    .addEventListener('submit', async event => {
      event.preventDefault()

      passphrase = $d.encPrivKey.passphrase?.value

      const storedKeys = await getStoredKeys()
      const isStoreEncrypted = await store.getItem(`${ENCRYPT_IV}_iv`)

      if (passphrase) {
        // console.log('passphrase', passphrase)

        $d.encPrivKey.passphrase.value = ''

        encryptedStore = encryptedStore || await getEncryptedStorage(
          store,
          passphrase,
          STOREAGE_SALT,
          ENCRYPT_IV
        );

        // const privateKeysExists = await encryptedStore.hasItem(`${ENCRYPT_IV}_iv`)

        // const privateKeys = JSON.parse(await encryptedStore.getItem(PK))

        console.log('encPrivKey form selectedPrivateKey', {
          selectedPrivateKey,
          storedKeys,
          isStoreEncrypted,
          // privateKeysExists,
          // privateKeys
        })

        $d.privKeyForm.querySelector('button').disabled = false

        // loadKeys(selectedPrivateKey ? [selectedPrivateKey] : privateKeys)
      }
    })

  $d.encryptWallet
    .addEventListener('submit', async event => {
      event.preventDefault()

      // @ts-ignore
      passphrase = event.target.passphrase?.value

      const storedKeys = await getStoredKeys()
      const isStoreEncrypted = !!(await store.getItem(`${ENCRYPT_IV}_iv`))

      if (passphrase) {
        // console.log('passphrase', passphrase)

        // @ts-ignore
        event.target.passphrase.value = ''

        encryptedStore = encryptedStore || await getEncryptedStorage(
          store,
          passphrase,
          STOREAGE_SALT,
          ENCRYPT_IV
        );

        const decryptedStoredKeys = await getStoredKeys(passphrase)

        for (let [address, wif] of storedKeys) {
          if (wif.length < 53) {
            console.log('stored key', address, wif.length)
            storeKeys({ address, wif })
          }
        }

        let addrRows = await getAddrRows(decryptedStoredKeys)

        // console.info('WALLET ROWS', storedKeys, addrRows)

        $d.querySelector('#addressList tbody').innerHTML = addrRows

        // storeKeys()

        // const privateKeysExists = await encryptedStore.hasItem(`${ENCRYPT_IV}_iv`)

        // const privateKeys = JSON.parse(await encryptedStore.getItem(PK))

        console.log('encryptWallet form selectedPrivateKey', {
          selectedPrivateKey,
          storedKeys,
          decryptedStoredKeys,
          isStoreEncrypted,
          el: decryptedStoredKeys.length,
          ul: storedKeys.length,
          // privateKeysExists,
          // privateKeys
        })

        $d.privKeyForm.querySelector('button').disabled = false

        // loadKeys(selectedPrivateKey ? [selectedPrivateKey] : privateKeys)
      }
    })

  $d.privKeyForm
    .addEventListener('input', async (
      /** @type {Event & { target: HTMLInputElement}} event */
      event
      ) => {
      console.log(
        'change privKeyForm',
        event,
        selectedPrivateKey,

        $d.privKeyForm.privateKey.value,

        selectedPrivateKey !== $d.privKeyForm.privateKey.value.trim()
      )

      // let target = event.target

      if (event.target.name === 'remember') {
        rememberMe = event.target.checked

        localStorage.setItem(
          'remember',
          rememberMe
        )

        if (rememberMe) {
          swapStorage(
            localStorage,
            sessionStorage,
            PK,
          )
          swapStorage(
            localStorage,
            sessionStorage,
            PKIV,
          )
        } else {
          swapStorage(
            sessionStorage,
            localStorage,
            PK,
          )
          swapStorage(
            sessionStorage,
            localStorage,
            PKIV,
          )
        }

        store = rememberMe ? localStorage : sessionStorage

        if (passphrase) {
          encryptedStore = await getEncryptedStorage(
            store,
            passphrase,
            STOREAGE_SALT,
            ENCRYPT_IV
          );
        }
      } else {
        if (
          selectedPrivateKey !== $d.privKeyForm.privateKey?.value?.trim()
        ) {
          $d.privKeyForm.querySelector('button').disabled = false
        } else {
          $d.privKeyForm.querySelector('button').disabled = true
        }
      }
    })


  $d.privKeyForm
    .addEventListener('submit', async event => {
      event.preventDefault()

      const privateKey = $d.privKeyForm.privateKey?.value?.trim()

      myKeys = await getPublicKeysFromWIFS([...new Set([
        ..._privateKeys,
        privateKey
      ])])
      selectedPrivateKey = privateKey
      selectedPubKey = myKeys?.addrs[selectedPrivateKey]

      if (selectedPubKey) {
        resetFormFields()
        // console.log('privKey', selectedPrivateKey)

        $d.privKeyForm.privateKey.value = selectedPrivateKey

        $d.privKeyForm.querySelector('button').disabled = true

        await fundOrInit(selectedPubKey)
      }
    })


  $d.generatePrivKeyForm
    .addEventListener('submit', async event => {
      event.preventDefault()

      // const privateKey = $d.privKeyForm.privateKey?.value?.trim()

      // Generate the new Public & Private Keys
      myKeys = await generateRecoveryPhrase()
      // Store new keys in localStorage
      storeKeys(myKeys)
      let storedKeys = await getStoredKeys()
      let addrRows = await getAddrRows(storedKeys)

      // console.info('WALLET ROWS', storedKeys, addrRows)

      $d.querySelector('#addressList tbody').innerHTML = addrRows
      // $d.querySelector('#addressList tbody')
      //   .insertAdjacentHTML('afterbegin', addrRows)

      console.log('generateRecoveryPhrase', myKeys, storedKeys)
      // selectedPrivateKey = privateKey
      // selectedPubKey = myKeys?.addrs[selectedPrivateKey]

      // if (selectedPubKey) {
      //   resetFormFields()
      //   // console.log('privKey', selectedPrivateKey)

      //   $d.privKeyForm.privateKey.value = selectedPrivateKey

      //   $d.privKeyForm.querySelector('button').disabled = true

      //   await fundOrInit(selectedPubKey)
      // }
    })

  $d.signupCrowdNodeForm.addEventListener('submit', async event => {
    event.preventDefault()

    if (selectedPrivateKey) {
      await hasOrRequestFunds(
        selectedPrivateKey.addr,
        signupOnly + feeEstimate,
        'to signup for CrowdNode'
      )

      // console.log('privKey', selectedPrivateKey, hotwallet)

      $d.body.insertAdjacentHTML(
        'afterbegin',
        `<progress id="pageLoader" class="pending"></progress>`,
      )

      let cnSignup = await CrowdNode.signup(selectedPrivateKey, hotwallet);
      console.log('signupCrowdNodeForm', cnSignup)
      let cnAccept = await CrowdNode.accept(selectedPrivateKey, hotwallet);
      console.log('acceptCrowdNodeForm', cnAccept)

      $d.getElementById('pageLoader').remove()

      // if ()

      $d.signupCrowdNodeForm.querySelector('fieldset').disabled = true

      $d.acceptCrowdNodeForm.querySelector('fieldset').disabled = false
    }
  })


  // $d.acceptCrowdNodeForm.addEventListener('submit', async event => {
  //   event.preventDefault()

  //   if (selectedPrivateKey) {
  //     await hasOrRequestFunds(
  //       selectedPrivateKey.addr,
  //       acceptOnly + feeEstimate,
  //       'to accept terms of service for CrowdNode'
  //     )

  //     // console.log('privKey', selectedPrivateKey, hotwallet)

  //     $d.body.insertAdjacentHTML(
  //       'afterbegin',
  //       `<progress id="pageLoader" class="pending"></progress>`,
  //     )

  //     let cnAccept = await CrowdNode.accept(selectedPrivateKey.wif, hotwallet);
  //     console.log('acceptCrowdNodeForm', cnAccept)

  //     $d.getElementById('pageLoader').remove()

  //     // if (!cnAccept || cnAccept.accept === 0) {
  //     //
  //     //   $d.signupCrowdNodeForm.querySelector('fieldset').disabled = false
  //     // } else {

  //       $d.acceptCrowdNodeForm.querySelector('fieldset').disabled = true

  //       $d.depositCrowdNodeForm.querySelectorAll('fieldset')
  //         .forEach(el => el.disabled = false)

  //       $d.balanceForm.querySelector('fieldset').disabled = false
  //     // }
  //   }
  // })


  $d.depositCrowdNodeForm.addEventListener('submit', async event => {
    event.preventDefault()

    const amount = $d.depositCrowdNodeForm.amount?.value

    console.log(
      'depositCrowdNodeForm amount',
      amount,
      toDuff(amount),
    )

    if (selectedPrivateKey) {
      let depositAmount = toDuff(amount)
      if (depositAmount < depositMinimum) {
        depositAmount = depositMinimum
      }
      await hasOrRequestFunds(
        selectedPrivateKey.addr,
        depositAmount,
        ''
      )

      const { addr } = selectedPrivateKey

      $d.getElementById('pageLoader')?.remove()

      $d.body.insertAdjacentHTML(
        'afterbegin',
        `<progress id="pageLoader" class="pending"></progress>`,
      )

      try {
        let cnDeposit = await CrowdNode.deposit(
          selectedPrivateKey.wif,
          hotwallet,
          toDuff(amount) || null
        );

        console.log(
          'depositCrowdNodeForm deposit res',
          cnDeposit
        )

        $d.depositCrowdNodeForm.amount.value = null

        await displayBalances(addr)
      } catch(err) {
        console.warn('failed to deposit', err)
      }

      $d.getElementById('pageLoader').remove()
    }
  })


  $d.balanceForm.addEventListener('submit', async event => {
    event.preventDefault()

    if (selectedPrivateKey) {
      const { addr } = selectedPrivateKey

      const { balance } = await displayBalances(addr)

      if (!balance?.TotalBalance) {
        console.warn(
          balance.value
        );
      }
    }
  })
}

main()