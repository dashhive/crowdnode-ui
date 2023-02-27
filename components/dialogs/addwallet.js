import {
  trigger,
  generateRecoveryPhrase,
} from '../../utils.js'
import {
  getAddrRows,
} from '../../lib/ui.js'
import {
  getStoredKeys,
  storePhraseOrWif,
} from '../../lib/storage.js'
// import {
//   // Secp256k1,
//   // Base58Check,
//   // RIPEMD160,
//   // DashApi,
//   // DashHd,
//   // DashPhrase,
//   // DashKeys,
//   // DashSight,
//   // DashSocket,
//   CrowdNode,
// } from '../../imports.js'

/** @type {document} */
const $d = document;

let encryptedStore
let passphrase
let myKeys

const initialState = {
  id: 'Modal',
  name: 'addWallet',
  submitAddTxt: 'Add Wallet',
  submitAddAlt: 'Add Existing Dash Wallet',
  cancelAddTxt: 'Cancel',
  cancelAddAlt: 'Cancel Add Wallet',
  submitGenTxt: 'Generate Wallet',
  submitGenAlt: 'Generate New Wallet',
  cancelGenTxt: 'Cancel',
  cancelGenAlt: 'Cancel Generate Wallet',
}

export function setupAddWalletDialog(el, state = {}) {
  state = {
    ...initialState,
    ...state,
  }
  // this.name = this.getAttribute('name') || 'withdrawForm'
  // this.btn = this.getAttribute('btn') || 'Withdraw Funds'

  const dialog = document.createElement('dialog')
  const addForm = document.createElement('form')
  const genForm = document.createElement('form')
  const progress = document.createElement('progress')
  // const style = document.createElement('style')

  progress.classList.add('pending')

  // style.textContent = `
  //   @import url(/index.css);
  // `

  dialog.innerHTML = `
    <figure>
    </figure>
  `

  dialog.id = `${state.name}${state.id}`
  dialog.classList.add('responsive')

  addForm.setAttribute('name', `${state.name}AddForm`)
  genForm.setAttribute('name', `${state.name}GenForm`)

  // <form name="addPrivKeyForm">
  //   <fieldset class="inline">
  //     <input name="privateKey" placeholder="Ðash Private Key (WIF)" spellcheck="false" />
  //     <button type="submit">Add Private Key</button>
  //   </fieldset>
  // </form>
  // <form name="generatePrivKeyForm">
  //   <fieldset>
  //     <button type="submit">Generate New Private Key</button>
  //   </fieldset>
  // </form>

  addForm.innerHTML = `
    <fieldset>
      <input
        name="privateKey"
        placeholder="Ðash Private Key (WIF)"
        spellcheck="false"
      />
    </fieldset>
    <fieldset class="inline">
      <button type="submit" title="${state.submitAddAlt}">
        <span>${state.submitAddTxt}</span>
      </button>
    </fieldset>
  `

  genForm.innerHTML = `
    <fieldset class="inline">
      <button type="reset" title="${state.cancelGenAlt}">
        <span>${state.cancelGenTxt}</span>
      </button>
      <button type="submit" title="${state.submitGenAlt}">
        <span>${state.submitGenTxt}</span>
      </button>
    </fieldset>
  `

  let handleClose = event => {
    event.preventDefault()
    console.log('encrypt dialog handleClose', event)
    dialog?.removeEventListener('close', handleClose)
    // @ts-ignore
    event?.target?.remove()

    // if (this.listeners['close']?.length > 0) {
    //   for (let callback of this.listeners['close']) {
    //     callback(this.dialog)
    //   }
    // }
  }
  let handleReset = event => {
    event.preventDefault()
    console.log('encrypt dialog handleReset', event)
    addForm?.removeEventListener('close', handleReset)
    genForm?.removeEventListener('close', handleReset)
    dialog.close('cancel')
  }
  let handleAddSubmit = async event => {
    event.preventDefault()

    // @ts-ignore
    const privateKey = event.target.privateKey?.value?.trim()

    // Generate the new Public & Private Keys
    myKeys = await generateRecoveryPhrase(privateKey)
    let { address, wif, recoveryPhrase } = myKeys
    let unstoredKeys = [address, recoveryPhrase || wif]

    // Store new keys in localStorage
    // @ts-ignore
    await storePhraseOrWif(unstoredKeys, passphrase)
    let storedKeys = await getStoredKeys(passphrase)
    let addrRows = await getAddrRows(
      $d.querySelector('#addressGrid section'),
      storedKeys,
      {
        status: () => trigger("set:pass", passphrase)
      }
    )

    trigger("set:pass", passphrase);

    console.log('generateRecoveryPhrase', myKeys, storedKeys)

    // @ts-ignore
    event.target.privateKey.value = ''
    dialog.close(`add__${address}`)
  }
  let handleGenSubmit = async event => {
    event.preventDefault()

    // Generate the new Public & Private Keys
    myKeys = await generateRecoveryPhrase()
    let { address, wif, recoveryPhrase } = myKeys
    let unstoredKeys = [address, recoveryPhrase || wif]

    // Store new keys in localStorage
    // @ts-ignore
    await storePhraseOrWif(unstoredKeys, passphrase)
    let storedKeys = await getStoredKeys(passphrase)
    let addrRows = await getAddrRows(
      $d.querySelector('#addressGrid section'),
      storedKeys,
      {
        status: () => trigger("set:pass", passphrase)
      }
    )

    trigger("set:pass", passphrase);

    console.log('generateRecoveryPhrase', myKeys, storedKeys)
    dialog.close('generate')
  }

  dialog.addEventListener('close', handleClose)

  addForm.addEventListener('reset', handleReset)
  addForm.addEventListener('submit', handleAddSubmit)
  genForm.addEventListener('reset', handleReset)
  genForm.addEventListener('submit', handleGenSubmit)

  dialog.querySelector('figure')
    .insertAdjacentElement('afterbegin', addForm)
  dialog.querySelector('figure')
    .insertAdjacentElement('beforeend', genForm)

  // this.dialog.querySelector('figure')
  el.insertAdjacentElement('afterend', dialog)

  // dialog.showModal()

  return dialog
}

export default setupAddWalletDialog
