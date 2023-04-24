import {
  trigger,
} from '../../utils.js'
import {
  getAddrRows,
  getStakeRows,
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

// https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/** @type {document} */
const $d = document;

let encryptedStore
let passphrase

export async function setupEncryptDialog(el, state = {}) {
  const isStoreEncrypted = !!(await store.getItem(`${ENCRYPT_IV}_iv`))

  let cryptDirection = isStoreEncrypted ? 'decrypt' : 'encrypt'
  let capCryptDir = `${capitalizeFirstLetter(cryptDirection)}`
  let title = `${capCryptDir} Wallet`

  const initialState = {
    id: 'Modal',
    name: 'encrypt',
    submitTxt: capCryptDir,
    submitAlt: title,
    cancelTxt: 'Cancel',
    cancelAlt: `Cancel ${capCryptDir}`,
  }

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

  dialog.innerHTML = ''

  dialog.id = `${state.name}${state.id}`
  dialog.classList.add('responsive')

  form.name = `${state.name}Form`
  form.method = 'dialog'

  form.innerHTML = `
    <fieldset>
      <h2>${title}</h2>

      <label for="encryptPassphrase">
        Passphrase
      </label>
      <input
        type="password"
        id="encryptPassphrase"
        name="passphrase"
        placeholder="${capCryptDir} Passphrase"
        minlength="1"
        spellcheck="false"
      />

      <p>Enter a passphrase to ${cryptDirection} the wallet recovery phrase(s) stored in your browser's Local Storage.</p>

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
    // console.log('encrypt dialog handleReset', event)
    form?.removeEventListener('close', handleReset)
    dialog.close('cancel')
  }
  let handleChange = event => {
    event.preventDefault()
    // console.log('encrypt field handleChange', event)
    event.target.setCustomValidity('')
    event.target.reportValidity()
  }
  let handleSubmit = async event => {
    event.preventDefault()
    // console.log('encrypt dialog handleSubmit', event)

    // @ts-ignore
    passphrase = event.target.passphrase?.value

    const storedKeys = await getStoredKeys()

    if (passphrase) {
      // console.log('passphrase', passphrase)

      // @ts-ignore
      event.target.passphrase.value = ''
      // event.target.querySelector('button[type="submit"]').disabled = true

      // await encryptKeys(storedKeys, passphrase)

      encryptedStore = await initEncryptedStore(passphrase)

      let decryptedStoredKeys = await getStoredKeys(passphrase)

      let decryptSuccess = false

      decryptedStoredKeys.forEach(
        ([addr, phrase]) => {
          if (phrase !== null) {
            decryptSuccess = true
          }
        }
      )

      await getAddrRows(
        $d.querySelector('#addressGrid'),
        decryptedStoredKeys,
        {
          status: () => trigger("set:pass", passphrase),
          passphrase
        }
      )
      await getStakeRows(
        $d.querySelector('#stakingGrid'),
        decryptedStoredKeys,
        {
          status: () => trigger("set:pass", passphrase),
          passphrase
        }
      )

      // console.info('WALLET ROWS', storedKeys, addrRows)

      trigger("set:pass", passphrase);

      if (!isStoreEncrypted || decryptSuccess) {
        await encryptKeys(storedKeys, passphrase)

        decryptedStoredKeys = await getStoredKeys(passphrase)
        // event.target.querySelector('button[type="submit"]').disabled = false
        // $d.privKeyForm.querySelector('button').disabled = false

        // form?.removeEventListener('change', handleChange)
        form?.removeEventListener('reset', handleReset)
        form?.removeEventListener('submit', handleSubmit)

        dialog.close(passphrase)
      } else {
        event.target.passphrase.setCustomValidity(
          'Unable to decrypt wallet(s)'
        )
        event.target.passphrase.reportValidity()
      }

      console.log('encrypt dialog form selectedPrivateKey', {
        storedKeys,
        encryptedStore,
        decryptedStoredKeys,
        isStoreEncrypted,
        dl: decryptedStoredKeys.length,
        el: storedKeys.length,
      })
    }
  }

  dialog.addEventListener('close', handleClose)

  form.addEventListener('change', handleChange)
  form.addEventListener('reset', handleReset)
  form.addEventListener('submit', handleSubmit)

  dialog.insertAdjacentElement('afterbegin', form)

  el.insertAdjacentElement('afterend', dialog)

  // dialog.showModal()

  return dialog
}

export default setupEncryptDialog
