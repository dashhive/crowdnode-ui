import {
  DashSocket,
  DashSight,
  DashApi,
  CrowdNode,
} from '../../imports.js'
import { toDuff } from '../../utils.js'
import { getPrivateKey } from '../../lib/storage.js'

// import {
//   requestFunds,
// } from '../../lib/ui.js'

// @ts-ignore
let dashsight = DashSight.create({
  baseUrl: 'https://dashsight.dashincubator.dev',
});
let dashApi = DashApi.create({ insightApi: dashsight });

/** @type {document} */
const $d = document;

const { depositMinimum } = CrowdNode

export class WithdrawForm extends HTMLElement {
  constructor() {
    super();

    let name = this.getAttribute('name')
    let fromAddr = this.getAttribute('fromaddr')
    let btnTxt = this.getAttribute('btn') || 'Withdraw Funds' // to CrowdNode

    const form = $d.createElement('form')
    const style = $d.createElement('style')

    style.textContent = `
      @import url(/index.css);
      fieldset {
        border: 0;
      }
    `

    // <format-to-dash value="${walletFunds.balance}" />
    form.setAttribute('name', name)
    // span.textContent = fixedDASH(val, dec);
    form.innerHTML = `
      <fieldset>
        <input
          name="toAddress"
          placeholder="Send to Address"
          spellcheck="false"
        />
      </fieldset>
      <fieldset>
        <input
          type="number"
          name="amount"
          step="0.00000001"
          placeholder="Ðash Amount (0.001)"
        />
      </fieldset>
      <fieldset>
        <button type="submit">${btnTxt}</button>
      </fieldset>
    `

    form.addEventListener('submit', async event => {
      event.preventDefault()

      const toAddr = event.target.toAddress?.value
      let amount = event.target.amount?.value
      let duffAmount = toDuff(amount)

      let tx

      console.log(
        'withdraw funds amount',
        amount,
        duffAmount,
        toAddr,
      )

      if (fromAddr && duffAmount) {
        let fromWif = await getPrivateKey(fromAddr)
        // DashApi.create()
        console.log(
          'WithdrawForm transfer',
          { fromAddr, fromWif, toAddr },
          { amount, duffAmount,}
        )
        tx = await dashApi.createPayment(fromWif, toAddr, duffAmount);

        console.log('WithdrawForm tx', tx)

        let insend = await dashsight.instantSend(tx);

        console.log('WithdrawForm instantSend', insend)

        let withdrawTransfer = await DashSocket.waitForVout(
          CrowdNode._dashsocketBaseUrl,
          toAddr,
          0,
        )

        console.log(
          'WithdrawForm transfer',
          withdrawTransfer,
        )
      //   let depositAmount = toDuff(amount)
      //   if (depositAmount < depositMinimum) {
      //     depositAmount = depositMinimum
      //   }
      //   depositAmount = -1

      //   await requestFunds(
      //     fromAddr,
      //     ''
      //   )

      //   $d.getElementById('pageLoader')?.remove()

      //   $d.body.insertAdjacentHTML(
      //     'afterbegin',
      //     `<progress id="pageLoader" class="pending"></progress>`,
      //   )

      //   $d.getElementById('pageLoader').remove()
      }
    })

    const shadowRoot = this.attachShadow({mode: 'closed'});
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(form);
  }
}

export const init = (n = 'withdraw-form') => customElements.define(n, WithdrawForm);

export default init
