import { isDecryptedPhraseOrWif } from '../../utils.js'

import setupSignupDialog from '../dialogs/signup.js'
import setupEncryptDialog from '../dialogs/encrypt.js'

const initialState = {
  id: 'Button',
  name: 'signup',
  submitTxt: 'Signup',
  submitAlt: 'Signup for CrowdNode',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel CrowdNode Signup',
}

export function setupSignupButton(el, state = {}) {
  state = {
    ...initialState,
    ...state,
  }

  // console.log('setupSignupButton state', state)

  const form = document.createElement('form')

  // style.textContent = `
  //   fieldset {
  //     border: 0;
  //     min-width: 1rem;
  //   }
  //   form fieldset {
  //     min-width: 1rem;
  //   }
  //   form fieldset button {
  //     border: 0 solid transparent;
  //   }
  // `

  form.classList.add('btn')

  form.name = `${state.name}Form`

  form.innerHTML = `
    <fieldset>
      <button type="submit">${state.submitTxt}</button>
    </fieldset>
  `

  let handleSignupModal = async event => {
    let returnValue = event?.target?.returnValue

    console.log(
      `${state.name} button handleSignupModal`,
      returnValue,
      state.passphrase?.length
    )

    if (returnValue && returnValue !== 'cancel') {
      state.passphrase = returnValue
    }

    if (
      state.passphrase ||
      isDecryptedPhraseOrWif(state.phraseOrWif)
    ) {
      let signupDialog = setupSignupDialog(
        document.querySelector("main"),
        {
          address: state.address,
          passphrase: state.passphrase,
          phraseOrWif: state.phraseOrWif
        }
      )

      signupDialog.showModal()
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

      encryptDialog.addEventListener('close', handleSignupModal)

      encryptDialog.showModal()
    } else {
      await handleSignupModal()
    }
  }

  form.addEventListener('submit', handleSubmit)

  el.classList.add('signup-col')
  el.insertAdjacentElement('afterbegin', form)

  return form
}

export default setupSignupButton
