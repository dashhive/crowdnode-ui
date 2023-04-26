import {
  requestFunds,
} from '../../lib/ui.js'

const initialState = {
  id: 'Button',
  name: 'deposit',
  submitTxt: 'Deposit',
  submitAlt: 'Deposit Dash (Đ)',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel Deposit',
}

export function setupDepositButton(el, state = {}) {
  state = {
    ...initialState,
    ...state,
  }

  const form = document.createElement('form')

  form.classList.add('btn')

  form.name = `${state.name}Form`

  form.innerHTML = `
    <fieldset>
      <button type="submit" title="${state.submitAlt}">${state.submitTxt}</button>
    </fieldset>
  `

  let handleSubmit = async event => {
    event.preventDefault()
    console.log(`${state.name} button handleSubmit`, event)

    if (state.address) {
      await requestFunds(
        state.address,
        ''
      )
    }
  }

  form.addEventListener('submit', handleSubmit)

  el.innerHTML = ''
  el.insertAdjacentElement('afterbegin', form)

  return form
}

export default setupDepositButton
