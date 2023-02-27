import {
  trigger,
} from '../../utils.js'
import {
  getAddrRows,
} from '../../lib/ui.js'
import {
  getStoredKeys,
  initEncryptedStore,
  encryptKeys,
  store,
  ENCRYPT_IV,
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

const initialState = {
  id: 'Modal',
  name: 'encrypt',
  submitTxt: 'Encrypt/Decrypt',
  submitAlt: 'Encrypt/Decrypt Wallet',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel Encrypt/Decrypt',
}

export async function setupEncryptDialog(el, state = {}) {
  state = {
    ...initialState,
    ...state,
  }
  // this.name = this.getAttribute('name') || 'withdrawForm'
  // this.btn = this.getAttribute('btn') || 'Withdraw Funds'

  const dialog = document.createElement('dialog')
  const form = document.createElement('form')
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

  form.name = `${state.name}Form`
  form.method = 'dialog'

  form.innerHTML = `
    <fieldset>
      <p>Enter a passphrase to encrypt the data stored in the wallet(s).</p>
      <input type="password" name="passphrase" placeholder="Encryption Passphrase" minlength="1" spellcheck="false" />
      <div class="error"></div>
    </fieldset>
    <fieldset class="inline">
      <button type="reset" title="${state.cancelAlt}">
        <span>${state.cancelTxt}</span>
      </button>
      <button type="submit" title="${state.submitAlt}">
        <span>${state.submitTxt}</span>
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
    form?.removeEventListener('close', handleReset)
    dialog.close('cancel')
  }
  let handleSubmit = async event => {
    event.preventDefault()
    console.log('encrypt dialog handleSubmit', event)

    // @ts-ignore
    passphrase = event.target.passphrase?.value

    const storedKeys = await getStoredKeys()
    const isStoreEncrypted = !!(await store.getItem(`${ENCRYPT_IV}_iv`))

    if (passphrase) {
      // console.log('passphrase', passphrase)

      // @ts-ignore
      event.target.passphrase.value = ''
      // event.target.querySelector('button[type="submit"]').disabled = true

      await encryptKeys(storedKeys, passphrase)

      encryptedStore = await initEncryptedStore(passphrase)

      const decryptedStoredKeys = await getStoredKeys(passphrase)

      let addrRows = await getAddrRows(
        $d.querySelector('#addressGrid section'),
        decryptedStoredKeys,
        {
          status: () => trigger("set:pass", passphrase),
          passphrase
        }
      )

      // console.info('WALLET ROWS', storedKeys, addrRows)

      trigger("set:pass", passphrase);

      console.log('encrypt dialog form selectedPrivateKey', {
        storedKeys,
        decryptedStoredKeys,
        isStoreEncrypted,
        el: decryptedStoredKeys.length,
        ul: storedKeys.length,
      })

      // event.target.querySelector('button[type="submit"]').disabled = false
      // $d.privKeyForm.querySelector('button').disabled = false

      form?.removeEventListener('submit', handleSubmit)

      dialog.close(passphrase)
    }
  }

  dialog.addEventListener('close', handleClose)

  form.addEventListener('reset', handleReset)
  form.addEventListener('submit', handleSubmit)

  dialog.querySelector('figure')
    .insertAdjacentElement('afterbegin', form)

  // this.dialog.querySelector('figure')
  el.insertAdjacentElement('afterend', dialog)

  // dialog.showModal()

  return dialog
}

export default setupEncryptDialog
