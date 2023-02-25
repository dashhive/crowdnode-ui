import {
  CrowdNode,
} from '../../imports.js'

/** @type {document} */
const $d = document;

const { depositMinimum } = CrowdNode

export class UnstakeForm extends HTMLElement {
  constructor() {
    super();

    let name = this.getAttribute('name')
    let address = this.getAttribute('address')
    let btnTxt = this.getAttribute('btn') || 'Unstake from CrowdNode'

    const form = $d.createElement('form');
    const style = $d.createElement('style')

    this.unstakeModal = $d.createElement('unstake-dialog');

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
        'crowdnode unstake',
      )

      if (address) {
        // let unstakeModal = $d.createElement('unstake-dialog');
        this.unstakeModal.setAttribute('address', address);

        console.log('unstake modal', this.unstakeModal)

        $d.querySelector("main")
          .insertAdjacentElement('afterend', this.unstakeModal)

        // let unstakeModal = requestWithdraw(name, from)

        this.unstakeModal?.showModal();
        this.unstakeModal?.on('close', async event => {
          console.log('unstake modal close', event)
          this.unstakeModal?.removeListeners()

          // let storedKeys = await getStoredKeys()
          // let addrRows = await getAddrRows(storedKeys)

          // console.info('unstakeModal WALLET ROWS', storedKeys, addrRows)

          // $d.querySelector('#addressList tbody').innerHTML = addrRows
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

  set pass(value) {
    this._pass = value;
    this.unstakeModal.pass = value
  }
  get pass() {
    return this._pass;
  }
}

export const init = (n = 'unstake-form') => customElements.define(n, UnstakeForm);

export default init
