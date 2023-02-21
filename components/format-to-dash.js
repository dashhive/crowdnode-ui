import { fixedDASH } from '../utils.js'

export class FormatToDash extends HTMLElement {
  constructor() {
    super();

    let val = Number(this.getAttribute('value'))
    let dec = Number(this.getAttribute('decimal')) || 4

    const span = document.createElement('span');

    // <format-to-dash value="${walletFunds.balance}" />
    span.setAttribute('title', val.toString())
    span.textContent = fixedDASH(val, dec);

    // OR

    // <format-to-dash>${walletFunds.balance}</format-to-dash>
    // span.setAttribute('title', this.textContent)
    // span.textContent = fixedDASH(Number(this.textContent));

    const shadowRoot = this.attachShadow({mode: 'closed'});
    shadowRoot.appendChild(span);
  }
}

export const init = (n = 'format-to-dash') => customElements.define(n, FormatToDash);

export default init
