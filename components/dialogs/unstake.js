import {
  // DashSocket,
  // DashSight,
  // DashApi,
  CrowdNode,
} from '../../imports.js'
// import { toDuff, addrToPubKeyHash } from '../../utils.js'
import { getPrivateKey } from '../../lib/storage.js'
// import {
//   hasOrRequestFunds,
// } from '../../lib/ui.js'

// @ts-ignore
// let dashsight = DashSight.create({
//   baseUrl: 'https://dashsight.dashincubator.dev',
// });
// let dashApi = DashApi.create({ insightApi: dashsight });

const { hotwallet } = CrowdNode.main;
const { signupForApi, acceptTerms, offset } = CrowdNode.requests;
let feeEstimate = 500;
// let signupOnly = signupForApi + offset;
// let acceptOnly = acceptTerms + offset;
// let signupFees = signupOnly + acceptOnly;
// let signupTotal = signupFees + (2 * feeEstimate);

const initialState = {
  id: 'Modal',
  name: 'unstake',
  submitTxt: 'Unstake',
  submitAlt: 'Unstake from CrowdNode',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel CrowdNode Unstaking',
}

export class UnstakeDialog extends HTMLElement {
  static get observedAttributes() {
    return [
      'name',
      'address',
      'btn'
    ];
  }

  constructor() {
    super();

    this.name = this.getAttribute('name') || 'unstake'
    this.btn = this.getAttribute('btn') || 'Unstake'
    this.address = this.getAttribute('address') || ''
    this.state = {
      ...initialState,
      name: this.name,
      submitTxt: this.btn,
    }

    console.warn('UnstakeDialog contructor init',
      this.name, this.btn, this.address
    )

    // const dialog = document.createElement('dialog')
    const unstakeForm = document.createElement('form')
    const style = document.createElement('style')
    const progress = document.createElement('progress')

    progress.classList.add('pending')

    style.textContent = `
      @import url(/index.css);
      form {
        padding: 1rem;
      }
      form fieldset.inline {
        margin-bottom: 1rem;
      }
      form fieldset.inline input[name="percent"] {
        min-width: 1rem;
        max-width: 6rem;
        border-right: 1px solid var(--inpbd);
      }
      fieldset {
        border: 0;
        margin: 0;
        padding: 1rem;
      }
      form fieldset {
        min-width: 1rem;
      }
    `

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.appendChild(style);

    this.unstakeForm = unstakeForm
    // this.style = style // this makes things go boom. DO NOT USE
    this.progress = progress

    this.removeListeners = this.removeListeners.bind(this);
    this.addListeners = this.addListeners.bind(this);
    this.loadContent = this.loadContent.bind(this);
    this.showModal = this.showModal.bind(this);
    this.close = this.close.bind(this);
    this.listeners = {}

    // this.handleChange = () => {}
    // this.handleSubmit = () => {}
    this.handleClose = event => {
      this.removeListeners()

      this.dialog?.removeEventListener('close', this.handleClose)
      // @ts-ignore
      // event?.target?.remove()
      // @ts-ignore
      shadowRoot.host?.remove()

      if (this.listeners['close']?.length > 0) {
        for (let callback of this.listeners['close']) {
          callback(event)
        }
      }
    }
    this.handleSetPass = event => {
      event.preventDefault()
      console.log('unstake dialog handleSetPass', event.detail)
      this._pass = event.detail;

      // if (this.listeners['set:pass']?.length > 0) {
      //   for (let callback of this.listeners['set:pass']) {
      //     callback(this.dialog)
      //   }
      // }
    }
  }

  set pass(value) {
    this._pass = value;
  }
  get pass() {
    return this._pass;
  }

  on(event, callback) {
    this.listeners[event] = this.listeners[event] || []
    this.listeners[event].push(callback)
  }

  close(e) {
    // console.log('UnstakeDialog close', this,
    //   this.addr, this.funds, this.needed, this.msg
    // )
    this.dialog?.close()
  }

  showModal(e) {
    this.dialog?.showModal()
  }

  addRemoveListener(el, eventName, callback, options) {
    el?.removeEventListener(eventName, callback, options)
    el?.addEventListener(eventName, callback, options)
  }

  addListeners() {
    this.addRemoveListener(this.dialog, 'close', this.handleClose)
    // this.dialog?.addEventListener('close', this.handleClose, { once: true })
    if (this.handleSubmit) {
      this.addRemoveListener(this.unstakeForm, 'submit', this.handleSubmit)
    }

    // this.unstakeForm?.percentRange?.addEventListener(
    //   "input",
    //   this.handlePercentRangeInput
    // )
    // this.unstakeForm?.percent?.addEventListener(
    //   "input",
    //   this.handlePercentInput
    // )
    this.addRemoveListener(
      this.unstakeForm?.percentRange, 'input',
      this.handlePercentRangeInput, { once: true }
    )
    this.addRemoveListener(
      this.unstakeForm?.percent, 'input',
      this.handlePercentInput, { once: true }
    )

    // window.removeEventListener('set:pass', this.handleSetPass)
    // window.addEventListener('set:pass', this.handleSetPass, { once: true })
    this.addRemoveListener(
      window, 'set:pass', this.handleSetPass, { once: true }
    )
  }

  removeListeners() {
    this.dialog?.removeEventListener('close', this.handleClose)
    this.unstakeForm?.removeEventListener('submit', this.handleSubmit)

    this.unstakeForm?.percentRange?.removeEventListener(
      "input",
      this.handlePercentRangeInput
    )
    this.unstakeForm?.percent?.removeEventListener(
      "input",
      this.handlePercentInput
    )

    window.removeEventListener('set:pass', this.handleSetPass)
  }

