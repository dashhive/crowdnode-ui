import {
  trigger,
  isDecryptedPhraseOrWif,
} from './utils.js'
import {
  getAddrRows,
  getStakeRows,
  // displayBalances,
  // getCurrencies,
  updateFiatDisplay,
  displayVersionInfo,
} from './lib/ui.js'
import {
  getStoredKeys,
  // swapStorage,
  // initEncryptedStore,
  checkCache,
  fiatCurrency,
  jsonStore,
} from './lib/storage.js'
import {
  CrowdNode,
} from './imports.js'

import setupEncryptDialog from './components/dialogs/encrypt.js'
import setupAddWalletDialog from './components/dialogs/addwallet.js'
import setupGenerateAddressDialog from './components/dialogs/address.js'
import setupFiatSelector from './components/forms/fiat.js'
import setupBackupSelector from './components/forms/backup.js'
import setupWalletButton from './components/forms/wallet.js'


import defineFormatToDash, {
  init as ftdInit
} from './components/format-to-dash.js'

/** @type {document} */
const $d = document;

let locUrl = new URL(location.toString())
let IS_PROD = location.pathname.includes('crowdnode-ui')
let Settings = jsonStore(localStorage)
let passphrase
let currentPage

let _privateKeys = []

const PAGE_ONBOARD = 'onboarding'
const PAGE_DASH = 'dashboard'
const PAGE_WALLET = 'wallet'
const PAGE_STAKE = 'staking'
const PAGE_SETTINGS = 'settings'

export async function changeRoute(route) {
  if (route.includes('#!/')) {
    currentPage = route?.slice(3) || PAGE_ONBOARD
  } else {
    currentPage = PAGE_ONBOARD
  }
  // console.log('URL LOC:', location, IS_PROD)
  // console.info('URL PAGE:', route, currentPage)

  $d.querySelectorAll(`section.page.active`)
    .forEach(el => el.classList.remove('active'))

  let pageEl = $d.querySelector(`section.page#${currentPage}`)

  pageEl?.classList.add('active')

  if (
    currentPage === PAGE_ONBOARD &&
    document.body.clientWidth >= 650 &&
    !locUrl.searchParams.has('p')
  ) {
    return location.replace(
      IS_PROD ? '/crowdnode-ui/#!/wallet' : '#!/wallet' //
    )
  }

  // if (
  //   [
  //     PAGE_DASH,
  //     PAGE_SETTINGS
  //   ].includes(currentPage)
  // ) {
  //   return location.replace(
  //     IS_PROD ? '/crowdnode-ui/wallet' : '/wallet'
  //   )
  // }

  if (currentPage === PAGE_WALLET) {
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

  if (currentPage === PAGE_STAKE) {
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

  if (currentPage === PAGE_SETTINGS) {
    setupWalletButton(
      $d.querySelector('#settings'),
      {}
    )
    setupBackupSelector(
      $d.querySelector('#settings'),
      {
        // submitTxt: '📥',
        // address: pub,
        // phraseOrWif: priv,
        // passphrase: state.passphrase
      },
    )
    setupFiatSelector(
      $d.querySelector('#settings'),
      {
        // submitTxt: '📥',
        // address: pub,
        // phraseOrWif: priv,
        // passphrase: state.passphrase
      },
    )
    displayVersionInfo(
      $d.querySelector('#settings'),
      Settings
    )
  }
}

export default async function main() {
  checkCache()

  defineFormatToDash()

  CrowdNode.init({
    // baseUrl: 'https://app.crowdnode.io',
    insightBaseUrl: 'https://insight.dash.org',
    baseUrl: 'https://dashnode.duckdns.org/api/cors/app.crowdnode.io',
    // insightBaseUrl: 'https://insight.dash.org/insight-api',
    dashsocketBaseUrl: 'https://insight.dash.org/socket.io',
    dashsightBaseUrl: 'https://insight.dash.org/insight-api',
    // dashsightBaseUrl: 'https://dashsight.dashincubator.dev/insight-api',
  })

  let { storedKeys } = await getStoredKeys(passphrase)
  _privateKeys = storedKeys

  if (_privateKeys.length === 0) {
    let addWalletDialog = await setupAddWalletDialog($d.querySelector("main"))

    addWalletDialog.showModal()
  }

  await changeRoute(location.hash)

  console.log('address & private keys', _privateKeys)

  $d.querySelector('nav .encrypt')
    .addEventListener('click', async event => {
      event.preventDefault()

      let encryptDialog = await setupEncryptDialog($d.querySelector("main"))

      encryptDialog.showModal()
    })

  async function handleAddAddress(event) {
    if (event?.target?.returnValue !== 'cancel') {
      let genAddrDialog = await setupGenerateAddressDialog(
        $d.querySelector("main"),
        {
          passphrase: event?.target?.returnValue || passphrase,
        }
      )

      genAddrDialog.showModal()
    }
  }

  $d.querySelector('nav .addwallet')
    .addEventListener('click', async event => {
      event.preventDefault()

      let { storedKeys } = await getStoredKeys(passphrase)
      _privateKeys = storedKeys

      if (_privateKeys.length === 0) {
        let addWalletDialog = await setupAddWalletDialog($d.querySelector("main"))

        addWalletDialog.showModal()
      } else {
        let [,firstRecoveryPhrase] = storedKeys[0]
        if(
          !passphrase &&
          !isDecryptedPhraseOrWif(firstRecoveryPhrase)
        ) {
          let encryptDialog = await setupEncryptDialog($d.querySelector("main"))

          encryptDialog.addEventListener('close', handleAddAddress)

          encryptDialog.showModal()
        } else {
          await handleAddAddress()
        }
      }
    })

  localStorage.setItem('fiat', JSON.stringify(await updateFiatDisplay(
    document.querySelector('#navBalances'),
    fiatCurrency
  )))
  // console.log('MAIN FIAT', fiat)

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

  // https://developer.mozilla.org/en-US/docs/Web/API/Window/hashchange_event
  window.addEventListener(
    "hashchange",
    async ({ newURL, oldURL }) => {
      // console.log(
      //   `route changed from ${
      //     new URL(oldURL)?.hash
      //   } to ${
      //     new URL(newURL)?.hash
      //   }`
      // );
      await changeRoute(location.hash)
    },
    false
  );

  await changeRoute(location.hash)
}

// window.addEventListener('load', main)

main()