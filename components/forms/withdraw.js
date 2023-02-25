import {
  CrowdNode,
} from '../../imports.js'
import {
  requestWithdraw,
  getAddrRows,
} from '../../lib/ui.js'
import {
  // storePhraseOrWif,
  getStoredKeys,
  // swapStorage,
} from '../../lib/storage.js'

/** @type {document} */
const $d = document;

const { depositMinimum } = CrowdNode

export class WithdrawForm extends HTMLElement {
  constructor() {
    super();

    let name = this.getAttribute('name')
    let from = this.getAttribute('from')
    let btnTxt = this.getAttribute('btn') || 'Withdraw Funds' // to CrowdNode

    const form = $d.createElement('form');
    const style = $d.createElement('style')

    style.textContent = `
      @import url(/index.css);
      fieldset {
        border: 0;
        min-width: 1rem;
      }
      form fieldset {
        min-width: 1rem;
      }
      form fieldset button {
        border: 0 solid transparent;
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

      console.log(
        'withdraw funds',
      )

      if (from) {
        let withdrawModal = requestWithdraw(name, from)

        withdrawModal?.showModal();
        withdrawModal?.on('close', async event => {
          let storedKeys = await getStoredKeys()
          let addrRows = await getAddrRows(storedKeys)

          console.info('withdrawModal WALLET ROWS', storedKeys, addrRows)

          $d.querySelector('#addressList tbody').innerHTML = addrRows
        })

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

export const init = (n = 'withdraw-form') => customElements.define(n, WithdrawForm);

export default init