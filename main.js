import {
  trigger,
} from './utils.js'
import {
  getAddrRows,
  displayBalances,
} from './lib/ui.js'
import {
  getStoredKeys,
  swapStorage,
  initEncryptedStore,
} from './lib/storage.js'
import {
  CrowdNode,
} from './imports.js'

import setupEncryptDialog from './components/dialogs/encrypt.js'
import setupAddWalletDialog from './components/dialogs/addwallet.js'

import defineFormatToDash, { init as ftdInit } from './components/format-to-dash.js'

/** @type {document} */
const $d = document;

let rememberMe = JSON.parse(localStorage.getItem('remember'))
let store = rememberMe ? localStorage : sessionStorage
let selectedPrivateKey = store.getItem('selectedPrivateKey')
let passphrase
let currentPage
let encryptedStore

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

export default async function main() {
  defineFormatToDash()

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

  _privateKeys = await getStoredKeys(passphrase)

  if (currentPage === PAGE_WALLET) {
    console.info('ON PAGE:', PAGE_WALLET)

    let addrRows = await getAddrRows(
      $d.querySelector('#addressList tbody'),
      _privateKeys,
      {
        status: () => trigger("set:pass", passphrase),
        passphrase
      }
    )

    console.info('WALLET ROWS', _privateKeys)

    trigger('set:pass', passphrase);
  }

  console.log('un/encrypted private keys', _privateKeys)

  $d.querySelector('nav .encrypt')
    .addEventListener('click', async event => {
      event.preventDefault()

      let encryptDialog = await setupEncryptDialog($d.querySelector("main"))

      encryptDialog.showModal()
    })

  $d.querySelector('nav .addwallet')
    .addEventListener('click', async event => {
      event.preventDefault()

      let addWalletDialog = setupAddWalletDialog($d.querySelector("main"))

      addWalletDialog.showModal()
    })

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

        console.log('encPrivKey form selectedPrivateKey', {
          selectedPrivateKey,
          storedKeys,
          isStoreEncrypted,
        })

        $d.privKeyForm.querySelector('button').disabled = false
      }
    })

  $d.privKeyForm
    .addEventListener('input', async (
      /** @type {Event & { target: HTMLInputElement}} event */
      event
      ) => {
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