  loadContent() {
    this.dialog = this.dialog || document.createElement('dialog')
    this.dialog.innerHTML = `
      <figure>
        <form method="dialog">
          <button value="cancel" alt="${this.state.cancelAlt}">
            <span>${this.state.cancelTxt}</span>
          </button>
        </form>
      </figure>
    `

    this.dialog.id = this.getAttribute('id') || `${this.name}Modal`
    this.dialog.classList.add('responsive')

    this.dialog.querySelector('figure')
      .insertAdjacentElement('afterbegin', this.unstakeForm)
    // console.log('UnstakeDialog loadContent', this,
    //   this.addr, this.funds, this.needed, this.msg
    // )
    this.shadowRoot.appendChild(this.dialog);

    this.unstakeForm.setAttribute('name', `${this.name}Form`)

    this.unstakeForm.innerHTML = `
      <fieldset class="inline">
        <input
          name="percentRange"
          type="range"
          min="0.1"
          max="100.0"
          step="0.1"
          value="1"
        />
        <input
          type="number"
          name="percent"
          step="0.1"
          value="1"
          placeholder="Unstake Percentage (0.1)"
        />
      </fieldset>
      <fieldset>
        <button name="unstake" type="submit">${this.btn}</button>
      </fieldset>
    `

    this.percentRangeChanging = false
    this.percentChanging = false

    this.handlePercentRangeInput = async event => {
      this.percentRangeChanging = true
      if (!this.percentChanging) {
        this.unstakeForm.percent.value = event.target.value
      }
      this.percentRangeChanging = false
    }

    this.handlePercentInput = async event => {
      this.percentChanging = true
      if (!this.percentRangeChanging) {
        this.unstakeForm.percentRange.value = event.target.value
      }
      this.percentChanging = false
    }

    this.handleChange = async event => {
      console.log(
        'unstake handleChange',
        {
          event,
          eventTarget: event.target,
          address: this.address
        }
      )

      this.unstakeForm.unstake.disabled = !this.unstakeForm.acceptToS.checked
    }

    this.handleSubmit = async event => {
      event.preventDefault()

      const percent = event.target.percent?.value
      const percentRange = event.target.percentRange?.value

      console.log(
        'unstake from crowdnode',
        {
          address: this.address,
          percent,
          percentRange
        }
      )

      let cnUnstake

      if (this.address) {
        // FIX: add encryption passphrase
        let fromWif = await getPrivateKey(this.address, this._pass) // , pass

        // let depositAmount = toDuff(amount)
        // if (depositAmount < depositMinimum) {
        //   depositAmount = depositMinimum
        // }

        // let percent = parseFloat(percentStr);

        let permil = Math.round(percent * 10);
        if (permil <= 0 || permil > 1000) {
          console.error("Error: withdraw percent must be between 0.1 and 100.0");
        }

        let realPercentStr = (permil / 10).toFixed(1);
        console.info(`Initiating withdraw of ${realPercentStr}%...`);

        // wait for unstake
        // wait for accept TOS

        console.log('privKey', this.address, this._pass, fromWif)

        // await hasOrRequestFunds(
        //   this.address,
        //   depositAmount,
        //   'to unstake from CrowdNode'
        // )

        this.unstakeForm.querySelector('fieldset').disabled = true
        this.dialog.querySelector('figure')
          .insertAdjacentElement('afterbegin', this.progress)

        document.body.insertAdjacentHTML(
          'afterbegin',
          `<progress id="pageLoader" class="pending"></progress>`,
        )

        try {
          cnUnstake = await CrowdNode.withdraw(
            fromWif,
            hotwallet,
            permil
          );

          console.log(
            'crowdnode unstake res',
            cnUnstake
          )
          console.info(`API Response: ${cnUnstake.api}`);

          // document.depositCrowdNodeForm.amount.value = null

          // await displayBalances(addr)
        } catch(err) {
          console.warn('failed to deposit', err)
        }

        // ADD UNSTAKE HERE

        // let cnSignup = await CrowdNode.signup(fromWif, hotwallet);
        // console.log('signupCrowdNodeForm', cnSignup)
        // let cnAccept = await CrowdNode.accept(fromWif, hotwallet);
        // console.log('acceptCrowdNodeForm', cnAccept)
      }

      if (cnUnstake) {
        document.getElementById('pageLoader').remove()
        this.dialog.querySelector('progress')?.remove()
      }

      this.close(cnUnstake)
    }

    // document.addEventListener('set:pass', this.handleSetPass)
  }

  connectedCallback(e) {
    console.log('UnstakeDialog added to page.', e, this.pass);
    // updateStyle(this);
    // this.removeListeners()
    // this.addListeners()
  }

  disconnectedCallback(e) {
    console.log('UnstakeDialog removed from page.', e);

    this.removeListeners()
  }

  adoptedCallback(e) {
    console.log('UnstakeDialog moved to new page.', e);
    this.removeListeners()
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log('UnstakeDialog attributes changed.', {name, oldValue, newValue});

    if (name === 'name') {
      this.name = newValue
    } else {
      this[name] = newValue || ''
    }

    // this.removeListeners()

    this.loadContent()

    this.removeListeners()
    this.addListeners()
  }
}

export const init = (
  name = 'unstake-dialog',
  con = UnstakeDialog
) => customElements.define(
  name,
  con,
);

export default init
