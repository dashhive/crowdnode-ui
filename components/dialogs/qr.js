import { toDash } from '../../utils.js'
import { qrSvg, } from '../../qr.js'
import { copyToClipboard } from '../../lib/ui.js'

const initialState = {
  id: 'Modal',
  name: 'qr',
  // submitTxt: 'Encrypt/Decrypt',
  // submitAlt: 'Encrypt/Decrypt Wallet',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel',
}

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
    this.state = {
      ...initialState
    }

    // console.warn('QrDialog custom el',
    //   this.addr, this.funds, this.needed, this.msg
    // )

    let dialog = document.createElement('dialog')
    let form = document.createElement('form')
    const style = document.createElement('style')

    style.textContent = `
      @import url(/index.css);
    `

    this.loadQr = this.loadQr.bind(this);
    this.showModal = this.showModal.bind(this);
    this.close = this.close.bind(this);
    this.on = this.on.bind(this);
    this.listeners = {}

    this.loadQr()

    dialog.id = this.getAttribute('id') || 'fundingModal'
    dialog.classList.add('responsive')

    this.handleClose = event => {
      // @ts-ignore
      event?.target?.remove()
      // @ts-ignore
      shadowRoot.host?.remove()

      if (this.listeners['close']?.length > 0) {
        for (let callback of this.listeners['close']) {
          callback(this.dialog)
        }
      }
    }
    this.handleReset = event => {
      event.preventDefault()
      console.log('qr dialog handleReset', event)
      this.form?.removeEventListener('close', this.handleReset)
      this.dialog.close('cancel')
    }

    dialog.addEventListener('close', this.handleClose)

    this.dialog = dialog
    this.form = form

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(dialog);
  }

  on(event, callback) {
    this.listeners[event] = this.listeners[event] || []
    this.listeners[event].push(callback)
  }

  close(e) {
    // console.log('QrDialog close', this,
    //   this.addr, this.funds, this.needed, this.msg
    // )
    this.dialog?.close()
    // this.shadowRoot?.parentElement.remove()
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
        </figure>
      `
      this.form.name = 'qrCopyAddr'
      this.form.innerHTML = `
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

        <fieldset class="inline">
          <button type="reset" alt="${this.state.cancelAlt}">
            <span>${this.state.cancelTxt}</span>
          </button>
        </fieldset>
      `

      this.form.addEventListener('reset', this.handleReset)

      this.dialog.querySelector('figure')
        .insertAdjacentElement('beforeend', this.form)

      this.dialog?.querySelector('form[name=qrCopyAddr] button')?.addEventListener('click', copyToClipboard)
    }
  }

  connectedCallback(e) {
    console.log('QrDialog added to page.', e);
    // updateStyle(this);
  }

  disconnectedCallback(e) {
    console.log('QrDialog removed from page.', e);
    this.dialog.removeEventListener('close', this.handleClose)
    // this.form.removeEventListener('submit', this.handleSubmit)
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
