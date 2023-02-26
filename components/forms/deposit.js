import {
  requestFunds,
} from '../../lib/ui.js'

import { isDecryptedPhraseOrWif } from '../../utils.js'

const initialState = {
  id: 'Button',
  name: 'deposit',
  submitTxt: 'Deposit',
  submitAlt: 'Deposit in CrowdNode',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel Deposit',
}

export function setupDepositButton(el, state = {}) {
  state = {
    ...initialState,
    ...state,
  }

  console.log('setupDepositButton state', state)

  const form = document.createElement('form')

  // style.textContent = `
  //   @import url(/index.css);
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

  // let handleDepositModal = async event => {
  //   let returnValue = event?.target?.returnValue

  //   // console.log(
  //   //   `${state.name} button handleDepositModal`,
  //   //   returnValue,
  //   //   state.passphrase?.length
  //   // )

  //   if (returnValue && returnValue !== 'cancel') {
  //     state.passphrase = returnValue
  //   }

  //   if (
  //     state.passphrase ||
  //     isDecryptedPhraseOrWif(state.phraseOrWif)
  //   ) {
  //     let depositDialog = setupDepositDialog(
  //       document.querySelector("main"),
  //       {
  //         address: state.address,
  //         passphrase: state.passphrase
  //       }
  //     )

  //     depositDialog.showModal()
  //   }
  // }
  let handleSubmit = async event => {
    event.preventDefault()
    console.log(`${state.name} button handleSubmit`, event)

    if (state.address) {
      await requestFunds(
        state.address,
        ''
      )
    }

    // if(
    //   !state.passphrase &&
    //   !isDecryptedPhraseOrWif(state.phraseOrWif)
    // ) {
    //   let encryptDialog = await setupEncryptDialog(document.querySelector("main"))

    //   encryptDialog.addEventListener('close', handleDepositModal)

    //   encryptDialog.showModal()
    // } else {
    //   await handleDepositModal()
    // }
  }

  form.addEventListener('submit', handleSubmit)

  el.innerHTML = ''
  el.insertAdjacentElement('afterbegin', form)

  return form
}

export default setupDepositButton
