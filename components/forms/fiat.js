import {
  getCurrencies,
  updateFiatDisplay,
} from '../../lib/ui.js'
import {
  fiatCurrency,
} from '../../lib/storage.js'

let selectedFiat = fiatCurrency

// import { isDecryptedPhraseOrWif } from '../../utils.js'

const initialState = {
  id: 'Button',
  name: 'deposit',
  submitTxt: 'Change Fiat Currency',
  submitAlt: 'Fiat Currency',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel Fiat',
}

export async function setupFiatSelector(el, state = {}) {
  state = {
    ...initialState,
    ...state,
  }

  const form = document.createElement('form')
  const currencyList = document.createElement('datalist')
  currencyList.id = 'fiat-currencies'

  form.classList.add('btn')

  form.name = `${state.name}Form`

  form.innerHTML = `
    <fieldset>
      <label for="fiat-choice">Currency:</label>
      <input
        type="search"
        id="fiat-choice"
        name="fiat-choice"
        list="fiat-currencies"
        value="${selectedFiat}"
      >
      <!-- <button type="submit" title="${state.submitAlt}">${state.submitTxt}</button> -->
    </fieldset>
  `

  let handleChange = async event => {
    event.preventDefault()

    localStorage.setItem('selectedFiat', event?.target?.value)
    selectedFiat = event?.target?.value

    console.log(`${state.name} select handleChange`, selectedFiat)

    localStorage.setItem('fiat', JSON.stringify(await updateFiatDisplay(
      document.querySelector('#navBalances'),
      selectedFiat
    )))
  }

  form.querySelector('#fiat-choice')
    .addEventListener('change', handleChange)

  // let handleSubmit = async event => {
  //   event.preventDefault()
  //   console.log(`${state.name} button handleSubmit`, event)

  //   if (state.address) {
  //     await requestFunds(
  //       state.address,
  //       ''
  //     )
  //   }
  // }

  // form.addEventListener('submit', handleSubmit)

  el.innerHTML = '<h1>Settings</h1>'
  el.insertAdjacentElement('beforeend', form)

  const currencies = await getCurrencies()

  console.log('FIAT', currencies)

  currencyList.insertAdjacentHTML(
    'beforeend',
    `${
      currencies.map(c => {
        console.log('currency', c)
        return `<option value="${c.symbol}">${c.quoteCurrency}</option>`
      }).join('\n')
    }`
  )

  console.log('Currency List', currencyList)

  form.insertAdjacentElement('beforeend', currencyList)

  return form
}

export default setupFiatSelector
