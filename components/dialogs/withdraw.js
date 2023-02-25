import {
  DashSocket,
  DashSight,
  DashApi,
  CrowdNode,
} from '../../imports.js'
import { toDuff, addrToPubKeyHash } from '../../utils.js'
import { getPrivateKey } from '../../lib/storage.js'

// @ts-ignore
let dashsight = DashSight.create({
  baseUrl: 'https://dashsight.dashincubator.dev',
});
let dashApi = DashApi.create({ insightApi: dashsight });

const initialState = {
  id: 'Modal',
  name: 'withdraw',
  submitTxt: 'Withdraw Funds',
  submitAlt: 'Withdraw from Dash Wallet',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel Dash Withdraw',
}

export class WithdrawDialog extends HTMLElement {
  static get observedAttributes() {
    return [
      'name',
      'from',
      'btn'
    ];
  }

  constructor() {
    super();

    this.name = this.getAttribute('name') || 'withdrawForm'
    this.from = this.getAttribute('from') || ''
    this.btn = this.getAttribute('btn') || 'Withdraw Funds'
    this.state = {
      ...initialState,
      name: this.name,
      submitTxt: this.btn,
    }

    // console.warn('WithdrawDialog custom el',
    //   this.addr, this.funds, this.needed, this.msg
    // )

    const dialog = document.createElement('dialog')
    const form = document.createElement('form')
    const style = document.createElement('style')
    const progress = document.createElement('progress')

    progress.classList.add('pending')

    style.textContent = `
      @import url(/index.css);
    `

    this.dialog = dialog
    this.form = form
    // this.style = style // this makes things go boom. DO NOT USE
    this.progress = progress
    this.handleSubmit = () => {}

    this.loadContent = this.loadContent.bind(this);
    this.showModal = this.showModal.bind(this);
    this.close = this.close.bind(this);
    this.listeners = {}

    dialog.innerHTML = `
      <figure>
        <form method="dialog">
          <button value="cancel" alt="${this.state.cancelAlt}">
            <span>${this.state.cancelTxt}</span>
          </button>
        </form>
      </figure>
    `

    this.loadContent()

    dialog.id = this.getAttribute('id') || 'withdrawModal'
    dialog.classList.add('responsive')

    this.handleClose = event => {
      // @ts-ignore
      // event?.target?.remove()
      // @ts-ignore
      shadowRoot.host?.remove()

      if (this.listeners['close']?.length > 0) {
        for (let callback of this.listeners['close']) {
          callback(this.dialog)
        }
      }
    }

    dialog.addEventListener('close', this.handleClose)

    const shadowRoot = this.attachShadow({mode: 'closed'});
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(dialog);
  }

  on(event, callback) {
    this.listeners[event] = this.listeners[event] || []
    this.listeners[event].push(callback)
  }

  close(e) {
    // console.log('WithdrawDialog close', this,
    //   this.addr, this.funds, this.needed, this.msg
    // )
    this.dialog?.close()
  }

  showModal(e) {
    this.dialog?.showModal()
  }

  loadContent() {
    // console.log('WithdrawDialog loadContent', this,
    //   this.addr, this.funds, this.needed, this.msg
    // )

    // <format-to-dash value="${walletFunds.balance}" />
    this.form.setAttribute('name', this.name)
    // span.textContent = fixedDASH(val, dec);
    this.form.innerHTML = `
      <fieldset>
        <input
          name="toAddress"
          placeholder="Send to Address"
          spellcheck="false"
        />
        <input
          type="number"
          name="amount"
          step="0.00000001"
          placeholder="Ðash Amount (0.001)"
        />
        <button type="submit">${this.btn}</button>
      </fieldset>
    `

    this.handleSubmit = async event => {
      event.preventDefault()

      const toAddr = event.target.toAddress?.value
      const toAddrHash = await addrToPubKeyHash(toAddr)
      const amount = event.target.amount?.value
      const duffAmount = toDuff(amount)

      // try {
      //   toAddrHash = await addrToPubKeyHash(toAddr)
      // } catch (err) {
      //   console.error('toAddrHash Invalid address', toAddr)
      // }

      let tx

      console.log(
        'withdraw funds amount',
        {
          amount,
          duffAmount,
          toAddr,
          toAddrHash,
          from: this.from
        }
      )

      if (this.from && toAddrHash) {
        let fromWif = await getPrivateKey(this.from)
        // DashApi.create()
        console.log(
          'WithdrawForm transfer',
          { from: this.from, fromWif, toAddr },
          { amount, duffAmount,}
        )
        if (duffAmount) {
          tx = await dashApi.createPayment(
            fromWif,
            toAddr,
            duffAmount,
            // from
          );
        } else {
          tx = await dashApi.createBalanceTransfer(fromWif, toAddr);
        }

        let txs = tx.serialize()

        console.log('WithdrawForm tx', txs)

        const instantSend = await dashsight.instantSend(txs);

        console.log('WithdrawForm instantSend', instantSend)

        this.form.querySelector('fieldset').disabled = true
        this.dialog.querySelector('figure')
          .insertAdjacentElement('afterbegin', this.progress)

        let withdrawTransfer = await DashSocket.waitForVout(
          CrowdNode._dashsocketBaseUrl,
          toAddr,
          0,
        )

        console.log(
          'WithdrawForm transfer',
          withdrawTransfer,
        )

        console.error(
          '====TRIGGER BALANCE UPDATE FOR TABLE AND/OR HEADER====',
        )

        // withdrawTransfer.address
        // withdrawTransfer.timestamp
        // withdrawTransfer.txid
        // withdrawTransfer.satoshis
        // withdrawTransfer.txlock

        if (withdrawTransfer.txid && withdrawTransfer.satoshis > 0) {
          this.dialog.querySelector('progress')?.remove()
        }

        //   $d.getElementById('pageLoader')?.remove()

        //   $d.body.insertAdjacentHTML(
        //     'afterbegin',
        //     `<progress id="pageLoader" class="pending"></progress>`,
        //   )

        //   $d.getElementById('pageLoader').remove()
      }

      this.close()
    }

    this.dialog.addEventListener('close', this.handleClose)
    this.form.addEventListener('submit', this.handleSubmit)

    this.dialog.querySelector('figure')
      .insertAdjacentElement('afterbegin', this.form)
  }

  connectedCallback(e) {
    console.log('WithdrawDialog added to page.', e);
    // updateStyle(this);
  }

  disconnectedCallback(e) {
    console.log('WithdrawDialog removed from page.', e);

    this.dialog.removeEventListener('close', this.handleClose)
    this.form.removeEventListener('submit', this.handleSubmit)
  }

  adoptedCallback(e) {
    console.log('WithdrawDialog moved to new page.', e);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log('WithdrawDialog attributes changed.', {name, oldValue, newValue});

    if (name === 'name') {
      this.name = newValue
    } else {
      this[name] = newValue || ''
    }

    this.dialog.removeEventListener('close', this.handleClose)
    this.form.removeEventListener('submit', this.handleSubmit)
    this.loadContent()
  }
}

export const init = (n = 'withdraw-dialog') => customElements.define(
  n,
  WithdrawDialog,
);

export default init
