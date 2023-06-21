import {
  trigger,
  generateRecoveryPhrase,
} from '../../utils.js'
import {
  getAddrRows,
  getStakeRows,
  formatWalletName,
} from '../../lib/ui.js'
import {
  getStoredKeys,
  storePhraseOrWif,
  store,
  KEY_PREFIX,
} from '../../lib/storage.js'

/** @type {document} */
const $d = document;

let passphrase
let myKeys

const initialState = {
  id: 'Modal',
  name: 'generateAddress',
  submitGenTxt: 'Generate Address',
  submitGenAlt: 'Generate New Address',
  cancelGenTxt: 'Cancel',
  cancelGenAlt: 'Cancel Generate Address',
}

export async function setupGenerateAddressDialog(el, state = {}) {
  state = {
    ...initialState,
    ...state,
  }

  let wallets = Object.keys(store)
    .filter(k => k.startsWith(KEY_PREFIX))

  const dialog = document.createElement('dialog')
  const genForm = document.createElement('form')
  const progress = document.createElement('progress')

  progress.classList.add('pending')

  dialog.innerHTML = ''

  dialog.id = `${state.name}${state.id}`
  dialog.classList.add('responsive')

  console.log('setupGenerateAddressDialog wallets', wallets)

  let selectWallet = `<select name="wallet" class="ta-left p-x-4">${
    wallets.map((walletName) =>
      `<option value="${walletName}">${formatWalletName(walletName)}</option>`
    ).join('\n')
  }</select>`

  genForm.setAttribute('name', `${state.name}GenForm`)

  genForm.innerHTML = `
    <fieldset>
      <h2>Generate a New Address</h2>
      <label for="wallet">
        Wallet
      </label>
      ${selectWallet}
      <br/>
      <button type="submit" title="${state.submitGenAlt}">
        <span>${state.submitGenTxt}</span>
      </button>
      <p><em>If you want to segment your CrowdNode investments, you can generate multiple addresses.</em></p>
    </fieldset>
    <fieldset class="inline">
      <button type="reset" title="${state.cancelGenAlt}">
        <span>${state.cancelGenTxt}</span>
      </button>
    </fieldset>
  `

  let handleClose = event => {
    event.preventDefault()
    // console.log('encrypt dialog handleClose', event)
    dialog?.removeEventListener('close', handleClose)
    // @ts-ignore
    event?.target?.remove()
  }
  let handleReset = event => {
    event.preventDefault()
    // console.log('encrypt dialog handleReset', event)
    genForm?.removeEventListener('close', handleReset)
    dialog.close('cancel')
  }
  let handleGenSubmit = async event => {
    event.preventDefault()

    let { storedKeys } = await getStoredKeys(state.passphrase)

    // @ts-ignore
    // const rpId = `${KEY_PREFIX}0`

    const phraseKey = event.target.wallet?.value
    console.log('============ phraseKey', phraseKey)
    // let phraseKey = Object.keys(store)
    //   .find(k => k.startsWith(KEY_PREFIX))
    // console.log('============ handleGenSubmit phraseKey', phraseKey)

    let accts = JSON.parse(await store.getItem(`accounts`))
    // let addrs = JSON.parse(await store.getItem(`addresses`))
    // const privateKey = await store.getItem(phraseKey)
    console.log('########### handleGenSubmit', storedKeys, phraseKey, accts)
    if (storedKeys.length > 0) {
      const [ _addr, privateKey, ] = storedKeys.find(
        ([_addr, _recPhrase, storeKey]) => storeKey === phraseKey
      )
      const nextAccountIndex = accts[phraseKey].length

      // Generate the new Public & Private Keys
      myKeys = await generateRecoveryPhrase(
        privateKey,
        nextAccountIndex,
      )
      let { address, wif, recoveryPhrase, } = myKeys
      let unstoredKeys = [
        address,
        recoveryPhrase || wif,
        phraseKey,
        nextAccountIndex,
      ]

      // Store new keys in localStorage
      // @ts-ignore
      await storePhraseOrWif(unstoredKeys, state.passphrase)

      let latestKeys = await getStoredKeys(state.passphrase)

      // let accts = JSON.parse(localStorage.accounts)
      // let addrs = JSON.parse(localStorage.addresses)
      // let addr = 'XoorotBW6ApopHBLR9vkMZfztPAoNFwr6f'
      // let targetPhrase = addrs[addr]

      // accts[targetPhrase].findIndex(v => v === addr)

      // account = await wallet.deriveAccount(nextAccountIndex);
      // xkey = await account.deriveXKey(DashHd.RECEIVE);
      // key = await xkey.deriveAddress(addressIndex);
      // address = await DashHd.toAddr(key.publicKey);

      await getAddrRows(
        $d.querySelector('#addressGrid'),
        latestKeys.storedKeys,
        {
          status: () => trigger("set:pass", state.passphrase),
          passphrase: state.passphrase
        }
      )
      await getStakeRows(
        $d.querySelector('#stakingGrid'),
        latestKeys.storedKeys,
        {
          status: () => trigger("set:pass", state.passphrase),
          passphrase: state.passphrase
        }
      )

      trigger("set:pass", state.passphrase);

      // console.log('generateRecoveryPhrase', myKeys, storedKeys)

      // @ts-ignore
      // event.target.privateKey.value = ''
      return dialog.close(`add__${address}`)
    }
    dialog.close(`fail_add_address`)
  }

  let handleSetPass = event => {
    event.preventDefault()
    // console.log('address dialog handleSetPass', event.detail)
    state.passphrase = event.detail;
  }

  dialog.addEventListener('close', handleClose)

  genForm.addEventListener('reset', handleReset)
  genForm.addEventListener('submit', handleGenSubmit)

  window.addEventListener('set:pass', handleSetPass) //,  { once: true }

  dialog.insertAdjacentElement('beforeend', genForm)

  // this.dialog.querySelector('figure')
  el.insertAdjacentElement('afterend', dialog)

  // dialog.showModal()

  return dialog
}

export default setupGenerateAddressDialog
