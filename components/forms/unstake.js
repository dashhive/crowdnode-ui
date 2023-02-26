import { isDecryptedPhraseOrWif } from '../../utils.js'

import setupUnstakeDialog from '../dialogs/unstake.js'
import setupEncryptDialog from '../dialogs/encrypt.js'

const initialState = {
  id: 'Button',
  name: 'unstake',
  submitTxt: 'Unstake',
  submitAlt: 'Unstake from CrowdNode',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel Unstake',
}

export function setupUnstakeButton(el, state = {}) {
  state = {
    ...initialState,
    ...state,
  }

  console.log('setupUnstakeButton state', state)

  const form = document.createElement('form')

  form.classList.add('btn')

  form.name = `${state.name}Form`

  form.innerHTML = `
    <fieldset>
      <button type="submit">${state.submitTxt}</button>
    </fieldset>
  `

  let handleUnstakeModal = async event => {
    let returnValue = event?.target?.returnValue

    // console.log(
    //   `${state.name} button handleUnstakeModal`,
    //   returnValue,
    //   state.passphrase?.length
    // )

    if (returnValue && returnValue !== 'cancel') {
      state.passphrase = returnValue
    }

    if (
      state.passphrase ||
      isDecryptedPhraseOrWif(state.phraseOrWif)
    ) {
      let unstakeDialog = setupUnstakeDialog(
        document.querySelector("main"),
        {
          address: state.address,
          passphrase: state.passphrase
        }
      )

      unstakeDialog.showModal()
    }
  }

  let handleSubmit = async event => {
    event.preventDefault()
    console.log(`${state.name} button handleSubmit`, event)

    if(
      !state.passphrase &&
      !isDecryptedPhraseOrWif(state.phraseOrWif)
    ) {
      let encryptDialog = await setupEncryptDialog(document.querySelector("main"))

      encryptDialog.addEventListener('close', handleUnstakeModal)

      encryptDialog.showModal()
    } else {
      await handleUnstakeModal()
    }
  }

  form.addEventListener('submit', handleSubmit)

  el.insertAdjacentElement('afterbegin', form)

  return form
}

export default setupUnstakeButton
