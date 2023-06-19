import { isStoreEncrypted } from '../../lib/storage.js'
import { isDecryptedPhraseOrWif } from '../../utils.js'

// import setupBackupDialog from '../dialogs/backup.js'
// import setupEncryptDialog from '../dialogs/encrypt.js'
import setupAddWalletDialog from '../dialogs/addwallet.js'

const initialState = {
  id: 'Button',
  name: 'wallet',
  submitTxt: 'Add / Generate',
  submitAlt: 'Add or Generate a new Wallet',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel Generate Wallet',
}

export function setupWalletButton(el, state = {}) {
  state = {
    ...initialState,
    ...state,
  }

  // console.log('setupWalletButton state', state)

  const form = document.createElement('form')

  form.classList.add('field')

  form.name = `${state.name}Form`

  form.innerHTML = `
    <fieldset class="inline">
      <label>Add or Generate a wallet</label>
      <button id="${state.name}SubmitBtn" type="submit" title="${state.submitAlt}">${state.submitTxt}</button>
    </fieldset>
  `

  let handleWalletModal = async event => {
    let returnValue = event?.target?.returnValue

    // console.log(
    //   `${state.name} button handleBackupModal`,
    //   returnValue,
    //   state.passphrase?.length
    // )

    if (returnValue && returnValue !== 'cancel') {
      state.passphrase = returnValue
    }

    if (
      !isStoreEncrypted || (
        state.passphrase ||
        isDecryptedPhraseOrWif(state.phraseOrWif)
      )
    ) {
      let backupDialog = await setupBackupDialog(
        document.querySelector("main"),
        {
          address: state.address,
          passphrase: state.passphrase
        }
      )

      backupDialog.showModal()
    }
  }

  let handleSubmit = async event => {
    event.preventDefault()
    // console.log(`${state.name} button handleSubmit`, event)

    let addWalletDialog = await setupAddWalletDialog(
      document.querySelector("main")
    )

    // addWalletDialog.addEventListener('close', handleWalletModal)

    addWalletDialog.showModal()
    // if (
    //   isStoreEncrypted && (
    //     !state.passphrase ||
    //     !isDecryptedPhraseOrWif(state.phraseOrWif)
    //   )
    // ) {
    //   let encryptDialog = await setupEncryptDialog(
    //     document.querySelector("main")
    //   )

    //   encryptDialog.addEventListener('close', handleWalletModal)

    //   encryptDialog.showModal()
    // } else {
    //   await handleWalletModal(event)
    // }
  }

  form.addEventListener('submit', handleSubmit)

  let existingForm = el.querySelector(`form[name="${form.name}"]`)

  // console.log('backup existingForm', existingForm)

  if (existingForm) {
    existingForm.replaceWith(form)
  } else {
    el.insertAdjacentElement('beforeend', form)
  }

  return form
}

export default setupWalletButton
