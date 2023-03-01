import { isDecryptedPhraseOrWif } from '../../utils.js'

import setupStakeDialog from '../dialogs/stake.js'
import setupEncryptDialog from '../dialogs/encrypt.js'

const initialState = {
  id: 'Button',
  name: 'stake',
  submitTxt: 'Stake',
  submitAlt: 'Stake in CrowdNode',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel Stake',
}

export function setupStakeButton(el, state = {}) {
  state = {
    ...initialState,
    ...state,
  }

  // console.log('setupStakeButton state', state)

  const form = document.createElement('form')

  form.classList.add('btn')

  form.name = `${state.name}Form`

  form.innerHTML = `
    <fieldset>
      <button type="submit">${state.submitTxt}</button>
    </fieldset>
  `

  let handleStakeModal = async event => {
    let returnValue = event?.target?.returnValue

    // console.log(
    //   `${state.name} button handleStakeModal`,
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
      let stakeDialog = setupStakeDialog(
        document.querySelector("main"),
        {
          address: state.address,
          passphrase: state.passphrase
        }
      )

      stakeDialog.showModal()
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

      encryptDialog.addEventListener('close', handleStakeModal)

      encryptDialog.showModal()
    } else {
      await handleStakeModal()
    }
  }

  form.addEventListener('submit', handleSubmit)

  el.classList.remove('signup-col')
  el.insertAdjacentElement('afterbegin', form)

  return form
}

export default setupStakeButton
