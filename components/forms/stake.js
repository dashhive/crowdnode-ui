import {
  CrowdNode,
} from '../../imports.js'
import { toDuff } from '../../utils.js'
import {
  hasOrRequestFunds,
} from '../../lib/ui.js'

/** @type {document} */
const $d = document;

const { depositMinimum, stakeMinimum } = CrowdNode

export class StakeForm extends HTMLElement {
  constructor() {
    super();

    let name = this.getAttribute('name')
    let addr = this.getAttribute('address')
    let btnTxt = this.getAttribute('btn') || 'Stake Funds' // to CrowdNode

    const form = $d.createElement('form');

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
        'stake funds amount',
        amount,
        toDuff(amount),
      )

      if (addr) {
        let depositAmount = toDuff(amount)
        if (depositAmount < depositMinimum) {
          depositAmount = depositMinimum
        }

        await hasOrRequestFunds(
          addr,
          depositAmount,
          ''
        )

        $d.getElementById('pageLoader')?.remove()

        $d.body.insertAdjacentHTML(
          'afterbegin',
          `<progress id="pageLoader" class="pending"></progress>`,
        )

        try {
          let cnDeposit = await CrowdNode.deposit(
            selectedPrivateKey.wif,
            hotwallet,
            toDuff(amount) || null
          );

          console.log(
            'depositCrowdNodeForm deposit res',
            cnDeposit
          )

          form.amount.value = null

          // await displayBalances(addr)
        } catch(err) {
          console.warn('failed to deposit', err)
        }

        $d.getElementById('pageLoader').remove()
      }
    })

    const shadowRoot = this.attachShadow({mode: 'closed'});
    shadowRoot.appendChild(form);
  }
}

export const init = (n = 'stake-form') => customElements.define(n, StakeForm);

export default init
