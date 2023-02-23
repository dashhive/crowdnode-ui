import {
  CrowdNode,
} from '../../imports.js'
import { toDuff } from '../../utils.js'
import {
  requestFunds,
} from '../../lib/ui.js'

/** @type {document} */
const $d = document;

const { depositMinimum } = CrowdNode

export class DepositForm extends HTMLElement {
  constructor() {
    super();

    let name = this.getAttribute('name')
    let addr = this.getAttribute('address')
    let btnTxt = this.getAttribute('btn') || 'Deposit Funds' // to CrowdNode

    const form = $d.createElement('form');
    const style = $d.createElement('style')

    style.textContent = `
      @import url(/index.css);
      fieldset {
        border: 0;
      }
    `

    // <format-to-dash value="${walletFunds.balance}" />
    form.setAttribute('name', name)
    form.innerHTML = `
      <fieldset>
        <button type="submit">${btnTxt}</button>
      </fieldset>
    `

    form.addEventListener('submit', async event => {
      event.preventDefault()

      const amount = event.target.amount?.value || 0

      console.log(
        'deposit funds amount',
        amount,
        toDuff(amount),
      )

      if (addr) {
        let depositAmount = toDuff(amount)
        if (depositAmount < depositMinimum) {
          depositAmount = depositMinimum
        }
        depositAmount = -1

        await requestFunds(
          addr,
          ''
        )

        $d.getElementById('pageLoader')?.remove()

        $d.body.insertAdjacentHTML(
          'afterbegin',
          `<progress id="pageLoader" class="pending"></progress>`,
        )

        $d.getElementById('pageLoader').remove()
      }
    })

    const shadowRoot = this.attachShadow({mode: 'closed'});
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(form);
  }
}

export const init = (n = 'deposit-form') => customElements.define(n, DepositForm);

export default init
