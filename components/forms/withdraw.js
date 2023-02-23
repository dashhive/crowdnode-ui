import {
  CrowdNode,
} from '../../imports.js'
import { toDuff } from '../../utils.js'
import {
  requestWithdraw,
  getAddrRows,
} from '../../lib/ui.js'
import {
  storeKeys,
  getStoredKeys,
  swapStorage,
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

        // @ts-ignore
        // walletFunding = await DashSocket.waitForVout(
        //   CrowdNode._dashsocketBaseUrl,
        //   addr,
        //   0,
        // )

        // if (walletFunding.satoshis < fees) {
        //   await hasOrRequestFunds(addr, fees, msg)
        // }

        // if (walletFunding.satoshis > 0) {
        //   withdrawModal?.close()
        //   walletFunds.balance = parseFloat(toDash(walletFunding.satoshis))
        //   walletFunds.balanceSat = walletFunding.satoshis
        // }

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
