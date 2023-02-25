import {
  CrowdNode,
} from '../../imports.js'

/** @type {document} */
const $d = document;

const { depositMinimum } = CrowdNode

export class SignupForm extends HTMLElement {
  constructor() {
    super();

    let name = this.getAttribute('name')
    let address = this.getAttribute('address')
    let btnTxt = this.getAttribute('btn') || 'CrowdNode Signup' // to CrowdNode

    const form = $d.createElement('form');
    const style = $d.createElement('style')

    this.signupModal = $d.createElement('signup-dialog');

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
        'crowdnode signup',
      )

      if (address) {
        // let signupModal = $d.createElement('signup-dialog');
        this.signupModal.setAttribute('address', address);

        console.log('signup modal', this.signupModal)

        $d.querySelector("main")
          .insertAdjacentElement('afterend', this.signupModal)

        // let signupModal = requestWithdraw(name, from)

        this.signupModal?.showModal();
        this.signupModal?.on('close', async event => {
          console.log('signup modal close', event)

          // let storedKeys = await getStoredKeys()
          // let addrRows = await getAddrRows(storedKeys)

          // console.info('signupModal WALLET ROWS', storedKeys, addrRows)

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
    this.signupModal.pass = value
  }
  get pass() {
    return this._pass;
  }
}

export const init = (n = 'signup-form') => customElements.define(n, SignupForm);

export default init
