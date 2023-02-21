import { toDash } from '../../utils.js'
import { qrSvg, } from '../../qr.js'
import { copyToClipboard } from '../../lib/ui.js'

export class QrDialog extends HTMLElement {
  static get observedAttributes() {
    return [
      'addr',
      'funds',
      'needed',
      'msg'
    ];
  }

  constructor() {
    super();

    this.addr = this.getAttribute('addr') || ''
    this.funds = JSON.parse(this.getAttribute('funds'))
    this.needed = Number(this.getAttribute('needed')) || 0
    this.msg = this.getAttribute('msg') || ''

    // console.warn('QrDialog custom el',
    //   this.addr, this.funds, this.needed, this.msg
    // )

    let dialog = document.createElement('dialog')
    const style = document.createElement('style')

    style.textContent = `
      @import url(/index.css);
    `

    this.loadQr = this.loadQr.bind(this);
    this.showModal = this.showModal.bind(this);
    this.close = this.close.bind(this);

    this.loadQr()

    dialog.id = this.getAttribute('id') || 'fundingModal'

    dialog.addEventListener('close', event => {
      // @ts-ignore
      event?.target?.remove()
    })

    this.dialog = dialog

    const shadowRoot = this.attachShadow({mode: 'closed'});
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(dialog);
  }

  close(e) {
    // console.log('QrDialog close', this,
    //   this.addr, this.funds, this.needed, this.msg
    // )
    this.dialog?.close()
  }

  showModal(e) {
    // console.log('QrDialog showModal', this,
    //   this.addr, this.funds, this.needed, this.msg
    // )
    if (this.funds?.balanceSat >= 0) {
      this.dialog?.showModal()
    }
  }

  loadQr() {
    // console.log('QrDialog loadQr', this,
    //   this.addr, this.funds, this.needed, this.msg
    // )
    if (this.funds?.balanceSat >= 0) {
      let dashSvg = qrSvg(
        `dash://${this.addr}`,
        {
          background: '#fff0',
          color: 'currentColor',
          indent: 1,
          padding: 1,
          size: 'mini',
          container: 'svg-viewbox',
          join: true,
        }
      )

      let fundingDiff = `<p>
        You must deposit at least <strong><format-to-dash value="${toDash(this.needed)}" /></strong> ${this.msg}
      </p>`

      if (this.funds.balanceSat > 0 && this.funds.balanceSat < this.needed) {
        fundingDiff = `
          <p>You have <strong><format-to-dash value="${toDash(this.funds.balanceSat)}" /></strong> in your wallet.<br>This step requires <strong><format-to-dash value="${toDash(this.needed)}" /></strong>.</p>
          <p>You must deposit at least <strong><format-to-dash value="${toDash(this.needed - this.funds.balanceSat)}" /></strong> more Dash ${this.msg}</p>
        `
      }

      this.dialog.innerHTML = `
        <figure>
          <progress class="pending"></progress>
          <form name="qrCopyAddr">
            <h4>Current Wallet Balance</h4>
            <h3><format-to-dash value="${this.funds.balance}" /></h3>
            ${dashSvg}
            <figcaption>
              <fieldset class="inline">
                <input name="qrAddr" value="${this.addr}" spellcheck="false" />
                <button>📋</button>
              </fieldset>
              ${fundingDiff}
            </figcaption>
          </form>
          <form method="dialog">
            <button value="cancel">Close</button>
          </form>
        </figure>
      `

      this.dialog?.querySelector('form[name=qrCopyAddr] button')?.addEventListener('click', copyToClipboard)
    }
  }

  connectedCallback(e) {
    console.log('QrDialog added to page.', e);
    // updateStyle(this);
  }

  disconnectedCallback(e) {
    console.log('QrDialog removed from page.', e);
  }

  adoptedCallback(e) {
    console.log('QrDialog moved to new page.', e);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log('QrDialog attributes changed.', {name, oldValue, newValue});

    if (name === 'funds') {
      this.funds = JSON.parse(newValue)
    } else if (name === 'needed') {
      this.needed = Number(newValue) || 0
    } else {
      this[name] = newValue || ''
    }

    this.loadQr()
  }
}

export const init = (n = 'qr-dialog') => customElements.define(
  n,
  QrDialog,
  // { extends: 'dialog' }
);

export default init

// /**
//  * `requestFundsQR` returns a string to be used in HTML that displays
//  * a QR Code in SVG format with text description including optional
//  * `msg` appended
//  *
//  * @param {string} addr
//  * @param {import('dashsight').InstantBalance} currentFunds
//  * @param {number} fundsNeeded - in satoshis
//  * @param {string} [msg]
//  * @returns {HTMLDialogElement}
//  */
