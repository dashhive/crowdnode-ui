import { isStoreEncrypted } from '../../lib/storage.js'
import { isDecryptedPhraseOrWif } from '../../utils.js'


import setupBackupDialog from '../dialogs/backup.js'
import setupEncryptDialog from '../dialogs/encrypt.js'

const initialState = {
  id: 'Button',
  name: 'unstake',
  submitTxt: 'Backup',
  submitAlt: 'Backup Recovery Phrase',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel Unstake',
}

export function setupBackupButton(el, state = {}) {
  state = {
    ...initialState,
    ...state,
  }

  // console.log('setupBackupButton state', state)

  const form = document.createElement('form')

  form.classList.add('field')

  form.name = `${state.name}Form`

  form.innerHTML = `
    <fieldset class="inline">
      <label>Backup Recovery Phrases &amp; Private Keys (WIFs)</label>
      <button id="${state.name}SubmitBtn" type="submit" title="${state.submitAlt}">${state.submitTxt}</button>
    </fieldset>
  `

  let handleBackupModal = async event => {
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

    if (
      isStoreEncrypted && (
        !state.passphrase ||
        !isDecryptedPhraseOrWif(state.phraseOrWif)
      )
    ) {
      let encryptDialog = await setupEncryptDialog(
        document.querySelector("main")
      )

      encryptDialog.addEventListener('close', handleBackupModal)

      encryptDialog.showModal()
    } else {
      await handleBackupModal(event)
    }
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

export default setupBackupButton
