// import { getEncryptedStorage, } from './CryptStore.js';
// import { qrSvg, } from './qr.js';
import { toDuff, toDash, fixedDASH, wifToPrivateKey } from './utils.js'
import {
  getAddrRows,
  getPublicKeysFromWIFS,
  fundOrInit,
  hasOrRequestFunds,
  displayBalances,
} from './lib/ui.js'
import {
  storeKeys,
  getStoredKeys,
  swapStorage,
  initEncryptedStore,
} from './lib/storage.js'
import {
  // Secp256k1,
  // Base58Check,
  // RIPEMD160,
  // DashApi,
  DashHd,
  DashPhrase,
  DashKeys,
  // DashSight,
  // DashSocket,
  CrowdNode,
} from './imports.js'
// import './components/format-to-dash.js'
import defineFormatToDash, { init as ftdInit } from './components/format-to-dash.js'
import defineQrDialog, { init as qrInit } from './components/dialogs/qr.js'
import defineWithdrawDialog, { init as withdrawDialogInit } from './components/dialogs/withdraw.js'
import defineSignupDialog, { init as signupDialogInit } from './components/dialogs/signup.js'
import defineDepositForm, { init as depositFormInit } from './components/forms/deposit.js'
import defineWithdrawForm, { init as withdrawFormInit } from './components/forms/withdraw.js'
import defineSignupForm, { init as signupFormInit } from './components/forms/signup.js'

/** @type {document} */
const $d = document;

/** @type {HTMLDialogElement} */
let fundingModal

// @ts-ignore
// let dashsight = DashSight.create({
//   baseUrl: 'https://dashsight.dashincubator.dev',
// });

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

async function generateRecoveryPhrase(wifPk) {
  let targetBitEntropy = 128;
  let secretSalt = ''; // "TREZOR";
  let recoveryPhrase
  let seed
  let wallet
  let accountIndex = 0;
  let account
  let use = DashHd.RECEIVE;
  let xkey
  let xprv
  let xpub
  let key
  let privateKey
  let wif
  let address

  if (wifPk) {
    privateKey = await wifToPrivateKey(wifPk)
    address = await DashKeys.wifToAddr(wifPk);
    // recoveryPhrase = await DashPhrase.encode(wifToPK);
    // seed = await DashPhrase.toSeed(wifToPK, secretSalt);
  } else {
    recoveryPhrase = await DashPhrase.generate(targetBitEntropy);
    seed = await DashPhrase.toSeed(recoveryPhrase, secretSalt);
    wallet = await DashHd.fromSeed(seed);
    account = await wallet.deriveAccount(accountIndex);
    xkey = await account.deriveXKey(use);
    xprv = await DashHd.toXPrv(xkey);
    xpub = await DashHd.toXPub(xkey);
    key = await xkey.deriveAddress(use);
    address = await DashHd.toAddr(key.publicKey);
  }

  wif = await DashHd.toWif(key?.privateKey || privateKey);

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

export default async function main() {
  // ftdInit()
  defineFormatToDash()
  defineQrDialog()
  defineWithdrawDialog()
  defineSignupDialog()
  defineDepositForm()
  defineWithdrawForm()
  defineSignupForm()

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
  //   encryptedStore = await initEncryptedStore(passphrase)
  //   _privateKeys = JSON.parse(await encryptedStore.getItem(PK)) || []
  // } else if (!store.getItem(PKIV)) {
  //   _privateKeys = JSON.parse(await store.getItem(PK)) || []
  // }

  _privateKeys = await getStoredKeys(passphrase)

  if (currentPage === PAGE_WALLET) {
    console.info('ON PAGE:', PAGE_WALLET)
    // let keys = await getStoredKeys()
    let addrRows = await getAddrRows(_privateKeys, passphrase)

    console.info('WALLET ROWS', _privateKeys)

    $d.querySelector('#addressList tbody')
      .insertAdjacentHTML('afterbegin', addrRows)

    document.dispatchEvent(new CustomEvent("set:pass", { detail: passphrase }));
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

        encryptedStore = await initEncryptedStore(passphrase)

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

        encryptedStore = await initEncryptedStore(passphrase)

        const decryptedStoredKeys = await getStoredKeys(passphrase)

        for (let [address, wif] of storedKeys) {
          if (wif.length < 53) {
            console.log('stored key', address, wif.length)
            storeKeys({ address, wif }, passphrase)
          }
        }

        let addrRows = await getAddrRows(decryptedStoredKeys, passphrase)

        // console.info('WALLET ROWS', storedKeys, addrRows)

        $d.querySelector('#addressList tbody').innerHTML = addrRows
        document.dispatchEvent(new CustomEvent("set:pass", { detail: passphrase }));

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
          encryptedStore = await initEncryptedStore(passphrase)
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


  $d.addPrivKeyForm
    .addEventListener('submit', async event => {
      event.preventDefault()

      // @ts-ignore
      const privateKey = event.target.privateKey?.value?.trim()

      // Generate the new Public & Private Keys
      myKeys = await generateRecoveryPhrase(privateKey)

      // Store new keys in localStorage
      storeKeys(myKeys, passphrase)
      let storedKeys = await getStoredKeys(passphrase)
      let addrRows = await getAddrRows(storedKeys, passphrase)

      // console.info('WALLET ROWS', storedKeys, addrRows)

      $d.querySelector('#addressList tbody').innerHTML = addrRows
      document.dispatchEvent(new CustomEvent("set:pass", { detail: passphrase }));

      console.log('generateRecoveryPhrase', myKeys, storedKeys)

      // @ts-ignore
      event.target.privateKey.value = ''
    })


  $d.generatePrivKeyForm
    .addEventListener('submit', async event => {
      event.preventDefault()

      // const privateKey = $d.privKeyForm.privateKey?.value?.trim()

      // Generate the new Public & Private Keys
      myKeys = await generateRecoveryPhrase()
      // Store new keys in localStorage
      storeKeys(myKeys, passphrase)
      let storedKeys = await getStoredKeys(passphrase)
      let addrRows = await getAddrRows(storedKeys, passphrase)

      // console.info('WALLET ROWS', storedKeys, addrRows)

      $d.querySelector('#addressList tbody').innerHTML = addrRows
      document.dispatchEvent(new CustomEvent("set:pass", { detail: passphrase }));
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

  // Dynamically load components based on
  // `comp-init` attribute and visibility
  //
  // $d.querySelectorAll('[comp-init]').forEach(
  //   el => {
  //     let isHidden = el.offsetParent === null
  //     if (!isHidden) {
  //       import(el?.getAttribute('comp-init')).then(({ init }) => {
  //         init()
  //       })
  //     }
  //   }
  // )
}

main()