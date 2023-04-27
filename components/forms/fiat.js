import {
  getCurrencies,
  updateFiatDisplay,
} from '../../lib/ui.js'
import {
  fiatCurrency,
} from '../../lib/storage.js'

let selectedFiat = fiatCurrency

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

  form.classList.add('field')

  form.name = `${state.name}Form`

  form.innerHTML = `
    <fieldset class="inline">
      <label for="fiat-choice">Currency:</label>
      <input
        type="search"
        id="fiat-choice"
        name="fiat-choice"
        list="fiat-currencies"
        value="${selectedFiat}"
        placeholder="${selectedFiat}"
      >
      <!-- <button type="submit" title="${state.submitAlt}">${state.submitTxt}</button> -->
    </fieldset>
  `

  let handleChange = async event => {
    event.preventDefault()
    // console.log(`${state.name} select handleChange====`, event)

    let val = event?.target?.value || event?.target?.['fiat-choice']?.value

    if (!['',null,undefined].includes(val)) {
      localStorage.setItem('selectedFiat', val)
      selectedFiat = val

      console.log(`${state.name} select handleChange`, selectedFiat)

      localStorage.setItem('fiat', JSON.stringify(await updateFiatDisplay(
        document.querySelector('#navBalances'),
        selectedFiat
      )))
    }
  }

  form.querySelector('#fiat-choice')
    .addEventListener('change', handleChange)
  form.addEventListener('submit', handleChange)

  let existingForm = el.querySelector(`form[name="${form.name}"]`)

  if (existingForm) {
    existingForm.replaceWith(form)
  } else {
    el.insertAdjacentElement('beforeend', form)
  }

  const currencies = await getCurrencies()

  console.log('FIAT', currencies)

  currencyList.insertAdjacentHTML(
    'beforeend',
    `${
      currencies.map(c => {
        return `<option value="${c.quoteCurrency}"></option>`
      }).join('\n')
    }`
  )

  console.log('Currency List', currencyList)

  form.insertAdjacentElement('beforeend', currencyList)

  return form
}

export default setupFiatSelector
