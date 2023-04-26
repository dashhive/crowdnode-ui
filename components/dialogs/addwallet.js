import {
  trigger,
  generateRecoveryPhrase,
} from '../../utils.js'
import {
  getAddrRows,
  getStakeRows,
} from '../../lib/ui.js'
import {
  getStoredKeys,
  storePhraseOrWif,
} from '../../lib/storage.js'
import setupBackupDialog from './backup.js'
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

  dialog.innerHTML = ''

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
      <h2>Add Existing Wallet</h2>

      <label for="addWalletRecoveryPhrase">
        Recovery Phrase or Private Key WIF
      </label>
      <input
        id="addWalletRecoveryPhrase"
        name="privateKey"
        placeholder="Ðash Recovery Phrase"
        spellcheck="false"
      />
      <p><em>Choose this option if you already have a recovery phrase or WIF.</em></p>
    </fieldset>
    <fieldset class="">
      <button type="submit" title="${state.submitAddAlt}">
        <span>${state.submitAddTxt}</span>
      </button>
    </fieldset>
  `

  genForm.innerHTML = `
    <h2>OR</h2>

    <fieldset>
      <h2>Generate a New Wallet</h2>
      <p><em>Choose this option if you would like to generate a brand new recovery phrase.</em></p>
      <button type="submit" title="${state.submitGenAlt}">
        <span>${state.submitGenTxt}</span>
      </button>
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

    // if (this.listeners['close']?.length > 0) {
    //   for (let callback of this.listeners['close']) {
    //     callback(this.dialog)
    //   }
    // }
  }
  let handleReset = event => {
    event.preventDefault()
    // console.log('encrypt dialog handleReset', event)
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
    await getAddrRows(
      $d.querySelector('#addressGrid'),
      storedKeys,
      {
        status: () => trigger("set:pass", passphrase)
      }
    )
    await getStakeRows(
      $d.querySelector('#stakingGrid'),
      storedKeys,
      {
        status: () => trigger("set:pass", passphrase),
        passphrase
      }
    )

    trigger("set:pass", passphrase);

    // console.log('generateRecoveryPhrase', myKeys, storedKeys)

    // @ts-ignore
    event.target.privateKey.value = ''
    dialog.close(`add__${address}`)
  }
  let handleBackupModal = async event => {
    // let returnValue = event?.target?.returnValue

    // if (returnValue && returnValue !== 'cancel') {
    //   state.passphrase = returnValue
    // }
    let storedKeys = await getStoredKeys(passphrase)

    await getAddrRows(
      $d.querySelector('#addressGrid'),
      storedKeys,
      {
        status: () => trigger("set:pass", passphrase)
      }
    )
    await getStakeRows(
      $d.querySelector('#stakingGrid'),
      storedKeys,
      {
        status: () => trigger("set:pass", passphrase),
        passphrase
      }
    )

    trigger("set:pass", passphrase);

    // console.log('generateRecoveryPhrase', myKeys, storedKeys)
    dialog.close('generate')
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

    let backupDialog = await setupBackupDialog(
      document.querySelector("main"),
      {
        recoveryPhrase,
        address,
        passphrase
      }
    )

    backupDialog.addEventListener('close', handleBackupModal)

    backupDialog.showModal()
  }

  dialog.addEventListener('close', handleClose)

  addForm.addEventListener('reset', handleReset)
  addForm.addEventListener('submit', handleAddSubmit)
  genForm.addEventListener('reset', handleReset)
  genForm.addEventListener('submit', handleGenSubmit)

  dialog.insertAdjacentElement('afterbegin', addForm)
  dialog.insertAdjacentElement('beforeend', genForm)

  // this.dialog.querySelector('figure')
  el.insertAdjacentElement('afterend', dialog)

  // dialog.showModal()

  return dialog
}

export default setupAddWalletDialog
