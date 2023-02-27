import { isDecryptedPhraseOrWif } from '../../utils.js'

import setupWithdrawDialog from '../dialogs/withdraw.js'
import setupEncryptDialog from '../dialogs/encrypt.js'


const initialState = {
  id: 'Button',
  name: 'withdraw',
  submitTxt: 'Withdraw',
  submitAlt: 'Withdraw Dash Funds',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel Withdraw',
}

export function setupWithdrawButton(el, state = {}) {
  state = {
    ...initialState,
    ...state,
  }

  // console.log('setupWithdrawButton state', state)

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

  let handleWithdrawModal = async event => {
    let returnValue = event?.target?.returnValue

    // console.log(
    //   `${state.name} button handleWithdrawModal`,
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
      let withdrawDialog = setupWithdrawDialog(
        document.querySelector("main"),
        {
          address: state.address,
          passphrase: state.passphrase
        }
      )

      withdrawDialog.showModal()
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

      encryptDialog.addEventListener('close', handleWithdrawModal)

      encryptDialog.showModal()
    } else {
      await handleWithdrawModal()
    }
  }

  form.addEventListener('submit', handleSubmit)

  el.innerHTML = ''
  el.insertAdjacentElement('afterbegin', form)

  return form
}

export default setupWithdrawButton
