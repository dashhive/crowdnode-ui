import {
  trigger,
} from './utils.js'
import {
  getAddrRows,
  getStakeRows,
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

const PAGE_ONBOARD = 'onboarding'
const PAGE_DASH = 'dashboard'
const PAGE_WALLET = 'wallet'
const PAGE_STAKE = 'staking'
const PAGE_SETTINGS = 'settings'

export default async function main() {
  defineFormatToDash()

  currentPage = location.pathname.split('crowdnode-ui')?.[1]?.slice(1) || location.pathname.slice(1) || 'onboarding'
  console.log('main location', currentPage, location.hash, location.search)
  // console.info('PAGE:', currentPage)

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

  if (
    currentPage === PAGE_ONBOARD &&
    document.body.clientWidth >= 650
  ) {
    return location.replace('/wallet')
  }

  if (
    [
      PAGE_DASH,
      PAGE_SETTINGS
    ].includes(currentPage)
  ) {
    return location.replace('/wallet')
  }

  if (_privateKeys.length === 0) {
    let addWalletDialog = setupAddWalletDialog($d.querySelector("main"))

    addWalletDialog.showModal()

    $d.querySelector('#addressGrid').insertAdjacentHTML('beforebegin', `
      <h4><em>Looks like you need to add or generate a new wallet.</em></h4>
    `)
  }

  if (currentPage === PAGE_WALLET && _privateKeys.length > 0) {
    await getAddrRows(
      $d.querySelector('#addressGrid'),
      _privateKeys,
      {
        status: () => trigger("set:pass", passphrase),
        passphrase
      }
    )

    trigger('set:pass', passphrase);
  }

  if (currentPage === PAGE_STAKE && _privateKeys.length > 0) {
    await getStakeRows(
      $d.querySelector('#stakingGrid'),
      _privateKeys,
      {
        status: () => trigger("set:pass", passphrase),
        passphrase
      }
    )

    trigger('set:pass', passphrase);
  }

  console.log('address & private keys', _privateKeys)

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

  // $d.balanceForm.addEventListener('submit', async event => {
  //   event.preventDefault()

  //   if (selectedPrivateKey) {
  //     const { addr } = selectedPrivateKey

  //     const { balance } = await displayBalances(addr)

  //     if (!balance?.TotalBalance) {
  //       console.warn(
  //         balance.value
  //       );
  //     }
  //   }
  // })
}

main()